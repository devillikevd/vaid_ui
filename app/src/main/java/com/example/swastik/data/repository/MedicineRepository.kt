package com.example.swastik.data.repository

import android.util.Log
import com.example.swastik.data.model.Medicine
import com.example.swastik.data.model.MedicineCategory
import com.example.swastik.data.remote.ApiService
import com.example.swastik.data.remote.dto.*
import com.example.swastik.data.local.db.MedicineDao
import com.example.swastik.data.local.db.CachedMedicine
import okhttp3.ResponseBody
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody

/**
 * Repository for Medicine data with Room caching.
 * Network-first for searches, cache fallback on failure.
 * Popular medicines and search results are cached for 30 min.
 */
@Singleton
class MedicineRepository @Inject constructor(
    private val apiService: ApiService,
    private val medicineDao: MedicineDao
) {

    companion object {
        private const val TAG = "MedicineRepository"
        private const val CACHE_DURATION_MS = 30 * 60 * 1000L // 30 minutes
        private const val PAGE_SIZE = 50
    }

    private fun parseApiErrorMessage(errorBody: ResponseBody?): String? {
        return try {
            val raw = errorBody?.string()?.trim().orEmpty()
            if (raw.isBlank()) return null
            val json = JSONObject(raw)
            json.optString("message").ifBlank { null }
                ?: json.optString("error").ifBlank { null }
        } catch (_: Exception) {
            null
        }
    }

    /**
     * Search medicines — network-first with cache fallback.
     */
    suspend fun searchMedicines(query: String, category: String? = null, page: Int = 1): Result<List<Medicine>> {
        // Try network first
        try {
            val response = apiService.searchMedicines(query = query, category = category, page = page)
            if (response.isSuccessful && response.body()?.success == true) {
                val medicines = response.body()?.data ?: emptyList()
                // Cache search results (page 1)
                if (page == 1 && medicines.isNotEmpty()) {
                    try {
                        val cached = medicines.map { it.toCachedMedicine() }
                        medicineDao.deleteStaleCache(System.currentTimeMillis() - CACHE_DURATION_MS)
                        medicineDao.insertMedicines(cached)
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to cache medicines: ${e.message}")
                    }
                }
                return Result.Success(medicines)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Network error, falling back to cache: ${e.message}")
        }

        // Fallback to cache
        return try {
            val cached = if (query.isNotBlank()) {
                medicineDao.searchMedicinesSync(query)
            } else {
                medicineDao.getAllMedicinesSync()
            }
            if (cached.isNotEmpty()) {
                Result.Success(cached.map { it.toDomainMedicine() })
            } else {
                Result.Error("No internet connection and no cached medicines")
            }
        } catch (e: Exception) {
            Result.Error("Network error and cache unavailable")
        }
    }

    /**
     * Get medicine categories from backend.
     */
    suspend fun getCategories(): Result<List<MedicineCategoryDto>> {
        return try {
            val response = apiService.getMedicineCategories()
            if (response.isSuccessful && response.body()?.success == true) {
                val categories = response.body()?.data ?: emptyList()
                Result.Success(categories)
            } else {
                Result.Error("Failed to load categories")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    /**
     * Get popular medicines — network-first with cache fallback.
     */
    suspend fun getPopularMedicines(page: Int = 1, limit: Int = 20): Result<com.example.swastik.data.remote.dto.PaginatedResponse<Medicine>> {
        // Try network first
        try {
            val response = apiService.getPopularMedicines(page, limit)
            if (response.isSuccessful && response.body()?.success == true) {
                val paginatedResponse = response.body()!!
                val medicines = paginatedResponse.data
                // Cache popular medicines
                if (page == 1 && medicines.isNotEmpty()) {
                    try {
                        medicineDao.deleteStaleCache(System.currentTimeMillis() - CACHE_DURATION_MS)
                        val cached = medicines.map { it.toCachedMedicine() }
                        medicineDao.insertMedicines(cached)
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to cache popular medicines: ${e.message}")
                    }
                }
                return Result.Success(paginatedResponse)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Popular medicines network failed, using cache: ${e.message}")
        }

        // Fallback to cache (ignores pagination since offline)
        return try {
            val cached = medicineDao.getAllMedicinesSync()
            if (cached.isNotEmpty()) {
                val medicines = cached.map { it.toDomainMedicine() }
                val pagination = com.example.swastik.data.remote.dto.PaginationDto(page = 1, limit = cached.size, total = cached.size, totalPages = 1)
                Result.Success(com.example.swastik.data.remote.dto.PaginatedResponse(success = true, data = medicines, pagination = pagination))
            } else {
                Result.Error("No internet and no cached medicines")
            }
        } catch (e: Exception) {
            Result.Error("Failed to load popular medicines")
        }
    }
    
    suspend fun createCatalogRequest(request: com.example.swastik.data.remote.dto.CreateCatalogRequestDto): Result<com.example.swastik.data.remote.dto.CatalogRequestDto> {
        return try {
            val response = apiService.createCatalogRequest(request)
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(response.body()!!.data!!)
            } else {
                val errorMsg = parseApiErrorMessage(response.errorBody())
                Result.Error(errorMsg ?: "Failed to create request")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    suspend fun getPatientCatalogRequests(): Result<List<com.example.swastik.data.remote.dto.CatalogRequestDto>> {
        return try {
            val response = apiService.getPatientCatalogRequests()
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(response.body()!!.data ?: emptyList())
            } else {
                Result.Error("Failed to fetch requests")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    suspend fun cancelCatalogRequest(requestId: String): Result<com.example.swastik.data.remote.dto.CatalogRequestDto> {
        return try {
            val response = apiService.cancelCatalogRequest(requestId)
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let {
                    Result.Success(it)
                } ?: Result.Error("Failed to cancel request")
            } else {
                Result.Error(parseApiErrorMessage(response.errorBody()) ?: response.body()?.message ?: "Cannot cancel request")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    /**
     * Get nearby medicines from local pharmacies based on geolocation.
     */
    suspend fun getNearbyMedicines(latitude: Double, longitude: Double): Result<List<NearbyMedicineDto>> {
        return try {
            val response = apiService.getNearbyMedicines(latitude = latitude, longitude = longitude)
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(response.body()?.data ?: emptyList())
            } else {
                Result.Error("Failed to load nearby medicines")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    /**
     * Get medicine details by ID — network-first with cache fallback.
     */
    suspend fun getMedicineById(id: String): Result<Medicine> {
        // Try network first
        try {
            val response = apiService.getMedicineDetails(id)
            if (response.isSuccessful && response.body()?.success == true) {
                return response.body()?.data?.let {
                    val enriched = try {
                        enrichWithCampaignPrices(listOf(it)).first()
                    } catch (e: Exception) {
                        Log.w(TAG, "Campaign enrichment (detail) failed: ${e.message}")
                        it
                    }
                    // Cache this medicine
                    try { medicineDao.insertMedicines(listOf(enriched.toCachedMedicine())) } catch (_: Exception) {}
                    Result.Success(enriched)
                } ?: Result.Error("Medicine not found")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Medicine detail network failed, using cache: ${e.message}")
        }

        // Fallback to cache
        return try {
            val cached = medicineDao.getMedicineById(id)
            if (cached != null) {
                Result.Success(cached.toDomainMedicine())
            } else {
                Result.Error("Medicine not found offline")
            }
        } catch (e: Exception) {
            Result.Error("Failed to load medicine details")
        }
    }

    /**
     * Get medicine availability at nearby pharmacies — always network (real-time).
     */
    suspend fun getMedicineAvailability(medicineId: String, latitude: Double = 0.0, longitude: Double = 0.0): Result<List<MedicineAvailabilityDto>> {
        return try {
            val response = apiService.getMedicineAvailability(medicineId, latitude, longitude)
            if (response.isSuccessful && response.body()?.success == true) {
                val availability = response.body()?.data ?: emptyList()
                Result.Success(availability)
            } else {
                Result.Error("Failed to load availability")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    /**
     * Get alternative medicines.
     */
    suspend fun getAlternatives(medicineId: String): Result<List<Medicine>> {
        return try {
            val response = apiService.getMedicineAlternatives(medicineId)
            if (response.isSuccessful && response.body()?.success == true) {
                val alternatives = response.body()?.data ?: emptyList()
                // Cache alternatives too
                if (alternatives.isNotEmpty()) {
                    try { medicineDao.insertMedicines(alternatives.map { it.toCachedMedicine() }) } catch (_: Exception) {}
                }
                Result.Success(alternatives)
            } else {
                Result.Error("Failed to load alternatives")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    /**
     * Create a medicine order at a pharmacy — always network.
     */
    suspend fun createOrder(request: MedicineOrderRequest): Result<MedicineOrderDto> {
        return try {
            val response = apiService.createMedicineOrder(request)
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let {
                    Result.Success(it)
                } ?: Result.Error("Failed to create order")
            } else {
                Result.Error(parseApiErrorMessage(response.errorBody()) ?: response.body()?.message ?: "Order failed")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    /**
     * Upload a prescription image for an order.
     */
    suspend fun uploadPrescription(orderId: String, bitmap: android.graphics.Bitmap, context: android.content.Context): Result<String> {
        return try {
            // Save bitmap to temporary file
            val file = java.io.File(context.cacheDir, "prescription_${System.currentTimeMillis()}.jpg")
            val outputStream = java.io.FileOutputStream(file)
            bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 80, outputStream)
            outputStream.flush()
            outputStream.close()

            val mediaTypeImage = "image/jpeg".toMediaTypeOrNull()
            val requestFile = file.asRequestBody(mediaTypeImage)
            val body = okhttp3.MultipartBody.Part.createFormData("prescription", file.name, requestFile)
            val mediaTypeText = "text/plain".toMediaTypeOrNull()
            val orderIdBody = orderId.toRequestBody(mediaTypeText)

            val response = apiService.uploadPrescription(body, orderIdBody)
            
            // Clean up temporary file
            if (file.exists()) {
                file.delete()
            }

            if (response.isSuccessful && response.body()?.success == true) {
                // The API actually returns success: true, message: "...", data: null usually, but maybe it has a URL?
                // For now, if successful, return true
                Result.Success("Success")
            } else {
                Result.Error("Failed to upload prescription")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error during upload")
        }
    }

    /**
     * Get patient's order history — always network (orders change frequently).
     */
    suspend fun getMyOrders(status: String? = null, page: Int = 1): Result<List<MedicineOrderDto>> {
        return try {
            val response = apiService.getMyOrders(status = status, page = page, limit = 20)
            if (!response.isSuccessful || response.body()?.success != true) {
                val message = parseApiErrorMessage(response.errorBody()) ?: "Failed to load orders"
                return Result.Error(message)
            }

            val body = response.body()
            val pageData = body?.data.orEmpty()
            
            Result.Success(pageData)
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    /**
     * Get single order details.
     */
    suspend fun getOrderById(orderId: String): Result<MedicineOrderDto> {
        return try {
            val response = apiService.getOrderById(orderId)
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let {
                    Result.Success(it)
                } ?: Result.Error("Order not found")
            } else {
                Result.Error(parseApiErrorMessage(response.errorBody()) ?: response.body()?.message ?: "Failed to load order")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    /**
     * Cancel an order.
     */
    suspend fun cancelOrder(orderId: String): Result<MedicineOrderDto> {
        return try {
            val response = apiService.cancelOrder(orderId)
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let {
                    Result.Success(it)
                } ?: Result.Error("Failed to cancel order")
            } else {
                Result.Error(parseApiErrorMessage(response.errorBody()) ?: response.body()?.message ?: "Cannot cancel order")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    // ==================== Cache Mapping Extensions ====================

    /**
     * Enrich a list of medicines with active campaign prices from the backend.
     * Best-effort: if the campaign call fails, returns the original list unchanged.
     */
    suspend fun enrichWithCampaignPrices(
        medicines: List<Medicine>,
        pharmacyId: String? = null,
        latitude: Double? = null,
        longitude: Double? = null
    ): List<Medicine> {
        if (medicines.isEmpty()) return medicines
        val medicineIds = medicines.map { it.id }.distinct()
        return try {
            val response = apiService.getBestCampaignPrices(
                com.example.swastik.data.remote.dto.CampaignPriceRequestDto(
                    medicineIds = medicineIds,
                    pharmacyId = pharmacyId,
                    latitude = latitude,
                    longitude = longitude
                )
            )
            if (response.isSuccessful && response.body()?.success == true) {
                val prices = response.body()?.data ?: emptyList()
                val priceByMedicineId = prices.associateBy { it.medicineId }
                medicines.map { med ->
                    val match = priceByMedicineId[med.id]
                    if (match != null && match.finalPrice < (med.price ?: 0f)) {
                        med.copy(
                            campaignPrice = match.finalPrice,
                            campaignDiscountPct = match.discountPercentage,
                            campaignId = match.campaign?.id,
                            campaignName = match.campaign?.name
                        )
                    } else med
                }
            } else {
                medicines
            }
        } catch (e: Exception) {
            Log.w(TAG, "Campaign price enrichment failed: ${e.message}")
            medicines
        }
    }

    /**
     * Enrich pharmacy inventory items with campaign prices for a specific pharmacy.
     * Best-effort: returns original list on failure.
     */
    suspend fun enrichInventoryWithCampaignPrices(
        items: List<com.example.swastik.data.remote.dto.PharmacyInventoryItemDto>,
        pharmacyId: String
    ): List<com.example.swastik.data.remote.dto.PharmacyInventoryItemDto> {
        if (items.isEmpty()) return items
        val medicineIds = items.mapNotNull { it.medicineId }.distinct()
        if (medicineIds.isEmpty()) return items
        return try {
            val response = apiService.getBestCampaignPrices(
                com.example.swastik.data.remote.dto.CampaignPriceRequestDto(
                    medicineIds = medicineIds,
                    pharmacyId = pharmacyId
                )
            )
            if (response.isSuccessful && response.body()?.success == true) {
                val prices = response.body()?.data ?: emptyList()
                val priceByMedicineId = prices.associateBy { it.medicineId }
                items.map { item ->
                    val medicineId = item.medicineId ?: return@map item
                    val match = priceByMedicineId[medicineId]
                    if (match != null && match.finalPrice < (item.price ?: 0f)) {
                        item.copy(
                            campaignPrice = match.finalPrice,
                            campaignDiscountPct = match.discountPercentage,
                            campaignId = match.campaign?.id,
                            campaignName = match.campaign?.name
                        )
                    } else item
                }
            } else {
                items
            }
        } catch (e: Exception) {
            Log.w(TAG, "Campaign price enrichment (inventory) failed: ${e.message}")
            items
        }
    }

    private fun Medicine.toCachedMedicine() = CachedMedicine(
        id = id,
        name = name,
        genericName = genericName,
        manufacturer = manufacturer,
        price = price?.toDouble(),
        mrp = mrp?.toDouble(),
        category = therapeuticCategory ?: dosageForm ?: category.name,
        description = description,
        requiresPrescription = requiresPrescription,
        imageUrl = imageUrl,
        campaignPrice = campaignPrice?.toDouble(),
        campaignDiscountPct = campaignDiscountPct?.toDouble(),
        campaignId = campaignId,
        campaignName = campaignName
    )

    private fun CachedMedicine.toDomainMedicine() = Medicine(
        id = id,
        name = name,
        genericName = genericName,
        manufacturer = manufacturer,
        price = price?.toFloat(),
        mrp = mrp?.toFloat(),
        requiresPrescription = requiresPrescription,
        category = try { MedicineCategory.valueOf(category) } catch (_: Exception) { MedicineCategory.TABLET },
        therapeuticCategory = category,
        description = description,
        inStock = true,
        stockCount = 0,
        nearbyPharmacy = null,
        pharmacyDistance = null,
        imageUrl = imageUrl,
        campaignPrice = campaignPrice?.toFloat(),
        campaignDiscountPct = campaignDiscountPct?.toFloat(),
        campaignId = campaignId,
        campaignName = campaignName
    )
}
