package com.example.swastik.utils.ml

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import java.io.File
import javax.inject.Inject
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Singleton

data class AIModelMetadata(
    val modelId: String,
    val name: String,
    val sizeBytes: Long,
    var lastUsedTimestamp: Long,
    val etag: String? = null
)

@Singleton
class AIModelStorageManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val prefs: SharedPreferences = context.getSharedPreferences("ai_model_storage", Context.MODE_PRIVATE)
    private val gson = Gson()
    private val STORAGE_LIMIT_BYTES = 150L * 1024 * 1024 // 150 MB

    fun getDownloadedModels(): List<AIModelMetadata> {
        val json = prefs.getString("models_metadata", "[]")
        val type = object : TypeToken<List<AIModelMetadata>>() {}.type
        return gson.fromJson(json, type) ?: emptyList()
    }

    private fun saveModels(models: List<AIModelMetadata>) {
        prefs.edit().putString("models_metadata", gson.toJson(models)).apply()
    }

    fun isModelDownloaded(modelId: String): Boolean {
        val file = File(context.filesDir, "$modelId.tflite")
        return file.exists() && getDownloadedModels().any { it.modelId == modelId }
    }

    fun markModelUsed(modelId: String) {
        val models = getDownloadedModels().toMutableList()
        val index = models.indexOfFirst { it.modelId == modelId }
        if (index != -1) {
            models[index] = models[index].copy(lastUsedTimestamp = System.currentTimeMillis())
            saveModels(models)
        }
    }

    fun getModelEtag(modelId: String): String? {
        return getDownloadedModels().find { it.modelId == modelId }?.etag
    }

    fun addModel(modelId: String, name: String, file: File, etag: String?) {
        enforceStorageLimit(file.length())

        val models = getDownloadedModels().toMutableList()
        models.removeAll { it.modelId == modelId } // Remove if exists (update)
        models.add(
            AIModelMetadata(
                modelId = modelId,
                name = name,
                sizeBytes = file.length(),
                lastUsedTimestamp = System.currentTimeMillis(),
                etag = etag
            )
        )
        saveModels(models)
    }

    private fun enforceStorageLimit(incomingFileSizeBytes: Long) {
        val models = getDownloadedModels().toMutableList()
        var currentTotalSize = models.sumOf { it.sizeBytes }

        if (currentTotalSize + incomingFileSizeBytes <= STORAGE_LIMIT_BYTES) return

        // Sort by least recently used
        models.sortBy { it.lastUsedTimestamp }

        val iterator = models.iterator()
        while (iterator.hasNext() && currentTotalSize + incomingFileSizeBytes > STORAGE_LIMIT_BYTES) {
            val oldestModel = iterator.next()
            val file = File(context.filesDir, "${oldestModel.modelId}.tflite")
            if (file.exists()) file.delete()
            
            currentTotalSize -= oldestModel.sizeBytes
            iterator.remove()
        }
        saveModels(models)
    }

    fun deleteModel(modelId: String) {
        val file = File(context.filesDir, "$modelId.tflite")
        if (file.exists()) file.delete()
        
        val models = getDownloadedModels().filter { it.modelId != modelId }
        saveModels(models)
    }
}
