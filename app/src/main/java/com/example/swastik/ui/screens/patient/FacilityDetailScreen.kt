package com.example.swastik.ui.screens.patient

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.example.swastik.R
import com.example.swastik.data.model.*
import com.example.swastik.ui.components.*
import com.example.swastik.ui.screens.patient.components.AssociatedNetworkSection
import com.example.swastik.ui.screens.patient.components.HealthAlertCard
import com.example.swastik.ui.theme.SwastikOrange
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.ui.viewmodel.FacilityDetailViewModel
import com.example.swastik.utils.NavigationHelper
import android.Manifest
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import java.util.Locale
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay

// ══════════════════════════════════════════════════════════════
//  Premium Hospital Detail Screen — Practo-Inspired Design
// ══════════════════════════════════════════════════════════════

private val BrandTeal = Color(0xFF00695C)
private val BrandTealLight = Color(0xFFE0F2F1)

@OptIn(
    ExperimentalMaterial3Api::class,
    ExperimentalLayoutApi::class,
    ExperimentalFoundationApi::class
)
@Composable
fun FacilityDetailScreen(
    facilityId: String,
    facilityType: FacilityType = FacilityType.HOSPITAL,
    onBackClick: () -> Unit,
    onDoctorBookClick: (HospitalDoctor, MedicalFacility) -> Unit = { _, _ -> },
    isLoggedIn: Boolean = true,
    viewModel: FacilityDetailViewModel = hiltViewModel(),
    medicineViewModel: com.example.swastik.ui.viewmodel.MedicineViewModel = hiltViewModel(),
    onNavigateToOrders: () -> Unit = {},
    onNavigateToDiagnosticBooking: (String) -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val colorScheme = MaterialTheme.colorScheme
    val isDark = colorScheme.surface.luminance() < 0.5f

    // ── Color Palette ──
    val bgColor = if (isDark) Color(0xFF0A0E1A) else Color(0xFFF5F7FA)
    val cardBg = if (isDark) Color(0xFF141B2D) else Color.White
    val titleColor = if (isDark) Color(0xFFF1F5F9) else Color(0xFF0F172A)
    val subtitleColor = if (isDark) Color(0xFF94A3B8) else Color(0xFF64748B)
    val accentColor = if (isDark) Color(0xFF4DB6AC) else BrandTeal
    val divColor = if (isDark) Color(0xFF1E293B) else Color(0xFFE8ECF1)
    val tabIndicatorColor = if (isDark) Color(0xFF4DB6AC) else BrandTeal
    
    var showPharmacyBookingDialog by remember { mutableStateOf(false) }
    var pharmacyBookingIsPrescription by remember { mutableStateOf(false) }

    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val granted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (granted) {
            uiState.facility?.id?.let { viewModel.triggerDirectSOS(it) }
        } else {
            Toast.makeText(context, "Location permission is required for Digital SOS", Toast.LENGTH_SHORT).show()
        }
    }

    LaunchedEffect(uiState.sosSuccess, uiState.sosError) {
        if (uiState.sosSuccess) {
            Toast.makeText(context, "Digital SOS Sent Successfully! Ambulance will be dispatched.", Toast.LENGTH_LONG).show()
            viewModel.clearSosState()
        }
        if (uiState.sosError != null) {
            Toast.makeText(context, "SOS Error: ${uiState.sosError}", Toast.LENGTH_LONG).show()
            viewModel.clearSosState()
        }
    }

    LaunchedEffect(uiState.fitnessBookingSuccess, uiState.fitnessBookingError) {
        if (uiState.fitnessBookingSuccess) {
            Toast.makeText(context, "Gym/studio visit booked successfully.", Toast.LENGTH_LONG).show()
            viewModel.clearFitnessBookingState()
        }
        if (uiState.fitnessBookingError != null) {
            Toast.makeText(context, uiState.fitnessBookingError, Toast.LENGTH_LONG).show()
            viewModel.clearFitnessBookingState()
        }
    }

    LaunchedEffect(facilityId, facilityType) {
        viewModel.loadFacilityDetails(facilityId, facilityType)
    }

    val isFavorite by viewModel.isFavorite.collectAsState()

    when {
        uiState.isLoading -> {
            HospitalDetailShimmerSkeleton(isDark = isDark)
        }

        uiState.error != null -> {
            Box(modifier = Modifier.fillMaxSize().background(bgColor)) {
                Column(
                    modifier = Modifier.fillMaxSize().padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(Icons.Default.Error, contentDescription = null, tint = colorScheme.error, modifier = Modifier.size(56.dp))
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(uiState.error!!, textAlign = TextAlign.Center, color = titleColor, fontSize = 16.sp)
                    Spacer(modifier = Modifier.height(20.dp))
                    Button(
                        onClick = { viewModel.loadFacilityDetails(facilityId, facilityType) },
                        colors = ButtonDefaults.buttonColors(containerColor = accentColor),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(stringResource(R.string.retry))
                    }
                }
            }
        }

        uiState.facility != null -> {
            val facility = uiState.facility!!

            // ── Build tab list based on available data ──
            val tabTitles = buildList {
                add("Overview")
                if (facility.type == FacilityType.MEDICAL_STORE) {
                    val invCount = uiState.pharmacyInventory.size
                    add(if (invCount > 0) "Inventory ($invCount)" else "Inventory")
                } else if (facility.type == FacilityType.DIAGNOSTIC_CENTER) {
                    val testCount = facility.tests.size
                    add(if (testCount > 0) "Tests ($testCount)" else "Tests")
                } else if (facility.type == FacilityType.FITNESS_CENTER) {
                    val trainerCount = facility.doctors.size
                    add(if (trainerCount > 0) "Trainers ($trainerCount)" else "Trainers")
                } else {
                    val docCount = facility.doctors.size
                    add(if (docCount > 0) "Doctors ($docCount)" else "Doctors")
                }
                add("Reviews")
                add("Photos")
                add("Videos")
            }

            var selectedTabIndex by remember { mutableIntStateOf(0) }
            val coroutineScope = rememberCoroutineScope()

            Box(modifier = Modifier.fillMaxSize().background(bgColor)) {
                LazyColumn(
                    modifier = Modifier.fillMaxSize()
                ) {
                    // ═══════════════════════════════════════
                    //  1. HERO IMAGE + OVERLAY BUTTONS
                    // ═══════════════════════════════════════
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(300.dp)
                        ) {
                            val headerImage = facility.imageUrl ?: facility.images.firstOrNull()
                            if (headerImage != null) {
                                AsyncImage(
                                    model = ImageRequest.Builder(context)
                                        .data(headerImage)
                                        .crossfade(true)
                                        .build(),
                                    contentDescription = facility.name,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.fillMaxSize()
                                )
                            } else {
                                Box(
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .background(
                                            Brush.linearGradient(
                                                listOf(
                                                    accentColor,
                                                    accentColor.copy(alpha = 0.6f)
                                                )
                                            )
                                        ),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Icon(
                                            facility.type.getMarkerIcon(),
                                            contentDescription = null,
                                            tint = Color.White.copy(alpha = 0.7f),
                                            modifier = Modifier.size(80.dp)
                                        )
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Text(
                                            facility.type.getDisplayName(),
                                            color = Color.White.copy(alpha = 0.9f),
                                            fontSize = 18.sp,
                                            fontWeight = FontWeight.Medium
                                        )
                                    }
                                }
                            }

                            // Gradient overlay
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(
                                        Brush.verticalGradient(
                                            colors = listOf(
                                                Color.Black.copy(alpha = 0.4f),
                                                Color.Transparent,
                                                Color.Transparent,
                                                Color.Black.copy(alpha = 0.6f)
                                            )
                                        )
                                    )
                            )

                            // Top action buttons (Back, Favorite, Share)
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .statusBarsPadding()
                                    .padding(horizontal = 12.dp, vertical = 8.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                // Back button
                                Surface(
                                    shape = CircleShape,
                                    color = Color.Black.copy(alpha = 0.35f),
                                    modifier = Modifier.size(40.dp)
                                ) {
                                    IconButton(onClick = onBackClick, modifier = Modifier.size(40.dp)) {
                                        Icon(
                                            Icons.AutoMirrored.Filled.ArrowBack,
                                            contentDescription = stringResource(R.string.back),
                                            tint = Color.White,
                                            modifier = Modifier.size(22.dp)
                                        )
                                    }
                                }

                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    // Favorite button
                                    Surface(
                                        shape = CircleShape,
                                        color = Color.Black.copy(alpha = 0.35f),
                                        modifier = Modifier.size(40.dp)
                                    ) {
                                        IconButton(onClick = { viewModel.toggleFavorite() }, modifier = Modifier.size(40.dp)) {
                                            Icon(
                                                if (isFavorite) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                                                contentDescription = "Favorite",
                                                tint = if (isFavorite) Color.Red else Color.White,
                                                modifier = Modifier.size(20.dp)
                                            )
                                        }
                                    }

                                    // Share button
                                    Surface(
                                        shape = CircleShape,
                                        color = Color.Black.copy(alpha = 0.35f),
                                        modifier = Modifier.size(40.dp)
                                    ) {
                                        IconButton(
                                            onClick = {
                                                context.startActivity(
                                                    Intent.createChooser(
                                                        Intent(Intent.ACTION_SEND).apply {
                                                            type = "text/plain"
                                                            putExtra(
                                                                Intent.EXTRA_TEXT,
                                                                "${facility.name}\n${facility.address}\nPhone: ${facility.phone}"
                                                            )
                                                        }, "Share"
                                                    )
                                                )
                                            },
                                            modifier = Modifier.size(40.dp)
                                        ) {
                                            Icon(
                                                Icons.Outlined.Share,
                                                contentDescription = "Share",
                                                tint = Color.White,
                                                modifier = Modifier.size(20.dp)
                                            )
                                        }
                                    }
                                }
                            }

                            // Photo count badge
                            if (facility.images.size > 1) {
                                Surface(
                                    modifier = Modifier
                                        .align(Alignment.BottomEnd)
                                        .padding(16.dp),
                                    shape = RoundedCornerShape(8.dp),
                                    color = Color.Black.copy(alpha = 0.6f)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Icon(
                                            Icons.Default.PhotoLibrary,
                                            contentDescription = null,
                                            tint = Color.White,
                                            modifier = Modifier.size(14.dp)
                                        )
                                        Text(
                                            "${facility.images.size} Photos",
                                            fontSize = 12.sp,
                                            color = Color.White,
                                            fontWeight = FontWeight.SemiBold
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // ═══════════════════════════════════════
                    //  2. FLOATING INFO CARD (overlaps image)
                    // ═══════════════════════════════════════
                    item {
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp)
                                .offset(y = (-40).dp),
                            shape = RoundedCornerShape(20.dp),
                            color = cardBg,
                            shadowElevation = 8.dp,
                            tonalElevation = 2.dp
                        ) {
                            Column(
                                modifier = Modifier.padding(20.dp)
                            ) {
                                // ── Hospital Type Badge + Name ──
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.Top,
                                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                                ) {
                                    // Facility type icon badge
                                    Surface(
                                        shape = RoundedCornerShape(14.dp),
                                        color = BrandTealLight,
                                        modifier = Modifier.size(52.dp)
                                    ) {
                                        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                            Icon(
                                                facility.type.getMarkerIcon(),
                                                contentDescription = null,
                                                tint = BrandTeal,
                                                modifier = Modifier.size(28.dp)
                                            )
                                        }
                                    }

                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = facility.name,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 20.sp,
                                            color = titleColor,
                                            lineHeight = 24.sp,
                                            maxLines = 2,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))

                                        // Rating + Reviews + Distance
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                                        ) {
                                            if (facility.rating > 0f) {
                                                Icon(
                                                    Icons.Default.Star,
                                                    contentDescription = null,
                                                    tint = Color(0xFFFFC107),
                                                    modifier = Modifier.size(16.dp)
                                                )
                                                Text(
                                                    text = String.format(Locale.US, "%.1f", facility.rating),
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 14.sp,
                                                    color = titleColor
                                                )
                                                Text(
                                                    text = "(${facility.reviewCount} Reviews)",
                                                    fontSize = 13.sp,
                                                    color = subtitleColor
                                                )
                                            }
                                            if (facility.distanceKm > 0) {
                                                if (facility.rating > 0f) {
                                                    Text("•", color = subtitleColor, fontSize = 13.sp)
                                                }
                                                Icon(
                                                    Icons.Outlined.LocationOn,
                                                    contentDescription = null,
                                                    tint = subtitleColor,
                                                    modifier = Modifier.size(14.dp)
                                                )
                                                Text(
                                                    text = facility.distance,
                                                    fontSize = 13.sp,
                                                    color = subtitleColor
                                                )
                                            }
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(6.dp))

                                // ── Address ──
                                Row(
                                    verticalAlignment = Alignment.Top,
                                    modifier = Modifier.padding(start = 66.dp)
                                ) {
                                    Icon(
                                        Icons.Outlined.Place,
                                        contentDescription = null,
                                        tint = subtitleColor,
                                        modifier = Modifier.size(14.dp).padding(top = 2.dp)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        text = facility.address.trimEnd(',', ' '),
                                        fontSize = 13.sp,
                                        color = subtitleColor,
                                        maxLines = 2,
                                        overflow = TextOverflow.Ellipsis,
                                        lineHeight = 18.sp
                                    )
                                }

                                Spacer(modifier = Modifier.height(20.dp))
                                HorizontalDivider(color = divColor, thickness = 0.8.dp)
                                Spacer(modifier = Modifier.height(16.dp))

                                // ═══════════════════════════════════
                                //  QUICK ACTIONS ROW
                                // ═══════════════════════════════════
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceEvenly
                                ) {
                                    PremiumQuickAction(
                                        icon = Icons.Default.Call,
                                        label = "Call",
                                        color = BrandTeal,
                                        bgColor = BrandTealLight,
                                        isDark = isDark
                                    ) {
                                        if (facility.phone.isNotBlank()) {
                                            NavigationHelper.openDialer(context, facility.phone)
                                        }
                                    }
                                    PremiumQuickAction(
                                        icon = Icons.Default.Directions,
                                        label = "Directions",
                                        color = BrandTeal,
                                        bgColor = BrandTealLight,
                                        isDark = isDark
                                    ) {
                                        NavigationHelper.openDirections(
                                            context,
                                            facility.latitude,
                                            facility.longitude,
                                            facility.name
                                        )
                                    }
                                    PremiumQuickAction(
                                        icon = Icons.Default.Chat,
                                        label = "WhatsApp",
                                        color = BrandTeal,
                                        bgColor = BrandTealLight,
                                        isDark = isDark
                                    ) {
                                        if (facility.phone.isNotBlank()) {
                                            val cleanPhone = facility.phone.filter { it.isDigit() }
                                            try {
                                                context.startActivity(
                                                    Intent(
                                                        Intent.ACTION_VIEW,
                                                        Uri.parse("https://wa.me/91$cleanPhone")
                                                    )
                                                )
                                            } catch (_: Exception) {
                                                context.startActivity(
                                                    Intent(
                                                        Intent.ACTION_VIEW,
                                                        Uri.parse("sms:${facility.phone}")
                                                    )
                                                )
                                            }
                                        } else {
                                            Toast.makeText(context, "Phone not available", Toast.LENGTH_SHORT).show()
                                        }
                                    }
                                    PremiumQuickAction(
                                        icon = when (facility.type) {
                                            FacilityType.MEDICAL_STORE -> Icons.Default.ShoppingCart
                                            FacilityType.DIAGNOSTIC_CENTER -> Icons.Default.Science
                                            FacilityType.FITNESS_CENTER -> Icons.Default.FitnessCenter
                                            else -> Icons.Default.CalendarMonth
                                        },
                                        label = when (facility.type) {
                                            FacilityType.MEDICAL_STORE -> "Order"
                                            FacilityType.DIAGNOSTIC_CENTER -> "Book Test"
                                            FacilityType.FITNESS_CENTER -> "Book Visit"
                                            else -> "Book"
                                        },
                                        color = BrandTeal,
                                        bgColor = BrandTealLight,
                                        isDark = isDark
                                    ) {
                                        when (facility.type) {
                                            FacilityType.MEDICAL_STORE -> {
                                                showPharmacyBookingDialog = true
                                            }
                                            FacilityType.DIAGNOSTIC_CENTER -> {
                                                onNavigateToDiagnosticBooking(facilityId)
                                            }
                                            FacilityType.FITNESS_CENTER -> {
                                                viewModel.bookFitnessCenterVisit(facilityId)
                                            }
                                            else -> {
                                                val doctor = facility.doctors.firstOrNull()
                                                if (doctor != null) {
                                                    onDoctorBookClick(doctor, facility)
                                                } else {
                                                    Toast.makeText(
                                                        context,
                                                        "No doctors available for booking",
                                                        Toast.LENGTH_SHORT
                                                    ).show()
                                                }
                                            }
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(16.dp))
                                HorizontalDivider(color = divColor, thickness = 0.8.dp)
                                Spacer(modifier = Modifier.height(14.dp))

                                // ═══════════════════════════════════
                                //  TIMINGS SECTION
                                // ═══════════════════════════════════
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Icon(
                                        Icons.Outlined.AccessTime,
                                        contentDescription = null,
                                        tint = subtitleColor,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Text(
                                        text = "Timings",
                                        fontSize = 14.sp,
                                        color = subtitleColor,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    modifier = Modifier.padding(start = 26.dp)
                                ) {
                                    val isOpen = facility.isOpen
                                    Surface(
                                        shape = RoundedCornerShape(6.dp),
                                        color = if (isOpen) Color(0xFFD1FAE5) else Color(0xFFFEE2E2)
                                    ) {
                                        Text(
                                            text = if (isOpen) "Open" else "Closed",
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (isOpen) Color(0xFF059669) else Color(0xFFDC2626),
                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                        )
                                    }
                                    val timingsText = when {
                                        facility.is24Hours || facility.openTime == "24 hrs" -> "Open 24 Hours"
                                        facility.openTime != null && facility.closeTime != null ->
                                            "${facility.openTime} - ${facility.closeTime}"
                                        facility.openingHours != null -> facility.openingHours
                                        else -> "Timings available on call"
                                    }
                                    timingsText?.let {
                                        Text(
                                            text = it,
                                            fontSize = 13.sp,
                                            color = subtitleColor
                                        )
                                    }
                                }

                                // ── Emergency SOS quick badge ──
                                if (
                                    facility.isEmergencyAvailable &&
                                    facility.type != FacilityType.MEDICAL_STORE &&
                                    facility.type != FacilityType.FITNESS_CENTER
                                ) {
                                    Spacer(modifier = Modifier.height(12.dp))
                                    Surface(
                                        modifier = Modifier.fillMaxWidth(),
                                        shape = RoundedCornerShape(10.dp),
                                        color = if (isDark) Color(0xFF3B1010) else Color(0xFFFEF2F2),
                                        border = BorderStroke(0.5.dp, Color(0xFFDC2626).copy(alpha = 0.3f))
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(12.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                                        ) {
                                            Surface(
                                                shape = CircleShape,
                                                color = Color(0xFFDC2626).copy(alpha = 0.15f),
                                                modifier = Modifier.size(36.dp)
                                            ) {
                                                Box(
                                                    contentAlignment = Alignment.Center,
                                                    modifier = Modifier.fillMaxSize()
                                                ) {
                                                    if (uiState.sosRequesting) {
                                                        CircularProgressIndicator(
                                                            modifier = Modifier.size(16.dp),
                                                            strokeWidth = 2.dp,
                                                            color = Color(0xFFDC2626)
                                                        )
                                                    } else {
                                                        Icon(
                                                            Icons.Default.LocalHospital,
                                                            contentDescription = null,
                                                            tint = Color(0xFFDC2626),
                                                            modifier = Modifier.size(18.dp)
                                                        )
                                                    }
                                                }
                                            }
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(
                                                    "24/7 Emergency Available",
                                                    fontWeight = FontWeight.SemiBold,
                                                    fontSize = 13.sp,
                                                    color = Color(0xFFDC2626)
                                                )
                                                facility.erWaitTimeMinutes?.let { wait ->
                                                    Text(
                                                        "ER Wait: ~${wait} min",
                                                        fontSize = 12.sp,
                                                        color = subtitleColor
                                                    )
                                                }
                                            }
                                            TextButton(
                                                onClick = {
                                                    if (uiState.sosCooldownRemaining > 0L) {
                                                        Toast.makeText(
                                                            context,
                                                            "SOS cooldown: ${uiState.sosCooldownRemaining}s",
                                                            Toast.LENGTH_SHORT
                                                        ).show()
                                                    } else {
                                                        locationPermissionLauncher.launch(
                                                            arrayOf(
                                                                Manifest.permission.ACCESS_FINE_LOCATION,
                                                                Manifest.permission.ACCESS_COARSE_LOCATION
                                                            )
                                                        )
                                                    }
                                                },
                                                colors = ButtonDefaults.textButtonColors(
                                                    contentColor = Color(0xFFDC2626)
                                                )
                                            ) {
                                                Text("SOS", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // ═══════════════════════════════════════
                    //  3. TAB BAR (Sticky in scroll)
                    // ═══════════════════════════════════════
                    item {
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .offset(y = (-32).dp),
                            color = cardBg,
                            shadowElevation = 2.dp
                        ) {
                            ScrollableTabRow(
                                selectedTabIndex = selectedTabIndex,
                                containerColor = Color.Transparent,
                                contentColor = tabIndicatorColor,
                                edgePadding = 16.dp,
                                indicator = { tabPositions ->
                                    if (tabPositions.isNotEmpty() && selectedTabIndex < tabPositions.size) {
                                        TabRowDefaults.SecondaryIndicator(
                                            modifier = Modifier.tabIndicatorOffset(tabPositions[selectedTabIndex]),
                                            height = 3.dp,
                                            color = tabIndicatorColor
                                        )
                                    }
                                },
                                divider = { HorizontalDivider(color = divColor, thickness = 0.5.dp) }
                            ) {
                                tabTitles.forEachIndexed { index, title ->
                                    Tab(
                                        selected = selectedTabIndex == index,
                                        onClick = {
                                            selectedTabIndex = index
                                        },
                                        text = {
                                            Text(
                                                text = title,
                                                fontWeight = if (selectedTabIndex == index) FontWeight.Bold else FontWeight.Medium,
                                                fontSize = 14.sp,
                                                color = if (selectedTabIndex == index) tabIndicatorColor else subtitleColor
                                            )
                                        }
                                    )
                                }
                            }
                        }
                    }

                    // ═══════════════════════════════════════
                    //  4. TAB CONTENT (Non-pager approach for LazyColumn compat)
                    // ═══════════════════════════════════════
                    val currentTab = tabTitles.getOrNull(selectedTabIndex) ?: "Overview"

                    when {
                        currentTab == "Overview" -> {
                            // ── Overview Tab Content ──
                            overviewTabContent(
                                facility = facility,
                                isDark = isDark,
                                titleColor = titleColor,
                                subtitleColor = subtitleColor,
                                accentColor = accentColor,
                                divColor = divColor,
                                cardBg = cardBg,
                                facilityType = facilityType,
                                facilityId = facilityId,
                                context = context,
                                onOrderMedicineClick = {
                                    pharmacyBookingIsPrescription = false
                                    showPharmacyBookingDialog = true
                                },
                                onBookTestClick = {
                                    onNavigateToDiagnosticBooking(facilityId)
                                },
                                onBookFitnessVisitClick = {
                                    viewModel.bookFitnessCenterVisit(facilityId)
                                },
                                fitnessBookingSubmitting = uiState.fitnessBookingSubmitting
                            )
                        }

                        currentTab.startsWith("Trainers") -> {
                            doctorsTabContent(
                                facility = facility,
                                isDark = isDark,
                                titleColor = titleColor,
                                subtitleColor = subtitleColor,
                                accentColor = accentColor,
                                onDoctorBookClick = { _, _ -> viewModel.bookFitnessCenterVisit(facilityId) },
                                context = context
                            )
                        }

                        currentTab.startsWith("Doctors") -> {
                            doctorsTabContent(
                                facility = facility,
                                isDark = isDark,
                                titleColor = titleColor,
                                subtitleColor = subtitleColor,
                                accentColor = accentColor,
                                onDoctorBookClick = onDoctorBookClick,
                                context = context
                            )
                        }

                        currentTab == "Reviews" -> {
                            reviewsTabContent(
                                facility = facility,
                                reviews = uiState.reviews,
                                reviewsLoading = uiState.reviewsLoading,
                                reviewSubmitting = uiState.reviewSubmitting,
                                reviewSuccess = uiState.reviewSuccess,
                                reviewError = uiState.reviewError,
                                isLoggedIn = isLoggedIn,
                                isDark = isDark,
                                titleColor = titleColor,
                                subtitleColor = subtitleColor,
                                accentColor = accentColor,
                                divColor = divColor,
                                cardBg = cardBg,
                                facilityType = facilityType,
                                facilityId = facilityId,
                                viewModel = viewModel
                            )
                        }

                        currentTab == "Photos" -> {
                            photosTabContent(
                                images = facility.images,
                                facilityName = facility.name,
                                isDark = isDark,
                                titleColor = titleColor,
                                subtitleColor = subtitleColor,
                                context = context
                            )
                        }

                        currentTab == "Videos" -> {
                            videosTabContent(
                                reels = facility.reels,
                                isDark = isDark,
                                context = context
                            )
                        }
                        currentTab.startsWith("Inventory") -> {
                            inventoryTabContent(
                                facility = facility,
                                inventoryItems = uiState.pharmacyInventory,
                                isInventoryLoading = uiState.isPharmacyInventoryLoading,
                                isDark = isDark,
                                titleColor = titleColor,
                                subtitleColor = subtitleColor,
                                accentColor = accentColor,
                                context = context,
                                onAddToCart = {
                                    pharmacyBookingIsPrescription = false
                                    showPharmacyBookingDialog = true
                                },
                                onSearch = { query -> viewModel.loadPharmacyInventory(facilityId, query) }
                            )
                        }

                        currentTab.startsWith("Tests") -> {
                            testsTabContent(
                                facility = facility,
                                isDark = isDark,
                                titleColor = titleColor,
                                subtitleColor = subtitleColor,
                                accentColor = accentColor,
                                context = context,
                                onBookTest = {
                                    onNavigateToDiagnosticBooking(facilityId)
                                }
                            )
                        }
                    }

                    // Bottom spacer
                    item { Spacer(modifier = Modifier.height(40.dp)) }
                }
            }
        }
    } // closes when

    // Pharmacy Booking Full-Screen Flow
    if (showPharmacyBookingDialog && uiState.facility != null && uiState.facility?.type == FacilityType.MEDICAL_STORE) {
        val selectedFacility = uiState.facility!!
        com.example.swastik.ui.screens.patient.medicine.PharmacyBookingFlow(
            facility = selectedFacility,
            initialStep = if (pharmacyBookingIsPrescription) 3 else 1,
            isPrescriptionBased = pharmacyBookingIsPrescription,
            inventoryItems = uiState.pharmacyInventory,
            isInventoryLoading = uiState.isPharmacyInventoryLoading,
            onInventorySearch = { query -> viewModel.loadPharmacyInventory(selectedFacility.id, query) },
            onDismiss = { showPharmacyBookingDialog = false },
            onConfirmOrder = { address, phone, items, isRx, bitmap ->
                medicineViewModel.clearCart(com.example.swastik.ui.viewmodel.CartType.PHARMACY)
                medicineViewModel.setPharmacy(com.example.swastik.ui.viewmodel.CartType.PHARMACY, selectedFacility.id, selectedFacility.name)
                medicineViewModel.setDeliveryAddress(com.example.swastik.ui.viewmodel.CartType.PHARMACY, address)
                medicineViewModel.setPatientPhone(com.example.swastik.ui.viewmodel.CartType.PHARMACY, phone)
                if (!isRx) {
                    items.forEach { (item, orderQuantity) ->
                        val medicine = com.example.swastik.data.model.Medicine(
                            id = item.medicineId ?: item.id,
                            inventoryItemId = item.id,
                            name = item.displayName,
                            manufacturer = item.manufacturer ?: "Unknown",
                            price = item.price,
                            mrp = item.mrp,
                            requiresPrescription = item.requiresPrescription ?: false,
                            inStock = true,
                            stockCount = item.quantity ?: 0,
                            campaignPrice = item.campaignPrice,
                            campaignDiscountPct = item.campaignDiscountPct,
                            campaignId = item.campaignId,
                            campaignName = item.campaignName
                        )
                        medicineViewModel.addToCart(com.example.swastik.ui.viewmodel.CartType.PHARMACY, medicine, selectedFacility.id, selectedFacility.name)
                        medicineViewModel.updateCartQuantity(com.example.swastik.ui.viewmodel.CartType.PHARMACY, item.id, orderQuantity)
                    }
                }
                medicineViewModel.placeOrder(com.example.swastik.ui.viewmodel.CartType.PHARMACY, context, bitmap)
                showPharmacyBookingDialog = false
                onNavigateToOrders()
            }
        )
    }
}

// ══════════════════════════════════════════════════════════════
//  OVERVIEW TAB
// ══════════════════════════════════════════════════════════════
@OptIn(ExperimentalLayoutApi::class)
private fun LazyListScope.overviewTabContent(
    facility: MedicalFacility,
    isDark: Boolean,
    titleColor: Color,
    subtitleColor: Color,
    accentColor: Color,
    divColor: Color,
    cardBg: Color,
    facilityType: FacilityType,
    facilityId: String,
    context: android.content.Context,
    onOrderMedicineClick: () -> Unit = {},
    onBookTestClick: () -> Unit = {},
    onBookFitnessVisitClick: () -> Unit = {},
    fitnessBookingSubmitting: Boolean = false
) {
    val offsetY = (-24).dp

    // ── Hospital Info Chips ──
    item {
        val infoItems = buildList {
            facility.hospitalSubType?.let { add("🏥 $it") }
            facility.establishedYear?.takeIf { it > 0 }?.let { add("📅 Est. $it") }
            if (facility.is24Hours) add("🕐 24/7")
        }
        if (infoItems.isNotEmpty()) {
            LazyRow(
                modifier = Modifier.padding(horizontal = 16.dp).offset(y = offsetY),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(infoItems) { info ->
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = if (isDark) Color(0xFF1E293B) else Color(0xFFF1F5F9),
                        border = BorderStroke(0.5.dp, divColor)
                    ) {
                        Text(
                            text = info,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            color = subtitleColor,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                        )
                    }
                }
            }
        }
    }

    // ── Trust Badges (Emergency, Accreditations, ER Wait) ──
    item {
        TrustBadgesRow(
            facility = facility,
            isDark = isDark,
            modifier = Modifier.offset(y = offsetY)
        )
    }

    // ── About Section ──
    if (!facility.description.isNullOrBlank()) {
        item {
            var expanded by remember { mutableStateOf(false) }
            SectionCard(title = stringResource(R.string.about), isDark = isDark, modifier = Modifier.offset(y = offsetY)) {
                Text(
                    text = facility.description!!,
                    fontSize = 14.sp,
                    color = subtitleColor,
                    lineHeight = 22.sp,
                    maxLines = if (expanded) Int.MAX_VALUE else 3,
                    overflow = TextOverflow.Ellipsis
                )
                if (facility.description!!.length > 150) {
                    Text(
                        text = if (expanded) stringResource(R.string.show_less) else stringResource(R.string.read_more),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = accentColor,
                        modifier = Modifier
                            .clickable { expanded = !expanded }
                            .padding(top = 6.dp)
                    )
                }
            }
        }
    }

    // ── Pharmacy: Order Medicine ──
    if (facility.type == FacilityType.MEDICAL_STORE) {
        item {
            SectionCard(title = "Order Medicine", isDark = isDark, modifier = Modifier.offset(y = offsetY)) {
                Text(
                    text = "Upload your prescription or order medicines directly from ${facility.name}.",
                    fontSize = 14.sp,
                    color = subtitleColor,
                    lineHeight = 20.sp,
                    modifier = Modifier.padding(bottom = 14.dp)
                )
                Button(
                    onClick = onOrderMedicineClick,
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = accentColor)
                ) {
                    Icon(Icons.Default.ShoppingCart, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Order Medicine", fontWeight = FontWeight.Bold)
                }
            }
        }
    }

    // ── Diagnostic Center: Book Lab Test ──
    if (facility.type == FacilityType.DIAGNOSTIC_CENTER) {
        item {
            SectionCard(title = "Book Lab Test", isDark = isDark, modifier = Modifier.offset(y = offsetY)) {
                Text(
                    text = "Book tests at ${facility.name} or schedule a Home Sample Collection.",
                    fontSize = 14.sp,
                    color = subtitleColor,
                    lineHeight = 20.sp,
                    modifier = Modifier.padding(bottom = 14.dp)
                )
                Button(
                    onClick = onBookTestClick,
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = accentColor)
                ) {
                    Icon(Icons.Default.Science, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Book Lab Test", fontWeight = FontWeight.Bold)
                }
            }
        }
    }

    if (facility.type == FacilityType.FITNESS_CENTER) {
        item {
            SectionCard(title = "Book Gym Visit", isDark = isDark, modifier = Modifier.offset(y = offsetY)) {
                Text(
                    text = "Book a day-pass or trial visit at ${facility.name}. Your booking is created directly in the wellness backend.",
                    fontSize = 14.sp,
                    color = subtitleColor,
                    lineHeight = 20.sp,
                    modifier = Modifier.padding(bottom = 14.dp)
                )
                Button(
                    onClick = onBookFitnessVisitClick,
                    enabled = !fitnessBookingSubmitting,
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = accentColor)
                ) {
                    if (fitnessBookingSubmitting) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp),
                            strokeWidth = 2.dp,
                            color = Color.White
                        )
                    } else {
                        Icon(Icons.Default.FitnessCenter, contentDescription = null, modifier = Modifier.size(18.dp))
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(if (fitnessBookingSubmitting) "Booking..." else "Book Visit", fontWeight = FontWeight.Bold)
                }
            }
        }
    }

    // ── Health Alert ──
    item {
        Column(modifier = Modifier.offset(y = offsetY)) {
            Text(
                text = "Local Health Alerts",
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                color = titleColor,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp)
            )
            HealthAlertCard(isDark = isDark)
        }
    }

    // ── Bed Availability ──
    if (facility.totalBeds != null && facility.totalBeds > 0) {
        item {
            BedAvailabilityCard(
                facility = facility,
                isDark = isDark,
                modifier = Modifier.offset(y = offsetY)
            )
        }
    }

    // ── Premium Actions & Travel ──
    if (!facility.virtualTourUrl.isNullOrBlank() || (facility.latitude != 0.0 && facility.longitude != 0.0)) {
        item {
            Column(modifier = Modifier.offset(y = offsetY)) {
                Text(
                    text = "Travel & Location",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = titleColor,
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp)
                )
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    PremiumActionsRow(
                        facility = facility,
                        isDark = isDark,
                        modifier = Modifier.padding(vertical = 4.dp)
                    )

                    if (facility.latitude != 0.0 && facility.longitude != 0.0) {
                        Surface(
                            onClick = {
                                NavigationHelper.openDirections(
                                    context,
                                    facility.latitude,
                                    facility.longitude,
                                    facility.name
                                )
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 4.dp)
                                .padding(bottom = 8.dp),
                            shape = RoundedCornerShape(12.dp),
                            color = if (isDark) Color(0xFF1E293B) else Color(0xFFF8FAFC),
                            border = BorderStroke(1.dp, accentColor.copy(alpha = 0.5f))
                        ) {
                            Row(
                                modifier = Modifier.padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Center
                            ) {
                                Icon(Icons.Default.LocationOn, contentDescription = "Location", tint = accentColor)
                                Spacer(modifier = Modifier.width(12.dp))
                                Text(
                                    text = "View on Google Maps",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = accentColor
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // ── Floor Guide Map ──
    val floorGuideStr = try {
        val element = facility.floorGuideMapUrl
        if (element != null && element.isJsonPrimitive) element.asString else null
    } catch (e: Exception) { null }

    if (!floorGuideStr.isNullOrBlank()) {
        item {
            Surface(
                onClick = {
                    try {
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(floorGuideStr)))
                    } catch (_: Exception) {
                        Toast.makeText(context, "Cannot open floor guide", Toast.LENGTH_SHORT).show()
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp)
                    .offset(y = offsetY),
                shape = RoundedCornerShape(14.dp),
                color = if (isDark) Color(0xFF1E3A5F) else Color(0xFFDBEAFE),
                border = BorderStroke(1.dp, if (isDark) Color(0xFF334155) else Color(0xFFBFDBFE))
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Icon(Icons.Default.Map, contentDescription = null, tint = accentColor, modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(10.dp))
                    Text("Floor Guide Map", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = accentColor)
                }
            }
        }
    }

    // ── Departments / Test Categories ──
    if (facility.departments.isNotEmpty() && facility.type != FacilityType.MEDICAL_STORE) {
        item {
            val sectionTitle = when (facility.type) {
                FacilityType.DIAGNOSTIC_CENTER -> "Test Categories"
                FacilityType.FITNESS_CENTER -> "Classes & Programs"
                else -> stringResource(R.string.departments)
            }
            SectionCard(title = sectionTitle, isDark = isDark, modifier = Modifier.offset(y = offsetY)) {
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    facility.departments.forEach { dept ->
                        FacilityChip(name = dept, isDark = isDark)
                    }
                }
            }
        }
    }

    // ── Facilities / Amenities ──
    if (facility.facilities.isNotEmpty()) {
        item {
            val facilitiesTitle = if (facility.type == FacilityType.FITNESS_CENTER) {
                "Facilities, Equipment & Amenities"
            } else {
                stringResource(R.string.facilities)
            }
            SectionCard(title = facilitiesTitle, isDark = isDark, modifier = Modifier.offset(y = offsetY)) {
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    facility.facilities.forEach { f ->
                        FacilityChip(name = f, isDark = isDark)
                    }
                }
            }
        }
    }

    // ── Insurance Accepted ──
    if (facility.insuranceAccepted.isNotEmpty()) {
        item {
            SectionCard(title = stringResource(R.string.insurance_accepted), isDark = isDark, modifier = Modifier.offset(y = offsetY)) {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(facility.insuranceAccepted) { ins ->
                        FacilityChip(name = ins, isDark = isDark, icon = Icons.Default.Shield)
                    }
                }
            }
        }
    }

    // ── Diagnostic Specific Info ──
    if (facility.type == FacilityType.DIAGNOSTIC_CENTER && facility.homeCollectionAvailable) {
        item {
            SectionCard(title = "Home Sample Collection", isDark = isDark, modifier = Modifier.offset(y = offsetY)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Home, contentDescription = null, tint = accentColor)
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text("Available at your doorstep", fontWeight = FontWeight.Bold, color = titleColor)
                        if (facility.homeCollectionFee != null && facility.homeCollectionFee > 0.0) {
                            Text("Fee: ₹${facility.homeCollectionFee}", color = subtitleColor)
                        } else {
                            Text("Free collection", color = Color(0xFF059669))
                        }
                    }
                }
            }
        }
    }

    // Accreditations for Diagnostic Centers are already shown in TrustBadgesRow

    // ── Pharmacy Specific Info ──
    if (facility.type == FacilityType.MEDICAL_STORE && facility.deliveryAvailable) {
        item {
            SectionCard(title = "Home Delivery", isDark = isDark, modifier = Modifier.offset(y = offsetY)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.LocalShipping, contentDescription = null, tint = accentColor)
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text("Delivery Available", fontWeight = FontWeight.Bold, color = titleColor)
                        var details = ""
                        if (facility.minOrderDelivery != null && facility.minOrderDelivery > 0) details += "Min Order: ₹${facility.minOrderDelivery} "
                        if (facility.deliveryRadiusKm != null && facility.deliveryRadiusKm > 0.0) details += "• Up to ${facility.deliveryRadiusKm}km"
                        if (details.isNotBlank()) {
                            Text(details.trim(), color = subtitleColor, fontSize = 13.sp)
                        }
                    }
                }
            }
        }
    }

    // ── Associated Network ──
    if (!facility.associatedPharmacies.isNullOrEmpty() || !facility.associatedDiagnosticCenters.isNullOrEmpty()) {
        item {
            AssociatedNetworkSection(
                pharmacies = facility.associatedPharmacies,
                diagnostics = facility.associatedDiagnosticCenters,
                isDark = isDark
            )
        }
    }


    // ── Website ──
    if (!facility.websiteUrl.isNullOrBlank()) {
        item {
            Surface(
                onClick = {
                    try {
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(facility.websiteUrl)))
                    } catch (_: Exception) {}
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp)
                    .offset(y = offsetY),
                shape = RoundedCornerShape(12.dp),
                color = if (isDark) Color(0xFF1E293B) else Color(0xFFF1F5F9),
                border = BorderStroke(0.5.dp, if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0))
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Icon(Icons.Default.Language, contentDescription = null, tint = accentColor, modifier = Modifier.size(18.dp))
                    Text(
                        text = facility.websiteUrl!!,
                        fontSize = 13.sp,
                        color = accentColor,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                    Icon(Icons.Default.OpenInNew, contentDescription = null, tint = accentColor, modifier = Modifier.size(16.dp))
                }
            }
        }
    }
}

// ══════════════════════════════════════════════════════════════
//  DOCTORS TAB
// ══════════════════════════════════════════════════════════════
private fun LazyListScope.doctorsTabContent(
    facility: MedicalFacility,
    isDark: Boolean,
    titleColor: Color,
    subtitleColor: Color,
    accentColor: Color,
    onDoctorBookClick: (HospitalDoctor, MedicalFacility) -> Unit,
    context: android.content.Context
) {
    val offsetY = (-24).dp
    val isFitnessCenter = facility.type == FacilityType.FITNESS_CENTER
    val peopleLabel = if (isFitnessCenter) "Trainers" else "Doctors"

    if (facility.doctors.isEmpty()) {
        item {
            EmptyStateView(
                icon = Icons.Outlined.PersonSearch,
                title = "No $peopleLabel Listed",
                subtitle = if (isFitnessCenter) {
                    "This gym or studio hasn't listed attached trainers yet"
                } else {
                    "This facility hasn't listed any doctors yet"
                },
                isDark = isDark,
                modifier = Modifier.offset(y = offsetY)
            )
        }
        return
    }

    // Doctor count header
    item {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .offset(y = offsetY),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = "Available $peopleLabel",
                fontWeight = FontWeight.Bold,
                fontSize = 17.sp,
                color = titleColor
            )
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = if (isDark) Color(0xFF1E3A5F) else Color(0xFFDBEAFE)
            ) {
                Text(
                    text = "${facility.doctors.size} $peopleLabel",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = accentColor,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp)
                )
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
    }

    items(facility.doctors) { doctor ->
        DoctorCard(
            doctor = doctor,
            isDark = isDark,
            onBookClick = { onDoctorBookClick(doctor, facility) },
            onIntroClick = if (!doctor.introVideoUrl.isNullOrBlank()) {
                {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(doctor.introVideoUrl))
                    intent.setDataAndType(Uri.parse(doctor.introVideoUrl), "video/*")
                    try { context.startActivity(intent) }
                    catch (_: Exception) {
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(doctor.introVideoUrl)))
                    }
                }
            } else null,
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp)
        )
    }
}

// ══════════════════════════════════════════════════════════════
//  REVIEWS TAB
// ══════════════════════════════════════════════════════════════
private fun LazyListScope.reviewsTabContent(
    facility: MedicalFacility,
    reviews: List<Review>,
    reviewsLoading: Boolean,
    reviewSubmitting: Boolean,
    reviewSuccess: Boolean,
    reviewError: String?,
    isLoggedIn: Boolean,
    isDark: Boolean,
    titleColor: Color,
    subtitleColor: Color,
    accentColor: Color,
    divColor: Color,
    cardBg: Color,
    facilityType: FacilityType,
    facilityId: String,
    viewModel: FacilityDetailViewModel
) {
    val offsetY = (-24).dp

    // ── Rating Summary ──
    item {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .offset(y = offsetY),
            shape = RoundedCornerShape(16.dp),
            color = cardBg,
            shadowElevation = 2.dp
        ) {
            Row(
                modifier = Modifier.padding(20.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(end = 24.dp)
                ) {
                    Text(
                        text = String.format(Locale.US, "%.1f", facility.rating),
                        fontWeight = FontWeight.Bold,
                        fontSize = 40.sp,
                        color = titleColor
                    )
                    Row {
                        repeat(5) { i ->
                            Icon(
                                if (i < facility.rating.toInt()) Icons.Default.Star else Icons.Outlined.StarOutline,
                                contentDescription = null,
                                tint = SwastikOrange,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "${facility.reviewCount} reviews",
                        fontSize = 13.sp,
                        color = subtitleColor
                    )
                }

                // Distribution bars (from reviews data)
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    for (stars in 5 downTo 1) {
                        val count = reviews.count { it.rating == stars }
                        val pct = if (reviews.isNotEmpty()) count.toFloat() / reviews.size else 0f
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("$stars", fontSize = 12.sp, color = subtitleColor, modifier = Modifier.width(14.dp))
                            Icon(Icons.Default.Star, contentDescription = null, tint = SwastikOrange, modifier = Modifier.size(12.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            LinearProgressIndicator(
                                progress = { pct.coerceIn(0f, 1f) },
                                modifier = Modifier
                                    .weight(1f)
                                    .height(6.dp)
                                    .clip(RoundedCornerShape(3.dp)),
                                color = SwastikOrange,
                                trackColor = divColor
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("$count", fontSize = 11.sp, color = subtitleColor, modifier = Modifier.width(20.dp))
                        }
                    }
                }
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
    }

    // ── Write a Review ──
    if (isLoggedIn) {
        item {
            var selectedRating by remember { mutableIntStateOf(0) }
            var reviewComment by remember { mutableStateOf("") }

            LaunchedEffect(reviewSuccess) {
                if (reviewSuccess) {
                    selectedRating = 0
                    reviewComment = ""
                    viewModel.clearReviewState()
                }
            }

            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .offset(y = offsetY),
                shape = RoundedCornerShape(16.dp),
                color = cardBg,
                shadowElevation = 1.dp
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        "Write a Review",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = titleColor
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    // Star rating selector
                    Row(
                        horizontalArrangement = Arrangement.Center,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        repeat(5) { i ->
                            IconButton(
                                onClick = { selectedRating = i + 1 },
                                modifier = Modifier.size(40.dp)
                            ) {
                                Icon(
                                    if (i < selectedRating) Icons.Default.Star else Icons.Outlined.StarOutline,
                                    contentDescription = "Star ${i + 1}",
                                    tint = SwastikOrange,
                                    modifier = Modifier.size(32.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = reviewComment,
                        onValueChange = { reviewComment = it },
                        placeholder = { Text("Share your experience (optional)", fontSize = 13.sp, color = subtitleColor) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = accentColor,
                            unfocusedBorderColor = divColor,
                            focusedContainerColor = if (isDark) Color(0xFF1E293B) else Color(0xFFF8FAFC),
                            unfocusedContainerColor = if (isDark) Color(0xFF1E293B) else Color(0xFFF8FAFC),
                            focusedTextColor = titleColor,
                            unfocusedTextColor = titleColor
                        ),
                        minLines = 2,
                        maxLines = 4
                    )

                    if (reviewError != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(reviewError, fontSize = 12.sp, color = Color(0xFFDC2626))
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    Button(
                        onClick = {
                            if (selectedRating > 0) {
                                val typeStr = when (facilityType) {
                                    FacilityType.CLINIC -> "clinic"
                                    FacilityType.MEDICAL_STORE -> "pharmacy"
                                    FacilityType.DIAGNOSTIC_CENTER -> "diagnostic_center"
                                    FacilityType.FITNESS_CENTER -> "fitness_center"
                                    else -> "hospital"
                                }
                                viewModel.submitFacilityReview(
                                    typeStr,
                                    facilityId,
                                    selectedRating,
                                    reviewComment.ifBlank { null }
                                )
                            }
                        },
                        enabled = selectedRating > 0 && !reviewSubmitting,
                        modifier = Modifier.fillMaxWidth().height(46.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = accentColor)
                    ) {
                        if (reviewSubmitting) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                strokeWidth = 2.dp,
                                color = Color.White
                            )
                        } else {
                            Text("Submit Review", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
        }
    }

    // ── Review List ──
    if (reviewsLoading) {
        item {
            Box(
                modifier = Modifier.fillMaxWidth().padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = accentColor, modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
            }
        }
    } else if (reviews.isEmpty()) {
        item {
            EmptyStateView(
                icon = Icons.Outlined.RateReview,
                title = "No Reviews Yet",
                subtitle = "Be the first to share your experience",
                isDark = isDark,
                modifier = Modifier.offset(y = offsetY)
            )
        }
    } else {
        items(reviews) { review ->
            ReviewCard(
                review = review,
                isDark = isDark,
                titleColor = titleColor,
                subtitleColor = subtitleColor,
                accentColor = accentColor,
                divColor = divColor,
                cardBg = cardBg,
                modifier = Modifier.offset(y = offsetY)
            )
        }
    }
}

// ══════════════════════════════════════════════════════════════
//  PHOTOS TAB
// ══════════════════════════════════════════════════════════════
private fun LazyListScope.photosTabContent(
    images: List<String>,
    facilityName: String,
    isDark: Boolean,
    titleColor: Color,
    subtitleColor: Color,
    context: android.content.Context
) {
    val offsetY = (-24).dp

    if (images.isEmpty()) {
        item {
            EmptyStateView(
                icon = Icons.Outlined.PhotoLibrary,
                title = "No Photos Available",
                subtitle = "Photos will appear here once uploaded",
                isDark = isDark,
                modifier = Modifier.offset(y = offsetY)
            )
        }
        return
    }

    item {
        Text(
            text = "${images.size} Photos",
            fontWeight = FontWeight.Bold,
            fontSize = 17.sp,
            color = titleColor,
            modifier = Modifier
                .padding(horizontal = 16.dp, vertical = 8.dp)
                .offset(y = offsetY)
        )
    }

    // Photo grid (2 columns)
    val rows = images.chunked(2)
    items(rows) { rowImages ->
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 4.dp)
                .offset(y = offsetY),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            rowImages.forEach { imageUrl ->
                AsyncImage(
                    model = ImageRequest.Builder(context)
                        .data(imageUrl)
                        .crossfade(true)
                        .build(),
                    contentDescription = facilityName,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .weight(1f)
                        .height(180.dp)
                        .clip(RoundedCornerShape(12.dp))
                )
            }
            // If odd number, fill the last cell
            if (rowImages.size == 1) {
                Spacer(modifier = Modifier.weight(1f))
            }
        }
    }
}

// ══════════════════════════════════════════════════════════════
//  VIDEOS TAB
// ══════════════════════════════════════════════════════════════
private fun LazyListScope.videosTabContent(
    reels: List<HospitalReel>,
    isDark: Boolean,
    context: android.content.Context
) {
    val offsetY = (-24).dp
    val titleColor = if (isDark) Color(0xFFF1F5F9) else Color(0xFF0F172A)

    if (reels.isEmpty()) {
        item {
            EmptyStateView(
                icon = Icons.Outlined.VideoLibrary,
                title = "No Videos Available",
                subtitle = "Hospital tour videos will appear here",
                isDark = isDark,
                modifier = Modifier.offset(y = offsetY)
            )
        }
        return
    }

    item {
        Text(
            text = "${reels.size} Videos",
            fontWeight = FontWeight.Bold,
            fontSize = 17.sp,
            color = titleColor,
            modifier = Modifier
                .padding(horizontal = 16.dp, vertical = 8.dp)
                .offset(y = offsetY)
        )
    }

    items(reels) { reel ->
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 4.dp)
                .offset(y = offsetY),
            shape = RoundedCornerShape(14.dp),
            color = if (isDark) Color(0xFF1E293B) else Color(0xFFF1F5F9)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable {
                        if (reel.videoUrl.isNotEmpty()) {
                            try {
                                context.startActivity(
                                    Intent(Intent.ACTION_VIEW, Uri.parse(reel.videoUrl))
                                )
                            } catch (_: Exception) {}
                        }
                    }
                    .padding(10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Thumbnail
                Box(
                    modifier = Modifier
                        .size(90.dp, 70.dp)
                        .clip(RoundedCornerShape(10.dp))
                ) {
                    if (reel.thumbnailUrl != null) {
                        AsyncImage(
                            model = ImageRequest.Builder(context)
                                .data(reel.thumbnailUrl)
                                .crossfade(true)
                                .build(),
                            contentDescription = reel.title,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )
                    } else {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Color.Gray.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.Videocam,
                                contentDescription = null,
                                tint = titleColor.copy(alpha = 0.4f),
                                modifier = Modifier.size(30.dp)
                            )
                        }
                    }
                    // Play overlay
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.25f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.PlayCircle,
                            contentDescription = "Play",
                            tint = Color.White,
                            modifier = Modifier.size(32.dp)
                        )
                    }
                }

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = reel.title ?: "Hospital Tour",
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp,
                        color = titleColor,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    reel.createdAt?.let { date ->
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = date,
                            fontSize = 12.sp,
                            color = if (isDark) Color(0xFF94A3B8) else Color(0xFF64748B)
                        )
                    }
                }
            }
        }
    }
}

// ══════════════════════════════════════════════════════════════
//  REUSABLE COMPONENTS — Premium Quick Action Button
// ══════════════════════════════════════════════════════════════
@Composable
private fun PremiumQuickAction(
    icon: ImageVector,
    label: String,
    color: Color,
    bgColor: Color,
    isDark: Boolean,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Surface(
            shape = CircleShape,
            color = if (isDark) color.copy(alpha = 0.15f) else bgColor,
            modifier = Modifier.size(50.dp)
        ) {
            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                Icon(icon, contentDescription = label, tint = color, modifier = Modifier.size(22.dp))
            }
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            label,
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            color = if (isDark) Color(0xFFCBD5E1) else Color(0xFF475569),
            maxLines = 1
        )
    }
}

// ══════════════════════════════════════════════════════════════
//  REVIEW CARD
// ══════════════════════════════════════════════════════════════
@Composable
private fun ReviewCard(
    review: Review,
    isDark: Boolean,
    titleColor: Color,
    subtitleColor: Color,
    accentColor: Color,
    divColor: Color,
    cardBg: Color,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp),
        shape = RoundedCornerShape(14.dp),
        color = cardBg,
        shadowElevation = 1.dp
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                // Avatar
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .background(accentColor.copy(alpha = 0.1f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = (review.patient?.name ?: "A").take(1).uppercase(),
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = accentColor
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(
                            text = review.patient?.name ?: stringResource(R.string.anonymous),
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                            color = titleColor
                        )
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = accentColor.copy(alpha = 0.1f)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(2.dp)
                            ) {
                                Icon(
                                    Icons.Default.Verified,
                                    contentDescription = null,
                                    tint = accentColor,
                                    modifier = Modifier.size(10.dp)
                                )
                                Text("Verified", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = accentColor)
                            }
                        }
                    }

                    // Stars
                    Row(modifier = Modifier.padding(vertical = 3.dp)) {
                        repeat(5) { i ->
                            Icon(
                                if (i < review.rating) Icons.Default.Star else Icons.Outlined.StarOutline,
                                contentDescription = null,
                                tint = SwastikOrange,
                                modifier = Modifier.size(14.dp)
                            )
                        }
                    }

                    // Comment
                    if (!review.comment.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = review.comment,
                            fontSize = 13.sp,
                            color = subtitleColor,
                            lineHeight = 19.sp
                        )

                        // Auto-generated tags from comment content
                        val commentLower = review.comment.lowercase()
                        val tags = buildList {
                            if (commentLower.contains("clean") || commentLower.contains("hygien") || commentLower.contains("neat")) add("Cleanliness")
                            if (commentLower.contains("doctor") || commentLower.contains("care") || commentLower.contains("treatment")) add("Good Care")
                            if (commentLower.contains("fast") || commentLower.contains("quick") || commentLower.contains("time")) add("Prompt Service")
                            if (commentLower.contains("staff") || commentLower.contains("polite") || commentLower.contains("help")) add("Cooperative Staff")
                            if (review.rating >= 4 && isEmpty()) add("Recommended")
                        }
                        if (tags.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(6.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                tags.forEach { tag ->
                                    Surface(
                                        shape = RoundedCornerShape(6.dp),
                                        color = if (isDark) Color(0xFF1E293B) else Color(0xFFF1F5F9),
                                        border = BorderStroke(0.5.dp, divColor)
                                    ) {
                                        Text(
                                            text = "#$tag",
                                            fontSize = 10.sp,
                                            color = subtitleColor,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ══════════════════════════════════════════════════════════════
//  INVENTORY TAB
// ══════════════════════════════════════════════════════════════
private fun LazyListScope.inventoryTabContent(
    facility: MedicalFacility,
    inventoryItems: List<com.example.swastik.data.remote.dto.PharmacyInventoryItemDto>,
    isInventoryLoading: Boolean,
    isDark: Boolean,
    titleColor: Color,
    subtitleColor: Color,
    accentColor: Color,
    context: android.content.Context,
    onAddToCart: () -> Unit,
    onSearch: (String) -> Unit
) {
    item {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
        ) {
            // Search Bar
            var searchQuery by remember { mutableStateOf("") }
            
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { 
                    searchQuery = it
                    onSearch(it)
                },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text(stringResource(R.string.search_medicines), color = subtitleColor) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = accentColor) },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = accentColor,
                    unfocusedBorderColor = if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0),
                    focusedTextColor = titleColor,
                    unfocusedTextColor = titleColor
                ),
                shape = RoundedCornerShape(12.dp),
                singleLine = true
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            if (isInventoryLoading) {
                Box(modifier = Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = accentColor)
                }
            } else if (inventoryItems.isEmpty()) {
                Box(modifier = Modifier.fillMaxWidth().height(150.dp), contentAlignment = Alignment.Center) {
                    Text(stringResource(R.string.no_medicines_found), color = subtitleColor)
                }
            } else {
                inventoryItems.forEach { item ->
                    PharmacyInventoryCard(
                        item = item,
                        isDarkMode = isDark,
                        onAddToCart = onAddToCart
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                }
            }
        }
    }
}

// ══════════════════════════════════════════════════════════════
//  TESTS TAB
// ══════════════════════════════════════════════════════════════
private fun LazyListScope.testsTabContent(
    facility: MedicalFacility,
    isDark: Boolean,
    titleColor: Color,
    subtitleColor: Color,
    accentColor: Color,
    context: android.content.Context,
    onBookTest: () -> Unit
) {
    item {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
        ) {
            Text(
                text = "Available Tests",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = titleColor,
                modifier = Modifier.padding(bottom = 16.dp)
            )
            
            if (facility.tests.isNotEmpty()) {
                facility.tests.forEach { test ->
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (isDark) Color(0xFF1E293B) else Color(0xFFF8FAFC)
                        ),
                        border = BorderStroke(1.dp, if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.Science,
                                    contentDescription = null,
                                    tint = accentColor,
                                    modifier = Modifier.size(24.dp)
                                )
                                Spacer(modifier = Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = test.name,
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = titleColor
                                    )
                                    test.category?.let { cat ->
                                        Text(
                                            text = cat,
                                            fontSize = 12.sp,
                                            color = accentColor,
                                            fontWeight = FontWeight.SemiBold
                                        )
                                    }
                                }
                                Text(
                                    text = test.price?.let { "₹$it" } ?: "Price on request",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (test.price != null) titleColor else subtitleColor
                                )
                            }
                            if (test.description != null || test.preparationInstructions != null) {
                                Spacer(modifier = Modifier.height(12.dp))
                                HorizontalDivider(color = if (isDark) Color(0xFF1E293B) else Color(0xFFE8ECF1), thickness = 0.5.dp)
                                Spacer(modifier = Modifier.height(12.dp))
                                test.description?.let { desc ->
                                    Text(text = desc, fontSize = 13.sp, color = subtitleColor)
                                    Spacer(modifier = Modifier.height(4.dp))
                                }
                                test.preparationInstructions?.let { prep ->
                                    Text(text = "Prep: $prep", fontSize = 13.sp, color = subtitleColor, fontStyle = androidx.compose.ui.text.font.FontStyle.Italic)
                                }
                                test.reportTime?.let { time ->
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.Schedule, contentDescription = null, tint = accentColor, modifier = Modifier.size(14.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text(text = "Report: $time", fontSize = 13.sp, color = subtitleColor)
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                Box(modifier = Modifier.fillMaxWidth().height(150.dp), contentAlignment = Alignment.Center) {
                    Text("No tests available", color = subtitleColor)
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Button(
                onClick = onBookTest,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = accentColor),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.Science, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Book a Test", fontSize = 16.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
internal fun PharmacyInventoryCard(
    item: com.example.swastik.data.remote.dto.PharmacyInventoryItemDto,
    isDarkMode: Boolean,
    onAddToCart: () -> Unit = {}
) {
    val textColor = if (isDarkMode) Color.White else Color.Black
    val cardColor = if (isDarkMode) MaterialTheme.colorScheme.surfaceVariant else Color(0xFFE2F0FC)
    var showAdded by remember { mutableStateOf(false) }

    LaunchedEffect(showAdded) {
        if (showAdded) {
            delay(1500)
            showAdded = false
        }
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = cardColor),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .background(
                        if (item.inStock) Color(0xFF4CAF50).copy(alpha = 0.1f)
                        else Color(0xFFE53935).copy(alpha = 0.1f),
                        RoundedCornerShape(10.dp)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.Medication,
                    contentDescription = null,
                    tint = if (item.inStock) Color(0xFF4CAF50) else Color(0xFFE53935),
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        item.displayName,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp,
                        color = textColor,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                    if (item.requiresPrescription == true) {
                        Spacer(modifier = Modifier.width(6.dp))
                        Box(
                            modifier = Modifier
                                .background(Color(0xFFFF9800).copy(alpha = 0.1f), RoundedCornerShape(4.dp))
                                .padding(horizontal = 4.dp, vertical = 2.dp)
                        ) {
                            Text(stringResource(R.string.rx), fontSize = 9.sp, color = Color(0xFFFF9800), fontWeight = FontWeight.Bold)
                        }
                    }
                }
                if (item.manufacturer != null) {
                    Text(item.manufacturer, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (item.category != null) {
                        Text(item.category, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(stringResource(R.string.string_1), fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Text(
                        "Stock: ${item.quantity ?: 0} ${item.unit ?: "units"}",
                        fontSize = 11.sp,
                        color = if (item.inStock) Color(0xFF4CAF50) else Color(0xFFE53935)
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    item.effectivePrice.let { if (item.price != null) "₹$it" else "Price unavailable" },
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = textColor
                )
                val strikePrice = when {
                    item.hasActiveCampaign -> item.price
                    else -> item.mrp
                }
                if (strikePrice != null && strikePrice > item.effectivePrice) {
                    Text(
                        if (item.hasActiveCampaign) "₹$strikePrice" else "MRP ₹$strikePrice",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textDecoration = TextDecoration.LineThrough
                    )
                }
                if (item.discountPercentage > 0) {
                    Text(
                        "${item.discountPercentage.toInt()}% OFF",
                        fontSize = 10.sp,
                        color = Color(0xFF2E7D32),
                        fontWeight = FontWeight.Bold
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                if (item.inStock) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(
                                if (showAdded) Color(0xFF4CAF50) else SwastikPrimary
                            )
                            .clickable {
                                onAddToCart()
                                showAdded = true
                            }
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                if (showAdded) Icons.Default.Check else Icons.Default.AddShoppingCart,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onPrimary,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                if (showAdded) "Added" else stringResource(R.string.add),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onPrimary
                            )
                        }
                    }
                } else {
                    Text(
                        stringResource(R.string.out_of_stock),
                        fontSize = 12.sp,
                        color = Color(0xFFE53935),
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                }
            }
        }
    }
}
