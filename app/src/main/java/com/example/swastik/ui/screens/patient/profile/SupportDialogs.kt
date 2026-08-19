package com.example.swastik.ui.screens.patient.profile

import android.content.Intent
import android.graphics.Bitmap
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import kotlinx.coroutines.launch
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.data.model.*
import com.example.swastik.data.local.AppSettingsStore
import com.example.swastik.ui.theme.*
import com.example.swastik.ui.viewmodel.PatientDashboardViewModel
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.Surface
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.res.stringResource
import com.example.swastik.R
import androidx.compose.material3.MaterialTheme
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.hilt.navigation.compose.hiltViewModel
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileOutputStream

// ==================== FEEDBACK DIALOG ====================

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun FeedbackDialog(
    onDismiss: () -> Unit,
    viewModel: PatientDashboardViewModel = hiltViewModel()
) {
    val colorScheme = MaterialTheme.colorScheme
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    var isSubmitting by remember { mutableStateOf(false) }

    // Overall rating
    var overallRating by remember { mutableIntStateOf(0) }

    // Category chips
    val categories = listOf("App Experience", "Doctor Consultation", "Bug Report", "Feature Request", "Payment Issue", "Other")
    var selectedCategory by remember { mutableStateOf("") }

    // Aspect ratings
    var easeOfUseRating by remember { mutableIntStateOf(0) }
    var doctorExperienceRating by remember { mutableIntStateOf(0) }
    var appSpeedRating by remember { mutableIntStateOf(0) }
    var supportRating by remember { mutableIntStateOf(0) }

    // NPS: Would you recommend?
    var wouldRecommend by remember { mutableStateOf<Boolean?>(null) }

    // Detailed feedback text
    var feedbackText by remember { mutableStateOf("") }

    // Attached screenshot URI
    var attachedScreenshot by remember { mutableStateOf<Uri?>(null) }
    val imagePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        attachedScreenshot = uri
    }

    // Contact permission
    var allowContact by remember { mutableStateOf(false) }

    val isFormValid = overallRating > 0 && selectedCategory.isNotEmpty()

    androidx.compose.ui.window.Dialog(
        onDismissRequest = onDismiss,
        properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(modifier = Modifier.fillMaxSize(), color = colorScheme.background) {
            Column(modifier = Modifier.fillMaxSize()) {
                TopAppBar(
                    title = {
                        Column {
                            Text("Send Feedback", fontWeight = FontWeight.Bold, fontSize = 20.sp)
                            Text("Help us improve Vaididea", fontSize = 12.sp, color = colorScheme.onSurfaceVariant)
                        }
                    },
                    navigationIcon = {
                        IconButton(onClick = onDismiss) {
                            Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = colorScheme.background)
                )

                androidx.compose.foundation.lazy.LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 40.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {

                    // --- Overall Rating ---
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = colorScheme.surface),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("Overall Experience", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                                Spacer(Modifier.height(4.dp))
                                Text(
                                    when (overallRating) {
                                        1 -> "😞 Poor"
                                        2 -> "😐 Fair"
                                        3 -> "🙂 Good"
                                        4 -> "😊 Very Good"
                                        5 -> "🤩 Excellent!"
                                        else -> "Tap a star to rate"
                                    },
                                    fontSize = 14.sp,
                                    color = if (overallRating > 0) colorScheme.primary else colorScheme.onSurfaceVariant,
                                    fontWeight = if (overallRating > 0) FontWeight.Medium else FontWeight.Normal
                                )
                                Spacer(Modifier.height(8.dp))
                                Row(
                                    horizontalArrangement = Arrangement.Center,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    (1..5).forEach { star ->
                                        IconButton(onClick = { overallRating = star }, modifier = Modifier.size(48.dp)) {
                                            Icon(
                                                if (star <= overallRating) Icons.Default.Star else Icons.Outlined.StarBorder,
                                                contentDescription = "Star $star",
                                                tint = if (star <= overallRating) Color(0xFFFFC107) else colorScheme.outline,
                                                modifier = Modifier.size(36.dp)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // --- Feedback Category ---
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = colorScheme.surface),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text("What is your feedback about?", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                                Spacer(Modifier.height(12.dp))
                                androidx.compose.foundation.layout.FlowRow(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    categories.forEach { cat ->
                                        val selected = selectedCategory == cat
                                        FilterChip(
                                            selected = selected,
                                            onClick = { selectedCategory = if (selected) "" else cat },
                                            label = { Text(cat, fontSize = 13.sp) },
                                            leadingIcon = if (selected) {
                                                { Icon(Icons.Default.Check, null, modifier = Modifier.size(16.dp)) }
                                            } else null,
                                            colors = FilterChipDefaults.filterChipColors(
                                                selectedContainerColor = colorScheme.primaryContainer,
                                                selectedLabelColor = colorScheme.primary
                                            )
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // --- Aspect Ratings ---
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = colorScheme.surface),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                Text("Rate specific aspects", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                                Text("Optional but helps us improve faster", fontSize = 12.sp, color = colorScheme.onSurfaceVariant)

                                listOf(
                                    Triple("Ease of Use", easeOfUseRating, { r: Int -> easeOfUseRating = r }),
                                    Triple("Doctor Experience", doctorExperienceRating, { r: Int -> doctorExperienceRating = r }),
                                    Triple("App Speed", appSpeedRating, { r: Int -> appSpeedRating = r }),
                                    Triple("Customer Support", supportRating, { r: Int -> supportRating = r })
                                ).forEach { (label, rating, setRating) ->
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(label, fontSize = 13.sp, modifier = Modifier.weight(1f), color = colorScheme.onSurface)
                                        Row {
                                            (1..5).forEach { star ->
                                                Icon(
                                                    if (star <= rating) Icons.Default.Star else Icons.Outlined.StarBorder,
                                                    contentDescription = null,
                                                    tint = if (star <= rating) Color(0xFFFFC107) else colorScheme.outline,
                                                    modifier = Modifier.size(22.dp).clickable { setRating(star) }
                                                )
                                                Spacer(Modifier.width(2.dp))
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // --- Would you recommend? ---
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = colorScheme.surface),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text("Would you recommend Vaididea to others?", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                                Spacer(Modifier.height(12.dp))
                                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    listOf(true to "👍  Yes", false to "👎  No").forEach { (value, label) ->
                                        val selected = wouldRecommend == value
                                        OutlinedButton(
                                            onClick = { wouldRecommend = if (selected) null else value },
                                            modifier = Modifier.weight(1f),
                                            shape = RoundedCornerShape(12.dp),
                                            colors = ButtonDefaults.outlinedButtonColors(
                                                containerColor = if (selected) colorScheme.primaryContainer else colorScheme.surface,
                                                contentColor = if (selected) colorScheme.primary else colorScheme.onSurface
                                            ),
                                            border = androidx.compose.foundation.BorderStroke(
                                                1.5.dp,
                                                if (selected) colorScheme.primary else colorScheme.outline.copy(alpha = 0.4f)
                                            )
                                        ) {
                                            Text(label, fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // --- Detailed Feedback ---
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = colorScheme.surface),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text("Tell us more (Optional)", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                                Spacer(Modifier.height(8.dp))
                                OutlinedTextField(
                                    value = feedbackText,
                                    onValueChange = { if (it.length <= 500) feedbackText = it },
                                    placeholder = { Text("Share your thoughts, suggestions, or report an issue...", fontSize = 13.sp) },
                                    modifier = Modifier.fillMaxWidth().height(130.dp),
                                    shape = RoundedCornerShape(12.dp),
                                    maxLines = 8,
                                    supportingText = { Text("${feedbackText.length}/500", fontSize = 11.sp, modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.End) }
                                )
                                Spacer(Modifier.height(12.dp))
                                
                                // Screenshot Attachment
                                if (attachedScreenshot == null) {
                                    OutlinedButton(
                                        onClick = { imagePickerLauncher.launch("image/*") },
                                        modifier = Modifier.fillMaxWidth(),
                                        shape = RoundedCornerShape(12.dp)
                                    ) {
                                        Icon(Icons.Outlined.Image, contentDescription = "Attach Screenshot", modifier = Modifier.size(18.dp))
                                        Spacer(Modifier.width(8.dp))
                                        Text("Attach Screenshot")
                                    }
                                } else {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .background(colorScheme.primaryContainer.copy(alpha = 0.5f), RoundedCornerShape(8.dp))
                                            .padding(12.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Icon(Icons.Default.Image, contentDescription = null, tint = colorScheme.primary)
                                        Spacer(Modifier.width(8.dp))
                                        Text("Screenshot attached", modifier = Modifier.weight(1f), fontSize = 13.sp, color = colorScheme.primary, fontWeight = FontWeight.Medium)
                                        IconButton(onClick = { attachedScreenshot = null }, modifier = Modifier.size(24.dp)) {
                                            Icon(Icons.Default.Close, contentDescription = "Remove Screenshot", tint = colorScheme.primary)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // --- Contact Permission ---
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = colorScheme.surface),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(16.dp).fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("Allow us to contact you", fontWeight = FontWeight.Medium, fontSize = 14.sp)
                                    Text("We may reach out to resolve your issue faster", fontSize = 12.sp, color = colorScheme.onSurfaceVariant)
                                }
                                Switch(
                                    checked = allowContact,
                                    onCheckedChange = { allowContact = it },
                                    colors = SwitchDefaults.colors(checkedTrackColor = colorScheme.primary)
                                )
                            }
                        }
                    }

                    // --- Submit Button ---
                    item {
                        Button(
                            onClick = {
                                if (isFormValid) {
                                    isSubmitting = true
                                    coroutineScope.launch {
                                        var tempFile: File? = null
                                        if (attachedScreenshot != null) {
                                            try {
                                                val inputStream = context.contentResolver.openInputStream(attachedScreenshot!!)
                                                if (inputStream != null) {
                                                    tempFile = File.createTempFile("feedback_", ".jpg", context.cacheDir)
                                                    val outputStream = FileOutputStream(tempFile)
                                                    inputStream.copyTo(outputStream)
                                                    inputStream.close()
                                                    outputStream.close()
                                                }
                                            } catch (e: Exception) {
                                                e.printStackTrace()
                                            }
                                        }

                                        val result = viewModel.submitFeedback(
                                            rating = overallRating,
                                            category = selectedCategory,
                                            feedbackText = feedbackText,
                                            allowContact = allowContact,
                                            screenshotFile = tempFile
                                        )

                                        isSubmitting = false
                                        if (result is com.example.swastik.data.repository.Result.Success) {
                                            Toast.makeText(context, "Thank you! Your feedback has been sent to our developer 🙏", Toast.LENGTH_LONG).show()
                                            onDismiss()
                                        } else {
                                            Toast.makeText(context, "Feedback saved locally. It will sync when backend is ready.", Toast.LENGTH_LONG).show()
                                            onDismiss()
                                        }
                                    }
                                }
                            },
                            enabled = isFormValid && !isSubmitting,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = colorScheme.primary)
                        ) {
                            if (isSubmitting) {
                                CircularProgressIndicator(color = colorScheme.onPrimary, modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                            } else {
                                Icon(Icons.Outlined.Send, contentDescription = null, modifier = Modifier.size(18.dp))
                            }
                            Spacer(Modifier.width(8.dp))
                            Text(if (isSubmitting) "Submitting..." else "Submit Feedback", fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                        }
                        if (!isFormValid) {
                            Spacer(Modifier.height(4.dp))
                            Text(
                                "Please give an overall rating and select a category to submit",
                                fontSize = 11.sp,
                                color = colorScheme.onSurfaceVariant,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                }
            }
        }
    }
}


// ==================== FAQ DIALOG ====================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HelpCenterDialog(onDismiss: () -> Unit) {
    val colorScheme = MaterialTheme.colorScheme

    data class FaqCategory(val title: String, val icon: androidx.compose.ui.graphics.vector.ImageVector, val faqs: List<Pair<String, String>>)

    val categories = listOf(
        FaqCategory(
            title = "Getting Started",
            icon = Icons.Outlined.RocketLaunch,
            faqs = listOf(
                "How do I create an account?" to "Download the Vaididea app, tap 'Sign Up', enter your phone number, and verify via OTP. Fill in your basic details to complete registration.",
                "How do I complete my profile?" to "Go to Profile tab → tap your profile card → tap the Edit icon. Fill in your name, date of birth, gender, blood group, height, weight, and add a profile photo. A complete profile helps doctors serve you better.",
                "Is Vaididea free to use?" to "Basic registration and profile creation is free. Consultation fees vary by doctor and type (video/in-person). You can see fees clearly before booking any appointment."
            )
        ),
        FaqCategory(
            title = "Appointments & Consultations",
            icon = Icons.Outlined.CalendarMonth,
            faqs = listOf(
                "How do I book an appointment?" to "Go to the Home tab and tap on any doctor card, or use the Search feature. Select your preferred time slot and confirm the booking.",
                "How does video consultation work?" to "After booking a video consultation, you'll receive a reminder. At the scheduled time, open the app and tap 'Join Call' in your appointments section. Make sure your camera and microphone permissions are enabled.",
                "Can I reschedule or cancel an appointment?" to "Yes. Go to your Appointments tab, find the booking, and tap 'Reschedule' or 'Cancel'. Cancellations must be done at least 2 hours before the appointment to avoid charges.",
                "How do I choose the right doctor?" to "Use the filter options on the Home tab to filter by specialty (e.g., General Physician, Cardiologist). You can also see doctor ratings, experience years, and consultation fees before booking.",
                "What happens if a doctor doesn't show up?" to "In case a doctor misses a session, you'll receive a full refund or the option to reschedule. Contact our 24/7 support from Profile → Support & Legal."
            )
        ),
        FaqCategory(
            title = "Health Records & ABHA",
            icon = Icons.Outlined.FolderShared,
            faqs = listOf(
                "What is ABHA and why should I link it?" to "ABHA (Ayushman Bharat Health Account) is your unique 14-digit health ID issued by the Government of India. Linking it lets you access all your health records, prescriptions, and reports across hospitals in one place.",
                "How do I link my ABHA number?" to "Go to Profile tab → Health Identity card → tap it. ABHA linking is currently in development and will be available soon.",
                "Are my health records safe?" to "Yes. All data is encrypted with bank-grade security (AES-256). We are ABDM (Ayushman Bharat Digital Mission) compliant and follow all government data protection norms.",
                "Can I share my health records with a doctor?" to "Yes. During a consultation, you can share your health card QR code from Profile → tap the QR icon. Doctors can scan it to access your records with your consent."
            )
        ),
        FaqCategory(
            title = "Family & Emergency",
            icon = Icons.Outlined.FamilyRestroom,
            faqs = listOf(
                "How do I add family members?" to "Go to Profile tab → tap your profile card → scroll down to 'Family Members' → tap '+ Add Family Member'. You can add spouse, children, and parents to manage their health from one account.",
                "How do I add an emergency contact?" to "Go to Profile → tap your profile card → scroll to 'Emergency Contacts' → tap '+ Add Emergency Contact'. Add a trusted person who can be reached in emergencies.",
                "Can my family members have their own profiles?" to "Each family member you add has their own section. In future updates, each member will have a separate health record and appointment history.",
                "What is Guardian Mode?" to "Guardian Mode (found in Preferences → Guardian Settings) allows a caretaker to monitor a patient's health stats, receive fall detection alerts, and access SOS features — ideal for elderly patients."
            )
        ),
        FaqCategory(
            title = "Payments & Prescriptions",
            icon = Icons.Outlined.Receipt,
            faqs = listOf(
                "What payment methods are accepted?" to "We accept UPI, credit/debit cards, and net banking. All payments are secured via Razorpay.",
                "How do I get my prescription?" to "After a consultation, your doctor will issue a digital prescription. You'll find it in the Appointments tab under the completed consultation. You can download or share it.",
                "Can I get a refund?" to "Refunds are processed within 5-7 business days if a doctor cancels or misses a session. For patient-initiated cancellations, refer to our refund policy at vaididea.in/refunds."
            )
        ),
        FaqCategory(
            title = "Account & Privacy",
            icon = Icons.Outlined.Security,
            faqs = listOf(
                "How do I change my password?" to "Go to Profile tab → scroll down to Account Settings → tap 'Change Password'. You'll need to enter your current password to set a new one.",
                "How do I update my phone number or email?" to "Currently, phone number changes require contacting our support team for verification. Email can be updated from Profile → Edit.",
                "How do I delete my account?" to "Contact our support team via Profile → Support & Legal → 24/7 Support. Account deletion is permanent and removes all your data.",
                "Who can see my profile and data?" to "Only you and doctors you consult with (during active consultations) can view your data. We never sell or share your data with third parties. See our full Privacy Policy at vaididea.in/privacy."
            )
        )
    )

    var expandedCategory by remember { mutableIntStateOf(-1) }
    var expandedFaq by remember { mutableIntStateOf(-1) }

    androidx.compose.ui.window.Dialog(
        onDismissRequest = onDismiss,
        properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = colorScheme.background
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                TopAppBar(
                    title = {
                        Column {
                            Text("FAQ", fontWeight = FontWeight.Bold, fontSize = 20.sp)
                            Text("Frequently Asked Questions", fontSize = 12.sp, color = colorScheme.onSurfaceVariant)
                        }
                    },
                    navigationIcon = {
                        IconButton(onClick = onDismiss) {
                            Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = colorScheme.background)
                )

                androidx.compose.foundation.lazy.LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    categories.forEachIndexed { catIndex, category ->
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = colorScheme.surface),
                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                            ) {
                                Column {
                                    // Category Header
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable {
                                                expandedCategory = if (expandedCategory == catIndex) -1 else catIndex
                                                expandedFaq = -1
                                            }
                                            .padding(16.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(40.dp)
                                                .clip(RoundedCornerShape(10.dp))
                                                .background(colorScheme.primaryContainer),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(category.icon, null, tint = colorScheme.primary, modifier = Modifier.size(22.dp))
                                        }
                                        Spacer(Modifier.width(12.dp))
                                        Text(
                                            category.title,
                                            fontWeight = FontWeight.SemiBold,
                                            fontSize = 16.sp,
                                            modifier = Modifier.weight(1f)
                                        )
                                        Icon(
                                            if (expandedCategory == catIndex) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                            null,
                                            tint = colorScheme.primary
                                        )
                                    }

                                    // FAQs inside category
                                    if (expandedCategory == catIndex) {
                                        HorizontalDivider(color = colorScheme.outline.copy(alpha = 0.15f))
                                        category.faqs.forEachIndexed { faqIdx, (question, answer) ->
                                            val globalIdx = catIndex * 100 + faqIdx
                                            Column(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .clickable {
                                                        expandedFaq = if (expandedFaq == globalIdx) -1 else globalIdx
                                                    }
                                                    .background(
                                                        if (expandedFaq == globalIdx) colorScheme.primaryContainer.copy(alpha = 0.3f)
                                                        else colorScheme.surface
                                                    )
                                                    .padding(horizontal = 16.dp, vertical = 12.dp)
                                            ) {
                                                Row(verticalAlignment = Alignment.CenterVertically) {
                                                    Text(
                                                        "Q",
                                                        fontSize = 11.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        color = colorScheme.primary,
                                                        modifier = Modifier
                                                            .background(colorScheme.primaryContainer, RoundedCornerShape(4.dp))
                                                            .padding(horizontal = 5.dp, vertical = 2.dp)
                                                    )
                                                    Spacer(Modifier.width(8.dp))
                                                    Text(
                                                        question,
                                                        fontSize = 13.sp,
                                                        fontWeight = FontWeight.Medium,
                                                        modifier = Modifier.weight(1f),
                                                        color = colorScheme.onSurface
                                                    )
                                                    Icon(
                                                        if (expandedFaq == globalIdx) Icons.Default.ExpandLess else Icons.Default.ChevronRight,
                                                        null,
                                                        tint = colorScheme.onSurfaceVariant,
                                                        modifier = Modifier.size(18.dp)
                                                    )
                                                }
                                                if (expandedFaq == globalIdx) {
                                                    Spacer(Modifier.height(8.dp))
                                                    Text(
                                                        answer,
                                                        fontSize = 13.sp,
                                                        color = colorScheme.onSurfaceVariant,
                                                        lineHeight = 20.sp
                                                    )
                                                }
                                            }
                                            if (faqIdx < category.faqs.size - 1) {
                                                HorizontalDivider(
                                                    modifier = Modifier.padding(horizontal = 16.dp),
                                                    color = colorScheme.outline.copy(alpha = 0.1f)
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = colorScheme.primaryContainer.copy(alpha = 0.4f))
                        ) {
                            Row(
                                modifier = Modifier.padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Outlined.Headphones, null, tint = colorScheme.primary)
                                Spacer(Modifier.width(12.dp))
                                Column {
                                    Text("Still need help?", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                                    Text("Contact our 24/7 support team", fontSize = 12.sp, color = colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }
                    item { Spacer(Modifier.height(24.dp)) }
                }
            }
        }
    }
}

// ==================== QR CODE DIALOG ====================

@Composable
fun QrCodeDialog(
    profile: PatientProfile?,
    viewModel: PatientDashboardViewModel?,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val healthCardState by viewModel?.healthCardState?.collectAsState()
        ?: remember { mutableStateOf(PatientDashboardViewModel.HealthCardState()) }
    val formattedExpiry = remember(healthCardState.expiresAt) {
        healthCardState.expiresAt?.let { expiresAt ->
            runCatching {
                java.time.OffsetDateTime.parse(expiresAt)
                    .toLocalDateTime()
                    .toString()
                    .replace('T', ' ')
            }.getOrElse { expiresAt }
        }
    }

    var includeGuardianAnalytics by remember { mutableStateOf(false) }
    val appSettings by AppSettingsStore.settings.collectAsState()
    val guardianShareAllowed = appSettings.guardianEnabled &&
        appSettings.guardianConsentAccepted &&
        appSettings.guardianFeatures.doctorQrSharing
    val scope = rememberCoroutineScope()

    LaunchedEffect(guardianShareAllowed) {
        if (!guardianShareAllowed) includeGuardianAnalytics = false
    }

    LaunchedEffect(viewModel, healthCardState.hasCheckedStatus, healthCardState.isLoading) {
        if (viewModel != null && !healthCardState.hasCheckedStatus && !healthCardState.isLoading) {
            viewModel.checkHealthCardStatus()
        }
    }

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
        } catch (_: Exception) { null }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.QrCode2, null, tint = SwastikPrimary)
                Spacer(Modifier.width(8.dp))
                Text(stringResource(R.string.health_qr_code), fontWeight = FontWeight.Bold)
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
                        .background(MaterialTheme.colorScheme.surface)
                        .border(2.dp, SwastikPrimary.copy(alpha = 0.3f), RoundedCornerShape(16.dp))
                        .padding(12.dp),
                    contentAlignment = Alignment.Center
                ) {
                    when {
                        healthCardState.isLoading -> {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                CircularProgressIndicator(modifier = Modifier.size(48.dp), color = SwastikPrimary)
                                Spacer(Modifier.height(8.dp))
                                Text(stringResource(R.string.checking_health_card), fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                                Icon(Icons.Outlined.QrCode2, null, tint = MaterialTheme.colorScheme.outlineVariant, modifier = Modifier.size(60.dp))
                                Text(stringResource(R.string.tap_generate_below), fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }

                Spacer(Modifier.height(12.dp))
                Text(profile?.name ?: "Patient", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                if (profile?.abhaNumber?.isNotEmpty() == true) {
                    Text("ABHA: ${profile.abhaNumber}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }

                if (healthCardState.hasActiveCard && healthCardState.expiresAt != null) {
                    Spacer(Modifier.height(8.dp))
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) {
                        Icon(Icons.Outlined.Schedule, null, tint = SwastikPrimary, modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Valid until $formattedExpiry", fontSize = 11.sp, color = SwastikPrimary)
                    }
                } else if (healthCardState.hasActiveCard) {
                    Spacer(Modifier.height(8.dp))
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) {
                        Icon(Icons.Outlined.VerifiedUser, null, tint = SwastikPrimary, modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(4.dp))
                        Text(stringResource(R.string.active_health_card_ready_to_share), fontSize = 11.sp, color = SwastikPrimary)
                    }
                }

                Spacer(Modifier.height(8.dp))
                androidx.compose.material3.Surface(
                    shape = androidx.compose.foundation.shape.RoundedCornerShape(8.dp),
                    color = androidx.compose.ui.graphics.Color(0xFFDCFCE7),
                    border = androidx.compose.foundation.BorderStroke(1.dp, androidx.compose.ui.graphics.Color(0xFF86EFAC))
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "🛡️ Includes PAR-Q Clearance, Safe Vitals & Drug Interlocks",
                            fontSize = 10.5.sp,
                            fontWeight = FontWeight.Bold,
                            color = androidx.compose.ui.graphics.Color(0xFF166534)
                        )
                    }
                }

                if (healthCardState.hasActiveCard) {
                    Spacer(Modifier.height(12.dp))
                    val guardianShareModifier = if (guardianShareAllowed) {
                        Modifier.clickable { includeGuardianAnalytics = !includeGuardianAnalytics }
                    } else {
                        Modifier
                    }
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .fillMaxWidth()
                            .then(guardianShareModifier)
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Checkbox(
                            checked = includeGuardianAnalytics,
                            onCheckedChange = { includeGuardianAnalytics = it && guardianShareAllowed },
                            enabled = guardianShareAllowed,
                            colors = CheckboxDefaults.colors(checkedColor = SwastikPrimary)
                        )
                        Column {
                            Text(stringResource(R.string.include_vaididea_guardian_analytics), fontSize = 12.sp)
                            Text(
                                if (guardianShareAllowed) {
                                    "Attaches sources, reliability notes, and 30-day safety signals."
                                } else {
                                    "Enable Guardian doctor/QR sharing from Health Card > Learn more first."
                                },
                                fontSize = 10.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                Spacer(Modifier.height(16.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (healthCardState.url != null) {
                        OutlinedButton(
                            onClick = {
                                scope.launch {
                                    val guardianData = if (includeGuardianAnalytics && guardianShareAllowed) {
                                        viewModel?.getGuardianAnalytics() ?: ""
                                    } else { "" }

                                    val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                        type = "text/plain"
                                        putExtra(Intent.EXTRA_SUBJECT, "My VAIDIDEA Health Card")
                                        putExtra(
                                            Intent.EXTRA_TEXT,
                                            buildString {
                                                append("VAIDIDEA Health Card (time-limited clinical summary)")
                                                append("\n")
                                                append("Valid until: ${formattedExpiry ?: "revoked or expired soon"}")
                                                append("\n")
                                                append(healthCardState.url)
                                                if (includeGuardianAnalytics && guardianShareAllowed && guardianData.isNotEmpty()) {
                                                    append("\n\n--- Vaididea Guardian Analytics ---\n")
                                                    append(guardianData)
                                                }
                                            }
                                        )
                                    }
                                    context.startActivity(Intent.createChooser(shareIntent, "Share Health Card"))
                                }
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            border = BorderStroke(1.dp, SwastikPrimary.copy(alpha = 0.5f))
                        ) {
                            Icon(Icons.Outlined.Share, null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(stringResource(R.string.share), fontSize = 13.sp)
                        }
                    }

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
                            Text(stringResource(R.string.revoke), fontSize = 13.sp)
                        }
                    } else if (!healthCardState.isLoading) {
                        Button(
                            onClick = { viewModel?.generateHealthCard() },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
                        ) {
                            Icon(Icons.Outlined.QrCode2, null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(stringResource(R.string.generate), fontSize = 13.sp)
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onDismiss,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
            ) { Text(stringResource(R.string.close)) }
        },
        shape = RoundedCornerShape(20.dp)
    )
}
