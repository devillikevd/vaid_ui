package com.example.swastik.ambulance.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

// --- Premium Light Theme Colors ---
private val LightColorScheme = lightColorScheme(
    primary = Color(0xFFD32F2F),        // Main brand red
    onPrimary = Color.White,
    primaryContainer = Color(0xFFFFEBEE),
    onPrimaryContainer = Color(0xFFB71C1C),
    secondary = Color(0xFF424242),      // Slate grey
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFF5F5F5),
    onSecondaryContainer = Color(0xFF212121),
    background = Color(0xFFF8F9FA),     // Slightly off-white for depth
    surface = Color.White,
    surfaceVariant = Color(0xFFF5F5F5), // For cards and borders
    error = Color(0xFFD32F2F),
    onBackground = Color(0xFF1E1E1E),
    onSurface = Color(0xFF1E1E1E)
)

// --- Premium Dark Theme Colors ---
private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFFEF5350),        // Lighter red for dark mode contrast
    onPrimary = Color.White,
    primaryContainer = Color(0xFFB71C1C),
    onPrimaryContainer = Color(0xFFFFEBEE),
    secondary = Color(0xFFBDBDBD),
    onSecondary = Color(0xFF212121),
    secondaryContainer = Color(0xFF333333),
    onSecondaryContainer = Color(0xFFE0E0E0),
    background = Color(0xFF121212),     // Deep dark background
    surface = Color(0xFF1E1E1E),        // Elevated surface color
    surfaceVariant = Color(0xFF2C2C2C), // For elevated cards
    error = Color(0xFFEF5350),
    onBackground = Color(0xFFE0E0E0),
    onSurface = Color(0xFFE0E0E0)
)

@Composable
fun SwastikAmbulanceTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    // Set the status bar color seamlessly
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = AppTypography,
        content = content
    )
}
