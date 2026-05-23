package com.example.swastik.ui.screens.patient.tabs

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RemindersTabContent(
    modifier: Modifier = Modifier,
    profile: PatientProfile?,
    reminders: List<Reminder>,
    isLoading: Boolean = false,
    unreadNotificationsCount: Int,
    onNotificationClick: () -> Unit,
    onCreateReminder: (title: String, time: String, type: String) -> Unit = { _, _, _ -> },
    onMarkDone: (id: String, time: String) -> Unit = { _, _ -> },
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
        containerColor = Color(0xFFF8F9FA),
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showCreateSheet = true },
                containerColor = SwastikPrimary,
                contentColor = Color.White
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
                    .background(Color.White)
                    .padding(horizontal = 16.dp, vertical = 20.dp)
            ) {
                Text(
                    text = "My Reminders",
                    fontWeight = FontWeight.Bold,
                    fontSize = 24.sp,
                    color = Color.Black
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
                        color = if (isSelected) SwastikPrimary else Color.White,
                        border = if (!isSelected) androidx.compose.foundation.BorderStroke(1.dp, Color.LightGray) else null
                    ) {
                        Text(
                            text = filter,
                            color = if (isSelected) Color.White else Color.DarkGray,
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
                        Icon(Icons.Filled.Alarm, null, tint = Color.LightGray, modifier = Modifier.size(64.dp))
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "No upcoming reminders.",
                            style = MaterialTheme.typography.bodyLarge,
                            color = Color.Gray
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
                                .androidx.compose.ui.draw.drawBehind {
                                    if (!isLast) {
                                        val strokeWidth = 1.5.dp.toPx()
                                        val xOffset = 13.dp.toPx()
                                        val yStart = 24.dp.toPx()
                                        drawLine(
                                            color = Color.LightGray.copy(alpha = 0.5f),
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
                                            onMarkDone = { onMarkDone(reminder.id, reminder.time) }
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
            onCreate = { title, time, type ->
                onCreateReminder(title, time, type)
                showCreateSheet = false
            }
        )
    }
}

@Composable
private fun ReminderCard(
    reminder: Reminder,
    onMarkDone: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(1.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .background(SwastikPrimaryLight, RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Filled.Alarm, contentDescription = null, tint = SwastikPrimary)
            }
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = reminder.title,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = Color.Black
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "${reminder.time} • ${reminder.type.name.lowercase().replaceFirstChar { it.uppercase() }}",
                    fontSize = 13.sp,
                    color = Color.DarkGray
                )
            }
            
            if (reminder.isCompleted) {
                Icon(Icons.Filled.CheckCircle, null, tint = Color(0xFF2E7D32))
            } else {
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = SwastikPrimary,
                    modifier = Modifier
                        .padding(start = 8.dp)
                        .clickable(onClick = onMarkDone)
                ) {
                    Text(
                        "Done",
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        color = Color.White,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateReminderBottomSheet(
    onDismiss: () -> Unit,
    onCreate: (title: String, time: String, type: String) -> Unit
) {
    var title by remember { mutableStateOf("") }
    var selectedType by remember { mutableStateOf("medicine") }
    val types = listOf("medicine" to "Medicine \uD83D\uDC8A", "appointment" to "Appointment \uD83D\uDCC5", "test" to "Test \uD83E\uDDEA", "custom" to "Custom \u270F\uFE0F")
    
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
                .padding(horizontal = 24.dp, vertical = 16.dp)
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

            Spacer(modifier = Modifier.height(32.dp))
            
            Button(
                onClick = {
                    val hour = timePickerState.hour.toString().padStart(2, '0')
                    val min = timePickerState.minute.toString().padStart(2, '0')
                    onCreate(title, "$hour:$min", selectedType)
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
