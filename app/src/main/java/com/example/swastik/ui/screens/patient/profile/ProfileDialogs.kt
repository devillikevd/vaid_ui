package com.example.swastik.ui.screens.patient.profile

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.data.local.AppSettingsStore
import com.example.swastik.data.local.NotificationPreferences
import com.example.swastik.data.local.ThemePreference
import com.example.swastik.data.model.*
import com.example.swastik.data.remote.dto.UpdateProfileRequest
import com.example.swastik.ui.theme.*
import com.example.swastik.ui.viewmodel.ProfileUpdateState
import com.example.swastik.utils.ProfileValidation
import androidx.compose.ui.res.stringResource
import com.example.swastik.R

// ==================== EDIT PROFILE DIALOG ====================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditProfileDialog(
    profile: PatientProfile?,
    saveState: ProfileUpdateState = ProfileUpdateState.Idle,
    onDismiss: () -> Unit,
    onSave: (UpdateProfileRequest) -> Unit
) {
    var name by remember { mutableStateOf(profile?.name ?: "") }
    var dateOfBirth by remember { mutableStateOf(profile?.dateOfBirth ?: "") }
    var city by remember { mutableStateOf(profile?.city ?: "") }
    var gender by remember { mutableStateOf(profile?.gender ?: "") }
    var bloodGroup by remember { mutableStateOf(profile?.bloodGroup ?: "") }
    var weight by remember { mutableStateOf(if ((profile?.weight ?: 0f) > 0f) profile?.weight.toString() else "") }
    var height by remember { mutableStateOf(if ((profile?.height ?: 0f) > 0f) profile?.height.toString() else "") }
    var location by remember { mutableStateOf(profile?.location ?: "") }
    var genderExpanded by remember { mutableStateOf(false) }
    var bloodGroupExpanded by remember { mutableStateOf(false) }
    var showDatePicker by remember { mutableStateOf(false) }
    var validationError by remember { mutableStateOf<String?>(null) }
    val isSaving = saveState is ProfileUpdateState.Loading

    LaunchedEffect(profile?.id, profile?.name, profile?.dateOfBirth, profile?.gender, profile?.bloodGroup, profile?.weight, profile?.height, profile?.location, profile?.city) {
        name = profile?.name ?: ""
        dateOfBirth = profile?.dateOfBirth ?: ""
        gender = profile?.gender ?: ""
        bloodGroup = profile?.bloodGroup ?: ""
        weight = if ((profile?.weight ?: 0f) > 0f) profile?.weight.toString() else ""
        height = if ((profile?.height ?: 0f) > 0f) profile?.height.toString() else ""
        location = profile?.location ?: ""
        city = profile?.city ?: ""
        validationError = null
    }

    LaunchedEffect(saveState) {
        if (saveState is ProfileUpdateState.Success) {
            onDismiss()
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.Edit, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(24.dp))
                Spacer(Modifier.width(8.dp))
                Text(stringResource(R.string.edit_profile), fontWeight = FontWeight.Bold)
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
                if (saveState is ProfileUpdateState.Error) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF3E0)),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.ErrorOutline, null, tint = Color(0xFFEF6C00), modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(8.dp))
                            Text(saveState.message, fontSize = 12.sp, color = Color(0xFFEF6C00))
                        }
                    }
                }
                OutlinedTextField(
                    value = name, onValueChange = { name = it },
                    label = { Text(stringResource(R.string.full_name)) },
                    leadingIcon = { Icon(Icons.Outlined.Person, null, modifier = Modifier.size(20.dp)) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true,
                    enabled = !isSaving
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = dateOfBirth.ifBlank { "Date of Birth" },
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("DOB (YYYY-MM-DD)") },
                        modifier = Modifier.weight(1f).clickable { if (!isSaving) showDatePicker = true },
                        shape = RoundedCornerShape(12.dp),
                        enabled = false,
                        colors = OutlinedTextFieldDefaults.colors(
                            disabledTextColor = MaterialTheme.colorScheme.onSurface,
                            disabledBorderColor = MaterialTheme.colorScheme.outline,
                            disabledLeadingIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            disabledTrailingIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            disabledLabelColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            disabledPlaceholderColor = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    )
                    ExposedDropdownMenuBox(
                        expanded = genderExpanded,
                        onExpandedChange = { if (!isSaving) genderExpanded = it },
                        modifier = Modifier.weight(1f)
                    ) {
                        OutlinedTextField(
                            value = gender.replaceFirstChar { it.uppercase() },
                            onValueChange = {},
                            readOnly = true,
                            label = { Text(stringResource(R.string.gender)) },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = genderExpanded) },
                            modifier = Modifier.menuAnchor(),
                            shape = RoundedCornerShape(12.dp),
                            singleLine = true,
                            enabled = !isSaving
                        )
                        ExposedDropdownMenu(expanded = genderExpanded, onDismissRequest = { genderExpanded = false }) {
                            ProfileValidation.GENDER_OPTIONS.forEach { g ->
                                DropdownMenuItem(
                                    text = { Text(g.replaceFirstChar { it.uppercase() }) },
                                    onClick = { gender = g; genderExpanded = false },
                                    enabled = !isSaving
                                )
                            }
                        }
                    }
                }
                ExposedDropdownMenuBox(
                    expanded = bloodGroupExpanded,
                    onExpandedChange = { if (!isSaving) bloodGroupExpanded = it }
                ) {
                    OutlinedTextField(
                        value = bloodGroup.ifEmpty { stringResource(R.string.select_blood_group) },
                        onValueChange = {},
                        readOnly = true,
                        label = { Text(stringResource(R.string.blood_group)) },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = bloodGroupExpanded) },
                        modifier = Modifier.fillMaxWidth().menuAnchor(),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true,
                        enabled = !isSaving
                    )
                    ExposedDropdownMenu(expanded = bloodGroupExpanded, onDismissRequest = { bloodGroupExpanded = false }) {
                        ProfileValidation.BLOOD_GROUP_OPTIONS.forEach { bg ->
                            DropdownMenuItem(
                                text = { Text(bg) },
                                onClick = { bloodGroup = bg; bloodGroupExpanded = false },
                                enabled = !isSaving
                            )
                        }
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = weight, onValueChange = { weight = it },
                        label = { Text(stringResource(R.string.weight_kg)) },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        enabled = !isSaving
                    )
                    OutlinedTextField(
                        value = height, onValueChange = { height = it },
                        label = { Text(stringResource(R.string.height_cm)) },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        enabled = !isSaving
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = location, onValueChange = { location = it },
                        label = { Text(stringResource(R.string.location)) },
                        leadingIcon = { Icon(Icons.Outlined.LocationOn, null, modifier = Modifier.size(20.dp)) },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true,
                        enabled = !isSaving
                    )
                    OutlinedTextField(
                        value = city, onValueChange = { city = it },
                        label = { Text("City") },
                        leadingIcon = { Icon(Icons.Outlined.LocationCity, null, modifier = Modifier.size(20.dp)) },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true,
                        enabled = !isSaving
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val parsedWeight = weight.toFloatOrNull()
                    val parsedHeight = height.toFloatOrNull()

                    validationError = ProfileValidation.validate(
                        name = name,
                        age = null, // age is deprecated, handled via dob
                        weight = parsedWeight,
                        height = parsedHeight,
                        gender = gender.ifBlank { null },
                        bloodGroup = bloodGroup.ifBlank { null }
                    )
                    if (validationError != null) return@Button

                    onSave(
                        UpdateProfileRequest(
                            name = name.ifBlank { null },
                            dateOfBirth = dateOfBirth.ifBlank { null },
                            gender = gender.ifBlank { null },
                            bloodGroup = bloodGroup.ifBlank { null },
                            weight = parsedWeight,
                            height = parsedHeight,
                            location = location.ifBlank { null },
                            city = city.ifBlank { null }
                        )
                    )
                },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                enabled = !isSaving
            ) {
                if (isSaving) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp)
                } else {
                    Text(stringResource(R.string.save_changes))
                }
            }
            if (showDatePicker) {
                val datePickerState = rememberDatePickerState()
                DatePickerDialog(
                    onDismissRequest = { showDatePicker = false },
                    confirmButton = {
                        TextButton(onClick = {
                            datePickerState.selectedDateMillis?.let {
                                val cal = java.util.Calendar.getInstance(java.util.TimeZone.getTimeZone("UTC"))
                                cal.timeInMillis = it
                                val year = cal.get(java.util.Calendar.YEAR)
                                val month = cal.get(java.util.Calendar.MONTH) + 1
                                val day = cal.get(java.util.Calendar.DAY_OF_MONTH)
                                dateOfBirth = String.format("%04d-%02d-%02d", year, month, day)
                            }
                            showDatePicker = false
                        }) {
                            Text("OK")
                        }
                    },
                    dismissButton = {
                        TextButton(onClick = { showDatePicker = false }) {
                            Text("Cancel")
                        }
                    }
                ) {
                    DatePicker(state = datePickerState)
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isSaving) { Text(stringResource(R.string.cancel)) }
        },
        shape = RoundedCornerShape(20.dp)
    )
}

// ==================== LANGUAGE PICKER DIALOG ====================

@Composable
fun LanguagePickerDialog(onDismiss: () -> Unit) {
    val appSettings by AppSettingsStore.settings.collectAsState()
    var selectedTag by remember(appSettings.language) { mutableStateOf(appSettings.language) }
    val options = com.example.swastik.util.LanguageConfig.options
    val context = LocalContext.current

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.Language, null, tint = MaterialTheme.colorScheme.primary)
                Spacer(Modifier.width(8.dp))
                Text(stringResource(R.string.select_language), fontWeight = FontWeight.Bold)
            }
        },
        text = {
            Column {
                options.forEach { lang ->
                    val label = stringResource(lang.labelResId)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { selectedTag = lang.tag }
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(
                            selected = selectedTag == lang.tag,
                            onClick = { selectedTag = lang.tag },
                            colors = RadioButtonDefaults.colors(selectedColor = MaterialTheme.colorScheme.primary)
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(label, fontSize = 15.sp, fontWeight = if (selectedTag == lang.tag) FontWeight.SemiBold else FontWeight.Normal)
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    AppSettingsStore.updateLanguage(selectedTag)
                    val label = context.getString(com.example.swastik.util.LanguageConfig.labelResId(selectedTag))
                    Toast.makeText(context, context.getString(R.string.language_set_to, label), Toast.LENGTH_SHORT).show()
                    onDismiss()
                },
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
            ) { Text(stringResource(R.string.apply)) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.cancel)) } },
        shape = RoundedCornerShape(20.dp)
    )
}

// ==================== APPEARANCE DIALOG ====================

@Composable
fun AppearanceDialog(onDismiss: () -> Unit) {
    val appSettings by AppSettingsStore.settings.collectAsState()
    var selected by remember(appSettings.themePreference) { mutableStateOf(appSettings.themePreference) }
    val context = LocalContext.current
    val colorScheme = MaterialTheme.colorScheme

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.DarkMode, null, tint = colorScheme.primary)
                Spacer(Modifier.width(8.dp))
                Text(stringResource(R.string.appearance), fontWeight = FontWeight.Bold)
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
                        modifier = Modifier.fillMaxWidth().clickable { selected = mode },
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (selected == mode) {
                                colorScheme.primary.copy(alpha = 0.1f)
                            } else {
                                colorScheme.surfaceVariant.copy(alpha = 0.55f)
                            }
                        ),
                        border = if (selected == mode) BorderStroke(1.5.dp, colorScheme.primary) else null
                    ) {
                        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(icon, null, tint = if (selected == mode) colorScheme.primary else colorScheme.onSurfaceVariant)
                            Spacer(Modifier.width(12.dp))
                            Text(label, fontWeight = if (selected == mode) FontWeight.SemiBold else FontWeight.Normal)
                            Spacer(Modifier.weight(1f))
                            if (selected == mode) {
                                Icon(Icons.Default.CheckCircle, null, tint = colorScheme.primary)
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
                    Toast.makeText(context, context.getString(R.string.theme_set_to) + " " + selected.name.lowercase().replaceFirstChar { it.uppercase() }, Toast.LENGTH_SHORT).show()
                    onDismiss()
                },
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = colorScheme.primary)
            ) { Text(stringResource(R.string.apply)) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.cancel)) } },
        shape = RoundedCornerShape(20.dp)
    )
}

// ==================== NOTIFICATION SETTINGS DIALOG ====================

@Composable
fun NotificationSettingsDialog(onDismiss: () -> Unit) {
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
                Icon(Icons.Outlined.Notifications, null, tint = MaterialTheme.colorScheme.primary)
                Spacer(Modifier.width(8.dp))
                Text(stringResource(R.string.notification_settings), fontWeight = FontWeight.Bold)
            }
        },
        text = {
            Column {
                NotifToggleRow(stringResource(R.string.appointment_reminders), appointments) { appointments = it }
                NotifToggleRow(stringResource(R.string.medicine_reminders), medicines) { medicines = it }
                NotifToggleRow(stringResource(R.string.report_ready_alerts), reports) { reports = it }
                NotifToggleRow(stringResource(R.string.promotional_offers), promotions) { promotions = it }
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                NotifToggleRow(stringResource(R.string.sound), sound) { sound = it }
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
                    Toast.makeText(context, context.getString(R.string.notification_prefs_saved), Toast.LENGTH_SHORT).show()
                    onDismiss()
                },
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
            ) { Text(stringResource(R.string.save)) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.cancel)) } },
        shape = RoundedCornerShape(20.dp)
    )
}

@Composable
fun NotifToggleRow(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    val colorScheme = MaterialTheme.colorScheme
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, fontSize = 14.sp, color = colorScheme.onSurface)
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(checkedThumbColor = Color.White, checkedTrackColor = colorScheme.primary)
        )
    }
}

// ==================== PRIVACY & SECURITY DIALOG ====================

@Composable
fun PrivacySecurityDialog(onDismiss: () -> Unit, onChangePassword: () -> Unit) {
    var biometrics by remember { mutableStateOf(false) }
    var twoFactor by remember { mutableStateOf(false) }
    val colorScheme = MaterialTheme.colorScheme

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.Security, null, tint = colorScheme.primary)
                Spacer(Modifier.width(8.dp))
                Text(stringResource(R.string.privacy_security), fontWeight = FontWeight.Bold)
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Card(
                    modifier = Modifier.fillMaxWidth().clickable { onChangePassword() },
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = colorScheme.primaryContainer.copy(alpha = 0.5f))
                ) {
                    Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.Lock, null, tint = colorScheme.primary, modifier = Modifier.size(22.dp))
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(stringResource(R.string.change_password), fontSize = 14.sp, fontWeight = FontWeight.Medium)
                            Text(stringResource(R.string.update_account_password), fontSize = 12.sp, color = colorScheme.onSurfaceVariant)
                        }
                        Icon(Icons.Default.ChevronRight, null, tint = colorScheme.primary)
                    }
                }
                Spacer(Modifier.height(4.dp))
                NotifToggleRow(stringResource(R.string.biometric_login), biometrics) { biometrics = it }
                NotifToggleRow(stringResource(R.string.two_factor_auth), twoFactor) { twoFactor = it }
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                Text(stringResource(R.string.data_privacy), fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(4.dp))
                Text(stringResource(R.string.health_data_encrypted), fontSize = 12.sp, color = colorScheme.onSurface)
                Text(stringResource(R.string.abdm_abha_compliant), fontSize = 12.sp, color = colorScheme.onSurface)
                Text(stringResource(R.string.data_never_shared), fontSize = 12.sp, color = colorScheme.onSurface)
            }
        },
        confirmButton = {
            Button(
                onClick = onDismiss,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = colorScheme.primary)
            ) { Text(stringResource(R.string.done)) }
        },
        shape = RoundedCornerShape(20.dp)
    )
}

// ==================== CHANGE PASSWORD DIALOG ====================

@Composable
fun ChangePasswordDialog(
    saveState: ProfileUpdateState = ProfileUpdateState.Idle,
    onDismiss: () -> Unit,
    onSubmit: (String, String) -> Unit
) {
    var currentPassword by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var showCurrentPwd by remember { mutableStateOf(false) }
    var showNewPwd by remember { mutableStateOf(false) }
    var validationError by remember { mutableStateOf<String?>(null) }
    val isSaving = saveState is ProfileUpdateState.Loading
    val colorScheme = MaterialTheme.colorScheme
    val context = LocalContext.current

    LaunchedEffect(saveState) {
        if (saveState is ProfileUpdateState.Success) {
            onDismiss()
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.Lock, null, tint = colorScheme.primary)
                Spacer(Modifier.width(8.dp))
                Text(stringResource(R.string.change_password), fontWeight = FontWeight.Bold)
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
                if (saveState is ProfileUpdateState.Error) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF3E0)),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.ErrorOutline, null, tint = Color(0xFFEF6C00), modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(8.dp))
                            Text(saveState.message, fontSize = 12.sp, color = Color(0xFFEF6C00))
                        }
                    }
                }
                OutlinedTextField(
                    value = currentPassword,
                    onValueChange = { currentPassword = it; validationError = null },
                    label = { Text(stringResource(R.string.current_password)) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true,
                    enabled = !isSaving,
                    visualTransformation = if (showCurrentPwd) VisualTransformation.None else PasswordVisualTransformation(),
                    trailingIcon = {
                        IconButton(onClick = { showCurrentPwd = !showCurrentPwd }, enabled = !isSaving) {
                            Icon(if (showCurrentPwd) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility, null, modifier = Modifier.size(20.dp))
                        }
                    }
                )
                OutlinedTextField(
                    value = newPassword,
                    onValueChange = { newPassword = it; validationError = null },
                    label = { Text(stringResource(R.string.new_password)) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true,
                    enabled = !isSaving,
                    visualTransformation = if (showNewPwd) VisualTransformation.None else PasswordVisualTransformation(),
                    trailingIcon = {
                        IconButton(onClick = { showNewPwd = !showNewPwd }, enabled = !isSaving) {
                            Icon(if (showNewPwd) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility, null, modifier = Modifier.size(20.dp))
                        }
                    }
                )
                OutlinedTextField(
                    value = confirmPassword,
                    onValueChange = { confirmPassword = it; validationError = null },
                    label = { Text(stringResource(R.string.confirm_new_password)) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true,
                    enabled = !isSaving,
                    visualTransformation = PasswordVisualTransformation()
                )
                Text(stringResource(R.string.password_min_length), fontSize = 11.sp, color = colorScheme.onSurfaceVariant)
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    when {
                        currentPassword.isBlank() -> validationError = context.getString(R.string.enter_current_password)
                        newPassword.length < 8 -> validationError = context.getString(R.string.new_password_min_length)
                        newPassword != confirmPassword -> validationError = context.getString(R.string.passwords_dont_match)
                        currentPassword == newPassword -> validationError = context.getString(R.string.new_password_must_differ)
                        else -> onSubmit(currentPassword, newPassword)
                    }
                },
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = colorScheme.primary),
                enabled = !isSaving && currentPassword.isNotBlank() && newPassword.isNotBlank() && confirmPassword.isNotBlank()
            ) {
                if (isSaving) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        color = Color.White,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text(stringResource(R.string.change_password))
                }
            }
        },
        dismissButton = { TextButton(onClick = onDismiss, enabled = !isSaving) { Text(stringResource(R.string.cancel)) } },
        shape = RoundedCornerShape(20.dp)
    )
}
