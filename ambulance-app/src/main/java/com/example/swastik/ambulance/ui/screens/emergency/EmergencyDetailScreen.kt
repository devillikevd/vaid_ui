package com.example.swastik.ambulance.ui.screens.emergency

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.ambulance.data.remote.dto.EmergencyDto
import com.example.swastik.ambulance.ui.components.OsmMapView
import com.example.swastik.ambulance.ui.components.MapMarkerData
import org.osmdroid.util.GeoPoint

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EmergencyDetailScreen(
    emergency: EmergencyDto?,
    isLoading: Boolean,
    onBack: () -> Unit,
    onUpdateStatus: (String) -> Unit
) {
    val context = LocalContext.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        emergency?.id?.take(8)?.uppercase() ?: "Emergency Detail",
                        fontWeight = FontWeight.Bold
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFFD32F2F),
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { padding ->
        if (isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Color(0xFFD32F2F))
            }
            return@Scaffold
        }

        if (emergency == null) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.Error, "Error", Modifier.size(64.dp), tint = Color.Gray)
                    Spacer(Modifier.height(16.dp))
                    Text("Emergency not found", color = Color.Gray)
                }
            }
            return@Scaffold
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Status Badge
            StatusBadge(emergency.status)

            // Emergency Info Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                elevation = CardDefaults.cardElevation(4.dp)
            ) {
                Column(Modifier.padding(20.dp)) {
                    Text("Emergency Information", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Spacer(Modifier.height(16.dp))

                    InfoRow(Icons.Default.Warning, "Type", emergency.emergencyType ?: "General")
                    InfoRow(Icons.Default.Flag, "Priority", emergency.priority ?: "Normal")
                    InfoRow(Icons.Default.Numbers, "Request #", emergency.id.take(8).uppercase())
                    InfoRow(Icons.Default.Schedule, "Created", formatTimestamp(emergency.createdAt))

                    if (!emergency.notes.isNullOrBlank()) {
                        Spacer(Modifier.height(12.dp))
                        Text("Description", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color.Gray)
                        Spacer(Modifier.height(4.dp))
                        Text(emergency.notes, fontSize = 14.sp)
                    }
                }
            }

            // Patient Info Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                elevation = CardDefaults.cardElevation(4.dp)
            ) {
                Column(Modifier.padding(20.dp)) {
                    Text("Patient Information", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Spacer(Modifier.height(16.dp))

                    InfoRow(Icons.Default.Person, "Name", emergency.patientName ?: "Unknown")

                    if (!emergency.patientPhone.isNullOrBlank()) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Phone, null, Modifier.size(20.dp), tint = Color.Gray)
                                Spacer(Modifier.width(12.dp))
                                Column {
                                    Text("Phone", fontSize = 12.sp, color = Color.Gray)
                                    Text(emergency.patientPhone, fontSize = 14.sp)
                                }
                            }
                            FilledTonalButton(
                                onClick = {
                                    val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:${emergency.patientPhone}"))
                                    context.startActivity(intent)
                                },
                                colors = ButtonDefaults.filledTonalButtonColors(
                                    containerColor = Color(0xFFE8F5E9)
                                )
                            ) {
                                Icon(Icons.Default.Call, null, Modifier.size(16.dp), tint = Color(0xFF2E7D32))
                                Spacer(Modifier.width(4.dp))
                                Text("Call", color = Color(0xFF2E7D32))
                            }
                        }
                    }
                }
            }

            // Location Card
            if (emergency.latitude != null && emergency.longitude != null) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    elevation = CardDefaults.cardElevation(4.dp)
                ) {
                    Column(Modifier.padding(20.dp)) {
                        Text("Location", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        Spacer(Modifier.height(12.dp))

                        // Embedded OSM map showing patient pickup location
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(180.dp),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            OsmMapView(
                                modifier = Modifier.fillMaxSize(),
                                center = GeoPoint(emergency.latitude!!, emergency.longitude!!),
                                zoom = 15.0,
                                markers = listOf(
                                    MapMarkerData(
                                        id = "patient",
                                        latitude = emergency.latitude!!,
                                        longitude = emergency.longitude!!,
                                        title = "Patient Pickup",
                                        snippet = emergency.address ?: "Pickup Location",
                                        markerColor = android.graphics.Color.parseColor("#D32F2F")
                                    )
                                )
                            )
                        }

                        Spacer(Modifier.height(12.dp))
                        InfoRow(Icons.Default.LocationOn, "Address", emergency.address ?: "Not provided")
                        InfoRow(Icons.Default.MyLocation, "Coordinates",
                            "${String.format(java.util.Locale.US, "%.5f", emergency.latitude)}, ${String.format(java.util.Locale.US, "%.5f", emergency.longitude)}")

                        Spacer(Modifier.height(12.dp))
                        Button(
                            onClick = {
                                // Use generic geo: intent — works with OsmAnd, Google Maps, any map app
                                val geoUri = Uri.parse("geo:${emergency.latitude},${emergency.longitude}?q=${emergency.latitude},${emergency.longitude}(${Uri.encode("Patient Pickup")})")
                                val geoIntent = Intent(Intent.ACTION_VIEW, geoUri)
                                try {
                                    if (geoIntent.resolveActivity(context.packageManager) != null) {
                                        context.startActivity(geoIntent)
                                    } else {
                                        // Fallback: OpenStreetMap in browser
                                        val browserUri = Uri.parse("https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=;${emergency.latitude},${emergency.longitude}#map=15/${emergency.latitude}/${emergency.longitude}")
                                        context.startActivity(Intent(Intent.ACTION_VIEW, browserUri))
                                    }
                                } catch (_: android.content.ActivityNotFoundException) {
                                    val browserUri = Uri.parse("https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=;${emergency.latitude},${emergency.longitude}")
                                    context.startActivity(Intent(Intent.ACTION_VIEW, browserUri))
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1976D2)),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Default.Navigation, null, Modifier.size(18.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Navigate to Pickup")
                        }
                    }
                }
            }

            // Status Action Buttons
            StatusActionButtons(
                currentStatus = emergency.status,
                onUpdateStatus = onUpdateStatus
            )

            Spacer(Modifier.height(16.dp))
        }
    }
}

@Composable
private fun StatusBadge(status: String) {
    val (bgColor, textColor, label) = when (status.lowercase()) {
        "pending", "requested" -> Triple(Color(0xFFFFF3E0), Color(0xFFE65100), "⏳ Pending")
        "broadcasting" -> Triple(Color(0xFFFFF8E1), Color(0xFFFF6F00), "📡 Broadcasting")
        "assigned" -> Triple(Color(0xFFE3F2FD), Color(0xFF1565C0), "📋 Assigned")
        "accepted" -> Triple(Color(0xFFE8EAF6), Color(0xFF283593), "✅ Accepted")
        "dispatched" -> Triple(Color(0xFFE3F2FD), Color(0xFF1565C0), "✅ Dispatched")
        "en_route", "enroute" -> Triple(Color(0xFFE8F5E9), Color(0xFF2E7D32), "🚑 En Route")
        "arrived" -> Triple(Color(0xFFF3E5F5), Color(0xFF7B1FA2), "📍 Arrived at Pickup")
        "picked_up" -> Triple(Color(0xFFFFEBEE), Color(0xFFC62828), "🏥 Patient Picked Up")
        "en_route_hospital" -> Triple(Color(0xFFE0F2F1), Color(0xFF00695C), "🏥 En Route to Hospital")
        "arrived_hospital" -> Triple(Color(0xFFE8F5E9), Color(0xFF1B5E20), "✅ Arrived at Hospital")
        "completed" -> Triple(Color(0xFFE0F2F1), Color(0xFF00695C), "✔ Completed")
        "cancelled" -> Triple(Color(0xFFFBE9E7), Color(0xFFBF360C), "✖ Cancelled")
        "timeout" -> Triple(Color(0xFFFFF3E0), Color(0xFFE65100), "⏰ Timed Out")
        "no_ambulance" -> Triple(Color(0xFFFFEBEE), Color(0xFFB71C1C), "⚠ No Ambulance Available")
        else -> Triple(Color(0xFFF5F5F5), Color.Gray, status)
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(bgColor)
            .padding(16.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(label, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = textColor)
    }
}

@Composable
private fun InfoRow(icon: ImageVector, label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, null, Modifier.size(20.dp), tint = Color.Gray)
        Spacer(Modifier.width(12.dp))
        Column {
            Text(label, fontSize = 12.sp, color = Color.Gray)
            Text(value, fontSize = 14.sp, fontWeight = FontWeight.Medium)
        }
    }
}

@Composable
private fun StatusActionButtons(
    currentStatus: String,
    onUpdateStatus: (String) -> Unit
) {
    // Full dispatch lifecycle statuses
    val nextStatuses = when (currentStatus.lowercase()) {
        "pending", "broadcasting", "assigned", "requested" -> listOf("accept" to "Accept Emergency")
        "accepted" -> listOf("en_route" to "Start Route to Patient")
        "en_route", "enroute" -> listOf("arrived" to "Arrived at Pickup")
        "arrived" -> listOf("picked_up" to "Patient Picked Up")
        "picked_up" -> listOf("en_route_hospital" to "En Route to Hospital")
        "en_route_hospital" -> listOf("arrived_hospital" to "Arrived at Hospital")
        "arrived_hospital" -> listOf("completed" to "Complete Trip")
        else -> emptyList()
    }

    if (nextStatuses.isNotEmpty()) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            elevation = CardDefaults.cardElevation(4.dp)
        ) {
            Column(Modifier.padding(20.dp)) {
                Text("Actions", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                Spacer(Modifier.height(12.dp))

                nextStatuses.forEach { (status, label) ->
                    Button(
                        onClick = { onUpdateStatus(status) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFFD32F2F)
                        ),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(label, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                    }
                    Spacer(Modifier.height(8.dp))
                }
            }
        }
    }
}

private fun formatTimestamp(timestamp: String?): String {
    if (timestamp == null) return "—"
    return try {
        // Simple format: show date and time portion
        val parts = timestamp.split("T")
        if (parts.size >= 2) {
            "${parts[0]}  ${parts[1].take(5)}"
        } else {
            timestamp
        }
    } catch (e: Exception) {
        timestamp
    }
}
