package com.example.swastik.ui.screens.patient.components

import android.Manifest
import android.location.Geocoder
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.R
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.utils.LocationHelper
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.Locale

@Composable
fun SwiggyAddressEditor(
    initialAddress: String,
    onAddressSaved: (String) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    // It's tricky to inject LocationHelper into a non-Hilt ViewModel or without CompositionLocal, 
    // so we can instantiate it manually with context since it just wraps FusedLocationProviderClient
    val locationHelper = remember { LocationHelper(context) }

    var isFetchingLocation by remember { mutableStateOf(false) }

    // Form fields
    var flatNo by remember { mutableStateOf("") }
    var streetAddress by remember { mutableStateOf(initialAddress) }
    var landmark by remember { mutableStateOf("") }
    var pincode by remember { mutableStateOf("") }
    var selectedTag by remember { mutableStateOf("Home") }

    val tags = listOf("Home", "Work", "Other")

    // Location Permission Launcher
    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions(),
        onResult = { permissions ->
            val granted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                          permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
            if (granted) {
                isFetchingLocation = true
                scope.launch {
                    val location = locationHelper.getLastLocation()
                    if (location != null) {
                        try {
                            withContext(Dispatchers.IO) {
                                val geocoder = Geocoder(context, Locale.getDefault())
                                val addresses = geocoder.getFromLocation(location.latitude, location.longitude, 1)
                                if (!addresses.isNullOrEmpty()) {
                                    val address = addresses[0]
                                    withContext(Dispatchers.Main) {
                                        streetAddress = address.getAddressLine(0) ?: ""
                                        pincode = address.postalCode ?: ""
                                    }
                                }
                            }
                        } catch (e: Exception) {
                            withContext(Dispatchers.Main) {
                                Toast.makeText(context, "Could not fetch address: ${e.message}", Toast.LENGTH_SHORT).show()
                            }
                        }
                    } else {
                        Toast.makeText(context, "Could not get current location", Toast.LENGTH_SHORT).show()
                    }
                    isFetchingLocation = false
                }
            } else {
                Toast.makeText(context, "Location permission denied", Toast.LENGTH_SHORT).show()
            }
        }
    )

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(12.dp))
            .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(12.dp))
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // "Use Current Location" Button
        Button(
            onClick = {
                locationPermissionLauncher.launch(
                    arrayOf(
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                    )
                )
            },
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(
                containerColor = SwastikPrimary.copy(alpha = 0.1f),
                contentColor = SwastikPrimary
            ),
            shape = RoundedCornerShape(8.dp),
            elevation = null
        ) {
            if (isFetchingLocation) {
                CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = SwastikPrimary)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Fetching location...")
            } else {
                Icon(Icons.Default.MyLocation, contentDescription = "Use Current Location")
                Spacer(modifier = Modifier.width(8.dp))
                Text("Use Current Location", fontWeight = FontWeight.Bold)
            }
        }

        Divider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))

        // Street Address
        OutlinedTextField(
            value = streetAddress,
            onValueChange = { streetAddress = it },
            label = { Text("Street Address / Full Address") },
            placeholder = { Text("e.g. 123 Main St, Sector 4") },
            modifier = Modifier.fillMaxWidth(),
            minLines = 2,
            shape = RoundedCornerShape(8.dp)
        )

        // Flat / House No
        OutlinedTextField(
            value = flatNo,
            onValueChange = { flatNo = it },
            label = { Text("House No., Flat, Building, etc.") },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(8.dp),
            singleLine = true
        )

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedTextField(
                value = landmark,
                onValueChange = { landmark = it },
                label = { Text("Landmark (Optional)") },
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(8.dp),
                singleLine = true
            )

            OutlinedTextField(
                value = pincode,
                onValueChange = { pincode = it },
                label = { Text("Pincode") },
                modifier = Modifier.weight(0.7f),
                shape = RoundedCornerShape(8.dp),
                singleLine = true
            )
        }

        // Save As Tags
        Text("Save as", fontWeight = FontWeight.Medium, fontSize = 14.sp)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            tags.forEach { tag ->
                val isSelected = selectedTag == tag
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(16.dp))
                        .background(if (isSelected) SwastikPrimary else MaterialTheme.colorScheme.surfaceVariant)
                        .clickable { selectedTag = tag }
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    Text(
                        text = tag,
                        color = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 14.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                    )
                }
            }
        }

        // Apply Button
        Button(
            onClick = {
                val formattedAddress = buildString {
                    if (flatNo.isNotBlank()) append("$flatNo, ")
                    if (streetAddress.isNotBlank()) append("$streetAddress, ")
                    if (landmark.isNotBlank()) append("Near $landmark, ")
                    if (pincode.isNotBlank()) append("Pincode: $pincode")
                }.trimEnd(',', ' ')
                
                // Add the tag
                val finalAddress = "[$selectedTag] $formattedAddress"
                onAddressSaved(finalAddress)
            },
            modifier = Modifier.fillMaxWidth().height(48.dp),
            colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary),
            shape = RoundedCornerShape(12.dp)
        ) {
            Text("Save Delivery Address", fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
    }
}
