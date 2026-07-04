package com.example.swastik.utils

import android.content.Context
import android.util.Log
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.Translator
import com.google.mlkit.nl.translate.TranslatorOptions
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.Locale

class DynamicTranslator private constructor() {

    private var currentTranslator: Translator? = null
    private var currentTargetLang: String = "en"
    
    // Status can be: IDLE, DOWNLOADING, READY, ERROR
    private val _status = MutableStateFlow("IDLE")
    val status: StateFlow<String> = _status.asStateFlow()

    fun initialize(context: Context) {
        val currentLocale = context.resources.configuration.locales[0]
        val langCode = currentLocale.language
        Log.d("DynamicTranslator", "Initializing for language: $langCode")
        
        if (langCode == "en") {
            _status.value = "READY"
            return
        }

        val targetLangCode = getMLKitLanguageCode(langCode)
        if (targetLangCode == null) {
            Log.e("DynamicTranslator", "Language $langCode not supported by ML Kit.")
            _status.value = "READY" // Fallback to original
            return
        }
        
        if (currentTargetLang == targetLangCode && currentTranslator != null) {
            return
        }

        currentTargetLang = targetLangCode
        
        val options = TranslatorOptions.Builder()
            .setSourceLanguage(TranslateLanguage.ENGLISH)
            .setTargetLanguage(targetLangCode)
            .build()
            
        currentTranslator?.close()
        currentTranslator = Translation.getClient(options)
        
        _status.value = "DOWNLOADING"
        
        val conditions = DownloadConditions.Builder()
            .requireWifi()
            .build()
            
        currentTranslator?.downloadModelIfNeeded(conditions)
            ?.addOnSuccessListener {
                Log.d("DynamicTranslator", "Model downloaded successfully for $targetLangCode")
                _status.value = "READY"
            }
            ?.addOnFailureListener { exception ->
                Log.e("DynamicTranslator", "Model download failed.", exception)
                _status.value = "ERROR"
            }
    }

    fun translate(text: String, onResult: (String) -> Unit) {
        if (text.isBlank() || _status.value != "READY" || currentTranslator == null) {
            onResult(text)
            return
        }
        
        currentTranslator?.translate(text)
            ?.addOnSuccessListener { translatedText ->
                onResult(translatedText)
            }
            ?.addOnFailureListener {
                onResult(text)
            }
    }

    private fun getMLKitLanguageCode(appLangCode: String): String? {
        return when (appLangCode) {
            "hi" -> TranslateLanguage.HINDI
            "bn" -> TranslateLanguage.BENGALI
            "kn" -> TranslateLanguage.KANNADA
            "mr" -> TranslateLanguage.MARATHI
            "ta" -> TranslateLanguage.TAMIL
            "te" -> TranslateLanguage.TELUGU
            else -> null
        }
    }
    
    companion object {
        @Volatile
        private var instance: DynamicTranslator? = null

        fun getInstance(): DynamicTranslator {
            return instance ?: synchronized(this) {
                instance ?: DynamicTranslator().also { instance = it }
            }
        }
    }
}
