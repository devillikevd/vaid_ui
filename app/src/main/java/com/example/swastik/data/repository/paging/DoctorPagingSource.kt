package com.example.swastik.data.repository.paging

import androidx.paging.PagingSource
import androidx.paging.PagingState
import com.example.swastik.data.model.Doctor
import com.example.swastik.data.remote.ApiService

class DoctorPagingSource(
    private val apiService: ApiService,
    private val specialization: String?,
    private val search: String?,
    private val hospitalId: String?,
    private val clinicId: String?,
    private val latitude: Double?,
    private val longitude: Double?,
    private val city: String?
) : PagingSource<Int, Doctor>() {

    override suspend fun load(params: LoadParams<Int>): LoadResult<Int, Doctor> {
        val page = params.key ?: 1
        return try {
            val response = apiService.searchDoctors(
                specialization = specialization,
                search = search,
                hospitalId = hospitalId,
                clinicId = clinicId,
                city = city,
                latitude = latitude,
                longitude = longitude,
                page = page
            )
            
            if (response.isSuccessful && response.body() != null) {
                val data = response.body()!!
                
                LoadResult.Page(
                    data = data.data,
                    prevKey = if (page == 1) null else page - 1,
                    nextKey = if (page >= (data.pagination?.totalPages ?: 1)) null else page + 1
                )
            } else {
                LoadResult.Error(Exception(response.message()))
            }
        } catch (e: Exception) {
            LoadResult.Error(e)
        }
    }

    override fun getRefreshKey(state: PagingState<Int, Doctor>): Int? {
        return state.anchorPosition?.let { anchorPosition ->
            val anchorPage = state.closestPageToPosition(anchorPosition)
            anchorPage?.prevKey?.plus(1) ?: anchorPage?.nextKey?.minus(1)
        }
    }
}
