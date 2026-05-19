package com.example.swastik.util

import androidx.annotation.StringRes
import com.example.swastik.R

data class LanguageOption(
    val tag: String,
    @StringRes val labelResId: Int
)

object LanguageConfig {
    val options: List<LanguageOption> = listOf(
        LanguageOption("en", R.string.language_english),
        LanguageOption("hi", R.string.language_hindi),
        LanguageOption("bn", R.string.language_bengali),
        LanguageOption("te", R.string.language_telugu),
        LanguageOption("ta", R.string.language_tamil),
        LanguageOption("kn", R.string.language_kannada),
        LanguageOption("mr", R.string.language_marathi)
    )

    fun labelResId(tag: String): Int {
        return options.firstOrNull { it.tag == tag }?.labelResId ?: R.string.language_english
    }

    fun normalizeStoredLanguage(value: String?): String {
        val trimmed = value?.trim().orEmpty()
        if (trimmed.isEmpty()) return "en"
        if (options.any { it.tag == trimmed }) return trimmed
        return when (trimmed) {
            "English" -> "en"
            "Hindi" -> "hi"
            "Bengali" -> "bn"
            "Telugu" -> "te"
            "Tamil" -> "ta"
            "Kannada" -> "kn"
            "Marathi" -> "mr"
            else -> "en"
        }
    }
}
