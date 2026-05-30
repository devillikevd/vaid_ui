package com.example.swastik.util.vision

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.ImageFormat
import android.graphics.Matrix
import android.graphics.Rect
import android.graphics.YuvImage
import android.util.Log
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.facelandmarker.FaceLandmarker
import com.google.mediapipe.tasks.vision.facelandmarker.FaceLandmarkerResult
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import org.webrtc.VideoFrame
import org.webrtc.VideoSink
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.util.concurrent.Executors
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.cancel
import kotlinx.coroutines.ExecutorCoroutineDispatcher
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.round
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * GPU-accelerated real-time CV signal extraction from WebRTC camera frames.
 *
 * Architecture (Two-Tier Pipeline):
 *   Tier 1 — Keyframe (2 Hz): Runs MediaPipe FaceLandmarker on a Bitmap for
 *            face detection, ROI update, blendshapes, drowsiness, pain, asymmetry,
 *            posture, and tremor estimation.
 *   Tier 2 — Lightweight (30 FPS): Reads cheek/lip colors directly from raw I420
 *            YUV planes using the cached ROI. Feeds rPPG signal buffer at high
 *            frame rate for superior heart rate and respiration accuracy.
 *
 * Key optimisations vs. prior version:
 *   • Eliminates JPEG compress→decode round-trip from the hot path (~30ms saved)
 *   • Direct YUV→RGB conversion from ByteBuffer — zero Bitmap allocation on Tier 2
 *   • FaceLandmarker runs at 2 Hz instead of 12 Hz (6× fewer ML inferences)
 *   • Pre-allocated NV21 buffer and JPEG stream reused across frames
 *   • rPPG signal sampled at 30 FPS instead of 12 FPS → 2.5× more data points
 */
class ComputerVisionAnalyzer(private val context: Context) : VideoSink {

    companion object {
        private const val TAG = "CVAnalyzer"

        // ── Timing ─────────────────────────────────────────────────────
        /** Minimum interval between keyframes (Tier 1) — targets ~2 Hz. */
        private const val KEYFRAME_INTERVAL_MS = 500L

        // ── Signal windows ─────────────────────────────────────────────
        private const val PPG_WINDOW_MS = 12_000L
        private const val RESPIRATION_WINDOW_MS = 18_000L
        private const val TREMOR_WINDOW_MS = 6_000L

        // ── Face validation ────────────────────────────────────────────
        private const val MIN_FACE_WIDTH = 0.16
        private const val MIN_FACE_HEIGHT = 0.20
    }

    // ══════════════════════════════════════════════════════════════════
    //  PUBLIC DATA MODEL
    // ══════════════════════════════════════════════════════════════════

    data class CVMetrics(
        val heartRate: Double? = null,
        val respirationRate: Double? = null,
        val spo2: Double? = null,
        val drowsinessScore: Double? = null,
        val facialAsymmetryScore: Double? = null,
        val tremorDetected: Boolean? = null,
        val tremorSeverity: Double? = null,
        val tremorFrequency: Double? = null,
        val painScore: Double? = null,
        val posture: String? = null,
        val spineAngle: Double? = null,
        val pallorScore: Double? = null,
        val hemoglobinEstimate: Double? = null,
        val stressLevel: Double? = null,
        val skinCondition: String? = null,
        val isFaceDetected: Boolean = false,
        val signalQuality: Double? = null,
        val confidence: Double? = null,
        val capturedAtMs: Long = 0L
    )

    // ══════════════════════════════════════════════════════════════════
    //  INTERNAL DATA STRUCTURES
    // ══════════════════════════════════════════════════════════════════

    private data class SignalSample(val timeMs: Long, val value: Double)

    private data class FrequencyEstimate(
        val frequencyHz: Double,
        val confidence: Double
    )

    private data class FaceBox(
        val left: Double,
        val top: Double,
        val right: Double,
        val bottom: Double
    ) {
        val width: Double get() = right - left
        val height: Double get() = bottom - top
        val area: Double get() = width * height
    }

    private data class RgbStats(
        val red: Double,
        val green: Double,
        val blue: Double
    ) {
        val luminance: Double
            get() = (0.2126 * red) + (0.7152 * green) + (0.0722 * blue)
    }

    private data class TremorMetrics(
        val detected: Boolean?,
        val severity: Double?,
        val frequency: Double?
    )

    /**
     * Cached ROI state from the last keyframe. Used by lightweight frames
     * to sample cheek/lip colours without re-running FaceLandmarker.
     */
    private data class CachedRoi(
        val faceBox: FaceBox,
        val signalQuality: Double,
        val timestampMs: Long,
        /** Last known nose-tip position for displacement tracking. */
        val noseTipX: Double,
        val noseTipY: Double
    )

    // ══════════════════════════════════════════════════════════════════
    //  STATE
    // ══════════════════════════════════════════════════════════════════

    private val _vitalsData = MutableStateFlow(CVMetrics())
    val vitalsData: StateFlow<CVMetrics> get() = _vitalsData

    private var faceLandmarker: FaceLandmarker? = null
    private var lastLightweightTimeMs = 0L
    private var lastKeyframeTimeMs = 0L
    private var missingFaceFrames = 0
    private val lightweightIntervalMs = DeviceProfiler.getTier2IntervalMs(context)

    // Create a strictly dedicated background thread for CV to avoid WebRTC contention
    private val cvDispatcher: ExecutorCoroutineDispatcher = Executors.newSingleThreadExecutor().asCoroutineDispatcher()
    private val scope = CoroutineScope(cvDispatcher + Job())
    @Volatile private var isProcessingFrame = false

    // ── Signal buffers ─────────────────────────────────────────────
    private val pulseSamples = ArrayDeque<SignalSample>()
    private val respirationSamples = ArrayDeque<SignalSample>()
    private val tremorSamples = ArrayDeque<SignalSample>()

    // ── Smoothing state ────────────────────────────────────────────
    private var smoothedHeartRate: Double? = null
    private var smoothedRespirationRate: Double? = null
    private var smoothedDrowsiness: Double? = null
    private var smoothedPain: Double? = null
    private var smoothedAsymmetry: Double? = null
    private var smoothedPallor: Double? = null
    private var tremorBaselineX: Double? = null
    private var lastLuminance: Double? = null

    // ── Pre-allocated buffers ──────────────────────────────────────
    private var nv21Buffer: ByteArray? = null
    private val jpegOutputStream = ByteArrayOutputStream(1024 * 1024)

    // ── Cached keyframe ROI for Tier 2 ─────────────────────────────
    @Volatile private var cachedRoi: CachedRoi? = null

    // ── Latest keyframe metrics (non-rPPG signals) ─────────────────
    @Volatile private var lastKeyframeDrowsiness: Double? = null
    @Volatile private var lastKeyframePain: Double? = null
    @Volatile private var lastKeyframeAsymmetry: Double? = null
    @Volatile private var lastKeyframeTremor: TremorMetrics = TremorMetrics(null, null, null)
    @Volatile private var lastKeyframePosture: Pair<String, Double>? = null

    // ══════════════════════════════════════════════════════════════════
    //  INIT
    // ══════════════════════════════════════════════════════════════════

    init {
        try {
            val baseOptions = BaseOptions.builder()
                .setModelAssetPath("face_landmarker.task")
                .setDelegate(com.google.mediapipe.tasks.core.Delegate.GPU)
                .build()

            val options = FaceLandmarker.FaceLandmarkerOptions.builder()
                .setBaseOptions(baseOptions)
                .setRunningMode(RunningMode.IMAGE)
                .setNumFaces(1)
                .setOutputFaceBlendshapes(true)
                .build()

            faceLandmarker = FaceLandmarker.createFromOptions(context, options)
            Log.d(TAG, "MediaPipe FaceLandmarker initialized.")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize FaceLandmarker.", e)
            faceLandmarker = null
        }
    }

    // ══════════════════════════════════════════════════════════════════
    //  FRAME ENTRY POINT (WebRTC VideoSink)
    // ══════════════════════════════════════════════════════════════════

    override fun onFrame(frame: VideoFrame) {
        val currentTimeMs = System.currentTimeMillis()

        // Gate: skip if we're still processing a previous frame
        if (isProcessingFrame) return

        // Gate: enforce minimum interval between lightweight frames
        if (currentTimeMs - lastLightweightTimeMs < lightweightIntervalMs) return

        isProcessingFrame = true

        val isKeyframe = (currentTimeMs - lastKeyframeTimeMs >= KEYFRAME_INTERVAL_MS)
            || cachedRoi == null

        if (isKeyframe) {
            lastKeyframeTimeMs = currentTimeMs
        } else {
            lastLightweightTimeMs = currentTimeMs
        }

        try {
            // EGL Thread Operations (Must be done here, not in coroutine)
            val MAX_DIMEN = 480
            val originalWidth = frame.buffer.width
            val originalHeight = frame.buffer.height
            val scale = MAX_DIMEN.toFloat() / maxOf(originalWidth, originalHeight)
            
            val processedBuffer = if (scale < 1.0f) {
                frame.buffer.cropAndScale(
                    0, 0, originalWidth, originalHeight,
                    (originalWidth * scale).toInt(), (originalHeight * scale).toInt()
                )
            } else {
                frame.buffer
            }

            // Convert to I420 on WebRTC thread (hardware accelerated if texture)
            val i420Buffer = processedBuffer.toI420()
            if (scale < 1.0f) processedBuffer.release()

            if (i420Buffer == null) {
                isProcessingFrame = false
                return
            }

            // Retain the I420 buffer because we are passing it to another thread
            i420Buffer.retain()

            val rotation = frame.rotation

            if (isKeyframe) {
                scope.launch {
                    try {
                        val width = i420Buffer.width
                        val height = i420Buffer.height

                        // Pre-allocate NV21 buffer
                        val requiredSize = width * height + (width * height / 2)
                        if (nv21Buffer == null || nv21Buffer!!.size != requiredSize) {
                            nv21Buffer = ByteArray(requiredSize)
                        }
                        val nv21 = nv21Buffer!!

                        copyPlane(i420Buffer.dataY, i420Buffer.strideY, nv21, width, height, 0)
                        copyUvPlanesToNv21(
                            vBuffer = i420Buffer.dataV, vStride = i420Buffer.strideV,
                            uBuffer = i420Buffer.dataU, uStride = i420Buffer.strideU,
                            destination = nv21, width = width, height = height, offset = width * height
                        )

                        val yuvCheekColor = cachedRoi?.let { roi ->
                            sampleYuvPatch(
                                i420Buffer.dataY, i420Buffer.strideY,
                                i420Buffer.dataU, i420Buffer.strideU,
                                i420Buffer.dataV, i420Buffer.strideV,
                                width, height, roi.faceBox, xFactor = 0.32, yFactor = 0.57
                            )?.let { left ->
                                sampleYuvPatch(
                                    i420Buffer.dataY, i420Buffer.strideY,
                                    i420Buffer.dataU, i420Buffer.strideU,
                                    i420Buffer.dataV, i420Buffer.strideV,
                                    width, height, roi.faceBox, xFactor = 0.68, yFactor = 0.57
                                )?.let { right -> averageRgb(left, right) }
                            }
                        }

                        processKeyframe(nv21, width, height, rotation, currentTimeMs, yuvCheekColor)

                    } catch (e: Exception) {
                        Log.e(TAG, "Keyframe processing error", e)
                    } finally {
                        i420Buffer.release()
                        isProcessingFrame = false
                    }
                }
            } else {
                scope.launch {
                    try {
                        val roi = cachedRoi
                        if (roi == null) return@launch

                        val width = i420Buffer.width
                        val height = i420Buffer.height

                        val leftCheek = sampleYuvPatch(
                            i420Buffer.dataY, i420Buffer.strideY,
                            i420Buffer.dataU, i420Buffer.strideU,
                            i420Buffer.dataV, i420Buffer.strideV,
                            width, height, roi.faceBox, xFactor = 0.32, yFactor = 0.57
                        )
                        val rightCheek = sampleYuvPatch(
                            i420Buffer.dataY, i420Buffer.strideY,
                            i420Buffer.dataU, i420Buffer.strideU,
                            i420Buffer.dataV, i420Buffer.strideV,
                            width, height, roi.faceBox, xFactor = 0.68, yFactor = 0.57
                        )
                        val cheekColor = averageRgb(leftCheek, rightCheek)

                        val lipColor = sampleYuvPatch(
                            i420Buffer.dataY, i420Buffer.strideY,
                            i420Buffer.dataU, i420Buffer.strideU,
                            i420Buffer.dataV, i420Buffer.strideV,
                            width, height, roi.faceBox, xFactor = 0.50, yFactor = 0.78,
                            widthFactor = 0.12, heightFactor = 0.07
                        )

                        processLightweightFrame(cheekColor, lipColor, roi, currentTimeMs)

                    } catch (e: Exception) {
                        Log.e(TAG, "Lightweight error", e)
                    } finally {
                        i420Buffer.release()
                        isProcessingFrame = false
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Frame preprocessing error", e)
            isProcessingFrame = false
        }
    }

    // ══════════════════════════════════════════════════════════════════
    //  TIER 1: KEYFRAME PROCESSING (async, ~2 Hz)
    // ══════════════════════════════════════════════════════════════════

    private fun processKeyframe(
        nv21: ByteArray,
        width: Int,
        height: Int,
        rotation: Int,
        currentTimeMs: Long,
        yuvCheekColor: RgbStats?
    ) {
        // Convert NV21 → Bitmap for FaceLandmarker
        val bitmap = try {
            val yuvImage = YuvImage(nv21, ImageFormat.NV21, width, height, null)
            jpegOutputStream.reset()
            yuvImage.compressToJpeg(Rect(0, 0, width, height), 75, jpegOutputStream)
            val bytes = jpegOutputStream.toByteArray()
            val decoded = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
            if (decoded != null) {
                val matrix = Matrix().apply { postRotate(rotation.toFloat()) }
                Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, matrix, true)
            } else null
        } catch (e: Exception) {
            Log.e(TAG, "Failed to decode keyframe.", e)
            null
        }

        if (bitmap == null) {
            handleFaceLoss()
            return
        }

        val landmarker = faceLandmarker
        if (landmarker == null) {
            handleFaceLoss()
            return
        }

        val result = try {
            landmarker.detect(BitmapImageBuilder(bitmap).build())
        } catch (e: Exception) {
            Log.e(TAG, "FaceLandmarker detection failed.", e)
            null
        }

        val landmarks = result?.faceLandmarks()?.firstOrNull()
        if (landmarks.isNullOrEmpty()) {
            handleFaceLoss()
            return
        }

        missingFaceFrames = 0

        // ── Extract face ROI ───────────────────────────────────────
        val faceBox = extractFaceBox(landmarks)
        if (faceBox == null || faceBox.width < MIN_FACE_WIDTH || faceBox.height < MIN_FACE_HEIGHT) {
            handleFaceLoss()
            return
        }

        val faceWidth = max(faceBox.width, 1e-6)
        val faceHeight = max(faceBox.height, 1e-6)

        // ── Sample colours from Bitmap (for keyframe metrics) ──────
        val leftCheek = samplePatch(bitmap, faceBox, xFactor = 0.32, yFactor = 0.57)
        val rightCheek = samplePatch(bitmap, faceBox, xFactor = 0.68, yFactor = 0.57)
        val cheekColor = averageRgb(leftCheek, rightCheek)
        val lipColor = samplePatch(bitmap, faceBox, xFactor = 0.50, yFactor = 0.78, widthFactor = 0.12, heightFactor = 0.07)

        val signalQuality = cheekColor?.let { computeSignalQuality(faceBox, it) } ?: 0.0

        // ── Update cached ROI for Tier 2 frames ────────────────────
        val noseTip = landmarks[1]
        cachedRoi = CachedRoi(
            faceBox = faceBox,
            signalQuality = signalQuality,
            timestampMs = currentTimeMs,
            noseTipX = noseTip.x().toDouble(),
            noseTipY = noseTip.y().toDouble()
        )

        // ── Keyframe-only signals ──────────────────────────────────
        val leftEar = computeEyeAspectRatio(landmarks, 33, 160, 158, 133, 153, 144)
        val rightEar = computeEyeAspectRatio(landmarks, 362, 385, 387, 263, 373, 380)
        val averageEar = listOf(leftEar, rightEar).filterNotNull().averageOrNull()
        val drowsinessScore = averageEar?.let {
            smooth(smoothedDrowsiness, ((0.29 - it) / 0.11).coerceIn(0.0, 1.0), alpha = 0.18)
                .also { value -> smoothedDrowsiness = value }
        }
        lastKeyframeDrowsiness = drowsinessScore

        val blendshapes = if (result.faceBlendshapes().isPresent) {
            result.faceBlendshapes().get().firstOrNull().orEmpty()
        } else emptyList()
        val painScore = estimatePainScore(blendshapes)
            ?.let { smooth(smoothedPain, it, alpha = 0.22) }
            ?.also { value -> smoothedPain = value }
            ?.round(1)
        lastKeyframePain = painScore

        val asymmetryScore = estimateFacialAsymmetry(landmarks, faceWidth, faceHeight)
            ?.let { smooth(smoothedAsymmetry, it, alpha = 0.16) }
            ?.also { value -> smoothedAsymmetry = value }
            ?.round(3)
        lastKeyframeAsymmetry = asymmetryScore

        val tremor = estimateTremor(currentTimeMs, landmarks, faceWidth, signalQuality)
        lastKeyframeTremor = tremor

        lastKeyframePosture = estimatePosture(landmarks)

        // ── rPPG from YUV (preferred) or Bitmap fallback ───────────
        val rppgColor = yuvCheekColor ?: cheekColor
        val heartRate = rppgColor
            ?.takeIf { signalQuality >= 0.45 }
            ?.let { estimateHeartRate(currentTimeMs, it) }

        val respirationRate = estimateRespirationRate(currentTimeMs, landmarks)

        val pallorScore = lipColor
            ?.takeIf { signalQuality >= 0.35 }
            ?.let { estimatePallorScore(it) }
            ?.let { smooth(smoothedPallor, it, alpha = 0.12) }
            ?.also { value -> smoothedPallor = value }
            ?.round(3)

        // ── Emit complete metrics ──────────────────────────────────
        _vitalsData.value = CVMetrics(
            heartRate = heartRate,
            respirationRate = respirationRate,
            spo2 = null,
            drowsinessScore = drowsinessScore?.round(3),
            facialAsymmetryScore = asymmetryScore,
            tremorDetected = tremor.detected,
            tremorSeverity = tremor.severity?.round(2),
            tremorFrequency = tremor.frequency?.round(2),
            painScore = painScore,
            posture = lastKeyframePosture?.first,
            spineAngle = lastKeyframePosture?.second?.round(1),
            pallorScore = pallorScore,
            hemoglobinEstimate = null,
            stressLevel = null,
            skinCondition = null,
            isFaceDetected = true,
            signalQuality = signalQuality.round(3),
            confidence = (Math.min(1.0, Math.max(0.1, signalQuality * 0.8))).round(2),
            capturedAtMs = currentTimeMs
        )
    }

    // ══════════════════════════════════════════════════════════════════
    //  TIER 2: LIGHTWEIGHT FRAME PROCESSING (sync, ~30 FPS)
    // ══════════════════════════════════════════════════════════════════

    private fun processLightweightFrame(
        cheekColor: RgbStats?,
        lipColor: RgbStats?,
        roi: CachedRoi,
        currentTimeMs: Long
    ) {
        // ── Motion-Aware ROI Refresh ───────────────────────────────
        val currentLuminance = cheekColor?.luminance
        if (currentLuminance != null && lastLuminance != null) {
            val delta = Math.abs(currentLuminance - lastLuminance!!)
            if (delta > 20.0) {
                // Sudden movement detected: invalidate ROI to force keyframe
                cachedRoi = null
            }
        }
        lastLuminance = currentLuminance

        // ── rPPG signal ────────────────────────────────────────────
        val heartRate = cheekColor
            ?.takeIf { roi.signalQuality >= 0.45 }
            ?.let { estimateHeartRate(currentTimeMs, it) }

        // ── Pallor from lip colour ─────────────────────────────────
        val pallorScore = lipColor
            ?.takeIf { roi.signalQuality >= 0.35 }
            ?.let { estimatePallorScore(it) }
            ?.let { smooth(smoothedPallor, it, alpha = 0.12) }
            ?.also { value -> smoothedPallor = value }
            ?.round(3)

        // ── Emit metrics (reuse cached keyframe signals) ───────────
        _vitalsData.value = CVMetrics(
            heartRate = heartRate,
            respirationRate = smoothedRespirationRate?.round(1),
            spo2 = null,
            drowsinessScore = lastKeyframeDrowsiness?.round(3),
            facialAsymmetryScore = lastKeyframeAsymmetry,
            tremorDetected = lastKeyframeTremor.detected,
            tremorSeverity = lastKeyframeTremor.severity?.round(2),
            tremorFrequency = lastKeyframeTremor.frequency?.round(2),
            painScore = lastKeyframePain,
            posture = lastKeyframePosture?.first,
            spineAngle = lastKeyframePosture?.second?.round(1),
            pallorScore = pallorScore,
            hemoglobinEstimate = null,
            stressLevel = null,
            skinCondition = null,
            isFaceDetected = true,
            signalQuality = roi.signalQuality.round(3),
            confidence = (min(1.0, max(0.1, roi.signalQuality * 0.8))).round(2),
            capturedAtMs = currentTimeMs
        )
    }

    // ══════════════════════════════════════════════════════════════════
    //  DIRECT YUV → RGB COLOR SAMPLING (zero-allocation)
    // ══════════════════════════════════════════════════════════════════

    /**
     * Samples a rectangular patch from raw I420 YUV planes and returns
     * average RGB values. This is ~100x faster than Bitmap.getPixel()
     * and allocates **zero** heap memory.
     *
     * I420 layout:
     *   Y plane: width × height, stride = strideY
     *   U plane: (width/2) × (height/2), stride = strideU
     *   V plane: (width/2) × (height/2), stride = strideV
     *
     * Conversion:
     *   R = Y + 1.402 × (V − 128)
     *   G = Y − 0.344 × (U − 128) − 0.714 × (V − 128)
     *   B = Y + 1.772 × (U − 128)
     */
    private fun sampleYuvPatch(
        yPlane: ByteBuffer, yStride: Int,
        uPlane: ByteBuffer, uStride: Int,
        vPlane: ByteBuffer, vStride: Int,
        frameWidth: Int, frameHeight: Int,
        faceBox: FaceBox,
        xFactor: Double, yFactor: Double,
        widthFactor: Double = 0.14, heightFactor: Double = 0.10
    ): RgbStats? {
        val centerX = faceBox.left + (faceBox.width * xFactor)
        val centerY = faceBox.top + (faceBox.height * yFactor)
        val patchW = faceBox.width * widthFactor
        val patchH = faceBox.height * heightFactor

        val left = ((centerX - patchW / 2.0) * frameWidth).toInt().coerceIn(0, frameWidth - 1)
        val right = ((centerX + patchW / 2.0) * frameWidth).toInt().coerceIn(0, frameWidth - 1)
        val top = ((centerY - patchH / 2.0) * frameHeight).toInt().coerceIn(0, frameHeight - 1)
        val bottom = ((centerY + patchH / 2.0) * frameHeight).toInt().coerceIn(0, frameHeight - 1)

        if (right <= left || bottom <= top) return null

        // Sub-sample: take every Nth pixel to keep cost constant
        val stepX = max(1, (right - left) / 6)
        val stepY = max(1, (bottom - top) / 6)

        var rSum = 0.0
        var gSum = 0.0
        var bSum = 0.0
        var count = 0

        val yDup = yPlane.duplicate()
        val uDup = uPlane.duplicate()
        val vDup = vPlane.duplicate()

        var py = top
        while (py <= bottom) {
            var px = left
            while (px <= right) {
                // Read Y value
                val yIndex = py * yStride + px
                if (yIndex < 0 || yIndex >= yDup.capacity()) { px += stepX; continue }
                val yVal = (yDup.get(yIndex).toInt() and 0xFF).toDouble()

                // Read U and V values (chroma is half-resolution)
                val chromaRow = py / 2
                val chromaCol = px / 2
                val uIndex = chromaRow * uStride + chromaCol
                val vIndex = chromaRow * vStride + chromaCol

                if (uIndex < 0 || uIndex >= uDup.capacity() ||
                    vIndex < 0 || vIndex >= vDup.capacity()) {
                    px += stepX; continue
                }

                val uVal = (uDup.get(uIndex).toInt() and 0xFF).toDouble() - 128.0
                val vVal = (vDup.get(vIndex).toInt() and 0xFF).toDouble() - 128.0

                // ITU-R BT.601 YUV → RGB
                val r = (yVal + 1.402 * vVal).coerceIn(0.0, 255.0)
                val g = (yVal - 0.344 * uVal - 0.714 * vVal).coerceIn(0.0, 255.0)
                val b = (yVal + 1.772 * uVal).coerceIn(0.0, 255.0)

                rSum += r / 255.0
                gSum += g / 255.0
                bSum += b / 255.0
                count++

                px += stepX
            }
            py += stepY
        }

        if (count == 0) return null
        return RgbStats(
            red = rSum / count,
            green = gSum / count,
            blue = bSum / count
        )
    }

    // ══════════════════════════════════════════════════════════════════
    //  SIGNAL ESTIMATION
    // ══════════════════════════════════════════════════════════════════

    private fun estimateHeartRate(currentTimeMs: Long, cheekColor: RgbStats): Double? {
        val chroma = cheekColor.green - ((cheekColor.red + cheekColor.blue) * 0.5)
        pulseSamples.addLast(SignalSample(currentTimeMs, chroma))
        trimSamples(pulseSamples, currentTimeMs, PPG_WINDOW_MS)

        val estimate = estimateDominantFrequency(
            samples = pulseSamples,
            minHz = 0.8,
            maxHz = 2.4,
            stepHz = 0.03,
            minDurationSec = 8.0,
            minSampleCount = 70
        ) ?: return null

        if (estimate.confidence < 0.18) return null

        val bpm = (estimate.frequencyHz * 60.0).coerceIn(45.0, 160.0)
        smoothedHeartRate = smooth(smoothedHeartRate, bpm, alpha = 0.2)
        return smoothedHeartRate?.round(1)
    }

    private fun estimateRespirationRate(
        currentTimeMs: Long,
        landmarks: List<com.google.mediapipe.tasks.components.containers.NormalizedLandmark>
    ): Double? {
        val mouthWidth = distance(landmarks, 78, 308)
        if (mouthWidth == null || mouthWidth < 1e-6) return null

        val mouthOpenness = distance(landmarks, 13, 14)?.div(mouthWidth) ?: return null
        respirationSamples.addLast(SignalSample(currentTimeMs, mouthOpenness))
        trimSamples(respirationSamples, currentTimeMs, RESPIRATION_WINDOW_MS)

        val estimate = estimateDominantFrequency(
            samples = respirationSamples,
            minHz = 0.10,
            maxHz = 0.60,
            stepHz = 0.01,
            minDurationSec = 10.0,
            minSampleCount = 90
        ) ?: return null

        if (estimate.confidence < 0.14) return null

        val breathsPerMinute = (estimate.frequencyHz * 60.0).coerceIn(6.0, 32.0)
        smoothedRespirationRate = smooth(smoothedRespirationRate, breathsPerMinute, alpha = 0.16)
        return smoothedRespirationRate?.round(1)
    }

    private fun estimateTremor(
        currentTimeMs: Long,
        landmarks: List<com.google.mediapipe.tasks.components.containers.NormalizedLandmark>,
        faceWidth: Double,
        signalQuality: Double
    ): TremorMetrics {
        val eyeMidX = midpointX(landmarks, 33, 263) ?: return TremorMetrics(null, null, null)
        val noseX = landmarks[1].x().toDouble()
        val relativeNoseX = (noseX - eyeMidX) / max(faceWidth, 1e-6)

        tremorBaselineX = smooth(tremorBaselineX, relativeNoseX, alpha = 0.08)
        val residual = relativeNoseX - (tremorBaselineX ?: relativeNoseX)

        tremorSamples.addLast(SignalSample(currentTimeMs, residual))
        trimSamples(tremorSamples, currentTimeMs, TREMOR_WINDOW_MS)

        val hasEnoughData = tremorSamples.size >= 30 &&
            ((tremorSamples.last().timeMs - tremorSamples.first().timeMs) >= 3_000L)
        if (!hasEnoughData || signalQuality < 0.45) {
            return TremorMetrics(null, null, null)
        }

        val estimate = estimateDominantFrequency(
            samples = tremorSamples,
            minHz = 2.5,
            maxHz = 5.5,
            stepHz = 0.05,
            minDurationSec = 3.0,
            minSampleCount = 30
        )

        val amplitude = stdDev(tremorSamples.map { it.value })
        val detected = estimate != null && estimate.confidence >= 0.16 && amplitude >= 0.0014

        return if (detected && estimate != null) {
            val severity = (((amplitude - 0.0014) / 0.0035) * 10.0).coerceIn(0.0, 10.0)
            TremorMetrics(detected = true, severity = severity, frequency = estimate.frequencyHz)
        } else {
            TremorMetrics(detected = false, severity = null, frequency = null)
        }
    }

    private fun estimatePainScore(
        categories: List<com.google.mediapipe.tasks.components.containers.Category>
    ): Double? {
        if (categories.isEmpty()) return null
        val scores = categories.associate { it.categoryName() to it.score().toDouble() }
        fun avg(vararg keys: String): Double {
            val values = keys.mapNotNull { scores[it] }
            return if (values.isEmpty()) 0.0 else values.average()
        }
        val brow = avg("browDownLeft", "browDownRight")
        val eye = avg("eyeSquintLeft", "eyeSquintRight", "cheekSquintLeft", "cheekSquintRight")
        val nose = avg("noseSneerLeft", "noseSneerRight")
        val jaw = avg("jawOpen")
        val raw = (brow * 3.2) + (eye * 2.4) + (nose * 2.8) + (jaw * 1.2)
        return raw.coerceIn(0.0, 10.0)
    }

    private fun estimateFacialAsymmetry(
        landmarks: List<com.google.mediapipe.tasks.components.containers.NormalizedLandmark>,
        faceWidth: Double,
        faceHeight: Double
    ): Double? {
        val nose = landmarks[1]
        val pairs = listOf(61 to 291, 33 to 263, 159 to 386, 145 to 374, 105 to 334)
        val perPair = pairs.mapNotNull { (leftIndex, rightIndex) ->
            val left = landmarks.getOrNull(leftIndex) ?: return@mapNotNull null
            val right = landmarks.getOrNull(rightIndex) ?: return@mapNotNull null
            val leftDx = abs(left.x().toDouble() - nose.x().toDouble())
            val rightDx = abs(right.x().toDouble() - nose.x().toDouble())
            val horizontal = abs(leftDx - rightDx) / max(faceWidth, 1e-6)
            val vertical = abs(left.y().toDouble() - right.y().toDouble()) / max(faceHeight, 1e-6)
            (horizontal * 0.7) + (vertical * 0.3)
        }
        if (perPair.isEmpty()) return null
        return (perPair.average() * 2.8).coerceIn(0.0, 1.0)
    }

    private fun estimatePallorScore(color: RgbStats): Double? {
        if (color.luminance !in 0.10..0.90) return null
        val hsv = FloatArray(3)
        Color.RGBToHSV(
            (color.red * 255.0).toInt().coerceIn(0, 255),
            (color.green * 255.0).toInt().coerceIn(0, 255),
            (color.blue * 255.0).toInt().coerceIn(0, 255),
            hsv
        )
        val saturation = hsv[1].toDouble()
        val redRatio = color.red / max(color.green + color.blue, 1e-6)
        val lowSaturation = ((0.42 - saturation) / 0.42).coerceIn(0.0, 1.0)
        val lowRedness = ((0.90 - redRatio) / 0.90).coerceIn(0.0, 1.0)
        return ((lowSaturation * 0.65) + (lowRedness * 0.35)).coerceIn(0.0, 1.0)
    }

    private fun estimatePosture(
        landmarks: List<com.google.mediapipe.tasks.components.containers.NormalizedLandmark>
    ): Pair<String, Double>? {
        val leftEye = landmarks.getOrNull(33) ?: return null
        val rightEye = landmarks.getOrNull(263) ?: return null
        val rollDegrees = abs(
            atan2(
                rightEye.y().toDouble() - leftEye.y().toDouble(),
                rightEye.x().toDouble() - leftEye.x().toDouble()
            ) * 180.0 / PI
        )
        return when {
            rollDegrees >= 55.0 -> "lying_down" to rollDegrees
            rollDegrees >= 18.0 -> "leaning" to rollDegrees
            else -> null
        }
    }

    // ══════════════════════════════════════════════════════════════════
    //  BITMAP-BASED COLOR SAMPLING (keyframes only)
    // ══════════════════════════════════════════════════════════════════

    private fun samplePatch(
        bitmap: Bitmap,
        faceBox: FaceBox,
        xFactor: Double,
        yFactor: Double,
        widthFactor: Double = 0.14,
        heightFactor: Double = 0.10
    ): RgbStats? {
        val centerX = faceBox.left + (faceBox.width * xFactor)
        val centerY = faceBox.top + (faceBox.height * yFactor)
        val patchWidth = faceBox.width * widthFactor
        val patchHeight = faceBox.height * heightFactor

        val left = ((centerX - (patchWidth / 2.0)) * bitmap.width).toInt().coerceIn(0, bitmap.width - 1)
        val right = ((centerX + (patchWidth / 2.0)) * bitmap.width).toInt().coerceIn(0, bitmap.width - 1)
        val top = ((centerY - (patchHeight / 2.0)) * bitmap.height).toInt().coerceIn(0, bitmap.height - 1)
        val bottom = ((centerY + (patchHeight / 2.0)) * bitmap.height).toInt().coerceIn(0, bitmap.height - 1)

        if (right <= left || bottom <= top) return null

        val stepX = max(1, (right - left) / 6)
        val stepY = max(1, (bottom - top) / 6)
        var red = 0.0
        var green = 0.0
        var blue = 0.0
        var count = 0

        var y = top
        while (y <= bottom) {
            var x = left
            while (x <= right) {
                val pixel = bitmap.getPixel(x, y)
                red += Color.red(pixel) / 255.0
                green += Color.green(pixel) / 255.0
                blue += Color.blue(pixel) / 255.0
                count++
                x += stepX
            }
            y += stepY
        }

        if (count == 0) return null
        return RgbStats(red = red / count, green = green / count, blue = blue / count)
    }

    // ══════════════════════════════════════════════════════════════════
    //  HELPERS
    // ══════════════════════════════════════════════════════════════════

    private fun computeSignalQuality(faceBox: FaceBox, cheekColor: RgbStats): Double {
        val areaScore = (faceBox.area / 0.18).coerceIn(0.0, 1.0)
        val brightnessScore = (1.0 - (abs(cheekColor.luminance - 0.55) / 0.55)).coerceIn(0.0, 1.0)
        return ((areaScore * 0.65) + (brightnessScore * 0.35)).coerceIn(0.0, 1.0)
    }

    private fun extractFaceBox(
        landmarks: List<com.google.mediapipe.tasks.components.containers.NormalizedLandmark>
    ): FaceBox? {
        if (landmarks.isEmpty()) return null
        var minX = 1.0; var minY = 1.0; var maxX = 0.0; var maxY = 0.0
        for (landmark in landmarks) {
            minX = min(minX, landmark.x().toDouble())
            minY = min(minY, landmark.y().toDouble())
            maxX = max(maxX, landmark.x().toDouble())
            maxY = max(maxY, landmark.y().toDouble())
        }
        if (maxX <= minX || maxY <= minY) return null
        return FaceBox(minX, minY, maxX, maxY)
    }

    private fun averageRgb(first: RgbStats?, second: RgbStats?): RgbStats? {
        if (first == null && second == null) return null
        if (first == null) return second
        if (second == null) return first
        return RgbStats(
            red = (first.red + second.red) / 2.0,
            green = (first.green + second.green) / 2.0,
            blue = (first.blue + second.blue) / 2.0
        )
    }

    private fun computeEyeAspectRatio(
        landmarks: List<com.google.mediapipe.tasks.components.containers.NormalizedLandmark>,
        p1: Int, p2: Int, p3: Int, p4: Int, p5: Int, p6: Int
    ): Double? {
        val horizontal = distance(landmarks, p1, p4) ?: return null
        if (horizontal < 1e-6) return null
        val verticalA = distance(landmarks, p2, p6) ?: return null
        val verticalB = distance(landmarks, p3, p5) ?: return null
        return (verticalA + verticalB) / (2.0 * horizontal)
    }

    private fun midpointX(
        landmarks: List<com.google.mediapipe.tasks.components.containers.NormalizedLandmark>,
        first: Int, second: Int
    ): Double? {
        val left = landmarks.getOrNull(first) ?: return null
        val right = landmarks.getOrNull(second) ?: return null
        return (left.x().toDouble() + right.x().toDouble()) / 2.0
    }

    private fun distance(
        landmarks: List<com.google.mediapipe.tasks.components.containers.NormalizedLandmark>,
        first: Int, second: Int
    ): Double? {
        val left = landmarks.getOrNull(first) ?: return null
        val right = landmarks.getOrNull(second) ?: return null
        return hypot(
            left.x().toDouble() - right.x().toDouble(),
            left.y().toDouble() - right.y().toDouble()
        )
    }

    private fun estimateDominantFrequency(
        samples: ArrayDeque<SignalSample>,
        minHz: Double, maxHz: Double, stepHz: Double,
        minDurationSec: Double, minSampleCount: Int
    ): FrequencyEstimate? {
        if (samples.size < minSampleCount) return null
        val points = samples.toList()
        val start = points.first().timeMs
        val durationSec = (points.last().timeMs - start) / 1000.0
        if (durationSec < minDurationSec) return null

        val values = points.map { it.value }
        val mean = values.average()
        val centered = values.map { it - mean }
        val energy = centered.sumOf { it * it }
        if (energy < 1e-8) return null

        var bestFrequency = 0.0
        var bestPower = 0.0
        var secondBestPower = 0.0

        var frequency = minHz
        while (frequency <= maxHz) {
            var real = 0.0
            var imaginary = 0.0
            val omega = 2.0 * PI * frequency
            for (index in points.indices) {
                val timeSec = (points[index].timeMs - start) / 1000.0
                val value = centered[index]
                val window = if (points.size > 1) {
                    0.54 - (0.46 * cos(2.0 * PI * index / (points.size - 1)))
                } else 1.0
                real += value * window * cos(omega * timeSec)
                imaginary += value * window * sin(omega * timeSec)
            }
            val power = (real * real) + (imaginary * imaginary)
            if (power > bestPower) {
                secondBestPower = bestPower
                bestPower = power
                bestFrequency = frequency
            } else if (power > secondBestPower) {
                secondBestPower = power
            }
            frequency += stepHz
        }

        if (bestPower <= 0.0) return null
        val confidence = (bestPower / (energy + 1e-6)).coerceIn(0.0, 1.0)
        val peakSeparation = (bestPower / max(secondBestPower, 1e-6)).coerceAtMost(4.0) / 4.0
        return FrequencyEstimate(
            frequencyHz = bestFrequency,
            confidence = ((confidence * 0.7) + (peakSeparation * 0.3)).coerceIn(0.0, 1.0)
        )
    }

    private fun handleFaceLoss() {
        missingFaceFrames++
        if (missingFaceFrames >= 2) {
            clearBuffers()
            cachedRoi = null
            _vitalsData.value = CVMetrics(
                isFaceDetected = false,
                capturedAtMs = System.currentTimeMillis()
            )
        }
    }

    private fun clearBuffers() {
        pulseSamples.clear()
        respirationSamples.clear()
        tremorSamples.clear()
        smoothedHeartRate = null
        smoothedRespirationRate = null
        smoothedDrowsiness = null
        smoothedPain = null
        smoothedAsymmetry = null
        smoothedPallor = null
        tremorBaselineX = null
        lastKeyframeDrowsiness = null
        lastKeyframePain = null
        lastKeyframeAsymmetry = null
        lastKeyframeTremor = TremorMetrics(null, null, null)
        lastKeyframePosture = null
    }

    private fun trimSamples(samples: ArrayDeque<SignalSample>, currentTimeMs: Long, maxAgeMs: Long) {
        while (samples.isNotEmpty() && currentTimeMs - samples.first().timeMs > maxAgeMs) {
            samples.removeFirst()
        }
    }

    private fun smooth(previous: Double?, current: Double, alpha: Double): Double {
        return if (previous == null) current else (previous * (1.0 - alpha)) + (current * alpha)
    }

    private fun stdDev(values: List<Double>): Double {
        if (values.size < 2) return 0.0
        val mean = values.average()
        val variance = values.sumOf { (it - mean) * (it - mean) } / values.size
        return sqrt(variance)
    }

    private fun List<Double>.averageOrNull(): Double? {
        return if (isEmpty()) null else average()
    }

    private fun Double.round(decimals: Int): Double {
        val scale = 10.0.pow(decimals.toDouble())
        return round(this * scale) / scale
    }

    // ══════════════════════════════════════════════════════════════════
    //  I420 PLANE COPY UTILITIES
    // ══════════════════════════════════════════════════════════════════

    private fun copyPlane(
        source: ByteBuffer,
        stride: Int,
        destination: ByteArray,
        width: Int,
        height: Int,
        offset: Int
    ) {
        val duplicate = source.duplicate()
        for (row in 0 until height) {
            duplicate.position(row * stride)
            duplicate.get(destination, offset + (row * width), width)
        }
    }

    private fun copyUvPlanesToNv21(
        vBuffer: ByteBuffer,
        vStride: Int,
        uBuffer: ByteBuffer,
        uStride: Int,
        destination: ByteArray,
        width: Int,
        height: Int,
        offset: Int
    ) {
        val chromaHeight = height / 2
        val chromaWidth = width / 2
        val v = vBuffer.duplicate()
        val u = uBuffer.duplicate()
        for (row in 0 until chromaHeight) {
            for (col in 0 until chromaWidth) {
                val destIndex = offset + (row * width) + (col * 2)
                destination[destIndex] = v.get(row * vStride + col)
                destination[destIndex + 1] = u.get(row * uStride + col)
            }
        }
    }

    // ══════════════════════════════════════════════════════════════════
    //  RELEASE
    // ══════════════════════════════════════════════════════════════════

    fun release() {
        clearBuffers()
        cachedRoi = null
        faceLandmarker?.close()
        faceLandmarker = null
        try {
            scope.cancel()
            cvDispatcher.close()
        } catch (e: Exception) {}
    }
}
