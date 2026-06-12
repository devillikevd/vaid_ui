package com.example.swastik.ui.screens.patient.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.outlined.Biotech
import androidx.compose.material.icons.outlined.Camera
import androidx.compose.material.icons.outlined.MonitorHeart
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.Timeline
import androidx.compose.material.icons.outlined.HealthAndSafety
import androidx.compose.material.icons.outlined.MedicalServices
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.ui.screens.patient.diagnostic.AIDiagnosticsViewModel
import com.example.swastik.utils.ml.AIModelStorageManager

@Composable
fun AIModelsSettingsDialog(
    onDismiss: () -> Unit,
    viewModel: AIDiagnosticsViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val storageManager = remember { AIModelStorageManager(context) }
    
    val downloadProgress by viewModel.downloadProgress.collectAsState()
    
    // Refresh the downloaded models list whenever downloadProgress map changes
    val downloadedModels = remember(downloadProgress) { 
        storageManager.getDownloadedModels().map { it.modelId } 
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Manage AI Models",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close")
                    }
                }
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Text(
                    text = "Download AI Diagnostic models to run locally on your device for instant inference.",
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    val models = listOf(
                        Triple("skin", "Skin Disease Detection", "Detect skin diseases (Melanoma, Eczema, etc.)"),
                        Triple("brain", "Brain Tumor MRI Analysis", "Detect tumors in brain MRI"),
                        Triple("pneumonia", "Pneumonia X-Ray Classifier", "Analyze chest X-Rays for pneumonia"),
                        Triple("diabetic_retinopathy", "Diabetic Retinopathy", "Detect diabetic retinopathy from retinal scans"),
                        Triple("malaria", "Malaria Cell Classification", "Analyze blood smears for malaria"),
                        Triple("breast_cancer", "Breast Cancer Ultrasound", "Detect abnormalities in breast ultrasound")
                    )

                    items(models.size) { index ->
                        val model = models[index]
                        val icon = when(model.first) {
                            "skin" -> Icons.Outlined.Biotech
                            "brain" -> Icons.Outlined.MonitorHeart
                            "pneumonia" -> Icons.Outlined.Camera
                            "diabetic_retinopathy" -> Icons.Outlined.Visibility
                            "malaria" -> Icons.Outlined.MedicalServices
                            "breast_cancer" -> Icons.Outlined.HealthAndSafety
                            else -> Icons.Outlined.MedicalServices
                        }
                        val color = when(model.first) {
                            "skin" -> Color(0xFFFFF3E0)
                            "brain" -> Color(0xFFE3F2FD)
                            "pneumonia" -> Color(0xFFE8F5E9)
                            "diabetic_retinopathy" -> Color(0xFFF3E5F5)
                            "malaria" -> Color(0xFFFFEBEE)
                            "breast_cancer" -> Color(0xFFE0F7FA)
                            else -> Color.LightGray
                        }
                        val iconTint = when(model.first) {
                            "skin" -> Color(0xFFF57C00)
                            "brain" -> Color(0xFF1976D2)
                            "pneumonia" -> Color(0xFF388E3C)
                            "diabetic_retinopathy" -> Color(0xFF7B1FA2)
                            "malaria" -> Color(0xFFD32F2F)
                            "breast_cancer" -> Color(0xFF0097A7)
                            else -> Color.DarkGray
                        }

                        ManageModelCard(
                            modelId = model.first,
                            title = model.second,
                            description = model.third,
                            icon = icon,
                            color = color,
                            iconTint = iconTint,
                            isDownloaded = model.first in downloadedModels,
                            progress = downloadProgress[model.first],
                            onDownloadClick = { viewModel.downloadModel(model.first) },
                            onUpdateClick = { viewModel.downloadModel(model.first) },
                            onDeleteClick = { storageManager.deleteModel(model.first) }
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                Button(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Done")
                }
            }
        }
    }
}

@Composable
fun ManageModelCard(
    modelId: String,
    title: String,
    description: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    color: Color,
    iconTint: Color,
    isDownloaded: Boolean,
    progress: Float?,
    onDownloadClick: () -> Unit,
    onUpdateClick: () -> Unit,
    onDeleteClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(color),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = title,
                    tint = iconTint,
                    modifier = Modifier.size(24.dp)
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = description,
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    lineHeight = 14.sp
                )
            }
            Spacer(modifier = Modifier.width(8.dp))
            
            if (isDownloaded) {
                Box(
                    modifier = Modifier
                        .background(Color(0xFFE8F5E9), RoundedCornerShape(4.dp))
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.CheckCircle,
                            contentDescription = "Downloaded",
                            tint = Color(0xFF2E7D32),
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Downloaded",
                            color = Color(0xFF2E7D32),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
                Spacer(modifier = Modifier.width(4.dp))
                IconButton(
                    onClick = onUpdateClick,
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(
                        androidx.compose.material.icons.Icons.Default.Refresh,
                        contentDescription = "Check for Updates",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(18.dp)
                    )
                }
                IconButton(
                    onClick = onDeleteClick,
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(
                        androidx.compose.material.icons.Icons.Default.Close,
                        contentDescription = "Delete Model",
                        tint = MaterialTheme.colorScheme.error,
                        modifier = Modifier.size(18.dp)
                    )
                }
            } else if (progress != null) {
                Box(contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(
                        progress = { progress },
                        modifier = Modifier.size(24.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.primary,
                        trackColor = MaterialTheme.colorScheme.surfaceVariant
                    )
                    Text(
                        text = "${(progress * 100).toInt()}%",
                        fontSize = 8.sp,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            } else {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = MaterialTheme.colorScheme.primary.copy(alpha=0.1f),
                    modifier = Modifier.clickable { onDownloadClick() }
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Download,
                            contentDescription = "Download",
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Download",
                            color = MaterialTheme.colorScheme.primary,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }
        }
    }
}
