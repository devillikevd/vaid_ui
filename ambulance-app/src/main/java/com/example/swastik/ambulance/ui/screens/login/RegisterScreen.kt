package com.example.swastik.ambulance.ui.screens.login

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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.LocalShipping
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
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.ambulance.ui.viewmodel.AuthViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegisterScreen(
    onBack: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    var name by remember { mutableStateOf("") }
    var companyName by remember { mutableStateOf("") }
    var registrationNumber by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var city by remember { mutableStateOf("") }
    var state by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var alternatePhone by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var licenseExpiry by remember { mutableStateOf("") }
    var licenseDocumentUrl by remember { mutableStateOf("") }
    var vehicleNumber by remember { mutableStateOf("") }
    var vehicleType by remember { mutableStateOf("basic") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var confirmVisible by remember { mutableStateOf(false) }
    var verificationOtp by remember { mutableStateOf("") }
    val verificationEmail = uiState.pendingVerificationEmail ?: email.trim()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Operator Registration") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFFB71C1C),
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color(0xFFB71C1C), Color(0xFFD32F2F), Color(0xFFFBE9E7))
                    )
                )
                .padding(padding)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Spacer(modifier = Modifier.height(12.dp))

                Icon(
                    imageVector = Icons.Default.LocalShipping,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.height(64.dp)
                )

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = "Join the emergency response network",
                    color = Color.White,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold
                )

                Text(
                    text = "Create an ambulance operator account. Email verification and admin approval are required before dispatch access.",
                    color = Color.White.copy(alpha = 0.9f),
                    fontSize = 13.sp,
                    modifier = Modifier.padding(top = 6.dp)
                )

                Spacer(modifier = Modifier.height(20.dp))

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        if (uiState.registrationSuccessMessage != null) {
                            Card(
                                colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9)),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Text(
                                        text = if (uiState.emailVerificationComplete) "Email verified" else "Registration submitted",
                                        color = Color(0xFF1B5E20),
                                        fontWeight = FontWeight.Bold
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = uiState.registrationSuccessMessage ?: "",
                                        color = Color(0xFF2E7D32),
                                        fontSize = 13.sp
                                    )
                                    if (!uiState.infoMessage.isNullOrBlank()) {
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Text(
                                            text = uiState.infoMessage ?: "",
                                            color = Color(0xFF2E7D32),
                                            fontSize = 12.sp
                                        )
                                    }
                                    if (uiState.error != null) {
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Text(
                                            text = uiState.error ?: "",
                                            color = MaterialTheme.colorScheme.error,
                                            fontSize = 12.sp
                                        )
                                    }
                                    if (!uiState.emailVerificationComplete) {
                                        Spacer(modifier = Modifier.height(12.dp))
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
                                        Spacer(modifier = Modifier.height(12.dp))
                                        Button(
                                            onClick = { viewModel.verifyEmailOtp(verificationEmail, verificationOtp) },
                                            enabled = verificationOtp.length == 6 && !uiState.isLoading && verificationEmail.isNotBlank(),
                                            modifier = Modifier.fillMaxWidth(),
                                            shape = RoundedCornerShape(12.dp),
                                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD32F2F))
                                        ) {
                                            if (uiState.isLoading) {
                                                CircularProgressIndicator(
                                                    modifier = Modifier.height(18.dp),
                                                    strokeWidth = 2.dp,
                                                    color = Color.White
                                                )
                                            } else {
                                                Text("Verify email OTP")
                                            }
                                        }
                                        Spacer(modifier = Modifier.height(8.dp))
                                        OutlinedButton(
                                            onClick = { viewModel.resendVerification(verificationEmail) },
                                            enabled = verificationEmail.isNotBlank() && !uiState.isLoading,
                                            modifier = Modifier.fillMaxWidth(),
                                            shape = RoundedCornerShape(12.dp)
                                        ) {
                                            Text("Resend verification code")
                                        }
                                    }
                                    Spacer(modifier = Modifier.height(8.dp))
                                    TextButton(onClick = {
                                        viewModel.clearRegistrationMessage()
                                        onBack()
                                    }) {
                                        Text("Back to sign in")
                                    }
                                }
                            }
                        } else {
                            OutlinedTextField(
                                value = name,
                                onValueChange = {
                                    name = it
                                    if (uiState.error != null) viewModel.clearError()
                                },
                                label = { Text("Operator name") },
                                leadingIcon = { Icon(Icons.Default.Person, null) },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp)
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            OutlinedTextField(
                                value = companyName,
                                onValueChange = {
                                    companyName = it
                                    if (uiState.error != null) viewModel.clearError()
                                },
                                label = { Text("Company / fleet name") },
                                leadingIcon = { Icon(Icons.Default.Business, null) },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp)
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            OutlinedTextField(
                                value = registrationNumber,
                                onValueChange = {
                                    registrationNumber = it
                                    if (uiState.error != null) viewModel.clearError()
                                },
                                label = { Text("Registration / permit number") },
                                leadingIcon = { Icon(Icons.Default.Badge, null) },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp)
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            OutlinedTextField(
                                value = address,
                                onValueChange = {
                                    address = it
                                    if (uiState.error != null) viewModel.clearError()
                                },
                                label = { Text("Base address") },
                                leadingIcon = { Icon(Icons.Default.Business, null) },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp)
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                OutlinedTextField(
                                    value = city,
                                    onValueChange = {
                                        city = it
                                        if (uiState.error != null) viewModel.clearError()
                                    },
                                    label = { Text("City") },
                                    modifier = Modifier.weight(1f),
                                    singleLine = true,
                                    shape = RoundedCornerShape(12.dp)
                                )

                                OutlinedTextField(
                                    value = state,
                                    onValueChange = {
                                        state = it
                                        if (uiState.error != null) viewModel.clearError()
                                    },
                                    label = { Text("State") },
                                    modifier = Modifier.weight(1f),
                                    singleLine = true,
                                    shape = RoundedCornerShape(12.dp)
                                )
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            OutlinedTextField(
                                value = phone,
                                onValueChange = {
                                    phone = it
                                    if (uiState.error != null) viewModel.clearError()
                                },
                                label = { Text("Phone") },
                                leadingIcon = { Icon(Icons.Default.Phone, null) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp)
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            OutlinedTextField(
                                value = alternatePhone,
                                onValueChange = {
                                    alternatePhone = it
                                    if (uiState.error != null) viewModel.clearError()
                                },
                                label = { Text("Alternate phone") },
                                leadingIcon = { Icon(Icons.Default.Phone, null) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp)
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            OutlinedTextField(
                                value = email,
                                onValueChange = {
                                    email = it
                                    if (uiState.error != null) viewModel.clearError()
                                },
                                label = { Text("Email") },
                                leadingIcon = { Icon(Icons.Default.Email, null) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp)
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            OutlinedTextField(
                                value = licenseExpiry,
                                onValueChange = {
                                    licenseExpiry = it
                                    if (uiState.error != null) viewModel.clearError()
                                },
                                label = { Text("License expiry (YYYY-MM-DD)") },
                                leadingIcon = { Icon(Icons.Default.Badge, null) },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp)
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            OutlinedTextField(
                                value = licenseDocumentUrl,
                                onValueChange = {
                                    licenseDocumentUrl = it
                                    if (uiState.error != null) viewModel.clearError()
                                },
                                label = { Text("License document URL (optional)") },
                                leadingIcon = { Icon(Icons.Default.Business, null) },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp)
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            OutlinedTextField(
                                value = vehicleNumber,
                                onValueChange = {
                                    vehicleNumber = it
                                    if (uiState.error != null) viewModel.clearError()
                                },
                                label = { Text("Vehicle Number (e.g. UP16-AB-1234)") },
                                leadingIcon = { Icon(Icons.Default.LocalShipping, null) },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp)
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            OutlinedTextField(
                                value = vehicleType,
                                onValueChange = {
                                    vehicleType = it
                                    if (uiState.error != null) viewModel.clearError()
                                },
                                label = { Text("Vehicle Type (basic, advanced, icu)") },
                                leadingIcon = { Icon(Icons.Default.LocalShipping, null) },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp)
                            )

                            Spacer(modifier = Modifier.height(12.dp))

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
                                        Icon(if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility, null)
                                    }
                                },
                                visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp)
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            OutlinedTextField(
                                value = confirmPassword,
                                onValueChange = {
                                    confirmPassword = it
                                    if (uiState.error != null) viewModel.clearError()
                                },
                                label = { Text("Confirm password") },
                                leadingIcon = { Icon(Icons.Default.Lock, null) },
                                trailingIcon = {
                                    IconButton(onClick = { confirmVisible = !confirmVisible }) {
                                        Icon(if (confirmVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility, null)
                                    }
                                },
                                visualTransformation = if (confirmVisible) VisualTransformation.None else PasswordVisualTransformation(),
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp)
                            )

                            if (uiState.error != null) {
                                Spacer(modifier = Modifier.height(12.dp))
                                Text(
                                    text = uiState.error ?: "",
                                    color = MaterialTheme.colorScheme.error,
                                    fontSize = 13.sp
                                )
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            Button(
                                onClick = {
                                    viewModel.registerOperator(
                                        name = name,
                                        email = email,
                                        phone = phone,
                                        password = password,
                                        confirmPassword = confirmPassword,
                                        companyName = companyName,
                                        registrationNumber = registrationNumber,
                                        address = address,
                                        city = city,
                                        state = state,
                                        alternatePhone = alternatePhone,
                                        licenseDocumentUrl = licenseDocumentUrl,
                                        licenseExpiry = licenseExpiry,
                                        vehicleNumber = vehicleNumber,
                                        vehicleType = vehicleType
                                    )
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(52.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD32F2F)),
                                shape = RoundedCornerShape(12.dp),
                                enabled = !uiState.isLoading
                            ) {
                                if (uiState.isLoading) {
                                    CircularProgressIndicator(color = Color.White)
                                } else {
                                    Text("Create operator account", fontWeight = FontWeight.SemiBold)
                                }
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.Center
                            ) {
                                TextButton(onClick = onBack) {
                                    Text("Already approved? Sign in")
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
