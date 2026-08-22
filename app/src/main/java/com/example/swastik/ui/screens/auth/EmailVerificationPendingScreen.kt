package com.example.swastik.ui.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.ui.components.SwastikButton
import com.example.swastik.ui.components.SwastikTopBar
import com.example.swastik.ui.theme.SwastikPrimary
import kotlinx.coroutines.delay
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.res.stringResource
import com.example.swastik.R

/**
 * Screen shown after successful registration.
 * Lets the user enter the emailed OTP code to verify their address.
 */
@Composable
fun EmailVerificationPendingScreen(
    email: String = "",
    name: String = "",
    phone: String = "",
    password: String = "",
    onBackClick: () -> Unit,
    onLoginSuccess: () -> Unit
) {
    val viewModel: AuthViewModel = hiltViewModel()
    val uiState = viewModel.uiState
    var resendCooldown by remember { mutableIntStateOf(0) }
    var otp by remember { mutableStateOf("") }

    // Cooldown timer
    LaunchedEffect(resendCooldown) {
        if (resendCooldown > 0) {
            delay(1000)
            resendCooldown--
        }
    }

    // Auto-navigate to dashboard after successful verification
    LaunchedEffect(uiState.isSuccess) {
        if (uiState.isSuccess) {
            delay(1500) // Let the user see the success state briefly
            onLoginSuccess()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.surface)
    ) {
        // Top Bar
        SwastikTopBar(
            title = "Email Verification",
            onBackClick = onBackClick
        )

        Spacer(modifier = Modifier.height(60.dp))

        // Email Icon
        Box(
            modifier = Modifier
                .size(100.dp)
                .background(SwastikPrimary.copy(alpha = 0.12f), CircleShape)
                .align(Alignment.CenterHorizontally),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.Email,
                contentDescription = null,
                tint = SwastikPrimary,
                modifier = Modifier.size(48.dp)
            )
        }

        Spacer(modifier = Modifier.height(32.dp))

        // Title
        Text(
            text = if (uiState.emailVerificationComplete) "Email Verified" else "Verify Your Email",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.fillMaxWidth(),
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Description
        Text(
            text = if (email.isNotBlank())
                if (uiState.emailVerificationComplete) {
                    "Your email address\n$email\nis verified. You can now sign in to continue."
                } else {
                    "We've sent a 6-digit verification code to\n$email\nPlease enter it below to verify your account."
                }
            else
                if (uiState.emailVerificationComplete) {
                    "Your email address is verified. You can now sign in."
                } else {
                    "We've sent a 6-digit verification code to your email address.\nPlease enter it below to verify your account."
                },
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 32.dp),
            textAlign = TextAlign.Center,
            lineHeight = 22.sp
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Hint
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 32.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.CheckCircle,
                contentDescription = null,
                tint = SwastikPrimary.copy(alpha = 0.7f),
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = if (uiState.emailVerificationComplete) "You can move ahead with sign in now" else "Don't forget to check your spam folder",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        uiState.infoMessage?.let { info ->
            Spacer(modifier = Modifier.height(16.dp))
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 32.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9))
            ) {
                Text(
                    text = info,
                    fontSize = 13.sp,
                    color = Color(0xFF2E7D32),
                    modifier = Modifier.padding(12.dp),
                    textAlign = TextAlign.Center
                )
            }
        }

        // Error message
        uiState.errorMessage?.let { error ->
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = error,
                fontSize = 13.sp,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 32.dp),
                textAlign = TextAlign.Center
            )
        }

        if (!uiState.emailVerificationComplete) {
            Spacer(modifier = Modifier.height(24.dp))

            OutlinedTextField(
                value = otp,
                onValueChange = {
                    otp = it.filter(Char::isDigit).take(6)
                    if (uiState.errorMessage != null || uiState.infoMessage != null) {
                        viewModel.clearFeedback()
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 32.dp),
                label = { Text(stringResource(R.string.verification_code)) },
                placeholder = { Text(stringResource(R.string.str_123456)) },
                singleLine = true,
                shape = MaterialTheme.shapes.medium
            )
        }

        Spacer(modifier = Modifier.weight(1f))

        // Buttons
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 32.dp)
        ) {
            // Resend verification button
            if (email.isNotBlank()) {
                OutlinedButton(
                    onClick = {
                        viewModel.clearFeedback()
                        viewModel.resendRegistrationOtp(email, name)
                        resendCooldown = 60
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    enabled = resendCooldown == 0 && !uiState.isLoading
                ) {
                    if (uiState.isLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text(
                            text = if (resendCooldown > 0) "Resend in ${resendCooldown}s" else "Resend Verification Code",
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
            }

            if (!uiState.emailVerificationComplete) {
                SwastikButton(
                    text = stringResource(R.string.verify_email_otp_1),
                    onClick = {
                        viewModel.verifyRegistrationOtp(
                            otp = otp,
                            email = email,
                            password = password,
                            name = name,
                            phone = phone.takeIf { it.isNotBlank() }
                        )
                    },
                    enabled = otp.length == 6 && !uiState.isLoading
                )

                Spacer(modifier = Modifier.height(12.dp))
            } else {
                SwastikButton(
                    text = stringResource(R.string.go_to_dashboard),
                    onClick = onLoginSuccess
                )
                Spacer(modifier = Modifier.height(12.dp))
            }

            if (!uiState.emailVerificationComplete) {
                Text(
                    text = stringResource(R.string.after_verifying_your_email_you),
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.fillMaxWidth(),
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}
