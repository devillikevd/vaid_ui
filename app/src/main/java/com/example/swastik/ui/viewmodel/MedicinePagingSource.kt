package com.example.swastik.ui.viewmodel

import androidx.paging.PagingSource
import androidx.paging.PagingState
import com.example.swastik.data.model.Medicine
import com.example.swastik.data.repository.MedicineRepository
import retrofit2.HttpException
import java.io.IOException

class MedicinePagingSource(
    private val repository: MedicineRepository
) : PagingSource<Int, Medicine>() {

    override suspend fun load(params: LoadParams<Int>): LoadResult<Int, Medicine> {
        val page = params.key ?: 1
        return try {
            val response = repository.getPopularMedicines(page = page, limit = params.loadSize)
            
            if (response is com.example.swastik.data.repository.Result.Success) {
                val medicines = response.data?.data ?: emptyList()
                val pagination = response.data?.pagination
                val totalPages = pagination?.totalPages ?: 1

                LoadResult.Page(
                    data = medicines,
                    prevKey = if (page == 1) null else page - 1,
                    nextKey = if (page >= totalPages || medicines.isEmpty()) null else page + 1
                )
            } else {
                LoadResult.Error(Exception((response as? com.example.swastik.data.repository.Result.Error)?.message ?: "Failed to load medicines"))
            }
        } catch (exception: IOException) {
            LoadResult.Error(exception)
        } catch (exception: HttpException) {
            LoadResult.Error(exception)
        }
    }

    override fun getRefreshKey(state: PagingState<Int, Medicine>): Int? {
        return state.anchorPosition?.let { anchorPosition ->
            val anchorPage = state.closestPageToPosition(anchorPosition)
            anchorPage?.prevKey?.plus(1) ?: anchorPage?.nextKey?.minus(1)
        }
    }
}
