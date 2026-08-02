package com.example.swastik.ui.screens.patient.components

import android.Manifest
import android.location.Geocoder
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.R
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.utils.LocationHelper
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.Locale

enum class AddressEditorState {
    List, Form
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeAddressEditor(
    initialAddress: String,
    onAddressSaved: (String) -> Unit
) {
    var currentState by remember { mutableStateOf(AddressEditorState.List) }

    if (currentState == AddressEditorState.List) {
        AddressSelectionView(
            onAddNewAddress = { currentState = AddressEditorState.Form },
            onAddressSelected = { onAddressSaved(it) }
        )
    } else {
        AddressFormView(
            initialAddress = initialAddress,
            onBack = { currentState = AddressEditorState.List },
            onAddressSaved = { 
                onAddressSaved(it)
                currentState = AddressEditorState.List
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddressSelectionView(
    onAddNewAddress: () -> Unit,
    onAddressSelected: (String) -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.background)
            .padding(24.dp)
    ) {
        Text(
            text = "Where to?",
            fontSize = 28.sp,
            fontWeight = FontWeight.ExtraBold,
            color = MaterialTheme.colorScheme.onBackground,
            letterSpacing = (-0.5).sp
        )
        
        Spacer(modifier = Modifier.height(24.dp))

        // Premium Search Bar with Shadow
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
        ) {
            TextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Search location...", color = MaterialTheme.colorScheme.outline) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Search", tint = SwastikPrimary) },
                modifier = Modifier.fillMaxWidth(),
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = Color.Transparent,
                    unfocusedContainerColor = Color.Transparent,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent
                ),
                singleLine = true
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Prominent Current Location Banner
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { /* Implement current location fetch */ },
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = SwastikPrimary.copy(alpha = 0.1f)),
            elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(SwastikPrimary),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.MyLocation, contentDescription = null, tint = Color.White)
                }
                Spacer(modifier = Modifier.width(16.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text("Current Location", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = SwastikPrimary)
                    Text("Using GPS", fontSize = 13.sp, color = SwastikPrimary.copy(alpha = 0.7f))
                }
                Icon(Icons.Default.ChevronRight, contentDescription = null, tint = SwastikPrimary)
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
        
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Add New Address Button
            Button(
                onClick = onAddNewAddress,
                modifier = Modifier.weight(1f).height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp),
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(Icons.Default.AddLocation, contentDescription = null, tint = Color(0xFFFF6D00))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Add New", color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold)
            }
            
            // Request Address Button
            Button(
                onClick = { /* Handle request address */ },
                modifier = Modifier.weight(1f).height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp),
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(Icons.Outlined.ChatBubbleOutline, contentDescription = null, tint = Color(0xFF4CAF50))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Request", color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold)
            }
        }

        Spacer(modifier = Modifier.height(32.dp))

        Text(
            text = "Saved Locations",
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground
        )
        
        Spacer(modifier = Modifier.height(16.dp))

        PremiumAddressRow(
            icon = Icons.Outlined.Home,
            iconBgColor = Color(0xFFE3F2FD),
            iconTintColor = Color(0xFF1976D2),
            title = "Home",
            address = "ca2, gali no. 2, Malviya Nagar, New Delhi",
            onClick = { onAddressSelected("ca2, gali no. 2, Malviya Nagar, New Delhi") }
        )
        
        Divider(modifier = Modifier.padding(vertical = 12.dp, horizontal = 16.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
        
        PremiumAddressRow(
            icon = Icons.Outlined.WorkOutline,
            iconBgColor = Color(0xFFFFF3E0),
            iconTintColor = Color(0xFFF57C00),
            title = "Office",
            address = "Capital Athena, tower 9, Bisrakh Jalalpur",
            onClick = { onAddressSelected("Capital Athena, tower 9, Bisrakh Jalalpur") }
        )
        
        Divider(modifier = Modifier.padding(vertical = 12.dp, horizontal = 16.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
        
        PremiumAddressRow(
            icon = Icons.Outlined.History,
            iconBgColor = MaterialTheme.colorScheme.surfaceVariant,
            iconTintColor = MaterialTheme.colorScheme.onSurfaceVariant,
            title = "Recent: Block E",
            address = "Block E, Malviya Nagar, New Delhi",
            onClick = { onAddressSelected("Block E, Malviya Nagar, New Delhi") }
        )
    }
}

@Composable
fun PremiumAddressRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    iconBgColor: Color,
    iconTintColor: Color,
    title: String,
    address: String,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(iconBgColor),
            contentAlignment = Alignment.Center
        ) {
            Icon(imageVector = icon, contentDescription = null, tint = iconTintColor, modifier = Modifier.size(20.dp))
        }
        Spacer(modifier = Modifier.width(16.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onBackground
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = address,
                fontSize = 13.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
fun AddressFormView(
    initialAddress: String,
    onBack: () -> Unit,
    onAddressSaved: (String) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val locationHelper = remember { LocationHelper(context) }
    var isFetchingLocation by remember { mutableStateOf(false) }

    var flatNo by remember { mutableStateOf("") }
    var streetAddress by remember { mutableStateOf(initialAddress) }
    var landmark by remember { mutableStateOf("") }
    var pincode by remember { mutableStateOf("") }

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

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                }
                Text("Enter New Address", fontWeight = FontWeight.Bold, fontSize = 18.sp)
            }
            
            Button(
                onClick = {
                    locationPermissionLauncher.launch(
                        arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
                    )
                },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary.copy(alpha = 0.1f), contentColor = SwastikPrimary),
                shape = RoundedCornerShape(8.dp),
                elevation = null
            ) {
                if (isFetchingLocation) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = SwastikPrimary)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.fetching_location))
                } else {
                    Icon(Icons.Default.MyLocation, contentDescription = "Use Current Location")
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.use_current_location), fontWeight = FontWeight.Bold)
                }
            }

            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))

            OutlinedTextField(
                value = streetAddress,
                onValueChange = { streetAddress = it },
                label = { Text(stringResource(R.string.street_address_full_address)) },
                placeholder = { Text(stringResource(R.string.eg_123_main_st_sector)) },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2,
                shape = RoundedCornerShape(8.dp)
            )

            OutlinedTextField(
                value = flatNo,
                onValueChange = { flatNo = it },
                label = { Text(stringResource(R.string.house_no_flat_building_etc)) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp),
                singleLine = true
            )

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = landmark,
                    onValueChange = { landmark = it },
                    label = { Text(stringResource(R.string.landmark_optional)) },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(8.dp),
                    singleLine = true
                )

                OutlinedTextField(
                    value = pincode,
                    onValueChange = { pincode = it },
                    label = { Text(stringResource(R.string.pincode), maxLines = 1) },
                    modifier = Modifier.weight(0.7f),
                    shape = RoundedCornerShape(8.dp),
                    singleLine = true
                )
            }

            Button(
                onClick = {
                    val formattedAddress = buildString {
                        if (flatNo.isNotBlank()) append("$flatNo, ")
                        if (streetAddress.isNotBlank()) append("$streetAddress, ")
                        if (landmark.isNotBlank()) append("Near $landmark, ")
                        if (pincode.isNotBlank()) append("Pincode: $pincode")
                    }.trimEnd(',', ' ')
                    
                    onAddressSaved(formattedAddress)
                },
                modifier = Modifier.fillMaxWidth().defaultMinSize(minHeight = 48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text(stringResource(R.string.save_delivery_address), fontSize = 16.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}
