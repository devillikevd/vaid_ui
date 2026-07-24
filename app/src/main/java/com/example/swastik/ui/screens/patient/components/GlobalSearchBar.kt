package com.example.swastik.ui.screens.patient.components

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.NorthEast
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.focus.focusRequester
import com.example.swastik.ui.theme.ShadowTint
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import android.app.Activity
import android.content.Intent
import android.speech.RecognizerIntent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import com.example.swastik.data.model.Doctor
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.res.stringResource
import com.example.swastik.R
import com.example.swastik.utils.getTranslatedCategoryText

@Composable
fun GlobalSearchBar(
    doctors: List<Doctor>,
    searchSuggestions: List<String>,
    onDoctorSelect: (Doctor) -> Unit,
    onSpecialitySelect: (String) -> Unit,
    onServiceSelect: (String) -> Unit = {}
) {
    var isSearchScreenOpen by remember { mutableStateOf(false) }
    var query by remember { mutableStateOf("") }
    val focusManager = androidx.compose.ui.platform.LocalFocusManager.current
    val context = androidx.compose.ui.platform.LocalContext.current
    
    val speechRecognizerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val data = result.data
            val matches = data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
            if (!matches.isNullOrEmpty()) {
                query = matches[0]
                isSearchScreenOpen = true // Open dialog if voice search returns results
            }
        }
    }

    val homeServices = listOf(
        stringResource(R.string.search_term_hospitals),
        stringResource(R.string.search_term_clinics),
        stringResource(R.string.search_term_pharmacy),
        stringResource(R.string.search_term_diagnostics),
        stringResource(R.string.search_term_lab_tests),
        stringResource(R.string.search_term_appointments),
        stringResource(R.string.search_term_reports),
        stringResource(R.string.search_term_prescriptions),
        stringResource(R.string.search_term_vitals),
        stringResource(R.string.search_term_health_card),
        stringResource(R.string.search_term_emergency),
        stringResource(R.string.search_term_sos),
        stringResource(R.string.search_term_ambulance),
        stringResource(R.string.search_term_ai_assistant),
        stringResource(R.string.search_term_chatbot)
    )

    val fallbackSuggestions = listOf(
        stringResource(R.string.search_term_hospitals),
        stringResource(R.string.search_term_fever),
        stringResource(R.string.search_term_headache),
        stringResource(R.string.category_dermatologist),
        stringResource(R.string.category_gynecologist),
        stringResource(R.string.search_term_ambulance),
        stringResource(R.string.category_dentist)
    )
    val suggestions = searchSuggestions.ifEmpty { fallbackSuggestions }

    val filteredServices = if (query.isEmpty()) emptyList() else homeServices.filter { it.contains(query, ignoreCase = true) }
    val filteredDocs = if (query.isEmpty()) emptyList() else doctors.filter { it.name.contains(query, ignoreCase = true) || it.specialization.contains(query, ignoreCase = true) }
    val specialitiesList = listOf(
        stringResource(R.string.category_general_physician),
        stringResource(R.string.category_dermatologist),
        stringResource(R.string.category_gynecologist),
        stringResource(R.string.category_orthopedist),
        stringResource(R.string.category_pediatrician),
        stringResource(R.string.category_ent_specialist),
        stringResource(R.string.category_cardiologist),
        stringResource(R.string.category_neurologist),
        stringResource(R.string.category_psychiatrist),
        stringResource(R.string.category_gastroenterologist)
    )
    val filteredSpecs = if (query.isEmpty()) emptyList() else specialitiesList.filter { it.contains(query, ignoreCase = true) }

    val homeBgColor = if (MaterialTheme.colorScheme.surface.luminance() < 0.5f) {
        MaterialTheme.colorScheme.background
    } else {
        Color(0xFFF8FAFC)
    }

    // Read-only Search Bar for Home Screen
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(46.dp)
            .padding(horizontal = 16.dp)
            .shadow(
                elevation = 2.dp,
                shape = RoundedCornerShape(12.dp),
                spotColor = Color.Black.copy(alpha = 0.05f),
                ambientColor = Color.Transparent
            )
            .background(Color(0xFFFFFFFF), RoundedCornerShape(12.dp))
            .border(1.dp, Color(0xFFE5E7EB), RoundedCornerShape(12.dp))
            .clickable { isSearchScreenOpen = true },
        verticalAlignment = Alignment.CenterVertically
    ) {
        Spacer(modifier = Modifier.width(14.dp))
        Icon(Icons.Filled.Search, contentDescription = "Search", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(19.dp))
        Spacer(modifier = Modifier.width(12.dp))
        Text(
            stringResource(R.string.search_doctors_specialities_symptoms), 
            color = MaterialTheme.colorScheme.onSurfaceVariant, 
            fontSize = 14.sp,
            maxLines = 1,
            modifier = Modifier.weight(1f)
        )
        IconButton(
            onClick = {
                val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                    putExtra(RecognizerIntent.EXTRA_PROMPT, "Speak to search...")
                }
                try {
                    speechRecognizerLauncher.launch(intent)
                } catch (e: Exception) {}
            },
            modifier = Modifier.size(26.dp)
        ) {
            Icon(Icons.Filled.Mic, contentDescription = "Voice Search", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
        }
        Spacer(modifier = Modifier.width(14.dp))
    }

    if (isSearchScreenOpen) {
        androidx.compose.ui.window.Dialog(
            onDismissRequest = { 
                isSearchScreenOpen = false
                query = "" 
            },
            properties = androidx.compose.ui.window.DialogProperties(
                usePlatformDefaultWidth = false
            )
        ) {
            val interactionSource = remember { MutableInteractionSource() }
            val focusRequester = remember { androidx.compose.ui.focus.FocusRequester() }
            
            LaunchedEffect(Unit) {
                focusRequester.requestFocus()
            }

            BackHandler {
                if (query.isNotEmpty()) {
                    query = ""
                } else {
                    isSearchScreenOpen = false
                    query = ""
                }
            }

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(homeBgColor)
                    .statusBarsPadding()
            ) {
                // Top Search Row
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = { isSearchScreenOpen = false; query = "" }) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "Back", tint = MaterialTheme.colorScheme.onSurface)
                    }
                    
                    BasicTextField(
                        value = query,
                        onValueChange = { query = it },
                        interactionSource = interactionSource,
                        modifier = Modifier
                            .weight(1f)
                            .height(46.dp)
                            .padding(end = 8.dp)
                            .shadow(
                                elevation = 2.dp,
                                shape = RoundedCornerShape(12.dp),
                                spotColor = Color.Black.copy(alpha = 0.05f),
                                ambientColor = Color.Transparent
                            )
                            .background(Color(0xFFFFFFFF), RoundedCornerShape(12.dp))
                            .border(1.dp, Color(0xFFE5E7EB), RoundedCornerShape(12.dp))
                            .focusRequester(focusRequester),
                        singleLine = true,
                        textStyle = TextStyle(fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                        keyboardActions = KeyboardActions(
                            onSearch = {
                                val trimmedQuery = query.trim()
                                if (trimmedQuery.isNotEmpty()) {
                                    val serviceMatch = homeServices.find { it.equals(trimmedQuery, ignoreCase = true) } ?: homeServices.find { it.contains(trimmedQuery, ignoreCase = true) }
                                    if (serviceMatch != null) {
                                        isSearchScreenOpen = false
                                        query = ""
                                        onServiceSelect(serviceMatch)
                                    } else {
                                        val specMatch = specialitiesList.find { it.equals(trimmedQuery, ignoreCase = true) } ?: specialitiesList.find { it.contains(trimmedQuery, ignoreCase = true) }
                                        if (specMatch != null) {
                                            isSearchScreenOpen = false
                                            query = ""
                                            onSpecialitySelect(specMatch)
                                        } else {
                                            val doctorMatch = doctors.find { it.name.contains(trimmedQuery, ignoreCase = true) || it.specialization.contains(trimmedQuery, ignoreCase = true) }
                                            if (doctorMatch != null) {
                                                isSearchScreenOpen = false
                                                query = ""
                                                onDoctorSelect(doctorMatch)
                                            } else {
                                                val symptoms = listOf("fever", "headache", "cough", "pain", "stomach", "cold", "flu", "injury")
                                                val isSymptom = symptoms.any { trimmedQuery.lowercase().contains(it) }
                                                if (isSymptom || trimmedQuery.length > 3) {
                                                    isSearchScreenOpen = false
                                                    query = ""
                                                    onSpecialitySelect(trimmedQuery)
                                                } else {
                                                    android.widget.Toast.makeText(context, "No matches found for \"$trimmedQuery\"", android.widget.Toast.LENGTH_SHORT).show()
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        ),
                        decorationBox = { innerTextField ->
                            Row(
                                modifier = Modifier.fillMaxSize().padding(horizontal = 14.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(modifier = Modifier.weight(1f)) {
                                    if (query.isEmpty()) {
                                        Text(
                                            stringResource(R.string.search_doctors_specialities_symptoms), 
                                            color = MaterialTheme.colorScheme.onSurfaceVariant, 
                                            fontSize = 14.sp,
                                            maxLines = 1,
                                            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                                        )
                                    }
                                    innerTextField()
                                }
                                if (query.isNotEmpty()) {
                                    IconButton(onClick = { query = "" }, modifier = Modifier.size(26.dp)) {
                                        Icon(Icons.Filled.Close, contentDescription = "Clear", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
                                    }
                                }
                                IconButton(
                                    onClick = {
                                        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                                            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                                            putExtra(RecognizerIntent.EXTRA_PROMPT, "Speak to search...")
                                        }
                                        try {
                                            speechRecognizerLauncher.launch(intent)
                                        } catch (e: Exception) {}
                                    },
                                    modifier = Modifier.size(26.dp)
                                ) {
                                    Icon(Icons.Filled.Mic, contentDescription = "Voice Search", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
                                }
                            }
                        }
                    )
                }
                
                // Recommendations List
                val displayList = if (query.isEmpty()) suggestions else emptyList()
                if (displayList.isNotEmpty() || filteredDocs.isNotEmpty() || filteredSpecs.isNotEmpty() || filteredServices.isNotEmpty()) {
                    LazyColumn(modifier = Modifier.fillMaxSize()) {
                        if (query.isEmpty()) {
                            item {
                                Text(stringResource(R.string.suggested_for_you), fontWeight = FontWeight.Bold, modifier = Modifier.padding(16.dp, 12.dp, 16.dp, 8.dp), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                            }
                            items(suggestions) { item ->
                                val translatedItem = getTranslatedCategoryText(item)
                                SuggestionRow(translatedItem) {
                                    isSearchScreenOpen = false
                                    query = ""
                                    if (homeServices.contains(item)) onServiceSelect(item) else onSpecialitySelect(item)
                                }
                            }
                        } else {
                            if (filteredServices.isNotEmpty()) {
                                item {
                                    Text(stringResource(R.string.services), fontWeight = FontWeight.Bold, modifier = Modifier.padding(16.dp, 12.dp, 16.dp, 8.dp), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                                }
                                items(filteredServices) { service ->
                                    val translatedService = getTranslatedCategoryText(service)
                                    SuggestionRow(translatedService) {
                                        isSearchScreenOpen = false
                                        query = ""
                                        onServiceSelect(service)
                                    }
                                }
                            }

                            if (filteredSpecs.isNotEmpty()) {
                                item {
                                    Text(stringResource(R.string.specialities), fontWeight = FontWeight.Bold, modifier = Modifier.padding(16.dp, 12.dp, 16.dp, 8.dp), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                                }
                                items(filteredSpecs) { spec ->
                                    val translatedSpec = getTranslatedCategoryText(spec)
                                    SuggestionRow(translatedSpec) {
                                        isSearchScreenOpen = false
                                        query = ""
                                        onSpecialitySelect(spec)
                                    }
                                }
                            }

                            if (filteredDocs.isNotEmpty()) {
                                item {
                                    Text(stringResource(R.string.doctors), fontWeight = FontWeight.Bold, modifier = Modifier.padding(16.dp, 12.dp, 16.dp, 8.dp), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                                }
                                items(filteredDocs) { doc ->
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable { 
                                                isSearchScreenOpen = false
                                                query = ""
                                                onDoctorSelect(doc)
                                            }
                                            .padding(16.dp, 12.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Icon(Icons.Filled.NorthEast, null, tint = MaterialTheme.colorScheme.outlineVariant, modifier = Modifier.size(18.dp))
                                        Spacer(modifier = Modifier.width(16.dp))
                                        Column {
                                            Text(doc.name, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                                            Text(doc.specialization, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
        Icon(Icons.Filled.NorthEast, null, tint = MaterialTheme.colorScheme.outlineVariant, modifier = Modifier.size(18.dp))
        Spacer(modifier = Modifier.width(16.dp))
        Text(text, fontSize = 14.sp, fontWeight = FontWeight.Medium)
    }
}
