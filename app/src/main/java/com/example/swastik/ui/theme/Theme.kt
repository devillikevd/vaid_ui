package com.example.swastik.ui.theme

import android.app.Activity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
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

@Composable
fun SwastikTheme(
    content: @Composable () -> Unit
) {
    // Always use LightColorScheme for branding consistency
    val colorScheme = LightColorScheme

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = android.graphics.Color.TRANSPARENT // Set to transparent so Compose can draw behind it
            // Set navigation bar color to match background
            window.navigationBarColor = colorScheme.background.toArgb()
            
            WindowCompat.getInsetsController(window, view).apply {
                isAppearanceLightStatusBars = true // Background is light, so use dark icons
                isAppearanceLightNavigationBars = true // Background is light, so use dark icons
            }
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = SwastikTypography,
        content = content
    )
}
