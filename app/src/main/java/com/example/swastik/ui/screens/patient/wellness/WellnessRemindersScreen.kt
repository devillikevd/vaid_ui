package com.example.swastik.ui.screens.patient.wellness

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.data.remote.dto.CreateReminderRequest
import com.example.swastik.data.remote.dto.ReminderDto
import com.example.swastik.ui.viewmodel.RemindersViewModel
import kotlinx.coroutines.delay
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.util.Locale

private val WellnessGreen = Color(0xFF2E7D32)
private val WellnessGreenLight = Color(0xFFE8F5E9)

private val reminderTypes = listOf(
    "medication" to "Medication",
    "water" to "Water",
    "workout" to "Workout",
    "sleep" to "Sleep",
    "other" to "Other"
)

private val dayOptions = listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WellnessRemindersScreen(
    onBackClick: () -> Unit
) {
    val viewModel: RemindersViewModel = hiltViewModel()
    val uiState by viewModel.uiState.collectAsState()

    var title by remember { mutableStateOf("") }
    var type by remember { mutableStateOf(reminderTypes.first().first) }
    var time by remember { mutableStateOf("08:00 AM") }
    var notes by remember { mutableStateOf("") }
    val selectedDays = remember { mutableStateListOf<String>() }

    LaunchedEffect(uiState.successMessage) {
        if (uiState.successMessage != null) {
            delay(3000)
            viewModel.clearMessages()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Smart Reminders", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = WellnessGreen,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { paddingValues ->
        if (uiState.isLoading) {
            Box(
                modifier = Modifier.fillMaxSize().padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = WellnessGreen)
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .background(Color(0xFFF8FAF8)),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item {
                    Text(
                        "Manage your daily wellness notifications to stay on track.",
                        color = Color.Gray,
                        fontSize = 14.sp,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                }

                uiState.successMessage?.let { message ->
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = WellnessGreenLight)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Filled.CheckCircle,
                                    contentDescription = null,
                                    tint = WellnessGreen,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(Modifier.width(8.dp))
                                Text(message, color = WellnessGreen, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                            }
                        }
                    }
                }

                uiState.error?.let { error ->
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFFFEBEE))
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Filled.ErrorOutline,
                                    contentDescription = null,
                                    tint = Color(0xFFC62828),
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(Modifier.width(8.dp))
                                Text(error, color = Color(0xFFC62828), fontSize = 13.sp, modifier = Modifier.weight(1f))
                                TextButton(onClick = { viewModel.load() }) {
                                    Text("Retry", color = Color(0xFFC62828))
                                }
                            }
                        }
                    }
                }

                item {
                    AddReminderForm(
                        title = title,
                        onTitleChange = { title = it },
                        type = type,
                        onTypeChange = { type = it },
                        time = time,
                        onTimeChange = { time = it },
                        selectedDays = selectedDays,
                        onToggleDay = { day ->
                            if (selectedDays.contains(day)) selectedDays.remove(day) else selectedDays.add(day)
                        },
                        notes = notes,
                        onNotesChange = { notes = it },
                        isSubmitting = uiState.isSubmitting,
                        onSubmit = {
                            viewModel.create(
                                CreateReminderRequest(
                                    title = title.trim(),
                                    type = type,
                                    time = time.trim(),
                                    days = selectedDays.toList(),
                                    notes = notes.trim().ifEmpty { null }
                                )
                            )
                            title = ""
                            time = "08:00 AM"
                            notes = ""
                            selectedDays.clear()
                        }
                    )
                }

                item {
                    Text("Your Reminders", fontWeight = FontWeight.Bold, fontSize = 17.sp)
                }

                if (uiState.reminders.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 32.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(
                                    Icons.Filled.Alarm,
                                    contentDescription = null,
                                    tint = Color.LightGray,
                                    modifier = Modifier.size(64.dp)
                                )
                                Spacer(Modifier.height(12.dp))
                                Text(
                                    "No reminders yet",
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 18.sp,
                                    color = Color.Gray
                                )
                                Text(
                                    "Add a reminder to get started",
                                    fontSize = 14.sp,
                                    color = Color.LightGray
                                )
                            }
                        }
                    }
                } else {
                    items(uiState.reminders, key = { it.id }) { reminder ->
                        ReminderCard(
                            reminder = reminder,
                            onDelete = { viewModel.delete(reminder.id) },
                            onSnooze = {
                                viewModel.act(reminder.id, "snooze", currentTimeString(), 10)
                            },
                            onDone = {
                                viewModel.act(reminder.id, "done", currentTimeString())
                            }
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun AddReminderForm(
    title: String,
    onTitleChange: (String) -> Unit,
    type: String,
    onTypeChange: (String) -> Unit,
    time: String,
    onTimeChange: (String) -> Unit,
    selectedDays: List<String>,
    onToggleDay: (String) -> Unit,
    notes: String,
    onNotesChange: (String) -> Unit,
    isSubmitting: Boolean,
    onSubmit: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("Add Reminder", fontWeight = FontWeight.Bold, fontSize = 16.sp)

            OutlinedTextField(
                value = title,
                onValueChange = onTitleChange,
                label = { Text("Reminder title") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            Text("Type", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Color.Gray)
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                reminderTypes.forEach { (value, label) ->
                    FilterChip(
                        selected = type == value,
                        onClick = { onTypeChange(value) },
                        label = { Text(label, fontSize = 12.sp) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = WellnessGreen,
                            selectedLabelColor = Color.White
                        )
                    )
                }
            }

            OutlinedTextField(
                value = time,
                onValueChange = onTimeChange,
                label = { Text("Time (e.g. 08:00 AM)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            Text("Repeat on", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Color.Gray)
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                dayOptions.forEach { day ->
                    val isSelected = selectedDays.contains(day)
                    FilterChip(
                        selected = isSelected,
                        onClick = { onToggleDay(day) },
                        label = { Text(day, fontSize = 12.sp) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = WellnessGreen,
                            selectedLabelColor = Color.White
                        )
                    )
                }
            }

            OutlinedTextField(
                value = notes,
                onValueChange = onNotesChange,
                label = { Text("Notes (optional)") },
                modifier = Modifier.fillMaxWidth()
            )

            Button(
                onClick = onSubmit,
                enabled = title.isNotBlank() && time.isNotBlank() && !isSubmitting,
                modifier = Modifier.fillMaxWidth().height(44.dp),
                colors = ButtonDefaults.buttonColors(containerColor = WellnessGreen),
                shape = RoundedCornerShape(10.dp)
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = Color.White,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text("Add Reminder", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ReminderCard(
    reminder: ReminderDto,
    onDelete: () -> Unit,
    onSnooze: () -> Unit,
    onDone: () -> Unit
) {
    val (icon, iconTint) = reminderVisual(reminder.type)
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .background(iconTint.copy(alpha = 0.1f), RoundedCornerShape(12.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(24.dp))
                }
                Spacer(Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(reminder.title, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.Schedule, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(4.dp))
                        Text(reminder.time, fontSize = 13.sp, color = Color.Gray)
                    }
                }
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = iconTint.copy(alpha = 0.12f)
                ) {
                    Text(
                        typeLabel(reminder.type),
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        color = iconTint,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 12.sp
                    )
                }
            }

            if (!reminder.days.isNullOrEmpty()) {
                Spacer(Modifier.height(10.dp))
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    reminder.days.forEach { day ->
                        Surface(
                            shape = RoundedCornerShape(5.dp),
                            color = Color(0xFFF1F8E9)
                        ) {
                            Text(
                                day,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                color = WellnessGreen,
                                fontSize = 11.sp
                            )
                        }
                    }
                }
            }

            if (!reminder.notes.isNullOrBlank()) {
                Spacer(Modifier.height(8.dp))
                Text(reminder.notes, fontSize = 12.sp, color = Color.Gray)
            }

            if (!reminder.snoozeUntil.isNullOrBlank()) {
                Spacer(Modifier.height(8.dp))
                Text("Snoozed until ${reminder.snoozeUntil}", fontSize = 11.sp, color = Color(0xFFF57F17))
            }

            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (!reminder.snoozeUntil.isNullOrBlank()) {
                    OutlinedButton(
                        onClick = onSnooze,
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Filled.Snooze, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Snooze", fontSize = 13.sp)
                    }
                    OutlinedButton(
                        onClick = onDone,
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = WellnessGreen)
                    ) {
                        Icon(Icons.Filled.Done, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Done", fontSize = 13.sp)
                    }
                }
                OutlinedButton(
                    onClick = onDelete,
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFC62828))
                ) {
                    Icon(Icons.Filled.Delete, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Delete", fontSize = 13.sp)
                }
            }
        }
    }
}

private fun reminderVisual(type: String): Pair<androidx.compose.ui.graphics.vector.ImageVector, Color> = when (type) {
    "medication" -> Icons.Filled.Medication to Color(0xFFC62828)
    "water" -> Icons.Filled.WaterDrop to Color(0xFF0288D1)
    "workout" -> Icons.Filled.FitnessCenter to WellnessGreen
    "sleep" -> Icons.Filled.Bedtime to Color(0xFF5C6BC0)
    else -> Icons.Filled.Notifications to Color(0xFFF57F17)
}

private fun typeLabel(type: String): String =
    reminderTypes.firstOrNull { it.first == type }?.second
        ?: type.replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.getDefault()) else it.toString() }

private fun currentTimeString(): String =
    LocalTime.now().format(DateTimeFormatter.ofPattern("hh:mm a"))
