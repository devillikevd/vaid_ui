package com.example.swastik.data.repository

class AuthApiException(
    message: String,
    val code: String? = null
) : Exception(message)
