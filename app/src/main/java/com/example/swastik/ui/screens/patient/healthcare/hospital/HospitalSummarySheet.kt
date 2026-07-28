package com.example.swastik.ui.screens.patient.healthcare.hospital

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.R
import com.example.swastik.data.model.*
import com.example.swastik.ui.components.*
import com.example.swastik.ui.components.InfoCard as SharedInfoCard
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.utils.NavigationHelper

@Composable
internal fun HospitalSummarySheet(
    facility: MedicalFacility,
    onDoctorBook: (HospitalDoctor) -> Unit,
    onBookAppointment: () -> Unit = {},
    onViewDetails: () -> Unit = {},
    isDetailsLoading: Boolean = false,
    detailsError: String? = null,
    isDarkMode: Boolean,
    showBedBadge: Boolean = true
) {
    val summaryContext = LocalContext.current
    LazyColumn(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(0.dp)
    ) {
        // 1. Hero Card with Image
        item {
            FacilityHeroCard(
                facility = facility,
                modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp),
                isDark = isDarkMode,
                showGalleryBadge = false,
                showRatingBadge = true
            ) {
                onViewDetails()
            }
        }

        // 2. Name & Type Header
        item {
            Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
                Text(
                    text = facility.name,
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp,
                    color = if (isDarkMode) Color(0xFFE2E8F0) else Color(0xFF0F172A),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (facility.hospitalSubType != null) {
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = if (isDarkMode) Color(0xFF1E3A5F) else Color(0xFFDBEAFE)
                        ) {
                        Text(
                            text = facility.hospitalSubType,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = if (isDarkMode) Color(0xFF93C5FD) else Color(0xFF2563EB),
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                    }
                    if (facility.distanceKm > 0) {
                        Icon(Icons.Outlined.LocationOn, contentDescription = null, tint = if (isDarkMode) Color(0xFF94A3B8) else Color(0xFF64748B), modifier = Modifier.size(14.dp))
                        Text(facility.distance, fontSize = 12.sp, color = if (isDarkMode) Color(0xFF94A3B8) else Color(0xFF64748B))
                    }
                }
                Spacer(modifier = Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.LocationOn, contentDescription = null, tint = if (isDarkMode) Color(0xFF64748B) else Color(0xFF94A3B8), modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = facility.address,
                        fontSize = 12.sp,
                        color = if (isDarkMode) Color(0xFF64748B) else Color(0xFF94A3B8),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }

        // 3. Trust Badges
        item {
            TrustBadgesRow(facility = facility, modifier = Modifier.padding(horizontal = 16.dp), isDark = isDarkMode)
        }

        // 4. Bed Availability Badge
        if (showBedBadge && facility.type == FacilityType.HOSPITAL && (facility.totalBeds != null && facility.totalBeds > 0)) {
            item {
                BedAvailabilityCard(facility = facility, modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp), isDark = isDarkMode)
            }
        }

        // 5. Quick Actions Row
        item {
            QuickActionRow(
                facility = facility,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                isDark = isDarkMode,
                onCall = { if (facility.phone.isNotBlank()) NavigationHelper.openDialer(summaryContext, facility.phone) },
                onDirections = { NavigationHelper.openDirections(summaryContext, facility.latitude, facility.longitude, facility.name) },
                onWhatsApp = { if (facility.phone.isNotBlank()) NavigationHelper.openWhatsApp(summaryContext, facility.phone) },
                onPrimaryAction = onBookAppointment,
                primaryActionLabel = stringResource(R.string.book),
                primaryActionIcon = Icons.Default.CalendarMonth,
                primaryActionColor = SwastikPrimary,
                showSOS = facility.isEmergencyAvailable && facility.type != FacilityType.MEDICAL_STORE && facility.type != FacilityType.DIAGNOSTIC_CENTER,
                onSOS = { NavigationHelper.openDialer(summaryContext, "108") },
                isSOSLoading = false
            )
        }

        // 6. Info Cards
        item {
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                val timingsValue = if (facility.openTime == "24 hrs") "24x7" else "${facility.openTime ?: "N/A"} - ${facility.closeTime ?: ""}"
                SharedInfoCard(
                    icon = Icons.Outlined.AccessTime,
                    title = "Timings",
                    value = timingsValue,
                    modifier = Modifier.weight(1f),
                    isDark = isDarkMode,
                    onClick = null
                )
                SharedInfoCard(
                    icon = Icons.Outlined.Phone,
                    title = "Contact",
                    value = facility.phone.ifBlank { "N/A" },
                    modifier = Modifier.weight(1f),
                    isDark = isDarkMode,
                    onClick = { if (facility.phone.isNotBlank()) NavigationHelper.openDialer(summaryContext, facility.phone) }
                )
            }
        }

        // 7. Address Card
        item {
            Spacer(modifier = Modifier.height(8.dp))
            AddressCard(
                facility = facility,
                modifier = Modifier.padding(horizontal = 16.dp),
                isDark = isDarkMode,
                onDirectionsClick = { NavigationHelper.openDirections(summaryContext, facility.latitude, facility.longitude, facility.name) }
            )
        }

        // 8. Emergency Badge
        if (facility.isEmergencyAvailable) {
            item {
                Spacer(modifier = Modifier.height(8.dp))
                EmergencyBadge(modifier = Modifier.padding(horizontal = 16.dp), isDark = isDarkMode)
            }
        }

        // 9. Description
        if (!facility.description.isNullOrBlank()) {
            item {
                Spacer(modifier = Modifier.height(8.dp))
                SectionCard(
                    title = "About",
                    modifier = Modifier.padding(horizontal = 16.dp),
                    isDark = isDarkMode
                ) {
                    Text(
                        text = facility.description,
                        fontSize = 13.sp,
                        color = if (isDarkMode) Color(0xFF94A3B8) else Color(0xFF64748B),
                        lineHeight = 20.sp,
                        maxLines = 3,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }

        // 10. Facilities & Amenities
        if (facility.facilities.isNotEmpty()) {
            item {
                Spacer(modifier = Modifier.height(8.dp))
                SectionCard(
                    title = "Facilities & Amenities",
                    modifier = Modifier.padding(horizontal = 16.dp),
                    isDark = isDarkMode
                ) {
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                    ) {
                        items(facility.facilities.take(6)) { facilityItem ->
                            FacilityChip(name = facilityItem, isDark = isDarkMode)
                        }
                    }
                }
            }
        }

        // 11. Top Specializations
        if (facility.specializations.isNotEmpty()) {
            item {
                Spacer(modifier = Modifier.height(8.dp))
                SectionCard(
                    title = "Top Specializations",
                    modifier = Modifier.padding(horizontal = 16.dp),
                    isDark = isDarkMode
                ) {
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                    ) {
                        items(facility.specializations.take(3)) { spec ->
                            FacilityChip(
                                name = spec,
                                isDark = isDarkMode,
                                accentColor = SwastikPrimary,
                                accentBgColor = if (isDarkMode) Color(0xFF1E3A5F) else Color(0xFFDBEAFE)
                            )
                        }
                    }
                }
            }
        }

        // 12. Departments
        if (facility.departments.isNotEmpty()) {
            item {
                Spacer(modifier = Modifier.height(8.dp))
                SectionCard(
                    title = "Departments",
                    modifier = Modifier.padding(horizontal = 16.dp),
                    isDark = isDarkMode
                ) {
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                    ) {
                        items(facility.departments.take(4)) { dept ->
                            FacilityChip(
                                name = dept,
                                isDark = isDarkMode,
                                accentColor = SwastikPrimary,
                                accentBgColor = if (isDarkMode) Color(0xFF1E3A5F) else Color(0xFFDBEAFE)
                            )
                        }
                    }
                }
            }
        }

        // 14. Reels
        if (facility.reels.isNotEmpty()) {
            item {
                Spacer(modifier = Modifier.height(8.dp))
                HospitalReelsSection(
                    reels = facility.reels,
                    modifier = Modifier.padding(horizontal = 16.dp),
                    isDark = isDarkMode
                )
            }
        }

        // 15. Available Doctors (top 3 preview)
        if (facility.doctors.isNotEmpty() && facility.type != FacilityType.MEDICAL_STORE && facility.type != FacilityType.DIAGNOSTIC_CENTER) {
            item {
                Spacer(modifier = Modifier.height(8.dp))
                SectionCard(
                    title = "Doctors",
                    modifier = Modifier.padding(horizontal = 16.dp),
                    isDark = isDarkMode,
                    showAction = facility.doctors.size > 3,
                    actionLabel = "View All",
                    onActionClick = onViewDetails
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        facility.doctors.take(3).forEach { doctor ->
                            DoctorCard(
                                doctor = doctor,
                                isDark = isDarkMode,
                                onBookClick = { onDoctorBook(doctor) },
                                contentPadding = PaddingValues(horizontal = 4.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
            }
        }

        // 16. Loading / Error State
        if (facility.type == FacilityType.HOSPITAL && isDetailsLoading && facility.doctors.isEmpty()) {
            item {
                Spacer(modifier = Modifier.height(16.dp))
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp,
                        color = SwastikPrimary
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = stringResource(R.string.loading_hospital_team),
                        fontSize = 13.sp,
                        color = if (isDarkMode) Color(0xFF64748B) else Color(0xFF94A3B8)
                    )
                }
            }
        }

        if (facility.type == FacilityType.HOSPITAL && detailsError != null && facility.doctors.isEmpty()) {
            item {
                Spacer(modifier = Modifier.height(12.dp))
                Surface(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                    shape = RoundedCornerShape(12.dp),
                    color = if (isDarkMode) MaterialTheme.colorScheme.surfaceVariant else MaterialTheme.colorScheme.surface,
                    border = BorderStroke(1.dp, if (isDarkMode) Color(0xFF334155) else Color(0xFFE2E8F0))
                ) {
                    Text(
                        text = detailsError,
                        modifier = Modifier.padding(14.dp),
                        fontSize = 13.sp,
                        color = if (isDarkMode) Color(0xFFE2E8F0) else Color(0xFF0F172A)
                    )
                }
            }
        }

        // 17. View Full Details CTA
        item {
            Spacer(modifier = Modifier.height(16.dp))
            ViewFullDetailsButton(
                modifier = Modifier.padding(bottom = 24.dp),
                isDark = isDarkMode,
                onClick = onViewDetails
            )
        }
    }
}

internal fun mergeFacilityDetails(
    baseFacility: MedicalFacility,
    loadedDetails: MedicalFacility?
): MedicalFacility {
    if (loadedDetails == null) return baseFacility

    return loadedDetails.copy(
        latitude = loadedDetails.latitude.takeIf { it != 0.0 } ?: baseFacility.latitude,
        longitude = loadedDetails.longitude.takeIf { it != 0.0 } ?: baseFacility.longitude,
        distance = if (loadedDetails.distance == "N/A" && baseFacility.distance != "N/A") {
            baseFacility.distance
        } else {
            loadedDetails.distance
        },
        distanceKm = loadedDetails.distanceKm.takeIf { it > 0.0 } ?: baseFacility.distanceKm,
        rating = loadedDetails.rating.takeIf { it > 0f } ?: baseFacility.rating,
        reviewCount = loadedDetails.reviewCount.takeIf { it > 0 } ?: baseFacility.reviewCount,
        phone = loadedDetails.phone.ifBlank { baseFacility.phone },
        isOpen = loadedDetails.isOpen || baseFacility.isOpen,
        isEmergencyAvailable = loadedDetails.isEmergencyAvailable || baseFacility.isEmergencyAvailable,
        specializations = (loadedDetails.specializations + baseFacility.specializations).distinct(),
        hospitalSubType = loadedDetails.hospitalSubType ?: baseFacility.hospitalSubType,
        departments = (loadedDetails.departments + baseFacility.departments).distinct(),
        doctors = loadedDetails.doctors.ifEmpty { baseFacility.doctors },
        facilities = loadedDetails.facilities.ifEmpty { baseFacility.facilities },
        images = loadedDetails.images.ifEmpty { baseFacility.images },
        imageUrl = loadedDetails.imageUrl ?: baseFacility.imageUrl,
        description = loadedDetails.description ?: baseFacility.description,
        insuranceAccepted = loadedDetails.insuranceAccepted.ifEmpty { baseFacility.insuranceAccepted },
        accreditations = loadedDetails.accreditations.ifEmpty { baseFacility.accreditations },
        reels = loadedDetails.reels.ifEmpty { baseFacility.reels },
        virtualTourUrl = loadedDetails.virtualTourUrl ?: baseFacility.virtualTourUrl,
        floorGuideMapUrl = loadedDetails.floorGuideMapUrl ?: baseFacility.floorGuideMapUrl,
        websiteUrl = loadedDetails.websiteUrl ?: baseFacility.websiteUrl,
        establishedYear = loadedDetails.establishedYear ?: baseFacility.establishedYear,
        openingHours = loadedDetails.openingHours ?: baseFacility.openingHours,
        totalBeds = loadedDetails.totalBeds ?: baseFacility.totalBeds,
        bedsAvailable = loadedDetails.bedsAvailable ?: baseFacility.bedsAvailable,
        erWaitTimeMinutes = loadedDetails.erWaitTimeMinutes ?: baseFacility.erWaitTimeMinutes
    )
}
