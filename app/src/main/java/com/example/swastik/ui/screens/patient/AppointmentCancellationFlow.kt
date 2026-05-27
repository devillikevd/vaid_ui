package com.example.swastik.ui.screens.patient

import androidx.compose.foundation.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.swastik.R
import com.example.swastik.data.model.Appointment
import com.example.swastik.ui.theme.SwastikPrimary

enum class CancellationStep {
    CONFIRM, SELECT_REASON, SUCCESS
}

@Composable
fun AppointmentCancellationFlow(
    appointment: Appointment,
    onDismiss: () -> Unit,
    onConfirmCancellation: (String) -> Unit,
    onFindAnotherSpecialist: () -> Unit,
    onBookAgain: () -> Unit
) {
    var currentStep by remember { mutableStateOf(CancellationStep.CONFIRM) }
    var selectedReason by remember { mutableStateOf("") }
    var otherReason by remember { mutableStateOf("") }

    val reasons = listOf(
        "I found a better provider",
        "I'm concerned about the insurance",
        "The provider doesn't accept insurance",
        "Provider asked to cancel",
        "There was an issue on my end",
        "Other"
    )

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.95f)
                .wrapContentHeight(),
            shape = RoundedCornerShape(28.dp),
            color = MaterialTheme.colorScheme.surface
        ) {
            Box {
                val gridColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f)
                // Background pattern / decoration
                Canvas(modifier = Modifier.matchParentSize()) {
                    val gridStep = 40.dp.toPx()
                    for (x in 0 until (size.width / gridStep).toInt()) {
                        drawLine(
                            color = gridColor,
                            start = Offset(x * gridStep, 0f),
                            end = Offset(x * gridStep, size.height),
                            strokeWidth = 1f
                        )
                    }
                    for (y in 0 until (size.height / gridStep).toInt()) {
                        drawLine(
                            color = gridColor,
                            start = Offset(0f, y * gridStep),
                            end = Offset(size.width, y * gridStep),
                            strokeWidth = 1f
                        )
                    }
                }

                when (currentStep) {
                    CancellationStep.CONFIRM -> {
                        CancellationConfirmContent(
                            appointment = appointment,
                            onCancel = onDismiss,
                            onContinue = { currentStep = CancellationStep.SELECT_REASON }
                        )
                    }
                    CancellationStep.SELECT_REASON -> {
                        CancellationReasonContent(
                            appointment = appointment,
                            reasons = reasons,
                            selectedReason = selectedReason,
                            onReasonSelected = { selectedReason = it },
                            otherReason = otherReason,
                            onOtherReasonChange = { otherReason = it },
                            onKeepAppointment = onDismiss,
                            onContinueCancellation = {
                                val finalReason = if (selectedReason == "Other") otherReason else selectedReason
                                onConfirmCancellation(finalReason)
                                currentStep = CancellationStep.SUCCESS
                            }
                        )
                    }
                    CancellationStep.SUCCESS -> {
                        CancellationSuccessContent(
                            appointment = appointment,
                            onBookAgain = {
                                onBookAgain()
                                onDismiss()
                            },
                            onFindAnotherSpecialist = {
                                onFindAnotherSpecialist()
                                onDismiss()
                            },
                            onDone = onDismiss
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun CancellationConfirmContent(
    appointment: Appointment,
    onCancel: () -> Unit,
    onContinue: () -> Unit
) {
    Column(
        modifier = Modifier.padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(120.dp)
                .background(MaterialTheme.colorScheme.surface, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Default.Cancel,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(60.dp)
            )
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Text(
            text = "Cancel your doctor appointment?",
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )
        
        Spacer(modifier = Modifier.height(12.dp))
        
        Text(
            text = "There will be NO refundable fee! 😡",
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
        
        Spacer(modifier = Modifier.height(32.dp))
        
        OutlinedButton(
            onClick = onCancel,
            modifier = Modifier.fillMaxWidth().height(54.dp),
            shape = RoundedCornerShape(12.dp),
            border = BorderStroke(1.dp, Color(0xFFFFEBEE))
        ) {
            Text("No, don't cancel", color = MaterialTheme.colorScheme.onSurface)
            Spacer(Modifier.width(8.dp))
            Icon(Icons.Default.Close, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
        }
        
        Spacer(modifier = Modifier.height(12.dp))
        
        Button(
            onClick = onContinue,
            modifier = Modifier.fillMaxWidth().height(54.dp),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE53935))
        ) {
            Text("Yes, cancel")
            Spacer(Modifier.width(8.dp))
            Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(18.dp))
        }
    }
}

@Composable
private fun CancellationReasonContent(
    appointment: Appointment,
    reasons: List<String>,
    selectedReason: String,
    onReasonSelected: (String) -> Unit,
    otherReason: String,
    onOtherReasonChange: (String) -> Unit,
    onKeepAppointment: () -> Unit,
    onContinueCancellation: () -> Unit
) {
    Column(
        modifier = Modifier
            .padding(24.dp)
            .verticalScroll(rememberScrollState())
    ) {
        IconButton(
            onClick = onKeepAppointment,
            modifier = Modifier.align(Alignment.End).background(MaterialTheme.colorScheme.surface, RoundedCornerShape(8.dp))
        ) {
            Icon(Icons.Default.Close, contentDescription = "Close", tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        
        Text(
            text = "Cancel This Appointment",
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold
        )
        
        Spacer(modifier = Modifier.height(12.dp))
        
        Text(
            text = "We understand life can get in the way. Cancelling or missing your appointment too many times will result being banned.",
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            lineHeight = 20.sp
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Doctor Card
        Surface(
            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
            shape = RoundedCornerShape(16.dp)
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier.size(50.dp).background(SwastikPrimary.copy(alpha = 0.1f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.Person, contentDescription = null, tint = SwastikPrimary)
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(text = "Dr. ${appointment.doctor?.name ?: "Doctor"}", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(Icons.Default.CheckCircle, contentDescription = "Verified", tint = Color(0xFF4CAF50), modifier = Modifier.size(16.dp))
                    }
                    Text(text = appointment.doctor?.specialization ?: "Specialist", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Text(text = "Please select the cancellation reason?", fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
        
        Spacer(modifier = Modifier.height(12.dp))
        
        Column(Modifier.selectableGroup()) {
            reasons.forEach { reason ->
                Row(
                    Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .selectable(
                            selected = (reason == selectedReason),
                            onClick = { onReasonSelected(reason) },
                            role = Role.RadioButton
                        ),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    RadioButton(
                        selected = (reason == selectedReason),
                        onClick = null,
                        colors = RadioButtonDefaults.colors(selectedColor = SwastikPrimary)
                    )
                    Text(
                        text = reason,
                        modifier = Modifier.padding(start = 12.dp),
                        fontSize = 14.sp
                    )
                }
            }
        }
        
        if (selectedReason == "Other") {
            Spacer(modifier = Modifier.height(12.dp))
            OutlinedTextField(
                value = otherReason,
                onValueChange = onOtherReasonChange,
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Please enter your detailed description here...", fontSize = 13.sp) },
                shape = RoundedCornerShape(12.dp),
                minLines = 3
            )
        }
        
        Spacer(modifier = Modifier.height(32.dp))
        
        TextButton(
            onClick = onKeepAppointment,
            modifier = Modifier.fillMaxWidth().height(50.dp)
        ) {
            Text("Keep Appointment", color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold)
        }
        
        Spacer(modifier = Modifier.height(8.dp))
        
        Button(
            onClick = onContinueCancellation,
            modifier = Modifier.fillMaxWidth().height(54.dp),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE53935)),
            enabled = selectedReason.isNotBlank() && (selectedReason != "Other" || otherReason.isNotBlank())
        ) {
            Text("Continue Cancellation")
            Spacer(Modifier.width(8.dp))
            Icon(Icons.Default.Close, contentDescription = null, modifier = Modifier.size(18.dp))
        }
    }
}

@Composable
private fun CancellationSuccessContent(
    appointment: Appointment,
    onBookAgain: () -> Unit,
    onFindAnotherSpecialist: () -> Unit,
    onDone: () -> Unit
) {
    Column(
        modifier = Modifier.padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier.size(140.dp),
            contentAlignment = Alignment.Center
        ) {
            Box(
                modifier = Modifier
                    .size(100.dp)
                    .border(4.dp, Color(0xFFE53935), CircleShape)
                    .padding(8.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.Block, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(40.dp))
                    Text("CANCELLED", color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.ExtraBold, fontSize = 10.sp)
                }
            }
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Surface(
            color = MaterialTheme.colorScheme.surfaceVariant,
            shape = RoundedCornerShape(8.dp),
            modifier = Modifier.padding(horizontal = 8.dp)
        ) {
            Row(modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.CalendarToday, null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.width(6.dp))
                Text("${appointment.date} at ${appointment.timeSlot}", fontSize = 12.sp, fontWeight = FontWeight.Medium)
            }
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Text(
            text = "You cancelled your visit with",
            fontSize = 16.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        
        Text(
            text = "Dr. ${appointment.doctor?.name ?: "Doctor"}",
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )
        
        Text(
            text = appointment.doctor?.specialization ?: "Specialist",
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        
        Spacer(modifier = Modifier.height(32.dp))
        
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f),
            shape = RoundedCornerShape(16.dp)
        ) {
            Row(modifier = Modifier.padding(16.dp)) {
                Icon(Icons.Default.LocationOn, null, tint = Color(0xFFFF9800), modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text("Office Location", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Text(
                        appointment.hospital?.name ?: appointment.clinic?.name ?: "Telemedicine Center",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
        
        Spacer(modifier = Modifier.height(32.dp))
        
        TextButton(
            onClick = onBookAgain,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Book Again", color = SwastikPrimary)
            Spacer(Modifier.width(8.dp))
            Icon(Icons.Default.Replay, contentDescription = null, tint = SwastikPrimary, modifier = Modifier.size(18.dp))
        }
        
        Spacer(modifier = Modifier.height(12.dp))
        
        Button(
            onClick = onFindAnotherSpecialist,
            modifier = Modifier.fillMaxWidth().height(54.dp),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
        ) {
            Text("Find Another Specialist")
            Spacer(Modifier.width(8.dp))
            Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(18.dp))
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        TextButton(onClick = onDone) {
            Text("Done")
        }
    }
}
