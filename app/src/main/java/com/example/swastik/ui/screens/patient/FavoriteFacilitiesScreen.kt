package com.example.swastik.ui.screens.patient

import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.data.model.FacilityType
import com.example.swastik.ui.screens.patient.healthcare.finder.FacilityListCard
import com.example.swastik.ui.viewmodel.PatientDashboardViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FavoriteFacilitiesScreen(
    facilityTypeStr: String,
    onNavigateBack: () -> Unit,
    onFacilityClick: (String, String) -> Unit,
    viewModel: PatientDashboardViewModel = hiltViewModel()
) {
    val facilityType = runCatching { FacilityType.valueOf(facilityTypeStr) }.getOrNull()
    
    // Fallback if invalid type is provided
    if (facilityType == null) {
        onNavigateBack()
        return
    }

    val allFavorites by viewModel.favoriteFacilities.collectAsState()
    val filteredFavorites = allFavorites.filter { it.type == facilityType }
    val isDarkMode = MaterialTheme.colorScheme.surface.luminance() < 0.5f

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Favorite ${facilityType.getDisplayName()}s") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (filteredFavorites.isEmpty()) {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = Icons.Outlined.FavoriteBorder,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "No saved data",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "${facilityType.getDisplayName()}s you favorite will appear here.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(horizontal = 32.dp)
                    )
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    items(filteredFavorites) { facility ->
                        FacilityListCard(
                            facility = facility,
                            onClick = { onFacilityClick(facility.id, facility.type.name) },
                            isDarkMode = isDarkMode
                        )
                    }
                }
            }
        }
    }
}
