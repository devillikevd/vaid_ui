package com.example.swastik.ui.screens.auth

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.MarkEmailRead
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import com.example.swastik.R
import android.widget.Toast
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import com.example.swastik.ui.theme.SwastikPrimary

@Composable
fun PatientLoginScreen(
    onRegisterClick: () -> Unit,
    onBackClick: () -> Unit,
    onLoginSuccess: () -> Unit
) {
    val viewModel: AuthViewModel = hiltViewModel()
    val uiState = viewModel.uiState
    val focusManager = LocalFocusManager.current

    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var passwordVisible by rememberSaveable { mutableStateOf(false) }
    var showForgotPasswordDialog by rememberSaveable { mutableStateOf(false) }
    var forgotPasswordEmail by rememberSaveable { mutableStateOf("") }
    var forgotPasswordStep by rememberSaveable { mutableStateOf(0) }
    var forgotPasswordOtp by rememberSaveable { mutableStateOf("") }
    var forgotPasswordNewPassword by rememberSaveable { mutableStateOf("") }
    var forgotPasswordConfirmPassword by rememberSaveable { mutableStateOf("") }

    val normalizedEmail = email.trim()
    val emailError = when {
        email.isBlank() -> null
        !isValidEmail(normalizedEmail) -> "Enter a valid email address."
        else -> null
    }
    val canSubmit = normalizedEmail.isNotBlank() && emailError == null && password.isNotBlank() && !uiState.isLoading

    LaunchedEffect(uiState.isSuccess) {
        if (uiState.isSuccess) {
            onLoginSuccess()
            viewModel.resetState()
        }
    }

    LaunchedEffect(uiState.infoMessage) {
        if (showForgotPasswordDialog && !uiState.infoMessage.isNullOrBlank()) {
            // handled by state-specific effects below
        }
    }

    LaunchedEffect(uiState.forgotPasswordCodeSent, showForgotPasswordDialog) {
        if (showForgotPasswordDialog && uiState.forgotPasswordCodeSent) {
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

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(SwastikPrimary, SwastikPrimary.copy(alpha = 0.78f), Color(0xFF6A5AE0))
                )
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 24.dp, end = 24.dp, top = 40.dp, bottom = 24.dp),
            horizontalAlignment = Alignment.Start,
            verticalArrangement = Arrangement.Center
        ) {
            IconButton(onClick = onBackClick) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = MaterialTheme.colorScheme.onPrimary
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Box(
                modifier = Modifier
                    .size(76.dp)
                    .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.14f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Canvas(modifier = Modifier.size(42.dp)) {
                    val strokeWidth = size.width * 0.12f
                    val armLength = size.width * 0.35f
                    val bendLength = size.width * 0.2f
                    val center = Offset(size.width / 2, size.height / 2)

                    drawLine(Color.White, Offset(center.x - armLength, center.y), Offset(center.x + armLength, center.y), strokeWidth, StrokeCap.Round)
                    drawLine(Color.White, Offset(center.x, center.y - armLength), Offset(center.x, center.y + armLength), strokeWidth, StrokeCap.Round)
                    drawLine(Color.White, Offset(center.x, center.y - armLength), Offset(center.x + bendLength, center.y - armLength), strokeWidth, StrokeCap.Round)
                    drawLine(Color.White, Offset(center.x + armLength, center.y), Offset(center.x + armLength, center.y + bendLength), strokeWidth, StrokeCap.Round)
                    drawLine(Color.White, Offset(center.x, center.y + armLength), Offset(center.x - bendLength, center.y + armLength), strokeWidth, StrokeCap.Round)
                    drawLine(Color.White, Offset(center.x - armLength, center.y), Offset(center.x - armLength, center.y - bendLength), strokeWidth, StrokeCap.Round)
                }
            }

            Spacer(modifier = Modifier.height(18.dp))

            Text(
                text = stringResource(R.string.welcome_back),
                color = MaterialTheme.colorScheme.onPrimary,
                fontSize = 30.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = stringResource(R.string.login_description),
                color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.88f),
                fontSize = 14.sp,
                lineHeight = 20.sp
            )
        }

        Surface(
            modifier = Modifier.fillMaxWidth().weight(1f),
            shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
            color = MaterialTheme.colorScheme.surface
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = stringResource(R.string.patient_login),
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = stringResource(R.string.login_instruction),
                    fontSize = 14.sp,
                    color = Color(0xFF6B7280)
                )

                AuthFeedbackCard(
                    text = uiState.errorMessage,
                    containerColor = Color(0xFFFFEBEE),
                    contentColor = Color(0xFFB3261E),
                    icon = Icons.Default.Error
                )

                AuthFeedbackCard(
                    text = uiState.infoMessage,
                    containerColor = Color(0xFFE8F5E9),
                    contentColor = Color(0xFF1B5E20),
                    icon = Icons.Default.Info
                )

                if (uiState.emailVerificationComplete) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9))
                    ) {
                        Text(
                            text = stringResource(R.string.email_verified_success),
                            modifier = Modifier.padding(14.dp),
                            color = Color(0xFF1B5E20),
                            fontSize = 13.sp,
                            lineHeight = 18.sp
                        )
                    }
                }



                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(stringResource(R.string.email_address_label), fontWeight = FontWeight.Medium)
                    OutlinedTextField(
                        value = email,
                        onValueChange = {
                            email = it
                            if (forgotPasswordEmail.isBlank()) {
                                forgotPasswordEmail = it
                            }
                            if (uiState.emailVerificationComplete) {
                                viewModel.consumeEmailVerificationSuccess()
                            } else {
                                viewModel.clearFeedback()
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        isError = emailError != null,
                        placeholder = { Text(stringResource(R.string.youexamplecom)) },
                        leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Email,
                            imeAction = ImeAction.Next
                        ),
                        colors = authOutlinedTextFieldColors(),
                        shape = RoundedCornerShape(14.dp),
                        supportingText = {
                            emailError?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                        }
                    )
                }

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(stringResource(R.string.password_label), fontWeight = FontWeight.Medium)
                    OutlinedTextField(
                        value = password,
                        onValueChange = {
                            password = it
                            viewModel.clearFeedback()
                        },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        placeholder = { Text(stringResource(R.string.enter_your_password)) },
                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                        trailingIcon = {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    imageVector = if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                    contentDescription = if (passwordVisible) "Hide password" else "Show password"
                                )
                            }
                        },
                        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction = ImeAction.Done
                        ),
                        keyboardActions = KeyboardActions(
                            onDone = {
                                focusManager.clearFocus()
                                if (canSubmit) {
                                    viewModel.login(normalizedEmail, password)
                                }
                            }
                        ),
                        colors = authOutlinedTextFieldColors(),
                        shape = RoundedCornerShape(14.dp)
                    )
                }

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFF9FAFB))
                ) {
                    Text(
                        text = stringResource(R.string.first_time_sign_in_help),
                        modifier = Modifier.padding(14.dp),
                        color = Color(0xFF4B5563),
                        fontSize = 13.sp,
                        lineHeight = 18.sp
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    TextButton(
                        onClick = {
                            forgotPasswordEmail = normalizedEmail
                            forgotPasswordStep = 0
                            forgotPasswordOtp = ""
                            forgotPasswordNewPassword = ""
                            forgotPasswordConfirmPassword = ""
                            viewModel.resetPasswordRecoveryState()
                            showForgotPasswordDialog = true
                        },
                        enabled = !uiState.isLoading
                    ) {
                        Text(stringResource(R.string.forgot_password_question))
                    }
                }

                Button(
                    onClick = {
                        focusManager.clearFocus()
                        viewModel.login(normalizedEmail, password)
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(54.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary),
                    enabled = canSubmit
                ) {
                    if (uiState.isLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(22.dp),
                            color = MaterialTheme.colorScheme.onPrimary,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text(stringResource(R.string.login), fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    androidx.compose.material3.HorizontalDivider(modifier = Modifier.weight(1f))
                    Text(stringResource(R.string.or_separator), color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 8.dp))
                    androidx.compose.material3.HorizontalDivider(modifier = Modifier.weight(1f))
                }

                val context = LocalContext.current
                OutlinedButton(
                    onClick = {
                        Toast.makeText(context, "Google Sign-In coming soon", Toast.LENGTH_SHORT).show()
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(54.dp),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text(stringResource(R.string.continue_with_google), color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Medium)
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(stringResource(R.string.new_to_vaididea), color = Color(0xFF6B7280))
                    TextButton(onClick = onRegisterClick, enabled = !uiState.isLoading) {
                        Text(stringResource(R.string.create_account), fontWeight = FontWeight.Bold)
                    }
                }

                TextButton(
                    onClick = onBackClick,
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !uiState.isLoading
                ) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.back_to_home))
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
            errorMessage = if (showForgotPasswordDialog) uiState.errorMessage else null,
            infoMessage = if (showForgotPasswordDialog) uiState.infoMessage else null,
            onEmailChange = {
                forgotPasswordEmail = it
                viewModel.clearFeedback()
            },
            onOtpChange = {
                forgotPasswordOtp = it
                viewModel.clearFeedback()
            },
            onNewPasswordChange = {
                forgotPasswordNewPassword = it
                viewModel.clearFeedback()
            },
            onConfirmPasswordChange = {
                forgotPasswordConfirmPassword = it
                viewModel.clearFeedback()
            },
            onDismiss = {
                showForgotPasswordDialog = false
                forgotPasswordStep = 0
                forgotPasswordOtp = ""
                forgotPasswordNewPassword = ""
                forgotPasswordConfirmPassword = ""
                viewModel.resetPasswordRecoveryState()
            },
            onSend = {
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
private fun AuthFeedbackCard(
    text: String?,
    containerColor: Color,
    contentColor: Color,
    icon: androidx.compose.ui.graphics.vector.ImageVector
) {
    if (text.isNullOrBlank()) return

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = containerColor)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, contentDescription = null, tint = contentColor)
            Spacer(modifier = Modifier.width(10.dp))
            Text(text = text, color = contentColor, fontSize = 14.sp, lineHeight = 20.sp)
        }
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
    onSend: () -> Unit
) {
    val normalizedEmail = email.trim()
    val emailError = when {
        email.isBlank() -> null
        !isValidEmail(normalizedEmail) -> "Enter a valid email address."
        else -> null
    }
    val otpError = when {
        step == 0 -> null
        otp.isBlank() -> null
        otp.length != 6 -> "Enter the 6-digit reset code."
        else -> null
    }
    val passwordError = when {
        step == 0 -> null
        newPassword.isBlank() -> null
        newPassword.length < 8 -> "Password must be at least 8 characters."
        !Regex("(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)").containsMatchIn(newPassword) -> "Use uppercase, lowercase, and a number."
        else -> null
    }
    val confirmPasswordError = when {
        step == 0 -> null
        confirmPassword.isBlank() -> null
        confirmPassword != newPassword -> "Passwords do not match."
        else -> null
    }

    AlertDialog(
        onDismissRequest = {
            if (!isLoading) onDismiss()
        },
        title = { Text(if (step == 0) stringResource(R.string.reset_password) else stringResource(R.string.enter_reset_code)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    if (step == 0) {
                        stringResource(R.string.reset_password_instruction)
                    } else {
                        stringResource(R.string.reset_code_instruction)
                    },
                    color = Color(0xFF4B5563),
                    fontSize = 14.sp
                )
                OutlinedTextField(
                    value = email,
                    onValueChange = onEmailChange,
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    isError = emailError != null,
                    leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                    placeholder = { Text(stringResource(R.string.youexamplecom)) },
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Email,
                        imeAction = ImeAction.Done
                    ),
                    colors = authOutlinedTextFieldColors(),
                    supportingText = {
                        when {
                            emailError != null -> Text(emailError, color = MaterialTheme.colorScheme.error)
                            step == 0 && !errorMessage.isNullOrBlank() -> Text(errorMessage, color = MaterialTheme.colorScheme.error)
                        }
                    }
                )

                if (!infoMessage.isNullOrBlank()) {
                    Text(
                        text = infoMessage,
                        color = Color(0xFF1B5E20),
                        fontSize = 12.sp
                    )
                }

                if (step == 1) {
                    OutlinedTextField(
                        value = otp,
                        onValueChange = { onOtpChange(it.filter(Char::isDigit).take(6)) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        isError = otpError != null,
                        leadingIcon = { Icon(Icons.Default.MarkEmailRead, contentDescription = null) },
                        placeholder = { Text(stringResource(R.string.str_123456)) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Next),
                        colors = authOutlinedTextFieldColors(),
                        supportingText = {
                            when {
                                otpError != null -> Text(otpError, color = MaterialTheme.colorScheme.error)
                            }
                        }
                    )

                    OutlinedTextField(
                        value = newPassword,
                        onValueChange = onNewPasswordChange,
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        isError = passwordError != null,
                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                        placeholder = { Text(stringResource(R.string.new_password_placeholder)) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Next),
                        visualTransformation = PasswordVisualTransformation(),
                        colors = authOutlinedTextFieldColors(),
                        supportingText = {
                            when {
                                passwordError != null -> Text(passwordError, color = MaterialTheme.colorScheme.error)
                            }
                        }
                    )

                    OutlinedTextField(
                        value = confirmPassword,
                        onValueChange = onConfirmPasswordChange,
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        isError = confirmPasswordError != null || (!errorMessage.isNullOrBlank() && step == 1),
                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                        placeholder = { Text(stringResource(R.string.confirm_new_password_placeholder)) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                        visualTransformation = PasswordVisualTransformation(),
                        colors = authOutlinedTextFieldColors(),
                        supportingText = {
                            when {
                                confirmPasswordError != null -> Text(confirmPasswordError, color = MaterialTheme.colorScheme.error)
                                !errorMessage.isNullOrBlank() -> Text(errorMessage, color = MaterialTheme.colorScheme.error)
                            }
                        }
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onSend,
                enabled = if (step == 0) {
                    normalizedEmail.isNotBlank() && emailError == null && !isLoading
                } else {
                    normalizedEmail.isNotBlank() &&
                        emailError == null &&
                        otp.length == 6 &&
                        otpError == null &&
                        passwordError == null &&
                        confirmPasswordError == null &&
                        newPassword.isNotBlank() &&
                        confirmPassword.isNotBlank() &&
                        !isLoading
                }
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text(if (step == 0) stringResource(R.string.send_reset_code) else stringResource(R.string.reset_password))
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isLoading) {
                Text(stringResource(R.string.cancel))
            }
        }
    )
}
