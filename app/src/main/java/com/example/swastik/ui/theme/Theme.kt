package com.example.swastik.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary = SwastikPrimary,
    onPrimary = Color.White,
    primaryContainer = SwastikPrimaryLight,
    onPrimaryContainer = SwastikPrimaryDark,
    secondary = SwastikSecondary,
    onSecondary = Color.Black,
    tertiary = SwastikNeutral,
    onTertiary = TextPrimary,
    background = BackgroundLight,
    onBackground = TextPrimary,
    surface = SurfaceLight,
    onSurface = TextPrimary,
    error = SwastikRed,
    onError = Color.White,
    outline = TextHint,
    surfaceVariant = SurfaceElevatedLight,
    onSurfaceVariant = TextSecondary
)

private val DarkColorScheme = darkColorScheme(
    primary = SwastikSecondary, // Use lighter teal in dark mode for contrast
    onPrimary = Color(0xFF00332D),
    primaryContainer = SwastikPrimary,
    onPrimaryContainer = Color(0xFFE0F2F1),
    secondary = SwastikSecondary,
    onSecondary = Color(0xFF00332D),
    tertiary = SwastikSecondary,
    onTertiary = Color(0xFF00332D),
    background = BackgroundDark,
    onBackground = Color(0xFFE1E2E4),
    surface = SurfaceDark,
    onSurface = Color(0xFFE1E2E4),
    surfaceVariant = SurfaceElevatedDark,
    onSurfaceVariant = Color(0xFFB0B3B8),
    error = Color(0xFFCF6679),
    onError = Color.Black,
    outline = Color(0xFF4A4D51)
)

@Composable
fun SwastikTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.primary.toArgb()
            // Set navigation bar color to match top bar (primary green)
            window.navigationBarColor = colorScheme.primary.toArgb()
            
            WindowCompat.getInsetsController(window, view).apply {
                isAppearanceLightStatusBars = false // Primary green is dark, so use light icons
                isAppearanceLightNavigationBars = false // Primary green is dark, so use light icons
            }
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = SwastikTypography,
        content = content
    )
}
