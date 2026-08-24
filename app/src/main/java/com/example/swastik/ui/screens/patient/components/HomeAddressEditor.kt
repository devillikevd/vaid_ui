package com.example.swastik.ui.screens.patient.components

import android.Manifest
import android.location.Geocoder
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
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

data class SavedAddressItem(
    val id: String,
    val tag: String, // "Home", "Work", "Other"
    val fullAddress: String,
    val locality: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeAddressEditor(
    initialAddress: String,
    onAddressSaved: (String) -> Unit
) {
    var currentState by remember { mutableStateOf(AddressEditorState.List) }
    var selectedAddressText by remember(initialAddress) { mutableStateOf(initialAddress) }

    AnimatedContent(
        targetState = currentState,
        transitionSpec = {
            if (targetState == AddressEditorState.Form) {
                slideInHorizontally { width -> width } + fadeIn() togetherWith
                        slideOutHorizontally { width -> -width } + fadeOut()
            } else {
                slideInHorizontally { width -> -width } + fadeIn() togetherWith
                        slideOutHorizontally { width -> width } + fadeOut()
            }
        },
        label = "AddressEditorTransition"
    ) { state ->
        when (state) {
            AddressEditorState.List -> {
                AddressSelectionView(
                    selectedAddress = selectedAddressText,
                    onAddNewAddress = { currentState = AddressEditorState.Form },
                    onAddressSelected = { address ->
                        selectedAddressText = address
                        onAddressSaved(address)
                    }
                )
            }
            AddressEditorState.Form -> {
                AddressFormView(
                    initialAddress = initialAddress,
                    onBack = { currentState = AddressEditorState.List },
                    onAddressSaved = { address ->
                        selectedAddressText = address
                        onAddressSaved(address)
                        currentState = AddressEditorState.List
                    }
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddressSelectionView(
    selectedAddress: String,
    onAddNewAddress: () -> Unit,
    onAddressSelected: (String) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val locationHelper = remember { LocationHelper(context) }
    var isDetectingLocation by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }

    // Load dynamic saved addresses (or standard patient presets)
    val savedAddresses = remember {
        mutableStateListOf(
            SavedAddressItem(
                id = "addr_1",
                tag = "Home",
                fullAddress = "ca2, gali no. 2, Malviya Nagar, New Delhi",
                locality = "Malviya Nagar, New Delhi - 110017"
            ),
            SavedAddressItem(
                id = "addr_2",
                tag = "Work",
                fullAddress = "Capital Athena, Tower 9, Bisrakh Jalalpur, Greater Noida",
                locality = "Bisrakh Jalalpur - 201306"
            ),
            SavedAddressItem(
                id = "addr_3",
                tag = "Other",
                fullAddress = "Block E, Near Community Center, Malviya Nagar, New Delhi",
                locality = "South Delhi - 110017"
            )
        )
    }

    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions(),
        onResult = { permissions ->
            val granted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                    permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
            if (granted) {
                isDetectingLocation = true
                scope.launch {
                    val location = locationHelper.getLastLocation()
                    if (location != null) {
                        try {
                            val detectedAddress = withContext(Dispatchers.IO) {
                                val geocoder = Geocoder(context, Locale.getDefault())
                                val addresses = geocoder.getFromLocation(location.latitude, location.longitude, 1)
                                if (!addresses.isNullOrEmpty()) {
                                    val addr = addresses[0]
                                    buildString {
                                        addr.getAddressLine(0)?.let { append(it) }
                                    }
                                } else null
                            }
                            if (!detectedAddress.isNullOrBlank()) {
                                onAddressSelected(detectedAddress)
                                Toast.makeText(context, "Current location selected", Toast.LENGTH_SHORT).show()
                            } else {
                                Toast.makeText(context, "Could not reverse geocode address", Toast.LENGTH_SHORT).show()
                            }
                        } catch (e: Exception) {
                            Toast.makeText(context, "Location error: ${e.message}", Toast.LENGTH_SHORT).show()
                        }
                    } else {
                        Toast.makeText(context, "Could not determine GPS coordinates", Toast.LENGTH_SHORT).show()
                    }
                    isDetectingLocation = false
                }
            } else {
                Toast.makeText(context, "Location permission required for GPS autofill", Toast.LENGTH_SHORT).show()
            }
        }
    )

    val filteredAddresses = remember(searchQuery, savedAddresses) {
        if (searchQuery.isBlank()) savedAddresses
        else savedAddresses.filter {
            it.tag.contains(searchQuery, ignoreCase = true) ||
                    it.fullAddress.contains(searchQuery, ignoreCase = true) ||
                    it.locality.contains(searchQuery, ignoreCase = true)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp)
    ) {
        // Section Subtitle
        Text(
            text = "Select Delivery Address",
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground
        )
        Text(
            text = "Choose where to deliver your medicines & health items",
            fontSize = 13.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 2.dp, bottom = 16.dp)
        )

        // 1. One-Tap GPS Current Location Detection Card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .clickable {
                    if (!isDetectingLocation) {
                        locationPermissionLauncher.launch(
                            arrayOf(
                                Manifest.permission.ACCESS_FINE_LOCATION,
                                Manifest.permission.ACCESS_COARSE_LOCATION
                            )
                        )
                    }
                },
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(
                containerColor = SwastikPrimary.copy(alpha = 0.08f)
            ),
            border = BorderStroke(1.dp, SwastikPrimary.copy(alpha = 0.3f))
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(SwastikPrimary),
                    contentAlignment = Alignment.Center
                ) {
                    if (isDetectingLocation) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(22.dp),
                            color = Color.White,
                            strokeWidth = 2.5.dp
                        )
                    } else {
                        Icon(
                            Icons.Default.MyLocation,
                            contentDescription = "GPS",
                            tint = Color.White,
                            modifier = Modifier.size(22.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.width(14.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "Deliver to Current Location",
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                    Text(
                        text = if (isDetectingLocation) "Detecting precise GPS coordinates..." else "Using GPS • Tap to detect & deliver here",
                        fontSize = 12.sp,
                        color = if (isDetectingLocation) SwastikPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Icon(
                    Icons.Default.ChevronRight,
                    contentDescription = null,
                    tint = SwastikPrimary,
                    modifier = Modifier.size(20.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // 2. Action Row: Search & Add New Address
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Search Input
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Search address...", fontSize = 13.sp) },
                leadingIcon = {
                    Icon(
                        Icons.Default.Search,
                        contentDescription = "Search",
                        modifier = Modifier.size(18.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Icon(Icons.Default.Close, contentDescription = "Clear", modifier = Modifier.size(16.dp))
                        }
                    }
                },
                modifier = Modifier
                    .weight(1f)
                    .height(52.dp),
                shape = RoundedCornerShape(12.dp),
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = SwastikPrimary,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f)
                )
            )

            // Add New Button
            Button(
                onClick = onAddNewAddress,
                modifier = Modifier.height(52.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary),
                contentPadding = PaddingValues(horizontal = 14.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("Add New", fontWeight = FontWeight.Bold, fontSize = 13.sp)
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        // 3. Saved Addresses Section
        Text(
            text = "Saved Addresses",
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )

        Spacer(modifier = Modifier.height(10.dp))

        if (filteredAddresses.isEmpty()) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp),
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        Icons.Outlined.LocationOff,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(36.dp)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "No addresses match your search",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    TextButton(onClick = onAddNewAddress) {
                        Text("+ Add New Delivery Address", color = SwastikPrimary, fontWeight = FontWeight.Bold)
                    }
                }
            }
        } else {
            Column(
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                filteredAddresses.forEach { addressItem ->
                    val isSelected = selectedAddress.isNotBlank() &&
                            (selectedAddress.contains(addressItem.fullAddress, ignoreCase = true) ||
                                    addressItem.fullAddress.contains(selectedAddress, ignoreCase = true))

                    AddressCard(
                        item = addressItem,
                        isSelected = isSelected,
                        onSelect = { onAddressSelected(addressItem.fullAddress) }
                    )
                }
            }
        }
    }
}

@Composable
fun AddressCard(
    item: SavedAddressItem,
    isSelected: Boolean,
    onSelect: () -> Unit
) {
    val tagBgColor = when (item.tag.lowercase()) {
        "home" -> Color(0xFFDBEAFE)
        "work" -> Color(0xFFFFEDD5)
        else -> Color(0xFFF3E8FF)
    }
    val tagTextColor = when (item.tag.lowercase()) {
        "home" -> Color(0xFF1D4ED8)
        "work" -> Color(0xFFC2410C)
        else -> Color(0xFF7E22CE)
    }
    val tagIcon = when (item.tag.lowercase()) {
        "home" -> Icons.Outlined.Home
        "work" -> Icons.Outlined.WorkOutline
        else -> Icons.Outlined.LocationOn
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .clickable { onSelect() },
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) SwastikPrimary.copy(alpha = 0.06f) else MaterialTheme.colorScheme.surface
        ),
        border = BorderStroke(
            width = if (isSelected) 1.8.dp else 1.dp,
            color = if (isSelected) SwastikPrimary else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = if (isSelected) 2.dp else 0.5.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.Top
        ) {
            // Radio Indicator
            RadioButton(
                selected = isSelected,
                onClick = onSelect,
                colors = RadioButtonDefaults.colors(
                    selectedColor = SwastikPrimary,
                    unselectedColor = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                ),
                modifier = Modifier
                    .size(24.dp)
                    .offset(y = 2.dp)
            )

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Tag Badge
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = tagBgColor
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(tagIcon, contentDescription = null, tint = tagTextColor, modifier = Modifier.size(13.dp))
                            Text(item.tag, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = tagTextColor)
                        }
                    }

                    if (isSelected) {
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = SwastikPrimary
                        ) {
                            Text(
                                text = "Selected",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(6.dp))

                Text(
                    text = item.fullAddress,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface,
                    lineHeight = 19.sp
                )

                Spacer(modifier = Modifier.height(2.dp))

                Text(
                    text = item.locality,
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
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

    var selectedTag by remember { mutableStateOf("Home") }
    var flatNo by remember { mutableStateOf("") }
    var streetAddress by remember { mutableStateOf(initialAddress) }
    var landmark by remember { mutableStateOf("") }
    var city by remember { mutableStateOf("") }
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
                                        city = address.locality ?: address.subAdminArea ?: ""
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
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Form Top Row
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                IconButton(
                    onClick = onBack,
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = MaterialTheme.colorScheme.onSurface)
                }
                Column {
                    Text("Add Delivery Address", fontWeight = FontWeight.Bold, fontSize = 17.sp)
                    Text("Enter complete address for accurate delivery", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            // Tag Selection Chips
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf("Home" to Icons.Outlined.Home, "Work" to Icons.Outlined.WorkOutline, "Other" to Icons.Outlined.LocationOn).forEach { (tag, icon) ->
                    val isTagSelected = selectedTag == tag
                    FilterChip(
                        selected = isTagSelected,
                        onClick = { selectedTag = tag },
                        label = { Text(tag, fontWeight = if (isTagSelected) FontWeight.Bold else FontWeight.Normal) },
                        leadingIcon = { Icon(icon, contentDescription = null, modifier = Modifier.size(16.dp)) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = SwastikPrimary.copy(alpha = 0.15f),
                            selectedLabelColor = SwastikPrimary,
                            selectedLeadingIconColor = SwastikPrimary
                        )
                    )
                }
            }

            // GPS Autofill Action
            OutlinedButton(
                onClick = {
                    locationPermissionLauncher.launch(
                        arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
                    )
                },
                modifier = Modifier.fillMaxWidth().height(46.dp),
                shape = RoundedCornerShape(10.dp),
                border = BorderStroke(1.dp, SwastikPrimary.copy(alpha = 0.6f))
            ) {
                if (isFetchingLocation) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp, color = SwastikPrimary)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.fetching_location), fontSize = 13.sp, color = SwastikPrimary)
                } else {
                    Icon(Icons.Default.MyLocation, contentDescription = null, tint = SwastikPrimary, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Autofill with GPS Location", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = SwastikPrimary)
                }
            }

            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))

            OutlinedTextField(
                value = flatNo,
                onValueChange = { flatNo = it },
                label = { Text("House / Flat / Block No. *", fontSize = 13.sp) },
                placeholder = { Text("e.g. Flat 402, Building A", fontSize = 13.sp) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(10.dp),
                singleLine = true
            )

            OutlinedTextField(
                value = streetAddress,
                onValueChange = { streetAddress = it },
                label = { Text("Street Address / Area / Colony *", fontSize = 13.sp) },
                placeholder = { Text("e.g. Sector 62, Near Metro Station", fontSize = 13.sp) },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2,
                shape = RoundedCornerShape(10.dp)
            )

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = landmark,
                    onValueChange = { landmark = it },
                    label = { Text("Landmark (Optional)", fontSize = 13.sp) },
                    placeholder = { Text("e.g. Near Apollo Pharmacy", fontSize = 13.sp) },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(10.dp),
                    singleLine = true
                )

                OutlinedTextField(
                    value = pincode,
                    onValueChange = { pincode = it },
                    label = { Text("Pincode *", fontSize = 13.sp, maxLines = 1) },
                    placeholder = { Text("6 digits", fontSize = 13.sp) },
                    modifier = Modifier.weight(0.7f),
                    shape = RoundedCornerShape(10.dp),
                    singleLine = true
                )
            }

            Button(
                onClick = {
                    if (flatNo.isBlank() && streetAddress.isBlank()) {
                        Toast.makeText(context, "Please enter your address details", Toast.LENGTH_SHORT).show()
                        return@Button
                    }
                    val formattedAddress = buildString {
                        if (selectedTag.isNotBlank()) append("[$selectedTag] ")
                        if (flatNo.isNotBlank()) append("$flatNo, ")
                        if (streetAddress.isNotBlank()) append("$streetAddress, ")
                        if (landmark.isNotBlank()) append("Near $landmark, ")
                        if (city.isNotBlank()) append("$city, ")
                        if (pincode.isNotBlank()) append("Pincode: $pincode")
                    }.trimEnd(',', ' ')

                    onAddressSaved(formattedAddress)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary),
                shape = RoundedCornerShape(12.dp),
                enabled = flatNo.isNotBlank() || streetAddress.isNotBlank()
            ) {
                Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Save & Deliver Here", fontSize = 15.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}
