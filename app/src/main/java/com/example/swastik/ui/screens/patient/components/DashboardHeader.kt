package com.example.swastik.ui.screens.patient.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.example.swastik.R
import com.example.swastik.data.model.*
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.ui.theme.SwastikPrimaryLight
import com.example.swastik.data.local.AppSettingsStore
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.*

@Composable
fun DashboardHeader(
    profile: PatientProfile?,
    unreadNotificationsCount: Int,
    onNotificationClick: () -> Unit = {},
    onProfileClick: () -> Unit = {},
    onLocationUpdate: (String) -> Unit = {}
) {
    var showLocationDialog by remember { mutableStateOf(false) }
    var locationInput by remember { mutableStateOf(profile?.location ?: "") }
    var showLanguageMenu by remember { mutableStateOf(false) }
    
    val appSettings by AppSettingsStore.settings.collectAsState()
    val selectedLanguage = appSettings.language

    val currentDate = remember {
        val date = LocalDate.now()
        val formatter = DateTimeFormatter.ofPattern("MMM dd, yyyy", Locale.ENGLISH)
        date.format(formatter).uppercase()
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 14.dp)
    ) {
        // Top Row: Date, Language and Notification
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
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = currentDate,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
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
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = stringResource(com.example.swastik.util.LanguageConfig.labelResId(selectedLanguage)),
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
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

                Box {
                    IconButton(onClick = onNotificationClick) {
                        Icon(
                            Icons.Outlined.Notifications,
                            contentDescription = "Notifications",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                    if (unreadNotificationsCount > 0) {
                        Box(
                            modifier = Modifier
                                .size(16.dp)
                                .background(Color.Red, CircleShape)
                                .align(Alignment.TopEnd)
                                .offset(x = (-4).dp, y = 4.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = if (unreadNotificationsCount > 9) "9+" else unreadNotificationsCount.toString(),
                                color = Color.White,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Main Row: Profile and Info
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(CircleShape)
                    .background(SwastikPrimaryLight)
                    .clickable { onProfileClick() },
                contentAlignment = Alignment.Center
            ) {
                if (profile?.profileImageUrl?.isNotEmpty() == true) {
                    AsyncImage(
                        model = ImageRequest.Builder(LocalContext.current)
                            .data(profile.profileImageUrl)
                            .crossfade(true)
                            .build(),
                        contentDescription = "Profile Photo",
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

            Spacer(modifier = Modifier.width(8.dp))

            Column {
                val firstName = profile?.name?.split(" ")?.firstOrNull() ?: "User"
                Text(
                    text = "Hello $firstName! 👋",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.onSurface,
                    lineHeight = 28.sp
                )
                Spacer(modifier = Modifier.height(2.dp))
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
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Icon(
                        Icons.Default.ArrowDropDown,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }

    if (showLocationDialog) {
        AlertDialog(
            onDismissRequest = { showLocationDialog = false },
            title = { Text("Update Location") },
            text = {
                OutlinedTextField(
                    value = locationInput,
                    onValueChange = { locationInput = it },
                    label = { Text("Your Location") },
                    placeholder = { Text("e.g. New York, USA") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        onLocationUpdate(locationInput)
                        showLocationDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
                ) {
                    Text("Update")
                }
            },
            dismissButton = {
                TextButton(onClick = { showLocationDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
fun SearchBar(onSearchClick: () -> Unit = {}) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
            .clickable { onSearchClick() }
    ) {
        OutlinedTextField(
            value = "",
            onValueChange = { },
            enabled = false,
            placeholder = {
                Text(stringResource(R.string.search_doctors_specialist), color = Color.Gray)
            },
            leadingIcon = {
                Icon(Icons.Filled.Search, contentDescription = null, tint = Color.Gray)
            },
            trailingIcon = {
                Icon(Icons.Filled.Mic, contentDescription = "Voice Search", tint = SwastikPrimary)
            },
            modifier = Modifier
                .fillMaxWidth()
                .shadow(
                    elevation = 8.dp,
                    shape = RoundedCornerShape(16.dp),
                    spotColor = SwastikPrimary.copy(alpha = 0.10f),
                    ambientColor = SwastikPrimary.copy(alpha = 0.06f)
                ),
            shape = RoundedCornerShape(16.dp),
            colors = OutlinedTextFieldDefaults.colors(
                disabledBorderColor = Color.Transparent,
                disabledContainerColor = MaterialTheme.colorScheme.surface,
                disabledTextColor = MaterialTheme.colorScheme.onSurface,
                disabledPlaceholderColor = MaterialTheme.colorScheme.onSurfaceVariant,
                disabledLeadingIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                disabledTrailingIconColor = SwastikPrimary
            ),
            singleLine = true
        )
    }
}
