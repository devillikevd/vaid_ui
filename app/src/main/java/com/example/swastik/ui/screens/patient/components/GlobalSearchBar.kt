package com.example.swastik.ui.screens.patient.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.data.model.Doctor

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GlobalSearchBar(
    doctors: List<Doctor>,
    onDoctorSelect: (Doctor) -> Unit,
    onSpecialitySelect: (String) -> Unit
) {
    var query by remember { mutableStateOf("") }
    
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .background(Color.Transparent)
    ) {
        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            placeholder = { Text("Search Specialists & Conditions", color = Color.Gray, fontSize = 14.sp) },
            leadingIcon = {
                Icon(Icons.Filled.Search, contentDescription = "Search", tint = Color.Gray)
            },
            trailingIcon = {
                IconButton(onClick = { /* TODO: Voice Search Integration */ }) {
                    Icon(Icons.Filled.Mic, contentDescription = "Voice Search", tint = Color.Gray)
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            shape = RoundedCornerShape(24.dp),
            colors = TextFieldDefaults.outlinedTextFieldColors(
                containerColor = Color.White,
                unfocusedBorderColor = Color.Transparent,
                focusedBorderColor = Color.Transparent
            )
        )
        
        if (query.isNotEmpty()) {
            val specialities = listOf("General Physician", "Women's Health", "Skin Specialist", "Dentist", "Eye Specialist", "Ear, Nose & Throat")
            val filteredDocs = doctors.filter { it.name.contains(query, ignoreCase = true) || it.specialization.contains(query, ignoreCase = true) }
            val filteredSpecs = specialities.filter { it.contains(query, ignoreCase = true) }
            
            if (filteredDocs.isNotEmpty() || filteredSpecs.isNotEmpty()) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(4.dp)
                ) {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 250.dp)
                    ) {
                        if (filteredSpecs.isNotEmpty()) {
                            item {
                                Text("Specialities", fontWeight = androidx.compose.ui.text.font.FontWeight.Bold, modifier = Modifier.padding(12.dp), color = Color.Gray, fontSize = 12.sp)
                            }
                            items(filteredSpecs) { spec ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable { onSpecialitySelect(spec); query = "" }
                                        .padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(Icons.Filled.Search, null, tint = Color.LightGray, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Text(spec, fontSize = 14.sp)
                                }
                            }
                        }
                        
                        if (filteredDocs.isNotEmpty()) {
                            item {
                                Text("Doctors", fontWeight = androidx.compose.ui.text.font.FontWeight.Bold, modifier = Modifier.padding(12.dp), color = Color.Gray, fontSize = 12.sp)
                            }
                            items(filteredDocs) { doc ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable { onDoctorSelect(doc); query = "" }
                                        .padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(Icons.Filled.Search, null, tint = Color.LightGray, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column {
                                        Text(doc.name, fontSize = 14.sp)
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
