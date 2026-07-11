package com.example.swastik.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.paging.Pager
import androidx.paging.PagingConfig
import androidx.paging.PagingData
import androidx.paging.cachedIn
import com.example.swastik.data.model.Medicine
import com.example.swastik.data.model.MedicineCategory
import com.example.swastik.data.model.CartItem
import com.example.swastik.data.remote.dto.MedicineAvailabilityDto
import com.example.swastik.data.remote.dto.MedicineOrderRequest
import com.example.swastik.data.remote.dto.MedicineOrderDto
import com.example.swastik.data.remote.dto.NearbyMedicineDto
import com.example.swastik.data.remote.dto.OrderItemRequest
import com.example.swastik.data.repository.Result
import com.example.swastik.data.repository.MedicineRepository
import com.example.swastik.data.remote.OrderUpdate
import com.example.swastik.data.remote.SocketManager
import com.example.swastik.utils.LocationHelper
import com.example.swastik.data.repository.paging.OrderPagingSource
import dagger.hilt.android.lifecycle.HiltViewModel
import java.util.Locale
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton
import android.content.Context
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import dagger.hilt.android.qualifiers.ApplicationContext

data class MedicineUiState(
    val medicines: List<Medicine> = emptyList(), // Popular/Global
    val nearbyMedicines: List<NearbyMedicineDto> = emptyList(), // Hybrid location-based
    val isLoading: Boolean = false,
    val error: String? = null,
    val searchQuery: String = "",
    val selectedCategory: MedicineCategory? = null,
    val favoriteMedicineIds: Set<String> = emptySet()
)

data class MedicineDetailUiState(
    val medicine: Medicine? = null,
    val availability: List<MedicineAvailabilityDto> = emptyList(),
    val alternatives: List<Medicine> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

data class PharmacyConflict(
    val newPharmacyId: String,
    val newPharmacyName: String?,
    val medicine: Medicine
)

data class CartUiState(
    val items: List<CartItem> = emptyList(),
    val selectedPharmacyId: String? = null,
    val selectedPharmacyName: String? = null,
    val deliveryAddress: String = "",
    val patientPhone: String = "",
    val isOrdering: Boolean = false,
    val orderResult: MedicineOrderDto? = null,
    val orderError: String? = null,
    val orderSuccess: Boolean = false,
    val pharmacyConflict: PharmacyConflict? = null
) {
    val totalItems: Int get() = items.sumOf { it.quantity }
    val totalPrice: Float get() = items.sumOf { it.totalPrice.toDouble() }.toFloat()
}

data class OrderHistoryUiState(
    val isLoading: Boolean = false,
    val orders: List<MedicineOrderDto> = emptyList(),
    val selectedOrder: MedicineOrderDto? = null,
    val error: String? = null,
    val filterStatus: String? = null,
    val cancelSuccess: Boolean = false,
    val lastRealtimeUpdate: OrderUpdate? = null,
    val requests: List<com.example.swastik.data.remote.dto.CatalogRequestDto> = emptyList(),
    val requestsLoading: Boolean = false
)

enum class CartType {
    GLOBAL, PHARMACY
}

@Singleton
class MedicineCartStore @Inject constructor() {
    private val _globalCartState = MutableStateFlow(CartUiState(selectedPharmacyId = "GLOBAL_REQUEST", selectedPharmacyName = "Nearby Pharmacies"))
    val globalCartState: StateFlow<CartUiState> = _globalCartState.asStateFlow()

    private val _pharmacyCartState = MutableStateFlow(CartUiState())
    val pharmacyCartState: StateFlow<CartUiState> = _pharmacyCartState.asStateFlow()

    fun getCartState(type: CartType): StateFlow<CartUiState> = 
        if (type == CartType.GLOBAL) globalCartState else pharmacyCartState

    fun getValue(type: CartType): CartUiState = 
        if (type == CartType.GLOBAL) _globalCartState.value else _pharmacyCartState.value

    fun set(type: CartType, state: CartUiState) {
        if (type == CartType.GLOBAL) {
            _globalCartState.value = state
        } else {
            _pharmacyCartState.value = state
        }
    }
}

@Singleton
class FavoriteMedicinesStore @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val prefs = context.getSharedPreferences("favorites_prefs", Context.MODE_PRIVATE)
    private val gson = Gson()
    
    private val _favorites = MutableStateFlow<Set<Medicine>>(loadFavorites())
    val favorites: StateFlow<Set<Medicine>> = _favorites.asStateFlow()

    private fun loadFavorites(): Set<Medicine> {
        val json = prefs.getString("fav_list", null) ?: return emptySet()
        val type = object : TypeToken<List<Medicine>>() {}.type
        return try {
            val list: List<Medicine> = gson.fromJson(json, type)
            list.toSet()
        } catch (e: Exception) {
            emptySet()
        }
    }

    private fun saveFavorites(favs: Set<Medicine>) {
        val json = gson.toJson(favs.toList())
        prefs.edit().putString("fav_list", json).apply()
    }

    fun toggleFavorite(medicine: Medicine) {
        val current = _favorites.value.toMutableSet()
        val existing = current.find { it.id == medicine.id }
        if (existing != null) {
            current.remove(existing)
        } else {
            current.add(medicine)
        }
        _favorites.value = current
        saveFavorites(current)
    }
}

@OptIn(FlowPreview::class)
@HiltViewModel
class MedicineViewModel @Inject constructor(
    private val medicineRepository: MedicineRepository,
    private val locationHelper: LocationHelper,
    private val socketManager: SocketManager,
    private val cartStore: MedicineCartStore,
    private val favoriteStore: FavoriteMedicinesStore
) : ViewModel() {

    private val _uiState = MutableStateFlow(MedicineUiState())
    val uiState: StateFlow<MedicineUiState> = _uiState.asStateFlow()

    private val _detailState = MutableStateFlow(MedicineDetailUiState())
    val detailState: StateFlow<MedicineDetailUiState> = _detailState.asStateFlow()

    val globalCartState: StateFlow<CartUiState> = cartStore.globalCartState
    val pharmacyCartState: StateFlow<CartUiState> = cartStore.pharmacyCartState
    val favoriteMedicines: StateFlow<Set<Medicine>> = favoriteStore.favorites

    private val _orderHistoryState = MutableStateFlow(OrderHistoryUiState())
    val orderHistoryState: StateFlow<OrderHistoryUiState> = _orderHistoryState.asStateFlow()

    // Expose real-time order updates as a SharedFlow for snackbar/toast in UI
    private val _realtimeOrderEvent = MutableSharedFlow<OrderUpdate>(replay = 0)
    val realtimeOrderEvent: SharedFlow<OrderUpdate> = _realtimeOrderEvent.asSharedFlow()

    // Navigation event: emitted when checkout should navigate to cart
    private val _navigateToCart = MutableSharedFlow<Unit>(replay = 0)
    val navigateToCart: SharedFlow<Unit> = _navigateToCart.asSharedFlow()

    private var hasObservedSocketConnection = false

    init {
        loadPopularMedicines()
        collectRealtimeOrderUpdates()
        collectProviderCatalogUpdates()
        observeSocketReconnects()
    }

    /**
     * Collect real-time order status updates from SocketManager.
     * Auto-refreshes the order history list and emits an event for UI notification.
     */
    private fun collectRealtimeOrderUpdates() {
        viewModelScope.launch {
            socketManager.orderUpdates.collect { update ->
                // Update the last realtime update in state
                _orderHistoryState.value = _orderHistoryState.value.copy(
                    lastRealtimeUpdate = update
                )
                // Auto-refresh the order list so status changes appear instantly
                loadOrderHistory(_orderHistoryState.value.filterStatus)
                // Emit event for UI snackbar notification
                _realtimeOrderEvent.emit(update)
            }
        }
    }

    fun getPagedOrders(status: String? = null): Flow<PagingData<MedicineOrderDto>> {
        return Pager(
            config = PagingConfig(pageSize = 20, enablePlaceholders = false),
            pagingSourceFactory = { OrderPagingSource(medicineRepository, status) }
        ).flow.cachedIn(viewModelScope)
    }

    val pagedMedicines: Flow<PagingData<Medicine>> = Pager(
        config = PagingConfig(pageSize = 20, enablePlaceholders = false),
        pagingSourceFactory = { MedicinePagingSource(medicineRepository) }
    ).flow.cachedIn(viewModelScope)

    fun broadcastCartBundle() {
        val type = CartType.GLOBAL
        val cart = cartStore.getValue(type)
        if (cart.items.isEmpty()) return

        if (cart.deliveryAddress.isBlank() || cart.patientPhone.isBlank()) {
            cartStore.set(type, cart.copy(orderError = "Please provide delivery address and phone number"))
            return
        }

        cartStore.set(type, cart.copy(isOrdering = true, orderError = null, orderSuccess = false))
        
        viewModelScope.launch {
            val location = locationHelper.getLastLocation()
            if (location == null) {
                cartStore.set(type, cart.copy(isOrdering = false, orderError = "Location required to broadcast request. Please enable GPS."))
                return@launch
            }
            
            val requestItems = cart.items.map { item ->
                com.example.swastik.data.remote.dto.CatalogRequestItemDto(
                    medicineId = item.medicine.id,
                    quantity = item.quantity
                )
            }

            val request = com.example.swastik.data.remote.dto.CreateCatalogRequestDto(
                items = requestItems,
                latitude = location.latitude,
                longitude = location.longitude,
                deliveryAddress = cart.deliveryAddress,
                patientPhone = cart.patientPhone
            )
            
            val result = medicineRepository.createCatalogRequest(request)
            if (result is Result.Success) {
                cartStore.set(type, cartStore.getValue(type).copy(
                    isOrdering = false,
                    orderSuccess = true,
                    items = emptyList() // Clear cart after successful broadcast
                ))
            } else {
                cartStore.set(type, cartStore.getValue(type).copy(
                    isOrdering = false,
                    orderError = (result as? Result.Error)?.message ?: "Failed to broadcast request"
                ))
            }
        }
    }

    private fun collectProviderCatalogUpdates() {
        viewModelScope.launch {
            socketManager.providerCatalogUpdates.collect {
                refreshMedicineDiscovery()
            }
        }
    }

    private fun observeSocketReconnects() {
        viewModelScope.launch {
            socketManager.connectionState.collect { connected ->
                if (!hasObservedSocketConnection) {
                    hasObservedSocketConnection = true
                    return@collect
                }
                if (connected) {
                    refreshMedicineDiscovery()
                }
            }
        }
    }

    fun refresh() {
        refreshMedicineDiscovery()
    }

    private fun refreshMedicineDiscovery() {
        val currentQuery = _uiState.value.searchQuery
        if (currentQuery.isBlank()) {
            loadPopularMedicines(forceRefresh = true)
        } else {
            searchMedicines(currentQuery)
        }

        val detailMedicineId = _detailState.value.medicine?.id
        if (!detailMedicineId.isNullOrBlank()) {
            viewModelScope.launch {
                loadAvailability(detailMedicineId)
            }
        }
    }

    fun toggleFavorite(medicine: Medicine) {
        favoriteStore.toggleFavorite(medicine)
    }

    fun loadPopularMedicines(forceRefresh: Boolean = false) {
        // Skip redundant reloads if data already exists (e.g. tab switch)
        if (!forceRefresh && _uiState.value.medicines.isNotEmpty() && !_uiState.value.isLoading) {
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            // Fire both requests in PARALLEL using async
            val globalDeferred = async(kotlinx.coroutines.Dispatchers.IO) {
                medicineRepository.getPopularMedicines()
            }
            val nearbyDeferred = async(kotlinx.coroutines.Dispatchers.IO) {
                try {
                    val location = locationHelper.getLastLocation()
                    if (location != null) {
                        medicineRepository.getNearbyMedicines(location.latitude, location.longitude)
                    } else null
                } catch (e: Exception) {
                    null // Ignore location errors
                }
            }

            // Await global catalog first (faster) and show it immediately
            val globalResult = globalDeferred.await()
            var globalMedicines: List<Medicine>? = null
            var errorMsg: String? = null
            when (globalResult) {
                is Result.Success -> globalMedicines = globalResult.data?.data
                is Result.Error -> errorMsg = globalResult.message
                else -> {}
            }

            // Show global results immediately while nearby is still loading
            _uiState.value = _uiState.value.copy(
                medicines = globalMedicines ?: _uiState.value.medicines,
                isLoading = false,
                error = errorMsg
            )

            // Await nearby results and merge in
            val nearbyResult = nearbyDeferred.await()
            var nearbyItems: List<NearbyMedicineDto>? = null
            if (nearbyResult != null) {
                when (nearbyResult) {
                    is Result.Success -> nearbyItems = nearbyResult.data
                    else -> {}
                }
            }
            if (nearbyItems != null) {
                _uiState.value = _uiState.value.copy(
                    nearbyMedicines = nearbyItems
                )
            }
        }
    }

    fun searchMedicines(query: String) {
        _uiState.value = _uiState.value.copy(searchQuery = query)
        if (query.isBlank()) {
            searchJob?.cancel()
            loadPopularMedicines()
            return
        }
        // Cancel previous search and debounce by 350ms
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            kotlinx.coroutines.delay(350)
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = medicineRepository.searchMedicines(query)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        medicines = result.data,
                        isLoading = false
                    )
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = result.message
                    )
                }
                is Result.Loading -> {}
            }
        }
    }

    private var searchJob: Job? = null

    fun setCategory(category: MedicineCategory?) {
        _uiState.value = _uiState.value.copy(selectedCategory = category)
    }

    fun loadMedicineDetail(medicineId: String) {
        viewModelScope.launch {
            _detailState.value = MedicineDetailUiState(isLoading = true)
            when (val result = medicineRepository.getMedicineById(medicineId)) {
                is Result.Success -> {
                    _detailState.value = _detailState.value.copy(
                        medicine = result.data,
                        isLoading = false
                    )
                    // Load availability and alternatives in parallel
                    launch { loadAvailability(medicineId) }
                    launch { loadAlternatives(medicineId) }
                }
                is Result.Error -> {
                    _detailState.value = _detailState.value.copy(
                        isLoading = false,
                        error = result.message
                    )
                }
                is Result.Loading -> {}
            }
        }
    }

    private suspend fun loadAvailability(medicineId: String) {
        // Get user's actual location for nearby pharmacy search
        val location = try { locationHelper.getLastLocation() } catch (_: Exception) { null }
        val lat = location?.latitude ?: return  // Skip availability if no location permission
        val lng = location.longitude

        when (val result = medicineRepository.getMedicineAvailability(medicineId, lat, lng)) {
            is Result.Success -> {
                _detailState.value = _detailState.value.copy(availability = result.data)
            }
            is Result.Error -> { /* Silently handle — non-critical */ }
            is Result.Loading -> {}
        }
    }

    private suspend fun loadAlternatives(medicineId: String) {
        when (val result = medicineRepository.getAlternatives(medicineId)) {
            is Result.Success -> {
                _detailState.value = _detailState.value.copy(alternatives = result.data)
            }
            is Result.Error -> { /* Silently handle — non-critical */ }
            is Result.Loading -> {}
        }
    }

    /**
     * Get filtered medicines based on current state
     */
    fun getFilteredMedicines(): List<Medicine> {
        val state = _uiState.value
        return state.medicines.filter { medicine ->
            state.selectedCategory == null || medicine.matchesSelectedCategory(state.selectedCategory)
        }
    }

    fun getFilteredNearbyMedicines(): List<NearbyMedicineDto> {
        val state = _uiState.value
        return state.nearbyMedicines.filter { nearbyMedicine ->
            nearbyMedicine.inStock &&
                (state.selectedCategory == null || nearbyMedicine.matchesSelectedCategory(state.selectedCategory)) &&
                (state.searchQuery.isBlank() || nearbyMedicine.matchesSearchQuery(state.searchQuery))
        }
    }

    private fun NearbyMedicineDto.matchesSearchQuery(query: String): Boolean {
        val q = query.lowercase(Locale.ROOT).trim()
        if (q.isBlank()) return true
        return name.lowercase(Locale.ROOT).contains(q) ||
               (category?.lowercase(Locale.ROOT)?.contains(q) == true) ||
               (pharmacyName?.lowercase(Locale.ROOT)?.contains(q) == true)
    }

    private fun Medicine.matchesSelectedCategory(category: MedicineCategory): Boolean {
        if (this.category == category) return true
        return matchesCategoryTerms(
            category = category,
            fields = listOf(name, genericName, description, this.category.name)
        )
    }

    private fun NearbyMedicineDto.matchesSelectedCategory(category: MedicineCategory): Boolean {
        if (this.category.equals(category.name, ignoreCase = true)) return true
        return matchesCategoryTerms(
            category = category,
            fields = listOf(name, this.category)
        )
    }

    private fun matchesCategoryTerms(category: MedicineCategory, fields: List<String?>): Boolean {
        val text = fields
            .filterNotNull()
            .joinToString(" ")
            .lowercase(Locale.ROOT)

        if (text.isBlank()) return false

        if (category == MedicineCategory.OTHER) {
            return MedicineCategory.entries
                .filterNot { it == MedicineCategory.OTHER }
                .none { otherCategory -> matchesCategoryTerms(otherCategory, fields) }
        }

        return categorySearchTerms(category).any { term ->
            Regex("\\b${Regex.escape(term.lowercase(Locale.ROOT))}s?\\b").containsMatchIn(text)
        }
    }

    private fun categorySearchTerms(category: MedicineCategory): List<String> {
        return when (category) {
            MedicineCategory.TABLET -> listOf("tablet", "tab", "caplet")
            MedicineCategory.CAPSULE -> listOf("capsule", "cap")
            MedicineCategory.SYRUP -> listOf("syrup", "suspension", "oral liquid")
            MedicineCategory.OINTMENT -> listOf("ointment", "cream", "gel", "lotion")
            MedicineCategory.DROPS -> listOf("drop", "drops")
            MedicineCategory.POWDER -> listOf("powder", "sachet")
            MedicineCategory.INJECTION -> listOf("injection", "inj", "vial")
            MedicineCategory.OTHER -> emptyList()
        }
    }

    // ==================== CART & ORDER ====================

    private fun cartItemKey(medicine: Medicine): String = medicine.inventoryItemId ?: medicine.id

    fun addToCart(
        type: CartType,
        medicine: Medicine,
        pharmacyId: String? = null,
        pharmacyName: String? = null,
        quantity: Int = 1
    ): Boolean {
        val cart = cartStore.getValue(type)
        if (type == CartType.PHARMACY && !cart.selectedPharmacyId.isNullOrBlank() && pharmacyId != null && pharmacyId != cart.selectedPharmacyId) {
            cartStore.set(type, cart.copy(
                pharmacyConflict = PharmacyConflict(pharmacyId, pharmacyName, medicine)
            ))
            return false
        }

        val currentItems = cart.items.toMutableList()
        val incomingKey = cartItemKey(medicine)
        val existingIndex = currentItems.indexOfFirst { cartItemKey(it.medicine) == incomingKey }
        if (existingIndex >= 0) {
            currentItems[existingIndex] = currentItems[existingIndex].copy(
                quantity = currentItems[existingIndex].quantity + quantity
            )
        } else {
            currentItems.add(CartItem(medicine = medicine, quantity = quantity))
        }
        cartStore.set(type, cart.copy(
            items = currentItems,
            selectedPharmacyId = pharmacyId ?: cart.selectedPharmacyId,
            selectedPharmacyName = pharmacyName ?: cart.selectedPharmacyName,
            pharmacyConflict = null
        ))
        return true
    }

    fun resolvePharmacyConflict(clearCartAndAdd: Boolean) {
        val cart = cartStore.getValue(CartType.PHARMACY)
        val conflict = cart.pharmacyConflict ?: return
        if (clearCartAndAdd) {
            cartStore.set(CartType.PHARMACY, CartUiState(
                selectedPharmacyId = conflict.newPharmacyId,
                selectedPharmacyName = conflict.newPharmacyName,
                deliveryAddress = cart.deliveryAddress
            ))
            addToCart(CartType.PHARMACY, conflict.medicine, conflict.newPharmacyId, conflict.newPharmacyName)
        } else {
            cartStore.set(CartType.PHARMACY, cart.copy(pharmacyConflict = null))
        }
    }

    fun removeFromCart(type: CartType, itemKey: String) {
        val cart = cartStore.getValue(type)
        cartStore.set(type, cart.copy(
            items = cart.items.filter { cartItemKey(it.medicine) != itemKey }
        ))
    }

    fun updateCartQuantity(type: CartType, itemKey: String, quantity: Int) {
        if (quantity <= 0) {
            removeFromCart(type, itemKey)
            return
        }
        val cart = cartStore.getValue(type)
        cartStore.set(type, cart.copy(
            items = cart.items.map {
                if (cartItemKey(it.medicine) == itemKey) it.copy(quantity = quantity) else it
            }
        ))
    }

    fun setDeliveryAddress(type: CartType, address: String) {
        val cart = cartStore.getValue(type)
        cartStore.set(type, cart.copy(deliveryAddress = address))
    }

    fun setPatientPhone(type: CartType, phone: String) {
        val cart = cartStore.getValue(type)
        cartStore.set(type, cart.copy(patientPhone = phone))
    }

    fun setPharmacy(type: CartType, pharmacyId: String, pharmacyName: String) {
        val cart = cartStore.getValue(type)
        cartStore.set(type, cart.copy(
            selectedPharmacyId = pharmacyId,
            selectedPharmacyName = pharmacyName
        ))
    }

    fun placeOrder(type: CartType, context: android.content.Context, prescriptionBitmap: android.graphics.Bitmap?) {
        val cart = cartStore.getValue(type)
        val isRxOrder = prescriptionBitmap != null
        
        if (cart.selectedPharmacyId.isNullOrBlank() || (!isRxOrder && cart.items.isEmpty()) || cart.deliveryAddress.isBlank() || cart.patientPhone.isBlank()) {
            cartStore.set(type, cart.copy(orderError = "Please fill in all order details including phone number"))
            return
        }

        cartStore.set(type, cart.copy(isOrdering = true, orderError = null, orderSuccess = false))
        viewModelScope.launch {
            val request = MedicineOrderRequest(
                pharmacyId = cart.selectedPharmacyId,
                items = cart.items.map {
                    OrderItemRequest(
                        medicineId = it.medicine.id.takeIf { id -> id.isNotBlank() },
                        inventoryItemId = it.medicine.inventoryItemId,
                        name = it.medicine.name,
                        genericName = it.medicine.genericName,
                        quantity = it.quantity,
                        price = it.medicine.price
                    )
                },
                deliveryAddress = cart.deliveryAddress,
                patientPhone = cart.patientPhone,
                isPrescriptionOrder = isRxOrder,
                isCatalogOrder = cart.items.any { it.medicine.inventoryItemId == null && it.medicine.id.isNotBlank() }
            )
            when (val result = medicineRepository.createOrder(request)) {
                is Result.Success -> {
                    val orderDto = result.data
                    // If we have a prescription, upload it
                    if (prescriptionBitmap != null) {
                        when (val uploadResult = medicineRepository.uploadPrescription(orderDto.id, prescriptionBitmap, context)) {
                            is Result.Success -> {
                                cartStore.set(type, cartStore.getValue(type).copy(
                                    isOrdering = false,
                                    orderResult = orderDto.copy(prescriptionUrl = uploadResult.data),
                                    orderSuccess = true,
                                    items = emptyList() // Clear cart
                                ))
                            }
                            is Result.Error -> {
                                cartStore.set(type, cartStore.getValue(type).copy(
                                    isOrdering = false,
                                    orderError = "Order created but failed to upload prescription: ${uploadResult.message}",
                                    orderResult = orderDto,
                                    orderSuccess = true, // Partially success
                                    items = emptyList() // Clear cart
                                ))
                            }
                            else -> {}
                        }
                    } else {
                        cartStore.set(type, cartStore.getValue(type).copy(
                            isOrdering = false,
                            orderResult = orderDto,
                            orderSuccess = true,
                            items = emptyList() // Clear cart
                        ))
                    }
                }
                is Result.Error -> {
                    cartStore.set(type, cartStore.getValue(type).copy(
                        isOrdering = false,
                        orderError = result.message
                    ))
                }
                is Result.Loading -> {}
            }
        }
    }

    fun clearCart(type: CartType) {
        val defaultState = if (type == CartType.GLOBAL) CartUiState(selectedPharmacyId = "GLOBAL_REQUEST", selectedPharmacyName = "Nearby Pharmacies") else CartUiState()
        cartStore.set(type, defaultState)
    }

    fun clearOrderError(type: CartType) {
        cartStore.set(type, cartStore.getValue(type).copy(orderError = null))
    }

    fun resetOrderSuccess(type: CartType) {
        cartStore.set(type, cartStore.getValue(type).copy(orderSuccess = false, orderResult = null))
    }

    // ==================== ORDER HISTORY ====================

    fun loadOrderHistory(status: String? = null) {
        _orderHistoryState.value = _orderHistoryState.value.copy(isLoading = true, error = null, filterStatus = status)
        viewModelScope.launch {
            when (val result = medicineRepository.getMyOrders(status = status)) {
                is Result.Success -> {
                    _orderHistoryState.value = _orderHistoryState.value.copy(
                        isLoading = false,
                        orders = result.data
                    )
                }
                is Result.Error -> {
                    _orderHistoryState.value = _orderHistoryState.value.copy(
                        isLoading = false,
                        error = result.message
                    )
                }
                is Result.Loading -> {}
            }
        }
    }

    fun cancelOrder(orderId: String) {
        _orderHistoryState.value = _orderHistoryState.value.copy(isLoading = true, error = null, cancelSuccess = false)
        viewModelScope.launch {
            when (val result = medicineRepository.cancelOrder(orderId)) {
                is Result.Success -> {
                    _orderHistoryState.value = _orderHistoryState.value.copy(
                        isLoading = false,
                        cancelSuccess = true
                    )
                    loadOrderHistory(_orderHistoryState.value.filterStatus) // Refresh
                }
                is Result.Error -> {
                    _orderHistoryState.value = _orderHistoryState.value.copy(
                        isLoading = false,
                        error = result.message
                    )
                }
                is Result.Loading -> {}
            }
        }
    }

    fun clearOrderHistoryError() {
        _orderHistoryState.value = _orderHistoryState.value.copy(error = null, cancelSuccess = false)
    }

    // ==================== CATALOG REQUESTS ====================

    fun loadCatalogRequests() {
        _orderHistoryState.value = _orderHistoryState.value.copy(requestsLoading = true, error = null)
        viewModelScope.launch {
            when (val result = medicineRepository.getPatientCatalogRequests()) {
                is Result.Success -> {
                    _orderHistoryState.value = _orderHistoryState.value.copy(
                        requestsLoading = false,
                        requests = result.data
                    )
                }
                is Result.Error -> {
                    _orderHistoryState.value = _orderHistoryState.value.copy(
                        requestsLoading = false,
                        error = result.message
                    )
                }
                is Result.Loading -> {}
            }
        }
    }

    fun cancelCatalogRequest(requestId: String) {
        viewModelScope.launch {
            _orderHistoryState.value = _orderHistoryState.value.copy(requestsLoading = true, error = null)
            when (val result = medicineRepository.cancelCatalogRequest(requestId)) {
                is Result.Success -> {
                    // Update the list by replacing the cancelled request
                    val updatedRequests = _orderHistoryState.value.requests.map { 
                        if (it.id == requestId) result.data else it 
                    }
                    _orderHistoryState.value = _orderHistoryState.value.copy(
                        requestsLoading = false,
                        requests = updatedRequests
                    )
                }
                is Result.Error -> {
                    _orderHistoryState.value = _orderHistoryState.value.copy(
                        requestsLoading = false,
                        error = result.message
                    )
                }
                is Result.Loading -> {}
            }
        }
    }

    fun proceedToCheckoutWithRequest(request: com.example.swastik.data.remote.dto.CatalogRequestDto) {
        if (request.status != "accepted" || request.acceptedPharmacyId == null || request.acceptedTotalPrice == null) return
        
        viewModelScope.launch {
            _orderHistoryState.value = _orderHistoryState.value.copy(isLoading = true)
            
            // Filter out delivery_info metadata entries — only process real medicine items
            val medicineItems = request.items?.filter { !it.medicineId.isNullOrBlank() } ?: emptyList()
            if (medicineItems.isEmpty()) {
                _orderHistoryState.value = _orderHistoryState.value.copy(isLoading = false, error = "No medicines found in this request")
                return@launch
            }
            
            // Distribute the accepted total price proportionally across items based on their MRP
            val totalMrp = medicineItems.sumOf { ((it.mrp ?: 0.0) * it.quantity) }
            val acceptedTotal = request.acceptedTotalPrice
            
            // Clear existing cart first to avoid conflicts
            clearCart(CartType.PHARMACY)
            
            medicineItems.forEach { item ->
                val mrp = item.mrp ?: 0.0
                // Calculate proportional price per unit
                val itemTotalPrice = if (totalMrp > 0) {
                    (mrp * item.quantity / totalMrp) * acceptedTotal
                } else {
                    acceptedTotal / medicineItems.size
                }
                val unitPrice = (itemTotalPrice / item.quantity).toFloat()
                
                // Construct Medicine object for cart
                val customMedicine = com.example.swastik.data.model.Medicine(
                    id = item.medicineId ?: "",
                    name = item.name ?: "Medicine",
                    genericName = item.genericName ?: "",
                    manufacturer = "",
                    price = unitPrice,
                    requiresPrescription = false,
                    description = "",
                    category = com.example.swastik.data.model.MedicineCategory.TABLET,
                    nearbyPharmacyId = request.acceptedPharmacyId,
                    nearbyPharmacy = request.pharmacy?.name
                )
                
                addToCart(
                    type = CartType.PHARMACY,
                    medicine = customMedicine, 
                    pharmacyId = request.acceptedPharmacyId, 
                    pharmacyName = request.pharmacy?.name ?: "Pharmacy",
                    quantity = item.quantity
                )
            }
            
            _orderHistoryState.value = _orderHistoryState.value.copy(isLoading = false)
            // Emit navigation event to go to the cart screen
            _navigateToCart.emit(Unit)
        }
    }
}
