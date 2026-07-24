package com.example.swastik.ui.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.stringResource
import com.example.swastik.R
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.collectAsState
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.data.local.AppSettingsStore
import com.example.swastik.ui.theme.SwastikPrimary

@Composable
fun PatientRegisterScreen(
    onLoginClick: () -> Unit,
    onBackClick: () -> Unit,
    onRegisterSuccess: (String) -> Unit
) {
    val viewModel: AuthViewModel = hiltViewModel()
    val uiState = viewModel.uiState
    val focusManager = LocalFocusManager.current
    val appSettings by AppSettingsStore.settings.collectAsState()

    var fullName by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var confirmPassword by rememberSaveable { mutableStateOf("") }
    var phoneNumber by rememberSaveable { mutableStateOf("") }
    var passwordVisible by rememberSaveable { mutableStateOf(false) }
    var confirmPasswordVisible by rememberSaveable { mutableStateOf(false) }
    var languageExpanded by rememberSaveable { mutableStateOf(false) }
    var selectedTag by remember(appSettings.language) { mutableStateOf(appSettings.language) }

    val languageOptions = com.example.swastik.util.LanguageConfig.options
    val trimmedName = fullName.trim()
    val normalizedEmail = email.trim()
    val normalizedPhoneDigits = normalizeIndianPhoneInput(phoneNumber)
    val phoneForApi = normalizedPhoneDigits.takeIf { it.length == 10 }?.let { "+91$it" }
    val passwordMessage = passwordValidationMessage(password)
    val emailError = when {
        email.isBlank() -> null
        !isValidEmail(normalizedEmail) -> "Enter a valid email address."
        else -> null
    }
    val nameError = when {
        fullName.isBlank() -> null
        trimmedName.length < 2 -> "Enter your full name."
        else -> null
    }
    val phoneError = when {
        normalizedPhoneDigits.isBlank() -> null
        else -> phoneValidationMessage(normalizedPhoneDigits)
    }
    val confirmPasswordError = when {
        confirmPassword.isBlank() -> null
        confirmPassword != password -> "Passwords do not match."
        else -> null
    }
    val canSubmit = trimmedName.isNotBlank() &&
        nameError == null &&
        emailError == null &&
        passwordMessage == null &&
        confirmPasswordError == null &&
        phoneError == null &&
        password.isNotBlank() &&
        confirmPassword.isNotBlank() &&
        normalizedPhoneDigits.isNotBlank() &&
        !uiState.isLoading

    LaunchedEffect(uiState.registrationComplete) {
        if (uiState.registrationComplete) {
            viewModel.onRegistrationNavigated()
            onRegisterSuccess(normalizedEmail)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.surface)
            .statusBarsPadding()
            .navigationBarsPadding()
    ) {
        // Back Button
        IconButton(
            onClick = onBackClick,
            modifier = Modifier.padding(start = 12.dp, top = 8.dp)
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "Back",
                tint = MaterialTheme.colorScheme.onSurface
            )
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Create Account",
                        fontSize = 28.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }

                Box {
                    Row(
                        modifier = Modifier
                            .background(Color(0xFFF3F4F6), RoundedCornerShape(12.dp))
                            .clickable { languageExpanded = true }
                            .padding(horizontal = 12.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = stringResource(com.example.swastik.util.LanguageConfig.labelResId(selectedTag)),
                            fontWeight = FontWeight.Medium,
                            fontSize = 13.sp
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(Icons.Default.KeyboardArrowDown, contentDescription = null)
                    }

                    DropdownMenu(
                        expanded = languageExpanded,
                        onDismissRequest = { languageExpanded = false }
                    ) {
                        languageOptions.forEach { lang ->
                            DropdownMenuItem(
                                text = { Text(stringResource(lang.labelResId)) },
                                onClick = {
                                    AppSettingsStore.updateLanguage(lang.tag)
                                    languageExpanded = false
                                }
                            )
                        }
                    }
                }
            }

                AuthInlineCard(
                    text = uiState.errorMessage,
                    containerColor = Color(0xFFFFEBEE),
                    contentColor = Color(0xFFB3261E)
                )

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(stringResource(R.string.full_name_label), fontWeight = FontWeight.Medium)
                    OutlinedTextField(
                        value = fullName,
                        onValueChange = {
                            fullName = it
                            viewModel.clearFeedback()
                        },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        isError = nameError != null,
                        leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
                        placeholder = { Text(stringResource(R.string.full_name_placeholder)) },
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                        colors = authOutlinedTextFieldColors(),
                        shape = RoundedCornerShape(14.dp),
                        supportingText = {
                            nameError?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                        }
                    )
                }

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(stringResource(R.string.email_address_label), fontWeight = FontWeight.Medium)
                    OutlinedTextField(
                        value = email,
                        onValueChange = {
                            email = it
                            viewModel.clearFeedback()
                        },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        isError = emailError != null,
                        leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                        placeholder = { Text(stringResource(R.string.youexamplecom)) },
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
                    Text(stringResource(R.string.mobile_number_label), fontWeight = FontWeight.Medium)
                    OutlinedTextField(
                        value = normalizedPhoneDigits,
                        onValueChange = {
                            phoneNumber = normalizeIndianPhoneInput(it)
                            viewModel.clearFeedback()
                        },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        isError = phoneError != null,
                        leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null) },
                        prefix = { Text(stringResource(R.string.str_91)) },
                        placeholder = { Text(stringResource(R.string.mobile_number_placeholder)) },
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Phone,
                            imeAction = ImeAction.Next
                        ),
                        colors = authOutlinedTextFieldColors(),
                        shape = RoundedCornerShape(14.dp),
                        supportingText = {
                            if (phoneError != null) {
                                Text(phoneError, color = MaterialTheme.colorScheme.error)
                            } else {
                                Text(stringResource(R.string.phone_supporting_text), color = Color(0xFF6B7280))
                            }
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
                        isError = passwordMessage != null,
                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                        trailingIcon = {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    imageVector = if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                    contentDescription = if (passwordVisible) "Hide password" else "Show password"
                                )
                            }
                        },
                        placeholder = { Text(stringResource(R.string.password_placeholder)) },
                        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction = ImeAction.Next
                        ),
                        colors = authOutlinedTextFieldColors(),
                        shape = RoundedCornerShape(14.dp),
                        supportingText = {
                            if (passwordMessage != null) {
                                Text(
                                    text = passwordMessage,
                                    color = MaterialTheme.colorScheme.error
                                )
                            }
                        }
                    )
                }

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(stringResource(R.string.confirm_password_label), fontWeight = FontWeight.Medium)
                    OutlinedTextField(
                        value = confirmPassword,
                        onValueChange = {
                            confirmPassword = it
                            viewModel.clearFeedback()
                        },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        isError = confirmPasswordError != null,
                        leadingIcon = { Icon(Icons.Default.CheckCircle, contentDescription = null) },
                        trailingIcon = {
                            IconButton(onClick = { confirmPasswordVisible = !confirmPasswordVisible }) {
                                Icon(
                                    imageVector = if (confirmPasswordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                    contentDescription = if (confirmPasswordVisible) "Hide password" else "Show password"
                                )
                            }
                        },
                        placeholder = { Text(stringResource(R.string.re_enter_password)) },
                        visualTransformation = if (confirmPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction = ImeAction.Done
                        ),
                        keyboardActions = KeyboardActions(
                            onDone = {
                                focusManager.clearFocus()
                                if (canSubmit) {
                                    viewModel.register(
                                        name = trimmedName,
                                        phone = phoneForApi,
                                        email = normalizedEmail,
                                        password = password
                                    )
                                }
                            }
                        ),
                        colors = authOutlinedTextFieldColors(),
                        shape = RoundedCornerShape(14.dp),
                        supportingText = {
                            confirmPasswordError?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                        }
                    )
                }

                Button(
                    onClick = {
                        focusManager.clearFocus()
                        viewModel.register(
                            name = trimmedName,
                            phone = phoneForApi,
                            email = normalizedEmail,
                            password = password
                        )
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
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
                        Text(stringResource(R.string.register), fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(stringResource(R.string.already_registered), color = Color(0xFF6B7280))
                    TextButton(onClick = onLoginClick, enabled = !uiState.isLoading) {
                        Text(stringResource(R.string.login_here), fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
}

@Composable
private fun AuthInlineCard(
    text: String?,
    containerColor: Color,
    contentColor: Color
) {
    if (text.isNullOrBlank()) return

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = containerColor)
    ) {
        Text(
            text = text,
            color = contentColor,
            fontSize = 14.sp,
            lineHeight = 20.sp,
            modifier = Modifier.padding(14.dp)
        )
    }
}
