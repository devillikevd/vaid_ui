package com.example.swastik.ui.screens.patient.diet

import android.content.Context
import android.graphics.Bitmap
import android.graphics.ImageDecoder
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.swastik.data.remote.ApiService
import com.example.swastik.data.remote.dto.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.Dispatchers
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File
import java.io.FileOutputStream
import javax.inject.Inject

sealed class DietTrackerState {
    object Initial : DietTrackerState()
    object LoadingQuota : DietTrackerState()
    data class QuotaLoaded(val quota: DietQuotaResponse) : DietTrackerState()
    
    // Vision Analysis
    object AnalyzingImage : DietTrackerState()
    data class AnalysisSuccess(val items: List<IdentifiedFoodItem>, val remainingQuota: Int) : DietTrackerState()
    data class AnalysisError(val message: String, val isQuotaExhausted: Boolean = false) : DietTrackerState()
    
    // Nutrition Calculation
    object CalculatingNutrition : DietTrackerState()
    data class CalculationSuccess(val result: DietCalculationResponse) : DietTrackerState()
    data class CalculationError(val message: String) : DietTrackerState()
}

@HiltViewModel
class DietTrackerViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow<DietTrackerState>(DietTrackerState.Initial)
    val uiState: StateFlow<DietTrackerState> = _uiState.asStateFlow()

    init {
        checkQuota()
    }

    fun checkQuota() {
        viewModelScope.launch {
            _uiState.value = DietTrackerState.LoadingQuota
            try {
                val response = apiService.getDietQuota()
                if (response.isSuccessful && response.body()?.success == true) {
                    response.body()?.data?.let {
                        _uiState.value = DietTrackerState.QuotaLoaded(it)
                    } ?: run {
                        _uiState.value = DietTrackerState.QuotaLoaded(
                            DietQuotaResponse(used = 0, limit = 5, remaining = 5, exhausted = false)
                        )
                    }
                } else {
                    _uiState.value = DietTrackerState.AnalysisError("Failed to load quota")
                }
            } catch (e: Exception) {
                _uiState.value = DietTrackerState.AnalysisError(e.message ?: "Network error")
            }
        }
    }

    fun analyzeImage(context: Context, imageUri: Uri) {
        viewModelScope.launch {
            _uiState.value = DietTrackerState.AnalyzingImage
            try {
                android.util.Log.d("DietTrackerViewModel", "Starting image compression...")
                val file = withContext(Dispatchers.IO) {
                    createTempFileFromUri(context, imageUri)
                }
                android.util.Log.d("DietTrackerViewModel", "Image compression complete. File size: ${file.length()} bytes")
                val requestFile = file.asRequestBody("image/jpeg".toMediaTypeOrNull())
                val body = MultipartBody.Part.createFormData("image", file.name, requestFile)
                
                android.util.Log.d("DietTrackerViewModel", "Calling backend API...")
                val response = apiService.analyzeFood(body)
                android.util.Log.d("DietTrackerViewModel", "Backend response code: ${response.code()}")
                
                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()?.data
                    if (data != null) {
                        _uiState.value = DietTrackerState.AnalysisSuccess(
                            items = data.identified_items,
                            remainingQuota = data.quota?.remaining ?: 0
                        )
                    } else {
                        _uiState.value = DietTrackerState.AnalysisError("Empty response from server")
                    }
                } else if (response.code() == 429) {
                    _uiState.value = DietTrackerState.AnalysisError("Limit exhausted (quota available next day). We are working to increase the upload limits...", isQuotaExhausted = true)
                } else {
                    val errorBody = response.errorBody()?.string()
                    android.util.Log.e("DietTrackerViewModel", "Failed to analyze image: code=${response.code()}, errorBody=$errorBody")
                    _uiState.value = DietTrackerState.AnalysisError("Failed to analyze image")
                }
            } catch (e: Exception) {
                android.util.Log.e("DietTrackerViewModel", "Error analyzing food image", e)
                _uiState.value = DietTrackerState.AnalysisError(
                    when (e) {
                        is java.net.SocketTimeoutException -> "Network timeout. The AI is taking longer than expected. Please try again."
                        is retrofit2.HttpException -> "Server error: ${e.code()}. Please try again."
                        else -> "Failed to parse response or unknown error occurred. (${e.message})"
                    }
                )
            }
        }
    }

    fun updateIdentifiedItem(index: Int, updatedItem: IdentifiedFoodItem) {
        val currentState = _uiState.value
        if (currentState is DietTrackerState.AnalysisSuccess) {
            val newList = currentState.items.toMutableList()
            if (index in newList.indices) {
                newList[index] = updatedItem
                _uiState.value = currentState.copy(items = newList)
            }
        }
    }

    fun removeIdentifiedItem(index: Int) {
        val currentState = _uiState.value
        if (currentState is DietTrackerState.AnalysisSuccess) {
            val newList = currentState.items.toMutableList()
            if (index in newList.indices) {
                newList.removeAt(index)
                _uiState.value = currentState.copy(items = newList)
            }
        }
    }

    fun addIdentifiedItem() {
        val currentState = _uiState.value
        if (currentState is DietTrackerState.AnalysisSuccess) {
            val newList = currentState.items.toMutableList()
            newList.add(IdentifiedFoodItem(name = "", quantity = 1.0, unit = "portion"))
            _uiState.value = currentState.copy(items = newList)
        }
    }

    fun calculateNutrition(items: List<IdentifiedFoodItem>, additionalNotes: String) {
        viewModelScope.launch {
            _uiState.value = DietTrackerState.CalculatingNutrition
            try {
                val request = DietCalculateRequest(
                    items = items,
                    additional_notes = additionalNotes.takeIf { it.isNotBlank() },
                    medical_conditions = emptyList(), // Fetch from patient profile ideally
                    language = "en"
                )
                
                val response = apiService.calculateNutrition(request)
                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()?.data
                    if (data != null) {
                        _uiState.value = DietTrackerState.CalculationSuccess(data)
                    } else {
                        _uiState.value = DietTrackerState.CalculationError("Empty calculation response")
                    }
                } else {
                    _uiState.value = DietTrackerState.CalculationError("Failed to calculate nutrition")
                }
            } catch (e: Exception) {
                _uiState.value = DietTrackerState.CalculationError("Error calculating nutrition. Please try again.")
            }
        }
    }
    
    fun resetToAnalysisSuccess(items: List<IdentifiedFoodItem>) {
        _uiState.value = DietTrackerState.AnalysisSuccess(items, remainingQuota = 0) // Remaining quota not critical here
    }

    private fun createTempFileFromUri(context: Context, uri: Uri): File {
        val bitmap = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            ImageDecoder.decodeBitmap(ImageDecoder.createSource(context.contentResolver, uri))
        } else {
            MediaStore.Images.Media.getBitmap(context.contentResolver, uri)
        }

        val file = File(context.cacheDir, "diet_scan_${System.currentTimeMillis()}.jpg")
        val out = FileOutputStream(file)
        bitmap.compress(Bitmap.CompressFormat.JPEG, 80, out)
        out.flush()
        out.close()
        return file
    }
}
