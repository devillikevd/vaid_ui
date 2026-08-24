package com.example.swastik.ui.screens.patient.booking

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.CalendarContract
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.example.swastik.R
import com.example.swastik.data.model.Appointment
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.ui.theme.SwastikPrimaryLight
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.util.Locale

private val StatusGreen = Color(0xFF2E7D32)
private val StatusGreenLight = Color(0xFFE8F5E9)
private val StatusOrange = Color(0xFFE65100)
private val StatusOrangeLight = Color(0xFFFFF3E0)
private val StatusBlue = Color(0xFF1565C0)
private val StatusBlueLight = Color(0xFFE3F2FD)
private val StatusRed = Color(0xFFC62828)
private val StatusRedLight = Color(0xFFFFEBEE)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ConsultationStatusBottomSheet(
    appointment: Appointment,
    onDismiss: () -> Unit,
    onJoinConsultation: (appointmentId: String, doctorName: String) -> Unit = { _, _ -> },
    onNavigateToDoctorProfile: (doctorId: String) -> Unit = {},
    onReschedule: (doctorId: String) -> Unit = {},
    onCancelClick: (appointment: Appointment) -> Unit = {},
    onPrescriptionClick: (appointmentId: String) -> Unit = {}
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current

    val doctor = appointment.doctor
    val doctorName = doctor?.name ?: "Doctor"
    val specialization = doctor?.specialization ?: "Specialist"
    val isVideo = appointment.type.lowercase().contains("video")
    val statusLower = appointment.status.lowercase()
    val isCancelled = statusLower == "cancelled"
    val isCompleted = statusLower == "completed"
    val isInProgress = statusLower == "in_progress"
    val isConfirmed = statusLower == "confirmed" || isInProgress

    val bookingId = appointment.appointmentNumber ?: appointment.id.take(8).uppercase()

    // Formatted date and time
    val formattedDate = try {
        val parsed = LocalDate.parse(appointment.date)
        parsed.format(DateTimeFormatter.ofPattern("EEE, d MMM yyyy", Locale.US))
    } catch (_: Exception) {
        appointment.date
    }

    val formattedTime = formatTimeSlot(appointment.timeSlot)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = Color.White,
        dragHandle = { BottomSheetDefaults.DragHandle() },
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp)
        ) {
            // Header: Title & Close Button
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Consultation Status",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1E293B)
                    )
                    Text(
                        text = "Booking ID: #$bookingId",
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                }

                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier
                        .size(32.dp)
                        .background(Color(0xFFF1F5F9), CircleShape)
                ) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = "Close",
                        modifier = Modifier.size(18.dp),
                        tint = Color.DarkGray
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Cancelled Banner (if applicable)
            if (isCancelled) {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    color = StatusRedLight,
                    border = BorderStroke(1.dp, StatusRed.copy(alpha = 0.3f))
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Cancel, contentDescription = null, tint = StatusRed, modifier = Modifier.size(22.dp))
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text("Consultation Cancelled", fontWeight = FontWeight.Bold, color = StatusRed, fontSize = 14.sp)
                            if (!appointment.cancellationReason.isNullOrBlank()) {
                                Text("Reason: ${appointment.cancellationReason}", fontSize = 12.sp, color = Color(0xFF5A1E1E))
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            // Live Progress Tracker
            if (!isCancelled) {
                StatusProgressTracker(status = statusLower)
                Spacer(modifier = Modifier.height(16.dp))
            }

            // Doctor Profile Summary Card
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable {
                        if (doctor?.id != null) {
                            onDismiss()
                            onNavigateToDoctorProfile(doctor.id)
                        }
                    },
                shape = RoundedCornerShape(16.dp),
                color = Color(0xFFF8FAFC),
                border = BorderStroke(1.dp, Color(0xFFE2E8F0))
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Doctor Avatar
                    Box(
                        modifier = Modifier
                            .size(56.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .background(SwastikPrimaryLight),
                        contentAlignment = Alignment.Center
                    ) {
                        if (!doctor?.profileImageUrl.isNullOrBlank()) {
                            AsyncImage(
                                model = ImageRequest.Builder(context)
                                    .data(doctor?.profileImageUrl)
                                    .crossfade(true)
                                    .build(),
                                contentDescription = doctorName,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize()
                            )
                        } else {
                            Icon(
                                Icons.Default.Person,
                                contentDescription = null,
                                tint = SwastikPrimary,
                                modifier = Modifier.size(32.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.width(14.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Dr. $doctorName",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF0F172A),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = specialization,
                            fontSize = 13.sp,
                            color = Color(0xFF64748B),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )

                        Spacer(modifier = Modifier.height(4.dp))

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            if (doctor?.averageRating != null && doctor.averageRating > 0f) {
                                Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFF59E0B), modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(2.dp))
                                Text(
                                    text = String.format(Locale.US, "%.1f", doctor.averageRating),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color(0xFF1E293B)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                            }

                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = if (isVideo) StatusBlueLight else StatusGreenLight
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        if (isVideo) Icons.Default.Videocam else Icons.Default.LocationOn,
                                        contentDescription = null,
                                        tint = if (isVideo) StatusBlue else StatusGreen,
                                        modifier = Modifier.size(12.dp)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        text = if (isVideo) "Video Call" else "In-Person Visit",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = if (isVideo) StatusBlue else StatusGreen
                                    )
                                }
                            }
                        }
                    }

                    Icon(
                        Icons.Default.ChevronRight,
                        contentDescription = "View Profile",
                        tint = Color(0xFF94A3B8),
                        modifier = Modifier.size(20.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Time & Schedule Card
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                color = Color.White,
                border = BorderStroke(1.dp, Color(0xFFE2E8F0))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .background(SwastikPrimaryLight, RoundedCornerShape(10.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Event, contentDescription = null, tint = SwastikPrimary, modifier = Modifier.size(22.dp))
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Scheduled Slot", fontSize = 12.sp, color = Color.Gray)
                            Text("$formattedDate • $formattedTime", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1E293B))
                        }
                    }

                    if (!appointment.clinic?.name.isNullOrBlank() || !appointment.hospital?.name.isNullOrBlank()) {
                        HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), color = Color(0xFFF1F5F9))
                        val facilityName = appointment.clinic?.name ?: appointment.hospital?.name ?: ""
                        val facilityAddress = appointment.clinic?.address ?: appointment.hospital?.address ?: ""
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .background(Color(0xFFFEF3C7), RoundedCornerShape(10.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Place, contentDescription = null, tint = Color(0xFFD97706), modifier = Modifier.size(22.dp))
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(facilityName, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1E293B))
                                if (facilityAddress.isNotBlank()) {
                                    Text(facilityAddress, fontSize = 11.sp, color = Color.Gray, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                }
                            }
                        }
                    }
                }
            }

            // In-Progress OTP Verification Card (if present)
            if (!appointment.completionOtp.isNullOrBlank() && (isInProgress || isConfirmed)) {
                Spacer(modifier = Modifier.height(16.dp))
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    color = Color(0xFFFFFBEB),
                    border = BorderStroke(1.5.dp, Color(0xFFF59E0B))
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.VpnKey, contentDescription = null, tint = Color(0xFFD97706), modifier = Modifier.size(24.dp))
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Consultation Verification OTP", fontSize = 11.sp, color = Color(0xFF92400E), fontWeight = FontWeight.Medium)
                            Text(
                                appointment.completionOtp,
                                fontSize = 22.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Color(0xFFB45309),
                                letterSpacing = 4.sp
                            )
                        }
                        IconButton(
                            onClick = {
                                clipboardManager.setText(AnnotatedString(appointment.completionOtp))
                            }
                        ) {
                            Icon(Icons.Default.ContentCopy, contentDescription = "Copy OTP", tint = Color(0xFFD97706), modifier = Modifier.size(18.dp))
                        }
                    }
                }
            }

            // Clinical Reason / Intake note (if present)
            if (!appointment.reason.isNullOrBlank() || !appointment.notes.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(16.dp))
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    color = Color(0xFFF8FAFC),
                    border = BorderStroke(1.dp, Color(0xFFE2E8F0))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Reason for Consultation", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.DarkGray)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = appointment.reason ?: appointment.notes ?: "Routine checkup",
                            fontSize = 13.sp,
                            color = Color(0xFF334155)
                        )
                    }
                }
            }

            // Payment & Fee details
            Spacer(modifier = Modifier.height(16.dp))
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                color = Color.White,
                border = BorderStroke(1.dp, Color(0xFFE2E8F0))
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Consultation Fee", fontSize = 12.sp, color = Color.Gray)
                        Text(
                            text = appointment.consultationFee?.let { "₹$it" } ?: "Free / Pre-paid",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = SwastikPrimary
                        )
                    }

                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = StatusGreenLight
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = StatusGreen, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Payment Confirmed", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = StatusGreen)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Primary Action Buttons
            if (isCompleted) {
                Button(
                    onClick = {
                        onDismiss()
                        onPrescriptionClick(appointment.id)
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
                ) {
                    Icon(Icons.Default.Description, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("View Prescription & Summary", fontWeight = FontWeight.Bold)
                }
            } else if (isInProgress && isVideo) {
                // Pulsing Join Video Call button
                Button(
                    onClick = {
                        onDismiss()
                        onJoinConsultation(appointment.id, doctorName)
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
                ) {
                    Icon(Icons.Default.Videocam, contentDescription = null, modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Join Video Consultation Now", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                }
            } else if (isConfirmed && isVideo) {
                Button(
                    onClick = {
                        onDismiss()
                        onJoinConsultation(appointment.id, doctorName)
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
                ) {
                    Icon(Icons.Default.Videocam, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Enter Consultation Room", fontWeight = FontWeight.Bold)
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Utility Buttons: Add to Calendar & Share
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedButton(
                    onClick = {
                        try {
                            val calIntent = Intent(Intent.ACTION_INSERT).apply {
                                data = CalendarContract.Events.CONTENT_URI
                                putExtra(CalendarContract.Events.TITLE, "Consultation with Dr. $doctorName")
                                putExtra(CalendarContract.Events.DESCRIPTION, "Consultation Type: ${if (isVideo) "Video Call" else "In-Person Visit"}\nBooking ID: #$bookingId")
                            }
                            context.startActivity(calIntent)
                        } catch (_: Exception) {}
                    },
                    modifier = Modifier
                        .weight(1f)
                        .height(44.dp),
                    shape = RoundedCornerShape(10.dp),
                    border = BorderStroke(1.dp, Color(0xFFCBD5E1))
                ) {
                    Icon(Icons.Outlined.CalendarMonth, contentDescription = null, modifier = Modifier.size(16.dp), tint = Color.DarkGray)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Calendar", fontSize = 12.sp, color = Color.DarkGray)
                }

                OutlinedButton(
                    onClick = {
                        try {
                            val shareText = """
                                🏥 Swastik Consultation Confirmed!
                                
                                Doctor: Dr. $doctorName ($specialization)
                                Date: $formattedDate
                                Time: $formattedTime
                                Mode: ${if (isVideo) "Video Call" else "In-Person Clinic Visit"}
                                Booking ID: #$bookingId
                                
                                — Swastik Telemedicine
                            """.trimIndent()
                            val sendIntent = Intent().apply {
                                action = Intent.ACTION_SEND
                                putExtra(Intent.EXTRA_TEXT, shareText)
                                type = "text/plain"
                            }
                            context.startActivity(Intent.createChooser(sendIntent, "Share Consultation Details"))
                        } catch (_: Exception) {}
                    },
                    modifier = Modifier
                        .weight(1f)
                        .height(44.dp),
                    shape = RoundedCornerShape(10.dp),
                    border = BorderStroke(1.dp, Color(0xFFCBD5E1))
                ) {
                    Icon(Icons.Outlined.Share, contentDescription = null, modifier = Modifier.size(16.dp), tint = Color.DarkGray)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Share", fontSize = 12.sp, color = Color.DarkGray)
                }
            }

            // Cancellation / Reschedule options (if not cancelled or completed)
            if (!isCancelled && !isCompleted) {
                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(
                        onClick = {
                            onDismiss()
                            onReschedule(appointment.doctorId)
                        }
                    ) {
                        Icon(Icons.Default.Schedule, contentDescription = null, tint = SwastikPrimary, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Reschedule", color = SwastikPrimary, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    }

                    TextButton(
                        onClick = {
                            onDismiss()
                            onCancelClick(appointment)
                        }
                    ) {
                        Icon(Icons.Default.Cancel, contentDescription = null, tint = StatusRed, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Cancel Booking", color = StatusRed, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}

@Composable
private fun StatusProgressTracker(status: String) {
    val steps = listOf("Booked", "Confirmed", "In Progress", "Completed")
    val currentStepIndex = when (status) {
        "scheduled", "pending" -> 0
        "confirmed" -> 1
        "in_progress", "live" -> 2
        "completed" -> 3
        else -> 0
    }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = Color(0xFFF8FAFC),
        border = BorderStroke(1.dp, Color(0xFFE2E8F0))
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("Live Status", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                steps.forEachIndexed { index, stepName ->
                    val isDone = index < currentStepIndex
                    val isCurrent = index == currentStepIndex

                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.weight(1f)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(28.dp)
                                .clip(CircleShape)
                                .background(
                                    when {
                                        isDone -> SwastikPrimary
                                        isCurrent -> Color(0xFF0288D1)
                                        else -> Color(0xFFE2E8F0)
                                    }
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            if (isDone) {
                                Icon(Icons.Default.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                            } else if (isCurrent) {
                                Box(
                                    modifier = Modifier
                                        .size(10.dp)
                                        .background(Color.White, CircleShape)
                                )
                            } else {
                                Text("${index + 1}", fontSize = 11.sp, color = Color.Gray, fontWeight = FontWeight.Bold)
                            }
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        Text(
                            text = stepName,
                            fontSize = 10.sp,
                            fontWeight = if (isCurrent || isDone) FontWeight.Bold else FontWeight.Normal,
                            color = if (isCurrent) Color(0xFF0288D1) else if (isDone) SwastikPrimary else Color.Gray,
                            textAlign = TextAlign.Center,
                            maxLines = 1
                        )
                    }

                    if (index < steps.size - 1) {
                        Box(
                            modifier = Modifier
                                .height(2.dp)
                                .weight(0.6f)
                                .background(
                                    if (index < currentStepIndex) SwastikPrimary else Color(0xFFE2E8F0)
                                )
                        )
                    }
                }
            }
        }
    }
}
