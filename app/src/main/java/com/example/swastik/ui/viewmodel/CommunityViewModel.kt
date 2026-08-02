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
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.ExperimentalCoroutinesApi
import javax.inject.Inject

@HiltViewModel
class CommunityViewModel @Inject constructor(
    private val repository: CommunityRepository,
    private val apiService: ApiService,
    private val tokenManager: TokenManager
) : ViewModel() {

    val currentUserId: String? get() = tokenManager.userId

    private val _currentFilter = MutableStateFlow("All")
    val currentFilter: StateFlow<String> = _currentFilter.asStateFlow()

    private val _currentTopic = MutableStateFlow<String?>(null)
    val currentTopic: StateFlow<String?> = _currentTopic.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _currentSortBy = MutableStateFlow("recent")
    val currentSortBy: StateFlow<String> = _currentSortBy.asStateFlow()

    private val _trendingTopics = MutableStateFlow<List<String>>(emptyList())
    val trendingTopics: StateFlow<List<String>> = _trendingTopics.asStateFlow()

    private val _refreshTrigger = MutableStateFlow(0)
    
    @OptIn(ExperimentalCoroutinesApi::class, kotlinx.coroutines.FlowPreview::class)
    val pagedQuestions: Flow<PagingData<CommunityQuestion>> = combine(
        _currentFilter,
        _currentTopic,
        _searchQuery.debounce(300L),
        _currentSortBy,
        _refreshTrigger
    ) { filter, topic, search, sortBy, _ ->
        Triple(filter, topic, search to sortBy)
    }.flatMapLatest { (filter, topic, searchSort) ->
        val (search, sortBy) = searchSort
        Pager(
            config = PagingConfig(pageSize = 20, enablePlaceholders = false)
        ) {
            CommunityPagingSource(
                apiService = apiService,
                filter = filter,
                topic = topic,
                search = search.takeIf { it.isNotEmpty() },
                sortBy = sortBy
            )
        }.flow
    }.cachedIn(viewModelScope)

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _selectedQuestion = MutableStateFlow<CommunityQuestion?>(null)
    val selectedQuestion: StateFlow<CommunityQuestion?> = _selectedQuestion.asStateFlow()

    fun setFilter(filter: String) {
        _currentFilter.value = filter
    }

    fun setTopic(topic: String?) {
        _currentTopic.value = topic
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun setSortBy(sortBy: String) {
        _currentSortBy.value = sortBy
    }

    fun fetchTrendingTopics() {
        viewModelScope.launch {
            val result = repository.getTrendingTopics()
            if (result is com.example.swastik.data.repository.Result.Success) {
                // Parse topics from JSON
                val topics = result.data.mapNotNull { it.get("topic")?.asString }
                _trendingTopics.value = topics
            }
        }
    }

    fun fetchQuestions() {
        // Trigger a complete refresh of the Paged flow by incrementing the trigger
        _refreshTrigger.value++
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

    fun askQuestion(title: String, content: String, topic: String?, isAnonymous: Boolean = false, attachments: List<String> = emptyList(), onSuccess: () -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            val result = repository.createQuestion(title, content, topic, isAnonymous, attachments)
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

    private val _localUpvoteUpdates = MutableStateFlow<Map<String, Boolean>>(emptyMap())
    val localUpvoteUpdates: StateFlow<Map<String, Boolean>> = _localUpvoteUpdates.asStateFlow()

    fun hasUpvoted(id: String): Boolean {
        return tokenManager.hasUpvoted(id)
    }

    fun upvoteQuestion(questionId: String) {
        val currentStatus = _localUpvoteUpdates.value[questionId] ?: hasUpvoted(questionId)
        val targetStatus = !currentStatus
        
        // Optimistic UI update for feed
        _localUpvoteUpdates.value = _localUpvoteUpdates.value + (questionId to targetStatus)
        
        viewModelScope.launch {
            val action = if (targetStatus) "upvote" else "remove"
            repository.upvoteQuestion(questionId, action)
            if (targetStatus) {
                tokenManager.addUpvoted(questionId)
            } else {
                tokenManager.removeUpvoted(questionId)
            }
            if (_selectedQuestion.value?.id == questionId) {
                _selectedQuestion.value = _selectedQuestion.value?.let { it.copy(upvotes = it.upvotes + (if (targetStatus) 1 else -1)) }
            }
        }
    }

    fun upvoteAnswer(answerId: String) {
        val currentStatus = hasUpvoted(answerId)
        val targetStatus = !currentStatus
        
        viewModelScope.launch {
            val action = if (targetStatus) "upvote" else "remove"
            repository.upvoteAnswer(answerId, action)
            if (targetStatus) {
                tokenManager.addUpvoted(answerId)
            } else {
                tokenManager.removeUpvoted(answerId)
            }
            _selectedQuestion.value = _selectedQuestion.value?.let { q ->
                val newAnswers = q.answers?.map { a ->
                    if (a.id == answerId) a.copy(upvotes = a.upvotes + (if (targetStatus) 1 else -1)) else a
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

    private val _localBookmarkUpdates = MutableStateFlow<Map<String, Boolean>>(emptyMap())
    val localBookmarkUpdates: StateFlow<Map<String, Boolean>> = _localBookmarkUpdates.asStateFlow()

    fun toggleBookmark(questionId: String, currentStatus: Boolean? = null) {
        val targetStatus = currentStatus?.not() ?: !(_selectedQuestion.value?.isBookmarked ?: false)
        
        // Optimistic UI update
        _localBookmarkUpdates.value = _localBookmarkUpdates.value + (questionId to targetStatus)
        if (_selectedQuestion.value?.id == questionId) {
            _selectedQuestion.value = _selectedQuestion.value?.copy(isBookmarked = targetStatus)
        }

        viewModelScope.launch {
            val result = repository.toggleBookmark(questionId)
            if (result is com.example.swastik.data.repository.Result.Success) {
                // Ensure the server's truth is reflected
                _localBookmarkUpdates.value = _localBookmarkUpdates.value + (questionId to result.data)
                if (_selectedQuestion.value?.id == questionId) {
                    _selectedQuestion.value = _selectedQuestion.value?.copy(isBookmarked = result.data)
                }
                
                val statusMsg = if (result.data) "Question bookmarked" else "Bookmark removed"
                SnackbarManager.showMessage(statusMsg)
            } else if (result is com.example.swastik.data.repository.Result.Error) {
                // Revert on error
                val originalStatus = currentStatus ?: (_selectedQuestion.value?.isBookmarked ?: false)
                _localBookmarkUpdates.value = _localBookmarkUpdates.value + (questionId to originalStatus)
                if (_selectedQuestion.value?.id == questionId) {
                    _selectedQuestion.value = _selectedQuestion.value?.copy(isBookmarked = originalStatus)
                }
                SnackbarManager.showError(result.message ?: "Failed to toggle bookmark")
            }
        }
    }
}
