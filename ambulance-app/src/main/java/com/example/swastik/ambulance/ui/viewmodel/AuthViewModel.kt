package com.example.swastik.ambulance.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.swastik.ambulance.data.remote.dto.UserDto
import com.example.swastik.ambulance.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AuthUiState(
    val isLoading: Boolean = false,
    val isSessionResolved: Boolean = false,
    val isLoggedIn: Boolean = false,
    val user: UserDto? = null,
    val error: String? = null,
    val errorCode: String? = null,
    val infoMessage: String? = null,
    val registrationSuccessMessage: String? = null,
    val pendingVerificationEmail: String? = null,
    val emailVerificationComplete: Boolean = false,
    val passwordResetCodeSent: Boolean = false,
    val passwordResetComplete: Boolean = false
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    init {
        if (authRepository.isAuthenticated()) {
            resolveSession()
        } else {
            _uiState.value = AuthUiState(isSessionResolved = true)
        }
    }

    fun resolveSession() {
        if (!authRepository.isAuthenticated()) {
            _uiState.value = AuthUiState(isSessionResolved = true)
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null, errorCode = null)
            val result = authRepository.restoreSession()
            result.fold(
                onSuccess = { user ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isSessionResolved = true,
                        isLoggedIn = true,
                        user = user,
                        error = null
                    )
                },
                onFailure = { e ->
                    _uiState.value = if (authRepository.isAuthenticated()) {
                        AuthUiState(
                            isLoading = false,
                            isSessionResolved = true,
                            isLoggedIn = true,
                            error = e.message ?: "Failed to refresh profile. Showing saved session."
                        )
                    } else {
                        AuthUiState(
                            isLoading = false,
                            isSessionResolved = true,
                            error = e.message ?: "Failed to restore session"
                        )
                    }
                }
            )
        }
    }

    fun login(email: String, password: String) {
        // Client-side validation before hitting the server
        val trimmedEmail = email.trim()
        if (trimmedEmail.isBlank()) {
            _uiState.value = _uiState.value.copy(error = "Email is required", errorCode = null)
            return
        }
        if (!android.util.Patterns.EMAIL_ADDRESS.matcher(trimmedEmail).matches()) {
            _uiState.value = _uiState.value.copy(error = "Please enter a valid email address", errorCode = null)
            return
        }
        if (password.length < 6) {
            _uiState.value = _uiState.value.copy(error = "Password must be at least 6 characters", errorCode = null)
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null, errorCode = null, infoMessage = null, isSessionResolved = false, emailVerificationComplete = false)
            val result = authRepository.login(trimmedEmail, password)
            result.fold(
                onSuccess = { user ->
                    _uiState.value = AuthUiState(
                        isSessionResolved = true,
                        isLoggedIn = true,
                        user = user,
                        isLoading = false,
                        infoMessage = "Login Successful!"
                    )
                },
                onFailure = { e ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isSessionResolved = true,
                        error = e.message ?: "Login failed",
                        errorCode = (e as? AuthRepository.AuthApiException)?.code
                    )
                }
            )
        }
    }

    fun registerOperator(
        name: String,
        email: String,
        phone: String,
        password: String,
        confirmPassword: String,
        companyName: String,
        registrationNumber: String,
        address: String,
        city: String,
        state: String,
        alternatePhone: String,
        licenseDocumentUrl: String,
        licenseExpiry: String
    ) {
        val trimmedName = name.trim()
        val trimmedEmail = email.trim()
        val trimmedPhone = phone.trim()
        val trimmedCompanyName = companyName.trim()
        val trimmedRegistrationNumber = registrationNumber.trim()
        val trimmedAlternatePhone = alternatePhone.trim()
        val trimmedLicenseExpiry = licenseExpiry.trim()

        when {
            trimmedName.isBlank() -> {
                _uiState.value = _uiState.value.copy(error = "Name is required", errorCode = null)
                return
            }
            trimmedCompanyName.isBlank() -> {
                _uiState.value = _uiState.value.copy(error = "Company or fleet name is required", errorCode = null)
                return
            }
            trimmedRegistrationNumber.isBlank() -> {
                _uiState.value = _uiState.value.copy(error = "Registration number is required for approval", errorCode = null)
                return
            }
            !android.util.Patterns.EMAIL_ADDRESS.matcher(trimmedEmail).matches() -> {
                _uiState.value = _uiState.value.copy(error = "Please enter a valid email address", errorCode = null)
                return
            }
            trimmedPhone.length < 10 -> {
                _uiState.value = _uiState.value.copy(error = "Please enter a valid phone number", errorCode = null)
                return
            }
            trimmedAlternatePhone.isNotBlank() && trimmedAlternatePhone.length < 10 -> {
                _uiState.value = _uiState.value.copy(error = "Please enter a valid alternate phone number", errorCode = null)
                return
            }
            trimmedLicenseExpiry.isNotBlank() && !Regex("^\\d{4}-\\d{2}-\\d{2}$").matches(trimmedLicenseExpiry) -> {
                _uiState.value = _uiState.value.copy(error = "License expiry must use YYYY-MM-DD format", errorCode = null)
                return
            }
            password.length < 8 -> {
                _uiState.value = _uiState.value.copy(error = "Password must be at least 8 characters", errorCode = null)
                return
            }
            !password.any(Char::isUpperCase) || !password.any(Char::isLowerCase) || !password.any(Char::isDigit) -> {
                _uiState.value = _uiState.value.copy(error = "Password needs uppercase, lowercase, and a number", errorCode = null)
                return
            }
            password != confirmPassword -> {
                _uiState.value = _uiState.value.copy(error = "Passwords do not match", errorCode = null)
                return
            }
            else -> {
                viewModelScope.launch {
                    _uiState.value = _uiState.value.copy(isLoading = true, error = null, errorCode = null, infoMessage = null, registrationSuccessMessage = null, emailVerificationComplete = false)
                    val result = authRepository.registerOperator(
                        name = trimmedName,
                        email = trimmedEmail,
                        phone = trimmedPhone,
                        password = password,
                        companyName = trimmedCompanyName,
                        registrationNumber = trimmedRegistrationNumber,
                        address = address,
                        city = city,
                        state = state,
                        alternatePhone = trimmedAlternatePhone.ifBlank { null },
                        licenseDocumentUrl = licenseDocumentUrl,
                        licenseExpiry = trimmedLicenseExpiry.ifBlank { null }
                    )
                    result.fold(
                        onSuccess = { message ->
                            _uiState.value = _uiState.value.copy(
                                isLoading = false,
                                registrationSuccessMessage = message,
                                pendingVerificationEmail = trimmedEmail,
                                error = null,
                                errorCode = null,
                                infoMessage = "We sent a 6-digit verification code to your email."
                            )
                        },
                        onFailure = { e ->
                            _uiState.value = _uiState.value.copy(
                                isLoading = false,
                                error = e.message ?: "Registration failed",
                                errorCode = (e as? AuthRepository.AuthApiException)?.code
                            )
                        }
                    )
                }
            }
        }
    }

    fun resendVerification(email: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null, errorCode = null)
            val result = authRepository.resendVerification(email)
            result.fold(
                onSuccess = { message ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        infoMessage = message,
                        error = null,
                        errorCode = null
                    )
                },
                onFailure = { e ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = e.message ?: "Failed to resend verification code",
                        errorCode = (e as? AuthRepository.AuthApiException)?.code
                    )
                }
            )
        }
    }

    fun verifyEmailOtp(email: String, otp: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null, errorCode = null, emailVerificationComplete = false)
            val result = authRepository.verifyEmailOtp(email, otp)
            result.fold(
                onSuccess = { message ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        infoMessage = message,
                        error = null,
                        errorCode = null,
                        emailVerificationComplete = true
                    )
                },
                onFailure = { e ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = e.message ?: "Failed to verify email",
                        errorCode = (e as? AuthRepository.AuthApiException)?.code,
                        emailVerificationComplete = false
                    )
                }
            )
        }
    }

    fun forgotPassword(email: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null, errorCode = null, infoMessage = null, passwordResetCodeSent = false, passwordResetComplete = false)
            val result = authRepository.forgotPassword(email)
            result.fold(
                onSuccess = { message ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        infoMessage = message,
                        error = null,
                        errorCode = null,
                        passwordResetCodeSent = true
                    )
                },
                onFailure = { e ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = e.message ?: "Failed to send reset code",
                        errorCode = (e as? AuthRepository.AuthApiException)?.code,
                        passwordResetCodeSent = false
                    )
                }
            )
        }
    }

    fun resetPasswordWithOtp(email: String, otp: String, password: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null, errorCode = null, passwordResetComplete = false)
            val result = authRepository.resetPasswordWithOtp(email, otp, password)
            result.fold(
                onSuccess = { message ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        infoMessage = message,
                        error = null,
                        errorCode = null,
                        passwordResetComplete = true
                    )
                },
                onFailure = { e ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = e.message ?: "Failed to reset password",
                        errorCode = (e as? AuthRepository.AuthApiException)?.code,
                        passwordResetComplete = false
                    )
                }
            )
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            _uiState.value = AuthUiState(isSessionResolved = true)
        }
    }

    fun refreshApprovalStatus() {
        resolveSession()
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null, errorCode = null)
    }

    fun clearRegistrationMessage() {
        _uiState.value = _uiState.value.copy(
            registrationSuccessMessage = null,
            pendingVerificationEmail = null,
            emailVerificationComplete = false,
            infoMessage = null,
            error = null,
            errorCode = null
        )
    }

    fun resetPasswordRecoveryState() {
        _uiState.value = _uiState.value.copy(
            error = null,
            errorCode = null,
            infoMessage = null,
            passwordResetCodeSent = false,
            passwordResetComplete = false
        )
    }

    fun clearPasswordResetFlags() {
        _uiState.value = _uiState.value.copy(
            error = null,
            errorCode = null,
            passwordResetCodeSent = false,
            passwordResetComplete = false
        )
    }
}
