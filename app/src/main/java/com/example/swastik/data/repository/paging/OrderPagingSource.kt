package com.example.swastik.data.repository.paging

import androidx.paging.PagingSource
import androidx.paging.PagingState
import com.example.swastik.data.remote.dto.MedicineOrderDto
import com.example.swastik.data.repository.MedicineRepository
import com.example.swastik.data.repository.Result

class OrderPagingSource(
    private val repository: MedicineRepository,
    private val status: String?
) : PagingSource<Int, MedicineOrderDto>() {

    override suspend fun load(params: LoadParams<Int>): LoadResult<Int, MedicineOrderDto> {
        val page = params.key ?: 1
        return try {
            when (val result = repository.getMyOrders(status = status, page = page)) {
                is Result.Success -> {
                    val orders = result.data
                    LoadResult.Page(
                        data = orders,
                        prevKey = if (page == 1) null else page - 1,
                        nextKey = if (orders.size < 20) null else page + 1 // Assuming default limit is 20
                    )
                }
                is Result.Error -> {
                    LoadResult.Error(Exception(result.message ?: "Failed to fetch orders"))
                }
                is Result.Loading -> {
                    LoadResult.Error(Exception("Unexpected loading state"))
                }
            }
        } catch (e: Exception) {
            LoadResult.Error(e)
        }
    }

    override fun getRefreshKey(state: PagingState<Int, MedicineOrderDto>): Int? {
        return state.anchorPosition?.let { anchorPosition ->
            val anchorPage = state.closestPageToPosition(anchorPosition)
            anchorPage?.prevKey?.plus(1) ?: anchorPage?.nextKey?.minus(1)
        }
    }
}
