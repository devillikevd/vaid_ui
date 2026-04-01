package com.example.swastik.ambulance.ui.screens.login

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.ambulance.ui.viewmodel.AuthViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onNavigateToRegister: () -> Unit = {},
    viewModel: AuthViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val focusManager = LocalFocusManager.current

    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var verificationOtp by remember { mutableStateOf("") }
    var showForgotPasswordDialog by remember { mutableStateOf(false) }
    var forgotPasswordStep by remember { mutableStateOf(0) }
    var forgotPasswordEmail by remember { mutableStateOf("") }
    var forgotPasswordOtp by remember { mutableStateOf("") }
    var forgotPasswordNewPassword by remember { mutableStateOf("") }
    var forgotPasswordConfirmPassword by remember { mutableStateOf("") }
    val showVerificationHelp = uiState.errorCode == "EMAIL_NOT_VERIFIED" ||
        (uiState.error?.contains("verify your email", ignoreCase = true) == true)

    LaunchedEffect(uiState.isLoggedIn) {
        if (uiState.isLoggedIn) onLoginSuccess()
    }

    LaunchedEffect(uiState.passwordResetCodeSent, showForgotPasswordDialog) {
        if (showForgotPasswordDialog && uiState.passwordResetCodeSent) {
            forgotPasswordStep = 1
        }
    }

    LaunchedEffect(uiState.passwordResetComplete) {
        if (uiState.passwordResetComplete) {
            showForgotPasswordDialog = false
            forgotPasswordStep = 0
            forgotPasswordOtp = ""
            forgotPasswordNewPassword = ""
            forgotPasswordConfirmPassword = ""
            viewModel.clearPasswordResetFlags()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFFB71C1C),
                        Color(0xFFD32F2F),
                        Color(0xFFE53935)
                    )
                )
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Logo
            Icon(
                imageVector = Icons.Default.LocalShipping,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(80.dp)
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "SWASTIK",
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            Text(
                text = "Ambulance Operator",
                fontSize = 16.sp,
                color = Color.White.copy(alpha = 0.8f)
            )

            Spacer(modifier = Modifier.height(48.dp))

            // Login Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "Sign In",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF212121)
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    OutlinedTextField(
                        value = email,
                        onValueChange = {
                            email = it
                            if (uiState.error != null) viewModel.clearError()
                        },
                        label = { Text("Email") },
                        leadingIcon = { Icon(Icons.Default.Email, null) },
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Email,
                            imeAction = ImeAction.Next
                        ),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    OutlinedTextField(
                        value = password,
                        onValueChange = {
                            password = it
                            if (uiState.error != null) viewModel.clearError()
                        },
                        label = { Text("Password") },
                        leadingIcon = { Icon(Icons.Default.Lock, null) },
                        trailingIcon = {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    if (passwordVisible) Icons.Default.VisibilityOff
                                    else Icons.Default.Visibility,
                                    null
                                )
                            }
                        },
                        visualTransformation = if (passwordVisible) VisualTransformation.None
                        else PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction = ImeAction.Done
                        ),
                        keyboardActions = KeyboardActions(onDone = {
                            focusManager.clearFocus()
                            if (email.isNotBlank() && password.isNotBlank()) {
                                viewModel.login(email, password)
                            }
                        }),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )

                    // Error message
                    if (uiState.error != null) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = uiState.error!!,
                            color = MaterialTheme.colorScheme.error,
                            fontSize = 14.sp,
                            textAlign = TextAlign.Center
                        )
                    }

                    if (uiState.infoMessage != null) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = uiState.infoMessage!!,
                            color = Color(0xFF1B5E20),
                            fontSize = 13.sp,
                            textAlign = TextAlign.Center
                        )
                    }

                    if (showVerificationHelp) {
                        Spacer(modifier = Modifier.height(16.dp))
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF3E0)),
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Text(
                                    text = "Verify your email to continue",
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF8D3D00)
                                )
                                Text(
                                    text = "Enter the 6-digit code from your inbox or request another code below.",
                                    color = Color(0xFF6D4C41),
                                    fontSize = 13.sp
                                )
                                OutlinedTextField(
                                    value = verificationOtp,
                                    onValueChange = {
                                        verificationOtp = it.filter(Char::isDigit).take(6)
                                        if (uiState.error != null) viewModel.clearError()
                                    },
                                    label = { Text("Verification code") },
                                    placeholder = { Text("123456") },
                                    singleLine = true,
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp)
                                )
                                Button(
                                    onClick = { viewModel.verifyEmailOtp(email.trim(), verificationOtp) },
                                    enabled = verificationOtp.length == 6 && !uiState.isLoading && email.isNotBlank(),
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD32F2F))
                                ) {
                                    Text("Verify email OTP")
                                }
                                OutlinedButton(
                                    onClick = { viewModel.resendVerification(email.trim()) },
                                    enabled = email.isNotBlank() && !uiState.isLoading,
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Text("Resend verification code")
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    Button(
                        onClick = {
                            focusManager.clearFocus()
                            viewModel.login(email, password)
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFFD32F2F)
                        ),
                        enabled = !uiState.isLoading && email.isNotBlank() && password.isNotBlank()
                    ) {
                        if (uiState.isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                color = Color.White
                            )
                        } else {
                            Text("Sign In", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    TextButton(onClick = onNavigateToRegister) {
                        Text(
                            text = "New operator? Request access",
                            color = Color(0xFFD32F2F),
                            fontWeight = FontWeight.SemiBold
                        )
                    }

                    TextButton(
                        onClick = {
                            forgotPasswordEmail = email.trim()
                            forgotPasswordStep = 0
                            forgotPasswordOtp = ""
                            forgotPasswordNewPassword = ""
                            forgotPasswordConfirmPassword = ""
                            viewModel.resetPasswordRecoveryState()
                            showForgotPasswordDialog = true
                        }
                    ) {
                        Text(
                            text = "Forgot password?",
                            color = Color(0xFFD32F2F)
                        )
                    }
                }
            }
        }
    }

    if (showForgotPasswordDialog) {
        ForgotPasswordDialog(
            step = forgotPasswordStep,
            email = forgotPasswordEmail,
            otp = forgotPasswordOtp,
            newPassword = forgotPasswordNewPassword,
            confirmPassword = forgotPasswordConfirmPassword,
            isLoading = uiState.isLoading,
            errorMessage = uiState.error,
            infoMessage = uiState.infoMessage,
            onEmailChange = {
                forgotPasswordEmail = it
                viewModel.clearError()
            },
            onOtpChange = {
                forgotPasswordOtp = it
                viewModel.clearError()
            },
            onNewPasswordChange = {
                forgotPasswordNewPassword = it
                viewModel.clearError()
            },
            onConfirmPasswordChange = {
                forgotPasswordConfirmPassword = it
                viewModel.clearError()
            },
            onDismiss = {
                showForgotPasswordDialog = false
                viewModel.resetPasswordRecoveryState()
            },
            onSubmit = {
                if (forgotPasswordStep == 0) {
                    viewModel.forgotPassword(forgotPasswordEmail.trim())
                } else {
                    viewModel.resetPasswordWithOtp(
                        forgotPasswordEmail.trim(),
                        forgotPasswordOtp,
                        forgotPasswordNewPassword
                    )
                }
            }
        )
    }
}

@Composable
private fun ForgotPasswordDialog(
    step: Int,
    email: String,
    otp: String,
    newPassword: String,
    confirmPassword: String,
    isLoading: Boolean,
    errorMessage: String?,
    infoMessage: String?,
    onEmailChange: (String) -> Unit,
    onOtpChange: (String) -> Unit,
    onNewPasswordChange: (String) -> Unit,
    onConfirmPasswordChange: (String) -> Unit,
    onDismiss: () -> Unit,
    onSubmit: () -> Unit
) {
    val emailValid = android.util.Patterns.EMAIL_ADDRESS.matcher(email.trim()).matches()
    val canSubmit = if (step == 0) {
        email.trim().isNotBlank() && emailValid && !isLoading
    } else {
        email.trim().isNotBlank() &&
            emailValid &&
            otp.length == 6 &&
            newPassword.length >= 8 &&
            newPassword == confirmPassword &&
            newPassword.any(Char::isUpperCase) &&
            newPassword.any(Char::isLowerCase) &&
            newPassword.any(Char::isDigit) &&
            !isLoading
    }

    AlertDialog(
        onDismissRequest = { if (!isLoading) onDismiss() },
        title = { Text(if (step == 0) "Reset Password" else "Enter Reset Code") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = if (step == 0) {
                        "We’ll send a 6-digit reset code to your operator email."
                    } else {
                        "Enter the code from your email and choose a new password."
                    },
                    color = Color(0xFF616161)
                )

                OutlinedTextField(
                    value = email,
                    onValueChange = onEmailChange,
                    label = { Text("Email") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    enabled = step == 0
                )

                if (step == 1) {
                    OutlinedTextField(
                        value = otp,
                        onValueChange = { onOtpChange(it.filter(Char::isDigit).take(6)) },
                        label = { Text("Reset code") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )
                    OutlinedTextField(
                        value = newPassword,
                        onValueChange = onNewPasswordChange,
                        label = { Text("New password") },
                        singleLine = true,
                        visualTransformation = PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )
                    OutlinedTextField(
                        value = confirmPassword,
                        onValueChange = onConfirmPasswordChange,
                        label = { Text("Confirm password") },
                        singleLine = true,
                        visualTransformation = PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )
                }

                if (!infoMessage.isNullOrBlank()) {
                    Text(text = infoMessage, color = Color(0xFF1B5E20), fontSize = 12.sp)
                }
                if (!errorMessage.isNullOrBlank()) {
                    Text(text = errorMessage, color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                }
            }
        },
        confirmButton = {
            Button(onClick = onSubmit, enabled = canSubmit) {
                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp, color = Color.White)
                } else {
                    Text(if (step == 0) "Send reset code" else "Reset password")
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isLoading) {
                Text("Cancel")
            }
        }
    )
}
