package com.example.swastik.ui.screens.patient.tabs

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.example.swastik.R

import com.example.swastik.data.model.*
import com.example.swastik.ui.screens.patient.profile.*
import com.example.swastik.ui.theme.*
import com.example.swastik.ui.viewmodel.PatientDashboardViewModel
import com.example.swastik.ui.viewmodel.ProfileUpdateState
import com.example.swastik.utils.ImageCompressor
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import androidx.compose.material3.MaterialTheme

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun ProfileTabContent(
    modifier: Modifier = Modifier,
    profile: PatientProfile? = null,
    stats: PatientStats? = null,
    unreadNotificationsCount: Int = 0,
    onNotificationClick: () -> Unit = {},
    onLogout: () -> Unit = {},
    onNavigateToVitals: () -> Unit = {},
    onAddressesClick: () -> Unit = {},
    viewModel: PatientDashboardViewModel? = null
) {
    var showEditProfileDialog by remember { mutableStateOf(false) }
    var showPersonalInfoDialog by remember { mutableStateOf(false) }
    var showLanguageDialog by remember { mutableStateOf(false) }

    var showNotificationDialog by remember { mutableStateOf(false) }
    var showGuardianSettingsDialog by remember { mutableStateOf(false) }
    var showFeedbackDialog by remember { mutableStateOf(false) }
    var showEmergencyContactsDialog by remember { mutableStateOf(false) }
    var showFamilyMembersDialog by remember { mutableStateOf(false) }
    var showHelpCenterDialog by remember { mutableStateOf(false) }
    var showQrDialog by remember { mutableStateOf(false) }
    var showChangePasswordDialog by remember { mutableStateOf(false) }
    var showLogoutDialog by remember { mutableStateOf(false) }
    var showFullScreenImage by remember { mutableStateOf<String?>(null) }
    var showPhotoOptions by remember { mutableStateOf(false) }
    var showAIModelsSettings by remember { mutableStateOf(false) }

    val context = LocalContext.current

    // Image picker launcher — compresses image before upload
    val imagePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            try {
                val compressed = ImageCompressor.compressFromUri(context, it)
                if (compressed != null) {
                    val requestBody = compressed.bytes.toRequestBody(compressed.mimeType.toMediaTypeOrNull())
                    val imagePart = MultipartBody.Part.createFormData("image", "profile.jpg", requestBody)
                    viewModel?.uploadProfileImage(imagePart)
                } else {
                    val inputStream = context.contentResolver.openInputStream(it)
                    val bytes = inputStream?.readBytes() ?: return@let
                    inputStream.close()
                    val requestBody = bytes.toRequestBody("image/*".toMediaTypeOrNull())
                    val imagePart = MultipartBody.Part.createFormData("image", "profile.jpg", requestBody)
                    viewModel?.uploadProfileImage(imagePart)
                }
            } catch (e: Exception) {
                Toast.makeText(context, context.getString(R.string.failed_to_process_image), Toast.LENGTH_SHORT).show()
            }
        }
    }

    val listState = rememberLazyListState()

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {


        Card(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 8.dp),
            shape = RoundedCornerShape(topStart = 30.dp, topEnd = 30.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.background),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
        ) {
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(top = 24.dp),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    val scrollOffset = if (listState.firstVisibleItemIndex == 0) listState.firstVisibleItemScrollOffset.toFloat() else 1000f
                    ProfileInfoCard(
                        modifier = Modifier.graphicsLayer {
                            translationY = scrollOffset * 0.4f
                            alpha = 1f - (scrollOffset / 600f).coerceIn(0f, 1f)
                        },
                        profile = profile,
                        onEditClick = { showEditProfileDialog = true },
                        onShareClick = {
                            val shareText = buildString {
                                append("${profile?.name ?: context.getString(R.string.default_user_name)}\n")
                                if (profile?.phoneNumber?.isNotEmpty() == true) {
                                    append(context.getString(R.string.profile_share_phone, profile.phoneNumber))
                                    append("\n")
                                }
                                if (profile?.email?.isNotEmpty() == true) {
                                    append(context.getString(R.string.profile_share_email, profile.email))
                                    append("\n")
                                }
                                if (profile?.bloodGroup?.isNotEmpty() == true) {
                                    append(context.getString(R.string.profile_share_blood, profile.bloodGroup))
                                    append("\n")
                                }
                                append("\n")
                                append(context.getString(R.string.profile_share_footer))
                            }
                            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                putExtra(Intent.EXTRA_TEXT, shareText)
                            }
                            context.startActivity(Intent.createChooser(shareIntent, context.getString(R.string.share_profile)))
                        },
                        onCameraClick = { showPhotoOptions = true },
                        onImageClick = { showFullScreenImage = it }
                    )
                }
                item { ProfileCompletionCard(profile = profile) }
                item { QuickStatsSection(stats = stats ?: PatientStats()) }

                item {
                    SectionTitleWithBadge(
                        stringResource(R.string.health_identity),
                        if (profile?.isVerified == true) stringResource(R.string.verified) else stringResource(R.string.not_verified),
                        if (profile?.isVerified == true) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                item { 
                    HealthIdCard(
                        profile = profile,
                        onClick = {
                            Toast.makeText(context, "ABHA Linking is currently in development.", Toast.LENGTH_SHORT).show()
                        }
                    ) 
                }
                item { Text(stringResource(R.string.account_settings), fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface) }
                item {
                    SettingsCard(
                        onPersonalInfoClick = { showPersonalInfoDialog = true },
                        onAddressesClick = onAddressesClick,
                        onFamilyClick = { showFamilyMembersDialog = true },
                        onEmergencyClick = { showEmergencyContactsDialog = true }
                    )
                }
                /*
                item {
                    SettingsItem(
                        title = "AI Diagnostics Models",
                        subtitle = "Manage downloaded AI models for local inference",
                        icon = Icons.Outlined.CloudDownload,
                        onClick = { showAIModelsSettings = true },
                        iconColor = MaterialTheme.colorScheme.primary
                    )
                }
                */
                item { Text(stringResource(R.string.preferences), fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface) }
                item {
                    PreferencesCard(
                        onNotificationsClick = { showNotificationDialog = true },
                        onLanguageClick = { showLanguageDialog = true },
                        onGuardianClick = { showGuardianSettingsDialog = true }
                    )
                }
                item { Text(stringResource(R.string.support_legal), fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface) }
                item {
                    SupportCard(
                        onSupportClick = {
                            Toast.makeText(context, context.getString(R.string.connecting_support_agent), Toast.LENGTH_SHORT).show()
                        },
                        onHelpClick = { showHelpCenterDialog = true },
                        onFeedbackClick = { showFeedbackDialog = true },
                        onTermsClick = {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://vaididea.in/terms"))
                            context.startActivity(intent)
                        },
                        onPrivacyPolicyClick = {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://vaididea.in/privacy"))
                            context.startActivity(intent)
                        }
                    )
                }
                item { Spacer(modifier = Modifier.height(8.dp)) }
                item {
                    Button(
                        onClick = { showLogoutDialog = true },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer,
                            contentColor = MaterialTheme.colorScheme.onErrorContainer
                        )
                    ) {
                        Icon(Icons.Outlined.Logout, contentDescription = null, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(stringResource(R.string.logout), fontWeight = FontWeight.Medium)
                    }
                }
                item { Spacer(modifier = Modifier.height(16.dp)) }
                item {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(stringResource(R.string.app_version), fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(stringResource(R.string.made_with_love), fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f))
                    }
                }
                item { Spacer(modifier = Modifier.height(16.dp)) }
            }
        }
    }

    // ── DIALOGS ─────────────────────────────────────────────────

    if (showEditProfileDialog || showPersonalInfoDialog) {
        EditProfileDialog(
            profile = profile,
            saveState = viewModel?.profileUpdateState?.collectAsState()?.value ?: ProfileUpdateState.Idle,
            onDismiss = { showEditProfileDialog = false; showPersonalInfoDialog = false },
            onSave = { request ->
                viewModel?.updateProfile(request)
            }
        )
    }

    if (showLanguageDialog) {
        LanguagePickerDialog(onDismiss = { showLanguageDialog = false })
    }





    if (showNotificationDialog) {
        NotificationSettingsDialog(onDismiss = { showNotificationDialog = false })
    }

    if (showAIModelsSettings) {
        AIModelsSettingsDialog(onDismiss = { showAIModelsSettings = false })
    }

    if (showGuardianSettingsDialog) {
        com.example.swastik.ui.screens.patient.profile.GuardianSettingsDialog(onDismiss = { showGuardianSettingsDialog = false })
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
            saveState = viewModel?.changePasswordState?.collectAsState()?.value ?: ProfileUpdateState.Idle,
            onDismiss = {
                showChangePasswordDialog = false
                viewModel?.resetChangePasswordState()
            },
            onSubmit = { currentPwd, newPwd ->
                viewModel?.changePassword(currentPwd, newPwd)
            }
        )
    }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.Logout, null, tint = MaterialTheme.colorScheme.error)
                    Spacer(Modifier.width(8.dp))
                    Text(stringResource(R.string.logout_title), fontWeight = FontWeight.Bold)
                }
            },
            text = {
                Text(
                    stringResource(R.string.logout_message),
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        showLogoutDialog = false
                        if (viewModel != null) {
                            viewModel.logout(onComplete = onLogout)
                        } else {
                            onLogout()
                        }
                    },
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error, contentColor = MaterialTheme.colorScheme.onError)
                ) { Text(stringResource(R.string.logout)) }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) { Text(stringResource(R.string.cancel)) }
            },
            shape = RoundedCornerShape(20.dp)
        )
    }

    if (showPhotoOptions) {
        AlertDialog(
            onDismissRequest = { showPhotoOptions = false },
            title = { Text(stringResource(R.string.profile_photo), fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    ListItem(
                        headlineContent = { Text(stringResource(R.string.change_photo)) },
                        leadingContent = { Icon(Icons.Outlined.PhotoCamera, null) },
                        modifier = Modifier.clickable {
                            showPhotoOptions = false
                            imagePickerLauncher.launch("image/*")
                        }
                    )
                    if (profile?.profileImageUrl?.isNotEmpty() == true) {
                        ListItem(
                            headlineContent = { Text(stringResource(R.string.remove_photo), color = MaterialTheme.colorScheme.error) },
                            leadingContent = { Icon(Icons.Outlined.Delete, null, tint = MaterialTheme.colorScheme.error) },
                            modifier = Modifier.clickable {
                                showPhotoOptions = false
                                viewModel?.deleteProfileImage()
                            }
                        )
                    }
                }
            },
            confirmButton = {},
            dismissButton = { TextButton(onClick = { showPhotoOptions = false }) { Text(stringResource(R.string.cancel)) } }
        )
    }

    if (showFullScreenImage != null) {
        androidx.compose.ui.window.Dialog(
            onDismissRequest = { showFullScreenImage = null },
            properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black)
                    .clickable { showFullScreenImage = null },
                contentAlignment = Alignment.Center
            ) {
                AsyncImage(
                    model = ImageRequest.Builder(LocalContext.current)
                        .data(showFullScreenImage)
                        .crossfade(true)
                        .build(),
                    contentDescription = "Full Profile Photo",
                    modifier = Modifier.fillMaxWidth(),
                    contentScale = androidx.compose.ui.layout.ContentScale.Fit
                )
                IconButton(
                    onClick = { showFullScreenImage = null },
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(16.dp)
                ) {
                    Icon(Icons.Default.Close, null, tint = MaterialTheme.colorScheme.onPrimary)
                }
            }
        }
    }

    // ── Toast observers for async operations ────────────────────
    val updateState = viewModel?.profileUpdateState?.collectAsState()
    LaunchedEffect(updateState?.value) {
        when (updateState?.value) {
            is ProfileUpdateState.Success -> {
                Toast.makeText(
                    context,
                    (updateState.value as ProfileUpdateState.Success).message,
                    Toast.LENGTH_SHORT
                ).show()
                showEditProfileDialog = false
                showPersonalInfoDialog = false
                viewModel?.resetProfileUpdateState()
            }
            is ProfileUpdateState.Error -> {
                Toast.makeText(context, (updateState.value as ProfileUpdateState.Error).message, Toast.LENGTH_SHORT).show()
                viewModel?.resetProfileUpdateState()
            }
            else -> {}
        }
    }

    val imageUploadState = viewModel?.imageUploadState?.collectAsState()
    LaunchedEffect(imageUploadState?.value) {
        when (imageUploadState?.value) {
            is ProfileUpdateState.Success -> {
                Toast.makeText(
                    context,
                    (imageUploadState.value as ProfileUpdateState.Success).message,
                    Toast.LENGTH_SHORT
                ).show()
                viewModel?.resetImageUploadState()
            }
            is ProfileUpdateState.Error -> {
                Toast.makeText(context, (imageUploadState?.value as ProfileUpdateState.Error).message, Toast.LENGTH_SHORT).show()
                viewModel?.resetImageUploadState()
            }
            else -> {}
        }
    }

    val changePwdState = viewModel?.changePasswordState?.collectAsState()
    LaunchedEffect(changePwdState?.value) {
        when (changePwdState?.value) {
            is ProfileUpdateState.Success -> {
                Toast.makeText(
                    context,
                    (changePwdState.value as ProfileUpdateState.Success).message,
                    Toast.LENGTH_SHORT
                ).show()
                showChangePasswordDialog = false
                viewModel?.resetChangePasswordState()
            }
            is ProfileUpdateState.Error -> {
                Toast.makeText(context, (changePwdState?.value as ProfileUpdateState.Error).message, Toast.LENGTH_SHORT).show()
            }
            else -> {}
        }
    }
}

@Composable
private fun SettingsItem(
    title: String,
    subtitle: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit,
    iconColor: Color = MaterialTheme.colorScheme.primary
) {
    Surface(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .background(iconColor.copy(alpha = 0.1f), RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = iconColor, modifier = Modifier.size(24.dp))
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(title, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                Text(subtitle, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Icon(
                Icons.Outlined.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.outlineVariant,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

