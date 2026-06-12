package com.example.swastik.utils.ml

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileOutputStream
import javax.inject.Inject
import com.example.swastik.data.remote.ApiService
import dagger.hilt.android.qualifiers.ApplicationContext

class AIModelDownloader @Inject constructor(
    @ApplicationContext private val context: Context,
    private val okHttpClient: OkHttpClient,
    private val storageManager: AIModelStorageManager,
    private val apiService: ApiService
) {

    suspend fun downloadModelIfNeeded(
        modelName: String,
        forceUpdateCheck: Boolean = false,
        onProgress: (Float) -> Unit = {}
    ): File? = withContext(Dispatchers.IO) {
        val modelFile = File(context.filesDir, "$modelName.tflite")
        if (!forceUpdateCheck && storageManager.isModelDownloaded(modelName)) {
            storageManager.markModelUsed(modelName)
            onProgress(1.0f)
            return@withContext modelFile
        }

        try {
            // 1. Fetch Presigned URL securely from the backend
            var downloadUrl: String? = null
            try {
                val urlResponse = apiService.getPresignedDownloadUrl("models/$modelName.tflite")
                if (urlResponse.isSuccessful && urlResponse.body()?.success == true) {
                    downloadUrl = urlResponse.body()?.data?.url
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }

            // If the presigned URL failed, we cannot proceed safely.
            if (downloadUrl == null) {
                return@withContext null
            }

            // 2. Download the model using the presigned URL
            val requestBuilder = Request.Builder().url(downloadUrl)
            
            // Add ETag if we already have the model and are checking for updates
            val currentEtag = storageManager.getModelEtag(modelName)
            if (forceUpdateCheck && currentEtag != null && modelFile.exists()) {
                requestBuilder.header("If-None-Match", currentEtag)
            }

            val request = requestBuilder.build()
            val response = okHttpClient.newCall(request).execute()

            if (response.code == 304) {
                // Not Modified! Model is up to date.
                storageManager.markModelUsed(modelName)
                onProgress(1.0f)
                return@withContext modelFile
            }

            if (!response.isSuccessful) {
                return@withContext null
            }

            val newEtag = response.header("ETag")
            val body = response.body ?: return@withContext null
            val contentLength = body.contentLength()

            body.byteStream().use { input ->
                FileOutputStream(modelFile).use { output ->
                    val buffer = ByteArray(8 * 1024)
                    var bytesCopied = 0L
                    var bytes = input.read(buffer)
                    while (bytes >= 0) {
                        output.write(buffer, 0, bytes)
                        bytesCopied += bytes
                        if (contentLength > 0) {
                            onProgress(bytesCopied.toFloat() / contentLength)
                        }
                        bytes = input.read(buffer)
                    }
                }
            }
            
            // Register successful download in Storage Manager
            storageManager.addModel(
                modelId = modelName,
                name = formatModelName(modelName),
                file = modelFile,
                etag = newEtag
            )
            
            return@withContext modelFile
        } catch (e: Exception) {
            e.printStackTrace()
            if (modelFile.exists()) modelFile.delete()
            return@withContext null
        }
    }

    private fun formatModelName(id: String): String {
        return id.replace("_", " ").split(" ").joinToString(" ") { it.replaceFirstChar { char -> char.uppercase() } }
    }
}
