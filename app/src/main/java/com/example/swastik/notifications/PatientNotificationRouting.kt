package com.example.swastik.notifications

import com.example.swastik.navigation.Screen
import com.google.gson.JsonObject
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import org.json.JSONObject

data class PatientNotificationDestination(
    val actionLabel: String? = null,
    val route: String? = null,
    val deepLink: String? = null
)

fun resolvePatientNotificationDestination(
    type: String,
    data: JsonObject? = null
): PatientNotificationDestination = resolvePatientNotificationDestination(
    type = type,
    data = data?.entrySet()?.associate { entry ->
        entry.key to when {
            entry.value.isJsonNull -> ""
            entry.value.isJsonPrimitive -> entry.value.asJsonPrimitive.asString
            else -> entry.value.toString()
        }
    }.orEmpty()
)

fun resolvePatientNotificationDestination(
    type: String,
    data: JSONObject? = null
): PatientNotificationDestination = resolvePatientNotificationDestination(
    type = type,
    data = buildMap {
        if (data == null) return@buildMap
        val keys = data.keys()
        while (keys.hasNext()) {
            val key = keys.next()
            put(key, data.optString(key, ""))
        }
    }
)

fun resolvePatientNotificationDestination(
    type: String,
    data: Map<String, String> = emptyMap()
): PatientNotificationDestination {
    val normalizedType = type.trim().lowercase()
    val appointmentId = data["appointmentId"] ?: data["appointment_id"]
    val prescriptionId = data["prescriptionId"] ?: data["prescription_id"]
    val medicineId = data["medicineId"] ?: data["medicine_id"]
    val doctorName = data["doctorName"] ?: data["doctor_name"] ?: "Doctor"

    if (!medicineId.isNullOrBlank()) {
        return PatientNotificationDestination(
            actionLabel = "View Medicine",
            route = Screen.MedicineDetail.createRoute(medicineId),
            deepLink = "vaididea://medicine/$medicineId"
        )
    }

    return when {
        normalizedType.contains("emergency") || normalizedType.startsWith("sos") -> {
            PatientNotificationDestination(
                actionLabel = "View SOS",
                route = Screen.Emergency.route,
                deepLink = "vaididea://emergency"
            )
        }

        normalizedType.contains("order") -> {
            PatientNotificationDestination(
                actionLabel = "View Orders",
                route = Screen.OrderHistory.route,
                deepLink = "vaididea://orders"
            )
        }

        normalizedType == "diagnostic_booking" || normalizedType == "diagnostic_update" -> {
            PatientNotificationDestination(
                actionLabel = "View My Tests",
                route = Screen.BookingHistory.route,
                deepLink = "vaididea://tests"
            )
        }

        normalizedType.contains("report") || normalizedType == "diagnostic_result" -> {
            PatientNotificationDestination(
                actionLabel = "View Reports",
                route = Screen.Reports.route,
                deepLink = "vaididea://reports"
            )
        }

        normalizedType.contains("prescription") || !prescriptionId.isNullOrBlank() -> {
            PatientNotificationDestination(
                actionLabel = "View Prescription",
                route = Screen.Prescriptions.route,
                deepLink = "vaididea://prescriptions"
            )
        }

        normalizedType.contains("medicine") || normalizedType.contains("care_plan") || normalizedType.contains("health_task") -> {
            PatientNotificationDestination(
                actionLabel = "View Reminders",
                route = Screen.VitalsReminders.createRoute(tab = 1),
                deepLink = "vaididea://reminders"
            )
        }

        normalizedType == "consultation_started" && !appointmentId.isNullOrBlank() -> {
            val encodedDoctorName = URLEncoder.encode(doctorName, StandardCharsets.UTF_8.toString())
            PatientNotificationDestination(
                actionLabel = "Join Call",
                route = Screen.VideoConsultation.createRoute(appointmentId, doctorName),
                deepLink = "vaididea://consultation/$appointmentId/$encodedDoctorName"
            )
        }

        normalizedType.contains("appointment") || normalizedType.contains("consultation") || !appointmentId.isNullOrBlank() -> {
            PatientNotificationDestination(
                actionLabel = "View Appointments",
                route = Screen.AppointmentHistory.route,
                deepLink = "vaididea://appointments"
            )
        }

        else -> PatientNotificationDestination()
    }
}
