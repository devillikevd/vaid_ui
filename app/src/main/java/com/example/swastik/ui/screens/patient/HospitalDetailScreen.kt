package com.example.swastik.ui.screens.patient

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.example.swastik.R
import com.example.swastik.data.model.*
import com.example.swastik.ui.components.*
import com.example.swastik.ui.screens.patient.components.shimmerEffect
import com.example.swastik.ui.theme.SwastikOrange
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.ui.viewmodel.HospitalDetailViewModel
import com.example.swastik.utils.NavigationHelper
import android.Manifest
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import java.util.Locale
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.foundation.lazy.rememberLazyListState

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class, ExperimentalFoundationApi::class)
@Composable
fun HospitalDetailScreen(
    facilityId: String,
    facilityType: FacilityType = FacilityType.HOSPITAL,
    onBackClick: () -> Unit,
    onDoctorBookClick: (HospitalDoctor, MedicalFacility) -> Unit = { _, _ -> },
    isLoggedIn: Boolean = true,
    viewModel: HospitalDetailViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val colorScheme = MaterialTheme.colorScheme
    val isDark = colorScheme.surface.luminance() < 0.5f

    val currentFacilityType = uiState.facility?.type ?: facilityType
    val isPharmacy = currentFacilityType == FacilityType.MEDICAL_STORE
    val isDiagnostic = currentFacilityType == FacilityType.DIAGNOSTIC_CENTER

    val bgColor = if (isDark) Color(0xFF0F172A) else Color(0xFFF8FAFC)
    val titleColor = if (isDark) Color(0xFFF1F5F9) else Color(0xFF0F172A)
    val subtitleColor = if (isDark) Color(0xFF94A3B8) else Color(0xFF64748B)
    val tertiaryColor = if (isDark) Color(0xFF64748B) else Color(0xFF94A3B8)
    val accentColor = if (isDark) Color(0xFF60A5FA) else Color(0xFF2563EB)
    val divColor = if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0)

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

    LaunchedEffect(facilityId, facilityType) {
        viewModel.loadFacilityDetails(facilityId, facilityType)
    }

    Scaffold(
        containerColor = bgColor,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        uiState.facility?.name ?: when (facilityType) {
                            FacilityType.CLINIC -> stringResource(R.string.clinic)
                            FacilityType.DIAGNOSTIC_CENTER -> stringResource(R.string.diagnostic_center)
                            FacilityType.MEDICAL_STORE -> stringResource(R.string.pharmacy)
                            else -> stringResource(R.string.hospitals)
                        },
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        color = titleColor
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.back))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = bgColor, navigationIconContentColor = titleColor)
            )
        }
    ) { paddingValues ->
        when {
            uiState.isLoading -> {
                HospitalDetailShimmerSkeleton(modifier = Modifier.padding(paddingValues), isDark = isDark)
            }

            uiState.error != null -> {
                Column(
                    modifier = Modifier.fillMaxSize().padding(paddingValues).padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(Icons.Default.Error, contentDescription = null, tint = colorScheme.error, modifier = Modifier.size(48.dp))
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(uiState.error!!, textAlign = TextAlign.Center, color = titleColor)
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(
                        onClick = { viewModel.loadFacilityDetails(facilityId, facilityType) },
                        colors = ButtonDefaults.buttonColors(containerColor = accentColor)
                    ) {
                        Text(stringResource(R.string.retry))
                    }
                }
            }

            uiState.facility != null -> {
                val facility = uiState.facility!!
                val listState = rememberLazyListState()
                var doctorSearchQuery by remember { mutableStateOf("") }

                LazyColumn(
                    state = listState,
                    modifier = Modifier.fillMaxSize().padding(paddingValues),
                    verticalArrangement = Arrangement.spacedBy(0.dp)
                ) {

                    // ─── 1. IMAGE HEADER (PARALLAX) ──────────────────────────────
                    item {
                        val headerImage = facility.imageUrl ?: facility.images.firstOrNull()
                        val scrollOffset = if (listState.firstVisibleItemIndex == 0) {
                            listState.firstVisibleItemScrollOffset.toFloat()
                        } else { 600f }

                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(220.dp)
                                .padding(horizontal = 16.dp)
                                .graphicsLayer {
                                    translationY = scrollOffset * 0.4f
                                    alpha = (1f - (scrollOffset / 600f)).coerceIn(0.2f, 1f)
                                }
                                .clip(RoundedCornerShape(16.dp))
                        ) {
                            if (headerImage != null) {
                                AsyncImage(
                                    model = ImageRequest.Builder(context).data(headerImage).crossfade(true).build(),
                                    contentDescription = facility.name,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.fillMaxSize()
                                )
                            } else {
                                Box(
                                    modifier = Modifier.fillMaxSize().background(
                                        Brush.linearGradient(listOf(accentColor, accentColor.copy(alpha = 0.7f)))
                                    ),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(facility.type.getMarkerIcon(), contentDescription = null, tint = Color.White, modifier = Modifier.size(64.dp))
                                }
                            }
                            Box(
                                modifier = Modifier.fillMaxWidth().height(80.dp).align(Alignment.BottomCenter).background(
                                    Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.6f)))
                                )
                            )
                            if (facility.rating > 0f) {
                                Surface(
                                    modifier = Modifier.align(Alignment.BottomEnd).padding(12.dp),
                                    shape = RoundedCornerShape(8.dp),
                                    color = Color.White,
                                    shadowElevation = 4.dp
                                ) {
                                    Row(modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.Star, contentDescription = null, tint = SwastikOrange, modifier = Modifier.size(14.dp))
                                        Spacer(modifier = Modifier.width(2.dp))
                                        Text("${facility.rating}", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF0F172A))
                                        Text(" (${facility.reviewCount})", fontSize = 11.sp, color = Color(0xFF64748B))
                                    }
                                }
                            }
                            if (facility.images.size > 1) {
                                Surface(
                                    modifier = Modifier.align(Alignment.BottomStart).padding(12.dp),
                                    shape = RoundedCornerShape(8.dp),
                                    color = Color.Black.copy(alpha = 0.6f)
                                ) {
                                    Row(modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.PhotoLibrary, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("${facility.images.size} Photos", fontSize = 11.sp, color = Color.White, fontWeight = FontWeight.Medium)
                                    }
                                }
                            }
                        }
                    }

                    // ─── 2. NAME & INFO HEADER ───────────────────────────────
                    item {
                        Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
                            Text(text = facility.name, fontWeight = FontWeight.Bold, fontSize = 22.sp, color = titleColor, lineHeight = 28.sp)
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                if (facility.hospitalSubType != null) {
                                    Surface(shape = RoundedCornerShape(4.dp), color = if (isDark) Color(0xFF1E3A5F) else Color(0xFFDBEAFE)) {
                                        Text(text = facility.hospitalSubType, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = accentColor, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                    }
                                    Spacer(modifier = Modifier.width(8.dp))
                                }
                                if (facility.establishedYear != null && facility.establishedYear > 0) {
                                    Text(text = "Est. ${facility.establishedYear}", fontSize = 12.sp, color = subtitleColor)
                                    Spacer(modifier = Modifier.width(8.dp))
                                }
                                if (facility.distanceKm > 0) {
                                    Icon(Icons.Outlined.LocationOn, contentDescription = null, tint = subtitleColor, modifier = Modifier.size(14.dp))
                                    Text(facility.distance, fontSize = 12.sp, color = subtitleColor)
                                }
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Outlined.LocationOn, contentDescription = null, tint = tertiaryColor, modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(text = facility.address, fontSize = 13.sp, color = subtitleColor, maxLines = 2, overflow = TextOverflow.Ellipsis)
                            }
                        }
                    }

                    // ─── 3. TRUST BADGES ─────────────────────────────
                    item {
                        TrustBadgesRow(facility = facility, isDark = isDark)
                    }

                    // ─── 4. QUICK ACTIONS ─────────────────────────────
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            QuickActionButton(icon = Icons.Default.Call, label = stringResource(R.string.call), color = if (isDark) Color(0xFF34D399) else Color(0xFF059669), onClick = {
                                if (facility.phone.isNotBlank()) NavigationHelper.openDialer(context, facility.phone)
                            })
                            QuickActionButton(icon = Icons.Default.Directions, label = stringResource(R.string.directions), color = Color(0xFF2563EB), onClick = {
                                NavigationHelper.openDirections(context, facility.latitude, facility.longitude, facility.name)
                            })
                            QuickActionButton(icon = Icons.Default.Chat, label = "WhatsApp", color = Color(0xFF25D366), onClick = {
                                if (facility.phone.isNotBlank()) {
                                    val cleanPhone = facility.phone.filter { it.isDigit() }
                                    try { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/91$cleanPhone"))) }
                                    catch (e: Exception) { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("sms:${facility.phone}"))) }
                                } else { Toast.makeText(context, "Phone number not available", Toast.LENGTH_SHORT).show() }
                            })
                            if (facility.isEmergencyAvailable && facility.type != FacilityType.MEDICAL_STORE && facility.type != FacilityType.DIAGNOSTIC_CENTER) {
                                QuickActionButton(icon = Icons.Default.Warning, label = stringResource(R.string.sos_1), color = Color(0xFFDC2626), onClick = {
                                    if (uiState.sosCooldownRemaining > 0L) {
                                        Toast.makeText(context, "SOS cooldown: ${uiState.sosCooldownRemaining}s remaining", Toast.LENGTH_SHORT).show()
                                    } else {
                                        locationPermissionLauncher.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
                                    }
                                }, isLoading = uiState.sosRequesting)
                            }
                            QuickActionButton(
                                icon = if (!facility.websiteUrl.isNullOrBlank()) Icons.Default.Language else Icons.Default.Share,
                                label = if (!facility.websiteUrl.isNullOrBlank()) stringResource(R.string.website) else stringResource(R.string.share),
                                color = Color(0xFF7C3AED),
                                onClick = {
                                    if (!facility.websiteUrl.isNullOrBlank()) {
                                        try { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(facility.websiteUrl))) } catch (_: Exception) {}
                                    } else {
                                        val shareIntent = Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_TEXT, "${facility.name}\n${facility.address}\nPhone: ${facility.phone}") }
                                        context.startActivity(Intent.createChooser(shareIntent, "Share"))
                                    }
                                }
                            )
                        }
                    }

                    // ─── DIVIDER ──────────────────────────────────────
                    item { HorizontalDivider(color = divColor, modifier = Modifier.padding(horizontal = 16.dp)) }

                    // ─── 5. ABOUT SECTION ─────────────────────────────
                    if (!facility.description.isNullOrBlank()) {
                        item {
                            var expanded by remember { mutableStateOf(false) }
                            SectionCard(title = stringResource(R.string.about), isDark = isDark) {
                                Text(text = facility.description!!, fontSize = 14.sp, color = subtitleColor, lineHeight = 21.sp, maxLines = if (expanded) Int.MAX_VALUE else 3, overflow = TextOverflow.Ellipsis)
                                if (facility.description!!.length > 150) {
                                    Text(text = if (expanded) stringResource(R.string.show_less) else stringResource(R.string.read_more), fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = accentColor, modifier = Modifier.clickable { expanded = !expanded }.padding(top = 4.dp))
                                }
                            }
                        }
                    }

                    // ─── PHARMACY MEDICINES & ORDERING ──────────────────────
                    if (facility.type == FacilityType.MEDICAL_STORE) {
                        item {
                            SectionCard(title = "Order Medicine", isDark = isDark) {
                                Column(modifier = Modifier.fillMaxWidth()) {
                                    Text(text = "Upload your prescription or order medicines directly from ${facility.name}. Get fast delivery to your location.", fontSize = 14.sp, color = subtitleColor, lineHeight = 20.sp, modifier = Modifier.padding(bottom = 16.dp))
                                    Button(onClick = { /* TODO: Open Order Medicine Flow */ }, modifier = Modifier.fillMaxWidth().height(50.dp), shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = accentColor)) {
                                        Icon(imageVector = Icons.Default.ShoppingCart, contentDescription = "Order Medicine", modifier = Modifier.size(20.dp))
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(text = "Order Medicine", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }

                    // ─── DIAGNOSTIC CENTER BOOK LAB TEST ──────────────────────
                    if (facility.type == FacilityType.DIAGNOSTIC_CENTER) {
                        item {
                            SectionCard(title = "Book Lab Test", isDark = isDark) {
                                Column(modifier = Modifier.fillMaxWidth()) {
                                    Text(text = "Book tests at ${facility.name} or schedule a Home Sample Collection. Get accurate results delivered to your phone.", fontSize = 14.sp, color = subtitleColor, lineHeight = 20.sp, modifier = Modifier.padding(bottom = 16.dp))
                                    Button(onClick = { /* TODO: Open Book Lab Test Flow */ }, modifier = Modifier.fillMaxWidth().height(50.dp), shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = accentColor)) {
                                        Icon(imageVector = Icons.Default.Science, contentDescription = "Book Lab Test", modifier = Modifier.size(20.dp))
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(text = "Book Lab Test", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }

                    // ─── 5.4 HOSPITAL REELS ──────────────────────────────────
                    if (facility.reels.isNotEmpty()) {
                        item {
                            HospitalReelsSection(reels = facility.reels, modifier = Modifier.padding(vertical = 12.dp), isDark = isDark)
                        }
                    }

                    // ─── 5.5 PREMIUM FEATURES + FLOOR GUIDE MAP ────────────────
                    if (!facility.virtualTourUrl.isNullOrBlank() || !facility.floorGuideMapUrl.isNullOrBlank() || facility.type == FacilityType.HOSPITAL) {
                        item {
                            PremiumActionsRow(facility = facility, modifier = Modifier.padding(vertical = 8.dp), isDark = isDark)

                            if (!facility.floorGuideMapUrl.isNullOrBlank()) {
                                Spacer(modifier = Modifier.height(8.dp))
                                Surface(
                                    onClick = {
                                        try { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(facility.floorGuideMapUrl))) }
                                        catch (_: Exception) { Toast.makeText(context, "Cannot open floor guide", Toast.LENGTH_SHORT).show() }
                                    },
                                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
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
                    }

                    // ─── 6. BED AVAILABILITY ─────────────────────────
                    if (facility.totalBeds != null && facility.totalBeds > 0) {
                        item {
                            BedAvailabilityCard(facility = facility, isDark = isDark)
                        }
                    }

                    // ─── 7. FACILITIES GRID ──────────────────────────
                    if (facility.facilities.isNotEmpty()) {
                        item {
                            SectionCard(title = stringResource(R.string.facilities), isDark = isDark) {
                                FlowRow(
                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                    verticalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    facility.facilities.forEach { facilityItem ->
                                        FacilityChip(name = facilityItem, isDark = isDark)
                                    }
                                }
                            }
                        }
                    }

                    // ─── 8. INSURANCE ACCEPTED ───────────────────────
                    if (facility.insuranceAccepted.isNotEmpty()) {
                        item {
                            SectionCard(title = stringResource(R.string.insurance_accepted), isDark = isDark) {
                                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    items(facility.insuranceAccepted) { insurance ->
                                        FacilityChip(name = insurance, isDark = isDark, icon = Icons.Default.Shield)
                                    }
                                }
                            }
                        }
                    }

                    // ─── 9. DEPARTMENTS ──────────────────────────────
                    if (facility.departments.isNotEmpty() && facility.type != FacilityType.MEDICAL_STORE && facility.type != FacilityType.DIAGNOSTIC_CENTER) {
                        item {
                            SectionCard(title = stringResource(R.string.departments), isDark = isDark) {
                                FlowRow(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    facility.departments.forEach { dept ->
                                        FacilityChip(name = dept, isDark = isDark)
                                    }
                                }
                            }
                        }
                    }

                    // ─── DIVIDER ──────────────────────────────────────
                    if (facility.doctors.isNotEmpty() && facility.type != FacilityType.MEDICAL_STORE && facility.type != FacilityType.DIAGNOSTIC_CENTER) {
                        item { HorizontalDivider(color = divColor, modifier = Modifier.padding(horizontal = 16.dp)) }
                    }

                    // ─── 10. DOCTORS SECTION ─────────────────────────
                    if (facility.doctors.isNotEmpty() && facility.type != FacilityType.MEDICAL_STORE && facility.type != FacilityType.DIAGNOSTIC_CENTER) {
                        val filteredDoctors = if (doctorSearchQuery.isBlank()) {
                            facility.doctors
                        } else {
                            val query = doctorSearchQuery.lowercase()
                            facility.doctors.filter { doc -> doc.name.lowercase().contains(query) || doc.specialization.lowercase().contains(query) }
                        }

                        item {
                            Row(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                                Text(text = stringResource(R.string.available_doctors_1), fontWeight = FontWeight.Bold, fontSize = 17.sp, color = titleColor)
                                Spacer(modifier = Modifier.weight(1f))
                                Surface(shape = RoundedCornerShape(12.dp), color = if (isDark) Color(0xFF1E3A5F) else Color(0xFFDBEAFE)) {
                                    Text(text = "${filteredDoctors.size} / ${facility.doctors.size}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = accentColor, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp))
                                }
                            }
                        }

                        if (facility.doctors.size >= 2) {
                            stickyHeader {
                                Surface(color = bgColor, modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp)) {
                                    OutlinedTextField(
                                        value = doctorSearchQuery,
                                        onValueChange = { doctorSearchQuery = it },
                                        placeholder = { Text("Search doctor by name or specialty...", fontSize = 13.sp, color = subtitleColor) },
                                        leadingIcon = { Icon(Icons.Outlined.Search, contentDescription = null, tint = tertiaryColor, modifier = Modifier.size(18.dp)) },
                                        trailingIcon = if (doctorSearchQuery.isNotEmpty()) {
                                            { IconButton(onClick = { doctorSearchQuery = "" }) { Icon(Icons.Default.Clear, contentDescription = "Clear", tint = tertiaryColor, modifier = Modifier.size(18.dp)) } }
                                        } else null,
                                        singleLine = true,
                                        shape = RoundedCornerShape(12.dp),
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedContainerColor = if (isDark) Color(0xFF1E293B) else Color(0xFFE2F0FC),
                                            unfocusedContainerColor = if (isDark) Color(0xFF1E293B) else Color(0xFFE2F0FC),
                                            focusedBorderColor = accentColor,
                                            unfocusedBorderColor = divColor,
                                            focusedTextColor = titleColor,
                                            unfocusedTextColor = titleColor
                                        ),
                                        modifier = Modifier.fillMaxWidth().height(50.dp)
                                    )
                                }
                            }
                        }

                        if (filteredDoctors.isEmpty()) {
                            item {
                                EmptyStateView(icon = Icons.Outlined.PersonSearch, title = "No doctors match \"$doctorSearchQuery\"", subtitle = "Try a different search term", isDark = isDark)
                            }
                        } else {
                            items(filteredDoctors) { doctor ->
                                DoctorCard(
                                    doctor = doctor,
                                    isDark = isDark,
                                    onBookClick = { onDoctorBookClick(doctor, facility) },
                                    onIntroClick = if (!doctor.introVideoUrl.isNullOrBlank()) {
                                        {
                                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(doctor.introVideoUrl))
                                            intent.setDataAndType(Uri.parse(doctor.introVideoUrl), "video/*")
                                            try { context.startActivity(intent) }
                                            catch (_: Exception) { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(doctor.introVideoUrl))) }
                                        }
                                    } else null
                                )
                            }
                        }
                    } else {
                        item {
                            SectionCard(title = stringResource(R.string.available_doctors_1), isDark = isDark) {
                                EmptyStateView(icon = Icons.Outlined.PersonSearch, title = stringResource(R.string.no_doctors_listed_at_this), subtitle = "", isDark = isDark)
                            }
                        }
                    }

                    // ─── 10.5. MAP PREVIEW & LOCATION ─────────────────────────
                    if (facility.latitude != 0.0 && facility.longitude != 0.0) {
                        item {
                            Spacer(modifier = Modifier.height(8.dp))
                            MapPreviewCard(facility = facility, isDark = isDark, onOpenDirections = {
                                NavigationHelper.openDirections(context, facility.latitude, facility.longitude, facility.name)
                            })
                        }
                    }

                    // ─── DIVIDER ──────────────────────────────────────
                    item { HorizontalDivider(color = divColor, modifier = Modifier.padding(horizontal = 16.dp)) }

                    // ─── 11. REVIEWS SECTION ─────────────────────────
                    item {
                        HospitalReviewSection(
                            reviews = uiState.reviews,
                            reviewsLoading = uiState.reviewsLoading,
                            rating = facility.rating,
                            reviewCount = facility.reviewCount,
                            onSubmitReview = { rating, comment ->
                                val typeStr = when (facilityType) { FacilityType.CLINIC -> "clinic"; else -> "hospital" }
                                viewModel.submitFacilityReview(typeStr, facilityId, rating, comment)
                            },
                            reviewSubmitting = uiState.reviewSubmitting,
                            reviewSuccess = uiState.reviewSuccess,
                            reviewError = uiState.reviewError,
                            isLoggedIn = isLoggedIn,
                            onClearReviewState = { viewModel.clearReviewState() },
                            isDark = isDark
                        )
                    }

                    // Bottom spacer
                    item { Spacer(modifier = Modifier.height(32.dp)) }
                }
            }
        }
    }
}

// ══════════════════════════════════════════════════════════════
//  Local Quick Action Button (kept inline for 5-button layout)
// ══════════════════════════════════════════════════════════════
@Composable
private fun QuickActionButton(
    icon: ImageVector,
    label: String,
    color: Color,
    onClick: () -> Unit,
    isLoading: Boolean = false
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Surface(shape = CircleShape, color = color.copy(alpha = 0.1f), modifier = Modifier.size(52.dp)) {
            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = color)
                } else {
                    Icon(icon, contentDescription = label, tint = color, modifier = Modifier.size(24.dp))
                }
            }
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(label, fontSize = 11.sp, fontWeight = FontWeight.Medium, color = color)
    }
}

// ══════════════════════════════════════════════════════════════
//  Reviews Section
// ══════════════════════════════════════════════════════════════
@Composable
private fun HospitalReviewSection(
    reviews: List<Review>,
    reviewsLoading: Boolean,
    rating: Float,
    reviewCount: Int,
    onSubmitReview: (Int, String?) -> Unit,
    reviewSubmitting: Boolean,
    reviewSuccess: Boolean,
    reviewError: String?,
    isLoggedIn: Boolean,
    onClearReviewState: () -> Unit,
    isDark: Boolean
) {
    var selectedRating by remember { mutableIntStateOf(0) }
    var reviewComment by remember { mutableStateOf("") }
    val titleColor = if (isDark) Color(0xFFF1F5F9) else Color(0xFF0F172A)
    val subtitleColor = if (isDark) Color(0xFF94A3B8) else Color(0xFF64748B)
    val accentColor = if (isDark) Color(0xFF60A5FA) else Color(0xFF2563EB)

    LaunchedEffect(reviewSuccess) {
        if (reviewSuccess) { selectedRating = 0; reviewComment = ""; onClearReviewState() }
    }

    SectionCard(title = stringResource(R.string.reviews), isDark = isDark) {
        // Rating summary
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(text = String.format(Locale.US, "%.1f", rating), fontWeight = FontWeight.Bold, fontSize = 36.sp, color = titleColor)
                Row { repeat(5) { i -> Icon(if (i < rating.toInt()) Icons.Default.Star else Icons.Outlined.StarOutline, contentDescription = null, tint = SwastikOrange, modifier = Modifier.size(16.dp)) } }
                Text("$reviewCount reviews", fontSize = 12.sp, color = subtitleColor)
            }

            Spacer(modifier = Modifier.width(24.dp))

            Column(modifier = Modifier.weight(1f)) {
                val starCounts = IntArray(5)
                reviews.forEach { review -> val idx = (review.rating - 1).coerceIn(0, 4); starCounts[idx]++ }
                for (star in 5 downTo 1) {
                    val count = starCounts[star - 1]
                    val fraction = if (reviews.isNotEmpty()) count.toFloat() / reviews.size else 0f
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("$star", fontSize = 12.sp, color = subtitleColor, modifier = Modifier.width(12.dp))
                        Icon(Icons.Default.Star, contentDescription = null, tint = SwastikOrange, modifier = Modifier.size(12.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        LinearProgressIndicator(progress = { fraction }, modifier = Modifier.weight(1f).height(6.dp).clip(RoundedCornerShape(3.dp)), color = SwastikOrange, trackColor = if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("$count", fontSize = 11.sp, color = subtitleColor, modifier = Modifier.width(20.dp))
                    }
                    if (star > 1) Spacer(modifier = Modifier.height(2.dp))
                }
            }
        }

        // Add review form
        if (isLoggedIn) {
            Spacer(modifier = Modifier.height(16.dp))
            HorizontalDivider(color = if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0))
            Spacer(modifier = Modifier.height(12.dp))

            Text(stringResource(R.string.rate_your_experience), fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = titleColor)
            Spacer(modifier = Modifier.height(8.dp))

            Row {
                repeat(5) { i ->
                    IconButton(onClick = { selectedRating = i + 1 }, modifier = Modifier.size(36.dp)) {
                        Icon(if (i < selectedRating) Icons.Default.Star else Icons.Outlined.StarOutline, contentDescription = null, tint = if (i < selectedRating) SwastikOrange else subtitleColor, modifier = Modifier.size(28.dp))
                    }
                }
            }

            if (selectedRating > 0) {
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(value = reviewComment, onValueChange = { reviewComment = it }, label = { Text(stringResource(R.string.write_a_review_optional)) }, modifier = Modifier.fillMaxWidth(), maxLines = 3, shape = RoundedCornerShape(10.dp))
                Spacer(modifier = Modifier.height(8.dp))
                Button(onClick = { onSubmitReview(selectedRating, reviewComment.ifBlank { null }) }, enabled = !reviewSubmitting, shape = RoundedCornerShape(10.dp), colors = ButtonDefaults.buttonColors(containerColor = accentColor), modifier = Modifier.fillMaxWidth()) {
                    if (reviewSubmitting) CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp, color = Color.White) else Text(stringResource(R.string.submit_review))
                }
            }

            if (reviewError != null) { Spacer(modifier = Modifier.height(8.dp)); Text(reviewError, color = Color(0xFFEF4444), fontSize = 13.sp) }
            if (reviewSuccess) { Spacer(modifier = Modifier.height(8.dp)); Text(stringResource(R.string.review_submitted_successfully), color = accentColor, fontSize = 13.sp, fontWeight = FontWeight.Medium) }
        }

        // Individual reviews
        if (reviewsLoading) {
            Spacer(modifier = Modifier.height(16.dp))
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                repeat(2) { Box(modifier = Modifier.fillMaxWidth().height(60.dp).clip(RoundedCornerShape(8.dp)).shimmerEffect()) }
            }
        } else if (reviews.isNotEmpty()) {
            Spacer(modifier = Modifier.height(16.dp))
            reviews.take(5).forEach { review ->
                HorizontalDivider(color = if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0))
                Spacer(modifier = Modifier.height(10.dp))
                Row(verticalAlignment = Alignment.Top) {
                    Box(modifier = Modifier.size(36.dp).background(accentColor.copy(alpha = 0.1f), CircleShape), contentAlignment = Alignment.Center) {
                        Text(text = (review.patient?.name ?: "A").take(1).uppercase(), fontWeight = FontWeight.Bold, fontSize = 14.sp, color = accentColor)
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(text = review.patient?.name ?: stringResource(R.string.anonymous), fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = titleColor)
                            Surface(shape = RoundedCornerShape(10.dp), color = accentColor.copy(alpha = 0.1f)) {
                                Row(modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                                    Icon(Icons.Default.Verified, contentDescription = null, tint = accentColor, modifier = Modifier.size(10.dp))
                                    Text(text = "Verified", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = accentColor)
                                }
                            }
                        }
                        Row(modifier = Modifier.padding(vertical = 2.dp)) {
                            repeat(5) { i -> Icon(if (i < review.rating) Icons.Default.Star else Icons.Outlined.StarOutline, contentDescription = null, tint = SwastikOrange, modifier = Modifier.size(12.dp)) }
                        }
                        if (!review.comment.isNullOrBlank()) {
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(text = review.comment, fontSize = 13.sp, color = subtitleColor, lineHeight = 18.sp)
                            val commentLower = review.comment.lowercase()
                            val tags = mutableListOf<String>()
                            if (commentLower.contains("clean") || commentLower.contains("hygien") || commentLower.contains("neat")) tags.add("Cleanliness")
                            if (commentLower.contains("doctor") || commentLower.contains("care") || commentLower.contains("treatment")) tags.add("Good Care")
                            if (commentLower.contains("fast") || commentLower.contains("quick") || commentLower.contains("time")) tags.add("Prompt Service")
                            if (commentLower.contains("staff") || commentLower.contains("polite") || commentLower.contains("help")) tags.add("Cooperative Staff")
                            if (review.rating >= 4 && tags.isEmpty()) tags.add("Recommended")
                            if (tags.isNotEmpty()) {
                                Spacer(modifier = Modifier.height(6.dp))
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    tags.forEach { tag ->
                                        Surface(shape = RoundedCornerShape(6.dp), color = if (isDark) Color(0xFF1E293B) else Color(0xFFF1F5F9), border = BorderStroke(0.5.dp, if (isDark) Color(0xFF334155) else Color(0xFFCBD5E1))) {
                                            Text(text = "#$tag", fontSize = 10.sp, color = if (isDark) Color(0xFF94A3B8) else Color(0xFF475569), modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(10.dp))
            }
        }
    }
}
