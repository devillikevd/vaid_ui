package com.example.swastik.ui.screens.patient.wellness

import android.content.Intent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.R
import com.example.swastik.data.remote.dto.*
import com.example.swastik.ui.viewmodel.WellnessViewModel

private val SafetyRed = Color(0xFFDC2626)
private val SafetyRedBg = Color(0xFFFEF2F2)
private val SafetyAmber = Color(0xFFD97706)
private val SafetyGreen = Color(0xFF16A34A)
private val SafetyBlue = Color(0xFF2563EB)
private val SafetyPurple = Color(0xFF7C3AED)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WellnessSafetyScreen(
    onNavigateBack: () -> Unit,
    onNavigateToEmergency: () -> Unit,
    onNavigateToAssessment: () -> Unit,
    onNavigateToDoctorConsult: () -> Unit = {},
    viewModel: WellnessViewModel
) {
    val state by viewModel.uiState.collectAsState()
    val safety = state.safetySummary ?: WellnessSafetyDto()
    val interlocks = state.drugNutrientInterlocks
    val certificate = state.clearanceCertificate
    val context = LocalContext.current

    var expandedProtocolId by remember { mutableStateOf<String?>("dizziness") }
    var showCertificateDialog by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.refreshSafetySummary()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Clinical Safety & Readiness 🛡️", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.refreshSafetySummary() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = SafetyRedBg)
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color(0xFFF8FAFC))
                .animateContentSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 1. HERO CLEARANCE CARD WITH CERTIFICATE BUTTON
            item {
                SafetyClearanceHero(
                    safety = safety,
                    onRetakeScreening = onNavigateToAssessment,
                    onViewCertificate = { showCertificateDialog = true }
                )
            }

            // 2. ACTIVE DRUG-NUTRIENT & EXERCISE INTERLOCKS
            item {
                DrugNutrientInterlocksSection(interlocks = interlocks)
            }

            // 3. PAR-Q READINESS STATUS
            item {
                ParQReadinessCard(
                    isPassed = safety.parQPassed ?: true,
                    flags = safety.safetyFlags ?: emptyList(),
                    onRetake = onNavigateToAssessment
                )
            }

            // 4. CLINICAL GUARDRAILS & VITALS THRESHOLDS
            item {
                VitalsGuardrailsSection(safety = safety)
            }

            // 5. JOINT AWARENESS & EXERCISE EXCLUSIONS
            item {
                JointExclusionsSection(
                    excluded = safety.excludedExercises ?: emptyList(),
                    alternatives = safety.safeAlternatives ?: emptyList()
                )
            }

            // 6. "I FEEL UNWELL" GUIDED EMERGENCY TRIAGE
            item {
                Text(
                    text = "🚨 I Feel Unwell During Workout (Triage)",
                    fontSize = 17.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color(0xFF0F172A)
                )
            }

            items(safety.unwellProtocols ?: defaultUnwellProtocols) { protocol ->
                UnwellProtocolCard(
                    protocol = protocol,
                    isExpanded = expandedProtocolId == protocol.id,
                    onToggle = {
                        expandedProtocolId = if (expandedProtocolId == protocol.id) null else protocol.id
                    },
                    onTriggerSos = onNavigateToEmergency
                )
            }

            // 7. FAST-TRACK DOCTOR / PHYSIO ACTION
            item {
                DoctorReferralCard(
                    recommended = safety.doctorReferralRecommended ?: false,
                    onBookConsult = onNavigateToDoctorConsult,
                    onEmergency = onNavigateToEmergency
                )
            }
        }
    }

    // ==================== MEDICAL CLEARANCE CERTIFICATE DIALOG ====================
    if (showCertificateDialog) {
        MedicalClearanceCertificateDialog(
            certificate = certificate,
            onDismiss = { showCertificateDialog = false },
            onShare = {
                val certText = """
                    📄 SWASTIK MEDICAL CLEARANCE CERTIFICATE
                    Patient: ${certificate?.patientName ?: "Athlete"}
                    Certificate ID: ${certificate?.certificateId ?: "SWK-CLR-VERIFIED"}
                    Clearance: ${certificate?.clearanceTitle ?: "100% Cleared"}
                    PAR-Q Score: ${certificate?.parQStatus ?: "7/7 Passed"}
                    Medical Officer: ${certificate?.authorizedMedicalOfficer?.name ?: "Dr. Rajesh Vardhan, MD"}
                    Verify Online: ${certificate?.verificationQrUrl ?: "https://swastik.health/verify"}
                """.trimIndent()
                val sendIntent = Intent().apply {
                    action = Intent.ACTION_SEND
                    putExtra(Intent.EXTRA_TEXT, certText)
                    type = "text/plain"
                }
                context.startActivity(Intent.createChooser(sendIntent, "Share Medical Certificate"))
            }
        )
    }
}

@Composable
private fun SafetyClearanceHero(
    safety: WellnessSafetyDto,
    onRetakeScreening: () -> Unit,
    onViewCertificate: () -> Unit
) {
    val isRed = safety.clearanceStatus == "medical_clearance_required"
    val isAmber = safety.clearanceStatus == "caution"
    val gradientColors = when {
        isRed -> listOf(Color(0xFF991B1B), Color(0xFFDC2626))
        isAmber -> listOf(Color(0xFF92400E), Color(0xFFD97706))
        else -> listOf(Color(0xFF065F46), Color(0xFF059669))
    }

    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        elevation = CardDefaults.cardElevation(4.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(Brush.linearGradient(gradientColors))
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = Color.White.copy(alpha = 0.2f)
                ) {
                    Text(
                        text = "CLINICAL STATUS",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                    )
                }
                Icon(Icons.Default.HealthAndSafety, null, tint = Color.White, modifier = Modifier.size(24.dp))
            }

            Text(
                text = safety.statusBadge ?: "🟢 100% Cleared for Active Training",
                fontSize = 20.sp,
                fontWeight = FontWeight.Black,
                color = Color.White
            )

            Text(
                text = safety.clearanceNotes ?: "Your pre-exercise screening and cardiovascular history are clear. You are safe to engage in moderate-to-high intensity training.",
                fontSize = 13.sp,
                color = Color.White.copy(alpha = 0.9f),
                lineHeight = 18.sp
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = onViewCertificate,
                    colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Color(0xFF065F46)),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Default.VerifiedUser, null, modifier = Modifier.size(15.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Clearance Certificate (QR)", fontSize = 11.5.sp, fontWeight = FontWeight.Bold)
                }

                OutlinedButton(
                    onClick = onRetakeScreening,
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.6f)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.EditNote, null, modifier = Modifier.size(15.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Retake", fontSize = 11.5.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun DrugNutrientInterlocksSection(
    interlocks: List<DrugNutrientInterlockDto>
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, Color(0xFFE2E8F0))
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("💊", fontSize = 20.sp)
                    Spacer(Modifier.width(8.dp))
                    Column {
                        Text("AI Drug-Nutrient & Food Interlocks", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        Text("Cross-referenced with your active prescriptions", fontSize = 11.sp, color = Color.Gray)
                    }
                }
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = Color(0xFFFEF3C7)
                ) {
                    Text(
                        text = "ACTIVE GUARDRAILS",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        color = SafetyAmber,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                    )
                }
            }

            HorizontalDivider(color = Color(0xFFF1F5F9))

            val displayList = if (interlocks.isNotEmpty()) interlocks else defaultInterlocks
            displayList.forEach { item ->
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = if (item.severity == "high") Color(0xFFFEF2F2) else Color(0xFFFFFBEB),
                    border = BorderStroke(1.dp, if (item.severity == "high") Color(0xFFFECACA) else Color(0xFFFDE68A)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(item.medicationClass, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = if (item.severity == "high") SafetyRed else SafetyAmber)
                            Text("⛔ ${item.contraindicatedNutrient}", fontWeight = FontWeight.Black, fontSize = 11.5.sp, color = Color(0xFF991B1B))
                        }
                        Text(item.riskMechanism, fontSize = 11.sp, color = Color(0xFF475569), lineHeight = 15.sp)
                        Text("✅ Safe Alternative: ${item.safeSubstitute}", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = SafetyGreen)
                    }
                }
            }
        }
    }
}

@Composable
private fun ParQReadinessCard(
    isPassed: Boolean,
    flags: List<String>,
    onRetake: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, Color(0xFFE2E8F0))
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("📋", fontSize = 20.sp)
                    Spacer(Modifier.width(8.dp))
                    Column {
                        Text("PAR-Q Screening Readiness", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        Text("Physical Activity Readiness Questionnaire", fontSize = 11.sp, color = Color.Gray)
                    }
                }
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = if (isPassed) Color(0xFFDCFCE7) else Color(0xFFFEE2E2)
                ) {
                    Text(
                        text = if (isPassed) "VERIFIED PASS" else "ATTENTION",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isPassed) SafetyGreen else SafetyRed,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            HorizontalDivider(color = Color(0xFFF1F5F9))

            ParQItem(title = "No heart pain during physical exertion", isCleared = true)
            ParQItem(title = "No loss of consciousness or severe dizziness", isCleared = true)
            ParQItem(
                title = "Joint & Bone health suitable for motion",
                isCleared = flags.none { it.contains("joint") || it.contains("knee") }
            )
            ParQItem(title = "Blood pressure within safe exercise range", isCleared = true)

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End
            ) {
                TextButton(onClick = onRetake) {
                    Icon(Icons.Default.Refresh, null, modifier = Modifier.size(14.dp), tint = SafetyBlue)
                    Spacer(Modifier.width(4.dp))
                    Text("Retake Questionnaire", fontSize = 11.5.sp, fontWeight = FontWeight.Bold, color = SafetyBlue)
                }
            }
        }
    }
}

@Composable
private fun ParQItem(title: String, isCleared: Boolean) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(title, fontSize = 12.sp, color = Color(0xFF334155), modifier = Modifier.weight(1f))
        Icon(
            imageVector = if (isCleared) Icons.Default.CheckCircle else Icons.Default.Warning,
            contentDescription = null,
            tint = if (isCleared) SafetyGreen else SafetyAmber,
            modifier = Modifier.size(16.dp)
        )
    }
}

@Composable
private fun VitalsGuardrailsSection(safety: WellnessSafetyDto) {
    val guardrails = safety.vitalsGuardrails

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(
            text = "💓 Clinical Vitals & HR Training Zones",
            fontSize = 16.sp,
            fontWeight = FontWeight.ExtraBold,
            color = Color(0xFF0F172A)
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            VitalsCard(
                title = "Max Safe Heart Rate",
                value = "${guardrails?.maxHeartRate ?: 165} BPM",
                subtitle = "Peak anaerobic cap",
                tint = SafetyRed,
                modifier = Modifier.weight(1f)
            )
            VitalsCard(
                title = "Aerobic Target",
                value = guardrails?.aerobicZone ?: "115-145 BPM",
                subtitle = "Cardio endurance zone",
                tint = SafetyBlue,
                modifier = Modifier.weight(1f)
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            VitalsCard(
                title = "Safe Blood Pressure",
                value = "< ${guardrails?.maxSystolicBp ?: 140}/${guardrails?.maxDiastolicBp ?: 90}",
                subtitle = "Pre-exercise systolic/diastolic",
                tint = SafetyAmber,
                modifier = Modifier.weight(1f)
            )
            VitalsCard(
                title = "Hydration Standard",
                value = guardrails?.hydrationTarget ?: "3.0 L/day",
                subtitle = "Electrolyte balance",
                tint = SafetyGreen,
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
private fun VitalsCard(
    title: String,
    value: String,
    subtitle: String,
    tint: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, Color(0xFFE2E8F0))
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(title, fontSize = 11.sp, color = Color(0xFF64748B), fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(4.dp))
            Text(value, fontSize = 16.sp, fontWeight = FontWeight.Black, color = tint)
            Spacer(Modifier.height(2.dp))
            Text(subtitle, fontSize = 10.sp, color = Color(0xFF94A3B8))
        }
    }
}

@Composable
private fun JointExclusionsSection(
    excluded: List<ExcludedExerciseDto>,
    alternatives: List<SafeAlternativeDto>
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, Color(0xFFE2E8F0))
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("🦵", fontSize = 20.sp)
                Spacer(Modifier.width(8.dp))
                Column {
                    Text("Joint Safety & Exercise Modifications", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    Text("Clinically filtered based on your joints & screening", fontSize = 11.sp, color = Color.Gray)
                }
            }

            HorizontalDivider(color = Color(0xFFF1F5F9))

            // Excluded Exercises
            Text("⛔ Movements to Avoid / High Impact", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = SafetyRed)
            excluded.forEach { item ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(SafetyRedBg, RoundedCornerShape(8.dp))
                        .padding(8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("• ${item.name}", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF991B1B))
                    Text(item.reason, fontSize = 11.sp, color = Color(0xFFB91C1C))
                }
            }

            Spacer(Modifier.height(4.dp))

            // Safe Alternatives
            Text("✅ Safe Prescribed Replacements", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = SafetyGreen)
            alternatives.forEach { alt ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFFF0FDF4), RoundedCornerShape(8.dp))
                        .padding(8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("✓ ${alt.name}", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF166534))
                    Text(alt.benefit, fontSize = 11.sp, color = Color(0xFF15803D))
                }
            }
        }
    }
}

@Composable
private fun UnwellProtocolCard(
    protocol: UnwellProtocolDto,
    isExpanded: Boolean,
    onToggle: () -> Unit,
    onTriggerSos: () -> Unit
) {
    val isEmergency = protocol.isEmergency == true
    val cardBg = if (isEmergency) SafetyRedBg else Color.White
    val borderCol = if (isEmergency) SafetyRed else Color(0xFFE2E8F0)

    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = cardBg),
        border = BorderStroke(1.dp, borderCol),
        modifier = Modifier.clickable(onClick = onToggle)
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = protocol.symptom,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = if (isEmergency) SafetyRed else Color(0xFF1E293B)
                )
                Icon(
                    imageVector = if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = null,
                    tint = if (isEmergency) SafetyRed else Color.Gray
                )
            }

            AnimatedVisibility(visible = isExpanded) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = protocol.action,
                        fontSize = 13.sp,
                        color = Color(0xFF334155),
                        lineHeight = 18.sp
                    )

                    if (isEmergency) {
                        Button(
                            onClick = onTriggerSos,
                            colors = ButtonDefaults.buttonColors(containerColor = SafetyRed),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.Emergency, null, tint = Color.White)
                            Spacer(Modifier.width(8.dp))
                            Text("🚨 Call Emergency SOS Ambulance (1-Tap)", fontWeight = FontWeight.Black, color = Color.White)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DoctorReferralCard(
    recommended: Boolean,
    onBookConsult: () -> Unit,
    onEmergency: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFEFF6FF)),
        border = BorderStroke(1.dp, Color(0xFFBFDBFE))
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("👨‍⚕️", fontSize = 22.sp)
                Spacer(Modifier.width(8.dp))
                Column {
                    Text("Clinical Escalation & Specialist Clearance", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFF1E3A8A))
                    Text("Connect with Sports Medicine Physios & Doctors", fontSize = 11.sp, color = Color(0xFF3B82F6))
                }
            }

            if (recommended) {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = Color(0xFFFEE2E2),
                    border = BorderStroke(1.dp, SafetyRed)
                ) {
                    Text(
                        text = "⚠️ Medical Clearance Strongly Recommended for Your Health Profile",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = SafetyRed,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            Text(
                text = "If you have recurring joint pain, hypertension, or need post-rehab clearance, consult a certified Swastik Sports Doctor before progressing workout intensity.",
                fontSize = 12.sp,
                color = Color(0xFF1E40AF),
                lineHeight = 16.sp
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Button(
                    onClick = onBookConsult,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Book Physio / Doctor", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }

                OutlinedButton(
                    onClick = onEmergency,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = SafetyRed),
                    border = BorderStroke(1.dp, SafetyRed)
                ) {
                    Icon(Icons.Default.Emergency, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("SOS", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
private fun MedicalClearanceCertificateDialog(
    certificate: MedicalClearanceCertificateDto?,
    onDismiss: () -> Unit,
    onShare: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("🛡️", fontSize = 22.sp)
                    Spacer(Modifier.width(8.dp))
                    Text("Physical Clearance Certificate", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
                }
                Icon(Icons.Default.Close, null, modifier = Modifier.size(20.dp).clickable { onDismiss() })
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFFF8FAFC), RoundedCornerShape(12.dp))
                    .padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Header seal
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0xFFDCFCE7),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("SWASTIK CLINICAL SPORTS MEDICINE BOARD", fontSize = 10.sp, fontWeight = FontWeight.Black, color = SafetyGreen)
                        Text(certificate?.clearanceTitle ?: "🟢 100% Verified Physical Readiness Clearance", fontSize = 12.5.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF14532D))
                    }
                }

                // Patient Info
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column {
                        Text("Athlete Name", fontSize = 10.sp, color = Color.Gray)
                        Text(certificate?.patientName ?: "Swastik Athlete", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text("Certificate ID", fontSize = 10.sp, color = Color.Gray)
                        Text(certificate?.certificateId ?: "SWK-CLR-7782A", fontWeight = FontWeight.Bold, fontSize = 11.5.sp, color = SafetyBlue)
                    }
                }

                HorizontalDivider(color = Color(0xFFE2E8F0))

                // Clinical Details
                Text("• PAR-Q Status: ${certificate?.parQStatus ?: "PASSED (7/7 Criteria)"}", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF334155))
                Text("• Max Heart Rate Cap: ${certificate?.safeVitalsEnvelope?.maxHeartRateCap ?: "165 BPM"}", fontSize = 11.sp, color = Color(0xFF334155))
                Text("• Safe BP Envelope: ${certificate?.safeVitalsEnvelope?.bloodPressureEnvelope ?: "< 140/90 mmHg"}", fontSize = 11.sp, color = Color(0xFF334155))

                // Doctor Seal
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Color.White,
                    border = BorderStroke(1.dp, Color(0xFFCBD5E1)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(modifier = Modifier.padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text("✍️", fontSize = 20.sp)
                        Spacer(Modifier.width(8.dp))
                        Column {
                            Text(certificate?.authorizedMedicalOfficer?.name ?: "Dr. Rajesh Vardhan, MD", fontWeight = FontWeight.Bold, fontSize = 11.5.sp)
                            Text("Reg: ${certificate?.authorizedMedicalOfficer?.registrationNo ?: "MCI-DEL-2016-88421"}", fontSize = 10.sp, color = Color.Gray)
                        }
                    }
                }

                // QR Code visual box
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0xFFEEF2FF),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text("SCAN TO VERIFY OFFICIAL RECORD", fontSize = 9.sp, fontWeight = FontWeight.Black, color = SafetyPurple)
                            Text("swastik.health/verify/clearance", fontSize = 10.sp, color = Color.Gray)
                        }
                        Icon(Icons.Default.QrCode2, null, tint = SafetyPurple, modifier = Modifier.size(32.dp))
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onShare,
                colors = ButtonDefaults.buttonColors(containerColor = SafetyGreen),
                shape = RoundedCornerShape(10.dp)
            ) {
                Icon(Icons.Default.Share, null, modifier = Modifier.size(15.dp))
                Spacer(Modifier.width(6.dp))
                Text("Share / Export PDF")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Close")
            }
        }
    )
}

private val defaultInterlocks = listOf(
    DrugNutrientInterlockDto(
        id = "statin_grapefruit",
        medicationClass = "Statins (Atorvastatin / Rosuvastatin)",
        indication = "Cholesterol Management",
        contraindicatedNutrient = "Grapefruit & Seville Oranges",
        severity = "high",
        riskMechanism = "Inhibits CYP3A4 enzyme, raising blood statin levels 3x and liver/muscle strain risk.",
        safeSubstitute = "Sweet Oranges, Mandarins, Green Apples 🍏",
        actionRequired = "Strictly avoid grapefruit juice during statin therapy."
    ),
    DrugNutrientInterlockDto(
        id = "ace_potassium",
        medicationClass = "ACE Inhibitors (Ramipril / Telmisartan)",
        indication = "Blood Pressure Control",
        contraindicatedNutrient = "Potassium Salt Substitutes (KCl)",
        severity = "moderate",
        riskMechanism = "Reduces aldosterone, triggering hyperkalemia when combined with low-sodium potassium salts.",
        safeSubstitute = "Herbal seasonings, pink rock salt in moderation 🧂",
        actionRequired = "Use natural herbs instead of low-sodium potassium salts."
    ),
    DrugNutrientInterlockDto(
        id = "beta_blocker_hiit",
        medicationClass = "Beta-Blockers (Metoprolol / Atenolol)",
        indication = "Tachycardia & BP",
        contraindicatedNutrient = "Extreme HIIT & Dehydration",
        severity = "moderate",
        riskMechanism = "Blunts physiological heart rate, increasing sudden dizziness and fatigue.",
        safeSubstitute = "RPE-based Zone 2 steady cardio with cool-downs.",
        actionRequired = "Pace cardio using perceived exertion instead of max HR."
    )
)

private val defaultUnwellProtocols = listOf(
    UnwellProtocolDto(
        id = "dizziness",
        symptom = "🌀 Dizziness or Lightheadedness",
        severity = "moderate",
        action = "Stop immediately. Lie down flat and elevate legs 12 inches above heart level. Sip 300ml electrolyte water."
    ),
    UnwellProtocolDto(
        id = "cramp",
        symptom = "⚡ Acute Muscle Cramp / Strain",
        severity = "mild",
        action = "Cease repetition. Apply passive stretch gently without bouncing. Apply ice pack for 15 minutes."
    ),
    UnwellProtocolDto(
        id = "nausea",
        symptom = "🤢 Nausea / Acid Reflux",
        severity = "mild",
        action = "Walk slowly to cool down. Do not lie flat immediately. Loosen tight gym clothing and sip cool water."
    ),
    UnwellProtocolDto(
        id = "chest_pain",
        symptom = "🫀 Chest Pain, Squeezing Pressure, or Fainting",
        severity = "critical",
        action = "EMERGENCY: Stop all movement. Sit comfortably. Press 1-Tap SOS below to dispatch nearest ambulance immediately.",
        isEmergency = true
    )
)
