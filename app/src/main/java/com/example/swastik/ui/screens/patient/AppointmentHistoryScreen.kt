package com.example.swastik.ui.screens.patient

import androidx.compose.ui.draw.drawBehind

import androidx.compose.ui.text.style.TextOverflow
import androidx.paging.compose.collectAsLazyPagingItems
import androidx.paging.LoadState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.luminance
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.R
import com.example.swastik.data.model.Appointment
import com.example.swastik.ui.screens.consultation.ConsultationCompletionDialog
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.ui.viewmodel.AppointmentViewModel

enum class AppointmentFilter {
    ALL, UPCOMING, COMPLETED, CANCELLED
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppointmentHistoryScreen(
    initialFilter: String? = null,
    onBackClick: () -> Unit,
    onAppointmentClick: (Appointment) -> Unit = {},
    onStartConsultation: (Appointment) -> Unit = {},
    onNavigateToPrescriptions: (String?) -> Unit = {},
    onNavigateToBooking: (String?) -> Unit = {},
    viewModel: AppointmentViewModel = hiltViewModel(),
    reviewViewModel: com.example.swastik.ui.viewmodel.ReviewViewModel = hiltViewModel()
) {
    val initialEnum = remember(initialFilter) {
        when (initialFilter?.uppercase()) {
            "UPCOMING" -> AppointmentFilter.UPCOMING
            "COMPLETED" -> AppointmentFilter.COMPLETED
            "CANCELLED" -> AppointmentFilter.CANCELLED
            else -> AppointmentFilter.ALL
        }
    }
    var selectedFilter by remember { mutableStateOf(initialEnum) }
    var showCancelDialog by remember { mutableStateOf<Appointment?>(null) }
    var showReviewDialog by remember { mutableStateOf<Appointment?>(null) }
    val uiState = viewModel.uiState
    val reviewUiState by reviewViewModel.uiState.collectAsState()
    val colorScheme = MaterialTheme.colorScheme

    // Load appointments whenever filter tab changes (fixes filter not fetching data)
    val statusQuery = remember(selectedFilter) {
        when (selectedFilter) {
            AppointmentFilter.ALL -> null
            AppointmentFilter.UPCOMING -> "active"
            AppointmentFilter.COMPLETED -> "completed"
            AppointmentFilter.CANCELLED -> "cancelled"
        }
    }
    
    val pagedAppointments = viewModel.getPagedAppointments(statusQuery).collectAsLazyPagingItems()

    // Refresh appointments when a review is submitted successfully
    LaunchedEffect(reviewUiState.submitSuccess) {
        if (reviewUiState.submitSuccess) {
            pagedAppointments.refresh()
            reviewViewModel.resetSubmitState()
        }
    }
    
    // Refresh appointments when cancellation is successful
    LaunchedEffect(uiState.cancelSuccess) {
        if (uiState.cancelSuccess) {
            pagedAppointments.refresh()
            viewModel.loadAppointments(statusQuery) // update cache
        }
    }

    // Also refresh on resume (e.g. coming back from consultation activity)
    val lifecycleOwner = androidx.compose.ui.platform.LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = androidx.lifecycle.LifecycleEventObserver { _, event ->
            if (event == androidx.lifecycle.Lifecycle.Event.ON_RESUME) {
                val statusQuery = when (selectedFilter) {
                    AppointmentFilter.ALL -> null
                    AppointmentFilter.UPCOMING -> "active"
                    AppointmentFilter.COMPLETED -> "completed"
                    AppointmentFilter.CANCELLED -> "cancelled"
                }
                viewModel.loadAppointments(statusQuery)
                pagedAppointments.refresh()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.appointment_history), fontWeight = FontWeight.SemiBold, fontSize = 18.sp) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = colorScheme.surface,
                    titleContentColor = colorScheme.onSurface,
                    navigationIconContentColor = colorScheme.onSurface
                )
            )
        },
        containerColor = colorScheme.background
    ) { paddingValues ->
        Column(modifier = Modifier.fillMaxSize().padding(paddingValues)) {
            FilterChipsRow(selectedFilter = selectedFilter, onFilterSelected = { selectedFilter = it })
            Spacer(modifier = Modifier.height(16.dp))

            when {
                pagedAppointments.loadState.refresh is LoadState.Loading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                    }
                }
                pagedAppointments.loadState.refresh is LoadState.Error -> {
                    Column(
                        modifier = Modifier.fillMaxSize().padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        val error = (pagedAppointments.loadState.refresh as LoadState.Error).error
                        Text(
                            error.message.orEmpty().ifBlank { stringResource(R.string.something_went_wrong) },
                            fontSize = 16.sp,
                            color = colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = { pagedAppointments.retry() },
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                        ) {
                            Text(stringResource(R.string.retry))
                        }
                    }
                }
                pagedAppointments.itemCount == 0 && pagedAppointments.loadState.refresh !is LoadState.Loading -> EmptyAppointmentsView(
                    selectedFilter = selectedFilter,
                    onBookClick = { onNavigateToBooking(null) }
                )
                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(top = 16.dp, bottom = 80.dp, start = 8.dp, end = 20.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        items(count = pagedAppointments.itemCount) { index ->
                            val appointment = pagedAppointments[index]
                            if (appointment != null) {
                                val isLast = index == pagedAppointments.itemCount - 1
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .drawBehind {
                                            if (!isLast) {
                                            val strokeWidth = 1.5.dp.toPx()
                                            val xOffset = 13.dp.toPx()
                                            val yStart = 24.dp.toPx()
                                            drawLine(
                                                color = colorScheme.outlineVariant.copy(alpha = 0.5f),
                                                start = Offset(xOffset, yStart),
                                                end = Offset(xOffset, size.height + 16.dp.toPx()),
                                                strokeWidth = strokeWidth
                                            )
                                        }
                                    }
                            ) {
                                Row(modifier = Modifier.fillMaxWidth()) {
                                    // Timeline Node
                                    Box(
                                        modifier = Modifier
                                            .padding(top = 28.dp, start = 8.dp)
                                            .size(10.dp)
                                            .clip(CircleShape)
                                            .background(
                                                when(appointment.status.lowercase()) {
                                                    "completed" -> Color(0xFF4CAF50)
                                                    "cancelled" -> colorScheme.error
                                                    else -> MaterialTheme.colorScheme.primary
                                                }
                                            )
                                    )
                                    
                                    Spacer(modifier = Modifier.width(16.dp))
                                    
                                    Box(modifier = Modifier.weight(1f)) {
                                        var selectedBookingStatusAppointment by remember { mutableStateOf<com.example.swastik.data.model.Appointment?>(null) }
                                        
                                        if (selectedBookingStatusAppointment != null) {
                                            AlertDialog(
                                                onDismissRequest = { selectedBookingStatusAppointment = null },
                                                title = { Text("Booking Status", fontWeight = FontWeight.Bold) },
                                                text = {
                                                    Column {
                                                        Text("Appointment ID: ${selectedBookingStatusAppointment?.appointmentNumber ?: selectedBookingStatusAppointment?.id}")
                                                        Spacer(modifier = Modifier.height(8.dp))
                                                        Text("Status: ${selectedBookingStatusAppointment?.status?.replaceFirstChar { it.uppercase() }}", fontWeight = FontWeight.Bold)
                                                        Spacer(modifier = Modifier.height(8.dp))
                                                        Text("Date: ${selectedBookingStatusAppointment?.date}")
                                                        Text("Time: ${selectedBookingStatusAppointment?.timeSlot}")
                                                        if (selectedBookingStatusAppointment?.doctor != null) {
                                                            Spacer(modifier = Modifier.height(8.dp))
                                                            Text("Doctor: ${selectedBookingStatusAppointment?.doctor?.name}")
                                                        }
                                                        Spacer(modifier = Modifier.height(16.dp))
                                                        Text("Please keep this information for your records. The appointment card is saved here.")
                                                    }
                                                },
                                                confirmButton = {
                                                    Button(onClick = { selectedBookingStatusAppointment = null }) {
                                                        Text("Close")
                                                    }
                                                }
                                            )
                                        }

                                        AppointmentCard(
                                            appointment = appointment,
                                            onClick = { onAppointmentClick(appointment) },
                                            onStartConsultation = { onStartConsultation(appointment) },
                                            onPrescriptionClick = { onNavigateToPrescriptions(appointment.id) },
                                            onBookAgainClick = { onNavigateToBooking(appointment.doctor?.id ?: appointment.doctorId) },
                                            onCancelClick = { showCancelDialog = appointment },
                                            onRateDoctorClick = { showReviewDialog = appointment },
                                            onViewCardClick = { selectedBookingStatusAppointment = appointment }
                                        )
                                    }
                                }
                            }
                        }
                    }
                    if (pagedAppointments.loadState.append is LoadState.Loading) {
                            item {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(36.dp),
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                }
                            }
                        }
                        item { Spacer(modifier = Modifier.height(20.dp)) }
                    }
                }
            }
        }
    }

            if (showCancelDialog != null) {
                AppointmentCancellationFlow(
                    appointment = showCancelDialog!!,
                    onDismiss = { showCancelDialog = null },
                    onConfirmCancellation = { reason ->
                        viewModel.cancelAppointment(showCancelDialog!!.id, reason)
                    },
                    onBookAgain = { onNavigateToBooking(showCancelDialog?.doctor?.id ?: showCancelDialog?.doctorId) },
                    onFindAnotherSpecialist = { onNavigateToBooking(null) }
                )
            }

    // Review Dialog
    showReviewDialog?.let { appointment ->
        val reviewUiState by reviewViewModel.uiState.collectAsState()
        
        // Fetch existing review if needed to support editing
        LaunchedEffect(appointment.id) {
            if (appointment.isReviewed) {
                reviewViewModel.loadReviewForConsultation(appointment.id)
            }
        }

        if (appointment.isReviewed && reviewUiState.isLoadingExistingReview) {
            // Wait for existing review to load
        } else {
            key(reviewUiState.existingReview?.id ?: "new") {
                com.example.swastik.ui.screens.patient.appointments.MultiEntityReviewDialog(
                    doctorName = appointment.doctor?.name ?: "",
                    facilityName = appointment.clinic?.name ?: appointment.hospital?.name,
                    facilityType = when {
                        appointment.clinic != null -> "clinic"
                        appointment.hospital != null -> "hospital"
                        else -> null
                    },
                    initialRating = if (appointment.isReviewed) reviewUiState.existingReview?.rating ?: 0 else 0,
                    initialComment = if (appointment.isReviewed) reviewUiState.existingReview?.comment ?: "" else "",
                    onDismiss = { showReviewDialog = null },
                    onSubmitReview = { targetType, rating, comment ->
                        val reviewableId = when(targetType) {
                            "doctor" -> appointment.doctorId
                            "clinic" -> appointment.clinic?.id ?: ""
                            "hospital" -> appointment.hospital?.id ?: ""
                            else -> ""
                        }
                        if (reviewableId.isNotEmpty()) {
                            reviewViewModel.submitReview(
                                reviewableType = targetType,
                                reviewableId = reviewableId,
                                consultationId = appointment.id,
                                rating = rating,
                                comment = comment
                            )
                        }
                        showReviewDialog = null
                    }
                )
            }
        }
    }
}

@Composable
private fun FilterChipsRow(selectedFilter: AppointmentFilter, onFilterSelected: (AppointmentFilter) -> Unit) {
    val colorScheme = MaterialTheme.colorScheme
    LazyRow(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        contentPadding = PaddingValues(horizontal = 20.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(AppointmentFilter.entries) { filter ->
            FilterChip(
                selected = selectedFilter == filter,
                onClick = { onFilterSelected(filter) },
                label = {
                    Text(
                        text = when (filter) {
                            AppointmentFilter.ALL -> stringResource(R.string.filter_all)
                            AppointmentFilter.UPCOMING -> stringResource(R.string.upcoming)
                            AppointmentFilter.COMPLETED -> stringResource(R.string.completed)
                            AppointmentFilter.CANCELLED -> stringResource(R.string.cancelled)
                        },
                        fontSize = 13.sp,
                        maxLines = 1
                    )
                },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = MaterialTheme.colorScheme.primary,
                    selectedLabelColor = MaterialTheme.colorScheme.surface,
                    containerColor = colorScheme.surface,
                    labelColor = colorScheme.onSurfaceVariant
                ),
                border = FilterChipDefaults.filterChipBorder(
                    borderColor = colorScheme.outline.copy(alpha = 0.5f),
                    selectedBorderColor = MaterialTheme.colorScheme.primary,
                    enabled = true,
                    selected = selectedFilter == filter
                )
            )
        }
    }
}

@Composable
private fun AppointmentCard(
    appointment: Appointment,
    onClick: () -> Unit,
    onStartConsultation: () -> Unit,
    onPrescriptionClick: () -> Unit = {},
    onBookAgainClick: () -> Unit = {},
    onCancelClick: () -> Unit = {},
    onRateDoctorClick: () -> Unit = {},
    onViewCardClick: () -> Unit = {}
) {
    val colorScheme = MaterialTheme.colorScheme
    val status = appointment.status.lowercase()
    val isUpcoming = status == "scheduled" || status == "confirmed" || status == "in_progress"
    val isInProgress = status == "in_progress"
    val isCompleted = status == "completed"
    val isCancelled = status == "cancelled"
    val doctorName = appointment.doctor?.name ?: "Doctor"
    val doctorSpecialty = appointment.doctor?.specialization ?: ""
    val isVideo = appointment.type.lowercase().contains("video")
    val facilityName = appointment.clinic?.name ?: appointment.hospital?.name
    val facilityLabel = when {
        appointment.clinic != null -> "Clinic"
        appointment.hospital != null -> "Hospital"
        isVideo -> "Consultation"
        else -> "Visit"
    }
    val inPersonVisitLabel = when {
        facilityName != null -> "$facilityLabel visit at $facilityName"
        else -> "In-person visit scheduled"
    }

    val isDark = MaterialTheme.colorScheme.surface.luminance() < 0.5f
    val textColorPrimary = if (isDark) Color(0xFFF8FAFC) else Color(0xFF1E293B)
    val textColorSecondary = if (isDark) Color(0xFFCBD5E1) else Color(0xFF475569)

    Card(
        modifier = Modifier.fillMaxWidth().clickable { onClick() },
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                val (bgColor, txtColor, statusText) = when {
                    isCompleted -> Triple(MaterialTheme.colorScheme.secondaryContainer, MaterialTheme.colorScheme.secondary, "Completed")
                    isInProgress -> Triple(Color(0xFFE8F5E9), Color(0xFF2E7D32), "In Progress")
                    isUpcoming -> Triple(Color(0xFFE3F2FD), MaterialTheme.colorScheme.primary, "Upcoming")
                    isCancelled -> Triple(MaterialTheme.colorScheme.errorContainer, MaterialTheme.colorScheme.error, "Cancelled")
                    else -> Triple(colorScheme.surfaceVariant, colorScheme.onSurfaceVariant, appointment.status.replaceFirstChar { it.uppercase() })
                }
                Box(modifier = Modifier.background(bgColor, RoundedCornerShape(8.dp)).padding(horizontal = 12.dp, vertical = 6.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (isInProgress) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFF4CAF50))
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                        }
                        Text(text = statusText, fontSize = 12.sp, fontWeight = FontWeight.Medium, color = txtColor, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.background(colorScheme.surfaceVariant, RoundedCornerShape(8.dp)).padding(horizontal = 10.dp, vertical = 6.dp)) {
                    Icon(if (isVideo) Icons.Outlined.VideoCall else Icons.Outlined.Person, contentDescription = null, tint = colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(text = if (isVideo) "Video" else "In-Person", fontSize = 12.sp, color = colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(modifier = Modifier.size(60.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)).border(2.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.3f), CircleShape), contentAlignment = Alignment.Center) {
                    Icon(Icons.Outlined.Person, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(30.dp))
                }
                Spacer(modifier = Modifier.width(16.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(text = doctorName, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = textColorPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    if (doctorSpecialty.isNotEmpty()) Text(text = doctorSpecialty, fontSize = 13.sp, color = textColorSecondary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    if (!facilityName.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                if (appointment.clinic != null) Icons.Default.MedicalServices else Icons.Default.LocalHospital,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "$facilityLabel • $facilityName",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.Medium,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
            HorizontalDivider(color = colorScheme.outline.copy(alpha = 0.35f))
            Spacer(modifier = Modifier.height(16.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(modifier = Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.CalendarMonth, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(text = appointment.date, fontSize = 13.sp, color = colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                Row(modifier = Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.AccessTime, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(text = appointment.timeSlot, fontSize = 13.sp, color = colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }

            if (isCancelled) {
                Spacer(modifier = Modifier.height(16.dp))
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = Color(0xFFFFF1F0), // Soft red background
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, Color(0xFFFFA39E).copy(alpha = 0.5f))
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.Cancel, 
                                contentDescription = null, 
                                tint = Color(0xFFCF1322), 
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            val cancelledByText = when {
                                appointment.cancelledBy == appointment.patientId && appointment.patientId.isNotEmpty() -> "Cancelled by you"
                                appointment.cancelledBy != null -> "Cancelled by Doctor/Hospital"
                                else -> "Appointment Cancelled"
                            }
                            Text(
                                text = cancelledByText,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFCF1322)
                            )
                        }
                        if (!appointment.cancellationReason.isNullOrBlank()) {
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = "Reason: ${appointment.cancellationReason}",
                                fontSize = 13.sp,
                                color = Color(0xFF434343),
                                lineHeight = 18.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            }

            if (isUpcoming) {
                Spacer(modifier = Modifier.height(16.dp))
                if (isVideo) {
                    val rejoinColor = if (isInProgress) Color(0xFF2E7D32) else MaterialTheme.colorScheme.primary
                    Button(
                        onClick = onStartConsultation,
                        modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = rejoinColor)
                    ) {
                        Icon(Icons.Default.VideoCall, contentDescription = null, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        val buttonText = if (isInProgress) stringResource(R.string.resume_video_consultation) else stringResource(R.string.start_video_consultation)
                        Text(buttonText, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                } else {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = colorScheme.primaryContainer,
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.EventAvailable, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                text = inPersonVisitLabel,
                                fontSize = 13.sp,
                                color = colorScheme.onPrimaryContainer,
                                fontWeight = FontWeight.Medium,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedButton(
                    onClick = onCancelClick,
                    modifier = Modifier.fillMaxWidth().heightIn(min = 44.dp),
                    shape = RoundedCornerShape(12.dp),
                    border = ButtonDefaults.outlinedButtonBorder.copy(brush = androidx.compose.ui.graphics.SolidColor(colorScheme.error))
                ) {
                    Icon(Icons.Default.Close, contentDescription = null, tint = colorScheme.error, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(stringResource(R.string.cancel_appointment), color = colorScheme.error, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
            if (isCompleted) {
                Spacer(modifier = Modifier.height(16.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = onPrescriptionClick, 
                        modifier = Modifier.weight(1f).heightIn(min = 44.dp),
                        shape = RoundedCornerShape(12.dp), 
                        border = ButtonDefaults.outlinedButtonBorder.copy(brush = androidx.compose.ui.graphics.SolidColor(MaterialTheme.colorScheme.primary)),
                        contentPadding = PaddingValues(horizontal = 4.dp)
                    ) {
                        Icon(Icons.Outlined.Description, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            stringResource(R.string.prescription), 
                            color = MaterialTheme.colorScheme.primary, 
                            fontSize = 12.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    Button(
                        onClick = onRateDoctorClick, 
                        modifier = Modifier.weight(1f).heightIn(min = 44.dp),
                        shape = RoundedCornerShape(12.dp), 
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                        contentPadding = PaddingValues(horizontal = 4.dp)
                    ) {
                        Icon(
                            if (appointment.isReviewed) Icons.Filled.Edit else Icons.Filled.Star, 
                            contentDescription = null, 
                            tint = Color.White, 
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            if (appointment.isReviewed) "Edit Review" else "Rate Doctor",
                            color = Color.White, 
                            fontSize = 12.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(8.dp))
                
                OutlinedButton(
                    onClick = onBookAgainClick, 
                    modifier = Modifier.fillMaxWidth().heightIn(min = 44.dp),
                    shape = RoundedCornerShape(12.dp), 
                    border = ButtonDefaults.outlinedButtonBorder.copy(brush = androidx.compose.ui.graphics.SolidColor(MaterialTheme.colorScheme.primary)),
                    contentPadding = PaddingValues(horizontal = 4.dp)
                ) {
                    Icon(Icons.Outlined.Replay, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        stringResource(R.string.book_again), 
                        color = MaterialTheme.colorScheme.primary, 
                        fontSize = 13.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                
                Spacer(modifier = Modifier.height(8.dp))
                
                OutlinedButton(
                    onClick = onViewCardClick, 
                    modifier = Modifier.fillMaxWidth().heightIn(min = 44.dp),
                    shape = RoundedCornerShape(12.dp), 
                    border = ButtonDefaults.outlinedButtonBorder.copy(brush = androidx.compose.ui.graphics.SolidColor(MaterialTheme.colorScheme.primary)),
                    contentPadding = PaddingValues(horizontal = 4.dp)
                ) {
                    Icon(Icons.Outlined.Assignment, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        "View Booking Status", 
                        color = MaterialTheme.colorScheme.primary, 
                        fontSize = 13.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            } else if (isUpcoming) {
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedButton(
                    onClick = onViewCardClick, 
                    modifier = Modifier.fillMaxWidth().heightIn(min = 44.dp),
                    shape = RoundedCornerShape(12.dp), 
                    border = ButtonDefaults.outlinedButtonBorder.copy(brush = androidx.compose.ui.graphics.SolidColor(MaterialTheme.colorScheme.primary))
                ) {
                    Icon(Icons.Outlined.Assignment, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("View Booking Status", color = MaterialTheme.colorScheme.primary, fontSize = 13.sp)
                }
            }
        }
    }
}

@Composable
private fun EmptyAppointmentsView(selectedFilter: AppointmentFilter, onBookClick: () -> Unit = {}) {
    val colorScheme = MaterialTheme.colorScheme
    Column(modifier = Modifier.fillMaxSize().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        AppointmentEmptyIcon()
        Spacer(modifier = Modifier.height(24.dp))
        Text(
            text = when (selectedFilter) {
                AppointmentFilter.ALL -> "No Appointments Yet"
                AppointmentFilter.UPCOMING -> "No Upcoming Appointments"
                AppointmentFilter.COMPLETED -> "No Completed Appointments"
                AppointmentFilter.CANCELLED -> "No Cancelled Appointments"
            },
            fontSize = 20.sp, fontWeight = FontWeight.Bold, color = colorScheme.onSurface, textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = when (selectedFilter) {
                AppointmentFilter.ALL -> "Book your first appointment with a doctor"
                AppointmentFilter.UPCOMING -> "You don't have any scheduled appointments"
                AppointmentFilter.COMPLETED -> "Your completed consultations will appear here"
                AppointmentFilter.CANCELLED -> "No cancelled appointments to show"
            },
            fontSize = 14.sp, color = colorScheme.onSurfaceVariant, textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(32.dp))
        Button(onClick = onBookClick, modifier = Modifier.fillMaxWidth().heightIn(min = 50.dp), shape = RoundedCornerShape(25.dp), colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)) {
            Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(20.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Text(stringResource(R.string.book_appointment), fontSize = 15.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

@Composable
private fun AppointmentEmptyIcon() {
    Box(modifier = Modifier.size(140.dp), contentAlignment = Alignment.Center) {
        val primaryColor = MaterialTheme.colorScheme.primary
        Canvas(modifier = Modifier.fillMaxSize()) {
            drawCircle(color = primaryColor, radius = 5.dp.toPx(), center = Offset(size.width * 0.85f, size.height * 0.15f))
            drawCircle(color = primaryColor, radius = 3.dp.toPx(), center = Offset(size.width * 0.75f, size.height * 0.22f))
            drawCircle(color = primaryColor, radius = 4.dp.toPx(), center = Offset(size.width * 0.12f, size.height * 0.7f))
        }
        Box(modifier = Modifier.size(120.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
            Box(modifier = Modifier.size(90.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary), contentAlignment = Alignment.Center) {
                Icon(Icons.Outlined.CalendarMonth, contentDescription = null, tint = MaterialTheme.colorScheme.surface, modifier = Modifier.size(45.dp))
            }
        }
    }
}
