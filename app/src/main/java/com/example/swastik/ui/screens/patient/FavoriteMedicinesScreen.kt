package com.example.swastik.ui.screens.patient

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.ui.theme.SwastikPrimary

import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.ui.viewmodel.MedicineViewModel
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import com.example.swastik.ui.screens.patient.tabs.GlobalMedicineListCard

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FavoriteMedicinesScreen(
    onNavigateBack: () -> Unit,
    onNavigateToMedicineDetail: (String) -> Unit,
    onNavigateToCart: () -> Unit,
    viewModel: MedicineViewModel = hiltViewModel()
) {
    val favorites by viewModel.favoriteMedicines.collectAsState()
    val cartState by viewModel.cartState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Favorite Medicines") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (cartState.totalItems > 0) {
                        BadgedBox(
                            badge = {
                                Badge(containerColor = SwastikPrimary) {
                                    Text("${cartState.totalItems}", color = androidx.compose.ui.graphics.Color.White, fontSize = 11.sp)
                                }
                            },
                            modifier = Modifier.padding(end = 12.dp)
                        ) {
                            IconButton(onClick = onNavigateToCart) {
                                Icon(
                                    Icons.Outlined.ShoppingCart,
                                    contentDescription = "Cart",
                                    tint = SwastikPrimary,
                                    modifier = Modifier.size(26.dp)
                                )
                            }
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            if (favorites.isEmpty()) {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = Icons.Outlined.FavoriteBorder,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = SwastikPrimary
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "No favorite medicines yet",
                        style = MaterialTheme.typography.titleMedium
                    )
                    Text(
                        text = "Medicines you favorite will appear here.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(favorites.toList()) { medicine ->
                        val isInCart = cartState.items.any { it.medicine.id == medicine.id }
                        GlobalMedicineListCard(
                            medicine = medicine,
                            isInCart = isInCart,
                            cartQuantity = cartState.items.find { it.medicine.id == medicine.id }?.quantity ?: 0,
                            isFavorite = true,
                            onToggleFavorite = { viewModel.toggleFavorite(medicine) },
                            onClick = { onNavigateToMedicineDetail(medicine.id) },
                            onAddToCart = { viewModel.addToCart(medicine, "GLOBAL_REQUEST", "Global Request") },
                            onIncrement = { viewModel.addToCart(medicine, "GLOBAL_REQUEST", "Global Request") },
                            onDecrement = { viewModel.removeFromCart(medicine.id) }
                        )
                    }
                }
            }
        }
    }
}
