package com.example.swastik.ui.screens.auth

import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.TextFieldColors
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import com.example.swastik.ui.theme.SwastikPurple

private val AuthFieldTextColor = Color(0xFF111827)
private val AuthFieldPlaceholderColor = Color(0xFF9CA3AF)
private val AuthFieldBorderColor = Color(0xFFD1D5DB)
private val AuthFieldDisabledTextColor = Color(0xFF6B7280)

@Composable
internal fun authOutlinedTextFieldColors(): TextFieldColors {
    return OutlinedTextFieldDefaults.colors(
        focusedTextColor = AuthFieldTextColor,
        unfocusedTextColor = AuthFieldTextColor,
        disabledTextColor = AuthFieldDisabledTextColor,
        errorTextColor = AuthFieldTextColor,
        focusedContainerColor = Color.White,
        unfocusedContainerColor = Color.White,
        disabledContainerColor = Color.White,
        errorContainerColor = Color.White,
        cursorColor = SwastikPurple,
        focusedBorderColor = SwastikPurple,
        unfocusedBorderColor = AuthFieldBorderColor,
        disabledBorderColor = AuthFieldBorderColor,
        errorBorderColor = Color.Red,
        focusedLeadingIconColor = SwastikPurple,
        unfocusedLeadingIconColor = Color.Gray,
        disabledLeadingIconColor = Color.Gray,
        errorLeadingIconColor = Color.Red,
        focusedTrailingIconColor = SwastikPurple,
        unfocusedTrailingIconColor = Color.Gray,
        disabledTrailingIconColor = Color.Gray,
        errorTrailingIconColor = Color.Red,
        focusedPlaceholderColor = AuthFieldPlaceholderColor,
        unfocusedPlaceholderColor = AuthFieldPlaceholderColor,
        disabledPlaceholderColor = AuthFieldPlaceholderColor,
        errorPlaceholderColor = AuthFieldPlaceholderColor
    )
}
