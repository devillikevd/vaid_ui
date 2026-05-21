package com.example.swastik.ui.screens.patient.dashboard

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.data.model.MedicalDocument
import com.example.swastik.data.model.DocumentType
import com.example.swastik.ui.theme.SwastikPurple
import com.example.swastik.ui.viewmodel.RecordsViewModel
import androidx.compose.ui.res.stringResource
import com.example.swastik.R

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportsScreen(
    onBackClick: () -> Unit = {},
    onReportClick: ((MedicalDocument) -> Unit)? = null,
    viewModel: RecordsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val reports = uiState.documents
    val context = LocalContext.current

    var selectedFilter by remember { mutableStateOf("All") }
    val filters = listOf("All", "Lab Reports", "Prescriptions", "Scans", "Other")

    val filteredReports = when (selectedFilter) {
        "Lab Reports" -> reports.filter { it.type == DocumentType.LAB_REPORT }
        "Prescriptions" -> reports.filter { it.type == DocumentType.PRESCRIPTION }
        "Scans" -> reports.filter { it.type == DocumentType.SCAN }
        "Other" -> reports.filter { it.type !in listOf(DocumentType.LAB_REPORT, DocumentType.PRESCRIPTION, DocumentType.SCAN) }
        else -> reports
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.my_reports), fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = onBackClick) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back") } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { paddingValues ->
        Column(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).padding(paddingValues)) {
            // Summary Card
            Card(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(4.dp)
            ) {
                Row(modifier = Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
                    ReportSummaryItem(count = reports.size.toString(), label = "Total", color = SwastikPurple)
                    ReportSummaryItem(count = reports.count { it.type == DocumentType.LAB_REPORT }.toString(), label = "Lab", color = Color(0xFFE53935))
                    ReportSummaryItem(count = reports.count { it.type == DocumentType.SCAN }.toString(), label = "Scans", color = Color(0xFF1976D2))
                }
            }

            // Filter Chips
            LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(filters) { filter ->
                    FilterChip(
                        selected = selectedFilter == filter, onClick = { selectedFilter = filter },
                        label = { Text(filter, fontSize = 12.sp) },
                        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = SwastikPurple, selectedLabelColor = Color.White)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            when {
                uiState.isLoading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = SwastikPurple)
                    }
                }
                uiState.error != null -> {
                    Column(
                        modifier = Modifier.fillMaxSize().padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(Icons.Outlined.Warning, contentDescription = null, tint = Color.LightGray, modifier = Modifier.size(80.dp))
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(stringResource(R.string.unable_to_load_reports), fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.Black)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(uiState.error ?: "Something went wrong while loading your reports.", fontSize = 14.sp, color = Color.Gray, textAlign = TextAlign.Center)
                    }
                }
                filteredReports.isEmpty() -> {
                    Column(modifier = Modifier.fillMaxSize().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                        Icon(Icons.Outlined.Description, contentDescription = null, tint = Color.LightGray, modifier = Modifier.size(80.dp))
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(stringResource(R.string.no_reports_found), fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.Black)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(stringResource(R.string.your_medical_reports_will_appear_here), fontSize = 14.sp, color = Color.Gray, textAlign = TextAlign.Center)
                    }
                }
                else -> {
                    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        items(filteredReports) { report ->
                            ReportCard(
                                report = report,
                                onClick = {
                                    if (onReportClick != null) {
                                        onReportClick(report)
                                    } else if (report.fileUrl.isNotBlank()) {
                                        try {
                                            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(report.fileUrl)))
                                        } catch (_: Exception) {
                                            Toast.makeText(context, context.getString(R.string.unable_open_report), Toast.LENGTH_SHORT).show()
                                        }
                                    } else {
                                        Toast.makeText(context, context.getString(R.string.no_file_available_report), Toast.LENGTH_SHORT).show()
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ReportSummaryItem(count: String, label: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(text = count, fontSize = 24.sp, fontWeight = FontWeight.Bold, color = color)
        Text(text = label, fontSize = 12.sp, color = Color.Gray)
    }
}

@Composable
private fun ReportCard(report: MedicalDocument, onClick: () -> Unit) {
    val iconBg = when (report.type) {
        DocumentType.LAB_REPORT -> Color(0xFFFFEBEE)
        DocumentType.SCAN -> Color(0xFFE3F2FD)
        DocumentType.PRESCRIPTION -> Color(0xFFE8F5E9)
        else -> Color(0xFFF3E5F5)
    }
    val iconTint = when (report.type) {
        DocumentType.LAB_REPORT -> Color(0xFFE53935)
        DocumentType.SCAN -> Color(0xFF1976D2)
        DocumentType.PRESCRIPTION -> Color(0xFF4CAF50)
        else -> SwastikPurple
    }
    val icon = when (report.type) {
        DocumentType.LAB_REPORT -> Icons.Outlined.Bloodtype
        DocumentType.SCAN -> Icons.Outlined.Image
        DocumentType.PRESCRIPTION -> Icons.Outlined.Receipt
        else -> Icons.Outlined.Description
    }

    Card(
        modifier = Modifier.fillMaxWidth().clickable { onClick() },
        shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Row(modifier = Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(modifier = Modifier.size(50.dp).clip(RoundedCornerShape(12.dp)).background(iconBg), contentAlignment = Alignment.Center) {
                Icon(imageVector = icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(24.dp))
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(text = report.name, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = Color.Black)
                Spacer(modifier = Modifier.height(2.dp))
                if (report.doctorName != null) {
                    Text(text = report.doctorName, fontSize = 12.sp, color = Color.Gray)
                    Spacer(modifier = Modifier.height(4.dp))
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.CalendarMonth, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(text = report.date, fontSize = 11.sp, color = Color.Gray)
                }
            }
            Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFFF5F5F5)) {
                Text(
                    text = report.type.name.replace("_", " ").lowercase().replaceFirstChar { it.uppercase() },
                    fontSize = 11.sp, fontWeight = FontWeight.Medium, color = Color.Gray,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }
        }
    }
}
