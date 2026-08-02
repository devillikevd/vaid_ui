package com.example.swastik.data.repository.paging

import androidx.paging.PagingSource
import androidx.paging.PagingState
import com.example.swastik.data.model.Doctor
import com.example.swastik.data.repository.DoctorRepository

class DoctorPagingSource(
    private val doctorRepository: DoctorRepository,
    private val specialization: String?,
    private val search: String?,
    private val hospitalId: String?,
    private val clinicId: String?,
    private val latitude: Double? = null,
    private val longitude: Double? = null,
    private val city: String? = null,
    private val global: Boolean? = null,
    private val sortBy: String? = null,
    private val consultationType: String? = null
) : PagingSource<Int, Doctor>() {

    override suspend fun load(params: LoadParams<Int>): LoadResult<Int, Doctor> {
        val page = params.key ?: 1
        return try {
            val result = doctorRepository.searchDoctors(
                specialization = specialization,
                search = search,
                hospitalId = hospitalId,
                clinicId = clinicId,
                city = city,
                latitude = latitude,
                longitude = longitude,
                global = global,
                sortBy = sortBy,
                consultationType = consultationType,
                page = page,
                limit = params.loadSize
            )
            
            when (result) {
                is com.example.swastik.data.repository.Result.Success -> {
                    val data = result.data
                    LoadResult.Page(
                        data = data.data,
                        prevKey = if (page == 1) null else page - 1,
                        nextKey = if (data.pagination == null || page >= (data.pagination.totalPages ?: 1)) null else page + 1
                    )
                }
                is com.example.swastik.data.repository.Result.Error -> {
                    LoadResult.Error(Exception(result.message ?: "Failed to fetch doctors"))
                }
                is com.example.swastik.data.repository.Result.Loading -> {
                    LoadResult.Error(Exception("Unexpected loading state"))
                }
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
