package com.example.swastik.ui.screens.patient.components

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.LocalHospital
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MedicalServices
import androidx.compose.material.icons.filled.NorthEast
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.outlined.Healing
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.focus.focusRequester
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
import androidx.compose.ui.res.stringResource
import com.example.swastik.R
import com.example.swastik.utils.SpecializationMapper
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
    
    val speechRecognizerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val data = result.data
            val matches = data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
            if (!matches.isNullOrEmpty()) {
                query = matches[0]
                isSearchScreenOpen = true
            }
        }
    }

    val homeServices = listOf(
        stringResource(R.string.search_term_hospitals),
        stringResource(R.string.search_term_clinics),
        stringResource(R.string.search_term_pharmacy),
        stringResource(R.string.search_term_diagnostics),
        stringResource(R.string.search_term_lab_tests),
        "Gyms",
        "Gym & Studios",
        "Fitness Centers",
        "Yoga Studios",
        "Wellness",
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

    val symptomsList = listOf(
        "Headache",
        "Migraine",
        "Fever",
        "Cold & Cough",
        "Stomach Pain",
        "Acidity & Gas",
        "Constipation",
        "Skin Rash & Itching",
        "Acne & Pimples",
        "Hair Fall & Dandruff",
        "Chest Pain & Palpitations",
        "Back Pain",
        "Knee & Joint Pain",
        "Ear Pain & Discharge",
        "Sinus & Nasal Blockage",
        "Throat Pain & Tonsils",
        "Eye Pain & Blurry Vision",
        "Toothache & Bleeding Gums",
        "Period Pain & PCOS",
        "Pregnancy Care",
        "Burning Urination & UTI",
        "Kidney Stone",
        "Asthma & Breathlessness",
        "Diabetes & High Sugar",
        "Anxiety & Depression",
        "Piles & Fissure"
    )

    val specialitiesList = listOf(
        stringResource(R.string.category_general_physician),
        stringResource(R.string.category_neurologist),
        stringResource(R.string.category_dermatologist),
        stringResource(R.string.category_gynecologist),
        stringResource(R.string.category_cardiologist),
        stringResource(R.string.category_orthopedist),
        stringResource(R.string.category_pediatrician),
        stringResource(R.string.category_ent_specialist),
        stringResource(R.string.category_dentist),
        stringResource(R.string.category_ophthalmologist),
        stringResource(R.string.category_gastroenterologist),
        stringResource(R.string.category_pulmonologist),
        stringResource(R.string.category_urologist),
        stringResource(R.string.category_nephrologist),
        stringResource(R.string.category_psychiatrist),
        stringResource(R.string.category_diabetologist),
        stringResource(R.string.category_endocrinologist),
        stringResource(R.string.category_cancer_specialist),
        stringResource(R.string.category_general_surgeon),
        stringResource(R.string.category_physiotherapist),
        stringResource(R.string.category_diet_nutrition),
        stringResource(R.string.category_ayurveda),
        stringResource(R.string.category_homeopathy),
        stringResource(R.string.category_sexologist)
    )

    val fallbackSuggestions = listOf(
        "Headache",
        "Fever",
        "Cold & Cough",
        stringResource(R.string.category_dermatologist),
        stringResource(R.string.category_neurologist),
        stringResource(R.string.category_gynecologist),
        stringResource(R.string.search_term_hospitals),
        stringResource(R.string.search_term_ambulance)
    )
    val suggestions = searchSuggestions.ifEmpty { fallbackSuggestions }

    val filteredSymptoms = if (query.isEmpty()) emptyList() else symptomsList.filter { 
        it.contains(query, ignoreCase = true) || SpecializationMapper.getSpecialistSubtitle(it).contains(query, ignoreCase = true)
    }
    val filteredServices = if (query.isEmpty()) emptyList() else homeServices.filter { it.contains(query, ignoreCase = true) }
    val filteredDocs = if (query.isEmpty()) emptyList() else doctors.filter { 
        it.name.contains(query, ignoreCase = true) || it.specialization.contains(query, ignoreCase = true) 
    }
    val filteredSpecs = if (query.isEmpty()) emptyList() else specialitiesList.filter { it.contains(query, ignoreCase = true) }

    val homeBgColor = if (MaterialTheme.colorScheme.surface.luminance() < 0.5f) {
        MaterialTheme.colorScheme.background
    } else {
        Color(0xFFF8FAFC)
    }

    // Read-only Search Bar on Home Screen
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
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = MaterialTheme.colorScheme.onSurface)
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
                                    val serviceMatch = homeServices.find { it.equals(trimmedQuery, ignoreCase = true) } 
                                        ?: homeServices.find { it.contains(trimmedQuery, ignoreCase = true) }
                                    if (serviceMatch != null) {
                                        isSearchScreenOpen = false
                                        query = ""
                                        onServiceSelect(serviceMatch)
                                    } else {
                                        val doctorMatch = doctors.find { it.name.contains(trimmedQuery, ignoreCase = true) }
                                        if (doctorMatch != null) {
                                            isSearchScreenOpen = false
                                            query = ""
                                            onDoctorSelect(doctorMatch)
                                        } else {
                                            isSearchScreenOpen = false
                                            query = ""
                                            onSpecialitySelect(trimmedQuery)
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
                
                // Recommendations & Live Search Results List
                LazyColumn(modifier = Modifier.fillMaxSize()) {
                    if (query.isEmpty()) {
                        item {
                            Text(
                                stringResource(R.string.suggested_for_you), 
                                fontWeight = FontWeight.Bold, 
                                modifier = Modifier.padding(16.dp, 12.dp, 16.dp, 8.dp), 
                                color = MaterialTheme.colorScheme.onSurfaceVariant, 
                                fontSize = 12.sp
                            )
                        }
                        items(suggestions) { item ->
                            val translatedItem = getTranslatedCategoryText(item)
                            val subtitle = SpecializationMapper.getSpecialistSubtitle(item)
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        isSearchScreenOpen = false
                                        query = ""
                                        if (homeServices.contains(item)) onServiceSelect(item) else onSpecialitySelect(item)
                                    }
                                    .padding(horizontal = 16.dp, vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Filled.NorthEast, null, tint = MaterialTheme.colorScheme.outlineVariant, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(14.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(translatedItem, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                                    if (subtitle != "Specialist Consultation") {
                                        Text(subtitle, fontSize = 11.5.sp, color = MaterialTheme.colorScheme.primary)
                                    }
                                }
                            }
                        }
                    } else {
                        // 1. Symptoms & Clinical Concerns
                        if (filteredSymptoms.isNotEmpty()) {
                            item {
                                Text(
                                    "Symptoms & Health Concerns", 
                                    fontWeight = FontWeight.Bold, 
                                    modifier = Modifier.padding(16.dp, 12.dp, 16.dp, 6.dp), 
                                    color = MaterialTheme.colorScheme.primary, 
                                    fontSize = 12.sp
                                )
                            }
                            items(filteredSymptoms) { symptom ->
                                val subtitle = SpecializationMapper.getSpecialistSubtitle(symptom)
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            isSearchScreenOpen = false
                                            query = ""
                                            onSpecialitySelect(symptom)
                                        }
                                        .padding(horizontal = 16.dp, vertical = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(32.dp)
                                            .clip(CircleShape)
                                            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.10f)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(Icons.Outlined.Healing, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(symptom, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
                                        Text(subtitle, fontSize = 11.5.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Medium)
                                    }
                                    Icon(Icons.Filled.NorthEast, null, tint = MaterialTheme.colorScheme.outlineVariant, modifier = Modifier.size(16.dp))
                                }
                            }
                        }

                        // 2. Medical Specialities
                        if (filteredSpecs.isNotEmpty()) {
                            item {
                                Text(
                                    stringResource(R.string.specialities), 
                                    fontWeight = FontWeight.Bold, 
                                    modifier = Modifier.padding(16.dp, 12.dp, 16.dp, 6.dp), 
                                    color = MaterialTheme.colorScheme.onSurfaceVariant, 
                                    fontSize = 12.sp
                                )
                            }
                            items(filteredSpecs) { spec ->
                                val translatedSpec = getTranslatedCategoryText(spec)
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            isSearchScreenOpen = false
                                            query = ""
                                            onSpecialitySelect(spec)
                                        }
                                        .padding(horizontal = 16.dp, vertical = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(32.dp)
                                            .clip(CircleShape)
                                            .background(Color(0xFF00695C).copy(alpha = 0.10f)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(Icons.Filled.MedicalServices, null, tint = Color(0xFF00695C), modifier = Modifier.size(16.dp))
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Text(translatedSpec, fontSize = 14.sp, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
                                    Icon(Icons.Filled.NorthEast, null, tint = MaterialTheme.colorScheme.outlineVariant, modifier = Modifier.size(16.dp))
                                }
                            }
                        }

                        // 3. Doctors List
                        if (filteredDocs.isNotEmpty()) {
                            item {
                                Text(
                                    stringResource(R.string.doctors), 
                                    fontWeight = FontWeight.Bold, 
                                    modifier = Modifier.padding(16.dp, 12.dp, 16.dp, 6.dp), 
                                    color = MaterialTheme.colorScheme.onSurfaceVariant, 
                                    fontSize = 12.sp
                                )
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
                                        .padding(horizontal = 16.dp, vertical = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(36.dp)
                                            .clip(CircleShape)
                                            .background(MaterialTheme.colorScheme.surfaceVariant),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(Icons.Default.Person, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(doc.name, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                                        Text(doc.specialization, fontSize = 12.sp, color = MaterialTheme.colorScheme.primary)
                                    }
                                    Icon(Icons.Filled.NorthEast, null, tint = MaterialTheme.colorScheme.outlineVariant, modifier = Modifier.size(16.dp))
                                }
                            }
                        }

                        // 4. Health Services
                        if (filteredServices.isNotEmpty()) {
                            item {
                                Text(
                                    stringResource(R.string.services), 
                                    fontWeight = FontWeight.Bold, 
                                    modifier = Modifier.padding(16.dp, 12.dp, 16.dp, 6.dp), 
                                    color = MaterialTheme.colorScheme.onSurfaceVariant, 
                                    fontSize = 12.sp
                                )
                            }
                            items(filteredServices) { service ->
                                val translatedService = getTranslatedCategoryText(service)
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            isSearchScreenOpen = false
                                            query = ""
                                            onServiceSelect(service)
                                        }
                                        .padding(horizontal = 16.dp, vertical = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(32.dp)
                                            .clip(CircleShape)
                                            .background(Color(0xFF1565C0).copy(alpha = 0.10f)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(Icons.Default.LocalHospital, null, tint = Color(0xFF1565C0), modifier = Modifier.size(16.dp))
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Text(translatedService, fontSize = 14.sp, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
                                    Icon(Icons.Filled.NorthEast, null, tint = MaterialTheme.colorScheme.outlineVariant, modifier = Modifier.size(16.dp))
                                }
                            }
                        }

                        // No results fallback
                        if (filteredSymptoms.isEmpty() && filteredSpecs.isEmpty() && filteredDocs.isEmpty() && filteredServices.isEmpty()) {
                            item {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(32.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Icon(Icons.Filled.Search, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(44.dp))
                                    Spacer(modifier = Modifier.height(10.dp))
                                    Text(
                                        "Search \"$query\" with our clinical network",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        "Tap below to consult the right specialist for this condition.",
                                        fontSize = 12.sp,
                                        color = Color(0xFF64748B),
                                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                    )
                                    Spacer(modifier = Modifier.height(14.dp))
                                    Button(
                                        onClick = {
                                            isSearchScreenOpen = false
                                            val q = query.trim()
                                            query = ""
                                            onSpecialitySelect(q)
                                        },
                                        shape = RoundedCornerShape(10.dp)
                                    ) {
                                        Text("Find Specialist for \"$query\"")
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
