package com.example.swastik.ui.screens.patient.tabs

import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.example.swastik.data.local.AppSettingsStore
import com.example.swastik.data.local.NotificationPreferences
import com.example.swastik.data.local.ThemePreference
import com.example.swastik.data.model.*
import com.example.swastik.data.remote.dto.UpdateProfileRequest
import com.example.swastik.ui.theme.*
import com.example.swastik.ui.viewmodel.PatientDashboardViewModel
import com.example.swastik.ui.viewmodel.ProfileUpdateState
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import com.example.swastik.utils.ImageCompressor
import com.example.swastik.utils.ProfileValidation

@Composable
fun ProfileTabContent(
    modifier: Modifier = Modifier,
    profile: PatientProfile? = null,
    stats: PatientStats? = null,
    onLogout: () -> Unit = {},
    viewModel: PatientDashboardViewModel? = null
) {
    var showEditProfileDialog by remember { mutableStateOf(false) }
    var showPersonalInfoDialog by remember { mutableStateOf(false) }
    var showLanguageDialog by remember { mutableStateOf(false) }
    var showAppearanceDialog by remember { mutableStateOf(false) }
    var showNotificationDialog by remember { mutableStateOf(false) }
    var showFeedbackDialog by remember { mutableStateOf(false) }
    var showEmergencyContactsDialog by remember { mutableStateOf(false) }
    var showFamilyMembersDialog by remember { mutableStateOf(false) }
    var showAddressesDialog by remember { mutableStateOf(false) }
    var showPrivacyDialog by remember { mutableStateOf(false) }
    var showHelpCenterDialog by remember { mutableStateOf(false) }
    var showQrDialog by remember { mutableStateOf(false) }
    var showChangePasswordDialog by remember { mutableStateOf(false) }

    val context = LocalContext.current

    // Image picker launcher — compresses image before upload to save bandwidth
    val imagePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            try {
                // Compress image client-side (saves 60-80% bandwidth on 2G/3G)
                val compressed = ImageCompressor.compressFromUri(context, it)
                if (compressed != null) {
                    val requestBody = compressed.bytes.toRequestBody(compressed.mimeType.toMediaTypeOrNull())
                    val imagePart = MultipartBody.Part.createFormData("file", "profile.jpg", requestBody)
                    viewModel?.uploadProfileImage(imagePart)
                } else {
                    // Fallback: upload without compression
                    val inputStream = context.contentResolver.openInputStream(it)
                    val bytes = inputStream?.readBytes() ?: return@let
                    inputStream.close()
                    val requestBody = bytes.toRequestBody("image/*".toMediaTypeOrNull())
                    val imagePart = MultipartBody.Part.createFormData("file", "profile.jpg", requestBody)
                    viewModel?.uploadProfileImage(imagePart)
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Failed to process image", Toast.LENGTH_SHORT).show()
            }
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Color.White)
    ) {
        ProfileHeader(
            onQrClick = { showQrDialog = true },
            onSettingsClick = { showNotificationDialog = true }
        )

        Card(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 8.dp),
            shape = RoundedCornerShape(topStart = 30.dp, topEnd = 30.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
        ) {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(top = 24.dp),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    ProfileInfoCard(
                        profile = profile,
                        onEditClick = { showEditProfileDialog = true },
                        onShareClick = {
                            val shareText = buildString {
                                append("${profile?.name ?: "Swastik User"}\n")
                                if (profile?.phoneNumber?.isNotEmpty() == true) append("Phone: ${profile.phoneNumber}\n")
                                if (profile?.email?.isNotEmpty() == true) append("Email: ${profile.email}\n")
                                if (profile?.bloodGroup?.isNotEmpty() == true) append("Blood: ${profile.bloodGroup}\n")
                                append("\nShared via Swastik Health App")
                            }
                            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                putExtra(Intent.EXTRA_TEXT, shareText)
                            }
                            context.startActivity(Intent.createChooser(shareIntent, "Share Profile"))
                        },
                        onCameraClick = {
                            imagePickerLauncher.launch("image/*")
                        }
                    )
                }
                item { QuickStatsSection(stats = stats ?: PatientStats()) }
                item {
                    SectionTitleWithBadge(
                        "Health Identity",
                        if (profile?.isVerified == true) "Verified" else "Not Verified",
                        if (profile?.isVerified == true) Color(0xFF4CAF50) else Color.Gray
                    )
                }
                item { HealthIdCard(profile = profile) }
                item { Text("Account Settings", fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = Color.Black) }
                item {
                    SettingsCard(
                        onPersonalInfoClick = { showPersonalInfoDialog = true },
                        onAddressesClick = { showAddressesDialog = true },
                        onFamilyClick = { showFamilyMembersDialog = true },
                        onEmergencyClick = { showEmergencyContactsDialog = true }
                    )
                }
                item { Text("Preferences", fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = Color.Black) }
                item {
                    PreferencesCard(
                        onNotificationsClick = { showNotificationDialog = true },
                        onLanguageClick = { showLanguageDialog = true },
                        onAppearanceClick = { showAppearanceDialog = true },
                        onPrivacyClick = { showPrivacyDialog = true }
                    )
                }
                item { Text("Support & Legal", fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = Color.Black) }
                item {
                    SupportCard(
                        onSupportClick = {
                            Toast.makeText(context, "Connecting to support agent...", Toast.LENGTH_SHORT).show()
                        },
                        onHelpClick = { showHelpCenterDialog = true },
                        onFeedbackClick = { showFeedbackDialog = true }
                    )
                }
                item { Spacer(modifier = Modifier.height(8.dp)) }
                item {
                    Button(
                        onClick = { onLogout() },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFFFFEBEE),
                            contentColor = Color(0xFFD32F2F)
                        )
                    ) {
                        Icon(Icons.Outlined.Logout, contentDescription = null, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Logout", fontWeight = FontWeight.Medium)
                    }
                }
                item { Spacer(modifier = Modifier.height(16.dp)) }
                item {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Text("Swastik v1.0.0", fontSize = 12.sp, color = Color.Gray)
                        Text("Made with love in India", fontSize = 11.sp, color = Color.LightGray)
                    }
                }
                item { Spacer(modifier = Modifier.height(16.dp)) }
            }
        }
    }

    // ---- DIALOGS ----

    if (showEditProfileDialog || showPersonalInfoDialog) {
        EditProfileDialog(
            profile = profile,
            onDismiss = { showEditProfileDialog = false; showPersonalInfoDialog = false },
            onSave = { request ->
                viewModel?.updateProfile(request)
                showEditProfileDialog = false
                showPersonalInfoDialog = false
            }
        )
    }

    if (showLanguageDialog) {
        LanguagePickerDialog(onDismiss = { showLanguageDialog = false })
    }

    if (showAppearanceDialog) {
        AppearanceDialog(onDismiss = { showAppearanceDialog = false })
    }

    if (showNotificationDialog) {
        NotificationSettingsDialog(onDismiss = { showNotificationDialog = false })
    }

    if (showFeedbackDialog) {
        FeedbackDialog(onDismiss = { showFeedbackDialog = false })
    }

    if (showEmergencyContactsDialog) {
        EmergencyContactsDialog(
            contacts = profile?.emergencyContacts ?: emptyList(),
            onDismiss = { showEmergencyContactsDialog = false },
            onAddContact = { name, phone, relation ->
                viewModel?.addEmergencyContact(name, phone, relation)
            },
            onDeleteContact = { contactId ->
                viewModel?.deleteEmergencyContact(contactId)
            }
        )
    }

    if (showFamilyMembersDialog) {
        FamilyMembersDialog(
            members = profile?.familyMembers ?: emptyList(),
            onDismiss = { showFamilyMembersDialog = false },
            onAddMember = { name, relation, phone ->
                viewModel?.addFamilyMember(name, relation, phone)
            },
            onDeleteMember = { memberId ->
                viewModel?.deleteFamilyMember(memberId)
            }
        )
    }

    if (showAddressesDialog) {
        SavedAddressesDialog(
            addresses = profile?.savedAddresses ?: emptyList(),
            onDismiss = { showAddressesDialog = false }
        )
    }

    if (showPrivacyDialog) {
        PrivacySecurityDialog(
            onDismiss = { showPrivacyDialog = false },
            onChangePassword = {
                showPrivacyDialog = false
                showChangePasswordDialog = true
            }
        )
    }

    if (showHelpCenterDialog) {
        HelpCenterDialog(onDismiss = { showHelpCenterDialog = false })
    }

    if (showQrDialog) {
        QrCodeDialog(
            profile = profile,
            viewModel = viewModel,
            onDismiss = { showQrDialog = false }
        )
    }

    if (showChangePasswordDialog) {
        ChangePasswordDialog(
            onDismiss = { showChangePasswordDialog = false },
            onSubmit = { currentPwd, newPwd ->
                viewModel?.changePassword(currentPwd, newPwd)
                showChangePasswordDialog = false
            }
        )
    }

    // Show toast on profile update result
    val updateState = viewModel?.profileUpdateState?.collectAsState()
    LaunchedEffect(updateState?.value) {
        when (updateState?.value) {
            is ProfileUpdateState.Success -> {
                Toast.makeText(context, "Profile updated successfully!", Toast.LENGTH_SHORT).show()
                viewModel.resetProfileUpdateState()
            }
            is ProfileUpdateState.Error -> {
                Toast.makeText(context, (updateState.value as ProfileUpdateState.Error).message, Toast.LENGTH_SHORT).show()
                viewModel.resetProfileUpdateState()
            }
            else -> {}
        }
    }

    // Show toast on image upload result
    val imageUploadState = viewModel?.imageUploadState?.collectAsState()
    LaunchedEffect(imageUploadState?.value) {
        when (imageUploadState?.value) {
            is ProfileUpdateState.Success -> {
                Toast.makeText(context, "Profile photo updated!", Toast.LENGTH_SHORT).show()
                viewModel?.resetImageUploadState()
            }
            is ProfileUpdateState.Error -> {
                Toast.makeText(context, (imageUploadState?.value as ProfileUpdateState.Error).message, Toast.LENGTH_SHORT).show()
                viewModel?.resetImageUploadState()
            }
            else -> {}
        }
    }

    // Show toast on password change result
    val changePwdState = viewModel?.changePasswordState?.collectAsState()
    LaunchedEffect(changePwdState?.value) {
        when (changePwdState?.value) {
            is ProfileUpdateState.Success -> {
                Toast.makeText(context, "Password changed successfully!", Toast.LENGTH_SHORT).show()
                viewModel?.resetChangePasswordState()
            }
            is ProfileUpdateState.Error -> {
                Toast.makeText(context, (changePwdState?.value as ProfileUpdateState.Error).message, Toast.LENGTH_SHORT).show()
                viewModel?.resetChangePasswordState()
            }
            else -> {}
        }
    }
}

// ==================== DIALOGS ====================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EditProfileDialog(
    profile: PatientProfile?,
    onDismiss: () -> Unit,
    onSave: (UpdateProfileRequest) -> Unit
) {
    var name by remember { mutableStateOf(profile?.name ?: "") }
    var age by remember { mutableStateOf(if ((profile?.age ?: 0) > 0) profile?.age.toString() else "") }
    var gender by remember { mutableStateOf(profile?.gender ?: "") }
    var bloodGroup by remember { mutableStateOf(profile?.bloodGroup ?: "") }
    var weight by remember { mutableStateOf(if ((profile?.weight ?: 0f) > 0f) profile?.weight.toString() else "") }
    var height by remember { mutableStateOf(if ((profile?.height ?: 0f) > 0f) profile?.height.toString() else "") }
    var location by remember { mutableStateOf(profile?.location ?: "") }
    var genderExpanded by remember { mutableStateOf(false) }
    var bloodGroupExpanded by remember { mutableStateOf(false) }
    var validationError by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.Edit, contentDescription = null, tint = SwastikPurple, modifier = Modifier.size(24.dp))
                Spacer(Modifier.width(8.dp))
                Text("Edit Profile", fontWeight = FontWeight.Bold)
            }
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (validationError != null) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFEBEE)),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Warning, null, tint = Color(0xFFD32F2F), modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(8.dp))
                            Text(validationError!!, fontSize = 12.sp, color = Color(0xFFD32F2F))
                        }
                    }
                }
                OutlinedTextField(
                    value = name, onValueChange = { name = it },
                    label = { Text("Full Name") },
                    leadingIcon = { Icon(Icons.Outlined.Person, null, modifier = Modifier.size(20.dp)) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = age, onValueChange = { age = it.filter { c -> c.isDigit() } },
                        label = { Text("Age") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true
                    )
                    ExposedDropdownMenuBox(
                        expanded = genderExpanded,
                        onExpandedChange = { genderExpanded = it },
                        modifier = Modifier.weight(1f)
                    ) {
                        OutlinedTextField(
                            value = gender.replaceFirstChar { it.uppercase() },
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Gender") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = genderExpanded) },
                            modifier = Modifier.menuAnchor(),
                            shape = RoundedCornerShape(12.dp),
                            singleLine = true
                        )
                        ExposedDropdownMenu(expanded = genderExpanded, onDismissRequest = { genderExpanded = false }) {
                            ProfileValidation.GENDER_OPTIONS.forEach { g ->
                                DropdownMenuItem(
                                    text = { Text(g.replaceFirstChar { it.uppercase() }) },
                                    onClick = { gender = g; genderExpanded = false }
                                )
                            }
                        }
                    }
                }
                ExposedDropdownMenuBox(
                    expanded = bloodGroupExpanded,
                    onExpandedChange = { bloodGroupExpanded = it }
                ) {
                    OutlinedTextField(
                        value = bloodGroup.ifEmpty { "Select Blood Group" },
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Blood Group") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = bloodGroupExpanded) },
                        modifier = Modifier.fillMaxWidth().menuAnchor(),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true
                    )
                    ExposedDropdownMenu(expanded = bloodGroupExpanded, onDismissRequest = { bloodGroupExpanded = false }) {
                        ProfileValidation.BLOOD_GROUP_OPTIONS.forEach { bg ->
                            DropdownMenuItem(
                                text = { Text(bg) },
                                onClick = { bloodGroup = bg; bloodGroupExpanded = false }
                            )
                        }
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = weight, onValueChange = { weight = it },
                        label = { Text("Weight (kg)") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = height, onValueChange = { height = it },
                        label = { Text("Height (cm)") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true
                    )
                }
                OutlinedTextField(
                    value = location, onValueChange = { location = it },
                    label = { Text("Location") },
                    leadingIcon = { Icon(Icons.Outlined.LocationOn, null, modifier = Modifier.size(20.dp)) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    // Validate inputs
                    val parsedAge = age.toIntOrNull()
                    val parsedWeight = weight.toFloatOrNull()
                    val parsedHeight = height.toFloatOrNull()

                    validationError = ProfileValidation.validate(
                        name = name,
                        age = parsedAge,
                        weight = parsedWeight,
                        height = parsedHeight,
                        gender = gender.ifBlank { null },
                        bloodGroup = bloodGroup.ifBlank { null }
                    )
                    if (validationError != null) return@Button

                    onSave(
                        UpdateProfileRequest(
                            name = name.ifBlank { null },
                            age = parsedAge,
                            gender = gender.ifBlank { null },
                            bloodGroup = bloodGroup.ifBlank { null },
                            weight = parsedWeight,
                            height = parsedHeight,
                            location = location.ifBlank { null }
                        )
                    )
                },
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPurple)
            ) { Text("Save Changes") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        },
        shape = RoundedCornerShape(20.dp)
    )
}

@Composable
private fun LanguagePickerDialog(onDismiss: () -> Unit) {
    val appSettings by AppSettingsStore.settings.collectAsState()
    var selected by remember(appSettings.language) { mutableStateOf(appSettings.language) }
    val languages = listOf("English", "Hindi", "Bengali", "Telugu", "Tamil", "Kannada", "Marathi")
    val context = LocalContext.current

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.Language, null, tint = SwastikPurple)
                Spacer(Modifier.width(8.dp))
                Text("Select Language", fontWeight = FontWeight.Bold)
            }
        },
        text = {
            Column {
                languages.forEach { lang ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .clickable { selected = lang }
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(
                            selected = selected == lang,
                            onClick = { selected = lang },
                            colors = RadioButtonDefaults.colors(selectedColor = SwastikPurple)
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(lang, fontSize = 15.sp, fontWeight = if (selected == lang) FontWeight.SemiBold else FontWeight.Normal)
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    AppSettingsStore.updateLanguage(selected)
                    Toast.makeText(context, "Language set to $selected", Toast.LENGTH_SHORT).show()
                    onDismiss()
                },
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPurple)
            ) { Text("Apply") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
        shape = RoundedCornerShape(20.dp)
    )
}

@Composable
private fun AppearanceDialog(onDismiss: () -> Unit) {
    val appSettings by AppSettingsStore.settings.collectAsState()
    var selected by remember(appSettings.themePreference) { mutableStateOf(appSettings.themePreference) }
    val context = LocalContext.current

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.DarkMode, null, tint = SwastikPurple)
                Spacer(Modifier.width(8.dp))
                Text("Appearance", fontWeight = FontWeight.Bold)
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(
                    Triple(ThemePreference.LIGHT, "Light", Icons.Outlined.LightMode),
                    Triple(ThemePreference.DARK, "Dark", Icons.Outlined.DarkMode),
                    Triple(ThemePreference.SYSTEM, "System", Icons.Outlined.SettingsBrightness)
                ).forEach { (mode, label, icon) ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { selected = mode },
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (selected == mode) SwastikPurple.copy(alpha = 0.1f) else Color(0xFFF5F5F5)
                        ),
                        border = if (selected == mode) BorderStroke(1.5.dp, SwastikPurple) else null
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(icon, null, tint = if (selected == mode) SwastikPurple else Color.Gray)
                            Spacer(Modifier.width(12.dp))
                            Text(label, fontWeight = if (selected == mode) FontWeight.SemiBold else FontWeight.Normal)
                            Spacer(Modifier.weight(1f))
                            if (selected == mode) {
                                Icon(Icons.Default.CheckCircle, null, tint = SwastikPurple)
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    AppSettingsStore.updateTheme(selected)
                    Toast.makeText(context, "Theme set to ${selected.name.lowercase().replaceFirstChar { it.uppercase() }}", Toast.LENGTH_SHORT).show()
                    onDismiss()
                },
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPurple)
            ) { Text("Apply") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
        shape = RoundedCornerShape(20.dp)
    )
}

@Composable
private fun NotificationSettingsDialog(onDismiss: () -> Unit) {
    val appSettings by AppSettingsStore.settings.collectAsState()
    val storedPreferences = appSettings.notificationPreferences
    var appointments by remember(storedPreferences) { mutableStateOf(storedPreferences.appointments) }
    var medicines by remember(storedPreferences) { mutableStateOf(storedPreferences.medicines) }
    var reports by remember(storedPreferences) { mutableStateOf(storedPreferences.reports) }
    var promotions by remember(storedPreferences) { mutableStateOf(storedPreferences.promotions) }
    var sound by remember(storedPreferences) { mutableStateOf(storedPreferences.sound) }
    val context = LocalContext.current

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.Notifications, null, tint = SwastikPurple)
                Spacer(Modifier.width(8.dp))
                Text("Notification Settings", fontWeight = FontWeight.Bold)
            }
        },
        text = {
            Column {
                NotifToggleRow("Appointment Reminders", appointments) { appointments = it }
                NotifToggleRow("Medicine Reminders", medicines) { medicines = it }
                NotifToggleRow("Report Ready Alerts", reports) { reports = it }
                NotifToggleRow("Promotional Offers", promotions) { promotions = it }
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                NotifToggleRow("Sound", sound) { sound = it }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    AppSettingsStore.updateNotificationPreferences(
                        NotificationPreferences(
                            appointments = appointments,
                            medicines = medicines,
                            reports = reports,
                            promotions = promotions,
                            sound = sound
                        )
                    )
                    Toast.makeText(context, "Notification preferences saved", Toast.LENGTH_SHORT).show()
                    onDismiss()
                },
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPurple)
            ) { Text("Save") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
        shape = RoundedCornerShape(20.dp)
    )
}

@Composable
private fun NotifToggleRow(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, fontSize = 14.sp)
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = Color.White,
                checkedTrackColor = SwastikPurple
            )
        )
    }
}

@Composable
private fun FeedbackDialog(onDismiss: () -> Unit) {
    var feedback by remember { mutableStateOf("") }
    var rating by remember { mutableIntStateOf(0) }
    val context = LocalContext.current

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.Feedback, null, tint = SwastikPurple)
                Spacer(Modifier.width(8.dp))
                Text("Send Feedback", fontWeight = FontWeight.Bold)
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("How would you rate your experience?", fontSize = 14.sp, color = Color.Gray)
                Row(
                    horizontalArrangement = Arrangement.Center,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    (1..5).forEach { star ->
                        IconButton(onClick = { rating = star }) {
                            Icon(
                                if (star <= rating) Icons.Default.Star else Icons.Outlined.StarBorder,
                                contentDescription = "Star $star",
                                tint = if (star <= rating) Color(0xFFFFC107) else Color.Gray,
                                modifier = Modifier.size(36.dp)
                            )
                        }
                    }
                }
                OutlinedTextField(
                    value = feedback,
                    onValueChange = { feedback = it },
                    label = { Text("Your feedback") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(120.dp),
                    shape = RoundedCornerShape(12.dp),
                    maxLines = 5
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    Toast.makeText(context, "Thank you for your feedback!", Toast.LENGTH_SHORT).show()
                    onDismiss()
                },
                enabled = rating > 0,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPurple)
            ) { Text("Submit") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
        shape = RoundedCornerShape(20.dp)
    )
}

@Composable
private fun EmergencyContactsDialog(
    contacts: List<EmergencyContact>,
    onDismiss: () -> Unit,
    onAddContact: (String, String, String) -> Unit,
    onDeleteContact: (String) -> Unit
) {
    var showAddForm by remember { mutableStateOf(false) }
    var newName by remember { mutableStateOf("") }
    var newPhone by remember { mutableStateOf("") }
    var newRelation by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.ContactEmergency, null, tint = Color(0xFFE53935))
                Spacer(Modifier.width(8.dp))
                Text("Emergency Contacts", fontWeight = FontWeight.Bold)
                Spacer(Modifier.weight(1f))
                IconButton(onClick = { showAddForm = !showAddForm }) {
                    Icon(
                        if (showAddForm) Icons.Default.Close else Icons.Default.Add,
                        contentDescription = if (showAddForm) "Cancel" else "Add Contact",
                        tint = SwastikPurple
                    )
                }
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (showAddForm) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = SwastikPurple.copy(alpha = 0.05f)),
                        border = BorderStroke(1.dp, SwastikPurple.copy(alpha = 0.2f))
                    ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("Add Emergency Contact", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = SwastikPurple)
                            OutlinedTextField(
                                value = newName, onValueChange = { newName = it },
                                label = { Text("Name") }, modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp), singleLine = true
                            )
                            OutlinedTextField(
                                value = newPhone, onValueChange = { newPhone = it.filter { c -> c.isDigit() || c == '+' } },
                                label = { Text("Phone Number") }, modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp), singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone)
                            )
                            OutlinedTextField(
                                value = newRelation, onValueChange = { newRelation = it },
                                label = { Text("Relation") }, modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp), singleLine = true
                            )
                            Button(
                                onClick = {
                                    if (newName.isNotBlank() && newPhone.isNotBlank() && newRelation.isNotBlank()) {
                                        onAddContact(newName, newPhone, newRelation)
                                        newName = ""; newPhone = ""; newRelation = ""
                                        showAddForm = false
                                    }
                                },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = SwastikPurple),
                                enabled = newName.isNotBlank() && newPhone.isNotBlank() && newRelation.isNotBlank()
                            ) { Text("Add Contact") }
                        }
                    }
                    HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                }

                if (contacts.isEmpty() && !showAddForm) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(Icons.Outlined.ContactEmergency, null, tint = Color.LightGray, modifier = Modifier.size(48.dp))
                        Spacer(Modifier.height(8.dp))
                        Text("No emergency contacts added", fontSize = 14.sp, color = Color.Gray)
                        Text("Tap + to add contacts for emergencies", fontSize = 12.sp, color = Color.LightGray)
                    }
                } else {
                    contacts.forEach { contact ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFFFEBEE))
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.Person, null, tint = Color(0xFFE53935))
                                Spacer(Modifier.width(12.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(contact.name, fontWeight = FontWeight.Medium, fontSize = 14.sp)
                                    Text(contact.phone, fontSize = 12.sp, color = Color.Gray)
                                    Text(contact.relationship, fontSize = 11.sp, color = Color(0xFFE53935))
                                }
                                IconButton(onClick = { onDeleteContact(contact.id) }) {
                                    Icon(Icons.Outlined.Delete, null, tint = Color(0xFFE53935), modifier = Modifier.size(20.dp))
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onDismiss,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPurple)
            ) { Text("Done") }
        },
        shape = RoundedCornerShape(20.dp)
    )
}

@Composable
private fun FamilyMembersDialog(
    members: List<FamilyMember>,
    onDismiss: () -> Unit,
    onAddMember: (String, String, String?) -> Unit,
    onDeleteMember: (String) -> Unit
) {
    var showAddForm by remember { mutableStateOf(false) }
    var newName by remember { mutableStateOf("") }
    var newRelation by remember { mutableStateOf("") }
    var newPhone by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.FamilyRestroom, null, tint = SwastikPurple)
                Spacer(Modifier.width(8.dp))
                Text("Family Members", fontWeight = FontWeight.Bold)
                Spacer(Modifier.weight(1f))
                IconButton(onClick = { showAddForm = !showAddForm }) {
                    Icon(
                        if (showAddForm) Icons.Default.Close else Icons.Default.Add,
                        contentDescription = if (showAddForm) "Cancel" else "Add Member",
                        tint = SwastikPurple
                    )
                }
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (showAddForm) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = SwastikPurple.copy(alpha = 0.05f)),
                        border = BorderStroke(1.dp, SwastikPurple.copy(alpha = 0.2f))
                    ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("Add Family Member", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = SwastikPurple)
                            OutlinedTextField(
                                value = newName, onValueChange = { newName = it },
                                label = { Text("Name") }, modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp), singleLine = true
                            )
                            OutlinedTextField(
                                value = newRelation, onValueChange = { newRelation = it },
                                label = { Text("Relation") }, modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp), singleLine = true
                            )
                            OutlinedTextField(
                                value = newPhone, onValueChange = { newPhone = it.filter { c -> c.isDigit() || c == '+' } },
                                label = { Text("Phone (optional)") }, modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp), singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone)
                            )
                            Button(
                                onClick = {
                                    if (newName.isNotBlank() && newRelation.isNotBlank()) {
                                        onAddMember(newName, newRelation, newPhone.ifBlank { null })
                                        newName = ""; newRelation = ""; newPhone = ""
                                        showAddForm = false
                                    }
                                },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = SwastikPurple),
                                enabled = newName.isNotBlank() && newRelation.isNotBlank()
                            ) { Text("Add Member") }
                        }
                    }
                    HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                }

                if (members.isEmpty() && !showAddForm) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(Icons.Outlined.FamilyRestroom, null, tint = Color.LightGray, modifier = Modifier.size(48.dp))
                        Spacer(Modifier.height(8.dp))
                        Text("No family members linked", fontSize = 14.sp, color = Color.Gray)
                        Text("Tap + to link family profiles", fontSize = 12.sp, color = Color.LightGray)
                    }
                } else {
                    members.forEach { member ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = SwastikPurple.copy(alpha = 0.06f))
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(40.dp)
                                        .clip(CircleShape)
                                        .background(SwastikPurple.copy(alpha = 0.15f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        member.name.take(1).uppercase(),
                                        color = SwastikPurple,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                                Spacer(Modifier.width(12.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(member.name, fontWeight = FontWeight.Medium, fontSize = 14.sp)
                                    Text(member.relationship, fontSize = 12.sp, color = Color.Gray)
                                }
                                IconButton(onClick = { onDeleteMember(member.id) }) {
                                    Icon(Icons.Outlined.Delete, null, tint = Color(0xFFE53935), modifier = Modifier.size(20.dp))
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onDismiss,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPurple)
            ) { Text("Done") }
        },
        shape = RoundedCornerShape(20.dp)
    )
}

@Composable
private fun SavedAddressesDialog(addresses: List<SavedAddress>, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.LocationOn, null, tint = SwastikPurple)
                Spacer(Modifier.width(8.dp))
                Text("Saved Addresses", fontWeight = FontWeight.Bold)
            }
        },
        text = {
            if (addresses.isEmpty()) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(Icons.Outlined.LocationOn, null, tint = Color.LightGray, modifier = Modifier.size(48.dp))
                    Spacer(Modifier.height(8.dp))
                    Text("No addresses saved", fontSize = 14.sp, color = Color.Gray)
                    Text("Save your home, office, etc. for quick access", fontSize = 12.sp, color = Color.LightGray)
                }
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    addresses.forEach { address ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFF5F5F5))
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    if (address.label.lowercase() == "home") Icons.Outlined.Home else Icons.Outlined.Business,
                                    null,
                                    tint = SwastikPurple
                                )
                                Spacer(Modifier.width(12.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(address.label, fontWeight = FontWeight.Medium, fontSize = 14.sp)
                                    Text(address.address, fontSize = 12.sp, color = Color.Gray)
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onDismiss,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPurple)
            ) { Text("Done") }
        },
        shape = RoundedCornerShape(20.dp)
    )
}

@Composable
private fun PrivacySecurityDialog(onDismiss: () -> Unit, onChangePassword: () -> Unit) {
    var biometrics by remember { mutableStateOf(false) }
    var twoFactor by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.Security, null, tint = SwastikPurple)
                Spacer(Modifier.width(8.dp))
                Text("Privacy & Security", fontWeight = FontWeight.Bold)
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                // Change Password button
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onChangePassword() },
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = SwastikPurple.copy(alpha = 0.08f))
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Outlined.Lock, null, tint = SwastikPurple, modifier = Modifier.size(22.dp))
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text("Change Password", fontSize = 14.sp, fontWeight = FontWeight.Medium)
                            Text("Update your account password", fontSize = 12.sp, color = Color.Gray)
                        }
                        Icon(Icons.Default.KeyboardArrowRight, null, tint = SwastikPurple)
                    }
                }
                Spacer(Modifier.height(4.dp))
                NotifToggleRow("Biometric Login", biometrics) { biometrics = it }
                NotifToggleRow("Two-Factor Auth (2FA)", twoFactor) { twoFactor = it }
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                Text("Data & Privacy", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Color.Gray)
                Spacer(Modifier.height(4.dp))
                Text("Your health data is encrypted end-to-end", fontSize = 12.sp, color = Color.DarkGray)
                Text("ABDM/ABHA compliant storage", fontSize = 12.sp, color = Color.DarkGray)
                Text("Data is never shared without consent", fontSize = 12.sp, color = Color.DarkGray)
            }
        },
        confirmButton = {
            Button(
                onClick = onDismiss,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPurple)
            ) { Text("Done") }
        },
        shape = RoundedCornerShape(20.dp)
    )
}

@Composable
private fun HelpCenterDialog(onDismiss: () -> Unit) {
    val faqs = listOf(
        "How do I book an appointment?" to "Go to Home tab and tap the + button at the bottom to book an appointment with any doctor.",
        "How to add family members?" to "Go to Profile > Family Members > Add Member to link family profiles.",
        "Is my data secure?" to "Yes! All data is encrypted end-to-end and ABDM compliant. We never share without consent.",
        "How to use video consultation?" to "Book a video consultation from the dashboard and join at the scheduled time.",
        "How to contact support?" to "Go to Profile > Support & Legal > 24/7 Support to chat with our team."
    )
    var expandedIndex by remember { mutableIntStateOf(-1) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.HelpOutline, null, tint = SwastikPurple)
                Spacer(Modifier.width(8.dp))
                Text("Help Center", fontWeight = FontWeight.Bold)
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text("Frequently Asked Questions", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Color.Gray)
                Spacer(Modifier.height(4.dp))
                faqs.forEachIndexed { index, (question, answer) ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                expandedIndex = if (expandedIndex == index) -1 else index
                            },
                        shape = RoundedCornerShape(10.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (expandedIndex == index) SwastikPurple.copy(alpha = 0.06f) else Color(0xFFF5F5F5)
                        )
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    question,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Medium,
                                    modifier = Modifier.weight(1f)
                                )
                                Icon(
                                    if (expandedIndex == index) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                    null,
                                    tint = SwastikPurple
                                )
                            }
                            if (expandedIndex == index) {
                                Spacer(Modifier.height(8.dp))
                                Text(answer, fontSize = 12.sp, color = Color.DarkGray)
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onDismiss,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPurple)
            ) { Text("Close") }
        },
        shape = RoundedCornerShape(20.dp)
    )
}

@Composable
private fun QrCodeDialog(
    profile: PatientProfile?,
    viewModel: PatientDashboardViewModel?,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val healthCardState by viewModel?.healthCardState?.collectAsState()
        ?: remember { mutableStateOf(PatientDashboardViewModel.HealthCardState()) }

    // Auto-generate on first open if no active card
    LaunchedEffect(Unit) {
        if (healthCardState.url == null && !healthCardState.isLoading) {
            viewModel?.generateHealthCard()
        }
    }

    // Generate QR bitmap from URL
    val qrBitmap = remember(healthCardState.url) {
        val url = healthCardState.url ?: return@remember null
        try {
            val writer = QRCodeWriter()
            val bitMatrix = writer.encode(url, BarcodeFormat.QR_CODE, 512, 512)
            val width = bitMatrix.width
            val height = bitMatrix.height
            val bmp = Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565)
            for (x in 0 until width) {
                for (y in 0 until height) {
                    bmp.setPixel(x, y, if (bitMatrix[x, y]) android.graphics.Color.BLACK else android.graphics.Color.WHITE)
                }
            }
            bmp
        } catch (e: Exception) {
            null
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.QrCode2, null, tint = SwastikPurple)
                Spacer(Modifier.width(8.dp))
                Text("Health QR Code", fontWeight = FontWeight.Bold)
            }
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier
                        .size(220.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(Color.White)
                        .border(2.dp, SwastikPurple.copy(alpha = 0.3f), RoundedCornerShape(16.dp))
                        .padding(12.dp),
                    contentAlignment = Alignment.Center
                ) {
                    when {
                        healthCardState.isLoading -> {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(48.dp),
                                    color = SwastikPurple
                                )
                                Spacer(Modifier.height(8.dp))
                                Text("Generating...", fontSize = 12.sp, color = Color.Gray)
                            }
                        }
                        healthCardState.error != null -> {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Outlined.ErrorOutline, null, tint = Color.Red, modifier = Modifier.size(48.dp))
                                Spacer(Modifier.height(8.dp))
                                Text(healthCardState.error ?: "Error", fontSize = 12.sp, color = Color.Red)
                            }
                        }
                        qrBitmap != null -> {
                            Image(
                                bitmap = qrBitmap.asImageBitmap(),
                                contentDescription = "Health QR Code",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Fit
                            )
                        }
                        else -> {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Outlined.QrCode2, null, tint = Color.LightGray, modifier = Modifier.size(60.dp))
                                Text("Tap Generate below", fontSize = 12.sp, color = Color.Gray)
                            }
                        }
                    }
                }

                Spacer(Modifier.height(12.dp))
                Text(profile?.name ?: "Patient", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                if (profile?.abhaNumber?.isNotEmpty() == true) {
                    Text("ABHA: ${profile.abhaNumber}", fontSize = 12.sp, color = Color.Gray)
                }

                // Expiry info
                if (healthCardState.hasActiveCard && healthCardState.expiresAt != null) {
                    Spacer(Modifier.height(8.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(Icons.Outlined.Schedule, null, tint = SwastikPurple, modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Valid for 24 hours", fontSize = 11.sp, color = SwastikPurple)
                    }
                }

                Spacer(Modifier.height(12.dp))
                Text(
                    "Any doctor can scan this QR to view your\ncomplete medical records securely",
                    fontSize = 12.sp,
                    color = Color.Gray,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )

                // Action buttons
                Spacer(Modifier.height(16.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Share button
                    if (healthCardState.url != null) {
                        OutlinedButton(
                            onClick = {
                                val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                    type = "text/plain"
                                    putExtra(Intent.EXTRA_SUBJECT, "My Swastik Health Card")
                                    putExtra(Intent.EXTRA_TEXT, "View my health records: ${healthCardState.url}")
                                }
                                context.startActivity(Intent.createChooser(shareIntent, "Share Health Card"))
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            border = BorderStroke(1.dp, SwastikPurple.copy(alpha = 0.5f))
                        ) {
                            Icon(Icons.Outlined.Share, null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Share", fontSize = 13.sp)
                        }
                    }

                    // Regenerate / Revoke
                    if (healthCardState.hasActiveCard) {
                        OutlinedButton(
                            onClick = { viewModel?.revokeHealthCard() },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            border = BorderStroke(1.dp, Color.Red.copy(alpha = 0.4f)),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.Red)
                        ) {
                            Icon(Icons.Outlined.LinkOff, null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Revoke", fontSize = 13.sp)
                        }
                    } else if (!healthCardState.isLoading) {
                        Button(
                            onClick = { viewModel?.generateHealthCard() },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = SwastikPurple)
                        ) {
                            Icon(Icons.Outlined.QrCode2, null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Generate", fontSize = 13.sp)
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onDismiss,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPurple)
            ) { Text("Close") }
        },
        shape = RoundedCornerShape(20.dp)
    )
}

// ==================== CHANGE PASSWORD DIALOG ====================

@Composable
private fun ChangePasswordDialog(
    onDismiss: () -> Unit,
    onSubmit: (String, String) -> Unit
) {
    var currentPassword by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var showCurrentPwd by remember { mutableStateOf(false) }
    var showNewPwd by remember { mutableStateOf(false) }
    var validationError by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.Lock, null, tint = SwastikPurple)
                Spacer(Modifier.width(8.dp))
                Text("Change Password", fontWeight = FontWeight.Bold)
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                if (validationError != null) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFEBEE)),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Warning, null, tint = Color(0xFFD32F2F), modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(8.dp))
                            Text(validationError!!, fontSize = 12.sp, color = Color(0xFFD32F2F))
                        }
                    }
                }
                OutlinedTextField(
                    value = currentPassword,
                    onValueChange = { currentPassword = it; validationError = null },
                    label = { Text("Current Password") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true,
                    visualTransformation = if (showCurrentPwd) VisualTransformation.None else PasswordVisualTransformation(),
                    trailingIcon = {
                        IconButton(onClick = { showCurrentPwd = !showCurrentPwd }) {
                            Icon(
                                if (showCurrentPwd) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility,
                                null, modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                )
                OutlinedTextField(
                    value = newPassword,
                    onValueChange = { newPassword = it; validationError = null },
                    label = { Text("New Password") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true,
                    visualTransformation = if (showNewPwd) VisualTransformation.None else PasswordVisualTransformation(),
                    trailingIcon = {
                        IconButton(onClick = { showNewPwd = !showNewPwd }) {
                            Icon(
                                if (showNewPwd) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility,
                                null, modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                )
                OutlinedTextField(
                    value = confirmPassword,
                    onValueChange = { confirmPassword = it; validationError = null },
                    label = { Text("Confirm New Password") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation()
                )
                Text("Password must be at least 8 characters", fontSize = 11.sp, color = Color.Gray)
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    when {
                        currentPassword.isBlank() -> validationError = "Enter current password"
                        newPassword.length < 8 -> validationError = "New password must be at least 8 characters"
                        newPassword != confirmPassword -> validationError = "Passwords don't match"
                        currentPassword == newPassword -> validationError = "New password must be different"
                        else -> onSubmit(currentPassword, newPassword)
                    }
                },
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPurple),
                enabled = currentPassword.isNotBlank() && newPassword.isNotBlank() && confirmPassword.isNotBlank()
            ) { Text("Change Password") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
        shape = RoundedCornerShape(20.dp)
    )
}

// ==================== SUB-COMPONENTS ====================

@Composable
private fun ProfileHeader(onQrClick: () -> Unit, onSettingsClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(Brush.linearGradient(colors = listOf(SwastikPurple, SwastikPurpleLight)))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("My Profile", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color.White)
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                IconButton(onClick = onQrClick) {
                    Icon(Icons.Outlined.QrCode2, contentDescription = "QR", tint = Color.White)
                }
                IconButton(onClick = onSettingsClick) {
                    Icon(Icons.Outlined.Settings, contentDescription = "Settings", tint = Color.White)
                }
            }
        }
    }
}

@Composable
private fun ProfileInfoCard(
    profile: PatientProfile?,
    onEditClick: () -> Unit,
    onShareClick: () -> Unit,
    onCameraClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Box {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(80.dp)
                    .background(
                        Brush.linearGradient(
                            colors = listOf(
                                SwastikPurple.copy(alpha = 0.1f),
                                SwastikPurpleLight.copy(alpha = 0.05f)
                            )
                        )
                    )
            )

            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box {
                    Box(
                        modifier = Modifier
                            .size(90.dp)
                            .clip(CircleShape)
                            .background(SwastikPurple.copy(alpha = 0.15f))
                            .border(3.dp, SwastikPurple, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        if (profile?.profileImageUrl?.isNotEmpty() == true) {
                            AsyncImage(
                                model = ImageRequest.Builder(LocalContext.current)
                                    .data(profile.profileImageUrl)
                                    .crossfade(true)
                                    .size(180) // Request only 180px — Coil downsamples, saves memory & bandwidth
                                    .build(),
                                contentDescription = "Profile Photo",
                                modifier = Modifier
                                    .fillMaxSize()
                                    .clip(CircleShape),
                                contentScale = ContentScale.Crop
                            )
                        } else {
                            Text(
                                profile?.initials?.ifEmpty { "?" } ?: "?",
                                fontSize = if (profile?.initials?.isNotEmpty() == true) 32.sp else 45.sp,
                                fontWeight = FontWeight.Bold,
                                color = SwastikPurple
                            )
                        }
                    }

                    if (profile?.isVerified == true) {
                        Box(
                            modifier = Modifier
                                .size(28.dp)
                                .clip(CircleShape)
                                .background(Color(0xFF4CAF50))
                                .border(2.dp, Color.White, CircleShape)
                                .align(Alignment.BottomEnd),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Check, contentDescription = "Verified", tint = Color.White, modifier = Modifier.size(16.dp))
                        }
                    }

                    Box(
                        modifier = Modifier
                            .size(28.dp)
                            .clip(CircleShape)
                            .background(Color.White)
                            .border(1.dp, Color.LightGray, CircleShape)
                            .align(Alignment.TopEnd)
                            .clickable { onCameraClick() },
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Outlined.CameraAlt, contentDescription = "Change Photo", tint = Color.Gray, modifier = Modifier.size(14.dp))
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    profile?.name?.ifEmpty { "Add Your Name" } ?: "Add Your Name",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black
                )
                Text(profile?.phoneNumber ?: "", fontSize = 14.sp, color = Color.Gray)
                if (profile?.email?.isNotEmpty() == true) {
                    Text(profile.email, fontSize = 13.sp, color = Color.Gray)
                }

                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFFF8F9FA), RoundedCornerShape(12.dp))
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    ProfileStat(profile?.displayAge ?: "--", "Age", "yrs")
                    VerticalDivider()
                    ProfileStat(profile?.displayBloodGroup ?: "--", "Blood", "Type")
                    VerticalDivider()
                    ProfileStat(profile?.displayWeight ?: "--", "Weight", "kg")
                    VerticalDivider()
                    ProfileStat(profile?.displayHeight ?: "--", "Height", "cm")
                }

                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedButton(
                        onClick = onEditClick,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp),
                        border = BorderStroke(1.dp, SwastikPurple)
                    ) {
                        Icon(Icons.Outlined.Edit, contentDescription = null, modifier = Modifier.size(18.dp), tint = SwastikPurple)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Edit", color = SwastikPurple, fontSize = 13.sp)
                    }
                    Button(
                        onClick = onShareClick,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = SwastikPurple)
                    ) {
                        Icon(Icons.Outlined.Share, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Share", fontSize = 13.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun ProfileStat(value: String, label: String, unit: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Row(verticalAlignment = Alignment.Bottom) {
            Text(value, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = SwastikPurple)
            if (unit != "Type") {
                Text(unit, fontSize = 10.sp, color = Color.Gray, modifier = Modifier.padding(bottom = 2.dp, start = 2.dp))
            }
        }
        Text(label, fontSize = 11.sp, color = Color.Gray)
    }
}

@Composable
private fun VerticalDivider() {
    Box(
        modifier = Modifier
            .width(1.dp)
            .height(36.dp)
            .background(Color.LightGray.copy(alpha = 0.5f))
    )
}

@Composable
private fun QuickStatsSection(stats: PatientStats) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        QuickStatCard(Icons.Outlined.CalendarMonth, stats.totalConsultations.toString(), "Consultations", SwastikPurple, Modifier.weight(1f))
        QuickStatCard(Icons.Outlined.Receipt, stats.totalPrescriptions.toString(), "Prescriptions", Color(0xFF4CAF50), Modifier.weight(1f))
        QuickStatCard(Icons.Outlined.Science, stats.totalReports.toString(), "Reports", Color(0xFF2196F3), Modifier.weight(1f))
    }
}

@Composable
private fun QuickStatCard(icon: ImageVector, value: String, label: String, color: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = color.copy(alpha = 0.1f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(24.dp))
            Spacer(modifier = Modifier.height(4.dp))
            Text(value, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = color)
            Text(label, fontSize = 10.sp, color = Color.Gray)
        }
    }
}

@Composable
private fun SectionTitleWithBadge(title: String, badge: String, badgeColor: Color) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(title, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = Color.Black)
        Surface(color = badgeColor.copy(alpha = 0.15f), shape = RoundedCornerShape(6.dp)) {
            Text(
                badge,
                fontSize = 11.sp,
                color = badgeColor,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
            )
        }
    }
}

@Composable
private fun HealthIdCard(profile: PatientProfile?) {
    val hasAbha = profile?.abhaNumber?.isNotEmpty() == true

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (hasAbha) Color(0xFFF0FFF4) else Color(0xFFFFF8E1)
        )
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(50.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(
                        if (hasAbha) Color(0xFF4CAF50).copy(alpha = 0.2f) else Color(0xFFFF9800).copy(alpha = 0.2f)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    if (hasAbha) Icons.Outlined.Verified else Icons.Outlined.AddCard,
                    contentDescription = null,
                    tint = if (hasAbha) Color(0xFF4CAF50) else Color(0xFFFF9800),
                    modifier = Modifier.size(28.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text("ABHA Number", fontSize = 12.sp, color = Color.Gray)
                Text(
                    if (hasAbha) profile?.abhaNumber ?: "" else "Not Linked",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (hasAbha) Color(0xFF2E7D32) else Color(0xFFE65100)
                )
                Text(
                    if (hasAbha) "Linked: ${profile?.linkedHospitals ?: 0} hospitals" else "Tap to link your ABHA",
                    fontSize = 11.sp,
                    color = if (hasAbha) Color(0xFF4CAF50) else Color(0xFFFF9800)
                )
            }

            Icon(
                Icons.Default.KeyboardArrowRight,
                contentDescription = null,
                tint = if (hasAbha) Color(0xFF4CAF50) else Color(0xFFFF9800)
            )
        }
    }
}

@Composable
private fun SettingsCard(
    onPersonalInfoClick: () -> Unit,
    onAddressesClick: () -> Unit,
    onFamilyClick: () -> Unit,
    onEmergencyClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF8F9FA))
    ) {
        Column {
            SettingsMenuItem(Icons.Outlined.Person, "Personal Information", "Name, DOB, Gender", onClick = onPersonalInfoClick)
            HorizontalDivider(color = Color.LightGray.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.LocationOn, "Saved Addresses", "Home, Office", onClick = onAddressesClick)
            HorizontalDivider(color = Color.LightGray.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.FamilyRestroom, "Family Members", "Manage linked profiles", onClick = onFamilyClick)
            HorizontalDivider(color = Color.LightGray.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.ContactEmergency, "Emergency Contacts", "Quick access in emergencies", onClick = onEmergencyClick)
        }
    }
}

@Composable
private fun PreferencesCard(
    onNotificationsClick: () -> Unit,
    onLanguageClick: () -> Unit,
    onAppearanceClick: () -> Unit,
    onPrivacyClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF8F9FA))
    ) {
        Column {
            SettingsMenuItem(Icons.Outlined.Notifications, "Notifications", "Manage alerts and reminders", onClick = onNotificationsClick)
            HorizontalDivider(color = Color.LightGray.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.Language, "Language", "English", onClick = onLanguageClick)
            HorizontalDivider(color = Color.LightGray.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.DarkMode, "Appearance", "Light Mode", onClick = onAppearanceClick)
            HorizontalDivider(color = Color.LightGray.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.Security, "Privacy & Security", "Password, Biometrics, 2FA", onClick = onPrivacyClick)
            HorizontalDivider(color = Color.LightGray.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.CloudSync, "Data & Sync", "Auto-backup enabled", onClick = {})
        }
    }
}

@Composable
private fun SupportCard(
    onSupportClick: () -> Unit,
    onHelpClick: () -> Unit,
    onFeedbackClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF8F9FA))
    ) {
        Column {
            SettingsMenuItem(Icons.Outlined.Headphones, "24/7 Support", "Chat with us anytime", badgeText = "Online", badgeColor = Color(0xFF4CAF50), onClick = onSupportClick)
            HorizontalDivider(color = Color.LightGray.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.HelpOutline, "Help Center", "FAQs & Tutorials", onClick = onHelpClick)
            HorizontalDivider(color = Color.LightGray.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.Feedback, "Send Feedback", "Help us improve", onClick = onFeedbackClick)
            HorizontalDivider(color = Color.LightGray.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.Description, "Terms of Service", "", onClick = {})
            HorizontalDivider(color = Color.LightGray.copy(alpha = 0.3f))
            SettingsMenuItem(Icons.Outlined.PrivacyTip, "Privacy Policy", "", onClick = {})
        }
    }
}

@Composable
private fun SettingsMenuItem(
    icon: ImageVector,
    title: String,
    subtitle: String,
    badgeText: String? = null,
    badgeColor: Color = SwastikPurple,
    onClick: () -> Unit = {}
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(SwastikPurple.copy(alpha = 0.1f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = SwastikPurple, modifier = Modifier.size(22.dp))
        }

        Spacer(modifier = Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(title, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = Color.Black)
            if (subtitle.isNotEmpty()) {
                Text(subtitle, fontSize = 12.sp, color = Color.Gray)
            }
        }

        if (badgeText != null) {
            Surface(color = badgeColor.copy(alpha = 0.15f), shape = RoundedCornerShape(8.dp)) {
                Text(
                    badgeText,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = badgeColor,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }
            Spacer(modifier = Modifier.width(8.dp))
        }

        Icon(Icons.Default.KeyboardArrowRight, contentDescription = null, tint = Color.Gray)
    }
}
