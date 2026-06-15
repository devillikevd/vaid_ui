package com.example.swastik.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
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
import dagger.hilt.android.lifecycle.HiltViewModel
import java.util.Locale
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.Job
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

data class MedicineUiState(
    val medicines: List<Medicine> = emptyList(), // Popular/Global
    val nearbyMedicines: List<NearbyMedicineDto> = emptyList(), // Hybrid location-based
    val isLoading: Boolean = false,
    val error: String? = null,
    val searchQuery: String = "",
    val selectedCategory: MedicineCategory? = null
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
    val lastRealtimeUpdate: OrderUpdate? = null
)

@Singleton
class MedicineCartStore @Inject constructor() {
    private val _cartState = MutableStateFlow(CartUiState())
    val cartState: StateFlow<CartUiState> = _cartState.asStateFlow()
    val value: CartUiState get() = _cartState.value

    fun set(state: CartUiState) {
        _cartState.value = state
    }
}

@OptIn(FlowPreview::class)
@HiltViewModel
class MedicineViewModel @Inject constructor(
    private val medicineRepository: MedicineRepository,
    private val locationHelper: LocationHelper,
    private val socketManager: SocketManager,
    private val cartStore: MedicineCartStore
) : ViewModel() {

    private val _uiState = MutableStateFlow(MedicineUiState())
    val uiState: StateFlow<MedicineUiState> = _uiState.asStateFlow()

    private val _detailState = MutableStateFlow(MedicineDetailUiState())
    val detailState: StateFlow<MedicineDetailUiState> = _detailState.asStateFlow()

    val cartState: StateFlow<CartUiState> = cartStore.cartState

    private val _orderHistoryState = MutableStateFlow(OrderHistoryUiState())
    val orderHistoryState: StateFlow<OrderHistoryUiState> = _orderHistoryState.asStateFlow()

    // Expose real-time order updates as a SharedFlow for snackbar/toast in UI
    private val _realtimeOrderEvent = MutableSharedFlow<OrderUpdate>(replay = 0)
    val realtimeOrderEvent: SharedFlow<OrderUpdate> = _realtimeOrderEvent.asSharedFlow()

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

    private fun refreshMedicineDiscovery() {
        val currentQuery = _uiState.value.searchQuery
        if (currentQuery.isBlank()) {
            loadPopularMedicines()
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

    fun loadPopularMedicines() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            // 1. Fetch Global Popular
            var globalMedicines: List<Medicine>? = null
            var errorMsg: String? = null
            when (val result = medicineRepository.getPopularMedicines()) {
                is Result.Success -> globalMedicines = result.data
                is Result.Error -> errorMsg = result.message
                else -> {}
            }

            // 2. Fetch Nearby Inventory (Hybrid)
            var nearbyItems: List<NearbyMedicineDto>? = null
            try {
                val location = locationHelper.getLastLocation()
                if (location != null) {
                    when (val result = medicineRepository.getNearbyMedicines(location.latitude, location.longitude)) {
                        is Result.Success -> nearbyItems = result.data
                        else -> {}
                    }
                }
            } catch (e: Exception) {
                // Ignore location errors
            }

            _uiState.value = _uiState.value.copy(
                medicines = globalMedicines ?: _uiState.value.medicines,
                nearbyMedicines = nearbyItems ?: _uiState.value.nearbyMedicines,
                isLoading = false,
                error = errorMsg
            )
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
        medicine: Medicine,
        pharmacyId: String? = null,
        pharmacyName: String? = null
    ) {
        val cart = cartStore.value
        if (!cart.selectedPharmacyId.isNullOrBlank() && pharmacyId != null && pharmacyId != cart.selectedPharmacyId) {
            cartStore.set(cart.copy(
                pharmacyConflict = PharmacyConflict(pharmacyId, pharmacyName, medicine)
            ))
            return
        }

        val currentItems = cart.items.toMutableList()
        val incomingKey = cartItemKey(medicine)
        val existingIndex = currentItems.indexOfFirst { cartItemKey(it.medicine) == incomingKey }
        if (existingIndex >= 0) {
            currentItems[existingIndex] = currentItems[existingIndex].copy(
                quantity = currentItems[existingIndex].quantity + 1
            )
        } else {
            currentItems.add(CartItem(medicine = medicine, quantity = 1))
        }
        cartStore.set(cart.copy(
            items = currentItems,
            selectedPharmacyId = pharmacyId ?: cart.selectedPharmacyId,
            selectedPharmacyName = pharmacyName ?: cart.selectedPharmacyName,
            pharmacyConflict = null
        ))
    }

    fun resolvePharmacyConflict(clearCartAndAdd: Boolean) {
        val conflict = cartStore.value.pharmacyConflict ?: return
        if (clearCartAndAdd) {
            cartStore.set(CartUiState(
                selectedPharmacyId = conflict.newPharmacyId,
                selectedPharmacyName = conflict.newPharmacyName,
                deliveryAddress = cartStore.value.deliveryAddress
            ))
            addToCart(conflict.medicine, conflict.newPharmacyId, conflict.newPharmacyName)
        } else {
            cartStore.set(cartStore.value.copy(pharmacyConflict = null))
        }
    }

    fun removeFromCart(itemKey: String) {
        cartStore.set(cartStore.value.copy(
            items = cartStore.value.items.filter { cartItemKey(it.medicine) != itemKey }
        ))
    }

    fun updateCartQuantity(itemKey: String, quantity: Int) {
        if (quantity <= 0) {
            removeFromCart(itemKey)
            return
        }
        cartStore.set(cartStore.value.copy(
            items = cartStore.value.items.map {
                if (cartItemKey(it.medicine) == itemKey) it.copy(quantity = quantity) else it
            }
        ))
    }

    fun setDeliveryAddress(address: String) {
        cartStore.set(cartStore.value.copy(deliveryAddress = address))
    }

    fun setPatientPhone(phone: String) {
        cartStore.set(cartStore.value.copy(patientPhone = phone))
    }

    fun setPharmacy(pharmacyId: String, pharmacyName: String) {
        cartStore.set(cartStore.value.copy(
            selectedPharmacyId = pharmacyId,
            selectedPharmacyName = pharmacyName
        ))
    }

    fun placeOrder(context: android.content.Context, prescriptionBitmap: android.graphics.Bitmap?) {
        val cart = cartStore.value
        val isRxOrder = prescriptionBitmap != null
        
        if (cart.selectedPharmacyId.isNullOrBlank() || (!isRxOrder && cart.items.isEmpty()) || cart.deliveryAddress.isBlank() || cart.patientPhone.isBlank()) {
            cartStore.set(cart.copy(orderError = "Please fill in all order details including phone number"))
            return
        }

        cartStore.set(cart.copy(isOrdering = true, orderError = null, orderSuccess = false))
        viewModelScope.launch {
            val request = MedicineOrderRequest(
                pharmacyId = cart.selectedPharmacyId,
                items = cart.items.map {
                    OrderItemRequest(
                        medicineId = it.medicine.id.takeIf { id -> id.isNotBlank() },
                        inventoryItemId = it.medicine.inventoryItemId,
                        name = it.medicine.name,
                        genericName = it.medicine.genericName,
                        quantity = it.quantity
                    )
                },
                deliveryAddress = cart.deliveryAddress,
                patientPhone = cart.patientPhone,
                isPrescriptionOrder = isRxOrder
            )
            when (val result = medicineRepository.createOrder(request)) {
                is Result.Success -> {
                    val orderDto = result.data
                    // If we have a prescription, upload it
                    if (prescriptionBitmap != null) {
                        when (val uploadResult = medicineRepository.uploadPrescription(orderDto.id, prescriptionBitmap, context)) {
                            is Result.Success -> {
                                cartStore.set(cartStore.value.copy(
                                    isOrdering = false,
                                    orderResult = orderDto.copy(prescriptionUrl = uploadResult.data),
                                    orderSuccess = true,
                                    items = emptyList() // Clear cart
                                ))
                            }
                            is Result.Error -> {
                                cartStore.set(cartStore.value.copy(
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
                        cartStore.set(cartStore.value.copy(
                            isOrdering = false,
                            orderResult = orderDto,
                            orderSuccess = true,
                            items = emptyList() // Clear cart
                        ))
                    }
                }
                is Result.Error -> {
                    cartStore.set(cartStore.value.copy(
                        isOrdering = false,
                        orderError = result.message
                    ))
                }
                is Result.Loading -> {}
            }
        }
    }

    fun clearCart() {
        cartStore.set(CartUiState())
    }

    fun clearOrderError() {
        cartStore.set(cartStore.value.copy(orderError = null))
    }

    fun resetOrderSuccess() {
        cartStore.set(cartStore.value.copy(orderSuccess = false, orderResult = null))
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
}
