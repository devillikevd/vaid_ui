package com.example.swastik.ui.screens.patient.wellness

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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.data.remote.dto.FitnessCenterDto
import com.example.swastik.ui.viewmodel.QrCheckInViewModel
import com.google.gson.JsonObject
import java.util.Locale

private val WellnessGreen = Color(0xFF2E7D32)
private val WellnessGreenLight = Color(0xFFE8F5E9)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QrGymCheckInScreen(
    onBackClick: () -> Unit
) {
    val viewModel: QrCheckInViewModel = hiltViewModel()
    val uiState by viewModel.uiState.collectAsState()
    var qrToken by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Gym Check-in", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = WellnessGreen,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                uiState.checkInResult != null -> {
                    val checkInResult = uiState.checkInResult
                    if (checkInResult != null) {
                        CheckInSuccessContent(
                            centerName = uiState.centers.firstOrNull { it.id == uiState.selectedCenterId }?.name,
                            result = checkInResult,
                            onDone = viewModel::clearResult
                        )
                    }
                }
                uiState.isLoading -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = WellnessGreen)
                    }
                }
                uiState.error != null -> {
                    CheckInErrorContent(
                        message = uiState.error ?: "Something went wrong",
                        onRetry = viewModel::loadCenters
                    )
                }
                uiState.centers.isEmpty() -> {
                    EmptyCentersContent()
                }
                else -> {
                    CheckInForm(
                        centers = uiState.centers,
                        selectedCenterId = uiState.selectedCenterId,
                        isCheckingIn = uiState.isCheckingIn,
                        qrToken = qrToken,
                        onTokenChange = { qrToken = it },
                        onSelectCenter = viewModel::selectCenter,
                        onCheckIn = { viewModel.checkIn(qrToken.ifBlank { null }) }
                    )
                }
            }
        }
    }
}

@Composable
private fun CheckInForm(
    centers: List<FitnessCenterDto>,
    selectedCenterId: String?,
    isCheckingIn: Boolean,
    qrToken: String,
    onTokenChange: (String) -> Unit,
    onSelectCenter: (String) -> Unit,
    onCheckIn: () -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text(
                "Select a center",
                fontWeight = FontWeight.SemiBold,
                fontSize = 16.sp
            )
        }
        items(centers, key = { it.id }) { center ->
            CenterCard(
                center = center,
                selected = center.id == selectedCenterId,
                onClick = { onSelectCenter(center.id) }
            )
        }
        item {
            OutlinedTextField(
                value = qrToken,
                onValueChange = onTokenChange,
                label = { Text("QR token (optional)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
        }
        item {
            Button(
                onClick = onCheckIn,
                enabled = !isCheckingIn && selectedCenterId != null,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = WellnessGreen),
                shape = RoundedCornerShape(16.dp)
            ) {
                if (isCheckingIn) {
                    CircularProgressIndicator(
                        color = Color.White,
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp
                    )
                    Spacer(Modifier.width(8.dp))
                    Text("Checking in...", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                } else {
                    Text("Check In", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
            }
        }
        item { Spacer(Modifier.height(16.dp)) }
    }
}

@Composable
private fun CenterCard(
    center: FitnessCenterDto,
    selected: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = if (selected) WellnessGreenLight else Color.White
        ),
        shape = RoundedCornerShape(14.dp),
        elevation = CardDefaults.cardElevation(if (selected) 4.dp else 1.dp),
        border = BorderStroke(
            width = if (selected) 1.5.dp else 1.dp,
            color = if (selected) WellnessGreen else Color(0xFFE0E0E0)
        )
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            RadioButton(
                selected = selected,
                onClick = onClick,
                colors = RadioButtonDefaults.colors(selectedColor = WellnessGreen)
            )
            Spacer(Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(center.name, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                center.centerType?.let { type ->
                    Text(
                        type.replaceFirstChar { it.titlecase(Locale.getDefault()) },
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                }
                val addressLine = listOfNotNull(center.address, center.city).joinToString(", ")
                if (addressLine.isNotBlank()) {
                    Text(addressLine, fontSize = 12.sp, color = Color.Gray, maxLines = 1)
                }
            }
            Spacer(Modifier.width(8.dp))
            Column(horizontalAlignment = Alignment.End) {
                center.rating?.let { rating ->
                    Text(
                        "★ %.1f".format(Locale.US, rating),
                        fontSize = 13.sp,
                        color = Color(0xFFF57F17),
                        fontWeight = FontWeight.SemiBold
                    )
                }
                center.distance?.let { distance ->
                    Text(
                        "%.1f km".format(Locale.US, distance),
                        fontSize = 11.sp,
                        color = Color.Gray
                    )
                }
            }
        }
    }
}

@Composable
private fun CheckInSuccessContent(
    centerName: String?,
    result: JsonObject,
    onDone: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp)
    ) {
        Spacer(Modifier.height(24.dp))
        Box(
            modifier = Modifier
                .size(120.dp)
                .background(WellnessGreen, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Filled.CheckCircle,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(64.dp)
            )
        }
        Spacer(Modifier.height(32.dp))
        Text("Check-in Successful!", fontWeight = FontWeight.ExtraBold, fontSize = 28.sp, textAlign = TextAlign.Center)
        centerName?.let {
            Spacer(Modifier.height(12.dp))
            Text(it, color = WellnessGreen, fontWeight = FontWeight.Bold, fontSize = 20.sp, textAlign = TextAlign.Center)
        }
        val time = checkInTime(result)
        if (time.isNotBlank()) {
            Spacer(Modifier.height(8.dp))
            Text(time, color = Color.Gray, fontSize = 16.sp)
        }
        Spacer(Modifier.weight(1f))
        Button(
            onClick = onDone,
            colors = ButtonDefaults.buttonColors(containerColor = WellnessGreen),
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = RoundedCornerShape(16.dp)
        ) {
            Text("Done", fontWeight = FontWeight.Bold, fontSize = 16.sp)
        }
    }
}

@Composable
private fun CheckInErrorContent(
    message: String,
    onRetry: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp)
    ) {
        Spacer(Modifier.weight(1f))
        Icon(Icons.Filled.ErrorOutline, contentDescription = null, tint = Color.Red, modifier = Modifier.size(72.dp))
        Spacer(Modifier.height(16.dp))
        Text("Something went wrong", fontWeight = FontWeight.Bold, fontSize = 22.sp)
        Spacer(Modifier.height(8.dp))
        Text(message, color = Color.Gray, textAlign = TextAlign.Center)
        Spacer(Modifier.height(32.dp))
        Button(
            onClick = onRetry,
            colors = ButtonDefaults.buttonColors(containerColor = WellnessGreen),
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp)
        ) {
            Text("Retry", fontWeight = FontWeight.Bold)
        }
        Spacer(Modifier.weight(1f))
    }
}

@Composable
private fun EmptyCentersContent() {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        verticalArrangement = Arrangement.Center
    ) {
        Icon(Icons.Filled.FitnessCenter, contentDescription = null, tint = Color.LightGray, modifier = Modifier.size(64.dp))
        Spacer(Modifier.height(12.dp))
        Text("No centers available", fontWeight = FontWeight.SemiBold, fontSize = 18.sp, color = Color.Gray)
        Spacer(Modifier.height(4.dp))
        Text("Check back later", fontSize = 14.sp, color = Color.LightGray)
    }
}

private fun checkInTime(result: JsonObject): String {
    val raw = runCatching {
        result.get("checked_in_at")?.takeIf { !it.isJsonNull }?.asString
            ?: result.get("created_at")?.takeIf { !it.isJsonNull }?.asString
    }.getOrNull()
    if (raw.isNullOrBlank()) return ""
    val formatter = java.time.format.DateTimeFormatter.ofPattern("hh:mm a, dd MMM yyyy")
    return try {
        java.time.ZonedDateTime.parse(raw).format(formatter)
    } catch (e: Exception) {
        try {
            java.time.LocalDateTime.parse(raw).format(formatter)
        } catch (e2: Exception) {
            raw
        }
    }
}
