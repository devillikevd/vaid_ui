package com.example.swastik.ui.screens.patient.diagnostic

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.swastik.data.local.db.AIScanDao
import com.example.swastik.data.local.db.AIScanEntity
import com.example.swastik.data.remote.ApiService
import com.example.swastik.data.remote.SocketManager
import com.example.swastik.utils.ml.AIModelDownloader
import com.example.swastik.utils.ml.TFLiteClassifier
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import javax.inject.Inject

@HiltViewModel
class AIDiagnosticsViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val aiModelDownloader: AIModelDownloader,
    private val aiScanDao: AIScanDao,
    private val apiService: ApiService,
    private val socketManager: SocketManager
) : ViewModel() {

    private val _uiState = MutableStateFlow<AIDiagnosticsState>(AIDiagnosticsState.Idle)
    val uiState: StateFlow<AIDiagnosticsState> = _uiState

    private val _downloadProgress = MutableStateFlow<Map<String, Float>>(emptyMap())
    val downloadProgress: StateFlow<Map<String, Float>> = _downloadProgress

    fun downloadModel(modelType: String) {
        viewModelScope.launch {
            _downloadProgress.value = _downloadProgress.value + (modelType to 0.01f)
            aiModelDownloader.downloadModelIfNeeded(modelType, forceUpdateCheck = true) { progress ->
                _downloadProgress.value = _downloadProgress.value + (modelType to progress)
            }
            _downloadProgress.value = _downloadProgress.value - modelType
        }
    }

    fun processImage(bitmap: Bitmap, modelType: String) {
        viewModelScope.launch {
            _uiState.value = AIDiagnosticsState.Loading("Downloading model (if needed)...")
            
            // 1. Download/Get Model
            val modelFile = aiModelDownloader.downloadModelIfNeeded(modelType) { progress ->
                _uiState.value = AIDiagnosticsState.Loading("Downloading model: ${(progress * 100).toInt()}%")
            }

            var predictionResult = "Mock Prediction"
            var confidence = 0.95f

            if (modelFile != null) {
                _uiState.value = AIDiagnosticsState.Loading("Running inference... (Background tasks paused)")

                // 2. Run Inference with hardware paused safely
                val prefs = context.getSharedPreferences("patient_prefs", android.content.Context.MODE_PRIVATE)
                val guardianEnabled = prefs.getBoolean("guardian_enabled", false)

                // Stop hardware-intensive background services
                val stepIntent = android.content.Intent(context, com.example.swastik.data.fitness.StepCounterService::class.java)
                val guardianIntent = android.content.Intent(context, com.example.swastik.services.guardian.GuardianService::class.java)
                context.stopService(stepIntent)
                if (guardianEnabled) {
                    context.stopService(guardianIntent)
                }

                try {
                    val classifier = TFLiteClassifier(modelFile)
                    val output = classifier.classify(bitmap)
                    classifier.close()

                    if (output != null) {
                        val maxIndex = output.indices.maxByOrNull { output[it] } ?: -1
                        confidence = if (maxIndex != -1) output[maxIndex] else 0f
                        predictionResult = parsePredictionResult(modelType, maxIndex)
                    } else {
                        _uiState.value = AIDiagnosticsState.Error("Inference failed. Please check if the model is downloaded correctly.")
                        return@launch
                    }
                } finally {
                    // Resume background services reliably
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                        context.startForegroundService(stepIntent)
                        if (guardianEnabled) {
                            context.startForegroundService(guardianIntent)
                        }
                    } else {
                        context.startService(stepIntent)
                        if (guardianEnabled) {
                            context.startService(guardianIntent)
                        }
                    }
                }
            } else {
                _uiState.value = AIDiagnosticsState.Error("Failed to load AI model. Please ensure it is downloaded from settings.")
                return@launch
            }

            // 3. Save Image Locally
            val imageFile = saveBitmapToLocalFile(bitmap)
            if (imageFile == null) {
                _uiState.value = AIDiagnosticsState.Error("Failed to save image locally.")
                return@launch
            }

            // 4. Save to Room DB
            val scanId = UUID.randomUUID().toString()
            val entity = AIScanEntity(
                id = scanId,
                modelType = modelType,
                imageLocalPath = imageFile.absolutePath,
                predictionResult = predictionResult,
                confidence = confidence,
                timestamp = System.currentTimeMillis()
            )
            aiScanDao.insertScan(entity)

            _uiState.value = AIDiagnosticsState.Success(entity)
        }
    }

    fun shareProofToDoctor(scanId: String, roomId: String) {
        viewModelScope.launch {
            val scan = aiScanDao.getScanById(scanId) ?: return@launch
            
            _uiState.value = AIDiagnosticsState.Loading("Uploading proof securely...")
            
            try {
                // 1. Upload to S3 via backend
                val file = File(scan.imageLocalPath)
                val requestBody = file.asRequestBody("image/jpeg".toMediaTypeOrNull())
                val part = MultipartBody.Part.createFormData("file", file.name, requestBody)
                
                val response = apiService.uploadAiProof(part)
                if (response.isSuccessful && response.body()?.success == true) {
                    val uploadData = response.body()?.data
                    val url = uploadData?.resolvedUrl() ?: uploadData?.url
                    if (url != null) {
                        // 2. Share via WebSocket
                        socketManager.sendAiProof(
                            roomId = roomId,
                            proofUrl = url,
                            predictionResult = scan.predictionResult,
                            confidence = scan.confidence,
                            modelType = scan.modelType
                        )

                        // 3. Update DB
                        aiScanDao.updateShareStatus(scanId, isShared = true, url = url)
                        
                        _uiState.value = AIDiagnosticsState.SharedSuccess("Shared successfully with doctor!")
                    } else {
                        _uiState.value = AIDiagnosticsState.Error("Upload succeeded but URL is null.")
                    }
                } else {
                    _uiState.value = AIDiagnosticsState.Error("Upload failed: ${response.message()}")
                }
            } catch (e: Exception) {
                e.printStackTrace()
                _uiState.value = AIDiagnosticsState.Error("Network error during upload.")
            }
        }
    }

    private fun parsePredictionResult(modelType: String, classIndex: Int): String {
        // Placeholder for label mappings
        return when (modelType) {
            "skin" -> if (classIndex == 0) "Benign" else "Malignant"
            "brain" -> if (classIndex == 0) "No Tumor" else "Tumor Detected"
            "pneumonia" -> if (classIndex == 0) "Normal" else "Pneumonia"
            "diabetic_retinopathy" -> if (classIndex == 0) "Healthy" else "Diabetic Retinopathy Detected"
            "malaria" -> if (classIndex == 0) "Uninfected" else "Parasitized"
            "breast_cancer" -> if (classIndex == 0) "Benign" else "Malignant"
            else -> "Unknown Class $classIndex"
        }
    }

    private fun saveBitmapToLocalFile(bitmap: Bitmap): File? {
        return try {
            val file = File(context.cacheDir, "scan_${System.currentTimeMillis()}.jpg")
            FileOutputStream(file).use { out ->
                bitmap.compress(Bitmap.CompressFormat.JPEG, 90, out)
            }
            file
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
}

sealed class AIDiagnosticsState {
    object Idle : AIDiagnosticsState()
    data class Loading(val message: String) : AIDiagnosticsState()
    data class Success(val scan: AIScanEntity) : AIDiagnosticsState()
    data class SharedSuccess(val message: String) : AIDiagnosticsState()
    data class Error(val error: String) : AIDiagnosticsState()
}
