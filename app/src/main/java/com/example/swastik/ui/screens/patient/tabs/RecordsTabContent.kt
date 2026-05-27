package com.example.swastik.ui.screens.patient.tabs

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.blur
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.R
import com.example.swastik.data.model.*
import com.example.swastik.ui.viewmodel.RecordsViewModel
import com.example.swastik.ui.viewmodel.UploadState

import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.ui.theme.SwastikPrimaryLight
import com.example.swastik.ui.components.RecordsListShimmer
import com.example.swastik.ui.screens.patient.components.LottieEmptyState
import com.example.swastik.ui.screens.patient.components.BezierCurveChart
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.material3.MaterialTheme

/**
 * Records Tab Content
 * Shows medical records, consultations, prescriptions, and documents from backend API
 */
@Composable
fun RecordsTabContent(
    modifier: Modifier = Modifier,
    profile: PatientProfile? = null,
    unreadNotificationsCount: Int = 0,
    onNotificationClick: () -> Unit = {},
    onNavigateToPrescriptions: () -> Unit = {},
    onNavigateToReports: () -> Unit = {},
    viewModel: RecordsViewModel = hiltViewModel()
) {
    var selectedFilter by remember { mutableStateOf(RecordFilter.ALL) }
    var showUploadDialog by remember { mutableStateOf(false) }

    val state by viewModel.uiState.collectAsState()
    val consultations = state.consultations
    val prescriptions = state.prescriptions
    val documents = state.documents
    val context = LocalContext.current
    val colorScheme = MaterialTheme.colorScheme

    // Handle upload state changes
    LaunchedEffect(state.uploadState) {
        when (val uploadState = state.uploadState) {
            is UploadState.Success -> {
                Toast.makeText(context, uploadState.message, Toast.LENGTH_SHORT).show()
                viewModel.clearUploadState()
            }
            is UploadState.Error -> {
                Toast.makeText(context, uploadState.message, Toast.LENGTH_LONG).show()
                viewModel.clearUploadState()
            }
            else -> {}
        }
    }

    val blurRadius by androidx.compose.animation.core.animateDpAsState(
        targetValue = if (showUploadDialog) 12.dp else 0.dp,
        label = "blur"
    )

    Column(
        modifier = modifier
            .fillMaxSize()
            .blur(blurRadius)
            .background(colorScheme.background)
    ) {
        // Header


        Card(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 8.dp),
            shape = RoundedCornerShape(topStart = 30.dp, topEnd = 30.dp),
            colors = CardDefaults.cardColors(containerColor = colorScheme.surface),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(top = 24.dp)
            ) {
// ... (rest of content)

                Text(
                    text = stringResource(R.string.medical_records_title),
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = colorScheme.onSurface,
                    modifier = Modifier.padding(horizontal = 20.dp)
                )

                Text(
                    text = stringResource(R.string.medical_records_subtitle),
                    fontSize = 14.sp,
                    color = colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp)
                )

                Spacer(modifier = Modifier.height(16.dp))

                RecordsFilterRow(
                    selectedFilter = selectedFilter,
                    onFilterSelected = { selectedFilter = it }
                )

                Spacer(modifier = Modifier.height(8.dp))

                if (state.isLoading) {
                    RecordsListShimmer()
                } else if (state.error != null) {
                    // Error state with retry
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                Icons.Outlined.Warning,
                                contentDescription = null,
                                modifier = Modifier.size(48.dp),
                                tint = colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = state.error ?: stringResource(R.string.failed_to_load_records),
                                fontSize = 14.sp,
                                color = colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Button(
                                onClick = { viewModel.loadRecords() },
                                colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
                            ) {
                                Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(stringResource(R.string.retry))
                            }
                        }
                    }
                } else if (consultations.isEmpty() && prescriptions.isEmpty() && documents.isEmpty()) {
                    // Empty state with Lottie
                    LottieEmptyState(
                        title = stringResource(R.string.no_medical_records_yet),
                        subtitle = stringResource(R.string.upload_reports_or_consult),
                        lottieUrl = "https://assets10.lottiefiles.com/packages/lf20_ch9qxg.json"
                    ) {
                        OutlinedButton(
                            onClick = { showUploadDialog = true },
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = SwastikPrimary)
                        ) {
                            Icon(Icons.Outlined.CloudUpload, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(stringResource(R.string.upload_report))
                        }
                    }
                } else {
                    val listState = rememberLazyListState()
                    val isAtEnd by remember {
                        derivedStateOf {
                            val layoutInfo = listState.layoutInfo
                            val totalItemsCount = layoutInfo.totalItemsCount
                            val lastVisibleItemIndex = layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0
                            totalItemsCount > 0 && lastVisibleItemIndex >= totalItemsCount - 2
                        }
                    }

                    LaunchedEffect(isAtEnd, selectedFilter, state.isLoadingMore) {
                        if (isAtEnd && !state.isLoadingMore) {
                            when (selectedFilter) {
                                RecordFilter.CONSULTATIONS -> viewModel.loadMoreConsultations()
                                RecordFilter.PRESCRIPTIONS -> viewModel.loadMorePrescriptions()
                                RecordFilter.REPORTS -> viewModel.loadMoreReports()
                                RecordFilter.ALL -> {
                                    viewModel.loadMoreConsultations()
                                    viewModel.loadMorePrescriptions()
                                    viewModel.loadMoreReports()
                                }
                            }
                        }
                    }

                    LazyColumn(
                        state = listState,
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                    when (selectedFilter) {
                        RecordFilter.ALL -> {
                            item {
                                SectionHeader(
                                    stringResource(R.string.recent_consultations),
                                    stringResource(R.string.see_all)
                                ) { selectedFilter = RecordFilter.CONSULTATIONS }
                            }
                            if (consultations.isEmpty()) {
                                item { EmptySectionMessage(stringResource(R.string.no_consultations_yet)) }
                            } else {
                                items(consultations.take(2)) { ConsultationCard(it) }
                            }
                            item { Spacer(modifier = Modifier.height(8.dp)) }
                            item {
                                SectionHeader(
                                    stringResource(R.string.recent_prescriptions),
                                    if (prescriptions.isNotEmpty()) stringResource(R.string.see_all) else null
                                ) { onNavigateToPrescriptions() }
                            }
                            if (prescriptions.isEmpty()) {
                                item { EmptySectionMessage(stringResource(R.string.no_prescriptions_yet)) }
                            } else {
                                items(prescriptions.take(2)) { PrescriptionSummaryCard(it) }
                            }
                            item { Spacer(modifier = Modifier.height(8.dp)) }
                            item {
                                SectionHeader(
                                    stringResource(R.string.documents),
                                    if (documents.isNotEmpty()) stringResource(R.string.see_all) else null
                                ) { onNavigateToReports() }
                            }
                            if (documents.isEmpty()) {
                                item { EmptySectionMessage(stringResource(R.string.no_reports_uploaded_yet)) }
                            } else {
                                items(documents.take(3)) { DocumentItem(it) }
                            }
                        }
                        RecordFilter.CONSULTATIONS -> {
                            item { SectionHeader(stringResource(R.string.all_consultations), null) }
                            if (consultations.isEmpty()) {
                                item { EmptySectionMessage(stringResource(R.string.no_consultations_yet)) }
                            } else {
                                items(consultations) { ConsultationCard(it) }
                            }
                        }
                        RecordFilter.PRESCRIPTIONS -> {
                            item { SectionHeader(stringResource(R.string.all_prescriptions), null) }
                            if (prescriptions.isEmpty()) {
                                item { EmptySectionMessage(stringResource(R.string.no_prescriptions_yet)) }
                            } else {
                                items(prescriptions) { PrescriptionSummaryCard(it) }
                            }
                        }
                        RecordFilter.REPORTS -> {
                            item { SectionHeader(stringResource(R.string.all_reports_documents), null) }
                            if (documents.isEmpty()) {
                                item { EmptySectionMessage(stringResource(R.string.no_reports_uploaded_yet)) }
                            } else {
                                items(documents) { DocumentItem(it) }
                            }
                        }
                    }
                    item { Spacer(modifier = Modifier.height(16.dp)) }
                }
                } // end else
            }
        }
    }

    // Upload Report Dialog
    if (showUploadDialog) {
        UploadReportDialog(
            onDismiss = { showUploadDialog = false },
            onUpload = { uri, name, type, externalUrl ->
                viewModel.uploadReport(uri, name, type, externalUrl)
                showUploadDialog = false
            },
            isUploading = state.uploadState is UploadState.Uploading
        )
    }
}

@Composable
private fun RecordsHeader(
    profile: PatientProfile?,
    unreadCount: Int,
    onNotificationClick: () -> Unit = {},
    onUploadClick: () -> Unit = {}
) {
    val colorScheme = MaterialTheme.colorScheme
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(45.dp)
                .clip(CircleShape)
                .background(colorScheme.primaryContainer),
            contentAlignment = Alignment.Center
        ) {
            Text(
                profile?.initials?.ifEmpty { "👤" } ?: "👤",
                fontSize = if (profile?.initials?.isNotEmpty() == true) 16.sp else 24.sp,
                fontWeight = FontWeight.Bold,
                color = colorScheme.onPrimaryContainer
            )
        }

        Spacer(modifier = Modifier.width(12.dp))

        Column {
            Text(
                profile?.name?.split(" ")?.firstOrNull()?.ifEmpty { stringResource(R.string.user_label) }
                    ?: stringResource(R.string.user_label),
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = colorScheme.onSurface
            )
            Text(stringResource(R.string.patient_label), fontSize = 13.sp, color = colorScheme.onSurfaceVariant)
        }

        Spacer(modifier = Modifier.weight(1f))

        IconButton(onClick = onUploadClick) {
            Icon(Icons.Outlined.CloudUpload, contentDescription = stringResource(R.string.upload), tint = SwastikPrimary)
        }

        Box {
            IconButton(onClick = onNotificationClick) {
                Icon(Icons.Outlined.Notifications, contentDescription = stringResource(R.string.notifications), tint = colorScheme.onSurface)
            }
            if (unreadCount > 0) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .background(colorScheme.error, CircleShape)
                        .align(Alignment.TopEnd)
                        .offset(x = (-8).dp, y = 8.dp)
                )
            }
        }
    }
}

@Composable
private fun RecordsFilterRow(
    selectedFilter: RecordFilter,
    onFilterSelected: (RecordFilter) -> Unit
) {
    val colorScheme = MaterialTheme.colorScheme
    val filters = listOf(
        RecordFilter.ALL to stringResource(R.string.filter_all),
        RecordFilter.CONSULTATIONS to stringResource(R.string.filter_consultations),
        RecordFilter.PRESCRIPTIONS to stringResource(R.string.filter_prescriptions),
        RecordFilter.REPORTS to stringResource(R.string.filter_reports)
    )

    LazyRow(
        contentPadding = PaddingValues(horizontal = 20.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(filters) { (filter, label) ->
            FilterChip(
                selected = selectedFilter == filter,
                onClick = { onFilterSelected(filter) },
                label = { Text(label, fontSize = 12.sp) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = colorScheme.primary,
                    selectedLabelColor = colorScheme.onPrimary,
                    containerColor = colorScheme.surface,
                    labelColor = colorScheme.onSurfaceVariant
                )
            )
        }
    }
}

@Composable
private fun SectionHeader(title: String, actionText: String?, onAction: (() -> Unit)? = null) {
    val colorScheme = MaterialTheme.colorScheme
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(title, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = colorScheme.onSurface)
        if (actionText != null) {
            TextButton(onClick = { onAction?.invoke() }) {
                Text(actionText, color = SwastikPrimary, fontSize = 13.sp)
            }
        }
    }
}

@Composable
private fun EmptySectionMessage(message: String) {
    val colorScheme = MaterialTheme.colorScheme
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = colorScheme.surfaceVariant.copy(alpha = 0.65f)
    ) {
        Text(
            text = message,
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            fontSize = 13.sp,
            color = colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun ConsultationCard(consultation: ConsultationRecord) {
    val colorScheme = MaterialTheme.colorScheme
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = colorScheme.surfaceVariant.copy(alpha = 0.55f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(45.dp)
                            .clip(CircleShape)
                            .background(colorScheme.primaryContainer),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(consultation.doctorEmoji, fontSize = 22.sp)
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(consultation.doctorName, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = colorScheme.onSurface)
                        Text(consultation.doctorSpecialty, fontSize = 13.sp, color = colorScheme.onSurfaceVariant)
                    }
                }
                Text(consultation.date, fontSize = 12.sp, color = colorScheme.onSurfaceVariant)
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.LocalHospital, contentDescription = null, tint = SwastikPrimary, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(consultation.diagnosis, fontSize = 13.sp, fontWeight = FontWeight.Medium, color = colorScheme.onSurface)
            }

            if (consultation.notes.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.Top) {
                    Icon(Icons.Outlined.Notes, contentDescription = null, tint = colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(consultation.notes, fontSize = 12.sp, color = colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

@Composable
private fun PrescriptionSummaryCard(prescription: Prescription) {
    val colorScheme = MaterialTheme.colorScheme
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(45.dp)
                        .clip(CircleShape)
                        .background(colorScheme.primaryContainer),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Outlined.Medication,
                        contentDescription = null,
                        tint = colorScheme.onPrimaryContainer,
                        modifier = Modifier.size(22.dp)
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        prescription.doctor?.name ?: stringResource(R.string.doctor_prescription_fallback),
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        prescription.createdAt.take(10),
                        fontSize = 12.sp,
                        color = colorScheme.onSurfaceVariant
                    )
                }
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = when ((prescription.status ?: "").lowercase()) {
                        "active" -> colorScheme.primaryContainer
                        "expired", "cancelled" -> colorScheme.errorContainer
                        "fulfilled", "dispensed" -> colorScheme.secondaryContainer
                        else -> colorScheme.surfaceVariant
                    }
                ) {
                    Text(
                        (prescription.status ?: stringResource(R.string.status_active)).replaceFirstChar { it.uppercase() },
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        fontSize = 11.sp,
                        color = when ((prescription.status ?: "").lowercase()) {
                            "active" -> colorScheme.onPrimaryContainer
                            "expired", "cancelled" -> colorScheme.onErrorContainer
                            "fulfilled", "dispensed" -> colorScheme.onSecondaryContainer
                            else -> colorScheme.onSurfaceVariant
                        }
                    )
                }
            }

            HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), color = colorScheme.outline.copy(alpha = 0.35f))

            Text(
                text = prescription.diagnosis.ifBlank { stringResource(R.string.prescription_details_fallback) },
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                color = colorScheme.onSurface
            )

            if (!prescription.medicines.isNullOrEmpty()) {
                Spacer(modifier = Modifier.height(12.dp))
                prescription.medicines.take(3).forEachIndexed { index, item ->
                    PrescriptionItemRow(index + 1, item)
                    if (index < minOf(prescription.medicines.size, 3) - 1) {
                        Spacer(modifier = Modifier.height(12.dp))
                    }
                }
                if (prescription.medicines.size > 3) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = stringResource(R.string.more_medicines_format, prescription.medicines.size - 3),
                        fontSize = 12.sp,
                        color = SwastikPrimary,
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            if (!prescription.instructions.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = prescription.instructions,
                    fontSize = 12.sp,
                    color = colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun PrescriptionItemRow(index: Int, prescription: PrescriptionItem) {
    val colorScheme = MaterialTheme.colorScheme
    Row(verticalAlignment = Alignment.Top) {
        Box(
            modifier = Modifier
                .size(32.dp)
                .clip(CircleShape)
                .background(SwastikPrimary),
            contentAlignment = Alignment.Center
        ) {
            Text("$index", color = MaterialTheme.colorScheme.onPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
        }

        Spacer(modifier = Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(prescription.medicineName, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = colorScheme.onSurface)
            Spacer(modifier = Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Surface(color = colorScheme.secondaryContainer, shape = RoundedCornerShape(6.dp)) {
                    Row(modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.Medication, contentDescription = null, tint = colorScheme.onSecondaryContainer, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(prescription.dosage, fontSize = 11.sp, color = colorScheme.onSecondaryContainer)
                    }
                }
                Surface(color = colorScheme.tertiaryContainer, shape = RoundedCornerShape(6.dp)) {
                    Row(modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.Schedule, contentDescription = null, tint = colorScheme.onTertiaryContainer, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(prescription.frequency, fontSize = 11.sp, color = colorScheme.onTertiaryContainer)
                    }
                }
            }
            Spacer(modifier = Modifier.height(6.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.DateRange, contentDescription = null, tint = colorScheme.onSurfaceVariant, modifier = Modifier.size(14.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text(stringResource(R.string.duration_format, prescription.duration), fontSize = 12.sp, color = colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun DocumentItem(document: MedicalDocument) {
    val context = LocalContext.current
    val colorScheme = MaterialTheme.colorScheme
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable {
                // Open document file seamlessly in Custom Tabs
                if (document.fileUrl.isNotEmpty()) {
                    try {
                        val url = document.fileUrl
                        val customTabsIntent = CustomTabsIntent.Builder().setShowTitle(true).build()
                        if (url.endsWith(".pdf", ignoreCase = true)) {
                            val viewerUrl = "https://docs.google.com/gview?embedded=true&url=${Uri.encode(url)}"
                            customTabsIntent.launchUrl(context, Uri.parse(viewerUrl))
                        } else {
                            customTabsIntent.launchUrl(context, Uri.parse(url))
                        }
                    } catch (e: Exception) {
                        Toast.makeText(context, context.getString(R.string.cannot_open_document), Toast.LENGTH_SHORT).show()
                    }
                } else {
                    Toast.makeText(context, context.getString(R.string.no_file_available_report), Toast.LENGTH_SHORT).show()
                }
            },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = colorScheme.surfaceVariant.copy(alpha = 0.6f))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(getDocumentTypeColor(document.type, colorScheme)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = getDocumentTypeIcon(document.type),
                    contentDescription = null,
                    tint = getDocumentTypeIconColor(document.type, colorScheme),
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(document.name, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = colorScheme.onSurface)
                Row {
                    Text(document.date, fontSize = 12.sp, color = colorScheme.onSurfaceVariant)
                    if (!document.size.isNullOrBlank()) {
                        Text(" • ${document.size}", fontSize = 12.sp, color = colorScheme.onSurfaceVariant)
                    }
                }
            }

            IconButton(onClick = {
                if (document.fileUrl.isNotEmpty()) {
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(document.fileUrl))
                        context.startActivity(intent)
                    } catch (e: Exception) {
                        Toast.makeText(context, context.getString(R.string.cannot_download_file), Toast.LENGTH_SHORT).show()
                    }
                } else {
                    Toast.makeText(context, context.getString(R.string.no_file_available), Toast.LENGTH_SHORT).show()
                }
            }) {
                Icon(Icons.Outlined.Download, contentDescription = stringResource(R.string.download), tint = SwastikPrimary)
            }
        }
    }
}

private fun getDocumentTypeColor(type: DocumentType, colorScheme: ColorScheme): Color = when (type) {
    DocumentType.LAB_REPORT -> colorScheme.secondaryContainer
    DocumentType.PRESCRIPTION -> colorScheme.primaryContainer
    DocumentType.SCAN -> colorScheme.tertiaryContainer
    DocumentType.DISCHARGE_SUMMARY -> colorScheme.errorContainer
    DocumentType.VACCINATION -> colorScheme.secondaryContainer
    else -> colorScheme.surfaceVariant
}

private fun getDocumentTypeIcon(type: DocumentType) = when (type) {
    DocumentType.LAB_REPORT -> Icons.Outlined.Science
    DocumentType.PRESCRIPTION -> Icons.Outlined.Receipt
    DocumentType.SCAN -> Icons.Outlined.CameraAlt
    DocumentType.DISCHARGE_SUMMARY -> Icons.Outlined.Description
    DocumentType.VACCINATION -> Icons.Outlined.Vaccines
    else -> Icons.Outlined.Description
}

private fun getDocumentTypeIconColor(type: DocumentType, colorScheme: ColorScheme): Color = when (type) {
    DocumentType.LAB_REPORT -> colorScheme.onSecondaryContainer
    DocumentType.PRESCRIPTION -> colorScheme.onPrimaryContainer
    DocumentType.SCAN -> colorScheme.onTertiaryContainer
    DocumentType.DISCHARGE_SUMMARY -> colorScheme.onErrorContainer
    DocumentType.VACCINATION -> colorScheme.onSecondaryContainer
    else -> colorScheme.onSurfaceVariant
}

private enum class RecordFilter {
    ALL,
    CONSULTATIONS,
    PRESCRIPTIONS,
    REPORTS
}

/**
 * Upload Report Dialog
 * File picker + report name/type form
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun UploadReportDialog(
    onDismiss: () -> Unit,
    onUpload: (Uri?, String, String, String?) -> Unit,
    isUploading: Boolean
) {
    var selectedUri by remember { mutableStateOf<Uri?>(null) }
    var selectedFileName by remember { mutableStateOf("") }
    var reportName by remember { mutableStateOf("") }
    var selectedType by remember { mutableStateOf("blood_test") }
    var typeExpanded by remember { mutableStateOf(false) }
    var manualUrl by remember { mutableStateOf("") }
    val context = LocalContext.current

    val reportTypes = listOf(
        "blood_test" to stringResource(R.string.report_type_blood_test),
        "urine_test" to stringResource(R.string.report_type_urine_test),
        "x_ray" to stringResource(R.string.report_type_x_ray),
        "mri" to stringResource(R.string.report_type_mri),
        "ct_scan" to stringResource(R.string.report_type_ct_scan),
        "ultrasound" to stringResource(R.string.report_type_ultrasound),
        "ecg" to stringResource(R.string.report_type_ecg),
        "other" to stringResource(R.string.report_type_other)
    )

    val filePicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            selectedUri = it
            selectedFileName = it.lastPathSegment ?: context.getString(R.string.selected_file)
        }
    }

    AlertDialog(
        onDismissRequest = { if (!isUploading) onDismiss() },
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Outlined.CloudUpload,
                    contentDescription = null,
                    tint = SwastikPrimary,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(stringResource(R.string.upload_report), fontWeight = FontWeight.Bold)
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                // File picker button
                OutlinedButton(
                    onClick = { filePicker.launch("*/*") },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !isUploading
                ) {
                    Icon(Icons.Outlined.AttachFile, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        if (selectedFileName.isEmpty()) stringResource(R.string.select_file_pdf_image)
                        else selectedFileName,
                        maxLines = 1
                    )
                }

                OutlinedTextField(
                    value = manualUrl,
                    onValueChange = { manualUrl = it },
                    label = { Text(stringResource(R.string.report_link_label)) },
                    placeholder = { Text(stringResource(R.string.report_link_placeholder)) },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !isUploading,
                    singleLine = true,
                    leadingIcon = {
                        Icon(Icons.Outlined.Link, contentDescription = null)
                    },
                    supportingText = {
                        Text(stringResource(R.string.report_link_help))
                    }
                )

                // Report name
                OutlinedTextField(
                    value = reportName,
                    onValueChange = { reportName = it },
                    label = { Text(stringResource(R.string.report_name_label)) },
                    placeholder = { Text(stringResource(R.string.report_name_placeholder)) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    enabled = !isUploading
                )

                // Report type dropdown
                ExposedDropdownMenuBox(
                    expanded = typeExpanded,
                    onExpandedChange = { if (!isUploading) typeExpanded = it }
                ) {
                    OutlinedTextField(
                        value = reportTypes.find { it.first == selectedType }?.second
                            ?: stringResource(R.string.report_type_blood_test),
                        onValueChange = {},
                        readOnly = true,
                        label = { Text(stringResource(R.string.report_type_label)) },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = typeExpanded) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor()
                    )
                    ExposedDropdownMenu(
                        expanded = typeExpanded,
                        onDismissRequest = { typeExpanded = false }
                    ) {
                        reportTypes.forEach { (typeId, typeName) ->
                            DropdownMenuItem(
                                text = { Text(typeName) },
                                onClick = {
                                    selectedType = typeId
                                    typeExpanded = false
                                }
                            )
                        }
                    }
                }

                // Loading indicator
                if (isUploading) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            strokeWidth = 2.dp,
                            color = SwastikPrimary
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(stringResource(R.string.uploading), fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val normalizedUrl = manualUrl.trim().takeIf { it.isNotBlank() }
                    val defaultName = when {
                        reportName.isNotBlank() -> reportName
                        selectedFileName.isNotBlank() -> selectedFileName
                        normalizedUrl != null -> context.getString(R.string.shared_report)
                        else -> ""
                    }
                    onUpload(selectedUri, defaultName, selectedType, normalizedUrl)
                },
                enabled = (selectedUri != null || manualUrl.isNotBlank()) && !isUploading,
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
            ) {
                Text(stringResource(R.string.upload))
            }
        },
        dismissButton = {
            TextButton(
                onClick = onDismiss,
                enabled = !isUploading
            ) {
                Text(stringResource(R.string.cancel))
            }
        }
    )
}
