package com.example.swastik.ui.screens.patient.onboarding

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.example.swastik.data.health.HealthConnectManager
import com.example.swastik.ui.components.bounceClick
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.health.connect.client.PermissionController
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HealthConnectSetupScreen(
    navController: NavController,
    healthConnectManager: HealthConnectManager
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var status by remember { mutableIntStateOf(healthConnectManager.checkAvailability()) }
    var hasPermissions by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        if (status == androidx.health.connect.client.HealthConnectClient.SDK_AVAILABLE) {
            hasPermissions = healthConnectManager.hasAllPermissions()
        }
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = PermissionController.createRequestPermissionResultContract()
    ) { granted ->
        if (granted.containsAll(healthConnectManager.permissions)) {
            hasPermissions = true
            navController.popBackStack()
        }
    }

    val isAvailable = status == androidx.health.connect.client.HealthConnectClient.SDK_AVAILABLE

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Setup Health Connect") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(100.dp)
                    .background(MaterialTheme.colorScheme.primaryContainer, RoundedCornerShape(24.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.Favorite,
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    tint = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
            
            Spacer(modifier = Modifier.height(32.dp))

            Text(
                text = "Sync Your Health Data",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
            
            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = "Connect Swastik with Google Health Connect to automatically sync your daily steps, heart rate, and body temperature.",
                fontSize = 16.sp,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(32.dp))

            if (status == androidx.health.connect.client.HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            "Health Connect Update Required",
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "Your Health Connect app needs an update to continue.",
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                    }
                }
                Spacer(modifier = Modifier.height(24.dp))
                Button(
                    onClick = {
                        val intent = Intent(Intent.ACTION_VIEW)
                        intent.setPackage("com.android.vending")
                        intent.data = Uri.parse("market://details?id=com.google.android.apps.healthdata")
                        try {
                            context.startActivity(intent)
                        } catch (e: Exception) {
                            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata")))
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(56.dp).bounceClick { },
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Text("Update Health Connect", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }
            } else if (!isAvailable) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            "Health Connect App Missing",
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "Your device requires the official Google Health Connect app to be installed from the Play Store.",
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                    }
                }
                Spacer(modifier = Modifier.height(24.dp))
                Button(
                    onClick = {
                        val intent = Intent(Intent.ACTION_VIEW)
                        intent.setPackage("com.android.vending")
                        intent.data = Uri.parse("market://details?id=com.google.android.apps.healthdata")
                        try {
                            context.startActivity(intent)
                        } catch (e: Exception) {
                            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata")))
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(56.dp).bounceClick { },
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Text("Install via Play Store", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }
            } else {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF4CAF50))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Health Connect is available on your device.", color = Color(0xFF4CAF50), fontWeight = FontWeight.Medium)
                }
                Spacer(modifier = Modifier.height(24.dp))
                if (hasPermissions) {
                    Button(
                        onClick = { navController.popBackStack() },
                        modifier = Modifier.fillMaxWidth().height(56.dp).bounceClick { },
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Text("Continue", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                } else {
                    Button(
                        onClick = { permissionLauncher.launch(healthConnectManager.permissions) },
                        modifier = Modifier.fillMaxWidth().height(56.dp).bounceClick { },
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Text("Grant Permissions", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
