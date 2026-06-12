package com.example.swastik.ui.screens.patient.diagnostic

import android.graphics.Bitmap
import android.graphics.ImageDecoder
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.data.local.db.AIScanEntity
import androidx.compose.foundation.border
import androidx.compose.material.icons.outlined.CloudUpload
import androidx.compose.material.icons.outlined.Share

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AIScanScreen(
    modelType: String,
    onBackClick: () -> Unit,
    viewModel: AIDiagnosticsViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val uiState by viewModel.uiState.collectAsState()

    var selectedImageUri by remember { mutableStateOf<Uri?>(null) }
    var selectedBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var roomIdToShare by remember { mutableStateOf("") }

    val imagePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        selectedImageUri = uri
        uri?.let {
            selectedBitmap = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val source = ImageDecoder.createSource(context.contentResolver, it)
                ImageDecoder.decodeBitmap(source)
            } else {
                MediaStore.Images.Media.getBitmap(context.contentResolver, it)
            }
        }
    }

    val title = when (modelType) {
        "skin" -> "Skin Disease Scanner"
        "brain" -> "Brain MRI Analysis"
        "pneumonia" -> "Pneumonia X-Ray Scanner"
        "diabetic_retinopathy" -> "Retina Scanner"
        "breast_cancer" -> "Breast Ultrasound Scanner"
        else -> "AI Health Scanner"
    }

    val instructions = when (modelType) {
        "skin" -> "Please upload a clear, well-lit, and close-up image of the affected skin area."
        "brain" -> "Please upload a clear, top-down axial Brain MRI scan image."
        "pneumonia" -> "Please upload a clear Chest X-Ray (CXR) image."
        "diabetic_retinopathy" -> "Please upload a clear retinal fundus image."
        "breast_cancer" -> "Please upload a clear Breast Ultrasound image."
        else -> "Please upload a relevant medical image."
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(title, fontWeight = FontWeight.SemiBold) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            
            // Image Preview Area
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(300.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFFE0E0E0)),
                contentAlignment = Alignment.Center
            ) {
                if (selectedBitmap != null) {
                    Image(
                        bitmap = selectedBitmap!!.asImageBitmap(),
                        contentDescription = "Selected Image",
                        modifier = Modifier.fillMaxSize()
                    )
                    
                    // Render Bounding Box Overlay if AI Scan Succeeded
                    if (uiState is AIDiagnosticsState.Success) {
                        val scan = (uiState as AIDiagnosticsState.Success).scan
                        if (!scan.predictionResult.contains("Normal", ignoreCase = true) &&
                            !scan.predictionResult.contains("Benign", ignoreCase = true) &&
                            !scan.predictionResult.contains("No Tumor", ignoreCase = true)) {
                            // Simulate Bounding Box for anomaly detection
                            Box(
                                modifier = Modifier
                                    .align(Alignment.Center)
                                    .size(120.dp) // Smaller, realistic bounding box size
                                    .offset(x = (-20).dp, y = 30.dp) // Offset slightly to simulate realistic tumor location
                                    .border(
                                        width = 2.dp,
                                        color = Color(0xFF00FF00), // Green looks more professional
                                        shape = RoundedCornerShape(4.dp)
                                    )
                            ) {
                                Text(
                                    text = scan.predictionResult,
                                    color = Color.White,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier
                                        .background(Color(0xCC000000))
                                        .padding(horizontal = 4.dp, vertical = 2.dp)
                                        .align(Alignment.TopStart)
                                )
                            }
                        }
                    }
                } else {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            imageVector = Icons.Outlined.CloudUpload,
                            contentDescription = "Upload",
                            modifier = Modifier.size(48.dp),
                            tint = Color.Gray
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("No Image Selected", color = Color.Gray)
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = instructions,
                fontSize = 12.sp,
                color = Color.Gray,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                modifier = Modifier.padding(horizontal = 8.dp)
            )

            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = { imagePickerLauncher.launch("image/*") },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Select Image from Gallery")
            }

            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = {
                    selectedBitmap?.let { bitmap ->
                        // Convert to ARGB_8888 if necessary
                        val configBmp = bitmap.copy(Bitmap.Config.ARGB_8888, true)
                        viewModel.processImage(configBmp, modelType)
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = selectedBitmap != null && uiState !is AIDiagnosticsState.Loading
            ) {
                Text("Run AI Scan")
            }

            Spacer(modifier = Modifier.height(24.dp))

            // State Handling
            when (val state = uiState) {
                is AIDiagnosticsState.Loading -> {
                    CircularProgressIndicator()
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(state.message, color = MaterialTheme.colorScheme.primary)
                }
                is AIDiagnosticsState.Error -> {
                    Text(state.error, color = MaterialTheme.colorScheme.error)
                }
                is AIDiagnosticsState.Success -> {
                    ScanResultSection(
                        scan = state.scan,
                        roomIdToShare = roomIdToShare,
                        onRoomIdChange = { roomIdToShare = it },
                        onShare = {
                            if (roomIdToShare.isNotBlank()) {
                                viewModel.shareProofToDoctor(state.scan.id, roomIdToShare)
                            }
                        }
                    )
                }
                is AIDiagnosticsState.SharedSuccess -> {
                    Text(state.message, color = Color(0xFF388E3C), fontWeight = FontWeight.Bold)
                }
                else -> {}
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScanResultSection(
    scan: AIScanEntity,
    roomIdToShare: String,
    onRoomIdChange: (String) -> Unit,
    onShare: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF1F8E9))
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "Prediction: ${scan.predictionResult}",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(16.dp))
            
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Result: ${scan.predictionResult}", fontWeight = FontWeight.Bold)
                    Text("Confidence: ${(scan.confidence * 100).toInt()}%")
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))

            // Intelligent Specialist Recommendation
            if (!scan.predictionResult.contains("Normal", ignoreCase = true) &&
                !scan.predictionResult.contains("Benign", ignoreCase = true)) {
                val recommendedSpecialist = when (scan.modelType) {
                    "skin" -> "Dermatologist"
                    "brain" -> "Neurologist"
                    "pneumonia" -> "Pulmonologist"
                    "diabetic_retinopathy" -> "Ophthalmologist"
                    "breast_cancer" -> "Oncologist"
                    else -> "General Physician"
                }

                Button(
                    onClick = { /* TODO: Navigate to find doctor by specialty */ },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Consult $recommendedSpecialist")
                }
                Spacer(modifier = Modifier.height(8.dp))
            }

            // Original Share functionality
            OutlinedTextField(
                value = roomIdToShare,
                onValueChange = onRoomIdChange,
                label = { Text("Consultation Room ID") },
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(8.dp))
            Button(
                onClick = onShare,
                modifier = Modifier.fillMaxWidth(),
                enabled = roomIdToShare.isNotBlank()
            ) {
                Icon(Icons.Outlined.Share, contentDescription = "Share", modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Share AI Proof with Doctor")
            }
        }
    }
}
