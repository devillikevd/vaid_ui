package com.example.swastik.ui.screens.patient.components

import androidx.compose.ui.res.stringResource
import com.example.swastik.R

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.data.model.NotificationItem
import com.example.swastik.data.model.NotificationType
import com.example.swastik.ui.theme.SwastikPurple


@Composable
fun NotificationPanelDialog(
    notifications: List<NotificationItem>,
    onDismiss: () -> Unit,
    onClearAll: () -> Unit = {},
    onMarkAsRead: (String) -> Unit = {},
    onActionClick: (NotificationItem) -> Unit = {}
) {
    val filterAll = stringResource(R.string.filter_all)
    val filterUnread = stringResource(R.string.filter_unread)
    val filterAppointments = stringResource(R.string.appointments)
    val filterMedicines = stringResource(R.string.filter_medicines)
    val filterReports = stringResource(R.string.reports)

    var selectedFilter by remember { mutableStateOf(filterAll) }
    val filters = listOf(filterAll, filterUnread, filterAppointments, filterMedicines, filterReports)

    val filteredNotifications = notifications.filter { notification ->
        when (selectedFilter) {
            filterAll -> true
            filterUnread -> !notification.isRead
            filterAppointments -> notification.type == NotificationType.APPOINTMENT
            filterMedicines -> notification.type == NotificationType.MEDICINE_REMINDER
            filterReports -> notification.type == NotificationType.REPORT_READY
            else -> true
        }
    }

    // Side Sheet Implementation
    androidx.compose.ui.window.Dialog(
        onDismissRequest = onDismiss,
        properties = androidx.compose.ui.window.DialogProperties(
            usePlatformDefaultWidth = false,
            decorFitsSystemWindows = false
        )
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f))
                .clickable { onDismiss() },
            contentAlignment = Alignment.CenterEnd
        ) {
            Surface(
                modifier = Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(0.85f)
                    .clickable(enabled = false) {}, // prevent click-through
                shape = RoundedCornerShape(topStart = 24.dp, bottomStart = 24.dp),
                color = MaterialTheme.colorScheme.surface, // Responsive
                tonalElevation = 8.dp
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(bottom = 16.dp)
                ) {
                    // Header
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(MaterialTheme.colorScheme.surface)
                            .padding(20.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            stringResource(R.string.notifications),
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 24.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            if (notifications.isNotEmpty()) {
                                TextButton(
                                    onClick = { onClearAll() },
                                    contentPadding = PaddingValues(horizontal = 12.dp)
                                ) {
                                    Text(stringResource(R.string.clear_all), color = SwastikPurple, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                            IconButton(onClick = onDismiss) {
                                Icon(Icons.Outlined.Close, contentDescription = "Close", tint = MaterialTheme.colorScheme.outlineVariant)
                            }
                        }
                    }

                    HorizontalDivider(color = MaterialTheme.colorScheme.surface.copy(alpha = 0.1f))

                    // Filter Chips
                    LazyRow(
                        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(filters) { filter ->
                            FilterChip(
                                selected = selectedFilter == filter,
                                onClick = { selectedFilter = filter },
                                label = { Text(filter, fontSize = 12.sp) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = SwastikPurple,
                                    selectedLabelColor = MaterialTheme.colorScheme.surface,
                                    containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.1f),
                                    labelColor = MaterialTheme.colorScheme.outlineVariant
                                ),
                                border = FilterChipDefaults.filterChipBorder(
                                    borderColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.2f),
                                    selectedBorderColor = SwastikPurple,
                                    selected = selectedFilter == filter,
                                    enabled = true
                                )
                            )
                        }
                    }

                    // Notifications List
                    if (filteredNotifications.isEmpty()) {
                        com.example.swastik.ui.components.EmptyStateView(
                            title = stringResource(R.string.no_notifications_1),
                            subtitle = stringResource(R.string.all_caught_up),
                            icon = Icons.Outlined.Notifications,
                            modifier = Modifier.weight(1f)
                        )
                    } else {
                        LazyColumn(
                            modifier = Modifier.weight(1f),
                            contentPadding = PaddingValues(horizontal = 16.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            items(filteredNotifications) { notification ->
                                NotificationCard(
                                    notification = notification,
                                    onMarkAsRead = onMarkAsRead,
                                    onActionClick = { 
                                        onActionClick(it)
                                        onDismiss()
                                    }
                                )
                            }
                        }
                    }

                    
                    Button(
                        onClick = onDismiss,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp, vertical = 8.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = SwastikPurple),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(stringResource(R.string.close))
                    }
                }
            }
        }
    }
}

@Composable
private fun NotificationCard(
    notification: NotificationItem,
    onMarkAsRead: (String) -> Unit = {},
    onActionClick: (NotificationItem) -> Unit = {}
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable {
                if (!notification.isRead) {
                    onMarkAsRead(notification.id)
                }
            },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (notification.isRead) MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.8f)
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = if (notification.isRead) 0.dp else 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.Top
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(getNotificationTypeColor(notification.type).copy(alpha = 0.2f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = getNotificationTypeIcon(notification.type),
                    contentDescription = null,
                    tint = getNotificationTypeColor(notification.type),
                    modifier = Modifier.size(20.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = notification.title,
                        fontSize = 14.sp,
                        fontWeight = if (notification.isRead) FontWeight.Normal else FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    if (!notification.isRead) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .background(SwastikPurple, CircleShape)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = notification.message,
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.outlineVariant,
                    lineHeight = 16.sp
                )


                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = notification.time,
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.outlineVariant
                    )

                    if (notification.actionLabel != null) {
                        TextButton(
                            onClick = { onActionClick(notification) },
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp)
                        ) {
                            Text(
                                text = notification.actionLabel,
                                fontSize = 12.sp,
                                color = SwastikPurple,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            }
        }
    }
}

private fun getNotificationTypeIcon(type: NotificationType) = when (type) {
    NotificationType.APPOINTMENT -> Icons.Outlined.Event
    NotificationType.MEDICINE_REMINDER -> Icons.Outlined.Medication
    NotificationType.REPORT_READY -> Icons.Outlined.Description
    NotificationType.PRESCRIPTION -> Icons.Outlined.Receipt
    NotificationType.OFFER -> Icons.Outlined.LocalOffer
    NotificationType.SYSTEM -> Icons.Outlined.Info
}

@Composable
private fun getNotificationTypeColor(type: NotificationType) = when (type) {
    NotificationType.APPOINTMENT -> Color(0xFF2196F3)
    NotificationType.MEDICINE_REMINDER -> MaterialTheme.colorScheme.secondary
    NotificationType.REPORT_READY -> MaterialTheme.colorScheme.tertiary
    NotificationType.PRESCRIPTION -> Color(0xFF6C63FF)
    NotificationType.OFFER -> Color(0xFFE91E63)
    NotificationType.SYSTEM -> MaterialTheme.colorScheme.onSurfaceVariant
}
