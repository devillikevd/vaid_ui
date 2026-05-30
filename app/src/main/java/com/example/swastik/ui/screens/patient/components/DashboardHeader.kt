package com.example.swastik.ui.screens.patient.components

import android.Manifest
import android.content.pm.PackageManager
import android.location.Geocoder
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.MyLocation
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.ShoppingCart
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.animation.with
import androidx.compose.animation.ExperimentalAnimationApi
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.example.swastik.R
import com.example.swastik.data.model.*
import com.example.swastik.ui.theme.*
import com.example.swastik.data.local.AppSettingsStore
import com.google.android.gms.location.LocationServices
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.*
import androidx.compose.material3.MaterialTheme

@OptIn(ExperimentalAnimationApi::class)
@Composable
fun DashboardHeader(
    profile: PatientProfile?,
    unreadNotificationsCount: Int,
    onNotificationClick: () -> Unit = {},
    onProfileClick: () -> Unit = {},
    onLocationUpdate: (String) -> Unit = {},
    onAddAddressClick: () -> Unit = {},
    isHomeTab: Boolean = false,
    cartItemCount: Int = 0,
    onCartClick: (() -> Unit)? = null
) {
    var showLocationDialog by remember { mutableStateOf(false) }
    var locationInput by remember { mutableStateOf(profile?.location ?: "") }
    var isFetchingLocation by remember { mutableStateOf(false) }
    var showLanguageMenu by remember { mutableStateOf(false) }
    
    val context = LocalContext.current
    val fusedLocationClient = remember { LocationServices.getFusedLocationProviderClient(context) }

    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val fineLocationGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] ?: false
        val coarseLocationGranted = permissions[Manifest.permission.ACCESS_COARSE_LOCATION] ?: false
        
        if (fineLocationGranted || coarseLocationGranted) {
            isFetchingLocation = true
            try {
                fusedLocationClient.lastLocation.addOnSuccessListener { location ->
                    if (location != null) {
                        try {
                            val geocoder = Geocoder(context, Locale.getDefault())
                            val addressesList = geocoder.getFromLocation(location.latitude, location.longitude, 1)
                            if (!addressesList.isNullOrEmpty()) {
                                val fetchedAddress = addressesList[0]
                                val subLocality = fetchedAddress.subLocality
                                val locality = fetchedAddress.locality
                                val parts = listOfNotNull(subLocality, locality).filter { it.isNotBlank() }
                                if (parts.isNotEmpty()) {
                                    locationInput = parts.joinToString(", ")
                                } else {
                                    locationInput = fetchedAddress.locality ?: fetchedAddress.adminArea ?: ""
                                }
                            }
                        } catch (e: Exception) {}
                    }
                    isFetchingLocation = false
                }.addOnFailureListener {
                    isFetchingLocation = false
                }
            } catch (e: SecurityException) {
                isFetchingLocation = false
            }
        }
    }

    val fetchLocation: () -> Unit = {
        val fineGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val coarseGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        
        if (fineGranted || coarseGranted) {
            isFetchingLocation = true
            try {
                fusedLocationClient.lastLocation.addOnSuccessListener { location ->
                    if (location != null) {
                        try {
                            val geocoder = Geocoder(context, Locale.getDefault())
                            val addressesList = geocoder.getFromLocation(location.latitude, location.longitude, 1)
                            if (!addressesList.isNullOrEmpty()) {
                                val fetchedAddress = addressesList[0]
                                val subLocality = fetchedAddress.subLocality
                                val locality = fetchedAddress.locality
                                val parts = listOfNotNull(subLocality, locality).filter { it.isNotBlank() }
                                if (parts.isNotEmpty()) {
                                    locationInput = parts.joinToString(", ")
                                } else {
                                    locationInput = fetchedAddress.locality ?: fetchedAddress.adminArea ?: ""
                                }
                            }
                        } catch (e: Exception) {}
                    }
                    isFetchingLocation = false
                }.addOnFailureListener {
                    isFetchingLocation = false
                }
            } catch (e: SecurityException) {
                isFetchingLocation = false
            }
        } else {
            locationPermissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
        }
    }

    // Auto-fetch location when dialog opens
    LaunchedEffect(showLocationDialog) {
        if (showLocationDialog) {
            fetchLocation()
        }
    }
    
    val appSettings by AppSettingsStore.settings.collectAsState()
    val selectedLanguage = appSettings.language

    fun getGreeting(): String {
        val calendar = Calendar.getInstance()
        return when (calendar.get(Calendar.HOUR_OF_DAY)) {
            in 0..11 -> "Good Morning"
            in 12..16 -> "Good Afternoon"
            in 17..20 -> "Good Evening"
            else -> "Good Night"
        }
    }

    if (isHomeTab) {
        // Redesigned Header for Home Tab (Matching Screenshot style but adding functional elements)
        val currentDate = remember {
            val date = LocalDate.now()
            val formatter = DateTimeFormatter.ofPattern("MMM dd, yyyy", Locale.ENGLISH)
            date.format(formatter).uppercase()
        }

        val homeBgColor = if (isSystemInDarkTheme()) {
            MaterialTheme.colorScheme.background
        } else {
            Color(0xFFF4FBF9)
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(homeBgColor)
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                modifier = Modifier.weight(1f),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Profile Picture
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                        .clickable { onProfileClick() },
                    contentAlignment = Alignment.Center
                ) {
                    if (profile?.profileImageUrl?.isNotEmpty() == true) {
                        AsyncImage(
                            model = ImageRequest.Builder(LocalContext.current)
                                .data(profile.profileImageUrl)
                                .crossfade(true)
                                .build(),
                            contentDescription = "Profile",
                            modifier = Modifier.fillMaxSize().clip(CircleShape),
                            contentScale = ContentScale.Crop
                        )
                    } else {
                        Text(
                            profile?.initials?.ifEmpty { "👤" } ?: "👤",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = SwastikPrimary
                        )
                    }
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    val firstName = profile?.name?.split(" ")?.firstOrNull() ?: "User"
                    Text(
                        text = firstName,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onBackground,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    // Location Picker
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { 
                                locationInput = profile?.location ?: ""
                                showLocationDialog = true 
                            }
                    ) {
                        Icon(
                            Icons.Outlined.LocationOn,
                            contentDescription = "Location",
                            modifier = Modifier.size(12.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.width(2.dp))
                        Text(
                            text = profile?.location?.ifEmpty { "Set Location" } ?: "Set Location",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f, fill = false)
                        )
                        Icon(
                            Icons.Default.ArrowDropDown,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            // Notification Bell
            Box {
                IconButton(onClick = onNotificationClick) {
                    Icon(
                        Icons.Outlined.Notifications,
                        contentDescription = "Notifications",
                        tint = MaterialTheme.colorScheme.onBackground,
                        modifier = Modifier.size(24.dp)
                    )
                }
                androidx.compose.animation.AnimatedVisibility(
                    visible = unreadNotificationsCount > 0,
                    enter = androidx.compose.animation.scaleIn() + androidx.compose.animation.fadeIn(),
                    exit = androidx.compose.animation.scaleOut() + androidx.compose.animation.fadeOut(),
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .offset(x = (-6).dp, y = 6.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .background(Color.Red, CircleShape)
                            .border(1.5.dp, Color.White, CircleShape)
                    )
                }
            }
        }
// Close outer Row
    } else {
        // Standard Header for other tabs (Includes Language & Notifications)
        val currentDate = remember {
            val date = LocalDate.now()
            val formatter = DateTimeFormatter.ofPattern("MMM dd, yyyy", Locale.ENGLISH)
            date.format(formatter).uppercase()
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color(0xFF1A1A2E).copy(alpha = 0.95f),
                            Color(0xFF1A1A2E).copy(alpha = 0.8f),
                            Color.Transparent
                        )
                    )
                )
                .statusBarsPadding()
                .padding(horizontal = 20.dp, vertical = 14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.DateRange,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = MaterialTheme.colorScheme.outlineVariant
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = currentDate,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.outlineVariant
                    )
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    // Language Option
                    Box {
                        Row(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .clickable { showLanguageMenu = true }
                                .padding(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.Language,
                                contentDescription = "Language",
                                tint = MaterialTheme.colorScheme.onPrimary,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = stringResource(com.example.swastik.util.LanguageConfig.labelResId(selectedLanguage)),
                                color = MaterialTheme.colorScheme.onPrimary,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                        DropdownMenu(
                            expanded = showLanguageMenu,
                            onDismissRequest = { showLanguageMenu = false }
                        ) {
                            com.example.swastik.util.LanguageConfig.options.forEach { lang ->
                                DropdownMenuItem(
                                    text = { Text(stringResource(lang.labelResId)) },
                                    onClick = {
                                        AppSettingsStore.updateLanguage(lang.tag)
                                        showLanguageMenu = false
                                    },
                                    leadingIcon = if (lang.tag == selectedLanguage) {
                                        { Icon(Icons.Default.Check, contentDescription = null, tint = SwastikPrimary) }
                                    } else null
                                )
                            }
                        }
                    }

                    // Cart Icon (Optional)
                    if (onCartClick != null) {
                        BadgedBox(
                            badge = {
                                if (cartItemCount > 0) {
                                    Badge(containerColor = Color.Red, contentColor = MaterialTheme.colorScheme.onPrimary) { 
                                        Text(cartItemCount.toString(), fontSize = 10.sp) 
                                    }
                                }
                            }
                        ) {
                            IconButton(onClick = onCartClick) {
                                Icon(
                                    Icons.Outlined.ShoppingCart,
                                    contentDescription = "Cart",
                                    tint = MaterialTheme.colorScheme.onPrimary,
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                        }
                    }

                    // Notification Bell
                    Box {
                        IconButton(onClick = onNotificationClick) {
                            Icon(
                                Icons.Outlined.Notifications,
                                contentDescription = "Notifications",
                                tint = MaterialTheme.colorScheme.onPrimary,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                        androidx.compose.animation.AnimatedVisibility(
                            visible = unreadNotificationsCount > 0,
                            enter = androidx.compose.animation.scaleIn() + androidx.compose.animation.fadeIn(),
                            exit = androidx.compose.animation.scaleOut() + androidx.compose.animation.fadeOut(),
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .offset(x = (-4).dp, y = 4.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(16.dp)
                                    .background(Color.Red, CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                androidx.compose.animation.AnimatedContent(
                                    targetState = unreadNotificationsCount,
                                    transitionSpec = {
                                        if (targetState > initialState) {
                                            (androidx.compose.animation.slideInVertically { height -> height } + androidx.compose.animation.fadeIn()).with(androidx.compose.animation.slideOutVertically { height -> -height } + androidx.compose.animation.fadeOut())
                                        } else {
                                            (androidx.compose.animation.slideInVertically { height -> -height } + androidx.compose.animation.fadeIn()).with(androidx.compose.animation.slideOutVertically { height -> height } + androidx.compose.animation.fadeOut())
                                        }.using(androidx.compose.animation.SizeTransform(clip = false))
                                    },
                                    label = "unreadCount2"
                                ) { count ->
                                    Text(
                                        text = if (count > 9) "9+" else count.toString(),
                                        color = MaterialTheme.colorScheme.onPrimary,
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.primaryContainer)
                        .border(2.dp, Color.White.copy(alpha = 0.5f), CircleShape)
                        .clickable { onProfileClick() },
                    contentAlignment = Alignment.Center
                ) {
                    if (profile?.profileImageUrl?.isNotEmpty() == true) {
                        AsyncImage(
                            model = ImageRequest.Builder(LocalContext.current)
                                .data(profile.profileImageUrl)
                                .crossfade(true)
                                .build(),
                            contentDescription = "Profile",
                            modifier = Modifier.fillMaxSize().clip(CircleShape),
                            contentScale = ContentScale.Crop
                        )
                    } else {
                        Text(
                            profile?.initials?.ifEmpty { "👤" } ?: "👤",
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Bold,
                            color = SwastikPrimary
                        )
                    }
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column {
                    val firstName = profile?.name?.split(" ")?.firstOrNull() ?: "User"
                    Text(
                        text = firstName,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onPrimary,
                        lineHeight = 20.sp
                    )
                    
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .clickable { 
                                locationInput = profile?.location ?: ""
                                showLocationDialog = true 
                            }
                            .padding(vertical = 4.dp)
                    ) {
                        Icon(
                            Icons.Outlined.LocationOn,
                            contentDescription = "Location",
                            modifier = Modifier.size(16.dp),
                            tint = SwastikPrimary
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = profile?.location?.ifEmpty { "Set Location" } ?: "Set Location",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.outlineVariant
                        )
                        Icon(
                            Icons.Default.ArrowDropDown,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp),
                            tint = MaterialTheme.colorScheme.outlineVariant
                        )
                    }
                }
            }
        }
    }

    if (showLocationDialog) {
        AlertDialog(
            onDismissRequest = { showLocationDialog = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.LocationOn, null, tint = SwastikPrimary)
                    Spacer(Modifier.width(8.dp))
                    Text("Update Location")
                }
            },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Auto-fetching indicator
                    if (isFetchingLocation) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)
                        ) {
                            CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                            Spacer(Modifier.width(12.dp))
                            Text("Detecting current location...", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }

                    OutlinedTextField(
                        value = locationInput,
                        onValueChange = { locationInput = it },
                        label = { Text("Your Location") },
                        placeholder = { Text("e.g. Sonipat, Haryana") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        trailingIcon = {
                            if (!isFetchingLocation) {
                                IconButton(onClick = fetchLocation) {
                                    Icon(Icons.Outlined.MyLocation, null, tint = SwastikPrimary)
                                }
                            }
                        }
                    )

                    if (profile?.savedAddresses?.isNotEmpty() == true) {
                        Text(
                            "Saved Addresses",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = SwastikPrimary,
                            modifier = Modifier.padding(top = 8.dp)
                        )

                        profile.savedAddresses.forEach { saved ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        locationInput = "${saved.label}: ${saved.city}"
                                        onLocationUpdate(locationInput)
                                        showLocationDialog = false
                                    }
                                    .padding(vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.Home,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(12.dp))
                                Column {
                                    Text(saved.label, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                                    Text(saved.address, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                }
                            }
                        }
                    }

                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))

                    // Option to Add New Address (like in profile)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { 
                                showLocationDialog = false
                                onAddAddressClick() 
                            }
                            .padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(SwastikPrimary.copy(alpha = 0.1f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.AddHome, contentDescription = null, tint = SwastikPrimary, modifier = Modifier.size(20.dp))
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text("Add New Address", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                            Text("Save home, office etc.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Spacer(modifier = Modifier.weight(1f))
                        Icon(Icons.Default.ChevronRight, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        onLocationUpdate(locationInput)
                        showLocationDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary),
                    enabled = locationInput.isNotBlank() && !isFetchingLocation,
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Text("Update")
                }
            },
            dismissButton = {
                TextButton(onClick = { showLocationDialog = false }) {
                    Text("Cancel")
                }
            },
            shape = RoundedCornerShape(20.dp)
        )
    }
}
