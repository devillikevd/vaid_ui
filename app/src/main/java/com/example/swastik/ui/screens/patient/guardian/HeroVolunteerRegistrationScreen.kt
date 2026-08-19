package com.example.swastik.ui.screens.patient.guardian

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.ui.viewmodel.EmergencyNetworkViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HeroVolunteerRegistrationScreen(
    onNavigateBack: () -> Unit,
    viewModel: EmergencyNetworkViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val scrollState = rememberScrollState()

    var selectedTier by remember { mutableStateOf("CPR_VOLUNTEER") }
    val selectedSkills = remember { mutableStateListOf("CPR", "FIRST_AID") }
    var registrationNo by remember { mutableStateOf("") }
    var councilName by remember { mutableStateOf("") }
    var certDocumentUrl by remember { mutableStateOf("") }

    val tiers = listOf(
        Triple("DOCTOR", "Doctor / Physician 👨‍⚕️", "MBBS / MD / MS certified medical doctor"),
        Triple("NURSE", "Nurse / Nursing Officer 👩‍⚕️", "B.Sc / GNM registered nurse"),
        Triple("PARAMEDIC", "EMT / Paramedic 🚑", "Certified Emergency Medical Technician"),
        Triple("CPR_VOLUNTEER", "CPR & First-Aid Volunteer 💓", "Red Cross, AHA, St. John Ambulance certified"),
        Triple("SAMARITAN", "Community Good Samaritan 🤝", "Trained citizen willing to provide urgent help")
    )

    val availableSkills = listOf(
        "CPR (Chest Compressions)" to "CPR",
        "AED Operation" to "AED",
        "Severe Bleeding / Tourniquet" to "BLEEDING_CONTROL",
        "Airway & Recovery Position" to "AIRWAY",
        "Fractures & Splinting" to "FRACTURE_SPLINT",
        "Burn & Wound Care" to "WOUND_CARE"
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "Join Emergency Hero Mesh",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(MaterialTheme.colorScheme.background)
                .verticalScroll(scrollState)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Hero Banner
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(20.dp))
                    .background(
                        Brush.linearGradient(
                            colors = listOf(Color(0xFF881337), Color(0xFFE11D48), Color(0xFFFB7185))
                        )
                    )
                    .padding(20.dp)
            ) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .clip(CircleShape)
                                .background(Color.White.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("🛡️", fontSize = 22.sp)
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                "Swastik Community Responders",
                                color = Color.White,
                                fontSize = 17.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                "Save Lives During The Platinum 10 Mins",
                                color = Color.White.copy(alpha = 0.85f),
                                fontSize = 12.sp
                            )
                        }
                    }
                }
            }

            // How It Works Explainer Card
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Info,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            "How The First-Responder Mesh Works",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                    }
                    Spacer(modifier = Modifier.height(12.dp))

                    HowItWorksStep(
                        step = "1",
                        title = "Peacetime Registration",
                        desc = "Register your healthcare or CPR credentials once. You do NOT need to do anything during your own emergency."
                    )
                    HowItWorksStep(
                        step = "2",
                        title = "Keep On-Duty Status Active",
                        desc = "When you are in your neighborhood or clinic, your duty status alerts you only when someone nearby needs urgent help."
                    )
                    HowItWorksStep(
                        step = "3",
                        title = "Hyperlocal Loud SOS Alarms (<1.5 km)",
                        desc = "If a severe vehicle crash or fall occurs near you, your phone rings a critical siren with exact GPS lane routing."
                    )
                    HowItWorksStep(
                        step = "4",
                        title = "Arrive & Stabilize Before Ambulance",
                        desc = "Administer immediate CPR or stop bleeding in 2-4 minutes, then 1-tap dispatch a verified ambulance and pre-alert the hospital."
                    )
                }
            }

            // Good Samaritan Legal Protection Note
            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(
                    containerColor = Color(0xFF0F766E).copy(alpha = 0.12f)
                ),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF0F766E).copy(alpha = 0.3f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("⚖️", fontSize = 20.sp)
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            "100% Legal Protection (Good Samaritan Law)",
                            color = Color(0xFF0F766E),
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                        Text(
                            "Under Section 134A of the Motor Vehicles Act & Supreme Court guidelines, first responders and volunteers are free from any police enquiry, civil or criminal liability.",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            // Step 1: Select Qualification Tier
            Text(
                "1. Select Your Medical / First-Aid Tier",
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp
            )

            tiers.forEach { (tierKey, label, desc) ->
                val isSelected = selectedTier == tierKey
                Card(
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface
                    ),
                    border = androidx.compose.foundation.BorderStroke(
                        if (isSelected) 2.dp else 1.dp,
                        if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { selectedTier = tierKey }
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(
                            selected = isSelected,
                            onClick = { selectedTier = tierKey }
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text(label, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text(desc, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }

            // Registration Number for Doctors / Nurses
            if (selectedTier == "DOCTOR" || selectedTier == "NURSE" || selectedTier == "PARAMEDIC") {
                OutlinedTextField(
                    value = registrationNo,
                    onValueChange = { registrationNo = it },
                    label = { Text("Medical / Nursing Council Registration No.") },
                    placeholder = { Text("e.g. MCI-DEL-2024-8841") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    leadingIcon = { Icon(Icons.Default.Badge, contentDescription = null) }
                )

                OutlinedTextField(
                    value = councilName,
                    onValueChange = { councilName = it },
                    label = { Text("State Medical / Nursing Council Name") },
                    placeholder = { Text("e.g. Delhi Medical Council / KMC") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    leadingIcon = { Icon(Icons.Default.AccountBalance, contentDescription = null) }
                )
            }

            // Step 2: Select Capabilities
            Text(
                "2. Your Verified Emergency Skillsets",
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp
            )

            availableSkills.forEach { (label, key) ->
                val hasSkill = selectedSkills.contains(key)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .clickable {
                            if (hasSkill) selectedSkills.remove(key) else selectedSkills.add(key)
                        }
                        .padding(vertical = 6.dp, horizontal = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Checkbox(
                        checked = hasSkill,
                        onCheckedChange = {
                            if (hasSkill) selectedSkills.remove(key) else selectedSkills.add(key)
                        }
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(label, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Submit Button
            Button(
                onClick = {
                    viewModel.registerResponder(
                        tier = selectedTier,
                        skills = selectedSkills.toList(),
                        registrationNo = registrationNo.ifBlank { null },
                        councilName = councilName.ifBlank { null },
                        onSuccess = onNavigateBack
                    )
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(54.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFE11D48)
                ),
                enabled = !uiState.isLoading
            ) {
                if (uiState.isLoading) {
                    CircularProgressIndicator(
                        color = Color.White,
                        modifier = Modifier.size(22.dp),
                        strokeWidth = 2.dp
                    )
                } else {
                    Icon(Icons.Default.CheckCircle, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        "Activate & Join Responder Mesh 🛡️",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))
        }
    }
}

@Composable
private fun HowItWorksStep(step: String, title: String, desc: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        verticalAlignment = Alignment.Top
    ) {
        Box(
            modifier = Modifier
                .size(24.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primary),
            contentAlignment = Alignment.Center
        ) {
            Text(
                step,
                color = MaterialTheme.colorScheme.onPrimary,
                fontWeight = FontWeight.Bold,
                fontSize = 12.sp
            )
        }
        Spacer(modifier = Modifier.width(10.dp))
        Column {
            Text(title, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
            Text(
                desc,
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                lineHeight = 16.sp
            )
        }
    }
}
