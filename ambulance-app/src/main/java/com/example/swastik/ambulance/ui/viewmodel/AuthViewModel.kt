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
    val registrationSuccessMessage: String? = null
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
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
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
                    _uiState.value = AuthUiState(
                        isLoading = false,
                        isSessionResolved = true,
                        error = e.message ?: "Failed to restore session"
                    )
                }
            )
        }
    }

    fun login(email: String, password: String) {
        // Client-side validation before hitting the server
        val trimmedEmail = email.trim()
        if (trimmedEmail.isBlank()) {
            _uiState.value = _uiState.value.copy(error = "Email is required")
            return
        }
        if (!android.util.Patterns.EMAIL_ADDRESS.matcher(trimmedEmail).matches()) {
            _uiState.value = _uiState.value.copy(error = "Please enter a valid email address")
            return
        }
        if (password.length < 6) {
            _uiState.value = _uiState.value.copy(error = "Password must be at least 6 characters")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null, isSessionResolved = false)
            val result = authRepository.login(trimmedEmail, password)
            result.fold(
                onSuccess = { user ->
                    _uiState.value = AuthUiState(
                        isSessionResolved = true,
                        isLoggedIn = true,
                        user = user,
                        isLoading = false
                    )
                },
                onFailure = { e ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isSessionResolved = true,
                        error = e.message ?: "Login failed"
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
                _uiState.value = _uiState.value.copy(error = "Name is required")
                return
            }
            trimmedCompanyName.isBlank() -> {
                _uiState.value = _uiState.value.copy(error = "Company or fleet name is required")
                return
            }
            trimmedRegistrationNumber.isBlank() -> {
                _uiState.value = _uiState.value.copy(error = "Registration number is required for approval")
                return
            }
            !android.util.Patterns.EMAIL_ADDRESS.matcher(trimmedEmail).matches() -> {
                _uiState.value = _uiState.value.copy(error = "Please enter a valid email address")
                return
            }
            trimmedPhone.length < 10 -> {
                _uiState.value = _uiState.value.copy(error = "Please enter a valid phone number")
                return
            }
            trimmedAlternatePhone.isNotBlank() && trimmedAlternatePhone.length < 10 -> {
                _uiState.value = _uiState.value.copy(error = "Please enter a valid alternate phone number")
                return
            }
            trimmedLicenseExpiry.isNotBlank() && !Regex("^\\d{4}-\\d{2}-\\d{2}$").matches(trimmedLicenseExpiry) -> {
                _uiState.value = _uiState.value.copy(error = "License expiry must use YYYY-MM-DD format")
                return
            }
            password.length < 8 -> {
                _uiState.value = _uiState.value.copy(error = "Password must be at least 8 characters")
                return
            }
            !password.any(Char::isUpperCase) || !password.any(Char::isLowerCase) || !password.any(Char::isDigit) -> {
                _uiState.value = _uiState.value.copy(error = "Password needs uppercase, lowercase, and a number")
                return
            }
            password != confirmPassword -> {
                _uiState.value = _uiState.value.copy(error = "Passwords do not match")
                return
            }
            else -> {
                viewModelScope.launch {
                    _uiState.value = _uiState.value.copy(isLoading = true, error = null, registrationSuccessMessage = null)
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
                                error = null
                            )
                        },
                        onFailure = { e ->
                            _uiState.value = _uiState.value.copy(
                                isLoading = false,
                                error = e.message ?: "Registration failed"
                            )
                        }
                    )
                }
            }
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
        _uiState.value = _uiState.value.copy(error = null)
    }

    fun clearRegistrationMessage() {
        _uiState.value = _uiState.value.copy(registrationSuccessMessage = null)
    }
}
