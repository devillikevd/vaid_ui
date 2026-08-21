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
import androidx.compose.ui.res.stringResource
import com.example.swastik.R

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
            hasPermissions = healthConnectManager.hasPermissions()
        }
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = PermissionController.createRequestPermissionResultContract()
    ) { granted ->
        if (granted.isNotEmpty()) {
            hasPermissions = true
            navController.popBackStack()
        } else {
            scope.launch {
                if (healthConnectManager.hasPermissions()) {
                    hasPermissions = true
                    navController.popBackStack()
                } else {
                    android.widget.Toast.makeText(context, "Permissions not granted", android.widget.Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    val isAvailable = status == androidx.health.connect.client.HealthConnectClient.SDK_AVAILABLE

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.setup_health_connect)) },
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
                text = stringResource(R.string.sync_your_health_data),
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
            
            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = stringResource(R.string.connect_swastik_with_google_health),
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
                            stringResource(R.string.health_connect_update_required),
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            stringResource(R.string.your_health_connect_app_needs),
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
                    Text(stringResource(R.string.update_health_connect), fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }
            } else if (!isAvailable) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            stringResource(R.string.health_connect_app_missing),
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            stringResource(R.string.your_device_requires_the_official),
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
                    Text(stringResource(R.string.install_via_play_store), fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }
            } else {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF4CAF50))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.health_connect_is_available_on), color = Color(0xFF4CAF50), fontWeight = FontWeight.Medium)
                }
                Spacer(modifier = Modifier.height(24.dp))
                if (hasPermissions) {
                    Button(
                        onClick = { navController.popBackStack() },
                        modifier = Modifier.fillMaxWidth().height(56.dp).bounceClick { },
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Text(stringResource(R.string.str_continue), fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                } else {
                    Button(
                        onClick = { 
                            try {
                                permissionLauncher.launch(healthConnectManager.permissions)
                            } catch (e: Exception) {
                                android.widget.Toast.makeText(context, "Launch failed: ${e.message}", android.widget.Toast.LENGTH_LONG).show()
                                e.printStackTrace()
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                        enabled = isAvailable && !hasPermissions,
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Text(stringResource(R.string.grant_permissions), fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    OutlinedButton(
                        onClick = {
                            try {
                                val intent = Intent("androidx.health.ACTION_HEALTH_CONNECT_SETTINGS")
                                context.startActivity(intent)
                            } catch (e: Exception) {
                                android.widget.Toast.makeText(context, "Cannot open settings: ${e.message}", android.widget.Toast.LENGTH_SHORT).show()
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                        enabled = isAvailable,
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Text(stringResource(R.string.open_health_connect_settings), fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
