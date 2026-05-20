package com.example.swastik.ui.screens.patient.vitals

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.data.model.VitalType
import com.example.swastik.data.remote.dto.ReminderDto
import com.example.swastik.data.remote.dto.VitalDto
import com.example.swastik.ui.viewmodel.VitalsViewModel
import java.util.Locale
import androidx.compose.ui.res.stringResource
import com.example.swastik.R

private val SwastikPurple = Color(0xFF6C63FF)

/**
 * Vitals & Reminders Screen — record vitals, manage health reminders.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VitalsRemindersScreen(
    onBackClick: () -> Unit,
    viewModel: VitalsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedTab by remember { mutableIntStateOf(0) }
    var showRecordVitalDialog by remember { mutableStateOf(false) }
    var showAddReminderDialog by remember { mutableStateOf(false) }
    var reminderToSnooze by remember { mutableStateOf<ReminderDto?>(null) }
    val snackbarHostState = remember { SnackbarHostState() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.vitals_reminders), fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = SwastikPurple, titleContentColor = Color.White, navigationIconContentColor = Color.White)
            )
        },
        snackbarHost = {
            SnackbarHost(hostState = snackbarHostState)
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = {
                    if (selectedTab == 0) showRecordVitalDialog = true
                    else showAddReminderDialog = true
                },
                containerColor = SwastikPurple
            ) {
                Icon(Icons.Default.Add, "Add", tint = Color.White)
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Tab Row
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = Color.White,
                contentColor = SwastikPurple
            ) {
                Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(Icons.Default.MonitorHeart, null, modifier = Modifier.size(18.dp))
                        Text(stringResource(R.string.vitals), fontWeight = FontWeight.Medium)
                    }
                }
                Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(Icons.Default.Alarm, null, modifier = Modifier.size(18.dp))
                        Text(stringResource(R.string.reminders), fontWeight = FontWeight.Medium)
                    }
                }
            }

            if (uiState.isLoading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = SwastikPurple)
                }
            } else {
                when (selectedTab) {
                    0 -> VitalsTab(vitals = uiState.vitals)
                    1 -> RemindersTab(
                        reminders = uiState.reminders,
                        activeReminderActionId = uiState.activeReminderActionId,
                        onTake = { viewModel.takeReminder(it) },
                        onSkip = { viewModel.skipReminder(it) },
                        onSnooze = { reminderToSnooze = it },
                        onDelete = { viewModel.deleteReminder(it) }
                    )
                }
            }
        }
    }

    // Record Vital Dialog
    if (showRecordVitalDialog) {
        RecordVitalDialog(
            onDismiss = { showRecordVitalDialog = false },
            onRecord = { type, value, notes ->
                viewModel.recordVital(type, value, notes)
                showRecordVitalDialog = false
            }
        )
    }

    // Add Reminder Dialog
    if (showAddReminderDialog) {
        AddReminderDialog(
            onDismiss = { showAddReminderDialog = false },
            onAdd = { title, type, time ->
                viewModel.createReminder(title, type, time)
                showAddReminderDialog = false
            }
        )
    }

    // Success feedback
    LaunchedEffect(uiState.vitalRecordSuccess) {
        if (uiState.vitalRecordSuccess) viewModel.resetFlags()
    }
    LaunchedEffect(uiState.reminderCreated) {
        if (uiState.reminderCreated) viewModel.resetFlags()
    }
    LaunchedEffect(uiState.reminderActionMessage) {
        uiState.reminderActionMessage?.let { message ->
            snackbarHostState.showSnackbar(message)
            viewModel.clearReminderFeedback()
        }
    }
    LaunchedEffect(uiState.reminderActionError) {
        uiState.reminderActionError?.let { message ->
            snackbarHostState.showSnackbar(message)
            viewModel.clearReminderFeedback()
        }
    }

    if (reminderToSnooze != null) {
        SnoozeReminderDialog(
            reminderTitle = reminderToSnooze?.title.orEmpty(),
            onDismiss = { reminderToSnooze = null },
            onSelectMinutes = { minutes ->
                reminderToSnooze?.let { viewModel.snoozeReminder(it, minutes) }
                reminderToSnooze = null
            }
        )
    }
}

@Composable
private fun VitalsTab(vitals: List<VitalDto>) {
    if (vitals.isEmpty()) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Default.MonitorHeart, null, tint = Color.Gray, modifier = Modifier.size(64.dp))
                Spacer(Modifier.height(8.dp))
                Text(stringResource(R.string.no_vitals_recorded_yet), color = Color.Gray)
                Text(stringResource(R.string.tap_to_record_your_first_vital), color = Color.Gray, fontSize = 12.sp)
            }
        }
    } else {
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(vitals) { vital ->
                VitalCard(vital)
            }
        }
    }
}

@Composable
private fun VitalCard(vital: VitalDto) {
    val (icon, color) = getVitalIconAndColor(vital.type ?: "")
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(color.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, null, tint = color, modifier = Modifier.size(24.dp))
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    stringResource(getVitalDisplayName(vital.type ?: "")),
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp
                )
                vital.recordedAt?.let {
                    Text(it.take(10), color = Color.Gray, fontSize = 12.sp)
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    vital.value ?: "--",
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp,
                    color = color
                )
                vital.unit?.let {
                    Text(it, color = Color.Gray, fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
private fun RemindersTab(
    reminders: List<ReminderDto>,
    activeReminderActionId: String?,
    onTake: (ReminderDto) -> Unit,
    onSkip: (ReminderDto) -> Unit,
    onSnooze: (ReminderDto) -> Unit,
    onDelete: (String) -> Unit
) {
    if (reminders.isEmpty()) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Default.Alarm, null, tint = Color.Gray, modifier = Modifier.size(64.dp))
                Spacer(Modifier.height(8.dp))
                Text(stringResource(R.string.no_reminders_set_1), color = Color.Gray)
                Text(stringResource(R.string.tap_to_create_a_reminder), color = Color.Gray, fontSize = 12.sp)
            }
        }
    } else {
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(reminders) { reminder ->
                ReminderCard(
                    reminder = reminder,
                    actionInProgress = activeReminderActionId == reminder.id,
                    onTake = { onTake(reminder) },
                    onSkip = { onSkip(reminder) },
                    onSnooze = { onSnooze(reminder) },
                    onDelete = { onDelete(reminder.id) }
                )
            }
        }
    }
}

@Composable
private fun ReminderCard(
    reminder: ReminderDto,
    actionInProgress: Boolean,
    onTake: () -> Unit,
    onSkip: () -> Unit,
    onSnooze: () -> Unit,
    onDelete: () -> Unit
) {
    val typeIcon = when (reminder.type.lowercase()) {
        "medicine" -> Icons.Default.Medication
        "appointment" -> Icons.Default.EventAvailable
        else -> Icons.Default.Biotech
    }
    val typeColor = when (reminder.type.lowercase()) {
        "medicine" -> Color(0xFF4CAF50)
        "appointment" -> SwastikPurple
        else -> Color(0xFFFF9800)
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(typeColor.copy(alpha = 0.1f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(typeIcon, null, tint = typeColor, modifier = Modifier.size(22.dp))
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(reminder.title, fontWeight = FontWeight.SemiBold)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Schedule, null, modifier = Modifier.size(14.dp), tint = Color.Gray)
                        Spacer(Modifier.width(4.dp))
                        Text(reminder.time, color = Color.Gray, fontSize = 12.sp)
                        Spacer(Modifier.width(8.dp))
                        AssistChip(
                            onClick = {},
                            label = { Text(reminder.type, fontSize = 10.sp) },
                            modifier = Modifier.height(24.dp)
                        )
                    }
                }
                IconButton(onClick = onDelete) {
                    Icon(Icons.Default.Delete, "Delete", tint = Color(0xFFE53935))
                }
            }

            if (reminder.isCompleted) {
                Surface(
                    color = Color(0xFFE8F5E9),
                    shape = RoundedCornerShape(999.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = Color(0xFF2E7D32),
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            stringResource(R.string.marked_for_today),
                            color = Color(0xFF2E7D32),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            } else {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    FilledTonalButton(
                        onClick = onTake,
                        enabled = !actionInProgress,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.filledTonalButtonColors(
                            containerColor = Color(0xFFE8F5E9),
                            contentColor = Color(0xFF2E7D32)
                        )
                    ) {
                        Text(stringResource(R.string.taken))
                    }
                    FilledTonalButton(
                        onClick = onSnooze,
                        enabled = !actionInProgress,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.filledTonalButtonColors(
                            containerColor = Color(0xFFEFF3FF),
                            contentColor = SwastikPurple
                        )
                    ) {
                        Text(stringResource(R.string.snooze))
                    }
                    OutlinedButton(
                        onClick = onSkip,
                        enabled = !actionInProgress,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(stringResource(R.string.skip))
                    }
                }
            }

            if (actionInProgress) {
                LinearProgressIndicator(
                    modifier = Modifier.fillMaxWidth(),
                    color = SwastikPurple,
                    trackColor = SwastikPurple.copy(alpha = 0.16f)
                )
            }
        }
    }
}

@Composable
private fun SnoozeReminderDialog(
    reminderTitle: String,
    onDismiss: () -> Unit,
    onSelectMinutes: (Int) -> Unit
) {
    val options = listOf(10, 15, 30, 60)

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.snooze_reminder), fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    stringResource(R.string.snooze_instruction, reminderTitle),
                    fontSize = 14.sp,
                    color = Color(0xFF374151)
                )
                options.chunked(2).forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        row.forEach { minutes ->
                            FilledTonalButton(
                                onClick = { onSelectMinutes(minutes) },
                                modifier = Modifier.weight(1f)
                            ) {
                                Text(stringResource(R.string.minutes_format, minutes))
                            }
                        }
                        if (row.size == 1) {
                            Spacer(modifier = Modifier.weight(1f))
                        }
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = {
            TextButton(onClick = onDismiss) { Text(stringResource(R.string.cancel)) }
        }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RecordVitalDialog(
    onDismiss: () -> Unit,
    onRecord: (VitalType, String, String?) -> Unit
) {
    var selectedType by remember { mutableStateOf(VitalType.BLOOD_PRESSURE) }
    var value by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.record_vital), fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(stringResource(R.string.vital_type), fontWeight = FontWeight.Medium)
                // Type selector chips
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    VitalType.entries.chunked(2).forEach { row ->
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            row.forEach { type ->
                                FilterChip(
                                    selected = selectedType == type,
                                    onClick = { selectedType = type },
                                    label = { Text(type.displayName, fontSize = 12.sp) },
                                    modifier = Modifier.weight(1f)
                                )
                            }
                            if (row.size == 1) Spacer(Modifier.weight(1f))
                        }
                    }
                }

                OutlinedTextField(
                    value = value,
                    onValueChange = { value = it },
                    label = { Text(stringResource(R.string.value_with_unit_format, selectedType.defaultUnit)) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text(stringResource(R.string.notes_optional_1)) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onRecord(selectedType, value, notes.ifBlank { null }) },
                enabled = value.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPurple)
            ) { Text(stringResource(R.string.record)) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text(stringResource(R.string.cancel)) }
        }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddReminderDialog(
    onDismiss: () -> Unit,
    onAdd: (String, String, String) -> Unit
) {
    var title by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("medicine") }
    var time by remember { mutableStateOf("") }
    var showTimePicker by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.add_reminder), fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text(stringResource(R.string.reminder_title)) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Text(stringResource(R.string.type), fontWeight = FontWeight.Medium)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(selected = type == "medicine", onClick = { type = "medicine" }, label = { Text(stringResource(R.string.medicine_1)) })
                    FilterChip(selected = type == "appointment", onClick = { type = "appointment" }, label = { Text(stringResource(R.string.appointment)) })
                    FilterChip(selected = type == "test", onClick = { type = "test" }, label = { Text(stringResource(R.string.test)) })
                }

                OutlinedTextField(
                    value = time,
                    onValueChange = { },
                    label = { Text(stringResource(R.string.select_time)) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { showTimePicker = true },
                    enabled = false,
                    trailingIcon = {
                        IconButton(onClick = { showTimePicker = true }) {
                            Icon(Icons.Outlined.AccessTime, contentDescription = "Pick Time", tint = SwastikPurple)
                        }
                    },
                    colors = OutlinedTextFieldDefaults.colors(
                        disabledTextColor = Color.Black,
                        disabledLabelColor = Color.Gray,
                        disabledBorderColor = Color.Gray,
                        disabledTrailingIconColor = SwastikPurple
                    ),
                    singleLine = true
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onAdd(title, type, time) },
                enabled = title.isNotBlank() && time.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPurple)
            ) { Text(stringResource(R.string.add)) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text(stringResource(R.string.cancel)) }
        }
    )

    // TimePicker Dialog
    if (showTimePicker) {
        val timePickerState = rememberTimePickerState()
        AlertDialog(
            onDismissRequest = { showTimePicker = false },
            title = { Text(stringResource(R.string.select_time)) },
            text = {
                TimePicker(state = timePickerState)
            },
            confirmButton = {
                TextButton(onClick = {
                    val hour = timePickerState.hour
                    val minute = timePickerState.minute
                    val amPm = if (hour < 12) "AM" else "PM"
                    val hour12 = if (hour == 0) 12 else if (hour > 12) hour - 12 else hour
                    time = String.format(Locale.US, "%02d:%02d %s", hour12, minute, amPm)
                    showTimePicker = false
                }) { Text(stringResource(R.string.ok), color = SwastikPurple) }
            },
            dismissButton = {
                TextButton(onClick = { showTimePicker = false }) { Text(stringResource(R.string.cancel)) }
            }
        )
    }
}

private fun getVitalIconAndColor(type: String): Pair<ImageVector, Color> {
    return when (type.lowercase()) {
        "blood_pressure" -> Icons.Default.MonitorHeart to Color(0xFFE53935)
        "heart_rate" -> Icons.Default.Favorite to Color(0xFFE91E63)
        "temperature" -> Icons.Default.Thermostat to Color(0xFFFF9800)
        "blood_sugar" -> Icons.Default.Bloodtype to Color(0xFF9C27B0)
        "oxygen_saturation" -> Icons.Default.Air to Color(0xFF2196F3)
        "weight" -> Icons.Default.FitnessCenter to Color(0xFF4CAF50)
        "height" -> Icons.Default.Height to Color(0xFF00BCD4)
        else -> Icons.Default.HealthAndSafety to Color.Gray
    }
}

private fun getVitalDisplayName(type: String): Int {
    return when (type.lowercase()) {
        "blood_pressure" -> R.string.blood_pressure
        "heart_rate" -> R.string.heart_rate
        "temperature" -> R.string.temperature
        "blood_sugar" -> R.string.blood_sugar
        "oxygen_saturation" -> R.string.oxygen_level
        "weight" -> R.string.weight
        "height" -> R.string.height
        else -> R.string.vital
    }
}
