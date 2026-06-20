package com.example.swastik.ui.screens.patient.diet

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.rememberAsyncImagePainter
import com.example.swastik.data.remote.dto.CalculatedFoodItem
import com.example.swastik.data.remote.dto.DietCalculationResponse
import com.example.swastik.data.remote.dto.IdentifiedFoodItem

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DietTrackerScreen(
    onNavigateBack: () -> Unit,
    viewModel: DietTrackerViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    
    var selectedImageUri by remember { mutableStateOf<Uri?>(null) }
    var tempCameraUri by remember { mutableStateOf<Uri?>(null) }
    var additionalNotes by remember { mutableStateOf("") }
    
    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            selectedImageUri = it
            viewModel.analyzeImage(context, it)
        }
    }

    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture()
    ) { success: Boolean ->
        if (success) {
            tempCameraUri?.let {
                selectedImageUri = it
                viewModel.analyzeImage(context, it)
            }
        }
    }

    fun createTempFileUri(): Uri {
        val tempFile = java.io.File(context.cacheDir, "diet_camera_${System.currentTimeMillis()}.jpg")
        return androidx.core.content.FileProvider.getUriForFile(
            context,
            "${context.packageName}.provider",
            tempFile
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Diet & Nutrition Tracker", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(MaterialTheme.colorScheme.background)
        ) {
            when (val state = uiState) {
                is DietTrackerState.Initial, is DietTrackerState.LoadingQuota, is DietTrackerState.QuotaLoaded -> {
                    val remaining = if (state is DietTrackerState.QuotaLoaded) state.quota.remaining else 3
                    InitialUploadView(
                        remainingQuota = remaining,
                        onGalleryClick = { photoPickerLauncher.launch("image/*") },
                        onCameraClick = {
                            try {
                                val uri = createTempFileUri()
                                tempCameraUri = uri
                                cameraLauncher.launch(uri)
                            } catch (e: android.content.ActivityNotFoundException) {
                                android.widget.Toast.makeText(context, "No camera app found on this device.", android.widget.Toast.LENGTH_LONG).show()
                            }
                        }
                    )
                }
                
                is DietTrackerState.AnalyzingImage -> {
                    LoadingView("AI is analyzing your meal...\nThis usually takes about 10-15 seconds.")
                }
                
                is DietTrackerState.AnalysisError -> {
                    ErrorView(
                        message = state.message,
                        isExhausted = state.isQuotaExhausted,
                        onRetry = { 
                            selectedImageUri?.let { viewModel.analyzeImage(context, it) }
                        },
                        onBack = { viewModel.checkQuota() }
                    )
                }
                
                is DietTrackerState.AnalysisSuccess -> {
                    EditDetectedItemsView(
                        imageUri = selectedImageUri,
                        items = state.items,
                        notes = additionalNotes,
                        onItemChange = { index, item -> viewModel.updateIdentifiedItem(index, item) },
                        onItemRemove = { index -> viewModel.removeIdentifiedItem(index) },
                        onItemAdd = { viewModel.addIdentifiedItem() },
                        onNotesChange = { additionalNotes = it },
                        onCalculate = { viewModel.calculateNutrition(state.items, additionalNotes) },
                        onBack = { viewModel.checkQuota() }
                    )
                }
                
                is DietTrackerState.CalculatingNutrition -> {
                    LoadingView("Calculating precise macros & matching with ICMR database...")
                }
                
                is DietTrackerState.CalculationError -> {
                    ErrorView(
                        message = state.message,
                        isExhausted = false,
                        onRetry = {
                            if (uiState is DietTrackerState.AnalysisSuccess) {
                                viewModel.calculateNutrition((uiState as DietTrackerState.AnalysisSuccess).items, additionalNotes)
                            }
                        },
                        onBack = { viewModel.checkQuota() }
                    )
                }
                
                is DietTrackerState.CalculationSuccess -> {
                    NutritionReportView(
                        imageUri = selectedImageUri,
                        result = state.result,
                        onDone = { 
                            selectedImageUri = null
                            additionalNotes = ""
                            viewModel.checkQuota()
                        }
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InitialUploadView(remainingQuota: Int, onGalleryClick: () -> Unit, onCameraClick: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(120.dp)
                .background(Color(0xFFFFF3E0), RoundedCornerShape(32.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Default.Restaurant,
                contentDescription = null,
                tint = Color(0xFFE65100),
                modifier = Modifier.size(64.dp)
            )
        }
        
        Spacer(modifier = Modifier.height(32.dp))
        
        Text(
            text = "Track What You Eat",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(
            text = "Snap a photo of your meal or upload from gallery to calculate exact calories, protein, and macros.",
            fontSize = 16.sp,
            color = Color.Gray,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            modifier = Modifier.padding(horizontal = 16.dp)
        )
        
        Spacer(modifier = Modifier.height(48.dp))
        
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Card(
                onClick = onCameraClick,
                modifier = Modifier.weight(1f).height(120.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFE65100)),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(Icons.Default.CameraAlt, contentDescription = null, tint = Color.White, modifier = Modifier.size(32.dp))
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Snap Meal", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
            
            Card(
                onClick = onGalleryClick,
                modifier = Modifier.weight(1f).height(120.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF00796B)),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(Icons.Default.PhotoLibrary, contentDescription = null, tint = Color.White, modifier = Modifier.size(32.dp))
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Upload Meal", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
        }
        
        Spacer(modifier = Modifier.height(32.dp))
        
        Text(
            text = "Free scans remaining today: $remainingQuota/5",
            fontSize = 14.sp,
            color = if (remainingQuota > 0) Color(0xFF2E7D32) else Color(0xFFD32F2F),
            fontWeight = FontWeight.Medium
        )
    }
}

@Composable
fun EditDetectedItemsView(
    imageUri: Uri?,
    items: List<IdentifiedFoodItem>,
    notes: String,
    onItemChange: (Int, IdentifiedFoodItem) -> Unit,
    onItemRemove: (Int) -> Unit,
    onItemAdd: () -> Unit,
    onNotesChange: (String) -> Unit,
    onCalculate: () -> Unit,
    onBack: () -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        item {
            imageUri?.let {
                Image(
                    painter = rememberAsyncImagePainter(it),
                    contentDescription = "Meal Photo",
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp)
                        .clip(RoundedCornerShape(16.dp)),
                    contentScale = ContentScale.Crop
                )
                Spacer(modifier = Modifier.height(24.dp))
            }
            
            Text(
                "Verify Detected Items",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "You can edit the items below if the AI made a mistake.",
                fontSize = 14.sp,
                color = Color.Gray,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(16.dp))
        }

        itemsIndexed(items) { index, item ->
            Card(
                modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                shape = RoundedCornerShape(12.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp).fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = item.name,
                            onValueChange = { onItemChange(index, item.copy(name = it)) },
                            label = { Text("Item Name", fontSize = 12.sp) },
                            modifier = Modifier.weight(1f).padding(end = 8.dp),
                            singleLine = true,
                            textStyle = androidx.compose.ui.text.TextStyle(fontSize = 14.sp, fontWeight = FontWeight.Normal)
                        )
                        IconButton(onClick = { onItemRemove(index) }) {
                            Icon(Icons.Default.Close, contentDescription = "Remove", tint = Color.Gray)
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = item.quantity.toString(),
                            onValueChange = { 
                                val qty = it.toDoubleOrNull() ?: 1.0
                                onItemChange(index, item.copy(quantity = qty)) 
                            },
                            label = { Text("Quantity", fontSize = 12.sp) },
                            modifier = Modifier.weight(1f),
                            singleLine = true,
                            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
                            textStyle = androidx.compose.ui.text.TextStyle(fontSize = 14.sp, fontWeight = FontWeight.Normal)
                        )
                        OutlinedTextField(
                            value = item.unit,
                            onValueChange = { onItemChange(index, item.copy(unit = it)) },
                            label = { Text("Unit (e.g. piece, katori)", fontSize = 12.sp) },
                            modifier = Modifier.weight(2f),
                            singleLine = true,
                            textStyle = androidx.compose.ui.text.TextStyle(fontSize = 14.sp, fontWeight = FontWeight.Normal)
                        )
                    }
                }
            }
        }

        item {
            TextButton(
                onClick = onItemAdd,
                modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Item")
                Spacer(modifier = Modifier.width(8.dp))
                Text("Add Missing Item", fontWeight = FontWeight.Medium)
            }
            Spacer(modifier = Modifier.height(16.dp))
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                "Missed Anything?",
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = notes,
                onValueChange = onNotesChange,
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("e.g. Added 1 spoon ghee, or 1 extra roti") },
                shape = RoundedCornerShape(12.dp)
            )
            
            Spacer(modifier = Modifier.height(32.dp))
            
            Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Button(
                    onClick = onCalculate,
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00796B)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Calculate Nutrition", fontSize = 16.sp)
                }
                
                OutlinedButton(
                    onClick = onBack,
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Cancel", fontSize = 16.sp)
                }
            }
        }
    }
}

@Composable
fun NutritionReportView(
    imageUri: Uri?,
    result: DietCalculationResponse,
    onDone: () -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp)
    ) {
        item {
            Text("Nutrition Report", fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(24.dp))
            
            // Macro Cards
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                MacroCard("Calories", "${result.totals.calories.toInt()} kcal", Color(0xFFFFF3E0), Color(0xFFE65100), Modifier.weight(1f))
                MacroCard("Protein", "${result.totals.protein_g}g", Color(0xFFE3F2FD), Color(0xFF1565C0), Modifier.weight(1f))
                MacroCard("Carbs", "${result.totals.carbs_g}g", Color(0xFFF1F8E9), Color(0xFF33691E), Modifier.weight(1f))
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // AI Advice
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.AutoAwesome, null, tint = Color(0xFF2E7D32))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("AI Assessment", fontWeight = FontWeight.Bold, color = Color(0xFF2E7D32))
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(result.advice.general_assessment, fontSize = 14.sp)
                    
                    if (result.advice.health_warnings.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(12.dp))
                        result.advice.health_warnings.forEach { warning ->
                            Row(modifier = Modifier.padding(bottom = 4.dp)) {
                                Icon(Icons.Default.Warning, null, tint = Color(0xFFD32F2F), modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(warning, color = Color(0xFFD32F2F), fontSize = 12.sp)
                            }
                        }
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            Text("Detailed Breakdown", fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(8.dp))
        }
        
        items(result.items) { item ->
            Column(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(item.name, fontWeight = FontWeight.SemiBold)
                    Text("${item.calories.toInt()} kcal", fontWeight = FontWeight.Bold)
                }
                Text("${item.quantity} ${item.unit} | P: ${item.protein_g}g | C: ${item.carbs_g}g | F: ${item.fat_g}g", fontSize = 12.sp, color = Color.Gray)
                Divider(modifier = Modifier.padding(top = 8.dp))
            }
        }
        
        item {
            Spacer(modifier = Modifier.height(32.dp))
            Button(
                onClick = onDone,
                modifier = Modifier.fillMaxWidth().height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE65100)),
                shape = RoundedCornerShape(16.dp)
            ) {
                Text("Done", fontSize = 16.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun MacroCard(title: String, value: String, bgColor: Color, textColor: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = bgColor),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(title, fontSize = 12.sp, color = textColor)
            Spacer(modifier = Modifier.height(4.dp))
            Text(value, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = textColor)
        }
    }
}

@Composable
fun LoadingView(message: String) {
    Column(
        modifier = Modifier.fillMaxSize().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        CircularProgressIndicator(color = Color(0xFFE65100))
        Spacer(modifier = Modifier.height(24.dp))
        Text(message, textAlign = androidx.compose.ui.text.style.TextAlign.Center, color = Color.Gray)
    }
}

@Composable
fun ErrorView(message: String, isExhausted: Boolean, onRetry: () -> Unit, onBack: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(Icons.Default.ErrorOutline, null, tint = Color(0xFFD32F2F), modifier = Modifier.size(64.dp))
        Spacer(modifier = Modifier.height(16.dp))
        Text("Oops!", fontSize = 24.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(8.dp))
        Text(message, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
        Spacer(modifier = Modifier.height(32.dp))
        
        if (!isExhausted) {
            Button(onClick = onRetry, modifier = Modifier.fillMaxWidth().height(50.dp)) {
                Text("Try Again")
            }
            Spacer(modifier = Modifier.height(16.dp))
        }
        
        OutlinedButton(onClick = onBack, modifier = Modifier.fillMaxWidth().height(50.dp)) {
            Text("Go Back")
        }
    }
}
