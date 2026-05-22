package com.example.swastik.ui.screens.patient.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.R
import com.example.swastik.data.model.Doctor
import com.example.swastik.ui.theme.*

@Composable
fun EmergencySOSBanner(onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        elevation = CardDefaults.cardElevation(0.dp)
    ) {
        Row(
            modifier = Modifier
                .background(androidx.compose.ui.graphics.Brush.horizontalGradient(
                    colors = listOf(Color(0xFFFFF0F0), Color(0xFFFFE6E6))
                ))
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .background(Color(0xFFFFD6D6), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Filled.LocalHospital, null, tint = SwastikRed, modifier = Modifier.size(20.dp))
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    "Emergency / SOS",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = SwastikRed
                )
                Text(
                    "Tap to call ambulance or alert contacts",
                    fontSize = 12.sp,
                    color = Color.DarkGray
                )
            }
            Icon(Icons.Filled.ChevronRight, null, tint = SwastikRed)
        }
    }
}

@Composable
fun SwastikAIBanner(onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(
            modifier = Modifier
                .background(androidx.compose.ui.graphics.Brush.linearGradient(
                    colors = listOf(Color(0xFF00796B), Color(0xFF004D40))
                ))
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.SmartToy, null, tint = Color.White, modifier = Modifier.size(22.dp))
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Text("Vaididea AI Assistant", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color.White)
                    Text("Check symptoms, book doctors, ask anything.", fontSize = 11.sp, color = Color.White.copy(alpha = 0.8f))
                }
            }
            Spacer(modifier = Modifier.height(10.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(40.dp)
                    .background(Color.White, RoundedCornerShape(10.dp))
                    .padding(horizontal = 12.dp),
                contentAlignment = Alignment.CenterStart
            ) {
                Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Hi, how are you feeling today?", color = Color.Gray, fontSize = 13.sp)
                    Icon(Icons.Filled.Mic, null, tint = Color(0xFF00796B), modifier = Modifier.size(18.dp))
                }
            }
        }
    }
}

@Composable
fun PrimaryActionsGrid(
    onClinicClick: () -> Unit,
    onVideoClick: () -> Unit,
    onHealthCardClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .height(110.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Clinic Visit
        Card(
            modifier = Modifier.weight(1f).fillMaxHeight().clickable(onClick = onClinicClick),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(1.dp)
        ) {
            Column(modifier = Modifier.padding(12.dp).fillMaxSize(), verticalArrangement = Arrangement.SpaceBetween) {
                Row(verticalAlignment = Alignment.Top) {
                    Icon(Icons.Filled.EventNote, null, tint = SwastikPrimary, modifier = Modifier.size(24.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text("Clinic Visit", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color.Black)
                        Text("Find doctors near you", fontSize = 11.sp, color = Color.Gray)
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(modifier = Modifier.size(8.dp).background(SwastikPrimary, CircleShape))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Slots available today", fontSize = 10.sp, color = SwastikPrimary, fontWeight = FontWeight.Bold)
                }
            }
        }

        // Video Consult
        Card(
            modifier = Modifier.weight(1f).fillMaxHeight().clickable(onClick = onVideoClick),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(1.dp)
        ) {
            Column(modifier = Modifier.padding(12.dp).fillMaxSize(), verticalArrangement = Arrangement.SpaceBetween) {
                Row(verticalAlignment = Alignment.Top) {
                    Icon(Icons.Filled.Videocam, null, tint = SwastikGreen, modifier = Modifier.size(28.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text("Video Consult", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color.Black)
                        Text("Connect instantly online", fontSize = 11.sp, color = Color.Gray)
                    }
                }
                Text("Connect in 15 mins", fontSize = 10.sp, color = SwastikGreen, fontWeight = FontWeight.Bold)
            }
        }

        // Digital Health Card (Square)
        Card(
            modifier = Modifier.width(90.dp).fillMaxHeight().clickable(onClick = onHealthCardClick),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.Transparent),
            elevation = CardDefaults.cardElevation(2.dp)
        ) {
            Column(
                modifier = Modifier
                    .background(androidx.compose.ui.graphics.Brush.linearGradient(
                        colors = listOf(Color(0xFF00796B), Color(0xFF004D40))
                    ))
                    .padding(10.dp).fillMaxSize(),
                verticalArrangement = Arrangement.SpaceBetween,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(Icons.Filled.QrCode2, null, tint = Color.White, modifier = Modifier.size(36.dp))
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Digital Health Card", fontWeight = FontWeight.Bold, fontSize = 9.sp, color = Color.White, maxLines = 1, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                    Text("View vitals & QR", fontSize = 7.sp, color = Color.White.copy(alpha = 0.8f), maxLines = 1)
                }
            }
        }
    }
}

@Composable
fun SecondaryActionsGrid(
    onReportsClick: () -> Unit,
    onAppointmentsClick: () -> Unit,
    onCommunityQAClick: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Card(
            modifier = Modifier.weight(1f).clickable(onClick = onReportsClick),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = SwastikPrimaryLight),
            elevation = CardDefaults.cardElevation(0.dp)
        ) {
            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.Description, null, tint = SwastikPrimary, modifier = Modifier.size(24.dp))
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text("Reports", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color.Black)
                    Text("Medical History", fontSize = 11.sp, color = Color.Gray)
                }
            }
        }

        Card(
            modifier = Modifier.weight(1f).clickable(onClick = onAppointmentsClick),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = SwastikPrimaryLight),
            elevation = CardDefaults.cardElevation(0.dp)
        ) {
            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.Event, null, tint = SwastikPrimary, modifier = Modifier.size(24.dp))
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text("Appointments", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color.Black)
                    Text("Past & Upcoming", fontSize = 11.sp, color = Color.Gray)
                }
            }
        }
    }
    
    Spacer(modifier = Modifier.height(12.dp))
    
    // Community QA Action
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).clickable(onClick = onCommunityQAClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = SwastikPrimaryLight),
        elevation = CardDefaults.cardElevation(0.dp)
    ) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Filled.Forum, null, tint = SwastikPrimary, modifier = Modifier.size(24.dp))
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text("Community Q&A", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color.Black)
                Text("Ask doctors & view discussions", fontSize = 11.sp, color = Color.Gray)
            }
            Spacer(modifier = Modifier.weight(1f))
            Icon(Icons.Filled.ChevronRight, null, tint = SwastikPrimary)
        }
    }
}

@Composable
fun SpecialitySection(onSpecialityClick: (String) -> Unit) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Book Doctor by Speciality", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.Black)
            Text("See All", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = SwastikPrimary)
        }

        val specialities = listOf(
            Triple("General Physician", Icons.Filled.MedicalServices, Color(0xFFE8EAF6)),
            Triple("Women's Health", Icons.Filled.PregnantWoman, Color(0xFFFCE4EC)),
            Triple("Skin Specialist", Icons.Filled.Face, Color(0xFFFBE9E7)),
            Triple("Dentist", Icons.Filled.Mood, Color(0xFFE0F7FA)),
            Triple("Eye Specialist", Icons.Filled.Visibility, Color(0xFFE8EAF6)),
            Triple("Ear, Nose & Throat", Icons.Filled.Hearing, Color(0xFFF3E5F5))
        )

        LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            items(specialities) { spec ->
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(70.dp).clickable { onSpecialityClick(spec.first) }) {
                    Box(modifier = Modifier.size(60.dp).background(spec.third, CircleShape), contentAlignment = Alignment.Center) {
                        Icon(spec.second, null, tint = SwastikPrimary)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(spec.first, fontSize = 11.sp, color = Color.DarkGray, textAlign = androidx.compose.ui.text.style.TextAlign.Center, maxLines = 2)
                }
            }
        }
    }
}

@Composable
fun HealthcareServicesSection(
    onHospitalsClick: () -> Unit,
    onClinicsClick: () -> Unit,
    onPharmacyClick: () -> Unit,
    onDiagnosticsClick: () -> Unit
) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Healthcare Services", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.Black)
            Text("See All", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = SwastikPrimary)
        }

        val services = listOf(
            Triple("Hospitals", "Multi-speciality", Icons.Filled.LocalHospital),
            Triple("Clinics", "Primary Care", Icons.Filled.AddBox),
            Triple("Pharmacy", "Medicines", Icons.Filled.MedicalServices),
            Triple("Diagnostics", "Tests & Scans", Icons.Filled.Science)
        )

        LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            items(services) { service ->
                Card(
                    modifier = Modifier.width(130.dp).clickable {
                        when(service.first) {
                            "Hospitals" -> onHospitalsClick()
                            "Clinics" -> onClinicsClick()
                            "Pharmacy" -> onPharmacyClick()
                            "Diagnostics" -> onDiagnosticsClick()
                        }
                    },
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(1.dp)
                ) {
                    Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(service.third, null, tint = SwastikPrimary, modifier = Modifier.size(24.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text(service.first, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color.Black)
                            Text(service.second, fontSize = 10.sp, color = Color.Gray)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun RecommendedDoctorsSection(
    doctors: List<Doctor>,
    onBookClick: (Doctor) -> Unit
) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Recommended for You", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.Black)
            Text("See All", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = SwastikPrimary)
        }

        LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            items(doctors) { doctor ->
                DoctorCard(doctor = doctor, onBookClick = { onBookClick(doctor) })
            }
        }
    }
}

@Composable
fun DoctorCard(doctor: Doctor, onBookClick: () -> Unit) {
    Card(
        modifier = Modifier.width(220.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Box {
                    Box(modifier = Modifier.size(50.dp).background(SwastikPrimaryLight, RoundedCornerShape(12.dp)), contentAlignment = Alignment.Center) {
                        Text("👨‍⚕️", fontSize = 24.sp)
                    }
                    Icon(Icons.Filled.Verified, null, tint = SwastikPrimary, modifier = Modifier.align(Alignment.BottomEnd).offset(4.dp, 4.dp).size(16.dp).background(Color.White, CircleShape))
                }
                Surface(color = Color(0xFFE8F5E9), shape = RoundedCornerShape(12.dp)) {
                    Text("Today", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = SwastikGreen, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(doctor.name, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color.Black)
            Text(doctor.specialization, fontSize = 13.sp, color = SwastikPrimary, fontWeight = FontWeight.Medium)
            Spacer(modifier = Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.Star, null, tint = Color(0xFFFFC107), modifier = Modifier.size(14.dp))
                Text(" ${doctor.averageRating ?: 0.0f} • ${doctor.experienceYears ?: 0} Yrs", fontSize = 12.sp, color = Color.Gray)
            }
            Spacer(modifier = Modifier.height(16.dp))
            Button(
                onClick = onBookClick,
                modifier = Modifier.fillMaxWidth().height(36.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = SwastikPrimary),
                border = androidx.compose.foundation.BorderStroke(1.dp, SwastikPrimary),
                shape = RoundedCornerShape(8.dp),
                contentPadding = PaddingValues(0.dp)
            ) {
                Text("Book", fontWeight = FontWeight.Bold)
            }
        }
    }
}
