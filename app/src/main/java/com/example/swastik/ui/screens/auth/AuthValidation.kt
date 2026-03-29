package com.example.swastik.ui.screens.auth

import android.util.Patterns

internal const val AUTH_PASSWORD_HINT =
    "Use at least 8 characters with one uppercase letter, one lowercase letter, and one number."

internal fun isValidEmail(value: String): Boolean {
    val normalized = value.trim()
    return normalized.isNotEmpty() && Patterns.EMAIL_ADDRESS.matcher(normalized).matches()
}

internal fun passwordValidationMessage(password: String): String? {
    if (password.isBlank()) return null
    return when {
        password.length < 8 -> "Password must be at least 8 characters."
        !password.any(Char::isUpperCase) -> "Add at least one uppercase letter."
        !password.any(Char::isLowerCase) -> "Add at least one lowercase letter."
        !password.any(Char::isDigit) -> "Add at least one number."
        else -> null
    }
}

internal fun normalizeIndianPhoneInput(value: String): String = value.filter(Char::isDigit).take(10)

internal fun phoneValidationMessage(phoneDigits: String): String? {
    if (phoneDigits.isBlank()) return null
    return if (phoneDigits.length == 10) null else "Enter a valid 10-digit mobile number."
}
