package com.example.swastik.data.repository.paging

import androidx.paging.PagingSource
import androidx.paging.PagingState
import com.example.swastik.data.model.CommunityQuestion
import com.example.swastik.data.remote.ApiService

class CommunityPagingSource(
    private val apiService: ApiService
) : PagingSource<Int, CommunityQuestion>() {

    override suspend fun load(params: LoadParams<Int>): LoadResult<Int, CommunityQuestion> {
        val page = params.key ?: 1
        return try {
            val response = apiService.getCommunityQuestions(page = page, limit = params.loadSize)
            
            if (response.isSuccessful && response.body() != null) {
                val questions = response.body()!!.questions
                
                LoadResult.Page(
                    data = questions,
                    prevKey = if (page == 1) null else page - 1,
                    nextKey = if (questions.isEmpty() || questions.size < params.loadSize) null else page + 1
                )
            } else {
                LoadResult.Error(Exception(response.message()))
            }
        } catch (e: Exception) {
            LoadResult.Error(e)
        }
    }

    override fun getRefreshKey(state: PagingState<Int, CommunityQuestion>): Int? {
        return state.anchorPosition?.let { anchorPosition ->
            val anchorPage = state.closestPageToPosition(anchorPosition)
            anchorPage?.prevKey?.plus(1) ?: anchorPage?.nextKey?.minus(1)
        }
    }
}
