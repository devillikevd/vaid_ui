package com.example.swastik.ui.screens.patient.components

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.NorthEast
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import android.app.Activity
import android.content.Intent
import android.speech.RecognizerIntent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import com.example.swastik.data.model.Doctor

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GlobalSearchBar(
    doctors: List<Doctor>,
    onDoctorSelect: (Doctor) -> Unit,
    onSpecialitySelect: (String) -> Unit
) {
    var query by remember { mutableStateOf("") }
    val focusManager = LocalFocusManager.current
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    
    val speechRecognizerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val data = result.data
            val matches = data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
            if (!matches.isNullOrEmpty()) {
                query = matches[0]
            }
        }
    }

    // Default suggestions when focused but empty
    val suggestions = listOf("Fever", "Headache", "Dermatologist", "Gynecologist", "Cough", "Dentist")

    // Filter logic
    val filteredDocs = if (query.isEmpty()) emptyList() else {
        doctors.filter { it.name.contains(query, ignoreCase = true) || it.specialization.contains(query, ignoreCase = true) }
    }
    val specialitiesList = listOf("General Physician", "Dermatologist", "Gynecologist", "Orthopedist", "Pediatrician", "ENT Specialist", "Cardiologist", "Neurologist", "Psychiatrist", "Gastroenterologist")
    val filteredSpecs = if (query.isEmpty()) emptyList() else {
        specialitiesList.filter { it.contains(query, ignoreCase = true) }
    }

    if (isFocused || query.isNotEmpty()) {
        BackHandler {
            if (query.isNotEmpty()) {
                query = ""
            } else {
                focusManager.clearFocus()
            }
        }
    }
    
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
    ) {
        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            placeholder = { Text("Search Doctors, Specialities...", color = Color.Gray, fontSize = 14.sp) },
            leadingIcon = {
                Icon(Icons.Filled.Search, contentDescription = "Search", tint = Color.Gray)
            },
            trailingIcon = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (query.isNotEmpty()) {
                        IconButton(onClick = { query = "" }) {
                            Icon(Icons.Filled.Close, contentDescription = "Clear", tint = Color.Gray)
                        }
                    }
                    IconButton(onClick = {
                        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                            putExtra(RecognizerIntent.EXTRA_PROMPT, "Speak to search...")
                        }
                        try {
                            speechRecognizerLauncher.launch(intent)
                        } catch (e: Exception) {}
                    }) {
                        Icon(Icons.Filled.Mic, contentDescription = "Voice Search", tint = Color.Gray)
                    }
                }
            },
            interactionSource = interactionSource,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            shape = RoundedCornerShape(24.dp),
            colors = TextFieldDefaults.outlinedTextFieldColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                unfocusedBorderColor = Color.Transparent,
                focusedBorderColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)
            ),
            singleLine = true
        )
        
        if (isFocused || query.isNotEmpty()) {
            val displayList = if (query.isEmpty()) suggestions else emptyList()
            
            if (displayList.isNotEmpty() || filteredDocs.isNotEmpty() || filteredSpecs.isNotEmpty()) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(6.dp)
                ) {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 350.dp)
                    ) {
                        // Show Suggestions if query is empty
                        if (query.isEmpty()) {
                            item {
                                Text("Suggested for you", fontWeight = FontWeight.Bold, modifier = Modifier.padding(16.dp, 12.dp, 16.dp, 8.dp), color = Color.Gray, fontSize = 12.sp)
                            }
                            items(suggestions) { item ->
                                SuggestionRow(item) {
                                    onSpecialitySelect(item)
                                    query = ""
                                    focusManager.clearFocus()
                                }
                            }
                        } else {
                            // Show Filtered Specialities
                            if (filteredSpecs.isNotEmpty()) {
                                item {
                                    Text("Specialities", fontWeight = FontWeight.Bold, modifier = Modifier.padding(16.dp, 12.dp, 16.dp, 8.dp), color = Color.Gray, fontSize = 12.sp)
                                }
                                items(filteredSpecs) { spec ->
                                    SuggestionRow(spec) {
                                        onSpecialitySelect(spec)
                                        query = ""
                                        focusManager.clearFocus()
                                    }
                                }
                            }

                            // Show Filtered Doctors
                            if (filteredDocs.isNotEmpty()) {
                                item {
                                    Text("Doctors", fontWeight = FontWeight.Bold, modifier = Modifier.padding(16.dp, 12.dp, 16.dp, 8.dp), color = Color.Gray, fontSize = 12.sp)
                                }
                                items(filteredDocs) { doc ->
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable { 
                                                onDoctorSelect(doc)
                                                query = ""
                                                focusManager.clearFocus()
                                            }
                                            .padding(16.dp, 12.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Icon(Icons.Filled.NorthEast, null, tint = Color.LightGray, modifier = Modifier.size(18.dp))
                                        Spacer(modifier = Modifier.width(16.dp))
                                        Column {
                                            Text(doc.name, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                                            Text(doc.specialization, fontSize = 12.sp, color = Color.Gray)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun SuggestionRow(text: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(16.dp, 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(Icons.Filled.NorthEast, null, tint = Color.LightGray, modifier = Modifier.size(18.dp))
        Spacer(modifier = Modifier.width(16.dp))
        Text(text, fontSize = 14.sp, fontWeight = FontWeight.Medium)
    }
}
