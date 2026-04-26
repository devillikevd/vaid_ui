package com.example.swastik.ui.screens.auth

import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.TextFieldColors
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import com.example.swastik.ui.theme.SwastikPurple

@Composable
internal fun authOutlinedTextFieldColors(): TextFieldColors {
    val colorScheme = MaterialTheme.colorScheme
    val fieldTextColor = colorScheme.onSurface
    val placeholderColor = colorScheme.onSurfaceVariant.copy(alpha = 0.85f)
    val borderColor = colorScheme.outline.copy(alpha = 0.7f)
    val disabledTextColor = colorScheme.onSurfaceVariant.copy(alpha = 0.75f)

    return OutlinedTextFieldDefaults.colors(
        focusedTextColor = fieldTextColor,
        unfocusedTextColor = fieldTextColor,
        disabledTextColor = disabledTextColor,
        errorTextColor = fieldTextColor,
        focusedContainerColor = colorScheme.surface,
        unfocusedContainerColor = colorScheme.surface,
        disabledContainerColor = colorScheme.surface,
        errorContainerColor = colorScheme.surface,
        cursorColor = SwastikPurple,
        focusedBorderColor = SwastikPurple,
        unfocusedBorderColor = borderColor,
        disabledBorderColor = borderColor,
        errorBorderColor = Color.Red,
        focusedLeadingIconColor = SwastikPurple,
        unfocusedLeadingIconColor = colorScheme.onSurfaceVariant,
        disabledLeadingIconColor = colorScheme.onSurfaceVariant,
        errorLeadingIconColor = Color.Red,
        focusedTrailingIconColor = SwastikPurple,
        unfocusedTrailingIconColor = colorScheme.onSurfaceVariant,
        disabledTrailingIconColor = colorScheme.onSurfaceVariant,
        errorTrailingIconColor = Color.Red,
        focusedPlaceholderColor = placeholderColor,
        unfocusedPlaceholderColor = placeholderColor,
        disabledPlaceholderColor = placeholderColor,
        errorPlaceholderColor = placeholderColor
    )
}
