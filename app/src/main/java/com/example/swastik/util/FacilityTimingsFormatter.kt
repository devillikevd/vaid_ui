package com.example.swastik.util

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.data.model.MedicalFacility
import com.example.swastik.ui.theme.SwastikPrimary
import com.google.gson.JsonParser
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.util.Locale

data class DaySchedule(
    val day: String,
    val openTime: String,
    val closeTime: String,
    val isOpen: Boolean
) {
    val shortDay: String
        get() = day.take(3)

    val formattedTimeRange: String
        get() {
            if (!isOpen) return "Closed"
            val formattedOpen = FacilityTimingsFormatter.formatTime(openTime)
            val formattedClose = FacilityTimingsFormatter.formatTime(closeTime)
            return if (formattedOpen.isNotBlank() && formattedClose.isNotBlank()) {
                "$formattedOpen - $formattedClose"
            } else if (formattedOpen.isNotBlank()) {
                "From $formattedOpen"
            } else {
                "Open"
            }
        }
}

object FacilityTimingsFormatter {

    private val DAYS_ORDER = listOf(
        "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
    )

    fun parseSchedule(openingHoursJson: String?): List<DaySchedule> {
        if (openingHoursJson.isNullOrBlank()) return emptyList()
        val trimmed = openingHoursJson.trim()
        if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return emptyList()
        return try {
            val jsonArray = JsonParser.parseString(trimmed).asJsonArray
            val list = mutableListOf<DaySchedule>()
            for (element in jsonArray) {
                if (element.isJsonObject) {
                    val obj = element.asJsonObject
                    val day = obj.get("day")?.asString ?: ""
                    val openTime = obj.get("openTime")?.asString
                        ?: obj.get("open_time")?.asString
                        ?: ""
                    val closeTime = obj.get("closeTime")?.asString
                        ?: obj.get("close_time")?.asString
                        ?: ""
                    val isOpen = obj.get("isOpen")?.asBoolean
                        ?: obj.get("is_open")?.asBoolean
                        ?: true
                    if (day.isNotBlank()) {
                        list.add(DaySchedule(day.trim(), openTime.trim(), closeTime.trim(), isOpen))
                    }
                }
            }
            // Sort by standard week days order
            list.sortedBy { dayItem ->
                val index = DAYS_ORDER.indexOfFirst { it.equals(dayItem.day, ignoreCase = true) }
                if (index != -1) index else 99
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    fun formatTime(timeStr: String?): String {
        if (timeStr.isNullOrBlank()) return ""
        val trimmed = timeStr.trim()
        if (trimmed.contains("AM", ignoreCase = true) || trimmed.contains("PM", ignoreCase = true)) {
            return trimmed
        }
        return try {
            val parsed = LocalTime.parse(trimmed, DateTimeFormatter.ofPattern("HH:mm"))
            parsed.format(DateTimeFormatter.ofPattern("h:mm a", Locale.ENGLISH))
        } catch (_: Exception) {
            try {
                val parsed = LocalTime.parse(trimmed, DateTimeFormatter.ofPattern("H:mm"))
                parsed.format(DateTimeFormatter.ofPattern("h:mm a", Locale.ENGLISH))
            } catch (_: Exception) {
                trimmed
            }
        }
    }

    fun getTodaySchedule(scheduleList: List<DaySchedule>): DaySchedule? {
        if (scheduleList.isEmpty()) return null
        val currentDayName = LocalDate.now().dayOfWeek.name
        return scheduleList.firstOrNull { it.day.equals(currentDayName, ignoreCase = true) }
    }

    fun isToday(dayName: String): Boolean {
        val currentDayName = LocalDate.now().dayOfWeek.name
        return dayName.equals(currentDayName, ignoreCase = true)
    }

    fun isFacilityCurrentlyOpen(facility: MedicalFacility): Boolean {
        if (facility.is24Hours || facility.openTime == "24 hrs") return true
        val schedule = parseSchedule(facility.openingHours)
        if (schedule.isNotEmpty()) {
            val today = getTodaySchedule(schedule) ?: return facility.isOpen
            if (!today.isOpen) return false
            if (today.openTime.isBlank() || today.closeTime.isBlank()) return true
            return try {
                val now = LocalTime.now()
                val open = LocalTime.parse(today.openTime)
                val close = LocalTime.parse(today.closeTime)
                if (open.isBefore(close)) {
                    now.isAfter(open) && now.isBefore(close)
                } else {
                    now.isAfter(open) || now.isBefore(close)
                }
            } catch (_: Exception) {
                true
            }
        }
        return facility.isOpen
    }

    fun getTimingsSummary(facility: MedicalFacility): String {
        if (facility.is24Hours || facility.openTime == "24 hrs" || facility.openingHours?.trim() == "24 hrs") {
            return "Open 24 Hours"
        }

        val scheduleList = parseSchedule(facility.openingHours)
        if (scheduleList.isNotEmpty()) {
            val today = getTodaySchedule(scheduleList)
            if (today != null) {
                if (!today.isOpen) {
                    val nextOpen = scheduleList.firstOrNull { it.isOpen }
                    return if (nextOpen != null) {
                        "Closed Today • Opens ${nextOpen.day.take(3)} at ${formatTime(nextOpen.openTime)}"
                    } else {
                        "Closed Today"
                    }
                } else if (today.openTime.isNotBlank() && today.closeTime.isNotBlank()) {
                    return "Today: ${formatTime(today.openTime)} - ${formatTime(today.closeTime)}"
                }
            }

            val openDays = scheduleList.filter { it.isOpen }
            if (openDays.isNotEmpty()) {
                val first = openDays.first()
                val timeStr = "${formatTime(first.openTime)} - ${formatTime(first.closeTime)}"
                val allSameTime = openDays.all { it.openTime == first.openTime && it.closeTime == first.closeTime }
                if (allSameTime) {
                    return if (openDays.size == 7) {
                        "Mon - Sun: $timeStr"
                    } else if (openDays.size == 5 && openDays.all { !it.day.equals("Saturday", ignoreCase = true) && !it.day.equals("Sunday", ignoreCase = true) }) {
                        "Mon - Fri: $timeStr"
                    } else if (openDays.size == 6 && openDays.none { it.day.equals("Sunday", ignoreCase = true) }) {
                        "Mon - Sat: $timeStr"
                    } else {
                        timeStr
                    }
                }
            }
        }

        if (!facility.openTime.isNullOrBlank() && !facility.closeTime.isNullOrBlank()) {
            return "${formatTime(facility.openTime)} - ${formatTime(facility.closeTime)}"
        }

        if (!facility.openingHours.isNullOrBlank() && !facility.openingHours.trim().startsWith("[")) {
            return facility.openingHours.trim()
        }

        return "Timings available on call"
    }

    fun getBadgeTimingsLabel(facility: MedicalFacility): String? {
        if (facility.is24Hours || facility.openTime == "24 hrs" || facility.openingHours?.trim() == "24 hrs") {
            return "Open 24x7"
        }

        val scheduleList = parseSchedule(facility.openingHours)
        if (scheduleList.isNotEmpty()) {
            val openDays = scheduleList.filter { it.isOpen }
            if (openDays.isNotEmpty()) {
                val first = openDays.first()
                val timeStr = "${formatTime(first.openTime)} - ${formatTime(first.closeTime)}"
                val allSameTime = openDays.all { it.openTime == first.openTime && it.closeTime == first.closeTime }
                return if (allSameTime) {
                    if (openDays.size == 7) "Mon - Sun: $timeStr"
                    else if (openDays.size == 5 && openDays.all { !it.day.equals("Saturday", ignoreCase = true) && !it.day.equals("Sunday", ignoreCase = true) }) "Mon - Fri: $timeStr"
                    else if (openDays.size == 6 && openDays.none { it.day.equals("Sunday", ignoreCase = true) }) "Mon - Sat: $timeStr"
                    else timeStr
                } else {
                    val today = getTodaySchedule(scheduleList)
                    if (today != null && today.isOpen) {
                        "Today: ${formatTime(today.openTime)} - ${formatTime(today.closeTime)}"
                    } else {
                        timeStr
                    }
                }
            }
        }

        if (!facility.openTime.isNullOrBlank() && !facility.closeTime.isNullOrBlank()) {
            return "${formatTime(facility.openTime)} - ${formatTime(facility.closeTime)}"
        }

        if (!facility.openingHours.isNullOrBlank() && !facility.openingHours.trim().startsWith("[")) {
            val plain = facility.openingHours.trim()
            return if (plain.length > 30) plain.take(28) + "…" else plain
        }

        return null
    }
}

/**
 * Clean & beautiful weekly operating schedule view with highlighted "Today" state.
 */
@Composable
fun FacilityWeeklyScheduleSection(
    facility: MedicalFacility,
    isDark: Boolean,
    modifier: Modifier = Modifier
) {
    val scheduleList = remember(facility.openingHours) {
        FacilityTimingsFormatter.parseSchedule(facility.openingHours)
    }
    val isOpen = remember(facility) {
        FacilityTimingsFormatter.isFacilityCurrentlyOpen(facility)
    }
    val timingsSummary = remember(facility) {
        FacilityTimingsFormatter.getTimingsSummary(facility)
    }

    var isExpanded by remember { mutableStateOf(false) }

    val subtitleColor = if (isDark) Color(0xFF94A3B8) else Color(0xFF64748B)
    val cardBg = if (isDark) Color(0xFF1E293B).copy(alpha = 0.6f) else Color(0xFFF8FAFC)
    val borderColor = if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0)

    Column(modifier = modifier.fillMaxWidth()) {
        // Main Row: Header + Status + Today's Summary
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(
                Icons.Default.AccessTime,
                contentDescription = null,
                tint = subtitleColor,
                modifier = Modifier.size(18.dp)
            )
            Text(
                text = "Timings",
                fontSize = 14.sp,
                color = subtitleColor,
                fontWeight = FontWeight.Medium
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 26.dp)
        ) {
            // Open / Closed Pill
            Surface(
                shape = RoundedCornerShape(6.dp),
                color = if (isOpen) Color(0xFFD1FAE5) else Color(0xFFFEE2E2)
            ) {
                Text(
                    text = if (isOpen) "Open" else "Closed",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (isOpen) Color(0xFF059669) else Color(0xFFDC2626),
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                )
            }

            Text(
                text = timingsSummary,
                fontSize = 13.sp,
                color = subtitleColor,
                fontWeight = FontWeight.Normal,
                modifier = Modifier.weight(1f)
            )

            // If full weekly schedule is available, provide expand/collapse button
            if (scheduleList.isNotEmpty()) {
                Surface(
                    shape = CircleShape,
                    color = cardBg,
                    border = BorderStroke(0.8.dp, borderColor),
                    modifier = Modifier.size(32.dp)
                ) {
                    IconButton(
                        onClick = { isExpanded = !isExpanded },
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            imageVector = if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                            contentDescription = if (isExpanded) "Collapse Schedule" else "View Full Schedule",
                            tint = subtitleColor,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }
        }

        // Expanded Weekly Schedule Card
        if (scheduleList.isNotEmpty()) {
            AnimatedVisibility(
                visible = isExpanded,
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically()
            ) {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 26.dp, top = 12.dp),
                    shape = RoundedCornerShape(12.dp),
                    color = cardBg,
                    border = BorderStroke(1.dp, borderColor)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "Weekly Schedule",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )

                        HorizontalDivider(
                            color = borderColor,
                            thickness = 0.8.dp,
                            modifier = Modifier.padding(vertical = 2.dp)
                        )

                        scheduleList.forEach { item ->
                            val isCurrentDay = FacilityTimingsFormatter.isToday(item.day)
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(
                                        if (isCurrentDay) {
                                            SwastikPrimary.copy(alpha = if (isDark) 0.2f else 0.08f)
                                        } else {
                                            Color.Transparent
                                        }
                                    )
                                    .padding(horizontal = 8.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Text(
                                        text = item.day,
                                        fontSize = 13.sp,
                                        fontWeight = if (isCurrentDay) FontWeight.Bold else FontWeight.Medium,
                                        color = if (isCurrentDay) SwastikPrimary else MaterialTheme.colorScheme.onSurface
                                    )
                                    if (isCurrentDay) {
                                        Surface(
                                            shape = RoundedCornerShape(4.dp),
                                            color = SwastikPrimary
                                        ) {
                                            Text(
                                                text = "Today",
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = Color.White,
                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                            )
                                        }
                                    }
                                }

                                Text(
                                    text = item.formattedTimeRange,
                                    fontSize = 13.sp,
                                    fontWeight = if (isCurrentDay) FontWeight.SemiBold else FontWeight.Normal,
                                    color = if (!item.isOpen) {
                                        Color(0xFFDC2626)
                                    } else if (isCurrentDay) {
                                        SwastikPrimary
                                    } else {
                                        subtitleColor
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
