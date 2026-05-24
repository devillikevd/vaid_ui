package com.example.swastik.data.repository

import com.example.swastik.data.model.*
import com.example.swastik.data.remote.ApiService
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CommunityRepository @Inject constructor(
    private val apiService: ApiService
) {
    fun getQuestions(page: Int = 1, limit: Int = 20): Flow<Result<CommunityQuestionResponse>> = flow {
        try {
            val response = apiService.getCommunityQuestions(page, limit)
            if (response.isSuccessful && response.body() != null) {
                emit(Result.Success(response.body()!!))
            } else {
                emit(Result.Error(response.message()))
            }
        } catch (e: Exception) {
            emit(Result.Error(e.message ?: "Unknown error", e))
        }
    }

    fun getQuestionDetails(id: String): Flow<Result<CommunityQuestion>> = flow {
        try {
            val response = apiService.getQuestionDetails(id)
            if (response.isSuccessful && response.body() != null) {
                emit(Result.Success(response.body()!!))
            } else {
                emit(Result.Error(response.message()))
            }
        } catch (e: Exception) {
            emit(Result.Error(e.message ?: "Unknown error", e))
        }
    }

    suspend fun createQuestion(title: String, content: String): Result<CommunityQuestion> {
        return try {
            val response = apiService.createQuestion(PostQuestionRequest(title, content))
            if (response.isSuccessful && response.body() != null) {
                Result.Success(response.body()!!)
            } else {
                Result.Error(response.message())
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Unknown error", e)
        }
    }

    suspend fun addAnswer(questionId: String, content: String): Result<CommunityAnswer> {
        return try {
            val response = apiService.addAnswer(questionId, PostAnswerRequest(content))
            if (response.isSuccessful && response.body() != null) {
                Result.Success(response.body()!!)
            } else {
                Result.Error("Failed to add answer: ${response.message()}")
            }
        } catch (e: Exception) {
            Result.Error("Error: ${e.message}")
        }
    }

    suspend fun upvoteQuestion(questionId: String): Result<Unit> {
        return try {
            val response = apiService.upvoteQuestion(questionId)
            if (response.isSuccessful) {
                Result.Success(Unit)
            } else {
                Result.Error("Failed to upvote question")
            }
        } catch (e: Exception) {
            Result.Error("Error: ${e.message}")
        }
    }

    suspend fun upvoteAnswer(answerId: String): Result<Unit> {
        return try {
            val response = apiService.upvoteAnswer(answerId)
            if (response.isSuccessful) {
                Result.Success(Unit)
            } else {
                Result.Error("Failed to upvote answer")
            }
        } catch (e: Exception) {
            Result.Error("Error: ${e.message}")
        }
    }

    suspend fun deleteQuestion(questionId: String): Result<Unit> {
        return try {
            val response = apiService.deleteQuestion(questionId)
            if (response.isSuccessful) {
                Result.Success(Unit)
            } else {
                Result.Error("Failed to delete question")
            }
        } catch (e: Exception) {
            Result.Error("Error: ${e.message}")
        }
    }

    suspend fun deleteAnswer(answerId: String): Result<Unit> {
        return try {
            val response = apiService.deleteAnswer(answerId)
            if (response.isSuccessful) {
                Result.Success(Unit)
            } else {
                Result.Error("Failed to delete answer")
            }
        } catch (e: Exception) {
            Result.Error("Error: ${e.message}")
        }
    }
}
