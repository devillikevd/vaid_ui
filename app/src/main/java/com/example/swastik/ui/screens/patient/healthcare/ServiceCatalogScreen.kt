package com.example.swastik.ui.screens.patient.healthcare

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.outlined.Calculate
import androidx.compose.material.icons.outlined.MedicalServices
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.data.model.BillEstimate
import com.example.swastik.ui.theme.*
import com.example.swastik.ui.viewmodel.HisPatientViewModel

/**
 * Hospital Service Catalog + Bill Estimator screen.
 * Patient can browse a hospital's service rate card and get cost estimates.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ServiceCatalogScreen(
    hospitalId: String,
    hospitalName: String = "Hospital",
    onBack: () -> Unit = {},
    viewModel: HisPatientViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    val selectedServices = remember { mutableStateListOf<String>() }

    LaunchedEffect(hospitalId) {
        viewModel.fetchServiceCatalog(hospitalId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Service Catalog", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Text(hospitalName, fontSize = 12.sp, color = Color.White.copy(alpha = 0.8f))
                    }
                },
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
        },
        bottomBar = {
            if (selectedServices.isNotEmpty()) {
                Surface(
                    shadowElevation = 8.dp,
                    color = SurfaceLight,
                    modifier = Modifier
                        .fillMaxWidth()
                        .navigationBarsPadding()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("${selectedServices.size} services selected", fontWeight = FontWeight.Medium, fontSize = 14.sp)
                            if (uiState.billEstimate != null) {
                                Text(
                                    "Estimated: ₹${String.format("%,.2f", uiState.billEstimate!!.estimatedTotal)}",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp,
                                    color = SwastikPrimary
                                )
                            }
                        }
                        Button(
                            onClick = { viewModel.fetchBillEstimate(hospitalId, selectedServices.toList()) },
                            colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Outlined.Calculate, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Estimate")
                        }
                    }
                }
            }
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            // Search bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = {
                    searchQuery = it
                    viewModel.fetchServiceCatalog(hospitalId, search = it.ifBlank { null })
                },
                placeholder = { Text("Search services...", color = TextSecondary) },
                leadingIcon = { Icon(Icons.Outlined.Search, contentDescription = null, tint = TextSecondary) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = SwastikPrimary,
                    unfocusedBorderColor = Color(0xFFE0E0E0)
                )
            )

            // Services list
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                if (uiState.serviceCatalogLoading) {
                    item {
                        Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = SwastikPrimary, strokeWidth = 2.dp)
                        }
                    }
                } else if (uiState.serviceCatalog.isEmpty()) {
                    item {
                        Column(
                            modifier = Modifier.fillMaxWidth().padding(32.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(Icons.Outlined.MedicalServices, contentDescription = null, tint = TextSecondary, modifier = Modifier.size(48.dp))
                            Spacer(modifier = Modifier.height(8.dp))
                            Text("No services found", color = TextSecondary)
                        }
                    }
                } else {
                    items(uiState.serviceCatalog) { service ->
                        ServiceRateCard(
                            service = service,
                            isSelected = selectedServices.contains(service.serviceName),
                            onToggle = {
                                if (selectedServices.contains(service.serviceName)) {
                                    selectedServices.remove(service.serviceName)
                                } else {
                                    selectedServices.add(service.serviceName)
                                }
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ServiceRateCard(
    service: BillEstimate,
    isSelected: Boolean,
    onToggle: () -> Unit
) {
    Card(
        onClick = onToggle,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) SwastikPrimaryLight else SurfaceLight
        ),
        elevation = CardDefaults.cardElevation(if (isSelected) 2.dp else 0.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Checkbox(
                checked = isSelected,
                onCheckedChange = { onToggle() },
                colors = CheckboxDefaults.colors(checkedColor = SwastikPrimary)
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(service.serviceName, fontWeight = FontWeight.Medium, fontSize = 14.sp)
                if (service.category != null) {
                    Text(service.category, color = TextSecondary, fontSize = 11.sp)
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    "₹${String.format("%,.0f", service.rate)}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = SwastikPrimary
                )
                if (service.gstPercent > 0) {
                    Text(
                        "+${service.gstPercent.toInt()}% GST",
                        fontSize = 10.sp,
                        color = TextSecondary
                    )
                }
            }
        }
    }
}
