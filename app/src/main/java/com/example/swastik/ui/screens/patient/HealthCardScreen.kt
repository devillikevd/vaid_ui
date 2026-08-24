package com.example.swastik.ui.screens.patient

import android.graphics.Bitmap
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.BorderStroke
import androidx.compose.material3.MaterialTheme
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.clickable
import androidx.compose.foundation.border
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.List
import androidx.compose.material.icons.outlined.Favorite
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.outlined.Sync
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.outlined.Event
import androidx.compose.material.icons.outlined.QrCodeScanner
import androidx.compose.material.icons.outlined.VerifiedUser
import androidx.compose.material.icons.outlined.Watch
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.R
import com.example.swastik.ui.screens.patient.components.BezierCurveChart
import com.example.swastik.ui.viewmodel.PatientDashboardViewModel
import com.example.swastik.ui.viewmodel.ProfileUpdateState
import com.example.swastik.ui.viewmodel.RecordsViewModel
import kotlinx.coroutines.launch
import androidx.activity.compose.rememberLauncherForActivityResult
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter

import androidx.compose.ui.graphics.PathEffect
import androidx.compose.foundation.Canvas
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Store
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.SyncAlt
import androidx.compose.material.icons.filled.Smartphone
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.filled.Lock
import com.example.swastik.ui.theme.HealthIdCardBg
import com.example.swastik.ui.theme.HealthIdCardBorder
import com.example.swastik.ui.theme.SwastikPrimary

private val HealthCardMainBg = Color(0xFFE3F2FD) // Light bluish background for main cards

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun HealthCardScreen(
    onNavigateBack: () -> Unit,
    onNavigateToGuardianDashboard: () -> Unit,
    onNavigateToHealthConnectDashboard: () -> Unit,
    onNavigateToDietTracker: () -> Unit,
    onNavigateToWellnessHub: () -> Unit,
    dashboardViewModel: PatientDashboardViewModel,
    recordsViewModel: RecordsViewModel
) {
    val isDark = MaterialTheme.colorScheme.surface.luminance() < 0.5f
    val healthCardMainBg = MaterialTheme.colorScheme.primaryContainer
    val hcState by dashboardViewModel.healthCardState.collectAsState()
    val syncState by dashboardViewModel.healthConnectSyncState.collectAsState()
    val guardianEnabled by dashboardViewModel.guardianEnabled.collectAsState(initial = false)
    val guardianSettings by dashboardViewModel.guardianSettings.collectAsState()
    val fitnessLog by dashboardViewModel.fitnessLog.collectAsState(initial = null)
    val recordsState by recordsViewModel.uiState.collectAsState()
    val vitalsData = recordsState.vitalsData

    val coroutineScope = rememberCoroutineScope()
    val context = androidx.compose.ui.platform.LocalContext.current
    
    var hasPermissions by remember { mutableStateOf(false) }
    var healthConnectStatus by remember { mutableIntStateOf(dashboardViewModel.healthConnectManager.checkAvailability()) }
    
    LaunchedEffect(healthConnectStatus) {
        if (healthConnectStatus == androidx.health.connect.client.HealthConnectClient.SDK_AVAILABLE) {
            hasPermissions = dashboardViewModel.healthConnectManager.hasAllPermissions()
        }
    }

    val permissionsLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
        contract = androidx.health.connect.client.PermissionController.createRequestPermissionResultContract()
    ) { granted ->
        if (granted.containsAll(dashboardViewModel.healthConnectManager.permissions)) {
            hasPermissions = true
            dashboardViewModel.syncHealthConnectData()
        } else {
            android.widget.Toast.makeText(context, "Permissions denied. Received: ${granted.size}", android.widget.Toast.LENGTH_SHORT).show()
        }
    }
    
    val guardianPermissionLauncher = rememberLauncherForActivityResult(
        contract = androidx.activity.result.contract.ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val locationGranted = permissions[android.Manifest.permission.ACCESS_FINE_LOCATION] == true || permissions[android.Manifest.permission.ACCESS_COARSE_LOCATION] == true
        val activityGranted = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) permissions[android.Manifest.permission.ACTIVITY_RECOGNITION] == true else true
        
        if (locationGranted && activityGranted) {
            dashboardViewModel.toggleGuardian(true)
        } else {
            android.widget.Toast.makeText(context, "Location and Activity Recognition permissions required for Guardian", android.widget.Toast.LENGTH_LONG).show()
        }
    }

    LaunchedEffect(Unit) {
        dashboardViewModel.checkHealthCardStatus()
    }

    val qrBitmap = remember(hcState.url) {
        val url = hcState.url ?: return@remember null
        try {
            val matrix = QRCodeWriter().encode(url, BarcodeFormat.QR_CODE, 512, 512)
            Bitmap.createBitmap(matrix.width, matrix.height, Bitmap.Config.RGB_565).apply {
                for (x in 0 until matrix.width) {
                    for (y in 0 until matrix.height) {
                        setPixel(x, y, if (matrix[x, y]) android.graphics.Color.BLACK else android.graphics.Color.WHITE)
                    }
                }
            }
        } catch (_: Exception) {
            null
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.health_identity)) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface,
                    navigationIconContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(MaterialTheme.colorScheme.background),
            contentPadding = PaddingValues(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {


            item {
                // QR Code Section
                Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(MaterialTheme.colorScheme.surface)
                            .padding(16.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.Top
                        ) {
                            Column(
                                modifier = Modifier.weight(1f).padding(end = 16.dp)
                            ) {
                                Text(
                                    stringResource(R.string.digital_health_card),
                                    fontSize = 22.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    lineHeight = 26.sp
                                )
                                val validityText = if (hcState.hasActiveCard && !hcState.expiresAt.isNullOrEmpty()) {
                                    try {
                                        val instant = java.time.Instant.parse(hcState.expiresAt)
                                        val zone = java.time.ZoneId.systemDefault()
                                        val localDateTime = instant.atZone(zone).toLocalDateTime()
                                        val formatter = java.time.format.DateTimeFormatter.ofPattern("d MMM, hh:mm a")
                                        "Valid until " + localDateTime.format(formatter)
                                    } catch (e: Exception) {
                                        "Valid for 24 hours"
                                    }
                                } else if (hcState.hasActiveCard) {
                                    "Valid for 24 hours"
                                } else {
                                    "Emergency Access QR • Valid 24 Hours"
                                }

                                Text(
                                    text = validityText,
                                    fontSize = 14.sp,
                                    fontWeight = if (hcState.hasActiveCard) FontWeight.Medium else FontWeight.Normal,
                                    color = if (hcState.hasActiveCard) SwastikPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.height(16.dp))

                                if (hcState.isLoading) {
                                    CircularProgressIndicator(modifier = Modifier.padding(32.dp))
                                } else if (hcState.hasActiveCard && hcState.url != null) {
                                    Column(
                                        modifier = Modifier
                                            .background(Color.White, RoundedCornerShape(8.dp))
                                            .padding(8.dp),
                                        horizontalAlignment = Alignment.CenterHorizontally
                                    ) {
                                        if (qrBitmap != null) {
                                            Image(
                                                bitmap = qrBitmap.asImageBitmap(),
                                                contentDescription = "QR Code",
                                                modifier = Modifier.size(120.dp),
                                                contentScale = ContentScale.Fit
                                            )
                                            val token = hcState.url?.substringAfterLast("/")
                                            if (!token.isNullOrEmpty()) {
                                                Spacer(modifier = Modifier.height(8.dp))
                                                Text(
                                                    text = "Link ID: $token",
                                                    fontSize = 16.sp,
                                                    fontWeight = FontWeight.ExtraBold,
                                                    letterSpacing = 2.sp,
                                                    color = Color.DarkGray
                                                )
                                                Text(
                                                    text = stringResource(R.string.share_this_id_for_manual),
                                                    fontSize = 10.sp,
                                                    color = Color.Gray
                                                )
                                            }
                                        } else {
                                            Icon(
                                                Icons.Outlined.QrCodeScanner,
                                                contentDescription = "QR Code unavailable",
                                                tint = MaterialTheme.colorScheme.outlineVariant,
                                                modifier = Modifier.size(80.dp)
                                            )
                                        }
                                    }
                                    Spacer(modifier = Modifier.height(16.dp))
                                    Button(
                                        onClick = { dashboardViewModel.revokeHealthCard() },
                                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                                    ) {
                                        Text(stringResource(R.string.revoke_access))
                                    }
                                } else {
                                    Button(
                                        onClick = { dashboardViewModel.generateHealthCard() },
                                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                                    ) {
                                        Text(stringResource(R.string.generate_qr_code))
                                    }
                                }
                                
                                if (hcState.error != null) {
                                    Text(
                                        hcState.error!!,
                                        color = MaterialTheme.colorScheme.error,
                                        fontSize = 14.sp,
                                        modifier = Modifier.padding(top = 16.dp)
                                    )
                                }
                            }

                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Icon(
                                    Icons.Filled.Person,
                                    contentDescription = "Profile",
                                    tint = MaterialTheme.colorScheme.onPrimary,
                                    modifier = Modifier
                                        .size(40.dp)
                                        .background(MaterialTheme.colorScheme.primary, CircleShape)
                                        .padding(8.dp)
                                )
                                Text(
                                    stringResource(R.string.patient_label),
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(top = 4.dp)
                                )
                            }
                        }
                    }

                    // Redesigned "How it works" section
                    HealthCardHowItWorks()
                }
            }
        }

            item {
                // Swastik Guardian Section
                com.example.swastik.ui.screens.patient.components.SwastikGuardianCard(
                    containerColor = healthCardMainBg,
                    isActive = guardianEnabled,
                    consentAccepted = guardianSettings.guardianConsentAccepted,
                    featurePreferences = guardianSettings.guardianFeatures,
                    onToggle = { enabled ->
                        if (enabled) {
                            val permissions = mutableListOf(android.Manifest.permission.ACCESS_FINE_LOCATION, android.Manifest.permission.ACCESS_COARSE_LOCATION)
                            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                                permissions.add(android.Manifest.permission.ACTIVITY_RECOGNITION)
                            }
                            guardianPermissionLauncher.launch(permissions.toTypedArray())
                        } else {
                            dashboardViewModel.toggleGuardian(false)
                        }
                    },
                    onConsentAccepted = { features ->
                        dashboardViewModel.acceptGuardianConsent(features)
                    },
                    onFeaturePreferencesChange = { features ->
                        dashboardViewModel.updateGuardianFeaturePreferences(features)
                        if (!features.hasAnyMonitoringFeature()) {
                            dashboardViewModel.toggleGuardian(false)
                        }
                    }
                )
            }

            item {
                OutlinedButton(
                    onClick = onNavigateToGuardianDashboard,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
                    shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.5f))
                ) {
                    androidx.compose.material3.Icon(
                        imageVector = androidx.compose.material.icons.Icons.Default.Settings,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.view_live_dashboard), fontWeight = androidx.compose.ui.text.font.FontWeight.Medium)
                }
            }

            item {
                // Health Connect Sync Section
                val lastSyncTime = guardianSettings.lastHealthSync
                
                // Helper to format last sync
                val lastSyncText = remember(lastSyncTime) {
                    if (lastSyncTime == null) "Never synced"
                    else {
                        try {
                            val instant = java.time.Instant.parse(lastSyncTime)
                            val now = java.time.Instant.now()
                            val diffMinutes = java.time.Duration.between(instant, now).toMinutes()
                            when {
                                diffMinutes < 1 -> "Just now"
                                diffMinutes < 60 -> "$diffMinutes mins ago"
                                diffMinutes < 1440 -> "${diffMinutes / 60} hours ago"
                                else -> "${diffMinutes / 1440} days ago"
                            }
                        } catch (_: Exception) { "Unknown" }
                    }
                }
                
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = healthCardMainBg),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
                ) {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(16.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            // Left Icon matching image
                            Surface(
                                modifier = Modifier.size(56.dp),
                                shape = RoundedCornerShape(12.dp),
                                color = Color.White,
                                shadowElevation = 2.dp
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        Icons.Outlined.Favorite,
                                        contentDescription = null,
                                        tint = Color(0xFF6A5AE0),
                                        modifier = Modifier.size(32.dp)
                                    )
                                }
                            }
                            
                            Spacer(modifier = Modifier.width(16.dp))
                            
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    stringResource(R.string.google_health_connect),
                                    fontWeight = FontWeight.ExtraBold,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    fontSize = 17.sp
                                )
                                
                                if (healthConnectStatus == androidx.health.connect.client.HealthConnectClient.SDK_AVAILABLE && lastSyncTime != null) {
                                    Text(
                                        text = "Last sync: $lastSyncText",
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                            
                            // Sync Illustration matching image
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Outlined.Watch, null, modifier = Modifier.size(24.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                Icon(Icons.Default.SyncAlt, null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                Icon(Icons.Default.Smartphone, null, modifier = Modifier.size(24.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                        
                        Spacer(modifier = Modifier.height(20.dp))

                        if (healthConnectStatus != androidx.health.connect.client.HealthConnectClient.SDK_AVAILABLE) {
                            // State 1: App Missing or Needs Update
                            Card(
                                modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
                            ) {
                                Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Warning, null, tint = MaterialTheme.colorScheme.onErrorContainer)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        if (healthConnectStatus == androidx.health.connect.client.HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) 
                                            "Health Connect needs an update to work properly." 
                                        else 
                                            "Health Connect app is missing from your phone.",
                                        fontSize = 14.sp,
                                        color = MaterialTheme.colorScheme.onErrorContainer
                                    )
                                }
                            }
                            Button(
                                onClick = {
                                    val intent = android.content.Intent(android.content.Intent.ACTION_VIEW)
                                    intent.setPackage("com.android.vending")
                                    intent.data = android.net.Uri.parse("market://details?id=com.google.android.apps.healthdata")
                                    intent.putExtra("overlay", true)
                                    intent.putExtra("callerId", context.packageName)
                                    try {
                                        context.startActivity(intent)
                                    } catch (e: Exception) {
                                        context.startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata")))
                                    }
                                },
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text(
                                    if (healthConnectStatus == androidx.health.connect.client.HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) "Update Health Connect" else "Get Health Connect", 
                                    color = MaterialTheme.colorScheme.onError, fontSize = 16.sp, fontWeight = FontWeight.Bold
                                )
                            }
                        } else if (!hasPermissions) {
                            // State 2: App Installed, Permissions Missing
                            Card(
                                modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer)
                            ) {
                                Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Lock, null, tint = MaterialTheme.colorScheme.onSecondaryContainer)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(stringResource(R.string.please_grant_permissions_to_sync), fontSize = 14.sp, color = MaterialTheme.colorScheme.onSecondaryContainer)
                                }
                            }
                            Button(
                                onClick = { 
                                    try {
                                        permissionsLauncher.launch(dashboardViewModel.healthConnectManager.permissions)
                                    } catch (e: Exception) {
                                        android.widget.Toast.makeText(context, "Launch failed: ${e.message}", android.widget.Toast.LENGTH_LONG).show()
                                        e.printStackTrace()
                                    }
                                },
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text(stringResource(R.string.grant_permissions), color = MaterialTheme.colorScheme.onSecondary, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                            }
                        } else {
                            // State 3: Connected and ready to sync
                            Button(
                                onClick = { dashboardViewModel.syncHealthConnectData() },
                                enabled = syncState !is ProfileUpdateState.Loading,
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6A5AE0)),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                if (syncState is ProfileUpdateState.Loading) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(20.dp),
                                        color = MaterialTheme.colorScheme.onPrimary,
                                        strokeWidth = 2.dp
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(stringResource(R.string.syncing), color = MaterialTheme.colorScheme.onPrimary, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                                } else {
                                    Icon(Icons.Default.Sync, null, modifier = Modifier.size(20.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(stringResource(R.string.sync_now), color = MaterialTheme.colorScheme.onPrimary, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                            OutlinedButton(
                                onClick = { 
                                    dashboardViewModel.revokeHealthConnectAccess()
                                    hasPermissions = false
                                },
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)
                            ) {
                                Icon(Icons.Default.Close, null, modifier = Modifier.size(20.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(stringResource(R.string.revoke_access))
                            }
                        }
                        
                        if (syncState is ProfileUpdateState.Success) {
                            Text(
                                text = (syncState as ProfileUpdateState.Success).message,
                                color = Color(0xFF4CAF50),
                                fontSize = 12.sp,
                                modifier = Modifier.padding(top = 8.dp).align(Alignment.CenterHorizontally)
                            )
                        } else if (syncState is ProfileUpdateState.Error) {
                            Text(
                                text = (syncState as ProfileUpdateState.Error).message,
                                color = MaterialTheme.colorScheme.error,
                                fontSize = 12.sp,
                                modifier = Modifier.padding(top = 8.dp).align(Alignment.CenterHorizontally)
                            )
                        }

                        Spacer(modifier = Modifier.height(20.dp))
                        
                        HealthConnectHowItWorks()
                        
                    }
                }
            }
            
            item {
                OutlinedButton(
                    onClick = onNavigateToHealthConnectDashboard,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
                    shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF6A5AE0)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF6A5AE0).copy(alpha = 0.5f))
                ) {
                    androidx.compose.material3.Icon(
                        imageVector = androidx.compose.material.icons.Icons.Default.Settings,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("View Health Dashboard", fontWeight = androidx.compose.ui.text.font.FontWeight.Medium)
                }
            }

            // Fitness Tracking Fallback Section (Removing duplicates)
        }
    }
}

@Composable
fun WellnessHubActions(
    onWellnessHubClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onWellnessHubClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    androidx.compose.ui.graphics.Brush.horizontalGradient(
                        listOf(Color(0xFFE8F8EF), Color(0xFFF8FBFF))
                    )
                )
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                modifier = Modifier.size(42.dp),
                shape = RoundedCornerShape(12.dp),
                color = Color(0xFF047857).copy(alpha = 0.15f)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(Icons.Filled.Favorite, null, tint = Color(0xFF047857), modifier = Modifier.size(24.dp))
                }
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text("Wellness Hub", fontSize = 17.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF0F172A))
                Text(
                    "Workouts, coaches, gyms, supplements & more",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Row(
                modifier = Modifier
                    .align(Alignment.Top)
                    .offset(x = 10.dp, y = (-6).dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Open", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF047857))
                Icon(Icons.Filled.ChevronRight, null, tint = Color(0xFF047857), modifier = Modifier.size(16.dp))
            }
        }
    }
}

@Composable
fun WellnessActionButton(
    modifier: Modifier = Modifier,
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    tint: Color,
    bg: Color,
    onClick: () -> Unit
) {
    Column(
        modifier = modifier
            .height(72.dp)
            .background(bg, RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 6.dp, vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(icon, null, tint = tint, modifier = Modifier.size(22.dp))
        Spacer(modifier = Modifier.height(5.dp))
        Text(
            label,
            color = tint,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
private fun HealthCardHowItWorks() {
    var expanded by remember { mutableStateOf(false) } // Defaulting to collapsed as requested by "Option 4" image style
    val isDark = MaterialTheme.colorScheme.surface.luminance() < 0.5f
    val outerBg = if (isDark) MaterialTheme.colorScheme.surface.copy(alpha = 0.5f) else Color.White.copy(alpha = 0.6f)
    val innerBg = if (isDark) MaterialTheme.colorScheme.surfaceVariant else Color.White

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
            .background(outerBg, RoundedCornerShape(12.dp))
            .border(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f), RoundedCornerShape(12.dp))
            .padding(16.dp)
    ) {
        // Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { expanded = !expanded },
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = stringResource(R.string.how_it_works),
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 17.sp,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = stringResource(R.string.use_your_digital_health_card),
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .background(MaterialTheme.colorScheme.surface, CircleShape)
                    .clickable { expanded = !expanded },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = if (expanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                    contentDescription = if (expanded) "Collapse" else "Expand",
                    modifier = Modifier.size(20.dp),
                    tint = MaterialTheme.colorScheme.onSurface
                )
            }
        }

        AnimatedVisibility(
            visible = expanded,
            enter = expandVertically(),
            exit = shrinkVertically()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 20.dp)
                    .background(innerBg, RoundedCornerShape(12.dp))
                    .border(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.2f), RoundedCornerShape(12.dp))
                    .padding(16.dp)
            ) {
                StepItem(
                    number = "1",
                    title = stringResource(R.string.generate_secure_qr_code),
                    description = stringResource(R.string.generate_secure_qr_code_desc),
                    isLast = false
                )
                StepItem(
                    number = "2",
                    title = stringResource(R.string.present_at_check_in),
                    description = stringResource(R.string.present_at_check_in_desc),
                    isLast = false
                )
                StepItem(
                    number = "3",
                    title = stringResource(R.string.instant_identity_verification),
                    description = stringResource(R.string.instant_identity_verification_desc),
                    isLast = false
                )
                StepItem(
                    number = "4",
                    title = stringResource(R.string.access_healthcare_services),
                    description = stringResource(R.string.access_healthcare_services_desc),
                    isLast = true
                )
            }
        }
    }
}

@Composable
private fun HealthConnectHowItWorks(fitnessLog: com.example.swastik.data.model.DailyFitnessLog? = null) {
    var expanded by remember { mutableStateOf(false) }
    val isDark = MaterialTheme.colorScheme.surface.luminance() < 0.5f
    val outerBg = if (isDark) MaterialTheme.colorScheme.surface.copy(alpha = 0.5f) else Color.White.copy(alpha = 0.6f)
    val innerBg = if (isDark) MaterialTheme.colorScheme.surfaceVariant else Color.White
    
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(outerBg, RoundedCornerShape(12.dp))
            .border(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f), RoundedCornerShape(12.dp))
            .padding(16.dp)
    ) {
        // Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { expanded = !expanded },
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = stringResource(R.string.setup_guide),
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = stringResource(R.string.how_to_connect_your_smartwatch),
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .background(MaterialTheme.colorScheme.surface, CircleShape)
                    .clickable { expanded = !expanded },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = if (expanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                    contentDescription = if (expanded) "Collapse" else "Expand",
                    modifier = Modifier.size(18.dp),
                    tint = MaterialTheme.colorScheme.onSurface
                )
            }
        }

        AnimatedVisibility(
            visible = expanded,
            enter = expandVertically(),
            exit = shrinkVertically()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 20.dp)
                    .background(innerBg, RoundedCornerShape(12.dp))
                    .border(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.2f), RoundedCornerShape(12.dp))
                    .padding(16.dp)
            ) {
                StepItem(
                    number = "1",
                    title = stringResource(R.string.get_health_connect),
                    description = stringResource(R.string.get_health_connect_desc),
                    isLast = false,
                    accentColor = MaterialTheme.colorScheme.secondary
                )
                StepItem(
                    number = "2",
                    title = stringResource(R.string.link_your_smartwatch_app),
                    description = stringResource(R.string.link_your_smartwatch_app_desc),
                    isLast = false,
                    accentColor = MaterialTheme.colorScheme.secondary
                )
                StepItem(
                    number = "3",
                    title = stringResource(R.string.allow_access_to_vaididea),
                    description = stringResource(R.string.allow_access_to_vaididea_desc),
                    isLast = false,
                    accentColor = MaterialTheme.colorScheme.secondary
                )
                StepItem(
                    number = "4",
                    title = stringResource(R.string.see_your_daily_health),
                    description = stringResource(R.string.see_your_daily_health_desc),
                    isLast = true,
                    accentColor = MaterialTheme.colorScheme.secondary
                )
            }
        }
    }
}

@Composable
private fun StepItem(
    number: String,
    title: String,
    description: String,
    isLast: Boolean,
    accentColor: Color = Color(0xFF6A5AE0)
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.width(32.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(26.dp)
                    .background(accentColor, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = number,
                    color = MaterialTheme.colorScheme.onPrimary,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
            }
            
            if (!isLast) {
                Canvas(
                    modifier = Modifier
                        .width(1.dp)
                        .height(48.dp)
                ) {
                    drawLine(
                        color = accentColor.copy(alpha = 0.3f),
                        start = androidx.compose.ui.geometry.Offset(0f, 4.dp.toPx()),
                        end = androidx.compose.ui.geometry.Offset(0f, 44.dp.toPx()),
                        strokeWidth = 1.5.dp.toPx(),
                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 10f), 0f)
                    )
                }
            }
        }
        
        Spacer(modifier = Modifier.width(16.dp))
        
        Column(modifier = Modifier.padding(bottom = if (isLast) 0.dp else 24.dp)) {
            Text(
                text = title,
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = description,
                fontSize = 13.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                lineHeight = 18.sp
            )
        }
    }
}
