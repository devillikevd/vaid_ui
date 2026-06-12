package com.example.swastik.utils.ml

import android.graphics.Bitmap
import org.tensorflow.lite.Interpreter
import org.tensorflow.lite.support.image.TensorImage
import org.tensorflow.lite.support.tensorbuffer.TensorBuffer
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder

class TFLiteClassifier(private val modelFile: File) {
    private var interpreter: Interpreter? = null

    init {
        try {
            val options = Interpreter.Options()
            options.setNumThreads(4)
            interpreter = Interpreter(modelFile, options)
        } catch (e: Exception) {
            e.printStackTrace()
            interpreter = null
        }
    }

    fun classify(bitmap: Bitmap): FloatArray? {
        val tflite = interpreter ?: return null
        
        try {
            val inputTensor = tflite.getInputTensor(0)
            val outputTensor = tflite.getOutputTensor(0)

            val inputShape = inputTensor.shape()
            val imageSizeX = inputShape[1]
            val imageSizeY = inputShape[2]

            // Resize the bitmap to match model input shape
            val resizedBitmap = Bitmap.createScaledBitmap(bitmap, imageSizeX, imageSizeY, true)

            // Normalize and convert to ByteBuffer
            val inputBuffer = convertBitmapToByteBuffer(resizedBitmap, inputShape[1], inputShape[2], isQuantized = inputTensor.dataType() == org.tensorflow.lite.DataType.UINT8)
            
            val outputBuffer = TensorBuffer.createFixedSize(outputTensor.shape(), outputTensor.dataType())

            tflite.run(inputBuffer, outputBuffer.buffer)

            return outputBuffer.floatArray
        } catch (e: Exception) {
            e.printStackTrace()
            return null
        }
    }

    private fun convertBitmapToByteBuffer(bitmap: Bitmap, width: Int, height: Int, isQuantized: Boolean): ByteBuffer {
        val bytesPerChannel = if (isQuantized) 1 else 4
        val byteBuffer = ByteBuffer.allocateDirect(1 * width * height * 3 * bytesPerChannel)
        byteBuffer.order(ByteOrder.nativeOrder())

        val intValues = IntArray(width * height)
        bitmap.getPixels(intValues, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)

        var pixel = 0
        for (i in 0 until width) {
            for (j in 0 until height) {
                val value = intValues[pixel++]
                if (isQuantized) {
                    byteBuffer.put((value shr 16 and 0xFF).toByte())
                    byteBuffer.put((value shr 8 and 0xFF).toByte())
                    byteBuffer.put((value and 0xFF).toByte())
                } else {
                    byteBuffer.putFloat((value shr 16 and 0xFF) / 255.0f)
                    byteBuffer.putFloat((value shr 8 and 0xFF) / 255.0f)
                    byteBuffer.putFloat((value and 0xFF) / 255.0f)
                }
            }
        }
        return byteBuffer
    }

    fun close() {
        interpreter?.close()
        interpreter = null
    }
}
