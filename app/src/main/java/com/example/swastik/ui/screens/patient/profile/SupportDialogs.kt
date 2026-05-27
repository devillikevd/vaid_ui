package com.example.swastik.ui.screens.patient.profile

import android.content.Intent
import android.graphics.Bitmap
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import kotlinx.coroutines.launch
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.data.model.*
import com.example.swastik.data.local.AppSettingsStore
import com.example.swastik.ui.theme.*
import com.example.swastik.ui.viewmodel.PatientDashboardViewModel
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import androidx.compose.ui.res.stringResource
import com.example.swastik.R
import androidx.compose.material3.MaterialTheme

// ==================== FEEDBACK DIALOG ====================

@Composable
fun FeedbackDialog(onDismiss: () -> Unit) {
    var feedback by remember { mutableStateOf("") }
    var rating by remember { mutableIntStateOf(0) }
    val context = LocalContext.current

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.Feedback, null, tint = SwastikPrimary)
                Spacer(Modifier.width(8.dp))
                Text(stringResource(R.string.send_feedback), fontWeight = FontWeight.Bold)
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(stringResource(R.string.how_would_you_rate_your_experience), fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Row(
                    horizontalArrangement = Arrangement.Center,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    (1..5).forEach { star ->
                        IconButton(onClick = { rating = star }) {
                            Icon(
                                if (star <= rating) Icons.Default.Star else Icons.Outlined.StarBorder,
                                contentDescription = "Star $star",
                                tint = if (star <= rating) Color(0xFFFFC107) else Color.Gray,
                                modifier = Modifier.size(36.dp)
                            )
                        }
                    }
                }
                OutlinedTextField(
                    value = feedback,
                    onValueChange = { feedback = it },
                    label = { Text(stringResource(R.string.your_feedback)) },
                    modifier = Modifier.fillMaxWidth().height(120.dp),
                    shape = RoundedCornerShape(12.dp),
                    maxLines = 5
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    Toast.makeText(context, context.getString(R.string.thank_you_feedback), Toast.LENGTH_SHORT).show()
                    onDismiss()
                },
                enabled = rating > 0,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
            ) { Text(stringResource(R.string.submit)) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.cancel)) } },
        shape = RoundedCornerShape(20.dp)
    )
}

// ==================== HELP CENTER DIALOG ====================

@Composable
fun HelpCenterDialog(onDismiss: () -> Unit) {
    val faqs = listOf(
        "How do I book an appointment?" to "Go to Home tab and tap the + button at the bottom to book an appointment with any doctor.",
        "How to add family members?" to "Go to Profile > Family Members > Add Member to link family profiles.",
        "Is my data secure?" to "Yes! All data is encrypted end-to-end and ABDM compliant. We never share without consent.",
        "How to use video consultation?" to "Book a video consultation from the dashboard and join at the scheduled time.",
        "How to contact support?" to "Go to Profile > Support & Legal > 24/7 Support to chat with our team."
    )
    var expandedIndex by remember { mutableIntStateOf(-1) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.HelpOutline, null, tint = SwastikPrimary)
                Spacer(Modifier.width(8.dp))
                Text(stringResource(R.string.help_center), fontWeight = FontWeight.Bold)
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(stringResource(R.string.frequently_asked_questions), fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(4.dp))
                faqs.forEachIndexed { index, (question, answer) ->
                    Card(
                        modifier = Modifier.fillMaxWidth().clickable {
                            expandedIndex = if (expandedIndex == index) -1 else index
                        },
                        shape = RoundedCornerShape(10.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (expandedIndex == index) SwastikPrimary.copy(alpha = 0.06f) else Color(0xFFF5F5F5)
                        )
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(question, fontSize = 13.sp, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
                                Icon(
                                    if (expandedIndex == index) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                    null, tint = SwastikPrimary
                                )
                            }
                            if (expandedIndex == index) {
                                Spacer(Modifier.height(8.dp))
                                Text(answer, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onDismiss,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
            ) { Text(stringResource(R.string.close)) }
        },
        shape = RoundedCornerShape(20.dp)
    )
}

// ==================== QR CODE DIALOG ====================

@Composable
fun QrCodeDialog(
    profile: PatientProfile?,
    viewModel: PatientDashboardViewModel?,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val healthCardState by viewModel?.healthCardState?.collectAsState()
        ?: remember { mutableStateOf(PatientDashboardViewModel.HealthCardState()) }
    val formattedExpiry = remember(healthCardState.expiresAt) {
        healthCardState.expiresAt?.let { expiresAt ->
            runCatching {
                java.time.OffsetDateTime.parse(expiresAt)
                    .toLocalDateTime()
                    .toString()
                    .replace('T', ' ')
            }.getOrElse { expiresAt }
        }
    }

    var includeGuardianAnalytics by remember { mutableStateOf(false) }
    val appSettings by AppSettingsStore.settings.collectAsState()
    val guardianShareAllowed = appSettings.guardianEnabled &&
        appSettings.guardianConsentAccepted &&
        appSettings.guardianFeatures.doctorQrSharing
    val scope = rememberCoroutineScope()

    LaunchedEffect(guardianShareAllowed) {
        if (!guardianShareAllowed) includeGuardianAnalytics = false
    }

    LaunchedEffect(viewModel, healthCardState.hasCheckedStatus, healthCardState.isLoading) {
        if (viewModel != null && !healthCardState.hasCheckedStatus && !healthCardState.isLoading) {
            viewModel.checkHealthCardStatus()
        }
    }

    val qrBitmap = remember(healthCardState.url) {
        val url = healthCardState.url ?: return@remember null
        try {
            val writer = QRCodeWriter()
            val bitMatrix = writer.encode(url, BarcodeFormat.QR_CODE, 512, 512)
            val width = bitMatrix.width
            val height = bitMatrix.height
            val bmp = Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565)
            for (x in 0 until width) {
                for (y in 0 until height) {
                    bmp.setPixel(x, y, if (bitMatrix[x, y]) android.graphics.Color.BLACK else android.graphics.Color.WHITE)
                }
            }
            bmp
        } catch (_: Exception) { null }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.QrCode2, null, tint = SwastikPrimary)
                Spacer(Modifier.width(8.dp))
                Text(stringResource(R.string.health_qr_code), fontWeight = FontWeight.Bold)
            }
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier
                        .size(220.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(MaterialTheme.colorScheme.surface)
                        .border(2.dp, SwastikPrimary.copy(alpha = 0.3f), RoundedCornerShape(16.dp))
                        .padding(12.dp),
                    contentAlignment = Alignment.Center
                ) {
                    when {
                        healthCardState.isLoading -> {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                CircularProgressIndicator(modifier = Modifier.size(48.dp), color = SwastikPrimary)
                                Spacer(Modifier.height(8.dp))
                                Text(stringResource(R.string.checking_health_card), fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                        healthCardState.error != null -> {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Outlined.ErrorOutline, null, tint = Color.Red, modifier = Modifier.size(48.dp))
                                Spacer(Modifier.height(8.dp))
                                Text(healthCardState.error ?: "Error", fontSize = 12.sp, color = Color.Red)
                            }
                        }
                        qrBitmap != null -> {
                            Image(
                                bitmap = qrBitmap.asImageBitmap(),
                                contentDescription = "Health QR Code",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Fit
                            )
                        }
                        else -> {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Outlined.QrCode2, null, tint = MaterialTheme.colorScheme.outlineVariant, modifier = Modifier.size(60.dp))
                                Text(stringResource(R.string.tap_generate_below), fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }

                Spacer(Modifier.height(12.dp))
                Text(profile?.name ?: "Patient", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                if (profile?.abhaNumber?.isNotEmpty() == true) {
                    Text("ABHA: ${profile.abhaNumber}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }

                if (healthCardState.hasActiveCard && healthCardState.expiresAt != null) {
                    Spacer(Modifier.height(8.dp))
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) {
                        Icon(Icons.Outlined.Schedule, null, tint = SwastikPrimary, modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Valid until $formattedExpiry", fontSize = 11.sp, color = SwastikPrimary)
                    }
                } else if (healthCardState.hasActiveCard) {
                    Spacer(Modifier.height(8.dp))
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) {
                        Icon(Icons.Outlined.VerifiedUser, null, tint = SwastikPrimary, modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(4.dp))
                        Text(stringResource(R.string.active_health_card_ready_to_share), fontSize = 11.sp, color = SwastikPrimary)
                    }
                }

                Spacer(Modifier.height(12.dp))
                Text(
                    "Anyone with this active QR or link can view your\nshared clinical summary until it expires or you revoke it",
                    fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center
                )

                if (healthCardState.hasActiveCard) {
                    Spacer(Modifier.height(12.dp))
                    val guardianShareModifier = if (guardianShareAllowed) {
                        Modifier.clickable { includeGuardianAnalytics = !includeGuardianAnalytics }
                    } else {
                        Modifier
                    }
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .fillMaxWidth()
                            .then(guardianShareModifier)
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Checkbox(
                            checked = includeGuardianAnalytics,
                            onCheckedChange = { includeGuardianAnalytics = it && guardianShareAllowed },
                            enabled = guardianShareAllowed,
                            colors = CheckboxDefaults.colors(checkedColor = SwastikPrimary)
                        )
                        Column {
                            Text("Include Vaididea Guardian Analytics", fontSize = 12.sp)
                            Text(
                                if (guardianShareAllowed) {
                                    "Attaches sources, reliability notes, and 30-day safety signals."
                                } else {
                                    "Enable Guardian doctor/QR sharing from Health Card > Learn more first."
                                },
                                fontSize = 10.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                Spacer(Modifier.height(16.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (healthCardState.url != null) {
                        OutlinedButton(
                            onClick = {
                                scope.launch {
                                    val guardianData = if (includeGuardianAnalytics && guardianShareAllowed) {
                                        viewModel?.getGuardianAnalytics() ?: ""
                                    } else { "" }

                                    val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                        type = "text/plain"
                                        putExtra(Intent.EXTRA_SUBJECT, "My VAIDIDEA Health Card")
                                        putExtra(
                                            Intent.EXTRA_TEXT,
                                            buildString {
                                                append("VAIDIDEA Health Card (time-limited clinical summary)")
                                                append("\n")
                                                append("Valid until: ${formattedExpiry ?: "revoked or expired soon"}")
                                                append("\n")
                                                append(healthCardState.url)
                                                if (includeGuardianAnalytics && guardianShareAllowed && guardianData.isNotEmpty()) {
                                                    append("\n\n--- Vaididea Guardian Analytics ---\n")
                                                    append(guardianData)
                                                }
                                            }
                                        )
                                    }
                                    context.startActivity(Intent.createChooser(shareIntent, "Share Health Card"))
                                }
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            border = BorderStroke(1.dp, SwastikPrimary.copy(alpha = 0.5f))
                        ) {
                            Icon(Icons.Outlined.Share, null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(stringResource(R.string.share), fontSize = 13.sp)
                        }
                    }

                    if (healthCardState.hasActiveCard) {
                        OutlinedButton(
                            onClick = { viewModel?.revokeHealthCard() },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            border = BorderStroke(1.dp, Color.Red.copy(alpha = 0.4f)),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.Red)
                        ) {
                            Icon(Icons.Outlined.LinkOff, null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(stringResource(R.string.revoke), fontSize = 13.sp)
                        }
                    } else if (!healthCardState.isLoading) {
                        Button(
                            onClick = { viewModel?.generateHealthCard() },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
                        ) {
                            Icon(Icons.Outlined.QrCode2, null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(stringResource(R.string.generate), fontSize = 13.sp)
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onDismiss,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
            ) { Text(stringResource(R.string.close)) }
        },
        shape = RoundedCornerShape(20.dp)
    )
}
