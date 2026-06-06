package com.example.swastik.ui.screens.consultation

import android.app.PictureInPictureParams
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.util.Rational
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.core.view.WindowCompat
import com.example.swastik.data.local.AppSettingsStore
import com.example.swastik.data.local.ThemePreference
import com.example.swastik.ui.theme.SwastikTheme
import com.example.swastik.ui.viewmodel.VideoConsultationViewModel
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.MutableStateFlow

@AndroidEntryPoint
class ConsultationActivity : AppCompatActivity() {

    private val _isPipMode = MutableStateFlow(false)
    private val viewModel: VideoConsultationViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Make the activity display full screen if needed, though mostly handled by Compose
        WindowCompat.setDecorFitsSystemWindows(window, false)

        val appointmentId = intent.getStringExtra("appointmentId") ?: ""
        val doctorName = intent.getStringExtra("doctorName") ?: "Doctor"

        setContent {
            val appSettings by AppSettingsStore.settings.collectAsState()
            val darkTheme = when (appSettings.themePreference) {
                ThemePreference.DARK -> true
                ThemePreference.LIGHT -> false
                ThemePreference.SYSTEM -> isSystemInDarkTheme()
            }
            val pipMode by _isPipMode.collectAsState()
            val uiState by viewModel.uiState.collectAsState()
            
            val isCallActive = uiState.isConnected || uiState.session != null

            LaunchedEffect(isCallActive) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    val params = PictureInPictureParams.Builder()
                        .setAspectRatio(Rational(9, 16))
                        .setAutoEnterEnabled(isCallActive)
                        .build()
                    setPictureInPictureParams(params)
                }
            }

            SwastikTheme(darkTheme = darkTheme) {
                VideoConsultationFlow(
                    appointmentId = appointmentId,
                    doctorName = doctorName,
                    isPipMode = pipMode,
                    onBackClick = { finish() },
                    onConsultationComplete = { finish() },
                    viewModel = viewModel
                )
            }
        }
    }

    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        // For devices below Android 12, manually trigger PiP on user leave
        val isCallActive = viewModel.uiState.value.isConnected || viewModel.uiState.value.session != null
        if (isCallActive && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            val params = PictureInPictureParams.Builder()
                .setAspectRatio(Rational(9, 16))
                .build()
            enterPictureInPictureMode(params)
        }
    }

    override fun onPictureInPictureModeChanged(
        isInPictureInPictureMode: Boolean,
        newConfig: Configuration
    ) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
        _isPipMode.value = isInPictureInPictureMode
    }
}
