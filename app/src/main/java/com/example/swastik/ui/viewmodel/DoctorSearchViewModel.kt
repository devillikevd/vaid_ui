package com.example.swastik.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.swastik.data.model.*
import com.example.swastik.data.remote.dto.*
import com.example.swastik.data.repository.Result
import com.example.swastik.data.repository.DoctorRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * UI State for Doctor Search
 */
data class DoctorSearchUiState(
    val isLoading: Boolean = false,
    val doctors: List<Doctor> = emptyList(),
    val selectedDoctor: DoctorDetails? = null,
    val availableSlots: SlotsResponse? = null,
    val error: String? = null,
    val hasMore: Boolean = true,
    val currentPage: Int = 1
)

/**
 * Filter options for doctor search
 */
data class DoctorSearchFilters(
    val specialization: String? = null,
    val search: String? = null,
    val hospitalId: String? = null,
    val clinicId: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val city: String? = null
)

/**
 * Doctor Search ViewModel
 */
@HiltViewModel
class DoctorSearchViewModel @Inject constructor(
    private val doctorRepository: DoctorRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(DoctorSearchUiState())
    val uiState: StateFlow<DoctorSearchUiState> = _uiState.asStateFlow()

    private val _filters = MutableStateFlow(DoctorSearchFilters())
    val filters: StateFlow<DoctorSearchFilters> = _filters.asStateFlow()

    private val _selectedDate = MutableStateFlow("")
    val selectedDate: StateFlow<String> = _selectedDate.asStateFlow()

    /**
     * Search doctors with current filters
     */
    fun searchDoctors(resetList: Boolean = false) {
        viewModelScope.launch {
            if (resetList) {
                _uiState.value = _uiState.value.copy(
                    isLoading = true,
                    doctors = emptyList(),
                    currentPage = 1,
                    hasMore = true,
                    error = null
                )
            } else {
                _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            }

            val page = if (resetList) 1 else _uiState.value.currentPage
            val currentFilters = _filters.value

            when (val result = doctorRepository.searchDoctors(
                specialization = currentFilters.specialization,
                search = currentFilters.search,
                hospitalId = currentFilters.hospitalId,
                clinicId = currentFilters.clinicId,
                page = page,
                latitude = currentFilters.latitude,
                longitude = currentFilters.longitude,
                city = currentFilters.city
            )) {
                is Result.Success -> {
                    val newDoctors = if (resetList) {
                        result.data.data
                    } else {
                        _uiState.value.doctors + result.data.data
                    }
                    
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        doctors = newDoctors,
                        currentPage = page + 1,
                        hasMore = result.data.pagination?.let { pagination ->
                            page < pagination.totalPages
                        } ?: result.data.data.isNotEmpty()
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

    /**
     * Load more doctors (pagination)
     */
    fun loadMore() {
        if (!_uiState.value.isLoading && _uiState.value.hasMore) {
            searchDoctors(resetList = false)
        }
    }

    /**
     * Update search filters
     */
    fun updateFilters(
        specialization: String? = _filters.value.specialization,
        search: String? = _filters.value.search,
        hospitalId: String? = _filters.value.hospitalId,
        clinicId: String? = _filters.value.clinicId,
        latitude: Double? = _filters.value.latitude,
        longitude: Double? = _filters.value.longitude,
        city: String? = _filters.value.city
    ) {
        _filters.value = DoctorSearchFilters(
            specialization = specialization,
            search = search,
            hospitalId = hospitalId,
            clinicId = clinicId,
            latitude = latitude,
            longitude = longitude,
            city = city
        )
        searchDoctors(resetList = true)
    }

    /**
     * Set patient location for nearby search
     */
    fun setPatientLocation(lat: Double, lng: Double, city: String?) {
        updateFilters(latitude = lat, longitude = lng, city = city)
    }

    /**
     * Clear all filters
     */
    fun clearFilters() {
        // Preserve location when clearing search filters
        val location = _filters.value
        _filters.value = DoctorSearchFilters(
            latitude = location.latitude,
            longitude = location.longitude,
            city = location.city
        )
        searchDoctors(resetList = true)
    }

    /**
     * Select a doctor and load details
     */
    fun selectDoctor(doctorId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            when (val result = doctorRepository.getDoctorDetails(doctorId)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        selectedDoctor = result.data
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

    /**
     * Clear selected doctor
     */
    fun clearSelectedDoctor() {
        _uiState.value = _uiState.value.copy(selectedDoctor = null, availableSlots = null)
        _selectedDate.value = ""
    }

    /**
     * Select a date and load available slots
     */
    fun selectDate(date: String) {
        val doctorId = _uiState.value.selectedDoctor?.doctor?.id ?: return
        _selectedDate.value = date
        
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            when (val result = doctorRepository.getDoctorSlots(doctorId, date)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        availableSlots = result.data
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

    /**
     * Clear error
     */
    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }

    /**
     * Get list of specializations
     */
    fun getSpecializations(): List<String> {
        return listOf(
            "General Physician", "Family Medicine", "Gynecology", "Obstetrics",
            "Dermatology", "Pediatrics", "Dentistry", "Ophthalmology", "ENT",
            "Psychiatry", "Psychology", "Orthopedics", "Neurology", "Neurosurgery",
            "Urology", "Nephrology", "Pulmonology", "Cardiology", "Cardiac Surgery",
            "Gastroenterology", "Endocrinology", "Diabetology", "Oncology",
            "General Surgery", "Plastic Surgery", "Vascular Surgery", "Physiotherapy",
            "Radiology", "Pathology", "Anesthesiology", "Emergency Medicine",
            "Infectious Disease", "Rheumatology", "Allergy & Immunology", "Hematology",
            "Geriatrics", "Sports Medicine", "Pain Management", "Nutrition & Dietetics",
            "Ayurveda", "Homeopathy", "Other"
        )
    }
}
