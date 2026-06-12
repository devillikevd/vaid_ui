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
import javax.inject.Singleton

@Singleton
class AIModelDownloader @Inject constructor(
    @ApplicationContext private val context: Context,
    private val apiService: ApiService,
    private val storageManager: AIModelStorageManager
) {
    private val okHttpClient = OkHttpClient()

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
                    android.util.Log.d("AIModelDownloader", "Presigned URL obtained successfully.")
                } else {
                    android.util.Log.e("AIModelDownloader", "Failed to get presigned URL: ${urlResponse.code()} ${urlResponse.errorBody()?.string()}")
                }
            } catch (e: Exception) {
                android.util.Log.e("AIModelDownloader", "Exception getting presigned URL", e)
            }

            // If the presigned URL failed, we cannot proceed safely.
            if (downloadUrl == null) {
                throw Exception("Failed to obtain presigned URL from backend")
            }

            // 2. Download the model using the presigned URL
            val requestBuilder = Request.Builder().url(downloadUrl)
            
            // Add ETag if we already have the model and are checking for updates
            val currentEtag = storageManager.getModelEtag(modelName)
            if (forceUpdateCheck && currentEtag != null && modelFile.exists()) {
                requestBuilder.header("If-None-Match", currentEtag)
            }

            val request = requestBuilder.build()
            android.util.Log.d("AIModelDownloader", "Downloading from URL: $downloadUrl")
            val response = okHttpClient.newCall(request).execute()
            
            android.util.Log.d("AIModelDownloader", "Response code: ${response.code}")

            if (response.code == 304) {
                // Not Modified! Model is up to date.
                storageManager.markModelUsed(modelName)
                onProgress(1.0f)
                return@withContext modelFile
            }

            if (!response.isSuccessful) {
                val errorBody = response.body?.string()
                android.util.Log.e("AIModelDownloader", "Download failed! Code: ${response.code}, Body: $errorBody")
                throw Exception("Failed to download model. Server returned ${response.code}: $errorBody")
            }

            val newEtag = response.header("ETag")
            val body = response.body ?: throw Exception("Response body is null")
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
