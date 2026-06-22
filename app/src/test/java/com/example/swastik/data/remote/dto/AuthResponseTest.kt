package com.example.swastik.data.remote.dto

import com.google.gson.Gson
import org.junit.Assert.assertEquals
import org.junit.Test

class AuthResponseTest {

    private val gson = Gson()

    @Test
    fun loginResponse_resolvesNestedCamelCaseTokens() {
        val response = gson.fromJson(
            """
            {
              "success": true,
              "message": "Login successful",
              "data": {
                "accessToken": "access.jwt",
                "refreshToken": "refresh.jwt",
                "expiresIn": 604800,
                "user": {
                  "id": "user-1",
                  "email": "patient@example.com",
                  "phone": "+919999999999",
                  "role": "patient",
                  "name": "Patient One",
                  "is_verified": true
                }
              }
            }
            """.trimIndent(),
            AuthResponse::class.java
        )

        assertEquals("access.jwt", response.resolvedAccessToken())
        assertEquals("refresh.jwt", response.resolvedRefreshToken())
        assertEquals(604800L, response.resolvedExpiresIn())
        assertEquals("patient", response.resolvedUser()?.role)
    }

    @Test
    fun emailOtpResponse_resolvesTopLevelSnakeCaseTokens() {
        val response = gson.fromJson(
            """
            {
              "success": true,
              "message": "Email verified successfully. You are now logged in.",
              "access_token": "otp-access.jwt",
              "refresh_token": "otp-refresh.jwt",
              "user": {
                "id": "user-1",
                "email": "patient@example.com",
                "phone": "+919999999999",
                "role": "patient",
                "name": "Patient One",
                "is_verified": true
              }
            }
            """.trimIndent(),
            AuthResponse::class.java
        )

        assertEquals("otp-access.jwt", response.resolvedAccessToken())
        assertEquals("otp-refresh.jwt", response.resolvedRefreshToken())
        assertEquals("patient", response.resolvedUser()?.role)
    }

    @Test
    fun refreshResponse_resolvesNestedSnakeCaseTokens() {
        val response = gson.fromJson(
            """
            {
              "success": true,
              "data": {
                "access_token": "new-access.jwt",
                "refresh_token": "new-refresh.jwt",
                "expires_in": 3600
              }
            }
            """.trimIndent(),
            TokenResponse::class.java
        )

        assertEquals("new-access.jwt", response.resolvedAccessToken())
        assertEquals("new-refresh.jwt", response.resolvedRefreshToken())
        assertEquals(3600L, response.resolvedExpiresIn())
    }
}
