package com.example.swastik.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.swastik.data.model.CommunityQuestion
import com.example.swastik.data.repository.CommunityRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.launch
import androidx.paging.Pager
import androidx.paging.PagingConfig
import androidx.paging.PagingData
import androidx.paging.cachedIn
import com.example.swastik.data.remote.ApiService
import com.example.swastik.data.repository.paging.CommunityPagingSource
import com.example.swastik.ui.components.SnackbarManager
import com.example.swastik.data.local.TokenManager
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

@HiltViewModel
class CommunityViewModel @Inject constructor(
    private val repository: CommunityRepository,
    private val apiService: ApiService,
    private val tokenManager: TokenManager
) : ViewModel() {

    val currentUserId: String? get() = tokenManager.userId

    val pagedQuestions: Flow<PagingData<CommunityQuestion>> = Pager(
        config = PagingConfig(pageSize = 20, enablePlaceholders = false)
    ) {
        CommunityPagingSource(apiService)
    }.flow.cachedIn(viewModelScope)

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _selectedQuestion = MutableStateFlow<CommunityQuestion?>(null)
    val selectedQuestion: StateFlow<CommunityQuestion?> = _selectedQuestion.asStateFlow()

    fun fetchQuestions() {
        // Now handled by Paging 3, we don't need this anymore for the main list
    }

    fun fetchQuestionDetails(id: String) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.getQuestionDetails(id)
                .catch { e ->
                    _error.value = e.message
                    _isLoading.value = false
                }
                .collect { result ->
                    when (result) {
                        is com.example.swastik.data.repository.Result.Success -> {
                            _selectedQuestion.value = result.data
                        }
                        is com.example.swastik.data.repository.Result.Error -> {
                            _error.value = result.message
                            SnackbarManager.showError(result.message ?: "Failed to load question details")
                        }
                        else -> {}
                    }
                    _isLoading.value = false
                }
        }
    }

    fun askQuestion(title: String, content: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            val result = repository.createQuestion(title, content)
            _isLoading.value = false
            when (result) {
                is com.example.swastik.data.repository.Result.Success -> {
                    fetchQuestions()
                    onSuccess()
                }
                is com.example.swastik.data.repository.Result.Error -> {
                    _error.value = result.message
                    SnackbarManager.showError(result.message ?: "Failed to ask question")
                }
                else -> {}
            }
        }
    }

    fun addAnswer(questionId: String, content: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            val result = repository.addAnswer(questionId, content)
            when (result) {
                is com.example.swastik.data.repository.Result.Success -> {
                    fetchQuestionDetails(questionId) // Refresh details
                    onSuccess()
                }
                is com.example.swastik.data.repository.Result.Error -> {
                    _error.value = result.message
                }
                else -> {}
            }
        }
    }

    fun hasUpvoted(id: String): Boolean {
        return tokenManager.hasUpvoted(id)
    }

    fun upvoteQuestion(questionId: String) {
        if (hasUpvoted(questionId)) return
        viewModelScope.launch {
            repository.upvoteQuestion(questionId)
            tokenManager.addUpvoted(questionId)
            if (_selectedQuestion.value?.id == questionId) {
                _selectedQuestion.value = _selectedQuestion.value?.let { it.copy(upvotes = it.upvotes + 1) }
            }
        }
    }

    fun upvoteAnswer(answerId: String) {
        if (hasUpvoted(answerId)) return
        viewModelScope.launch {
            repository.upvoteAnswer(answerId)
            tokenManager.addUpvoted(answerId)
            _selectedQuestion.value = _selectedQuestion.value?.let { q ->
                val newAnswers = q.answers?.map { a ->
                    if (a.id == answerId) a.copy(upvotes = a.upvotes + 1) else a
                }
                q.copy(answers = newAnswers)
            }
        }
    }

    fun deleteQuestion(questionId: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            val result = repository.deleteQuestion(questionId)
            _isLoading.value = false
            when (result) {
                is com.example.swastik.data.repository.Result.Success -> {
                    SnackbarManager.showMessage("Question deleted")
                    onSuccess()
                }
                is com.example.swastik.data.repository.Result.Error -> {
                    SnackbarManager.showError(result.message ?: "Failed to delete question")
                }
                else -> {}
            }
        }
    }

    fun deleteAnswer(answerId: String, questionId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            val result = repository.deleteAnswer(answerId)
            _isLoading.value = false
            when (result) {
                is com.example.swastik.data.repository.Result.Success -> {
                    SnackbarManager.showMessage("Answer deleted")
                    fetchQuestionDetails(questionId) // refresh answers
                }
                is com.example.swastik.data.repository.Result.Error -> {
                    SnackbarManager.showError(result.message ?: "Failed to delete answer")
                }
                else -> {}
            }
        }
    }
}
