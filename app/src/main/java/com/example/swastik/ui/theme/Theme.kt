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
