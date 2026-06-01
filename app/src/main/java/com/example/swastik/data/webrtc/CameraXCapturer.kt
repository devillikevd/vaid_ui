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
    private val onImageProxy: ((ImageProxy) -> Unit)? = null
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

        val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
        
        // Ensure binding happens on main thread
        cameraProviderFuture.addListener({
            try {
                val provider = cameraProviderFuture.get()
                cameraProvider = provider
                
                provider.unbindAll()

                // WebRTC Preview
                val preview = Preview.Builder()
                    .setTargetResolution(android.util.Size(width, height))
                    .build()
                
                preview.setSurfaceProvider { request ->
                    val surfaceTexture = helper.surfaceTexture
                    surfaceTexture.setDefaultBufferSize(request.resolution.width, request.resolution.height)
                    val surface = Surface(surfaceTexture)
                    
                    request.provideSurface(surface, ContextCompat.getMainExecutor(ctx)) {
                        surface.release()
                    }
                }

                // Push SurfaceTexture frames to WebRTC
                helper.startListening { videoFrame ->
                    observer.onFrameCaptured(videoFrame)
                }

                // AI ImageAnalysis (Decoupled CPU stream)
                val isLowEndDevice = com.example.swastik.util.vision.DeviceProfiler.getTier2IntervalMs(ctx) >= 100L
                val targetResolution = if (isLowEndDevice) android.util.Size(320, 240) else android.util.Size(640, 480)
                
                val imageAnalyzer = ImageAnalysis.Builder()
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .setTargetResolution(targetResolution)
                    .build()
                    
                imageAnalyzer.setAnalyzer(analysisExecutor) { imageProxy ->
                    onImageProxy?.invoke(imageProxy) ?: imageProxy.close()
                }

                val cameraSelector = if (isFrontCamera) {
                    CameraSelector.DEFAULT_FRONT_CAMERA
                } else {
                    CameraSelector.DEFAULT_BACK_CAMERA
                }
                
                // Transition to Started state so CameraX can bind
                mainHandler.post {
                    lifecycleRegistry.currentState = Lifecycle.State.STARTED
                }

                provider.bindToLifecycle(
                    this,
                    cameraSelector,
                    preview,
                    imageAnalyzer
                )
                
                mainHandler.post {
                    lifecycleRegistry.currentState = Lifecycle.State.RESUMED
                }
                
                observer.onCapturerStarted(true)
                Log.d(TAG, "CameraX started successfully at decoupled stream architecture.")

            } catch (e: Exception) {
                Log.e(TAG, "Failed to start CameraX: ${e.message}", e)
                observer.onCapturerStarted(false)
            }
        }, ContextCompat.getMainExecutor(ctx))
    }

    override fun stopCapture() {
        mainHandler.post {
            lifecycleRegistry.currentState = Lifecycle.State.DESTROYED
            try {
                cameraProvider?.unbindAll()
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
                // Re-start capture with new camera selector
                startCapture(0, 0, 0) // We rely on the existing configuration
            } catch (e: Exception) {
                Log.e(TAG, "Error switching camera", e)
            }
        }
    }
}
