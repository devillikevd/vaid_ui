package com.example.swastik.data.webrtc

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.Surface
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.core.UseCase
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import org.webrtc.CapturerObserver
import org.webrtc.SurfaceTextureHelper
import org.webrtc.VideoCapturer
import org.webrtc.VideoFrame
import java.util.concurrent.Executors

class CameraXCapturer(
    private val onImageProxy: ((ImageProxy) -> Boolean)? = null,
    private val isImageAnalysisEnabled: () -> Boolean = { onImageProxy != null }
) : VideoCapturer, LifecycleOwner {

    private val lifecycleRegistry = LifecycleRegistry(this)
    override val lifecycle: Lifecycle get() = lifecycleRegistry

    private var context: Context? = null
    private var surfaceTextureHelper: SurfaceTextureHelper? = null
    private var capturerObserver: CapturerObserver? = null
    
    private var cameraProvider: ProcessCameraProvider? = null
    private var isFrontCamera = true
    private val mainHandler = Handler(Looper.getMainLooper())
    private val analysisExecutor = Executors.newSingleThreadExecutor()
    private var captureWidth = 480
    private var captureHeight = 360
    private var captureFps = 20
    private var imageAnalysisUseCase: ImageAnalysis? = null

    companion object {
        private const val TAG = "CameraXCapturer"
    }

    override fun initialize(
        surfaceTextureHelper: SurfaceTextureHelper?,
        applicationContext: Context?,
        capturerObserver: CapturerObserver?
    ) {
        this.context = applicationContext
        this.surfaceTextureHelper = surfaceTextureHelper
        this.capturerObserver = capturerObserver
    }

    override fun startCapture(width: Int, height: Int, framerate: Int) {
        val ctx = context ?: return
        val helper = surfaceTextureHelper ?: return
        val observer = capturerObserver ?: return
        if (width > 0) captureWidth = width
        if (height > 0) captureHeight = height
        if (framerate > 0) captureFps = framerate

        val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
        
        // Ensure binding happens on main thread
        cameraProviderFuture.addListener({
            try {
                val provider = cameraProviderFuture.get()
                cameraProvider = provider
                val requestedSize = android.util.Size(captureWidth, captureHeight)
                
                provider.unbindAll()
                imageAnalysisUseCase = null

                // WebRTC Preview
                val preview = Preview.Builder()
                    .setTargetResolution(requestedSize)
                    .build()
                
                preview.setSurfaceProvider { request ->
                    val surfaceTexture = helper.surfaceTexture
                    surfaceTexture.setDefaultBufferSize(request.resolution.width, request.resolution.height)
                    helper.setTextureSize(request.resolution.width, request.resolution.height)
                    val surface = Surface(surfaceTexture)
                    
                    request.provideSurface(surface, ContextCompat.getMainExecutor(ctx)) {
                        Log.d(TAG, "Surface released.")
                        surface.release()
                    }
                    Log.d(TAG, "Surface provided to CameraX.")
                }

                // Push SurfaceTexture frames to WebRTC
                helper.startListening { videoFrame ->
                    observer.onFrameCaptured(videoFrame)
                }

                val useCases = mutableListOf<UseCase>(preview)
                var analysisDescription = "off"
                var pendingImageAnalysis: ImageAnalysis? = null

                if (isImageAnalysisEnabled()) {
                    val (imageAnalyzer, description) = createImageAnalysisUseCase(ctx)
                    pendingImageAnalysis = imageAnalyzer
                    analysisDescription = description
                    useCases.add(imageAnalyzer)
                }

                val cameraSelector = if (isFrontCamera) {
                    CameraSelector.DEFAULT_FRONT_CAMERA
                } else {
                    CameraSelector.DEFAULT_BACK_CAMERA
                }
                
                // Transition to Started state so CameraX can bind.
                // It's safe to directly assign if we are on the main thread (which addListener guarantees via getMainExecutor).
                if (lifecycleRegistry.currentState == Lifecycle.State.DESTROYED) {
                    Log.w(TAG, "Cannot start capture, lifecycle is destroyed.")
                    return@addListener
                }
                if (lifecycleRegistry.currentState == Lifecycle.State.INITIALIZED) {
                    lifecycleRegistry.currentState = Lifecycle.State.CREATED
                }
                if (lifecycleRegistry.currentState == Lifecycle.State.CREATED) {
                    lifecycleRegistry.currentState = Lifecycle.State.STARTED
                }
                if (lifecycleRegistry.currentState == Lifecycle.State.STARTED) {
                    lifecycleRegistry.currentState = Lifecycle.State.RESUMED
                }

                provider.bindToLifecycle(
                    this,
                    cameraSelector,
                    *useCases.toTypedArray()
                )
                imageAnalysisUseCase = pendingImageAnalysis
                

                
                observer.onCapturerStarted(true)
                Log.d(TAG, "CameraX started at ${captureWidth}x${captureHeight}@${captureFps}fps, AI=$analysisDescription.")

            } catch (e: Exception) {
                Log.e(TAG, "Failed to start CameraX: ${e.message}", e)
                observer.onCapturerStarted(false)
            }
        }, ContextCompat.getMainExecutor(ctx))
    }

    override fun stopCapture() {
        mainHandler.post {
            // Demote to CREATED. CameraX unbinds use cases when lifecycle drops below STARTED.
            // Using CREATED instead of DESTROYED allows WebRTC to safely stop/start tracks.
            lifecycleRegistry.currentState = Lifecycle.State.CREATED
            try {
                cameraProvider?.unbindAll()
                imageAnalysisUseCase = null
                surfaceTextureHelper?.stopListening()
                capturerObserver?.onCapturerStopped()
                Log.d(TAG, "CameraX stopped.")
            } catch (e: Exception) {
                Log.e(TAG, "Error stopping CameraX: ${e.message}", e)
            }
        }
    }

    override fun changeCaptureFormat(width: Int, height: Int, framerate: Int) {
        // CameraX handles resolutions automatically, but we can restart if absolutely needed.
    }

    override fun dispose() {
        stopCapture()
        mainHandler.post {
            lifecycleRegistry.currentState = Lifecycle.State.DESTROYED
        }
        analysisExecutor.shutdown()
    }

    override fun isScreencast(): Boolean {
        return false
    }

    fun switchCamera() {
        isFrontCamera = !isFrontCamera
        mainHandler.post {
            try {
                cameraProvider?.unbindAll()
                imageAnalysisUseCase = null
                // Re-start capture with new camera selector
                startCapture(captureWidth, captureHeight, captureFps)
            } catch (e: Exception) {
                Log.e(TAG, "Error switching camera", e)
            }
        }
    }

    fun updateImageAnalysisBinding() {
        mainHandler.post {
            val provider = cameraProvider ?: return@post
            val ctx = context ?: return@post

            if (!isImageAnalysisEnabled()) {
                imageAnalysisUseCase?.let { useCase ->
                    runCatching { provider.unbind(useCase) }
                    imageAnalysisUseCase = null
                    Log.d(TAG, "CameraX AI analysis disabled.")
                }
                return@post
            }

            if (imageAnalysisUseCase != null) return@post

            try {
                if (lifecycleRegistry.currentState == Lifecycle.State.DESTROYED) {
                    return@post
                }
                if (lifecycleRegistry.currentState == Lifecycle.State.INITIALIZED) {
                    lifecycleRegistry.currentState = Lifecycle.State.CREATED
                }
                if (lifecycleRegistry.currentState == Lifecycle.State.CREATED) {
                    lifecycleRegistry.currentState = Lifecycle.State.STARTED
                }
                if (lifecycleRegistry.currentState == Lifecycle.State.STARTED) {
                    lifecycleRegistry.currentState = Lifecycle.State.RESUMED
                }

                val (imageAnalyzer, description) = createImageAnalysisUseCase(ctx)
                val cameraSelector = if (isFrontCamera) {
                    CameraSelector.DEFAULT_FRONT_CAMERA
                } else {
                    CameraSelector.DEFAULT_BACK_CAMERA
                }

                provider.bindToLifecycle(this, cameraSelector, imageAnalyzer)
                imageAnalysisUseCase = imageAnalyzer
                Log.d(TAG, "CameraX AI analysis enabled at $description.")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to update CameraX AI analysis: ${e.message}", e)
            }
        }
    }

    private fun createImageAnalysisUseCase(ctx: Context): Pair<ImageAnalysis, String> {
        // AI ImageAnalysis (decoupled CPU stream). Bind this only when a
        // real consumer exists, otherwise CameraX burns CPU closing frames.
        val isLowEndDevice = com.example.swastik.util.vision.DeviceProfiler.getTier2IntervalMs(ctx) >= 100L
        val targetResolution = if (isLowEndDevice) android.util.Size(320, 240) else android.util.Size(640, 480)
        val description = "${targetResolution.width}x${targetResolution.height}"

        val imageAnalyzer = ImageAnalysis.Builder()
            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
            .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_YUV_420_888)
            .setTargetResolution(targetResolution)
            .build()

        imageAnalyzer.setAnalyzer(analysisExecutor) { imageProxy ->
            try {
                val handled = onImageProxy?.invoke(imageProxy)
                if (handled != true) {
                    imageProxy.close()
                }
            } catch (e: Throwable) {
                Log.e(TAG, "Exception in ImageAnalyzer", e)
                imageProxy.close()
            }
        }

        return imageAnalyzer to description
    }
}
