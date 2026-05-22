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
import androidx.compose.ui.unit.dp
import androidx.compose.animation.with
import androidx.compose.animation.ExperimentalAnimationApi
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.example.swastik.R
import com.example.swastik.data.model.*
import com.example.swastik.ui.theme.*
import com.example.swastik.data.local.AppSettingsStore
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.*

@OptIn(ExperimentalAnimationApi::class)
@Composable
fun DashboardHeader(
    profile: PatientProfile?,
    unreadNotificationsCount: Int,
    onNotificationClick: () -> Unit = {},
    onProfileClick: () -> Unit = {},
    onLocationUpdate: (String) -> Unit = {},
    isHomeTab: Boolean = false,
    cartItemCount: Int = 0,
    onCartClick: (() -> Unit)? = null
) {
    var showLocationDialog by remember { mutableStateOf(false) }
    var locationInput by remember { mutableStateOf(profile?.location ?: "") }
    var showLanguageMenu by remember { mutableStateOf(false) }
    
    val appSettings by AppSettingsStore.settings.collectAsState()
    val selectedLanguage = appSettings.language

    if (isHomeTab) {
        // Redesigned Header for Home Tab (Matching Screenshot style but adding functional elements)
        val currentDate = remember {
            val date = LocalDate.now()
            val formatter = DateTimeFormatter.ofPattern("MMM dd, yyyy", Locale.ENGLISH)
            date.format(formatter).uppercase()
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.background)
                .padding(horizontal = 16.dp, vertical = 2.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                // Profile Picture
                Box(
                    modifier = Modifier
                        .size(36.dp)
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

                Column {
                    val firstName = profile?.name?.split(" ")?.firstOrNull() ?: "User"
                    Text(
                        text = "Hello $firstName! 👋",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.onBackground
                    )

                    // Location Picker
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .clickable { 
                                locationInput = profile?.location ?: ""
                                showLocationDialog = true 
                            }
                    ) {
                        Icon(
                            Icons.Outlined.LocationOn,
                            contentDescription = "Location",
                            modifier = Modifier.size(14.dp),
                            tint = SwastikPrimary
                        )
                        Spacer(modifier = Modifier.width(2.dp))
                        Text(
                            text = profile?.location?.ifEmpty { "Set Location" } ?: "Set Location",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Icon(
                            Icons.Default.ArrowDropDown,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            Row(verticalAlignment = Alignment.CenterVertically) {

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
                        .offset(x = (-4).dp, y = 4.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(16.dp)
                            .background(MaterialTheme.colorScheme.error, CircleShape),
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
                            label = "unreadCount"
                        ) { count ->
                            Text(
                                text = if (count > 9) "9+" else count.toString(),
                                color = MaterialTheme.colorScheme.onError,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
                }
            } // Close inner Row
        } // Close outer Row
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
                        tint = Color.LightGray
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = currentDate,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.LightGray
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
                                tint = Color.White,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = stringResource(com.example.swastik.util.LanguageConfig.labelResId(selectedLanguage)),
                                color = Color.White,
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
                                    Badge(containerColor = Color.Red, contentColor = Color.White) { 
                                        Text(cartItemCount.toString(), fontSize = 10.sp) 
                                    }
                                }
                            }
                        ) {
                            IconButton(onClick = onCartClick) {
                                Icon(
                                    Icons.Outlined.ShoppingCart,
                                    contentDescription = "Cart",
                                    tint = Color.White,
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
                                tint = Color.White,
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
                                        color = Color.White,
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
                        text = "Hello, $firstName! 👋",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color.White,
                        lineHeight = 28.sp
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
                            color = Color.LightGray
                        )
                        Icon(
                            Icons.Default.ArrowDropDown,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp),
                            tint = Color.LightGray
                        )
                    }
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
