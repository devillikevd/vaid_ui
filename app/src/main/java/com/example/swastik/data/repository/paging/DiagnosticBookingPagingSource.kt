package com.example.swastik.data.repository.paging

import androidx.paging.PagingSource
import androidx.paging.PagingState
import com.example.swastik.data.remote.dto.DiagnosticBookingDto
import com.example.swastik.data.repository.DiagnosticRepository
import com.example.swastik.data.repository.Result

class DiagnosticBookingPagingSource(
    private val repository: DiagnosticRepository,
    private val status: String?
) : PagingSource<Int, DiagnosticBookingDto>() {

    override suspend fun load(params: LoadParams<Int>): LoadResult<Int, DiagnosticBookingDto> {
        val page = params.key ?: 1
        return try {
            when (val result = repository.getMyBookings(status = status, page = page)) {
                is Result.Success -> {
                    val bookings = result.data
                    LoadResult.Page(
                        data = bookings,
                        prevKey = if (page == 1) null else page - 1,
                        nextKey = if (bookings.size < 20) null else page + 1 // Assuming default limit is 20
                    )
                }
                is Result.Error -> {
                    LoadResult.Error(Exception(result.message ?: "Failed to fetch bookings"))
                }
                is Result.Loading -> {
                    LoadResult.Error(Exception("Unexpected loading state"))
                }
            }
        } catch (e: Exception) {
            LoadResult.Error(e)
        }
    }

    override fun getRefreshKey(state: PagingState<Int, DiagnosticBookingDto>): Int? {
        return state.anchorPosition?.let { anchorPosition ->
            val anchorPage = state.closestPageToPosition(anchorPosition)
            anchorPage?.prevKey?.plus(1) ?: anchorPage?.nextKey?.minus(1)
        }
    }
}
