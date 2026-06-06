
package com.example.swastik.ui.screens.patient.tabs

import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.clip

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Alarm
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.data.model.PatientProfile
import com.example.swastik.data.model.Reminder
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.ui.theme.SwastikPrimaryLight
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import androidx.compose.material3.MaterialTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RemindersTabContent(
    modifier: Modifier = Modifier,
    profile: PatientProfile?,
    reminders: List<Reminder>,
    isLoading: Boolean = false,
    unreadNotificationsCount: Int,
    onNotificationClick: () -> Unit,
    onCreateReminder: (title: String, time: String, type: String, days: List<String>, notes: String?) -> Unit = { _, _, _, _, _ -> },
    onMarkDone: (id: String, time: String) -> Unit = { _, _ -> },
    onSnooze: (id: String, time: String, mins: Int) -> Unit = { _, _, _ -> },
    onSkip: (id: String, time: String) -> Unit = { _, _ -> },
    onDelete: (id: String) -> Unit = {}
) {
    var showCreateSheet by remember { mutableStateOf(false) }
    var selectedFilter by remember { mutableStateOf("All") }
    val filters = listOf("All", "Medicine", "Appointment", "Test", "Custom")

    val filteredReminders = if (selectedFilter == "All") reminders else reminders.filter { 
        it.type.name.equals(selectedFilter, ignoreCase = true) 
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        containerColor = MaterialTheme.colorScheme.background,
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showCreateSheet = true },
                containerColor = SwastikPrimary,
                contentColor = MaterialTheme.colorScheme.onPrimary
            ) {
                Icon(Icons.Filled.Add, "Add Reminder")
            }
        },
        floatingActionButtonPosition = FabPosition.End
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Simple Header
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.background)
                    .padding(horizontal = 16.dp, vertical = 20.dp)
            ) {
                Text(
                    text = "My Reminders",
                    fontWeight = FontWeight.Bold,
                    fontSize = 24.sp,
                    color = MaterialTheme.colorScheme.onBackground
                )
            }

            // Filter Chips
            ScrollableTabRow(
                selectedTabIndex = filters.indexOf(selectedFilter).coerceAtLeast(0),
                edgePadding = 16.dp,
                containerColor = Color.Transparent,
                divider = {},
                indicator = {}
            ) {
                filters.forEach { filter ->
                    val isSelected = selectedFilter == filter
                    Surface(
                        modifier = Modifier
                            .padding(end = 8.dp, bottom = 8.dp)
                            .clickable { selectedFilter = filter },
                        shape = RoundedCornerShape(16.dp),
                        color = if (isSelected) SwastikPrimary else MaterialTheme.colorScheme.surface,
                        border = if (!isSelected) androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant) else null
                    ) {
                        Text(
                            text = filter,
                            color = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            if (isLoading && reminders.isEmpty()) {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(3) {
                        com.example.swastik.ui.components.ReminderShimmer()
                    }
                }
            } else if (filteredReminders.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Filled.Alarm, null, tint = MaterialTheme.colorScheme.outlineVariant, modifier = Modifier.size(64.dp))
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "No upcoming reminders.",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onBackground
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(top = 16.dp, bottom = 80.dp, start = 8.dp, end = 16.dp),
                ) {
                    itemsIndexed(filteredReminders, key = { _, it -> it.id }) { index, reminder ->
                        val isLast = index == filteredReminders.size - 1
                        val outlineVariant = MaterialTheme.colorScheme.outlineVariant
                        val dismissState = rememberSwipeToDismissBoxState(
                            confirmValueChange = {
                                if (it == SwipeToDismissBoxValue.EndToStart) {
                                    onDelete(reminder.id)
                                    true
                                } else {
                                    false
                                }
                            }
                        )

                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .drawBehind {
                                    if (!isLast) {
                                        val strokeWidth = 1.5.dp.toPx()
                                        val xOffset = 13.dp.toPx()
                                        val yStart = 24.dp.toPx()
                                        drawLine(
                                            color = outlineVariant.copy(alpha = 0.5f),
                                            start = androidx.compose.ui.geometry.Offset(xOffset, yStart),
                                            end = androidx.compose.ui.geometry.Offset(xOffset, size.height),
                                            strokeWidth = strokeWidth
                                        )
                                    }
                                }
                        ) {
                            Row(modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)) {
                                // Timeline Node
                                Box(
                                    modifier = Modifier
                                        .padding(top = 28.dp, start = 8.dp)
                                        .size(10.dp)
                                        .clip(androidx.compose.foundation.shape.CircleShape)
                                        .background(if (reminder.isCompleted) Color(0xFF4CAF50) else SwastikPrimary)
                                )
                                
                                Spacer(modifier = Modifier.width(16.dp))
                                
                                Box(modifier = Modifier.weight(1f)) {
                                    SwipeToDismissBox(
                                        state = dismissState,
                                        backgroundContent = {
                                            val color = when (dismissState.targetValue) {
                                                SwipeToDismissBoxValue.EndToStart -> Color(0xFFFFEBEE)
                                                else -> Color.Transparent
                                            }
                                            val iconColor = when (dismissState.targetValue) {
                                                SwipeToDismissBoxValue.EndToStart -> Color(0xFFD32F2F)
                                                else -> Color.Transparent
                                            }
                                            Box(
                                                modifier = Modifier
                                                    .fillMaxSize()
                                                    .background(color, RoundedCornerShape(16.dp))
                                                    .padding(end = 24.dp),
                                                contentAlignment = Alignment.CenterEnd
                                            ) {
                                                if (dismissState.targetValue == SwipeToDismissBoxValue.EndToStart) {
                                                    Icon(Icons.Filled.Delete, contentDescription = "Delete", tint = iconColor, modifier = Modifier.size(28.dp))
                                                }
                                            }
                                        },
                                        enableDismissFromStartToEnd = false
                                    ) {
                                        ReminderCard(
                                            reminder = reminder,
                                            onMarkDone = { onMarkDone(reminder.id, reminder.time) },
                                            onSnooze = { id, time, mins -> onSnooze(id, time, mins) },
                                            onSkip = { onSkip(reminder.id, reminder.time) },
                                            onDelete = { onDelete(reminder.id) }
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showCreateSheet) {
        CreateReminderBottomSheet(
            onDismiss = { showCreateSheet = false },
            onCreate = { title, time, type, days, notes ->
                onCreateReminder(title, time, type, days, notes)
                showCreateSheet = false
            }
        )
    }
}

@Composable
private fun ReminderCard(
    reminder: Reminder,
    onMarkDone: () -> Unit,
    onSnooze: (id: String, scheduledAt: String, snoozeMinutes: Int) -> Unit,
    onSkip: () -> Unit,
    onDelete: () -> Unit = {}
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(1.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .background(MaterialTheme.colorScheme.primaryContainer, RoundedCornerShape(12.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Filled.Alarm, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                }
                
                Spacer(modifier = Modifier.width(16.dp))
                
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = reminder.title,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "${reminder.time} • ${reminder.type.name.lowercase().replaceFirstChar { it.uppercase() }}",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                IconButton(onClick = onDelete) {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = "Delete",
                        tint = MaterialTheme.colorScheme.error.copy(alpha = 0.7f),
                        modifier = Modifier.size(20.dp)
                    )
                }
            }

            if (reminder.isCompleted) {
                Surface(
                    color = MaterialTheme.colorScheme.secondaryContainer,
                    shape = RoundedCornerShape(999.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            Icons.Filled.CheckCircle,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSecondaryContainer,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = "Marked for today",
                            color = MaterialTheme.colorScheme.onSecondaryContainer,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            } else if (reminder.snoozeUntil != null) {
                Surface(
                    color = MaterialTheme.colorScheme.tertiaryContainer,
                    shape = RoundedCornerShape(999.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            Icons.Filled.Alarm,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onTertiaryContainer,
                            modifier = Modifier.size(16.dp)
                        )
                        val snoozeTimeStr = try {
                            val dt = java.time.Instant.parse(reminder.snoozeUntil).atZone(java.time.ZoneId.systemDefault())
                            String.format("%02d:%02d", dt.hour, dt.minute)
                        } catch(e: Exception) { "" }
                        Text(
                            text = "Snoozed until $snoozeTimeStr",
                            color = MaterialTheme.colorScheme.onTertiaryContainer,
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
                        onClick = onMarkDone,
                        modifier = Modifier.weight(1f),
                        contentPadding = PaddingValues(horizontal = 4.dp),
                        colors = ButtonDefaults.filledTonalButtonColors(
                            containerColor = MaterialTheme.colorScheme.secondaryContainer,
                            contentColor = MaterialTheme.colorScheme.onSecondaryContainer
                        )
                    ) {
                        Text("Taken", fontSize = 12.sp, maxLines = 1)
                    }
                    var showSnoozeMenu by remember { mutableStateOf(false) }
                    Box(modifier = Modifier.weight(1f)) {
                        FilledTonalButton(
                            onClick = { showSnoozeMenu = true },
                            modifier = Modifier.fillMaxWidth(),
                            contentPadding = PaddingValues(horizontal = 4.dp),
                            colors = ButtonDefaults.filledTonalButtonColors(
                                containerColor = MaterialTheme.colorScheme.tertiaryContainer,
                                contentColor = MaterialTheme.colorScheme.onTertiaryContainer
                            )
                        ) {
                            Text("Snooze", fontSize = 12.sp, maxLines = 1)
                        }
                            DropdownMenu(
                                expanded = showSnoozeMenu,
                                onDismissRequest = { showSnoozeMenu = false }
                            ) {
                                DropdownMenuItem(
                                    text = { Text("5 minutes") },
                                    onClick = { onSnooze(reminder.id, reminder.time, 5); showSnoozeMenu = false }
                                )
                                DropdownMenuItem(
                                    text = { Text("15 minutes") },
                                    onClick = { onSnooze(reminder.id, reminder.time, 15); showSnoozeMenu = false }
                                )
                                DropdownMenuItem(
                                    text = { Text("30 minutes") },
                                    onClick = { onSnooze(reminder.id, reminder.time, 30); showSnoozeMenu = false }
                                )
                                DropdownMenuItem(
                                    text = { Text("1 hour") },
                                    onClick = { onSnooze(reminder.id, reminder.time, 60); showSnoozeMenu = false }
                                )
                            }
                    }
                    OutlinedButton(
                        onClick = onSkip,
                        modifier = Modifier.weight(1f),
                        contentPadding = PaddingValues(horizontal = 4.dp)
                    ) {
                        Text("Skip", fontSize = 12.sp, maxLines = 1)
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateReminderBottomSheet(
    onDismiss: () -> Unit,
    onCreate: (title: String, time: String, type: String, days: List<String>, notes: String?) -> Unit
) {
    var title by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    var selectedType by remember { mutableStateOf("medicine") }
    val types = listOf("medicine" to "Medicine \uD83D\uDC8A", "appointment" to "Appointment \uD83D\uDCC5", "test" to "Test \uD83E\uDDEA", "custom" to "Custom \u270F\uFE0F")
    
    val daysOfWeek = listOf("sun" to "Su", "mon" to "M", "tue" to "T", "wed" to "W", "thu" to "Th", "fri" to "F", "sat" to "S")
    var selectedDays by remember { mutableStateOf(emptySet<String>()) }
    
    // TimePicker State
    val timePickerState = rememberTimePickerState(
        initialHour = LocalTime.now().hour,
        initialMinute = LocalTime.now().minute
    )

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .imePadding()
                .padding(horizontal = 24.dp, vertical = 16.dp)
                .verticalScroll(androidx.compose.foundation.rememberScrollState())
        ) {
            Text("Create Reminder", fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(24.dp))

            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text("Reminder Title") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            
            Spacer(modifier = Modifier.height(20.dp))
            Text("Category", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
            Spacer(modifier = Modifier.height(8.dp))
            
            // Type Chips
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                types.chunked(2).first().forEach { (id, label) ->
                    FilterChip(
                        selected = selectedType == id,
                        onClick = { selectedType = id },
                        label = { Text(label) }
                    )
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                types.chunked(2).last().forEach { (id, label) ->
                    FilterChip(
                        selected = selectedType == id,
                        onClick = { selectedType = id },
                        label = { Text(label) }
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
            Text("Select Time", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
            Spacer(modifier = Modifier.height(8.dp))
            
            Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                TimePicker(state = timePickerState)
            }

            Spacer(modifier = Modifier.height(24.dp))
            Text("Repeat Days", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                daysOfWeek.forEach { (id, label) ->
                    val isSelected = selectedDays.contains(id)
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(androidx.compose.foundation.shape.CircleShape)
                            .background(if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant)
                            .clickable {
                                if (isSelected) {
                                    selectedDays = selectedDays - id
                                } else {
                                    selectedDays = selectedDays + id
                                }
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = label,
                            color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
            OutlinedTextField(
                value = notes,
                onValueChange = { notes = it },
                label = { Text("Notes (Optional)") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2,
                maxLines = 4
            )

            Spacer(modifier = Modifier.height(32.dp))
            
            Button(
                onClick = {
                    val hour = timePickerState.hour.toString().padStart(2, '0')
                    val min = timePickerState.minute.toString().padStart(2, '0')
                    onCreate(title, "$hour:$min", selectedType, selectedDays.toList(), notes.takeIf { it.isNotBlank() })
                },
                modifier = Modifier.fillMaxWidth().height(50.dp),
                enabled = title.isNotBlank()
            ) {
                Text("Save Reminder")
            }
            
            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}
