package com.example.swastik.ui.screens.patient.location

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.ui.input.pointer.pointerInput
import com.example.swastik.data.model.PatientProfile
import com.example.swastik.data.model.RecentSearch
import com.example.swastik.data.model.SavedAddress
import com.example.swastik.ui.theme.SwastikPrimary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LocationSelectionScreen(
    profile: PatientProfile?,
    onBackClick: () -> Unit,
    onLocationSelected: (String) -> Unit,
    onAddAddressClick: () -> Unit = {},
    onEditAddressClick: (SavedAddress) -> Unit = {},
    onDeleteAddressClick: (String) -> Unit = {}
) {
    var searchQuery by remember { mutableStateOf("") }
    val focusManager = LocalFocusManager.current
    val isDark = androidx.compose.foundation.isSystemInDarkTheme()
    val bgColor = MaterialTheme.colorScheme.background
    val cardColor = MaterialTheme.colorScheme.surface
    val textColorPrimary = MaterialTheme.colorScheme.onBackground
    val textColorSecondary = MaterialTheme.colorScheme.onSurfaceVariant

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Select Your Location", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = bgColor,
                    titleContentColor = textColorPrimary,
                    navigationIconContentColor = textColorPrimary
                )
            )
        },
        containerColor = bgColor,
        modifier = Modifier.pointerInput(Unit) {
            detectTapGestures(onTap = { focusManager.clearFocus() })
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            // Search Bar
            item {
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("Search an area or address", color = textColorSecondary) },
                    trailingIcon = { Icon(Icons.Default.Search, contentDescription = "Search", tint = textColorSecondary) },
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = cardColor,
                        unfocusedContainerColor = cardColor,
                        focusedBorderColor = SwastikPrimary,
                        unfocusedBorderColor = if (isDark) Color(0xFF333333) else Color(0xFFE0E0E0)
                    ),
                    singleLine = true
                )
            }

            // Top Action Cards
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    ActionCard(
                        icon = Icons.Default.MyLocation,
                        iconTint = Color(0xFFFF5722),
                        title = "Use Current Location",
                        modifier = Modifier.weight(1f),
                        cardColor = cardColor,
                        textColor = textColorPrimary,
                        onClick = { onLocationSelected("Current Location") }
                    )
                    ActionCard(
                        icon = Icons.Default.AddBox,
                        iconTint = Color(0xFFFF9800),
                        title = "Add New Address",
                        modifier = Modifier.weight(1f),
                        cardColor = cardColor,
                        textColor = textColorPrimary,
                        onClick = onAddAddressClick
                    )
                    ActionCard(
                        // using Chat icon as alternative to WhatsApp
                        icon = Icons.Default.Chat,
                        iconTint = Color(0xFF4CAF50),
                        title = "Request Address",
                        modifier = Modifier.weight(1f),
                        cardColor = cardColor,
                        textColor = textColorPrimary,
                        onClick = { /* Handle Request Address */ }
                    )
                }
            }

            // Saved Addresses Section
            if (profile?.savedAddresses?.isNotEmpty() == true) {
                item {
                    Text(
                        text = "SAVED ADDRESSES",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = textColorSecondary,
                        letterSpacing = 1.sp,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                }
                items(profile.savedAddresses) { address ->
                    SavedAddressCard(
                        address = address,
                        cardColor = cardColor,
                        textColorPrimary = textColorPrimary,
                        textColorSecondary = textColorSecondary,
                        onClick = { onLocationSelected("${address.label}: ${address.city}") },
                        onEditClick = { onEditAddressClick(address) },
                        onDeleteClick = { onDeleteAddressClick(address.id) }
                    )
                }
            }

            // Recently Searched Section
            if (profile?.recentSearches?.isNotEmpty() == true) {
                item {
                    Text(
                        text = "RECENTLY SEARCHED",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = textColorSecondary,
                        letterSpacing = 1.sp,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                }
                items(profile.recentSearches) { recent ->
                    RecentSearchCard(
                        recentSearch = recent,
                        cardColor = cardColor,
                        textColorPrimary = textColorPrimary,
                        textColorSecondary = textColorSecondary,
                        onClick = { onLocationSelected(recent.locationName) },
                        onEditClick = {
                            val tempAddress = com.example.swastik.data.model.SavedAddress(
                                id = "", 
                                label = recent.locationName, 
                                address = recent.address, 
                                city = "", pincode = ""
                            )
                            onEditAddressClick(tempAddress)
                        }
                    )
                }
            }
            
            item {
                Spacer(modifier = Modifier.height(20.dp))
            }
        }
    }
}

@Composable
fun ActionCard(
    icon: ImageVector,
    iconTint: Color,
    title: String,
    modifier: Modifier = Modifier,
    cardColor: Color,
    textColor: Color,
    onClick: () -> Unit
) {
    Surface(
        modifier = modifier
            .height(90.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        color = cardColor,
        border = androidx.compose.foundation.BorderStroke(1.dp, cardColor.copy(alpha = 0.5f)),
        shadowElevation = 2.dp
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.Start
        ) {
            Icon(icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(24.dp))
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = title,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                color = textColor,
                lineHeight = 16.sp
            )
        }
    }
}

@Composable
fun SavedAddressCard(
    address: SavedAddress,
    cardColor: Color,
    textColorPrimary: Color,
    textColorSecondary: Color,
    onClick: () -> Unit,
    onEditClick: () -> Unit,
    onDeleteClick: () -> Unit
) {
    var expanded by remember { mutableStateOf(false) }

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        color = cardColor,
        shadowElevation = 2.dp
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Icon section
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(textColorSecondary.copy(alpha = 0.1f))
                    .padding(8.dp)
            ) {
                Icon(Icons.Outlined.Home, contentDescription = null, tint = textColorPrimary, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.height(4.dp))
                Text("17.1 km", fontSize = 10.sp, color = textColorPrimary)
            }
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Text(text = address.label, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = textColorPrimary)
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "${address.address}, ${address.city}",
                    fontSize = 13.sp,
                    color = textColorSecondary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    lineHeight = 18.sp
                )
            }
            
            Box {
                IconButton(onClick = { expanded = true }) {
                    Icon(Icons.Default.MoreVert, contentDescription = "More", tint = textColorPrimary)
                }
                DropdownMenu(
                    expanded = expanded,
                    onDismissRequest = { expanded = false }
                ) {
                    DropdownMenuItem(
                        text = { Text("Edit") },
                        onClick = {
                            expanded = false
                            onEditClick()
                        }
                    )
                    DropdownMenuItem(
                        text = { Text("Delete", color = MaterialTheme.colorScheme.error) },
                        onClick = {
                            expanded = false
                            onDeleteClick()
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun RecentSearchCard(
    recentSearch: RecentSearch,
    cardColor: Color,
    textColorPrimary: Color,
    textColorSecondary: Color,
    onClick: () -> Unit,
    onEditClick: () -> Unit = {}
) {
    var expanded by remember { mutableStateOf(false) }

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        color = cardColor,
        shadowElevation = 2.dp
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Icon section
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(textColorSecondary.copy(alpha = 0.1f))
                    .padding(8.dp)
            ) {
                Icon(Icons.Outlined.History, contentDescription = null, tint = textColorPrimary, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.height(4.dp))
                Text(recentSearch.timeOrDistance, fontSize = 10.sp, color = textColorPrimary)
            }
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Text(text = recentSearch.locationName, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = textColorPrimary)
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = recentSearch.address,
                    fontSize = 13.sp,
                    color = textColorSecondary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    lineHeight = 18.sp
                )
            }
            
            Box {
                IconButton(onClick = { expanded = true }) {
                    Icon(Icons.Default.MoreVert, contentDescription = "More", tint = textColorPrimary)
                }
                DropdownMenu(
                    expanded = expanded,
                    onDismissRequest = { expanded = false }
                ) {
                    DropdownMenuItem(
                        text = { Text("Edit & Save") },
                        onClick = {
                            expanded = false
                            onEditClick()
                        }
                    )
                }
            }
        }
    }
}
