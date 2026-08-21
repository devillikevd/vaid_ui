package com.example.swastik.ui.screens.patient.booking

import android.content.Intent
import android.provider.CalendarContract
import androidx.compose.animation.*
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.paging.compose.collectAsLazyPagingItems
import androidx.paging.LoadState
import androidx.paging.compose.itemContentType
import androidx.paging.compose.itemKey
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.*
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.data.model.Doctor
import com.example.swastik.data.model.TimeSlot
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.ui.theme.SwastikPrimaryLight
import com.example.swastik.ui.viewmodel.AppointmentViewModel
import com.example.swastik.ui.viewmodel.AppointmentUiState
import com.example.swastik.ui.viewmodel.DoctorSearchViewModel
import com.example.swastik.ui.viewmodel.DoctorSearchUiState
import com.example.swastik.ui.viewmodel.NextAvailableSlotSuggestion
import com.example.swastik.ui.viewmodel.PatientDashboardViewModel
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.*
import androidx.compose.ui.res.stringResource
import com.example.swastik.R
import androidx.compose.material3.MaterialTheme
import com.example.swastik.data.model.Appointment
import android.net.Uri
import android.os.Build
import java.io.File
import androidx.compose.runtime.rememberCoroutineScope
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody

private val StepperGreen = Color(0xFF00796B)
private val StepperGray = Color(0xFFE0E0E0)
private val StepperTextGray = Color(0xFF9E9E9E)
private val CardBorderSelected = Color(0xFF00796B)
private val CardBorderUnselected = Color(0xFFE0E0E0)
private val PriceColor = Color(0xFF00796B)
private val SummaryCardBg = Color(0xFFF5F9F5)
private val ConfirmedGreen = Color(0xFF4CAF50)

/**
 * Multi-step Appointment Booking Screen:
 * Step 1 → Search & select a doctor
 * Step 2 → Consultation Details (type + notes)
 * Step 3 → Pick date & time slot
 * Step 4 → Review Booking
 * Step 5 → Confirm Booking (ticket card + booking ID)
 * Step 6 → Booking Confirmed (success)
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppointmentBookingScreen(
    onBackClick: () -> Unit,
    onBookingComplete: () -> Unit,
    onNavigateToHistory: () -> Unit = {},
    onNavigateToDoctorProfile: (String) -> Unit = {},
    preselectedDoctorId: String? = null,
    preselectedHospitalId: String? = null,
    preselectedClinicId: String? = null,
    preselectedSpecialization: String? = null,
    consultationMode: String? = null,
    preselectedSearch: String? = null,
    doctorSearchViewModel: DoctorSearchViewModel = hiltViewModel(),
    appointmentViewModel: AppointmentViewModel = hiltViewModel(),
    patientDashboardViewModel: PatientDashboardViewModel = hiltViewModel()
) {
    var currentStep by remember { mutableIntStateOf(if (!preselectedDoctorId.isNullOrBlank()) 2 else 1) }
    var selectedDoctor by remember { mutableStateOf<Doctor?>(null) }
    var selectedDate by remember { mutableStateOf<LocalDate?>(null) }
    var selectedTimeSlot by remember { mutableStateOf<String?>(null) }
    var selectedType by remember { mutableStateOf(consultationMode ?: "video") }
    var notes by remember { mutableStateOf("") }
    var showDuplicateBookingDialog by remember { mutableStateOf(false) }
    val availableDates = remember { (0..13).map { LocalDate.now().plusDays(it.toLong()) } }

    // === Clinical Intake Wizard State ===
    var intakeSubStep by remember { mutableIntStateOf(1) }
    // Step 1: Reason
    var reasonForVisit by remember { mutableStateOf("") }
    var reasonDescription by remember { mutableStateOf("") }
    // Step 2: Symptoms
    var selectedSymptoms by remember { mutableStateOf(setOf<String>()) }
    var customSymptomsInput by remember { mutableStateOf("") }
    var severityCurrent by remember { mutableIntStateOf(0) }
    var severityWorst by remember { mutableIntStateOf(0) }
    var onsetType by remember { mutableStateOf("") }
    var symptomDuration by remember { mutableStateOf("") }
    var symptomPattern by remember { mutableStateOf("") }
    // Step 3: Medical Safety
    var knownAllergies by remember { mutableStateOf(setOf<String>()) }
    var customAllergyInput by remember { mutableStateOf("") }
    var currentMedications by remember { mutableStateOf("") }
    var medicalHistory by remember { mutableStateOf("") }
    // Step 4: Documents & Voice
    var voiceNoteRecorded by remember { mutableStateOf(false) }
    var voiceNoteDuration by remember { mutableStateOf("0:00") }
    var isRecording by remember { mutableStateOf(false) }
    var voiceNoteFile by remember { mutableStateOf<File?>(null) }
    var voiceNoteUrl by remember { mutableStateOf<String?>(null) }
    var attachedDocUris by remember { mutableStateOf(listOf<Uri>()) }
    var attachedDocNames by remember { mutableStateOf(listOf<String>()) }
    var uploadedDocUrls by remember { mutableStateOf(listOf<String>()) }
    var mediaRecorder by remember { mutableStateOf<android.media.MediaRecorder?>(null) }

    val patientProfile by patientDashboardViewModel.patientProfile.collectAsState()
    val filters by doctorSearchViewModel.filters.collectAsState()
    val patientLat = filters.latitude
    val patientLng = filters.longitude

    LaunchedEffect(preselectedHospitalId, preselectedClinicId, preselectedSpecialization, consultationMode, preselectedSearch, patientProfile?.location) {
        if (consultationMode == "video" || consultationMode == "speciality" || (!preselectedSpecialization.isNullOrBlank() && consultationMode == null)) {
            doctorSearchViewModel.setInPersonLocation(isGlobal = true)
        } else {
            doctorSearchViewModel.setInPersonLocation(isGlobal = false)
        }
        
        if (!preselectedHospitalId.isNullOrBlank() || !preselectedClinicId.isNullOrBlank() || !preselectedSpecialization.isNullOrBlank() || !preselectedSearch.isNullOrBlank() || consultationMode != null) {
            doctorSearchViewModel.updateFilters(
                hospitalId = preselectedHospitalId,
                clinicId = preselectedClinicId,
                specialization = preselectedSpecialization,
                search = preselectedSearch,
                consultationType = if (consultationMode == "video") "video" else if (consultationMode == "in_person") "in_person" else null
            )
        } else if (preselectedDoctorId.isNullOrBlank()) {
            doctorSearchViewModel.searchDoctors(resetList = true)
        }
    }

    LaunchedEffect(preselectedDoctorId) {
        if (!preselectedDoctorId.isNullOrBlank()) {
            doctorSearchViewModel.selectDoctor(preselectedDoctorId)
        }
    }

    val doctorState by doctorSearchViewModel.uiState.collectAsState()
    val appointmentState = appointmentViewModel.uiState

    val existingAppointment = remember(selectedDoctor, appointmentState.appointments) {
        selectedDoctor?.let { doctor ->
            appointmentState.appointments.find {
                (it.status.lowercase() == "scheduled" || it.status.lowercase() == "confirmed" || it.status.lowercase() == "pending") &&
                        it.doctorId == doctor.id
            }
        }
    }
    var hasShownDuplicateWarning by remember { mutableStateOf(false) }

    LaunchedEffect(existingAppointment) {
        if (existingAppointment != null && !hasShownDuplicateWarning) {
            showDuplicateBookingDialog = true
            hasShownDuplicateWarning = true
        }
    }

    LaunchedEffect(selectedDoctor) {
        hasShownDuplicateWarning = false
    }

    LaunchedEffect(doctorState.selectedDoctor) {
        val doctor = doctorState.selectedDoctor?.doctor ?: return@LaunchedEffect
        if (selectedDoctor?.id != doctor.id) {
            selectedDoctor = doctor
        }
        if (!preselectedDoctorId.isNullOrBlank() && currentStep == 0) {
            currentStep = 2
        }
    }

    // Handle successful booking → go to Step 7 (Confirmed)
    LaunchedEffect(appointmentState.bookingSuccess) {
        if (appointmentState.bookingSuccess) {
            currentStep = 7
        }
    }

    // Handle race condition: If slot was booked by someone else right before confirming
    val context = LocalContext.current
    LaunchedEffect(appointmentState.error) {
        val error = appointmentState.error
        if (currentStep == 6 && error != null && 
            (error.contains("already booked", ignoreCase = true) || error.contains("conflict", ignoreCase = true))) {
            
            // Show toast to user
            android.widget.Toast.makeText(context, "This slot was just booked by someone else. Please choose another.", android.widget.Toast.LENGTH_LONG).show()
            
            // Clear the error and go back to step 3
            appointmentViewModel.clearError()
            selectedTimeSlot = null
            currentStep = 3
            
            // Refresh the slots to grey out the newly booked one
            if (selectedDoctor != null && selectedDate != null) {
                val formatted = selectedDate!!.format(DateTimeFormatter.ISO_LOCAL_DATE)
                val fallbackDates = availableDates
                    .filter { it.isAfter(selectedDate!!) }
                    .map { it.format(DateTimeFormatter.ISO_LOCAL_DATE) }
                    .take(2)
                val apiType = if (selectedType == "In-Person") "in_person" else "video"
                appointmentViewModel.loadTimeSlots(selectedDoctor!!.id, formatted, fallbackDates, apiType)
            }
        }
    }

    val stepTitle = when (currentStep) {
        0 -> "Loading..."
        1 -> "Select Doctor"
        2 -> "Consultation Details"
        3 -> "Pick Date & Time"
        4 -> "Clinical Intake"
        5 -> "Review Booking"
        6 -> stringResource(R.string.confirm_booking)
        7 -> "Appointment Confirmed"
        else -> "Book Appointment"
    }

    val cornerRadius by animateDpAsState(
        targetValue = 0.dp, label = ""
    )

    // Determine which visual stepper step we're on (map 7-step to 4-visual-step)
    val visualStep = when (currentStep) {
        0, 1, 2 -> 1
        3 -> 2
        4, 5 -> 3
        6, 7 -> 4
        else -> 1
    }

    val recommendedDoctors by patientDashboardViewModel.recommendedDoctors.collectAsState()

    androidx.activity.compose.BackHandler {
        when {
            currentStep == 7 -> onBackClick()
            currentStep == 4 && intakeSubStep > 1 -> intakeSubStep--
            currentStep > 3 && preselectedDoctorId.isNullOrBlank() -> currentStep--
            currentStep > 3 && !preselectedDoctorId.isNullOrBlank() -> currentStep--
            currentStep == 3 -> currentStep = 2
            currentStep == 2 && preselectedDoctorId.isNullOrBlank() -> currentStep--
            currentStep == 2 && !preselectedDoctorId.isNullOrBlank() -> onBackClick()
            else -> onBackClick()
        }
    }

    Scaffold(
        topBar = {
            if (currentStep != 7) {
                TopAppBar(
                    title = { Text(if (consultationMode == "recommended" && currentStep == 1) "Recommended Doctors" else stepTitle, fontWeight = FontWeight.SemiBold, fontSize = 18.sp) },
                    navigationIcon = {
                        IconButton(onClick = {
                            when {
                                currentStep == 4 && intakeSubStep > 1 -> intakeSubStep--
                                currentStep > 3 && preselectedDoctorId.isNullOrBlank() -> currentStep--
                                currentStep > 3 && !preselectedDoctorId.isNullOrBlank() -> currentStep--
                                currentStep == 3 -> currentStep = 2
                                currentStep == 2 && preselectedDoctorId.isNullOrBlank() -> currentStep--
                                currentStep == 2 && !preselectedDoctorId.isNullOrBlank() -> onBackClick()
                                else -> onBackClick()
                            }
                        }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surface,
                        titleContentColor = MaterialTheme.colorScheme.onSurface,
                        navigationIconContentColor = MaterialTheme.colorScheme.onSurface
                    )
                )
            } else {
                // Step 6: minimal close button
                TopAppBar(
                    title = { },
                    navigationIcon = {
                        IconButton(onClick = {
                            appointmentViewModel.resetBookingState()
                            onBookingComplete()
                        }) {
                            Icon(Icons.Default.Close, contentDescription = "Close")
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surface,
                        navigationIconContentColor = MaterialTheme.colorScheme.onSurface
                    )
                )
            }
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { paddingValues ->
        Box(modifier = Modifier
            .fillMaxSize()
            .padding(paddingValues)) {
            Column(modifier = Modifier
                .fillMaxSize()) {

                if (currentStep in 1..4) {
                    BookingStepperRedesigned(currentVisualStep = visualStep)
                }

                Box(modifier = Modifier.weight(1f)) {
                    when (currentStep) {
                        0 -> {
                            Box(
                                modifier = Modifier.fillMaxSize(),
                                contentAlignment = Alignment.Center
                            ) {
                                if (doctorState.error != null) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Icon(
                                            Icons.Outlined.ErrorOutline,
                                            contentDescription = null,
                                            modifier = Modifier.size(48.dp),
                                            tint = MaterialTheme.colorScheme.error
                                        )
                                        Spacer(modifier = Modifier.height(16.dp))
                                        Text(stringResource(R.string.failed_to_load_doctor_details), color = MaterialTheme.colorScheme.error)
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Text(doctorState.error ?: "Unknown error", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        Spacer(modifier = Modifier.height(24.dp))
                                        Button(onClick = onBackClick) {
                                            Text(stringResource(R.string.go_back))
                                        }
                                    }
                                } else {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        CircularProgressIndicator(color = SwastikPrimary)
                                        Spacer(modifier = Modifier.height(16.dp))
                                        Text(stringResource(R.string.loading_doctor_details), color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                            }
                        }
                        1 -> {
                            DoctorSelectionStep(
                                doctorSearchViewModel = doctorSearchViewModel,
                                uiState = doctorState,
                                onDoctorSelected = { doctor, isBooking ->
                                    if (isBooking) {
                                        selectedDoctor = doctor
                                        currentStep = 2
                                    } else {
                                        onNavigateToDoctorProfile(doctor.id)
                                    }
                                },
                                consultationMode = consultationMode,
                                recommendedDoctors = recommendedDoctors
                            )
                        }
                        2 -> {
                            val doctorDetails = doctorState.selectedDoctor
                            val hospitals = doctorDetails?.hospitals
                            val clinics = doctorDetails?.clinics
                            
                            val hasAffiliation = !selectedDoctor?.hospitalId.isNullOrBlank() || !selectedDoctor?.clinicId.isNullOrBlank()
                            val isStrictVideoFlow = consultationMode == "video" || consultationMode == "speciality"
                            
                            val isFarAway = if (!preselectedHospitalId.isNullOrBlank() || !preselectedClinicId.isNullOrBlank()) {
                                false
                            } else if (consultationMode == "in_person") {
                                false
                            } else if (selectedDoctor?.distanceKm != null) {
                                selectedDoctor!!.distanceKm!! > 120f
                            } else {
                                var computedDist = Float.MAX_VALUE
                                if (patientLat != null && patientLng != null) {
                                    val hospLat = selectedDoctor?.hospital?.latitude ?: hospitals?.firstOrNull()?.latitude
                                    val hospLng = selectedDoctor?.hospital?.longitude ?: hospitals?.firstOrNull()?.longitude
                                    if (hospLat != null && hospLng != null) {
                                        val results = FloatArray(1)
                                        android.location.Location.distanceBetween(patientLat, patientLng, hospLat, hospLng, results)
                                        computedDist = minOf(computedDist, results[0] / 1000f)
                                    }
                                    // Clinic coordinates not available in model
                                } else if (patientProfile?.city?.isNotBlank() == true || patientProfile?.location?.isNotBlank() == true) {
                                    val pCity = (patientProfile?.city?.takeIf { it.isNotBlank() } ?: patientProfile?.location)?.lowercase()?.trim()
                                    val docCity = selectedDoctor?.hospital?.city?.lowercase()?.trim() ?: hospitals?.firstOrNull()?.city?.lowercase()?.trim()
                                    if (pCity != null && docCity != null && (pCity.contains(docCity) || docCity.contains(pCity))) {
                                        computedDist = 0f // Assume nearby if in same city
                                    }
                                }
                                computedDist > 120f
                            }
                            
                            val showBothTypes = !isStrictVideoFlow && !isFarAway && hasAffiliation

                            ConsultationDetailsStep(
                                doctor = selectedDoctor,
                                showBothTypes = showBothTypes,
                                selectedType = selectedType,
                                notes = notes,
                                isDoctorLoaded = selectedDoctor != null,
                                errorMessage = doctorState.error,
                            onTypeChanged = { selectedType = it },
                            onNotesChanged = { if (it.length <= 500) notes = it },
                            onContinue = { currentStep = 3 },
                            onRetry = {
                                if (!preselectedDoctorId.isNullOrBlank()) {
                                    doctorSearchViewModel.selectDoctor(preselectedDoctorId)
                                }
                            }
                        )
                        }
                        3 -> DateTimeSelectionStep(
                            doctor = selectedDoctor!!,
                            availableDates = availableDates,
                            appointmentState = appointmentState,
                            selectedDate = selectedDate,
                            selectedTimeSlot = selectedTimeSlot,
                            onDateSelected = { date ->
                                selectedDate = date
                                selectedTimeSlot = null
                                val formatted = date.format(DateTimeFormatter.ISO_LOCAL_DATE)
                                val fallbackDates = availableDates
                                    .filter { it.isAfter(date) }
                                    .map { it.format(DateTimeFormatter.ISO_LOCAL_DATE) }
                                    .take(2)
                                val apiType = if (selectedType == "In-Person") "in_person" else "video"
                                appointmentViewModel.loadTimeSlots(
                                    selectedDoctor!!.id,
                                    formatted,
                                    fallbackDates,
                                    apiType
                                )
                            },
                            onTimeSlotSelected = { slot -> selectedTimeSlot = slot },
                            onContinue = { currentStep = 4 }
                        )
                        4 -> {
                            // Clinical Intake Wizard — 5 sub-steps
                            val spec = selectedDoctor?.specialization ?: ""
                            when (intakeSubStep) {
                                1 -> IntakeStep1_ReasonForVisit(
                                    specialization = spec,
                                    reasonForVisit = reasonForVisit,
                                    onReasonChange = { reasonForVisit = it },
                                    reasonDescription = reasonDescription,
                                    onDescriptionChange = { reasonDescription = it },
                                    onNext = { intakeSubStep = 2 },
                                    onBack = { currentStep = 3 }
                                )
                                2 -> IntakeStep2_SymptomDetails(
                                    specialization = spec,
                                    selectedSymptoms = selectedSymptoms,
                                    onSymptomsChange = { selectedSymptoms = it },
                                    customSymptoms = customSymptomsInput,
                                    onCustomSymptomsChange = { customSymptomsInput = it },
                                    severityCurrent = severityCurrent,
                                    onSeverityCurrentChange = { severityCurrent = it },
                                    severityWorst = severityWorst,
                                    onSeverityWorstChange = { severityWorst = it },
                                    onsetType = onsetType,
                                    onOnsetTypeChange = { onsetType = it },
                                    symptomDuration = symptomDuration,
                                    onDurationChange = { symptomDuration = it },
                                    symptomPattern = symptomPattern,
                                    onPatternChange = { symptomPattern = it },
                                    onNext = { intakeSubStep = 3 },
                                    onBack = { intakeSubStep = 1 }
                                )
                                3 -> IntakeStep3_MedicalSafety(
                                    knownAllergies = knownAllergies,
                                    onAllergiesChange = { knownAllergies = it },
                                    customAllergyInput = customAllergyInput,
                                    onCustomAllergyChange = { customAllergyInput = it },
                                    currentMedications = currentMedications,
                                    onMedicationsChange = { currentMedications = it },
                                    medicalHistory = medicalHistory,
                                    onMedicalHistoryChange = { medicalHistory = it },
                                    onNext = { intakeSubStep = 4 },
                                    onBack = { intakeSubStep = 2 }
                                )
                                4 -> {
                                    var isVoiceUploading by remember { mutableStateOf(false) }
                                    val scope = rememberCoroutineScope()

                                    IntakeStep4_VoiceNote(
                                        voiceNoteRecorded = voiceNoteRecorded,
                                        voiceNoteDuration = voiceNoteDuration,
                                        isRecording = isRecording,
                                        isUploading = isVoiceUploading,
                                        onStartRecording = {
                                            try {
                                                val file = File(context.cacheDir, "voice_note_${System.currentTimeMillis()}.mp4")
                                                val recorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                                                    android.media.MediaRecorder(context)
                                                } else {
                                                    @Suppress("DEPRECATION")
                                                    android.media.MediaRecorder()
                                                }
                                                recorder.apply {
                                                    setAudioSource(android.media.MediaRecorder.AudioSource.MIC)
                                                    setOutputFormat(android.media.MediaRecorder.OutputFormat.MPEG_4)
                                                    setAudioEncoder(android.media.MediaRecorder.AudioEncoder.AAC)
                                                    setOutputFile(file.absolutePath)
                                                    prepare()
                                                    start()
                                                }
                                                mediaRecorder = recorder
                                                voiceNoteFile = file
                                                isRecording = true
                                            } catch (e: Exception) {
                                                android.widget.Toast.makeText(context, "Microphone permission required", android.widget.Toast.LENGTH_SHORT).show()
                                            }
                                        },
                                        onStopRecording = {
                                            try {
                                                mediaRecorder?.stop()
                                                mediaRecorder?.release()
                                                mediaRecorder = null
                                                isRecording = false
                                                voiceNoteRecorded = true
                                                voiceNoteDuration = "Recorded"

                                                // Upload voice note to S3
                                                val fileToUpload = voiceNoteFile
                                                if (fileToUpload != null && fileToUpload.exists()) {
                                                    isVoiceUploading = true
                                                    scope.launch {
                                                        try {
                                                            val requestBody = fileToUpload.asRequestBody("audio/mp4".toMediaTypeOrNull())
                                                            val part = MultipartBody.Part.createFormData("file", fileToUpload.name, requestBody)
                                                            val response = appointmentViewModel.uploadVoiceNote(part)
                                                            if (response != null) {
                                                                voiceNoteUrl = response
                                                                android.widget.Toast.makeText(context, "Voice note uploaded ✓", android.widget.Toast.LENGTH_SHORT).show()
                                                            }
                                                        } catch (e: Exception) {
                                                            android.widget.Toast.makeText(context, "Upload failed: ${e.message}", android.widget.Toast.LENGTH_SHORT).show()
                                                        } finally {
                                                            isVoiceUploading = false
                                                        }
                                                    }
                                                }
                                            } catch (e: Exception) {
                                                isRecording = false
                                            }
                                        },
                                        onDeleteVoiceNote = {
                                            voiceNoteRecorded = false
                                            voiceNoteFile?.delete()
                                            voiceNoteFile = null
                                            voiceNoteUrl = null
                                            voiceNoteDuration = "0:00"
                                        },
                                        onNext = { intakeSubStep = 5 },
                                        onBack = { intakeSubStep = 3 }
                                    )
                                }
                                5 -> {
                                    val allSymptoms = (selectedSymptoms.toList() +
                                        if (customSymptomsInput.isNotBlank()) customSymptomsInput.split(",").map { it.trim() } else emptyList()
                                    ).filter { it.isNotBlank() }

                                    IntakeStep5_ReviewIntake(
                                        reasonForVisit = reasonForVisit,
                                        reasonDescription = reasonDescription,
                                        selectedSymptoms = selectedSymptoms,
                                        customSymptoms = customSymptomsInput,
                                        severityCurrent = severityCurrent,
                                        severityWorst = severityWorst,
                                        onsetType = onsetType,
                                        symptomDuration = symptomDuration,
                                        symptomPattern = symptomPattern,
                                        knownAllergies = knownAllergies,
                                        customAllergy = customAllergyInput,
                                        currentMedications = currentMedications,
                                        medicalHistory = medicalHistory,
                                        voiceNoteRecorded = voiceNoteRecorded,

                                        onEditStep = { step -> intakeSubStep = step },
                                        onSubmit = {
                                            intakeSubStep = 1  // Reset for potential re-edit
                                            currentStep = 5
                                        },
                                        onBack = { intakeSubStep = 4 }
                                    )
                                }
                            }
                        }
                        5 -> ReviewBookingStep(
                            doctor = selectedDoctor!!,
                            date = selectedDate!!,
                            timeSlot = selectedTimeSlot!!,
                            selectedType = selectedType,
                            notes = notes,
                            onContinue = { currentStep = 6 }
                        )
                        6 -> ConfirmBookingStep(
                            doctor = selectedDoctor!!,
                            date = selectedDate!!,
                            timeSlot = selectedTimeSlot!!,
                            selectedType = selectedType,
                            isBooking = appointmentState.isBooking,
                            bookingError = appointmentState.error,
                            onConfirm = {
                                // Compute severity label
                                val severityLabel = when {
                                    severityCurrent <= 3 -> "mild"
                                    severityCurrent <= 6 -> "moderate"
                                    else -> "severe"
                                }
                                // Combine all symptoms
                                val allSymptomsList = (selectedSymptoms.toList() +
                                    if (customSymptomsInput.isNotBlank()) customSymptomsInput.split(",").map { it.trim() } else emptyList()
                                ).filter { it.isNotBlank() && it != "None of these" }
                                // Combine all allergies
                                val allAllergiesList = (knownAllergies.toList() +
                                    if (customAllergyInput.isNotBlank()) listOf(customAllergyInput) else emptyList()
                                ).filter { it.isNotBlank() }

                                appointmentViewModel.bookAppointment(
                                    doctorId = selectedDoctor!!.id,
                                    date = selectedDate!!.format(DateTimeFormatter.ISO_LOCAL_DATE),
                                    timeSlot = selectedTimeSlot!!,
                                    type = selectedType,
                                    notes = notes,
                                    hospitalId = preselectedHospitalId,
                                    clinicId = preselectedClinicId,
                                    reason = reasonForVisit.ifBlank { null },
                                    symptoms = allSymptomsList.ifEmpty { null },
                                    patientNotes = reasonDescription.ifBlank { null },
                                    severity = if (severityCurrent > 0) severityLabel else null,
                                    onsetType = onsetType.ifBlank { null },
                                    symptomDuration = symptomDuration.ifBlank { null },
                                    symptomPattern = symptomPattern.ifBlank { null },
                                    severityCurrent = if (severityCurrent > 0) severityCurrent else null,
                                    severityWorst = if (severityWorst > 0) severityWorst else null,
                                    knownAllergies = allAllergiesList.ifEmpty { null },
                                    currentMedications = currentMedications.ifBlank { null },
                                    medicalHistory = medicalHistory.ifBlank { null },
                                    voiceNoteUrl = voiceNoteUrl,
                                    supportingDocuments = uploadedDocUrls.ifEmpty { null },
                                    reasonForVisit = reasonForVisit.ifBlank { null }
                                )
                            }
                        )
                        7 -> BookingConfirmedStep(
                            appointment = appointmentState.newAppointment,
                            doctor = selectedDoctor!!,
                            date = selectedDate!!,
                            timeSlot = selectedTimeSlot!!,
                            selectedType = selectedType,
                            onViewAppointments = {
                                appointmentViewModel.resetBookingState()
                                onBookingComplete()
                            }
                        )
                    }
                }
            }
        }
    }

    if (showDuplicateBookingDialog && selectedDoctor != null) {
        AlertDialog(
            onDismissRequest = { showDuplicateBookingDialog = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.Info, contentDescription = null, tint = SwastikPrimary)
                    Spacer(Modifier.width(8.dp))
                    Text(stringResource(R.string.existing_booking_found))
                }
            },
            text = {
                Text(
                    "You already have an active appointment booked with ${selectedDoctor?.name}. Would you like to view your existing booking or reschedule?",
                    fontSize = 14.sp
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        showDuplicateBookingDialog = false
                        onNavigateToHistory()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
                ) {
                    Text(stringResource(R.string.view_booking))
                }
            },
            dismissButton = {
                TextButton(onClick = { showDuplicateBookingDialog = false }) {
                    Text(stringResource(R.string.reschedule))
                }
            },
            shape = RoundedCornerShape(20.dp)
        )
    }
}

// ==================== STEPPER (Redesigned) ====================

@Composable
private fun BookingStepperRedesigned(currentVisualStep: Int) {
    val stepLabels = listOf("Details", "Schedule", "Review", "Confirm")

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        stepLabels.forEachIndexed { index, label ->
            val stepNumber = index + 1
            val isCompleted = stepNumber < currentVisualStep
            val isActive = stepNumber == currentVisualStep

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.weight(1f)
            ) {
                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .clip(CircleShape)
                        .then(
                            if (!isCompleted && !isActive) {
                                Modifier.border(1.dp, StepperTextGray, CircleShape)
                                        .background(MaterialTheme.colorScheme.surface)
                            } else {
                                Modifier.background(StepperGreen)
                            }
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    if (isCompleted) {
                        Icon(
                            Icons.Outlined.Check,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                    } else {
                        Text(
                            "$stepNumber",
                            color = if (isActive) Color.White else StepperTextGray,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                    }
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = label,
                    fontSize = 11.sp,
                    fontWeight = if (isActive || isCompleted) FontWeight.SemiBold else FontWeight.Normal,
                    color = if (isActive || isCompleted) StepperGreen else StepperTextGray,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            if (index < stepLabels.lastIndex) {
                Box(
                    modifier = Modifier
                        .weight(0.6f)
                        .height(3.dp)
                        .offset(y = (-8).dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(
                            if (stepNumber < currentVisualStep) StepperGreen
                            else StepperGray
                        )
                )
            }
        }
    }
}

// ==================== STEP 1: Doctor Selection (unchanged logic) ====================

@Composable
private fun DoctorSelectionStep(
    doctorSearchViewModel: DoctorSearchViewModel,
    uiState: DoctorSearchUiState,
    onDoctorSelected: (com.example.swastik.data.model.Doctor, Boolean) -> Unit,
    consultationMode: String?,
    recommendedDoctors: List<com.example.swastik.data.model.Doctor>
) {
    var searchQuery by remember { mutableStateOf("") }

    val speechLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
        contract = androidx.activity.result.contract.ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == android.app.Activity.RESULT_OK) {
            val spokenText = result.data
                ?.getStringArrayListExtra(android.speech.RecognizerIntent.EXTRA_RESULTS)
                ?.firstOrNull()
            if (!spokenText.isNullOrBlank()) {
                searchQuery = spokenText
                doctorSearchViewModel.updateFilters(search = spokenText)
            }
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        OutlinedTextField(
            value = searchQuery,
            onValueChange = {
                searchQuery = it
                doctorSearchViewModel.updateFilters(search = it.ifBlank { null })
            },
            placeholder = { Text(stringResource(R.string.search_doctors_hint)) },
            leadingIcon = { Icon(Icons.Outlined.Search, contentDescription = null) },
            trailingIcon = {
                if (searchQuery.isNotEmpty()) {
                    IconButton(onClick = {
                        searchQuery = ""
                        doctorSearchViewModel.updateFilters(search = null)
                    }) {
                        Icon(Icons.Default.Close, contentDescription = "Clear")
                    }
                } else {
                    IconButton(onClick = {
                        val intent = android.content.Intent(android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                            putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL, android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                            putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE, java.util.Locale.getDefault())
                        }
                        try { speechLauncher.launch(intent) } catch (_: Exception) {}
                    }) {
                        Icon(Icons.Default.Mic, contentDescription = "Voice Search", tint = SwastikPrimary)
                    }
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            shape = RoundedCornerShape(16.dp),
            singleLine = true
        )

        val filtersFlow by doctorSearchViewModel.filters.collectAsState()
        val currentSortBy = filtersFlow.sortBy
        val currentConsultationType = filtersFlow.consultationType

        val sortOptions = mutableListOf<Pair<String, String?>>()
        sortOptions.add("All" to null)
        sortOptions.add("Most Rating" to "rating_desc")
        sortOptions.add("Most Consultation" to "consultations_desc")
        sortOptions.add("Experienced" to "experience_desc")
        sortOptions.add("Less Fee" to "fee_asc")
        sortOptions.add("High Fee" to "fee_desc")
        if (consultationMode != "video") {
            sortOptions.add("Nearest" to "distance_asc")
        }

        val typeOptions = listOf(
            "All Types" to null,
            "In-Person" to "in_person",
            "Video Call" to "video"
        )

        LazyRow(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(end = 16.dp)
        ) {
            if (consultationMode == "speciality" || consultationMode == null) {
                items(typeOptions) { (label, value) ->
                    val selected = currentConsultationType == value
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = if (selected) SwastikPrimary else MaterialTheme.colorScheme.surface,
                        contentColor = if (selected) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                        border = BorderStroke(1.dp, if (selected) Color.Transparent else MaterialTheme.colorScheme.outlineVariant),
                        modifier = Modifier.clickable { doctorSearchViewModel.updateFilters(consultationType = value) }
                    ) {
                        Text(
                            text = label,
                            fontSize = 12.sp,
                            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                        )
                    }
                }
                item {
                    Box(modifier = Modifier.padding(horizontal = 4.dp).width(1.dp).height(24.dp).background(Color.LightGray))
                }
            }

            items(sortOptions) { (label, value) ->
                val selected = currentSortBy == value
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = if (selected) SwastikPrimaryLight else MaterialTheme.colorScheme.surface,
                    contentColor = if (selected) SwastikPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                    border = BorderStroke(1.dp, if (selected) Color.Transparent else MaterialTheme.colorScheme.outlineVariant),
                    modifier = Modifier.clickable { doctorSearchViewModel.updateFilters(sortBy = value) }
                ) {
                    Text(
                        text = label,
                        fontSize = 12.sp,
                        fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                    )
                }
            }
        }

        when {
            uiState.error != null -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(uiState.error, color = MaterialTheme.colorScheme.error)
                        Spacer(modifier = Modifier.height(8.dp))
                        Button(onClick = { doctorSearchViewModel.searchDoctors(resetList = true) }) {
                            Text(stringResource(R.string.retry))
                        }
                    }
                }
            }
            consultationMode == "recommended" -> {
                val filteredRecommended = remember(recommendedDoctors, currentSortBy, currentConsultationType) {
                    val typeFiltered = if (currentConsultationType != null) {
                        recommendedDoctors.filter { doc ->
                            if (currentConsultationType == "video") {
                                doc.videoConsultationFee != null || doc.consultationTypes?.contains("video") == true
                            } else {
                                doc.consultationTypes?.contains("in_person") != false
                            }
                        }
                    } else {
                        recommendedDoctors
                    }
                    
                    when (currentSortBy) {
                        "rating_desc" -> typeFiltered.sortedWith(
                            compareByDescending<Doctor> { it.averageRating ?: 0f }
                                .thenByDescending { it.totalReviews ?: 0 }
                        )
                        "consultations_desc" -> typeFiltered.sortedWith(
                            compareByDescending<Doctor> { it.totalConsultations ?: it.totalReviews ?: 0 }
                                .thenByDescending { it.averageRating ?: 0f }
                        )
                        "experience_desc" -> typeFiltered.sortedWith(
                            compareByDescending<Doctor> { it.experienceYears ?: 0 }
                                .thenByDescending { it.averageRating ?: 0f }
                        )
                        "fee_asc" -> typeFiltered.sortedWith(
                            compareBy { doc ->
                                when {
                                    currentConsultationType == "video" && doc.videoConsultationFee != null -> doc.videoConsultationFee
                                    currentConsultationType == "in_person" && doc.consultationFee != null -> doc.consultationFee
                                    else -> listOfNotNull(doc.consultationFee, doc.videoConsultationFee).minOrNull() ?: 999999
                                }
                            }
                        )
                        "fee_desc" -> typeFiltered.sortedWith(
                            compareByDescending { doc ->
                                when {
                                    currentConsultationType == "video" && doc.videoConsultationFee != null -> doc.videoConsultationFee
                                    currentConsultationType == "in_person" && doc.consultationFee != null -> doc.consultationFee
                                    else -> listOfNotNull(doc.consultationFee, doc.videoConsultationFee).maxOrNull() ?: -1
                                }
                            }
                        )
                        "distance_asc" -> typeFiltered.sortedBy { it.distanceKm ?: 999999f }
                        else -> typeFiltered
                    }
                }
                
                if (filteredRecommended.isEmpty()) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Outlined.PersonSearch, contentDescription = null, modifier = Modifier.size(64.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(stringResource(R.string.no_doctors_found), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 16.sp)
                        }
                    }
                } else {
                    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        items(
                            count = filteredRecommended.size,
                            key = { index -> filteredRecommended[index].id },
                            contentType = { "Doctor" }
                        ) { index ->
                            val doctor = filteredRecommended[index]
                            DoctorBookingCard(
                                doctor = doctor,
                                onSelect = { onDoctorSelected(doctor, true) },
                                onViewProfile = { onDoctorSelected(doctor, false) }
                            )
                        }
                    }
                }
            }
            else -> {
                val pagedDoctors = doctorSearchViewModel.pagedDoctors.collectAsLazyPagingItems()
                val isLoadingPaging = pagedDoctors.loadState.refresh is LoadState.Loading

                if (isLoadingPaging) {
                    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        item {
                            Box(modifier = Modifier.fillMaxWidth().height(300.dp), contentAlignment = Alignment.Center) {
                                CircularProgressIndicator(color = SwastikPrimary)
                            }
                        }
                    }
                } else if (pagedDoctors.itemCount == 0) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Outlined.PersonSearch, contentDescription = null, modifier = Modifier.size(64.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(stringResource(R.string.no_doctors_found), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 16.sp)
                            Text(stringResource(R.string.try_a_different_search), color = MaterialTheme.colorScheme.outlineVariant, fontSize = 14.sp)
                        }
                    }
                } else {
                    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        items(
                            count = pagedDoctors.itemCount,
                            key = pagedDoctors.itemKey { it.id },
                            contentType = pagedDoctors.itemContentType { "Doctor" }
                        ) { index ->
                            val doctor = pagedDoctors[index]
                            if (doctor != null) {
                                DoctorBookingCard(
                                    doctor = doctor,
                                    onSelect = { onDoctorSelected(doctor, true) },
                                    onViewProfile = { onDoctorSelected(doctor, false) }
                                )
                            }
                        }
                        if (pagedDoctors.loadState.append is LoadState.Loading) {
                            item {
                                CircularProgressIndicator(modifier = Modifier.fillMaxWidth().padding(16.dp).wrapContentWidth(Alignment.CenterHorizontally))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DoctorBookingCard(doctor: Doctor, onSelect: () -> Unit, onViewProfile: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onSelect),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                Box(
                    modifier = Modifier.size(64.dp).background(SwastikPrimaryLight, RoundedCornerShape(16.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    if (!doctor.profileImageUrl.isNullOrBlank()) {
                        coil.compose.AsyncImage(
                            model = doctor.profileImageUrl,
                            contentDescription = "Doctor Profile",
                            modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(16.dp)),
                            contentScale = androidx.compose.ui.layout.ContentScale.Crop
                        )
                    } else {
                        Icon(Icons.Filled.Person, contentDescription = "Doctor", modifier = Modifier.size(32.dp), tint = SwastikPrimary)
                    }
                    Icon(
                        Icons.Filled.CheckCircle,
                        contentDescription = "Verified",
                        tint = SwastikPrimary,
                        modifier = Modifier.size(20.dp).align(Alignment.BottomEnd).offset(x = 6.dp, y = 6.dp).background(MaterialTheme.colorScheme.surface, CircleShape)
                    )
                }
                Spacer(modifier = Modifier.width(16.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(doctor.name, fontWeight = FontWeight.Bold, fontSize = 17.sp, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(doctor.specialization, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = SwastikPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(doctor.experienceYears?.takeIf { it > 0 }?.let { "$it+ Yrs Exp" } ?: "Experience not listed", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    
                    val locationText = buildString {
                        if (doctor.distanceKm != null && doctor.distanceKm > 0) {
                            append(String.format(Locale.US, "📍 %.1f km away", doctor.distanceKm))
                            if (!doctor.hospital?.name.isNullOrBlank()) {
                                append(" • ")
                                append(doctor.hospital?.name)
                            }
                        } else if (!doctor.hospital?.name.isNullOrBlank()) {
                            append("📍 ")
                            append(doctor.hospital?.name)
                        }
                    }
                    if (locationText.isNotBlank()) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = SwastikPrimaryLight.copy(alpha = 0.6f)
                        ) {
                            Text(
                                text = locationText,
                                fontSize = 11.5.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = SwastikPrimary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
                Surface(color = Color(0xFFFFF8E1), shape = RoundedCornerShape(8.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp)) {
                        Icon(Icons.Filled.Star, contentDescription = null, modifier = Modifier.size(12.dp), tint = Color(0xFFFFB800))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(doctor.averageRating?.takeIf { it > 0f }?.let { String.format(Locale.US, "%.1f", it) } ?: "New", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFFB28900))
                    }
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
            BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
                val compact = maxWidth < 340.dp
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(stringResource(R.string.consultation_fee), fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            val feeText = when {
                                doctor.consultationFee != null && doctor.consultationFee > 0 -> "₹${doctor.consultationFee}"
                                doctor.videoConsultationFee != null && doctor.videoConsultationFee > 0 -> "₹${doctor.videoConsultationFee}"
                                doctor.consultationFee == 0 || doctor.videoConsultationFee == 0 -> "Free"
                                else -> "Fee not listed"
                            }
                            val feeColor = if (feeText == "Free") Color(0xFF16A34A) else SwastikPrimary
                            Text(feeText, color = feeColor, fontWeight = FontWeight.Bold, fontSize = 16.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                        if (!compact) {
                            Row(modifier = Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton(onClick = onViewProfile, modifier = Modifier.weight(1.4f).heightIn(min = 40.dp), shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.outlinedButtonColors(contentColor = SwastikPrimary), border = BorderStroke(1.5.dp, SwastikPrimary), contentPadding = PaddingValues(0.dp)) {
                                    Text(stringResource(R.string.view_profile), fontWeight = FontWeight.SemiBold, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                }
                                Button(onClick = onSelect, modifier = Modifier.weight(1f).heightIn(min = 40.dp), shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary, contentColor = MaterialTheme.colorScheme.onPrimary), contentPadding = PaddingValues(0.dp)) {
                                    Text(stringResource(R.string.book), fontWeight = FontWeight.SemiBold, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                }
                            }
                        }
                    }
                    if (compact) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(onClick = onViewProfile, modifier = Modifier.weight(1.4f).heightIn(min = 40.dp), shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.outlinedButtonColors(contentColor = SwastikPrimary), border = BorderStroke(1.5.dp, SwastikPrimary), contentPadding = PaddingValues(horizontal = 4.dp)) {
                                Text(stringResource(R.string.view_profile), fontWeight = FontWeight.SemiBold, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            }
                            Button(onClick = onSelect, modifier = Modifier.weight(1f).heightIn(min = 40.dp), shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary, contentColor = MaterialTheme.colorScheme.onPrimary), contentPadding = PaddingValues(horizontal = 4.dp)) {
                                Text(stringResource(R.string.book), fontWeight = FontWeight.SemiBold, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            }
                        }
                    }
                }
            }
        }
    }
}

// ==================== STEP 2: Consultation Details (Redesigned) ====================

@Composable
private fun ConsultationDetailsStep(
    doctor: Doctor?,
    showBothTypes: Boolean,
    selectedType: String,
    notes: String,
    isDoctorLoaded: Boolean,
    errorMessage: String?,
    onTypeChanged: (String) -> Unit,
    onNotesChanged: (String) -> Unit,
    onContinue: () -> Unit,
    onRetry: () -> Unit
) {
    val videoFee = doctor?.videoConsultationFee ?: doctor?.consultationFee
    val clinicFee = doctor?.consultationFee
    
    // Auto-select video if in-person is disabled
    LaunchedEffect(showBothTypes) {
        if (!showBothTypes && selectedType == "in_person") {
            onTypeChanged("video")
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        // Choose Consultation Type heading
        Text(stringResource(R.string.consultation_type), fontWeight = FontWeight.Bold, fontSize = 18.sp, color = MaterialTheme.colorScheme.onSurface)
        Spacer(modifier = Modifier.height(12.dp))

        Row(
            modifier = Modifier.fillMaxWidth().height(IntrinsicSize.Max),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Video Consultation card
            ConsultationTypeCard(
                modifier = if (showBothTypes) Modifier.weight(1f).fillMaxHeight() else Modifier.fillMaxWidth(0.48f).fillMaxHeight(),
                icon = "📹",
                title = stringResource(R.string.video_consultation),
                subtitle = stringResource(R.string.consult_doctor_online),
                price = "",
                isSelected = selectedType == "video",
                onClick = { onTypeChanged("video") }
            )

            // In-Person card
            if (showBothTypes) {
                ConsultationTypeCard(
                    modifier = Modifier.weight(1f).fillMaxHeight(),
                    icon = "🏥",
                    title = stringResource(R.string.in_person_consultation),
                    subtitle = stringResource(R.string.visit_doctor_at_clinic),
                    price = "", // Hide price during selection as requested
                    isSelected = selectedType == "in_person",
                    onClick = { onTypeChanged("in_person") }
                )
            }
        }

        // Add Notes section
        Text(
            stringResource(R.string.add_notes_optional),
            fontWeight = FontWeight.SemiBold,
            fontSize = 15.sp,
            color = MaterialTheme.colorScheme.onSurface
        )

        OutlinedTextField(
            value = notes,
            onValueChange = onNotesChanged,
            modifier = Modifier
                .fillMaxWidth()
                .height(120.dp),
            placeholder = { Text(stringResource(R.string.tell_the_doctor_about_your)) },
            shape = RoundedCornerShape(12.dp),
            maxLines = 5,
            supportingText = {
                Text(
                    text = "${notes.length}/500",
                    modifier = Modifier.fillMaxWidth(),
                    textAlign = TextAlign.End,
                    fontSize = 12.sp,
                    color = if (notes.length >= 500) MaterialTheme.colorScheme.error
                    else MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        )

        Spacer(modifier = Modifier.weight(1f))

        // Continue button
        Button(
            onClick = if (errorMessage != null) onRetry else onContinue,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            enabled = isDoctorLoaded || errorMessage != null,
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
        ) {
            if (errorMessage != null) {
                Icon(Icons.Outlined.Warning, contentDescription = "Error", modifier = Modifier.size(24.dp), tint = MaterialTheme.colorScheme.onPrimary)
                Spacer(modifier = Modifier.width(8.dp))
                Text(stringResource(R.string.retry_loading), fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
            } else if (!isDoctorLoaded) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
                Spacer(modifier = Modifier.width(8.dp))
                Text(stringResource(R.string.loading_doctor), fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
            } else {
                Text(stringResource(R.string.str_continue), fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
            }
        }
    }
}

@Composable
private fun ConsultationTypeCard(
    modifier: Modifier = Modifier,
    icon: String,
    title: String,
    subtitle: String,
    price: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier
            .height(140.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) SwastikPrimary.copy(alpha = 0.06f)
            else MaterialTheme.colorScheme.surface
        ),
        border = BorderStroke(
            width = if (isSelected) 2.dp else 1.dp,
            color = if (isSelected) CardBorderSelected else CardBorderUnselected
        )
    ) {
        Column(
            modifier = Modifier.fillMaxSize().padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(icon, fontSize = 28.sp)
                if (isSelected) {
                    Icon(
                        Icons.Filled.CheckCircle,
                        contentDescription = "Selected",
                        tint = SwastikPrimary,
                        modifier = Modifier.size(22.dp)
                    )
                }
            }
            Text(
                title,
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                color = MaterialTheme.colorScheme.onSurface,
                minLines = 2,
                maxLines = 2,
                lineHeight = 16.sp,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                subtitle,
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                minLines = 2,
                maxLines = 2,
                lineHeight = 14.sp,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                price,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 16.sp,
                color = PriceColor
            )
        }
    }
}

// ==================== STEP 3: Date & Time Selection (Redesigned) ====================

@Composable
private fun DateTimeSelectionStep(
    doctor: Doctor,
    availableDates: List<LocalDate>,
    appointmentState: AppointmentUiState,
    selectedDate: LocalDate?,
    selectedTimeSlot: String?,
    onDateSelected: (LocalDate) -> Unit,
    onTimeSlotSelected: (String) -> Unit,
    onContinue: () -> Unit
) {
    val today = LocalDate.now()
    val hasAvailableSlots = appointmentState.timeSlots.any { it.isAvailable }
    val availableSlotCount = appointmentState.timeSlots.count { it.isAvailable }
    val bookedSlotCount = appointmentState.timeSlots.count { !it.isAvailable }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Doctor info card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = SummaryCardBg)
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .clip(CircleShape)
                            .background(SwastikPrimaryLight),
                        contentAlignment = Alignment.Center
                    ) {
                        if (!doctor.profileImageUrl.isNullOrBlank()) {
                            coil.compose.AsyncImage(
                                model = doctor.profileImageUrl,
                                contentDescription = null,
                                modifier = Modifier.fillMaxSize().clip(CircleShape),
                                contentScale = androidx.compose.ui.layout.ContentScale.Crop
                            )
                        } else {
                            Icon(Icons.Filled.Person, contentDescription = null, tint = SwastikPrimary, modifier = Modifier.size(24.dp))
                        }
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(doctor.name, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                        Text(doctor.specialization, fontSize = 13.sp, color = SwastikPrimary)
                    }
                    doctor.averageRating?.takeIf { it > 0f }?.let { rating ->
                        Surface(color = Color(0xFFFFF8E1), shape = RoundedCornerShape(8.dp)) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Icon(Icons.Filled.Star, contentDescription = null, modifier = Modifier.size(14.dp), tint = Color(0xFFFFB800))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    String.format(Locale.US, "%.1f", rating) +
                                            (doctor.totalReviews?.let { " ($it)" } ?: ""),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color(0xFFB28900)
                                )
                            }
                        }
                    }
                }
            }
        }

        // Select Date
        item {
            Text(stringResource(R.string.select_date), fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
            Spacer(modifier = Modifier.height(8.dp))
            LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                items(availableDates) { date ->
                    val isSelected = date == selectedDate
                    val isToday = date == today
                    Surface(
                        modifier = Modifier.width(68.dp).clickable { onDateSelected(date) },
                        shape = RoundedCornerShape(14.dp),
                        color = if (isSelected) SwastikPrimary
                        else if (isToday) SwastikPrimaryLight.copy(alpha = 0.3f)
                        else MaterialTheme.colorScheme.surfaceVariant,
                        border = if (isToday && !isSelected) BorderStroke(1.dp, SwastikPrimary) else null
                    ) {
                        Column(
                            modifier = Modifier.padding(vertical = 12.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = date.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.getDefault()),
                                fontSize = 12.sp,
                                color = if (isSelected) Color.White else Color.Gray
                            )
                            Text(
                                text = "${date.dayOfMonth}",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = date.month.getDisplayName(TextStyle.SHORT, Locale.getDefault()),
                                fontSize = 11.sp,
                                color = if (isSelected) Color.White.copy(alpha = 0.8f) else Color.Gray
                            )
                        }
                    }
                }
            }
        }

        // Available Time Slots
        item {
            if (selectedDate != null) {
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(stringResource(R.string.available_time_slots), fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                    if (availableSlotCount > 0) {
                        Surface(color = Color(0xFFE8F5E9), shape = RoundedCornerShape(999.dp)) {
                            Text(
                                text = "$availableSlotCount slots available",
                                color = StepperGreen,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                when {
                    appointmentState.isLoadingSlots -> {
                        Box(modifier = Modifier.fillMaxWidth().height(120.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = SwastikPrimary, modifier = Modifier.size(32.dp))
                        }
                    }
                    appointmentState.timeSlots.isEmpty() -> {
                        NoSlotsAvailableCard(
                            selectedDate = selectedDate,
                            bookedSlotCount = bookedSlotCount,
                            suggestion = appointmentState.nextAvailableSuggestion,
                            isSearchingNextAvailable = appointmentState.isSearchingNextAvailable,
                            onJumpToSuggestedDate = { suggested -> onDateSelected(LocalDate.parse(suggested.date)) }
                        )
                    }
                    !hasAvailableSlots -> {
                        NoSlotsAvailableCard(
                            selectedDate = selectedDate,
                            bookedSlotCount = bookedSlotCount,
                            suggestion = appointmentState.nextAvailableSuggestion,
                            isSearchingNextAvailable = appointmentState.isSearchingNextAvailable,
                            onJumpToSuggestedDate = { suggested -> onDateSelected(LocalDate.parse(suggested.date)) }
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        TimeSlotGrid(
                            slots = appointmentState.timeSlots,
                            selectedSlot = selectedTimeSlot,
                            onSlotSelected = onTimeSlotSelected
                        )
                    }
                    else -> {
                        TimeSlotGrid(
                            slots = appointmentState.timeSlots,
                            selectedSlot = selectedTimeSlot,
                            onSlotSelected = onTimeSlotSelected
                        )
                    }
                }
            } else {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                ) {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text("📅", fontSize = 32.sp)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(stringResource(R.string.select_a_date_above_to), fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
                    }
                }
            }
        }

        // Selected summary + Continue
        item {
            if (selectedDate != null && selectedTimeSlot != null) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = SummaryCardBg),
                    border = BorderStroke(1.dp, SwastikPrimary.copy(alpha = 0.3f))
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("📌", fontSize = 16.sp)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            stringResource(R.string.selected_date_time),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.weight(1f))
                        Text(
                            "${selectedDate.format(DateTimeFormatter.ofPattern("EEE, d MMM yyyy"))} • $selectedTimeSlot",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = SwastikPrimary
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
            Button(
                onClick = onContinue,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp),
                enabled = selectedDate != null && selectedTimeSlot != null,
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
            ) {
                Text(stringResource(R.string.str_continue), fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
            }
        }
    }
}

@Composable
private fun NoSlotsAvailableCard(
    selectedDate: LocalDate?,
    bookedSlotCount: Int,
    suggestion: NextAvailableSlotSuggestion?,
    isSearchingNextAvailable: Boolean,
    onJumpToSuggestedDate: (NextAvailableSlotSuggestion) -> Unit
) {
    val formattedDate = selectedDate?.format(DateTimeFormatter.ofPattern("EEE, d MMM"))
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(modifier = Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text("😔", fontSize = 32.sp)
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = if (formattedDate != null) "No open slots on $formattedDate" else "No open slots available", fontWeight = FontWeight.Medium, fontSize = 15.sp, textAlign = TextAlign.Center)
            Spacer(modifier = Modifier.height(6.dp))
            Text(text = if (bookedSlotCount > 0) "All $bookedSlotCount published slots are already taken." else "This doctor has not published available times for the selected day.", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
            when {
                isSearchingNextAvailable -> {
                    Spacer(modifier = Modifier.height(16.dp))
                    CircularProgressIndicator(color = SwastikPrimary, modifier = Modifier.size(22.dp), strokeWidth = 2.5.dp)
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(stringResource(R.string.checking_the_next_available_dates), fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                suggestion != null -> {
                    Spacer(modifier = Modifier.height(16.dp))
                    FilledTonalButton(onClick = { onJumpToSuggestedDate(suggestion) }, colors = ButtonDefaults.filledTonalButtonColors(containerColor = SwastikPrimaryLight.copy(alpha = 0.5f), contentColor = SwastikPrimary)) {
                        Text("Jump to ${LocalDate.parse(suggestion.date).format(DateTimeFormatter.ofPattern("EEE, d MMM"))}")
                    }
                    suggestion.firstAvailableSlot?.let { firstSlot ->
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("${suggestion.availableSlotCount} open slots from $firstSlot", fontSize = 12.sp, color = SwastikPrimary, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center)
                    }
                }
                else -> {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(stringResource(R.string.no_open_slots_found_in), fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
                }
            }
        }
    }
}

@Composable
private fun TimeSlotGrid(slots: List<TimeSlot>, selectedSlot: String?, onSlotSelected: (String) -> Unit) {
    val availableSlots = slots.filter { it.isAvailable }
    val unavailableSlots = slots.filter { !it.isAvailable }
    Column {
        if (availableSlots.isNotEmpty()) SlotChunkRows(slots = availableSlots, selectedSlot = selectedSlot, enabled = true, onSlotSelected = onSlotSelected)
        if (unavailableSlots.isNotEmpty()) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(stringResource(R.string.booked), fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(bottom = 4.dp))
            SlotChunkRows(slots = unavailableSlots, selectedSlot = null, enabled = false, onSlotSelected = {})
        }
    }
}

@Composable
private fun SlotChunkRows(slots: List<TimeSlot>, selectedSlot: String?, enabled: Boolean, onSlotSelected: (String) -> Unit) {
    val isTokenFormat = slots.any { it.time.contains("Token", ignoreCase = true) }
    val columns = if (isTokenFormat) 2 else 4
    val chunked = slots.chunked(columns)
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        chunked.forEach { row ->
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEach { slot ->
                    val isSelected = slot.time == selectedSlot
                    Surface(
                        modifier = Modifier.weight(1f).then(if (enabled) Modifier.clickable { onSlotSelected(slot.time) } else Modifier),
                        shape = RoundedCornerShape(10.dp),
                        color = when {
                            isSelected -> SwastikPrimary
                            !enabled -> MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f)
                            else -> MaterialTheme.colorScheme.surfaceVariant
                        },
                        border = if (isSelected) null else BorderStroke(1.dp, if (enabled) SwastikPrimary.copy(alpha = 0.3f) else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.2f))
                    ) {
                        Text(
                            text = slot.time,
                            modifier = Modifier.padding(vertical = 10.dp, horizontal = 4.dp),
                            fontSize = 13.sp,
                            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                            color = when {
                                isSelected -> Color.White
                                !enabled -> Color.Gray.copy(alpha = 0.5f)
                                else -> MaterialTheme.colorScheme.onSurface
                            },
                            textAlign = TextAlign.Center,
                            maxLines = 1
                        )
                    }
                }
                repeat(columns - row.size) { Spacer(modifier = Modifier.weight(1f)) }
            }
        }
    }
}

// ==================== STEP 4: Review Booking (NEW) ====================

@Composable
private fun ReviewBookingStep(
    doctor: Doctor,
    date: LocalDate,
    timeSlot: String,
    selectedType: String,
    notes: String,
    onContinue: () -> Unit
) {
    val fee = doctor.consultationFee

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Header
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.please_review_your_booking), fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Spacer(modifier = Modifier.width(8.dp))
            Icon(Icons.Outlined.CheckCircle, contentDescription = null, tint = SwastikPrimary, modifier = Modifier.size(22.dp))
        }

        // Review card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                ReviewRow(icon = "👨‍⚕️", label = "Doctor", value = doctor.name, subtitle = doctor.specialization)
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
                ReviewRow(icon = if (selectedType == "video") "📹" else "🏥", label = "Consultation Type", value = if (selectedType == "video") stringResource(R.string.video_consultation) else stringResource(R.string.in_person_consultation))
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
                ReviewRow(icon = "📅", label = "Date", value = date.format(DateTimeFormatter.ofPattern("EEE, d MMM yyyy")))
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
                ReviewRow(icon = "🕐", label = "Time", value = timeSlot)
                if (notes.isNotBlank()) {
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
                    ReviewRow(icon = "📝", label = "Notes", value = notes)
                }
            }
        }

        // Consultation Fee
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = SummaryCardBg)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(stringResource(R.string.consultation_fee), fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                Text(
                    fee?.let { "₹$it" } ?: "Free",
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 18.sp,
                    color = PriceColor
                )
            }
        }

        // T&C
        Text(
            "By confirming, you agree to our\nTerms & Conditions and Privacy Policy.",
            fontSize = 12.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.weight(1f))

        // Continue to Confirm button
        Button(
            onClick = onContinue,
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
        ) {
            Text(stringResource(R.string.continue_to_confirm), fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
        }
    }
}

@Composable
private fun ReviewRow(icon: String, label: String, value: String, subtitle: String? = null) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top
    ) {
        Text(icon, fontSize = 20.sp)
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(label, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Medium)
            Text(value, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
            if (subtitle != null) {
                Text(subtitle, fontSize = 13.sp, color = SwastikPrimary)
            }
        }
    }
}

// ==================== STEP 5: Confirm Booking (Ticket Card) ====================

@Composable
private fun ConfirmBookingStep(
    doctor: Doctor,
    date: LocalDate,
    timeSlot: String,
    selectedType: String,
    isBooking: Boolean,
    bookingError: String?,
    onConfirm: () -> Unit
) {
    val fee = doctor.consultationFee

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Ticket card
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = com.example.swastik.ui.components.TicketShape(
                cornerRadius = 16.dp,
                cutoutRadius = 12.dp,
                cutoutPositionRatio = 0.65f
            ),
            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f),
            shadowElevation = 2.dp
        ) {
            Column(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(24.dp)) {
                    // Header
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            stringResource(R.string.appointment_summary),
                            fontWeight = FontWeight.Black,
                            fontSize = 13.sp,
                            color = SwastikPrimary,
                            letterSpacing = 2.sp
                        )
                        Icon(Icons.Outlined.CheckCircle, contentDescription = null, tint = SwastikPrimary, modifier = Modifier.size(20.dp))
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // Patient -> Doctor
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(stringResource(R.string.patient_uppercase), fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
                            Text(stringResource(R.string.you), fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                        }
                        Icon(Icons.Outlined.ArrowForward, contentDescription = null, tint = MaterialTheme.colorScheme.outlineVariant)
                        Column(horizontalAlignment = Alignment.End) {
                            Text(stringResource(R.string.doctor_uppercase), fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
                            Text(doctor.name, fontSize = 18.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // Date, Time
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(stringResource(R.string.date_uppercase), fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
                            Text(date.format(DateTimeFormatter.ofPattern("EEE, d MMM yyyy")), fontSize = 14.sp, fontWeight = FontWeight.Medium)
                        }
                        Column(modifier = Modifier.weight(1f), horizontalAlignment = Alignment.End) {
                            Text(stringResource(R.string.time_uppercase), fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
                            Text(timeSlot, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Type + Fee
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(stringResource(R.string.consultation_type_1), fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(if (selectedType == "video") "📹" else "🏥", fontSize = 14.sp)
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    if (selectedType == "video") stringResource(R.string.video_consultation) else stringResource(R.string.in_person_consultation),
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = SwastikPrimary
                                )
                            }
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text(stringResource(R.string.fee_uppercase), fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
                            Text(fee?.let { "₹$it" } ?: "Free", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = PriceColor)
                        }
                    }
                }

                // Dashed divider
                val dividerColor = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f)
                androidx.compose.foundation.Canvas(modifier = Modifier.fillMaxWidth().height(1.dp)) {
                    drawLine(
                        color = dividerColor,
                        start = androidx.compose.ui.geometry.Offset(x = 12.dp.toPx(), y = 0f),
                        end = androidx.compose.ui.geometry.Offset(x = size.width - 12.dp.toPx(), y = 0f),
                        strokeWidth = 2f,
                        pathEffect = androidx.compose.ui.graphics.PathEffect.dashPathEffect(floatArrayOf(10f, 10f), 0f)
                    )
                }

                // Barcode area
                Column(
                    modifier = Modifier.fillMaxWidth().padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        stringResource(R.string.str_key),
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Light,
                        letterSpacing = 4.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                        maxLines = 1
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        stringResource(R.string.vaididea_healthcare),
                        fontSize = 10.sp,
                        letterSpacing = 2.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        // Info text
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Icon(Icons.Outlined.CheckCircle, contentDescription = null, tint = SwastikPrimary, modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                "Your appointment is secure and confirmed\nafter you tap the button below.",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )
        }

        // Error
        if (bookingError != null) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
            ) {
                Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.ErrorOutline, contentDescription = null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(bookingError, fontSize = 13.sp, color = MaterialTheme.colorScheme.onErrorContainer)
                }
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        // Confirm button
        Button(
            onClick = onConfirm,
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape = RoundedCornerShape(14.dp),
            enabled = !isBooking,
            colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
        ) {
            if (isBooking) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
                Spacer(modifier = Modifier.width(8.dp))
                Text(stringResource(R.string.booking), fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
            } else {
                Icon(Icons.Outlined.CheckCircle, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text(stringResource(R.string.confirm_booking), fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
    }
}

// ==================== STEP 6: Booking Confirmed (NEW) ====================

@Composable
private fun BookingConfirmedStep(
    appointment: Appointment?,
    doctor: Doctor,
    date: LocalDate,
    timeSlot: String,
    selectedType: String,
    onViewAppointments: () -> Unit
) {
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    val bookingId = appointment?.appointmentNumber ?: "—"
    val fee = appointment?.consultationFee ?: doctor.consultationFee

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp, vertical = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Spacer(modifier = Modifier.height(16.dp))

        // Large green checkmark
        Box(
            modifier = Modifier
                .size(80.dp)
                .clip(CircleShape)
                .background(ConfirmedGreen),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Outlined.Check,
                contentDescription = "Confirmed",
                tint = Color.White,
                modifier = Modifier.size(48.dp)
            )
        }

        Text(
            stringResource(R.string.appointment_confirmed),
            fontWeight = FontWeight.Bold,
            fontSize = 22.sp,
            textAlign = TextAlign.Center
        )
        Text(
            "Your appointment has been\nsuccessfully booked.",
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Details card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Booking ID with copy
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(stringResource(R.string.booking_id), fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(bookingId, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = SwastikPrimary)
                        Spacer(modifier = Modifier.width(6.dp))
                        IconButton(
                            onClick = { clipboardManager.setText(AnnotatedString(bookingId)) },
                            modifier = Modifier.size(24.dp)
                        ) {
                            Icon(Icons.Default.ContentCopy, contentDescription = "Copy", modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }

                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.2f))

                ConfirmedDetailRow(label = "Doctor", value = doctor.name, subtitle = doctor.specialization)
                ConfirmedDetailRow(label = "Date", value = date.format(DateTimeFormatter.ofPattern("EEE, d MMM yyyy")))
                ConfirmedDetailRow(label = "Time", value = timeSlot)
                ConfirmedDetailRow(label = "Type", value = if (selectedType == "video") stringResource(R.string.video_consultation) else stringResource(R.string.in_person_consultation))
                ConfirmedDetailRow(label = "Fee Paid", value = fee?.let { "₹$it" } ?: "Free", valueColor = PriceColor)
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // View My Appointments (primary action)
        Button(
            onClick = onViewAppointments,
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
        ) {
            Text(stringResource(R.string.view_my_appointments), fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
        }

        // Add to Calendar
        OutlinedButton(
            onClick = {
                try {
                    val startMillis = date.atTime(
                        timeSlot.split(":").getOrNull(0)?.replace(Regex("[^0-9]"), "")?.toIntOrNull() ?: 10,
                        timeSlot.split(":").getOrNull(1)?.replace(Regex("[^0-9]"), "")?.toIntOrNull() ?: 0
                    ).atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli()

                    val calIntent = Intent(Intent.ACTION_INSERT).apply {
                        data = CalendarContract.Events.CONTENT_URI
                        putExtra(CalendarContract.Events.TITLE, "Appointment with ${doctor.name}")
                        putExtra(CalendarContract.Events.DESCRIPTION, "Consultation Type: ${if (selectedType == "video") context.getString(R.string.video_consultation) else context.getString(R.string.in_person_consultation)}")
                        putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, startMillis)
                        putExtra(CalendarContract.EXTRA_EVENT_END_TIME, startMillis + 30 * 60 * 1000)
                    }
                    context.startActivity(calIntent)
                } catch (_: Exception) {}
            },
            modifier = Modifier.fillMaxWidth().height(48.dp),
            shape = RoundedCornerShape(14.dp),
            border = BorderStroke(1.dp, SwastikPrimary.copy(alpha = 0.3f))
        ) {
            Text(stringResource(R.string.add_to_calendar), fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface)
        }

        // Share Appointment
        OutlinedButton(
            onClick = {
                try {
                    val shareText = """
                        🏥 Appointment Confirmed!
                        
                        Booking ID: $bookingId
                        Doctor: ${doctor.name} (${doctor.specialization})
                        Date: ${date.format(DateTimeFormatter.ofPattern("EEE, d MMM yyyy"))}
                        Time: $timeSlot
                        Type: ${if (selectedType == "video") context.getString(R.string.video_consultation) else context.getString(R.string.in_person_consultation)}
                        
                        — Vaididea Healthcare
                    """.trimIndent()
                    val shareIntent = Intent.createChooser(Intent(Intent.ACTION_SEND).apply {
                        type = "text/plain"
                        putExtra(Intent.EXTRA_TEXT, shareText)
                    }, "Share Appointment")
                    context.startActivity(shareIntent)
                } catch (_: Exception) {}
            },
            modifier = Modifier.fillMaxWidth().height(48.dp),
            shape = RoundedCornerShape(14.dp),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
        ) {
            Text(stringResource(R.string.share_appointment), fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface)
        }

        Spacer(modifier = Modifier.height(24.dp))
    }
}

@Composable
private fun ConfirmedDetailRow(
    label: String,
    value: String,
    subtitle: String? = null,
    valueColor: Color = MaterialTheme.colorScheme.onSurface
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Top
    ) {
        Text(label, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.width(80.dp))
        Column(horizontalAlignment = Alignment.End) {
            Text(value, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = valueColor, textAlign = TextAlign.End)
            if (subtitle != null) {
                Text(subtitle, fontSize = 12.sp, color = SwastikPrimary, textAlign = TextAlign.End)
            }
        }
    }
}

@Composable
private fun SummaryRow(icon: String, label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(icon, fontSize = 18.sp); Spacer(modifier = Modifier.width(10.dp)); Text(label, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.width(80.dp)); Text(value, fontSize = 14.sp, fontWeight = FontWeight.Medium)
    }
}

fun getPredefinedOptions(specialization: String): Pair<List<String>, List<String>> {
    val cleanSpec = specialization.lowercase().trim()
    
    val reasons = when {
        cleanSpec.contains("cardio") -> listOf("Chest Pain", "High BP", "Palpitations", "Shortness of Breath")
        cleanSpec.contains("derma") -> listOf("Skin Rash", "Acne / Pimples", "Hair Fall", "Itching", "Pigmentation", "Fungal Infection")
        cleanSpec.contains("pediatric") || cleanSpec.contains("child") -> listOf("Child Fever", "Vaccination", "Cough & Cold", "Stomach Ache", "Growth Check")
        cleanSpec.contains("gyneco") || cleanSpec.contains("obste") -> listOf("Irregular Periods", "Pregnancy Checkup", "PCOD/PCOS", "Vaginal Infection", "Pelvic Pain")
        cleanSpec.contains("ortho") || cleanSpec.contains("bone") -> listOf("Joint Pain", "Back Pain", "Knee Pain", "Fracture/Injury", "Muscle Spasm", "Arthritis")
        cleanSpec.contains("neuro") -> listOf("Headache / Migraine", "Dizziness", "Numbness / Tingling", "Seizures", "Memory Issues")
        cleanSpec.contains("psychi") || cleanSpec.contains("psychol") -> listOf("Anxiety", "Depression", "Sleep Issues", "Stress", "Panic Attacks")
        cleanSpec.contains("dent") -> listOf("Toothache", "Bleeding Gums", "Cavity", "Scaling/Cleaning", "Root Canal")
        cleanSpec.contains("ophthalmo") || cleanSpec.contains("eye") -> listOf("Blurry Vision", "Eye Pain", "Redness / Itching", "Watering Eyes", "Cataract")
        cleanSpec.contains("ent") || cleanSpec.contains("ear") -> listOf("Ear Ache", "Hearing Loss", "Blocked Nose", "Sinus", "Sore Throat", "Vertigo")
        cleanSpec.contains("gastro") || cleanSpec.contains("stomach") -> listOf("Acidity / Reflux", "Constipation", "Diarrhea", "Stomach Pain", "Liver Issues")
        cleanSpec.contains("pulmono") || cleanSpec.contains("lung") -> listOf("Asthma / Wheezing", "Chronic Cough", "Shortness of Breath", "COPD")
        cleanSpec.contains("endo") || cleanSpec.contains("diabet") -> listOf("Diabetes / High Sugar", "Thyroid Issues", "Weight Gain/Loss", "Hormonal Imbalance")
        cleanSpec.contains("urolo") || cleanSpec.contains("kidney") || cleanSpec.contains("nephro") -> listOf("UTI / Burning Urine", "Kidney Stones", "Frequent Urination", "Prostate Issues")
        cleanSpec.contains("oncolo") || cleanSpec.contains("cancer") -> listOf("Cancer Screening", "Chemo Follow-up", "Tumor Check", "Second Opinion")
        cleanSpec.contains("surger") || cleanSpec.contains("surgeon") -> listOf("Piles/Hemorrhoids", "Hernia", "Appendicitis", "Varicose Veins")
        cleanSpec.contains("physio") -> listOf("Post-surgery Rehab", "Muscle Stiffness", "Frozen Shoulder", "Sports Injury")
        cleanSpec.contains("ayurveda") -> listOf("Ayurvedic Consultation", "Chronic Pain", "Digestion Issue", "Panchakarma")
        cleanSpec.contains("homeo") -> listOf("Homeopathic Consult", "Allergies", "Skin Issue", "Chronic Cold")
        cleanSpec.contains("diet") || cleanSpec.contains("nutrition") -> listOf("Diet Plan", "Weight Loss", "Weight Gain", "PCOS Diet", "Diabetes Diet")
        cleanSpec.contains("allergy") || cleanSpec.contains("immuno") -> listOf("Food Allergy", "Skin Allergy", "Dust Allergy", "Immunity Check")
        cleanSpec.contains("rheumato") -> listOf("Arthritis", "Joint Swelling", "Autoimmune Issue", "Gout")
        cleanSpec.contains("pain") -> listOf("Chronic Back Pain", "Nerve Pain", "Joint Pain", "Spine Issue")
        cleanSpec.contains("sport") -> listOf("Sports Injury", "Ligament Tear", "Sprain", "Fitness Consultation")
        cleanSpec.contains("infect") -> listOf("Viral Fever", "Dengue/Malaria", "Typhoid", "Chronic Infection")
        else -> listOf("General Checkup", "Fever", "Cold & Cough", "Body Ache", "Follow Up")
    }
    
    val commonSymptoms = when {
        cleanSpec.contains("cardio") -> listOf("Chest Tightness", "Sweating", "Dizziness", "Fatigue")
        cleanSpec.contains("derma") -> listOf("Redness", "Bumps", "Flaky Skin", "Dryness", "Dandruff")
        cleanSpec.contains("pediatric") -> listOf("High Fever", "Vomiting", "Not Eating", "Crying", "Rash")
        cleanSpec.contains("gyneco") -> listOf("Heavy Bleeding", "Cramps", "Missed Period", "Hot Flashes")
        cleanSpec.contains("ortho") -> listOf("Swelling", "Stiffness", "Inability to Move", "Redness")
        cleanSpec.contains("ent") -> listOf("Discharge", "Ringing in Ear", "Nasal Congestion", "Loss of Smell/Taste")
        cleanSpec.contains("gastro") -> listOf("Nausea", "Vomiting", "Bloating", "Loss of Appetite", "Blood in Stool")
        cleanSpec.contains("psychi") -> listOf("Restlessness", "Low Mood", "Racing Thoughts", "Fatigue")
        cleanSpec.contains("diet") || cleanSpec.contains("nutrition") -> listOf("Lethargy", "Hair Fall", "Weight Issues", "Indigestion")
        cleanSpec.contains("allergy") -> listOf("Sneezing", "Itching", "Hives", "Swelling", "Red Eyes")
        else -> listOf("Fever", "Headache", "Cough", "Weakness", "Nausea", "Pain")
    }
    
    return Pair(reasons, commonSymptoms)
}

@Composable
fun PreConsultationFormStep(
    specialization: String,
    reasonForVisit: String,
    onReasonChange: (String) -> Unit,
    symptoms: String,
    onSymptomsChange: (String) -> Unit,
    medicalNotes: String,
    onNotesChange: (String) -> Unit,
    onContinue: () -> Unit
) {
    val options = remember(specialization) { getPredefinedOptions(specialization) }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp)
            .verticalScroll(rememberScrollState())
    ) {
        Text(
            text = "Tell the doctor a bit about your health",
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Please select or type your health details.",
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Text("Select Primary Reason:", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface)
        Spacer(modifier = Modifier.height(8.dp))
        androidx.compose.foundation.lazy.LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            items(options.first.size) { index ->
                val reason = options.first[index]
                val selected = reasonForVisit == reason
                androidx.compose.material3.FilterChip(
                    selected = selected,
                    onClick = { onReasonChange(reason) },
                    label = { Text(reason) }
                )
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        
        OutlinedTextField(
            value = reasonForVisit,
            onValueChange = onReasonChange,
            label = { Text("Or Type Reason for Visit *") },
            placeholder = { Text("e.g. Follow up, Fever") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            shape = RoundedCornerShape(12.dp)
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Text("Select Symptoms:", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface)
        Spacer(modifier = Modifier.height(8.dp))
        androidx.compose.foundation.lazy.LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            items(options.second.size) { index ->
                val symp = options.second[index]
                val selectedList = symptoms.split(",").map { it.trim() }.filter { it.isNotEmpty() }
                val selected = selectedList.contains(symp)
                androidx.compose.material3.FilterChip(
                    selected = selected,
                    onClick = { 
                        if (selected) {
                            onSymptomsChange(selectedList.filter { it != symp }.joinToString(", "))
                        } else {
                            val newList = selectedList + symp
                            onSymptomsChange(newList.joinToString(", "))
                        }
                    },
                    label = { Text(symp) }
                )
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        
        OutlinedTextField(
            value = symptoms,
            onValueChange = onSymptomsChange,
            label = { Text("Or Type Symptoms") },
            placeholder = { Text("e.g. Headache, Cough, Nausea") },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp)
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        OutlinedTextField(
            value = medicalNotes,
            onValueChange = onNotesChange,
            label = { Text("Existing Medical Conditions / History") },
            placeholder = { Text("e.g. Diabetic, allergic to penicillin") },
            modifier = Modifier.fillMaxWidth().height(120.dp),
            shape = RoundedCornerShape(12.dp),
            maxLines = 5
        )
        
        Spacer(modifier = Modifier.height(32.dp))
        
        Button(
            onClick = onContinue,
            modifier = Modifier.fillMaxWidth().height(50.dp),
            shape = RoundedCornerShape(14.dp),
            enabled = reasonForVisit.isNotBlank()
        ) {
            Text("Continue", fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
        Spacer(modifier = Modifier.height(20.dp))
    }
}

@Composable
fun InformationalStep(
    onContinue: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp)
            .verticalScroll(rememberScrollState())
    ) {
        Text(
            text = "Why Choose Vaididea Consultations?",
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
        Spacer(modifier = Modifier.height(16.dp))
        
        InfoBullet(
            icon = Icons.Outlined.VerifiedUser,
            title = "Verified Professionals",
            description = "Only certified and thoroughly vetted doctors"
        )
        InfoBullet(
            icon = Icons.Outlined.Security,
            title = "Secure & Private",
            description = "Your health data and video consultations are fully encrypted"
        )
        InfoBullet(
            icon = Icons.Outlined.Receipt,
            title = "Instant Digital Prescriptions",
            description = "Get your valid Rx instantly after the consultation ends"
        )
        InfoBullet(
            icon = Icons.Outlined.Schedule,
            title = "Convenient Scheduling",
            description = "Book slots exactly when you need them"
        )

        Spacer(modifier = Modifier.height(24.dp))
        HorizontalDivider(color = MaterialTheme.colorScheme.surfaceVariant)
        Spacer(modifier = Modifier.height(24.dp))
        
        Text(
            text = "How it's done?",
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
        Spacer(modifier = Modifier.height(16.dp))
        
        HowItWorksStep(number = "1", title = "Plan the Work", desc = "Book your consultation and provide basic health details.")
        HowItWorksStep(number = "2", title = "Doctor Reviews", desc = "The doctor reviews your details and approves the appointment.")
        HowItWorksStep(number = "3", title = "Consultation", desc = "Connect via secure video or visit the clinic as scheduled.")
        
        Spacer(modifier = Modifier.height(32.dp))
        
        Button(
            onClick = onContinue,
            modifier = Modifier.fillMaxWidth().height(50.dp),
            shape = RoundedCornerShape(14.dp)
        ) {
            Text("Proceed to Review", fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
        Spacer(modifier = Modifier.height(20.dp))
    }
}

@Composable
fun InfoBullet(icon: androidx.compose.ui.graphics.vector.ImageVector, title: String, description: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
        verticalAlignment = Alignment.Top
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .background(SwastikPrimary.copy(alpha = 0.1f), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = SwastikPrimary, modifier = Modifier.size(24.dp))
        }
        Spacer(modifier = Modifier.width(16.dp))
        Column {
            Text(title, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = MaterialTheme.colorScheme.onSurface)
            Spacer(modifier = Modifier.height(4.dp))
            Text(description, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 20.sp)
        }
    }
}

@Composable
fun HowItWorksStep(number: String, title: String, desc: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
        verticalAlignment = Alignment.Top
    ) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(10.dp)),
            contentAlignment = Alignment.Center
        ) {
            Text(number, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Spacer(modifier = Modifier.width(16.dp))
        Column {
            Text(title, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = MaterialTheme.colorScheme.onSurface)
            Spacer(modifier = Modifier.height(4.dp))
            Text(desc, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 20.sp)
        }
    }
}
