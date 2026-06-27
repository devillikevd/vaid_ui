package com.example.swastik.data.repository.paging

import androidx.paging.PagingSource
import androidx.paging.PagingState
import com.example.swastik.data.model.Appointment
import com.example.swastik.data.repository.AppointmentRepository
import com.example.swastik.data.repository.Result

class AppointmentPagingSource(
    private val repository: AppointmentRepository,
    private val status: String?
) : PagingSource<Int, Appointment>() {

    override suspend fun load(params: LoadParams<Int>): LoadResult<Int, Appointment> {
        val page = params.key ?: 1
        return try {
            when (val result = repository.getAppointments(status = status, page = page)) {
                is Result.Success -> {
                    val appointments = result.data
                    
                    // The backend now sorts history by descending automatically.
                    // For UI display consistency in case of "ALL" or "upcoming", we don't re-sort here 
                    // because we might disrupt the pagination order. We just return as is.
                    
                    LoadResult.Page(
                        data = appointments,
                        prevKey = if (page == 1) null else page - 1,
                        nextKey = if (appointments.size < 20) null else page + 1 // Assuming limit is 20
                    )
                }
                is Result.Error -> {
                    LoadResult.Error(Exception(result.message ?: "Failed to fetch appointments"))
                }
                is Result.Loading -> {
                    LoadResult.Error(Exception("Unexpected loading state"))
                }
            }
        } catch (e: Exception) {
            LoadResult.Error(e)
        }
    }

    override fun getRefreshKey(state: PagingState<Int, Appointment>): Int? {
        return state.anchorPosition?.let { anchorPosition ->
            val anchorPage = state.closestPageToPosition(anchorPosition)
            anchorPage?.prevKey?.plus(1) ?: anchorPage?.nextKey?.minus(1)
        }
    }
}
