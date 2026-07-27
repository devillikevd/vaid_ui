package com.example.swastik.ui.screens.patient.healthcare.clinic

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.R
import com.example.swastik.data.model.*
import com.example.swastik.data.remote.dto.ClinicDoctorDto
import com.example.swastik.ui.components.*
import com.example.swastik.ui.components.DoctorCard as SharedDoctorCard
import com.example.swastik.ui.components.HospitalReelsSection
import com.example.swastik.ui.screens.patient.healthcare.finder.StatusBadge
import com.example.swastik.utils.NavigationHelper

@Composable
internal fun ClinicDetailSheet(
    facility: MedicalFacility,
    clinicDoctors: List<ClinicDoctorDto> = emptyList(),
    isDoctorsLoading: Boolean = false,
    onDoctorBook: (HospitalDoctor) -> Unit = {},
    onViewDetails: () -> Unit = {},
    onBookAppointment: () -> Unit = {},
    isDarkMode: Boolean
) {
    val clinicContext = LocalContext.current

    LazyColumn(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 32.dp)
    ) {
        // ─── HERO CARD ───────────────────────────────────────────────
        item(key = "hero") {
            FacilityHeroCard(
                facility = facility,
                isDark = isDarkMode
            )
        }

        item(key = "spacer") {
            Spacer(modifier = Modifier.height(20.dp))
        }

        // ─── NAME + RATING ──────────────────────────────────────────
        item(key = "name_rating") {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp)
            ) {
                // Emergency badge
                if (facility.isEmergencyAvailable) {
                    EmergencyBadge(isDark = isDarkMode)
                    Spacer(modifier = Modifier.height(10.dp))
                }

                Text(
                    facility.name,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 20.sp,
                    color = getTextPrimary(isDarkMode),
                    lineHeight = 26.sp,
                    modifier = Modifier.padding(end = 12.dp)
                )

                Spacer(modifier = Modifier.height(6.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    StatusBadge(facility = facility)
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        "Clinic",
                        fontSize = 12.sp,
                        color = getAccentTeal(isDarkMode),
                        fontWeight = FontWeight.SemiBold
                    )
                }

                Spacer(modifier = Modifier.height(6.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Outlined.LocationOn, null,
                        tint = Color(0xFF14B8A6),
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        facility.distance,
                        fontSize = 12.sp,
                        color = getTextSecondary(isDarkMode),
                        fontWeight = FontWeight.Medium
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        "·",
                        fontSize = 12.sp,
                        color = getTextSecondary(isDarkMode)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Icon(
                        Icons.Default.Star, null,
                        tint = Color(0xFFFFC107),
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        String.format("%.1f", facility.rating),
                        fontSize = 12.sp,
                        color = getTextSecondary(isDarkMode),
                        fontWeight = FontWeight.SemiBold
                    )
                    if (facility.reviewCount > 0) {
                        Text(
                            " (${facility.reviewCount} reviews)",
                            fontSize = 12.sp,
                            color = getTextSecondary(isDarkMode)
                        )
                    }
                }

                if (facility.specializations.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(12.dp))
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(facility.specializations) { spec ->
                            Surface(
                                color = getAccentTeal(isDarkMode).copy(alpha = 0.12f),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text(
                                    spec,
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = getAccentTeal(isDarkMode)
                                )
                            }
                        }
                    }
                }
            }
        }

        item(key = "spacer2") {
            Spacer(modifier = Modifier.height(20.dp))
        }

        // ─── TRUST BADGES ──────────────────────────────────────────
        item(key = "trust_badges") {
            TrustBadgesRow(
                facility = facility,
                isDark = isDarkMode
            )
        }

        item(key = "spacer3") {
            Spacer(modifier = Modifier.height(20.dp))
        }

        // ─── QUICK ACTIONS ─────────────────────────────────────────
        item(key = "actions") {
            QuickActionRow(
                facility = facility,
                isDark = isDarkMode,
                onCall = {
                    if (facility.phone.isNotBlank()) {
                        NavigationHelper.openDialer(clinicContext, facility.phone)
                    }
                },
                onDirections = {
                    NavigationHelper.openDirections(
                        clinicContext,
                        facility.latitude,
                        facility.longitude,
                        facility.name
                    )
                },
                onWhatsApp = {
                    if (facility.phone.isNotBlank()) {
                        NavigationHelper.openWhatsApp(clinicContext, facility.phone)
                    }
                },
                onPrimaryAction = onBookAppointment,
                primaryActionLabel = "Book",
                showSOS = facility.isEmergencyAvailable
            )
        }

        item(key = "spacer4") {
            Spacer(modifier = Modifier.height(20.dp))
        }

        // ─── INFO CARDS ────────────────────────────────────────────
        item(key = "info") {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                InfoCard(
                    icon = Icons.Outlined.AccessTime,
                    title = "Timings",
                    value = when {
                        facility.is24Hours -> "Open 24 Hours"
                        !facility.openTime.isNullOrBlank() -> "${facility.openTime} - ${facility.closeTime ?: ""}"
                        else -> "N/A"
                    },
                    modifier = Modifier.weight(1f),
                    isDark = isDarkMode
                )
                InfoCard(
                    icon = Icons.Outlined.Phone,
                    title = "Contact",
                    value = facility.phone.ifBlank { "N/A" },
                    modifier = Modifier.weight(1f),
                    isDark = isDarkMode
                )
            }
        }

        item(key = "spacer5") {
            Spacer(modifier = Modifier.height(16.dp))
        }

        // ─── ADDRESS CARD ──────────────────────────────────────────
        item(key = "address") {
            AddressCard(
                facility = facility,
                isDark = isDarkMode,
                onDirectionsClick = {
                    NavigationHelper.openDirections(
                        clinicContext,
                        facility.latitude,
                        facility.longitude,
                        facility.name
                    )
                }
            )
        }

        // ─── DESCRIPTION ───────────────────────────────────────────
        if (!facility.description.isNullOrBlank()) {
            item(key = "desc_spacer") {
                Spacer(modifier = Modifier.height(20.dp))
            }
            item(key = "description") {
                SectionCard(title = "About", isDark = isDarkMode) {
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        facility.description,
                        fontSize = 13.sp,
                        color = getTextSecondary(isDarkMode),
                        lineHeight = 20.sp
                    )
                }
            }
        }

        // ─── FACILITIES / AMENITIES ───────────────────────────────
        if (facility.facilities.isNotEmpty()) {
            item(key = "facilities_spacer") {
                Spacer(modifier = Modifier.height(20.dp))
            }
            item(key = "facilities") {
                SectionCard(title = "Facilities & Amenities", isDark = isDarkMode) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        facility.facilities.chunked(2).forEach { rowItems ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                rowItems.forEach { item ->
                                    FacilityChip(
                                        name = item,
                                        modifier = Modifier.weight(1f),
                                        isDark = isDarkMode
                                    )
                                }
                                if (rowItems.size == 1) {
                                    Spacer(modifier = Modifier.weight(1f))
                                }
                            }
                        }
                    }
                }
            }
        }

        // ─── DEPARTMENTS ───────────────────────────────────────────
        if (facility.departments.isNotEmpty()) {
            item(key = "depts_spacer") {
                Spacer(modifier = Modifier.height(20.dp))
            }
            item(key = "departments") {
                SectionCard(title = "Departments", isDark = isDarkMode) {
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(facility.departments) { dept ->
                            DepartmentChip(
                                name = dept,
                                isDark = isDarkMode
                            )
                        }
                    }
                }
            }
        }

        // ─── REELS ────────────────────────────────────────────────
        if (facility.reels.isNotEmpty()) {
            item(key = "reels_spacer") {
                Spacer(modifier = Modifier.height(20.dp))
            }
            item(key = "reels") {
                HospitalReelsSection(
                    reels = facility.reels,
                    isDark = isDarkMode
                )
            }
        }

        // ─── DOCTORS ────────────────────────────────────────────────
        item(key = "doctors_header_spacer") {
            Spacer(modifier = Modifier.height(20.dp))
        }
        item(key = "doctors_header") {
            Text(
                stringResource(R.string.available_doctors),
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                color = getTextPrimary(isDarkMode),
                modifier = Modifier.padding(horizontal = 20.dp)
            )
        }
        item(key = "doctors_spacer") {
            Spacer(modifier = Modifier.height(12.dp))
        }

        if (isDoctorsLoading) {
            item(key = "doctors_loading") {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = getAccentTeal(isDarkMode))
                }
            }
        } else if (clinicDoctors.isEmpty() && facility.doctors.isEmpty()) {
            item(key = "doctors_empty") {
                EmptyStateView(
                    icon = Icons.Outlined.Person,
                    title = "No Doctors Listed",
                    subtitle = "No doctors are currently available at this clinic. Check back later.",
                    isDark = isDarkMode
                )
            }
        } else {
            val apiDoctorIds = clinicDoctors.map { it.id }.toSet()
            val embeddedDoctors = facility.doctors.filter { it.id !in apiDoctorIds }

            items(clinicDoctors, key = { "api_doc_${it.id}" }) { doc ->
                val hospitalDoctor = HospitalDoctor(
                    id = doc.id,
                    name = doc.name,
                    specialization = doc.specialization ?: "General",
                    experience = doc.experienceYears?.takeIf { it > 0 }?.let { "$it yrs" } ?: "N/A",
                    rating = doc.resolvedRating,
                    consultationFee = doc.consultationFee ?: 0,
                    profileImageUrl = doc.profileImageUrl,
                    introVideoUrl = doc.introVideoUrl
                )
                SharedDoctorCard(
                    doctor = hospitalDoctor,
                    isDark = isDarkMode,
                    onBookClick = { onDoctorBook(hospitalDoctor) },
                    onIntroClick = if (!doc.introVideoUrl.isNullOrBlank()) {
                        {
                            try {
                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(doc.introVideoUrl))
                                intent.setDataAndType(Uri.parse(doc.introVideoUrl), "video/*")
                                clinicContext.startActivity(intent)
                            } catch (_: Exception) {}
                        }
                    } else null,
                    showRating = true,
                    showSlots = true,
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp)
                )
            }
            items(embeddedDoctors, key = { "embedded_doc_${it.id}" }) { doctor ->
                SharedDoctorCard(
                    doctor = doctor,
                    isDark = isDarkMode,
                    onBookClick = { onDoctorBook(doctor) },
                    onIntroClick = if (!doctor.introVideoUrl.isNullOrBlank()) {
                        {
                            try {
                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(doctor.introVideoUrl))
                                intent.setDataAndType(Uri.parse(doctor.introVideoUrl), "video/*")
                                clinicContext.startActivity(intent)
                            } catch (_: Exception) {}
                        }
                    } else null,
                    showRating = true,
                    showSlots = true,
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp)
                )
            }
        }

        // ─── VIEW FULL DETAILS BUTTON ──────────────────────────────
        item(key = "spacer_before_details") {
            Spacer(modifier = Modifier.height(20.dp))
        }
        item(key = "view_details_button") {
            ViewFullDetailsButton(
                onClick = onViewDetails,
                isDark = isDarkMode
            )
        }
        item(key = "bottom_spacer") {
            Spacer(modifier = Modifier.height(8.dp))
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
//  LOCAL COLOR HELPERS
// ═══════════════════════════════════════════════════════════════════

private fun getTextPrimary(isDark: Boolean) = if (isDark) Color(0xFFE2E8F0) else Color(0xFF0F172A)
private fun getTextSecondary(isDark: Boolean) = if (isDark) Color(0xFF94A3B8) else Color(0xFF64748B)
private fun getAccentTeal(isDark: Boolean) = if (isDark) Color(0xFF5EEAD4) else Color(0xFF0D9488)

// ═══════════════════════════════════════════════════════════════════
//  LOCAL HELPER COMPOSABLES (used by ClinicDetailSheet only)
// ═══════════════════════════════════════════════════════════════════

@Composable
private fun EmergencyBadge(isDark: Boolean) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(
                if (isDark)
                    Color(0xFFE53935).copy(alpha = 0.15f)
                else
                    Color(0xFFFEE2E2)
            )
            .padding(horizontal = 10.dp, vertical = 5.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            Icons.Default.LocalHospital,
            contentDescription = null,
            tint = Color(0xFFE53935),
            modifier = Modifier.size(14.dp)
        )
        Spacer(modifier = Modifier.width(6.dp))
        Text(
            "Emergency Available",
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFFE53935)
        )
    }
}

@Composable
private fun DepartmentChip(name: String, isDark: Boolean) {
    Surface(
        color = if (isDark) Color(0xFF334155) else Color(0xFFF1F5F9),
        shape = RoundedCornerShape(10.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .clip(RoundedCornerShape(3.dp))
                    .background(getAccentTeal(isDark))
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                name,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = getTextPrimary(isDark)
            )
        }
    }
}


