package com.example.swastik.ui.screens.patient.booking

import android.Manifest
import android.content.pm.PackageManager
import android.media.MediaPlayer
import android.media.MediaRecorder
import android.net.Uri
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.ui.theme.SwastikPrimaryLight
import java.io.File
import kotlinx.coroutines.delay

// ==================== COLOR PALETTE ====================
private val TealDark = Color(0xFF00695C)
private val TealMedium = Color(0xFF00897B)
private val TealLight = Color(0xFFE0F2F1)
private val TealAccent = Color(0xFF26A69A)
private val SeverityGreen = Color(0xFF4CAF50)
private val SeverityYellow = Color(0xFFFFC107)
private val SeverityOrange = Color(0xFFFF9800)
private val SeverityRed = Color(0xFFF44336)
private val CardBg = Color(0xFFF7FDFC)
private val ChipSelectedBg = Color(0xFF00695C)
private val ChipUnselectedBg = Color(0xFFF0F9F7)

// ==================== INTAKE SUB-STEP PROGRESS BAR ====================

@Composable
fun IntakeProgressBar(currentStep: Int, totalSteps: Int = 5) {
    val stepLabels = listOf("Reason", "Symptoms", "Medical", "Documents", "Review")

    Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp)) {
        // Progress bar
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            for (i in 1..totalSteps) {
                val isCompleted = i < currentStep
                val isActive = i == currentStep
                val bgColor = when {
                    isCompleted -> TealDark
                    isActive -> TealMedium
                    else -> Color(0xFFE0E0E0)
                }

                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .clip(CircleShape)
                        .background(bgColor),
                    contentAlignment = Alignment.Center
                ) {
                    if (isCompleted) {
                        Icon(
                            Icons.Default.Check,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(16.dp)
                        )
                    } else {
                        Text(
                            "$i",
                            color = if (isActive) Color.White else Color(0xFF9E9E9E),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                if (i < totalSteps) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(3.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(if (i < currentStep) TealDark else Color(0xFFE0E0E0))
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(4.dp))

        // Labels
        Row(modifier = Modifier.fillMaxWidth()) {
            stepLabels.forEachIndexed { index, label ->
                Text(
                    text = label,
                    fontSize = 9.sp,
                    fontWeight = if (index + 1 <= currentStep) FontWeight.SemiBold else FontWeight.Normal,
                    color = if (index + 1 <= currentStep) TealDark else Color(0xFFBDBDBD),
                    textAlign = TextAlign.Center,
                    modifier = Modifier.weight(1f),
                    maxLines = 1
                )
            }
        }
    }
}

// ==================== SECTION HEADER COMPOSABLE ====================

@Composable
private fun IntakeSectionHeader(
    icon: ImageVector,
    title: String,
    subtitle: String
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                brush = Brush.horizontalGradient(
                    colors = listOf(TealLight, Color(0xFFF5FFFE))
                ),
                shape = RoundedCornerShape(14.dp)
            )
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .background(TealDark, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(24.dp))
        }
        Spacer(modifier = Modifier.width(14.dp))
        Column {
            Text(title, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TealDark)
            Text(subtitle, fontSize = 13.sp, color = Color(0xFF78909C))
        }
    }
}

// ==================== TEAL CHIP ====================

@Composable
fun TealSelectableChip(
    text: String,
    selected: Boolean,
    onClick: () -> Unit,
    leadingIcon: ImageVector? = null
) {
    val bgColor = if (selected) ChipSelectedBg else ChipUnselectedBg
    val textColor = if (selected) Color.White else TealDark
    val borderColor = if (selected) ChipSelectedBg else TealAccent.copy(alpha = 0.3f)

    Surface(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        color = bgColor,
        border = BorderStroke(1.dp, borderColor)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (leadingIcon != null) {
                Icon(
                    leadingIcon,
                    contentDescription = null,
                    tint = textColor,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
            }
            Text(
                text = text,
                color = textColor,
                fontSize = 13.sp,
                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            if (selected) {
                Spacer(modifier = Modifier.width(4.dp))
                Icon(
                    Icons.Default.CheckCircle,
                    contentDescription = null,
                    tint = Color.White.copy(alpha = 0.8f),
                    modifier = Modifier.size(14.dp)
                )
            }
        }
    }
}

// ==================== BOTTOM ACTION BAR ====================

@Composable
private fun IntakeBottomBar(
    onBack: (() -> Unit)? = null,
    onNext: () -> Unit,
    nextLabel: String = "Save & Continue",
    nextEnabled: Boolean = true
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shadowElevation = 8.dp,
        color = MaterialTheme.colorScheme.surface
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (onBack != null) {
                OutlinedButton(
                    onClick = onBack,
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp),
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.dp, TealDark.copy(alpha = 0.3f))
                ) {
                    Icon(Icons.Default.ArrowBack, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Back", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                }
            }
            Button(
                onClick = onNext,
                modifier = Modifier
                    .weight(if (onBack != null) 2f else 1f)
                    .height(48.dp),
                shape = RoundedCornerShape(14.dp),
                enabled = nextEnabled,
                colors = ButtonDefaults.buttonColors(containerColor = TealDark)
            ) {
                Text(nextLabel, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                Spacer(modifier = Modifier.width(6.dp))
                Icon(Icons.Default.ArrowForward, contentDescription = null, modifier = Modifier.size(18.dp))
            }
        }
    }
}

// ==================== STEP 1: REASON FOR VISIT ====================

@Composable
fun IntakeStep1_ReasonForVisit(
    specialization: String,
    reasonForVisit: String,
    onReasonChange: (String) -> Unit,
    reasonDescription: String,
    onDescriptionChange: (String) -> Unit,
    onNext: () -> Unit,
    onBack: () -> Unit
) {
    val options = remember(specialization) { getPredefinedOptions(specialization) }
    val reasons = options.first

    Column(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            IntakeProgressBar(currentStep = 1)

            IntakeSectionHeader(
                icon = Icons.Outlined.MedicalInformation,
                title = "What brings you today?",
                subtitle = "Select or describe your primary concern"
            )

            // Reason chips in flowing grid
            Text("Select Primary Reason", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = TealDark)

            // Use FlowRow-like layout with wrapping
            val chunkedReasons = reasons.chunked(2)
            chunkedReasons.forEach { row ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    row.forEach { reason ->
                        Box(modifier = Modifier.weight(1f)) {
                            TealSelectableChip(
                                text = reason,
                                selected = reasonForVisit == reason,
                                onClick = { onReasonChange(if (reasonForVisit == reason) "" else reason) }
                            )
                        }
                    }
                    // Fill remaining space if odd number
                    if (row.size < 2) {
                        Spacer(modifier = Modifier.weight(1f))
                    }
                }
            }

            // Other option
            TealSelectableChip(
                text = "Other (Please specify below)",
                selected = reasonForVisit.isNotBlank() && !reasons.contains(reasonForVisit),
                onClick = { if (reasons.contains(reasonForVisit)) onReasonChange("") },
                leadingIcon = Icons.Outlined.Edit
            )

            // Free-text reason
            OutlinedTextField(
                value = if (reasons.contains(reasonForVisit)) "" else reasonForVisit,
                onValueChange = onReasonChange,
                label = { Text("Or type your reason") },
                placeholder = { Text("e.g. Follow up, Annual checkup...") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = TealDark,
                    focusedLabelColor = TealDark
                )
            )

            Spacer(modifier = Modifier.height(4.dp))

            // Description box
            Text("Describe your concern", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = TealDark)
            OutlinedTextField(
                value = reasonDescription,
                onValueChange = { if (it.length <= 500) onDescriptionChange(it) },
                placeholder = { Text("Tell the doctor more about what you're experiencing...") },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(120.dp),
                shape = RoundedCornerShape(14.dp),
                maxLines = 5,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = TealDark,
                    focusedLabelColor = TealDark
                ),
                supportingText = {
                    Text(
                        "${reasonDescription.length}/500",
                        fontSize = 11.sp,
                        color = if (reasonDescription.length > 450) SeverityOrange else Color(0xFF9E9E9E),
                        modifier = Modifier.fillMaxWidth(),
                        textAlign = TextAlign.End
                    )
                }
            )
        }

        IntakeBottomBar(
            onBack = onBack,
            onNext = onNext,
            nextEnabled = reasonForVisit.isNotBlank()
        )
    }
}

// ==================== STEP 2: SYMPTOM DETAILS ====================

@Composable
fun IntakeStep2_SymptomDetails(
    specialization: String,
    selectedSymptoms: Set<String>,
    onSymptomsChange: (Set<String>) -> Unit,
    customSymptoms: String,
    onCustomSymptomsChange: (String) -> Unit,
    severityCurrent: Int,
    onSeverityCurrentChange: (Int) -> Unit,
    severityWorst: Int,
    onSeverityWorstChange: (Int) -> Unit,
    onsetType: String,
    onOnsetTypeChange: (String) -> Unit,
    symptomDuration: String,
    onDurationChange: (String) -> Unit,
    symptomPattern: String,
    onPatternChange: (String) -> Unit,
    onNext: () -> Unit,
    onBack: () -> Unit
) {
    val options = remember(specialization) { getPredefinedOptions(specialization) }
    val predefinedSymptoms = options.second

    Column(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            IntakeProgressBar(currentStep = 2)

            IntakeSectionHeader(
                icon = Icons.Outlined.Healing,
                title = "Symptom Details",
                subtitle = "Help us understand your symptoms better"
            )

            // === Onset & Duration ===
            Text("How did it start?", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = TealDark)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                TealSelectableChip(
                    text = "⚡ Sudden",
                    selected = onsetType == "sudden",
                    onClick = { onOnsetTypeChange(if (onsetType == "sudden") "" else "sudden") }
                )
                TealSelectableChip(
                    text = "📈 Gradual",
                    selected = onsetType == "gradual",
                    onClick = { onOnsetTypeChange(if (onsetType == "gradual") "" else "gradual") }
                )
            }

            Text("How long have you had this?", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = TealDark)
            val durations = listOf("< 24 hours" to "less_than_24h", "1–3 days" to "1_3_days", "3–7 days" to "3_7_days", "> 1 week" to "1_week_plus")
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                durations.forEach { (label, value) ->
                    Box(modifier = Modifier.weight(1f)) {
                        TealSelectableChip(
                            text = label,
                            selected = symptomDuration == value,
                            onClick = { onDurationChange(if (symptomDuration == value) "" else value) }
                        )
                    }
                }
            }

            Text("Pattern", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = TealDark)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                TealSelectableChip(
                    text = "Constant",
                    selected = symptomPattern == "constant",
                    onClick = { onPatternChange(if (symptomPattern == "constant") "" else "constant") }
                )
                TealSelectableChip(
                    text = "Comes & Goes",
                    selected = symptomPattern == "comes_and_goes",
                    onClick = { onPatternChange(if (symptomPattern == "comes_and_goes") "" else "comes_and_goes") }
                )
            }

            HorizontalDivider(color = TealLight, thickness = 1.dp)

            // === Severity Sliders ===
            Text("Pain / Discomfort Level", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = TealDark)

            SeveritySliderSection(
                label = "Right Now",
                value = severityCurrent,
                onValueChange = onSeverityCurrentChange
            )

            SeveritySliderSection(
                label = "Worst It Has Been",
                value = severityWorst,
                onValueChange = onSeverityWorstChange
            )

            HorizontalDivider(color = TealLight, thickness = 1.dp)

            // === Symptom Chips ===
            Text("Associated Symptoms", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = TealDark)
            Text("Select all that apply", fontSize = 12.sp, color = Color(0xFF90A4AE))

            val allSymptoms = predefinedSymptoms + listOf("None of these")
            val chunkedSymptoms = allSymptoms.chunked(2)
            chunkedSymptoms.forEach { row ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    row.forEach { symptom ->
                        Box(modifier = Modifier.weight(1f)) {
                            TealSelectableChip(
                                text = symptom,
                                selected = selectedSymptoms.contains(symptom),
                                onClick = {
                                    val newSet = if (symptom == "None of these") {
                                        if (selectedSymptoms.contains(symptom)) emptySet() else setOf(symptom)
                                    } else {
                                        val filtered = selectedSymptoms - "None of these"
                                        if (filtered.contains(symptom)) filtered - symptom else filtered + symptom
                                    }
                                    onSymptomsChange(newSet)
                                }
                            )
                        }
                    }
                    if (row.size < 2) Spacer(modifier = Modifier.weight(1f))
                }
            }

            // Custom symptoms input
            OutlinedTextField(
                value = customSymptoms,
                onValueChange = onCustomSymptomsChange,
                label = { Text("Other symptoms") },
                placeholder = { Text("e.g. Dizziness, Fatigue...") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = TealDark,
                    focusedLabelColor = TealDark
                )
            )

            Spacer(modifier = Modifier.height(8.dp))
        }

        IntakeBottomBar(onBack = onBack, onNext = onNext)
    }
}

@Composable
private fun SeveritySliderSection(
    label: String,
    value: Int,
    onValueChange: (Int) -> Unit
) {
    val severityLabel = when {
        value == 0 -> "No Pain"
        value <= 3 -> "Mild"
        value <= 6 -> "Moderate"
        else -> "Severe"
    }
    val severityColor = when {
        value == 0 -> Color(0xFF9E9E9E)
        value <= 3 -> SeverityGreen
        value <= 6 -> SeverityOrange
        else -> SeverityRed
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = CardBg),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        border = BorderStroke(1.dp, TealAccent.copy(alpha = 0.15f))
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(label, fontSize = 13.sp, fontWeight = FontWeight.Medium, color = Color(0xFF546E7A))
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = severityColor.copy(alpha = 0.15f)
                ) {
                    Text(
                        "$value/10 · $severityLabel",
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = severityColor
                    )
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Slider(
                value = value.toFloat(),
                onValueChange = { onValueChange(it.toInt()) },
                valueRange = 0f..10f,
                steps = 9,
                colors = SliderDefaults.colors(
                    thumbColor = severityColor,
                    activeTrackColor = severityColor,
                    inactiveTrackColor = severityColor.copy(alpha = 0.2f)
                )
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("0", fontSize = 10.sp, color = Color(0xFFBDBDBD))
                Text("5", fontSize = 10.sp, color = Color(0xFFBDBDBD))
                Text("10", fontSize = 10.sp, color = Color(0xFFBDBDBD))
            }
        }
    }
}

// ==================== STEP 3: MEDICAL & SAFETY ====================

@Composable
fun IntakeStep3_MedicalSafety(
    knownAllergies: Set<String>,
    onAllergiesChange: (Set<String>) -> Unit,
    customAllergyInput: String,
    onCustomAllergyChange: (String) -> Unit,
    currentMedications: String,
    onMedicationsChange: (String) -> Unit,
    medicalHistory: String,
    onMedicalHistoryChange: (String) -> Unit,
    onNext: () -> Unit,
    onBack: () -> Unit
) {
    val commonAllergies = listOf(
        "No Known Allergies", "Penicillin", "Sulfa Drugs", "NSAIDs",
        "Aspirin", "Ibuprofen", "Latex", "Codeine"
    )

    Column(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            IntakeProgressBar(currentStep = 3)

            IntakeSectionHeader(
                icon = Icons.Outlined.Shield,
                title = "Medical & Safety Info",
                subtitle = "Critical information for your safety"
            )

            // Drug allergies
            Text("Known Drug Allergies", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = TealDark)
            Text("Select all that apply", fontSize = 12.sp, color = Color(0xFF90A4AE))

            val chunkedAllergies = commonAllergies.chunked(2)
            chunkedAllergies.forEach { row ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    row.forEach { allergy ->
                        Box(modifier = Modifier.weight(1f)) {
                            TealSelectableChip(
                                text = allergy,
                                selected = knownAllergies.contains(allergy),
                                onClick = {
                                    val newSet = if (allergy == "No Known Allergies") {
                                        if (knownAllergies.contains(allergy)) emptySet() else setOf(allergy)
                                    } else {
                                        val filtered = knownAllergies - "No Known Allergies"
                                        if (filtered.contains(allergy)) filtered - allergy else filtered + allergy
                                    }
                                    onAllergiesChange(newSet)
                                },
                                leadingIcon = if (allergy == "No Known Allergies") Icons.Outlined.CheckCircle else null
                            )
                        }
                    }
                    if (row.size < 2) Spacer(modifier = Modifier.weight(1f))
                }
            }

            OutlinedTextField(
                value = customAllergyInput,
                onValueChange = onCustomAllergyChange,
                label = { Text("Other allergies") },
                placeholder = { Text("Type any other allergies...") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = TealDark,
                    focusedLabelColor = TealDark
                )
            )

            HorizontalDivider(color = TealLight, thickness = 1.dp)

            // Current medications
            Text("Current Medications", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = TealDark)
            OutlinedTextField(
                value = currentMedications,
                onValueChange = { if (it.length <= 500) onMedicationsChange(it) },
                placeholder = { Text("List medicines you're currently taking...") },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(100.dp),
                shape = RoundedCornerShape(14.dp),
                maxLines = 4,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = TealDark,
                    focusedLabelColor = TealDark
                )
            )

            // Medical history
            Text("Existing Medical Conditions", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = TealDark)
            OutlinedTextField(
                value = medicalHistory,
                onValueChange = { if (it.length <= 500) onMedicalHistoryChange(it) },
                placeholder = { Text("e.g. Diabetes, Hypertension, Asthma...") },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(100.dp),
                shape = RoundedCornerShape(14.dp),
                maxLines = 4,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = TealDark,
                    focusedLabelColor = TealDark
                )
            )

            // Emergency card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF3E0)),
                border = BorderStroke(1.dp, SeverityOrange.copy(alpha = 0.3f))
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Outlined.Warning,
                        contentDescription = null,
                        tint = SeverityOrange,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            "Medical Emergency?",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = Color(0xFFE65100)
                        )
                        Text(
                            "Call 112 immediately for life-threatening emergencies",
                            fontSize = 12.sp,
                            color = Color(0xFFBF360C)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
        }

        IntakeBottomBar(onBack = onBack, onNext = onNext)
    }
}

// ==================== STEP 4: VOICE NOTE ====================

@Composable
fun IntakeStep4_VoiceNote(
    voiceNoteRecorded: Boolean,
    voiceNoteDuration: String,
    isRecording: Boolean,
    onStartRecording: () -> Unit,
    onStopRecording: () -> Unit,
    onDeleteVoiceNote: () -> Unit,
    isUploading: Boolean,
    onNext: () -> Unit,
    onBack: () -> Unit
) {
    var recordingSeconds by remember { mutableIntStateOf(0) }

    LaunchedEffect(isRecording) {
        if (isRecording) {
            recordingSeconds = 0
            while (true) {
                delay(1000)
                recordingSeconds++
            }
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            IntakeProgressBar(currentStep = 4)

            IntakeSectionHeader(
                icon = Icons.Outlined.Mic,
                title = "Voice Note",
                subtitle = "Describe your symptoms in your own words"
            )

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = CardBg),
                border = BorderStroke(1.dp, TealAccent.copy(alpha = 0.2f))
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("🎙️ Voice Note", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TealDark)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        "Record a message describing your symptoms — this helps the doctor better understand your condition before consultation",
                        fontSize = 12.sp, color = Color(0xFF78909C), textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(16.dp))

                    if (voiceNoteRecorded && !isRecording) {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = TealLight)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.PlayCircle, contentDescription = "Play", tint = TealDark, modifier = Modifier.size(36.dp))
                                Spacer(modifier = Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("Voice Note Recorded", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = TealDark)
                                    Text(
                                        if (isUploading) "Uploading to server..." else "Duration: $voiceNoteDuration",
                                        fontSize = 12.sp,
                                        color = if (isUploading) SeverityOrange else Color(0xFF78909C)
                                    )
                                }
                                if (isUploading) {
                                    CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp, color = TealDark)
                                } else {
                                    IconButton(onClick = onDeleteVoiceNote) {
                                        Icon(Icons.Default.Delete, contentDescription = "Delete", tint = SeverityRed)
                                    }
                                }
                            }
                        }
                    } else {
                        val infiniteTransition = rememberInfiniteTransition(label = "pulse")
                        val pulseAlpha by infiniteTransition.animateFloat(
                            initialValue = 0.3f, targetValue = 1f,
                            animationSpec = infiniteRepeatable(animation = tween(800), repeatMode = RepeatMode.Reverse),
                            label = "pulse"
                        )

                        Box(
                            modifier = Modifier
                                .size(80.dp)
                                .then(if (isRecording) Modifier.background(SeverityRed.copy(alpha = pulseAlpha * 0.15f), CircleShape) else Modifier)
                                .clip(CircleShape)
                                .background(if (isRecording) SeverityRed else TealDark)
                                .clickable { if (isRecording) onStopRecording() else onStartRecording() },
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                if (isRecording) Icons.Default.Stop else Icons.Default.Mic,
                                contentDescription = if (isRecording) "Stop" else "Record",
                                tint = Color.White, modifier = Modifier.size(36.dp)
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            if (isRecording) { val m = recordingSeconds / 60; val s = recordingSeconds % 60; "Recording... ${String.format("%02d:%02d", m, s)}" } else "Tap to record",
                            fontSize = 13.sp, fontWeight = if (isRecording) FontWeight.Bold else FontWeight.Normal,
                            color = if (isRecording) SeverityRed else Color(0xFF78909C)
                        )
                    }
                }
            }

            // Tips card
            Card(
                modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFF1F8E9)),
                border = BorderStroke(1.dp, Color(0xFFC5E1A5).copy(alpha = 0.5f))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("💡 Tips for a helpful voice note", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF33691E))
                    Spacer(modifier = Modifier.height(8.dp))
                    listOf("Describe when the problem started", "Mention what makes it better or worse", "Share any self-treatment you've tried", "Keep it under 2 minutes").forEach { tip ->
                        Text("• $tip", fontSize = 12.sp, color = Color(0xFF558B2F), lineHeight = 18.sp)
                    }
                }
            }

            // Confidentiality notice
            Card(
                modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFF3E5F5).copy(alpha = 0.5f)),
                border = BorderStroke(1.dp, Color(0xFFCE93D8).copy(alpha = 0.3f))
            ) {
                Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.Lock, contentDescription = null, tint = Color(0xFF7B1FA2), modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(10.dp))
                    Text("Your voice note is encrypted and only audible to your consulting doctor", fontSize = 12.sp, color = Color(0xFF6A1B9A), lineHeight = 16.sp)
                }
            }

            // Optional step notice
            Card(
                modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFFFFDE7)),
                border = BorderStroke(1.dp, Color(0xFFFFF59D).copy(alpha = 0.5f))
            ) {
                Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("ℹ️", fontSize = 18.sp)
                    Spacer(modifier = Modifier.width(10.dp))
                    Text("This step is optional — you can skip it and proceed to review", fontSize = 12.sp, color = Color(0xFFF57F17), lineHeight = 16.sp)
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
        }

        IntakeBottomBar(onBack = onBack, onNext = onNext, nextLabel = "Review Intake", nextEnabled = !isUploading)
    }
}

// ==================== STEP 5: REVIEW INTAKE ====================

@Composable
fun IntakeStep5_ReviewIntake(
    reasonForVisit: String,
    reasonDescription: String,
    selectedSymptoms: Set<String>,
    customSymptoms: String,
    severityCurrent: Int,
    severityWorst: Int,
    onsetType: String,
    symptomDuration: String,
    symptomPattern: String,
    knownAllergies: Set<String>,
    customAllergy: String,
    currentMedications: String,
    medicalHistory: String,
    voiceNoteRecorded: Boolean,
    onEditStep: (Int) -> Unit,
    onSubmit: () -> Unit,
    onBack: () -> Unit
) {
    val severityColor = when {
        severityCurrent <= 3 -> SeverityGreen
        severityCurrent <= 6 -> SeverityOrange
        else -> SeverityRed
    }
    val severityLabel = when {
        severityCurrent == 0 -> "No Pain"
        severityCurrent <= 3 -> "Mild"
        severityCurrent <= 6 -> "Moderate"
        else -> "Severe"
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            IntakeProgressBar(currentStep = 5)

            IntakeSectionHeader(
                icon = Icons.Outlined.FactCheck,
                title = "Review Your Intake",
                subtitle = "Please verify all details before submitting"
            )

            // === Reason Section ===
            ReviewSectionCard(
                title = "🏷️ Reason for Visit",
                onEdit = { onEditStep(1) }
            ) {
                Text(reasonForVisit, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface)
                if (reasonDescription.isNotBlank()) {
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(reasonDescription, fontSize = 13.sp, color = Color(0xFF546E7A), lineHeight = 18.sp)
                }
            }

            // === Symptoms Section ===
            ReviewSectionCard(
                title = "🩺 Symptoms & Severity",
                onEdit = { onEditStep(2) }
            ) {
                // Severity badge
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = severityColor.copy(alpha = 0.15f)
                    ) {
                        Text(
                            "Current: $severityCurrent/10 · $severityLabel",
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = severityColor
                        )
                    }
                    if (severityWorst > 0) {
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Worst: $severityWorst/10", fontSize = 12.sp, color = Color(0xFF78909C))
                    }
                }
                if (onsetType.isNotBlank() || symptomDuration.isNotBlank()) {
                    Spacer(modifier = Modifier.height(6.dp))
                    val durationDisplay = when (symptomDuration) {
                        "less_than_24h" -> "< 24 hrs"
                        "1_3_days" -> "1–3 days"
                        "3_7_days" -> "3–7 days"
                        "1_week_plus" -> "> 1 week"
                        else -> ""
                    }
                    val metaItems = listOfNotNull(
                        if (onsetType.isNotBlank()) "Onset: ${onsetType.replaceFirstChar { it.uppercase() }}" else null,
                        if (durationDisplay.isNotBlank()) "Duration: $durationDisplay" else null,
                        if (symptomPattern.isNotBlank()) "Pattern: ${symptomPattern.replace("_", " ").replaceFirstChar { it.uppercase() }}" else null
                    )
                    Text(metaItems.joinToString(" • "), fontSize = 12.sp, color = Color(0xFF78909C))
                }
                if (selectedSymptoms.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        selectedSymptoms.joinToString(", "),
                        fontSize = 13.sp,
                        color = TealDark,
                        fontWeight = FontWeight.Medium
                    )
                }
                if (customSymptoms.isNotBlank()) {
                    Text("Also: $customSymptoms", fontSize = 12.sp, color = Color(0xFF78909C))
                }
            }

            // === Medical Safety Section ===
            ReviewSectionCard(
                title = "🛡️ Medical Safety",
                onEdit = { onEditStep(3) }
            ) {
                val allAllergies = knownAllergies.toList() + if (customAllergy.isNotBlank()) listOf(customAllergy) else emptyList()
                Text(
                    "Allergies: ${if (allAllergies.isEmpty()) "None specified" else allAllergies.joinToString(", ")}",
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
                if (currentMedications.isNotBlank()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("Medications: $currentMedications", fontSize = 13.sp, color = Color(0xFF546E7A))
                }
                if (medicalHistory.isNotBlank()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("History: $medicalHistory", fontSize = 13.sp, color = Color(0xFF546E7A))
                }
            }

            // === Attachments Section ===
            ReviewSectionCard(
                title = "🎙️ Voice Note",
                onEdit = { onEditStep(4) }
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (voiceNoteRecorded) {
                        Icon(Icons.Default.Mic, contentDescription = null, tint = TealDark, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Voice Note Recorded ✓", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TealDark)
                    } else {
                        Icon(Icons.Outlined.MicOff, contentDescription = null, tint = Color(0xFF90A4AE), modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("No voice note recorded", fontSize = 13.sp, color = Color(0xFF90A4AE))
                    }
                }
            }

            // Trust badges
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = TealLight.copy(alpha = 0.4f))
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    TrustBadge(icon = Icons.Outlined.Lock, label = "Encrypted")
                    TrustBadge(icon = Icons.Outlined.VerifiedUser, label = "Verified")
                    TrustBadge(icon = Icons.Outlined.Security, label = "HIPAA")
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
        }

        IntakeBottomBar(
            onBack = onBack,
            onNext = onSubmit,
            nextLabel = "Submit & Proceed"
        )
    }
}

@Composable
private fun ReviewSectionCard(
    title: String,
    onEdit: () -> Unit,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = TealDark)
                IconButton(
                    onClick = onEdit,
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(
                        Icons.Outlined.Edit,
                        contentDescription = "Edit",
                        tint = TealAccent,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            content()
        }
    }
}

@Composable
private fun TrustBadge(icon: ImageVector, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(icon, contentDescription = null, tint = TealDark, modifier = Modifier.size(20.dp))
        Spacer(modifier = Modifier.height(4.dp))
        Text(label, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, color = TealDark)
    }
}
