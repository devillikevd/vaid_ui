package com.example.swastik.ui.screens.patient.healthcare

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.data.model.*
import com.example.swastik.ui.theme.*
import com.example.swastik.ui.viewmodel.HisPatientViewModel
import kotlinx.coroutines.delay

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HospitalServicesScreen(
    onBack: () -> Unit = {},
    viewModel: HisPatientViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Queue", "Admissions", "Lab Reports", "Insurance")

    LaunchedEffect(Unit) {
        viewModel.fetchQueuePosition()
        viewModel.fetchMyAdmissions()
        viewModel.fetchMyLabReports()
        viewModel.fetchMyPreauthStatus()
    }

    // Auto-refresh queue every 15 seconds
    LaunchedEffect(Unit) {
        while (true) {
            delay(15_000)
            viewModel.fetchQueuePosition()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Hospital Services", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = SwastikPrimary,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            // Tab Row
            ScrollableTabRow(
                selectedTabIndex = selectedTab,
                containerColor = SwastikPrimary,
                contentColor = Color.White,
                edgePadding = 8.dp
            ) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = { Text(title, fontSize = 13.sp, fontWeight = if (selectedTab == index) FontWeight.Bold else FontWeight.Medium) }
                    )
                }
            }

            // Content
            when (selectedTab) {
                0 -> QueueTab(uiState)
                1 -> AdmissionsTab(uiState)
                2 -> LabReportsTab(uiState)
                3 -> InsuranceTab(uiState)
            }
        }
    }
}

// ════════════════════════════════════════════════
// TAB 1: OPD Queue Position
// ════════════════════════════════════════════════

@Composable
private fun QueueTab(uiState: com.example.swastik.ui.viewmodel.HisPatientUiState) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        if (uiState.queueLoading) {
            item { LoadingCard() }
        } else if (!uiState.queueActive || uiState.queuePosition == null) {
            item { EmptyCard("No Active Queue", "You don't have an active OPD token right now.", Icons.Outlined.QueuePlayNext) }
        } else {
            val q = uiState.queuePosition
            item {
                // Live Token Card
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    elevation = CardDefaults.cardElevation(4.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Brush.linearGradient(listOf(SwastikPrimary, SwastikPrimaryDark)))
                            .padding(24.dp)
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                            Text("YOUR TOKEN", color = Color.White.copy(alpha = 0.8f), fontSize = 12.sp, fontWeight = FontWeight.Medium)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                q.displayToken ?: "T-${q.tokenNumber}",
                                color = Color.White,
                                fontSize = 48.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(12.dp))

                            Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                                QueueStat("Position", "#${q.position}", Color.White)
                                QueueStat("Wait", "${q.estimatedWaitMinutes} min", Color.White)
                                QueueStat("Now Serving", "T-${q.currentToken ?: "—"}", Color.White)
                            }

                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                "Dr. ${q.doctorName ?: "—"} • ${q.departmentName ?: ""}",
                                color = Color.White.copy(alpha = 0.9f),
                                fontSize = 13.sp
                            )
                            if (q.hospitalName != null) {
                                Text(q.hospitalName, color = Color.White.copy(alpha = 0.7f), fontSize = 12.sp)
                            }
                        }
                    }
                }
            }

            item {
                StatusChip(
                    label = when (q.status) {
                        "waiting" -> "⏳ Waiting"
                        "in_consultation" -> "🏥 In Consultation"
                        "completed" -> "✅ Completed"
                        else -> q.status?.replace("_", " ")?.uppercase() ?: "Unknown"
                    },
                    color = when (q.status) {
                        "waiting" -> SwastikOrange
                        "in_consultation" -> SwastikBlue
                        "completed" -> SwastikGreen
                        else -> TextSecondary
                    }
                )
            }
        }
    }
}

@Composable
private fun QueueStat(label: String, value: String, textColor: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, color = textColor, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Text(label, color = textColor.copy(alpha = 0.7f), fontSize = 11.sp)
    }
}

// ════════════════════════════════════════════════
// TAB 2: Admissions
// ════════════════════════════════════════════════

@Composable
private fun AdmissionsTab(uiState: com.example.swastik.ui.viewmodel.HisPatientUiState) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        if (uiState.admissionsLoading) {
            item { LoadingCard() }
        } else if (uiState.admissions.isEmpty()) {
            item { EmptyCard("No Admissions", "You don't have any hospital admissions.", Icons.Outlined.Bed) }
        } else {
            items(uiState.admissions) { admission ->
                AdmissionCard(admission)
            }
        }
    }
}

@Composable
private fun AdmissionCard(admission: PatientAdmission) {
    val isActive = admission.status in listOf("admitted", "pre_admission")
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isActive) SwastikPrimaryLight else SurfaceLight
        ),
        elevation = CardDefaults.cardElevation(if (isActive) 4.dp else 1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    if (isActive) Icons.Default.LocalHospital else Icons.Outlined.CheckCircle,
                    contentDescription = null,
                    tint = if (isActive) SwastikPrimary else SwastikGreen,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    admission.admissionNumber ?: "Admission",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    modifier = Modifier.weight(1f)
                )
                StatusChip(
                    label = admission.status.replace("_", " ").uppercase(),
                    color = when (admission.status) {
                        "admitted" -> SwastikBlue
                        "discharged" -> SwastikGreen
                        "pre_admission" -> SwastikOrange
                        else -> TextSecondary
                    }
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            if (admission.hospitalName != null) {
                InfoRow("Hospital", admission.hospitalName)
            }
            if (admission.chiefComplaint != null) {
                InfoRow("Complaint", admission.chiefComplaint)
            }
            if (admission.attendingDoctorName != null) {
                InfoRow("Doctor", "Dr. ${admission.attendingDoctorName}")
            }
            if (admission.wardName != null || admission.bedNumber != null) {
                InfoRow("Ward / Bed", "${admission.wardName ?: "—"} / ${admission.bedNumber ?: "—"}")
            }
            if (admission.admittedAt != null) {
                InfoRow("Admitted", formatDate(admission.admittedAt))
            }
            if (admission.expectedDischargeDate != null) {
                InfoRow("Expected Discharge", admission.expectedDischargeDate)
            }
            if (admission.totalBill != null) {
                InfoRow("Bill Amount", "₹${formatCurrency(admission.totalBill)}")
            }
        }
    }
}

// ════════════════════════════════════════════════
// TAB 3: Lab Reports
// ════════════════════════════════════════════════

@Composable
private fun LabReportsTab(uiState: com.example.swastik.ui.viewmodel.HisPatientUiState) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        if (uiState.labReportsLoading) {
            item { LoadingCard() }
        } else if (uiState.labReports.isEmpty()) {
            item { EmptyCard("No Reports", "No lab or radiology reports found.", Icons.Outlined.Science) }
        } else {
            items(uiState.labReports) { report ->
                LabReportCard(report)
            }
        }
    }
}

@Composable
private fun LabReportCard(report: PatientLabReport) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    if (report.modality != null) Icons.Outlined.CameraAlt else Icons.Outlined.Science,
                    contentDescription = null,
                    tint = if (report.isAbnormal) SwastikRed else SwastikPrimary,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(report.testName, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    if (report.testCategory != null || report.modality != null) {
                        Text(
                            report.modality?.uppercase() ?: report.testCategory ?: "",
                            color = TextSecondary, fontSize = 11.sp
                        )
                    }
                }
                StatusChip(
                    label = report.status.replace("_", " "),
                    color = when {
                        report.status.contains("approved") || report.status.contains("ready") -> SwastikGreen
                        report.status.contains("processing") || report.status.contains("progress") -> SwastikBlue
                        report.status == "ordered" -> SwastikOrange
                        else -> TextSecondary
                    }
                )
            }

            if (report.isAbnormal) {
                Spacer(modifier = Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Warning, contentDescription = null, tint = SwastikRed, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Abnormal Result", color = SwastikRed, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
            if (report.doctorName != null) {
                InfoRow("Ordered by", "Dr. ${report.doctorName}")
            }
            if (report.hospitalName != null) {
                InfoRow("Hospital", report.hospitalName)
            }
            if (report.orderedAt != null) {
                InfoRow("Ordered", formatDate(report.orderedAt))
            }
        }
    }
}

// ════════════════════════════════════════════════
// TAB 4: Insurance Pre-Auth
// ════════════════════════════════════════════════

@Composable
private fun InsuranceTab(uiState: com.example.swastik.ui.viewmodel.HisPatientUiState) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        if (uiState.preauthLoading) {
            item { LoadingCard() }
        } else if (uiState.preauthList.isEmpty()) {
            item { EmptyCard("No Pre-Auth Requests", "No insurance pre-authorization requests.", Icons.Outlined.HealthAndSafety) }
        } else {
            items(uiState.preauthList) { pa ->
                PreauthCard(pa)
            }
        }
    }
}

@Composable
private fun PreauthCard(pa: PatientPreauthStatus) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.HealthAndSafety, contentDescription = null, tint = SwastikBlue, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(pa.insuranceProvider, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, modifier = Modifier.weight(1f))
                StatusChip(
                    label = pa.status.replace("_", " ").uppercase(),
                    color = when (pa.status) {
                        "approved" -> SwastikGreen
                        "rejected" -> SwastikRed
                        "partially_approved" -> SwastikOrange
                        "pending" -> SwastikBlue
                        else -> TextSecondary
                    }
                )
            }

            Spacer(modifier = Modifier.height(8.dp))
            InfoRow("Policy #", pa.policyNumber)
            if (pa.diagnosis != null) InfoRow("Diagnosis", pa.diagnosis)
            if (pa.requestedAmount != null) InfoRow("Requested", "₹${formatCurrency(pa.requestedAmount)}")
            if (pa.approvedAmount != null) InfoRow("Approved", "₹${formatCurrency(pa.approvedAmount)}")
            if (pa.rejectionReason != null) {
                Spacer(modifier = Modifier.height(4.dp))
                Text("Reason: ${pa.rejectionReason}", color = SwastikRed, fontSize = 12.sp)
            }
            if (pa.hospitalName != null) InfoRow("Hospital", pa.hospitalName)
        }
    }
}

// ════════════════════════════════════════════════
// Shared Components
// ════════════════════════════════════════════════

@Composable
private fun StatusChip(label: String, color: Color) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = color.copy(alpha = 0.12f)
    ) {
        Text(
            label,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            color = color,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(modifier = Modifier.padding(vertical = 2.dp)) {
        Text(
            "$label: ",
            color = TextSecondary,
            fontSize = 12.sp
        )
        Text(
            value,
            color = TextPrimary,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
private fun LoadingCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(40.dp),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator(color = SwastikPrimary, strokeWidth = 2.dp)
        }
    }
}

@Composable
private fun EmptyCard(title: String, message: String, icon: ImageVector) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(icon, contentDescription = null, tint = TextSecondary, modifier = Modifier.size(48.dp))
            Spacer(modifier = Modifier.height(12.dp))
            Text(title, fontWeight = FontWeight.SemiBold, color = TextPrimary)
            Text(message, color = TextSecondary, fontSize = 13.sp)
        }
    }
}

// ── Utility ──

private fun formatDate(isoDate: String): String {
    return try {
        val parts = isoDate.take(10).split("-")
        if (parts.size == 3) "${parts[2]}/${parts[1]}/${parts[0]}" else isoDate
    } catch (_: Exception) {
        isoDate
    }
}

private fun formatCurrency(amount: Double): String {
    return String.format("%,.2f", amount)
}
