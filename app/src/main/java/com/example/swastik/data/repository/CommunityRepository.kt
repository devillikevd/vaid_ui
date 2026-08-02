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
    fun getQuestions(page: Int = 1, limit: Int = 20, filter: String? = null, topic: String? = null, search: String? = null, sortBy: String? = null): Flow<Result<CommunityQuestionResponse>> = flow {
        try {
            val response = apiService.getCommunityQuestions(page, limit, filter, topic, search, sortBy)
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

    suspend fun createQuestion(title: String, content: String, topic: String? = null, isAnonymous: Boolean = false, attachments: List<String> = emptyList()): Result<CommunityQuestion> {
        return try {
            val response = apiService.createQuestion(PostQuestionRequest(title, content, topic, isAnonymous, attachments))
            if (response.isSuccessful && response.body() != null) {
                Result.Success(response.body()!!)
            } else {
                android.util.Log.e("CommunityRepo", "createQuestion failed: ${response.code()} ${response.message()} ${response.errorBody()?.string()}")
                Result.Error("API Error: ${response.code()} ${response.message()}")
            }
        } catch (e: Exception) {
            android.util.Log.e("CommunityRepo", "createQuestion exception", e)
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

    suspend fun updateAnswer(answerId: String, content: String): Result<CommunityAnswer> {
        return try {
            val response = apiService.updateAnswer(answerId, PostAnswerRequest(content))
            if (response.isSuccessful && response.body() != null) {
                Result.Success(response.body()!!)
            } else {
                Result.Error("Failed to update answer: ${response.message()}")
            }
        } catch (e: Exception) {
            Result.Error("Error: ${e.message}")
        }
    }

    suspend fun upvoteQuestion(questionId: String, action: String): Result<Unit> {
        return try {
            val response = apiService.upvoteQuestion(questionId, action)
            if (response.isSuccessful) {
                Result.Success(Unit)
            } else {
                Result.Error("Failed to upvote question")
            }
        } catch (e: Exception) {
            Result.Error("Error: ${e.message}")
        }
    }

    suspend fun upvoteAnswer(answerId: String, action: String): Result<Unit> {
        return try {
            val response = apiService.upvoteAnswer(answerId, action)
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

    suspend fun toggleBookmark(questionId: String): Result<Boolean> {
        return try {
            val response = apiService.toggleBookmark(questionId)
            if (response.isSuccessful && response.body() != null) {
                val bookmarked = response.body()?.get("bookmarked")?.asBoolean ?: false
                Result.Success(bookmarked)
            } else {
                Result.Error("Failed to toggle bookmark")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Unknown error")
        }
    }

    suspend fun getTrendingTopics(): Result<List<com.google.gson.JsonObject>> {
        return try {
            val response = apiService.getTrendingTopics()
            if (response.isSuccessful && response.body() != null) {
                Result.Success(response.body()!!)
            } else {
                Result.Error("Failed to get trending topics")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Unknown error")
        }
    }
}
