package com.example.swastik.ui.screens.patient.wellness

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.example.swastik.data.remote.dto.TrustedSupplementDto
import com.example.swastik.ui.viewmodel.WellnessViewModel

private val SupplementPurple = Color(0xFF9333EA)
private val SupplementPurpleLight = Color(0xFFF5EFFF)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WellnessSupplementsScreen(
    onNavigateBack: () -> Unit,
    viewModel: WellnessViewModel
) {
    val state by viewModel.uiState.collectAsState()
    var selectedCategory by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) { viewModel.refreshSupplements() }

    val categories = remember(state.supplements) { viewModel.getSupplementCategories() }
    val displayedSupplements = remember(state.supplements, selectedCategory) {
        if (selectedCategory == null) state.supplements
        else viewModel.getSupplementsByCategory(selectedCategory!!)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Supplements Store", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = viewModel::refreshSupplements) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = SupplementPurpleLight)
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (state.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = SupplementPurple)
                }
            } else if (state.supplements.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.padding(32.dp)
                    ) {
                        Surface(shape = CircleShape, color = SupplementPurple.copy(alpha = 0.1f), modifier = Modifier.size(80.dp)) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.ShoppingCart, null, tint = SupplementPurple, modifier = Modifier.size(40.dp))
                            }
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("No Supplements Yet", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Trusted supplements will appear after catalogue approval.", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
                    }
                }
            } else {
                // Category filter chips
                if (categories.isNotEmpty()) {
                    LazyRow(
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        item {
                            FilterChip(
                                selected = selectedCategory == null,
                                onClick = { selectedCategory = null },
                                label = { Text("All (${state.supplements.size})") },
                                leadingIcon = if (selectedCategory == null) {{ Icon(Icons.Default.Check, null, modifier = Modifier.size(16.dp)) }} else null,
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = SupplementPurple.copy(alpha = 0.15f),
                                    selectedLabelColor = SupplementPurple
                                )
                            )
                        }
                        items(categories) { category ->
                            FilterChip(
                                selected = selectedCategory == category,
                                onClick = { selectedCategory = if (selectedCategory == category) null else category },
                                label = { Text(category.replaceFirstChar { it.uppercase() }) },
                                leadingIcon = if (selectedCategory == category) {{ Icon(Icons.Default.Check, null, modifier = Modifier.size(16.dp)) }} else null,
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = SupplementPurple.copy(alpha = 0.15f),
                                    selectedLabelColor = SupplementPurple
                                )
                            )
                        }
                    }
                }

                // Product grid
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    contentPadding = PaddingValues(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(displayedSupplements) { supplement ->
                        SupplementCard(supplement)
                    }
                }
            }
        }
    }
}

@Composable
private fun SupplementCard(supplement: TrustedSupplementDto) {
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column {
            // Product Image
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(140.dp)
                    .clip(RoundedCornerShape(topStart = 18.dp, topEnd = 18.dp))
            ) {
                if (!supplement.imageUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = ImageRequest.Builder(LocalContext.current)
                            .data(supplement.imageUrl)
                            .crossfade(true)
                            .build(),
                        contentDescription = supplement.name,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(SupplementPurple.copy(alpha = 0.08f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.ShoppingCart, null, tint = SupplementPurple, modifier = Modifier.size(36.dp))
                    }
                }

                // Verified badge
                if (supplement.isVerified == true) {
                    Surface(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(8.dp),
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFF4CAF50)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Verified, null, tint = Color.White, modifier = Modifier.size(12.dp))
                            Spacer(modifier = Modifier.width(2.dp))
                            Text("Verified", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }
            }

            // Content
            Column(modifier = Modifier.padding(12.dp)) {
                Text(supplement.name, fontWeight = FontWeight.Bold, fontSize = 14.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)

                supplement.brand?.let {
                    Text(it, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }

                Spacer(modifier = Modifier.height(6.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    supplement.price?.let { price ->
                        Text(
                            "₹${price.toInt()}",
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 16.sp,
                            color = SupplementPurple
                        )
                    }
                    supplement.category?.let { cat ->
                        Surface(shape = RoundedCornerShape(12.dp), color = SupplementPurple.copy(alpha = 0.1f)) {
                            Text(
                                cat.replaceFirstChar { it.uppercase() },
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                color = SupplementPurple
                            )
                        }
                    }
                }

                supplement.description?.let {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(it, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
                }
            }
        }
    }
}
