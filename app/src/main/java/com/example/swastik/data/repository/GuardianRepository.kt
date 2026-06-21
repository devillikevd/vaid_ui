package com.example.swastik.data.repository

import com.example.swastik.data.local.db.GuardianDao
import com.example.swastik.data.local.db.GuardianEventEntity
import com.example.swastik.data.local.AppSettingsStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton
import java.util.concurrent.TimeUnit
import org.json.JSONObject
import com.example.swastik.data.local.GuardianTelemetry
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

@Singleton
class GuardianRepository @Inject constructor(
    private val guardianDao: GuardianDao
) {

    private val _telemetryFlow = MutableStateFlow(GuardianTelemetry())
    val telemetryFlow = _telemetryFlow.asStateFlow()

    fun updateTelemetry(update: (GuardianTelemetry) -> GuardianTelemetry) {
        _telemetryFlow.value = update(_telemetryFlow.value)
    }

    suspend fun logEvent(
        eventType: String,
        latitude: Double? = null,
        longitude: Double? = null,
        locationContext: String? = null,
        sensorDataSnippet: String? = null
    ) {
        withContext(Dispatchers.IO) {
            val event = GuardianEventEntity(
                eventType = eventType,
                timestamp = System.currentTimeMillis(),
                latitude = latitude,
                longitude = longitude,
                locationContext = locationContext,
                sensorDataSnippet = sensorDataSnippet
            )
            guardianDao.insertEvent(event)
        }
    }

    fun getAllEvents(): Flow<List<GuardianEventEntity>> {
        return guardianDao.getAllEvents()
    }

    suspend fun generateAnalyticsReportJson(): String {
        return withContext(Dispatchers.IO) {
            val thirtyDaysAgo = System.currentTimeMillis() - TimeUnit.DAYS.toMillis(30)
            val events = guardianDao.getEventsSince(thirtyDaysAgo)
            val settings = AppSettingsStore.settings.value
            val features = settings.guardianFeatures

            val sosTriggers = events.count { it.eventType == "SOS_TRIGGERED" }
            val cancelledCrashSos = events.count { it.eventType == "CRASH_SOS_CANCELLED" }
            val detectedFalls = events.count { it.eventType == "FALL_DETECTED" }
            val fallContactAlerts = events.count { it.eventType == "FALL_CONTACTS_NOTIFIED" }
            val detectedCrashes = events.count { it.eventType == "CRASH_DETECTED" }
            val dispatchedSos = events.count { it.eventType == "SOS_DISPATCHED" }
            val failedSos = events.count { it.eventType.startsWith("SOS_FAILED") }
            val respiratoryTriggers = events.count { it.eventType == "HIGH_HR_STILL" }
            val gaitAnomalies = events.count { it.eventType == "GAIT_ANOMALY" }

            val json = JSONObject()
            json.put("report_type", "Vaididea Guardian Safety & Mobility Analytics")
            json.put("period", "Last 30 Days")
            json.put("generated_at", java.time.Instant.now().toString())

            val consent = JSONObject()
            consent.put("patient_enabled_guardian", settings.guardianEnabled)
            consent.put("patient_read_and_accepted_guardian_explainer", settings.guardianConsentAccepted)
            consent.put("accepted_at", settings.guardianConsentAcceptedAt)
            consent.put("doctor_qr_sharing_allowed", features.doctorQrSharing)
            json.put("patient_consent", consent)

            val enabledFeatures = JSONObject()
            enabledFeatures.put("fall_detection_contact_alerts", features.fallDetection)
            enabledFeatures.put("vehicle_crash_auto_sos", features.crashDetection)
            enabledFeatures.put("gait_mobility_analysis", features.mobilityAnalysis)
            enabledFeatures.put("respiratory_distress_tracker", features.respiratoryTracker)
            json.put("enabled_features", enabledFeatures)

            val sources = org.json.JSONArray()
            if (features.fallDetection || features.crashDetection) {
                sources.put("Phone accelerometer and gyroscope for impact/tumble detection")
                sources.put("Google Activity Recognition for post-impact stillness and vehicle context")
                sources.put("GPS location and speed for emergency dispatch context")
                sources.put("Proximity and ambient light sensors for phone-only impact filtering")
            }
            if (features.mobilityAnalysis) {
                sources.put("Accelerometer walking/running windows for gait variability and lateral asymmetry")
            }
            if (features.respiratoryTracker) {
                sources.put("Google Health Connect heart-rate records, only when patient has granted Health Connect permission")
            }
            json.put("data_sources", sources)

            val reliability = JSONObject()
            reliability.put("fall_detection_contact_alerts", "Fall detection notifies emergency contacts only. It uses tightened impact/tumble plus post-impact stillness checks; it does not trigger ambulance SOS.")
            reliability.put("vehicle_crash_auto_sos", "Crash detection uses in-vehicle context, higher speed, stronger impact, and tumbling checks before the crash SOS countdown. It is not a replacement for certified crash hardware.")
            reliability.put("gait_mobility_analysis", "Implemented as a screening signal using motion-window asymmetry and variability. It supports doctor review but is not a medical diagnosis.")
            reliability.put("respiratory_distress_tracker", "Implemented as contextual high heart-rate while still/low-activity. It requires Health Connect heart-rate permission and wearable/phone data availability.")
            reliability.put("false_positive_reduction", "Uses multi-sensor verification, post-impact stillness, phone-only impact filters, and a loud grace-period prompt. Zero false positives cannot be guaranteed.")
            json.put("reliability_notes", reliability)
            
            val summary = JSONObject()
            summary.put("detected_falls", detectedFalls)
            summary.put("fall_contact_alerts_sent", fallContactAlerts)
            summary.put("detected_vehicle_crashes", detectedCrashes)
            summary.put("guardian_sos_triggers", sosTriggers)
            summary.put("sos_dispatch_confirmed", dispatchedSos)
            summary.put("sos_dispatch_failures", failedSos)
            summary.put("cancelled_crash_sos", cancelledCrashSos)
            summary.put("respiratory_triggers", respiratoryTriggers)
            summary.put("gait_anomalies", gaitAnomalies)
            
            // Frailty Risk heuristic
            val frailtyRisk = if (detectedFalls >= 3) "HIGH" else if (detectedFalls >= 1) "MODERATE" else "LOW"
            summary.put("frailty_risk_assessment", frailtyRisk)
            
            json.put("summary", summary)
            val recentSignals = org.json.JSONArray()
            events.take(10).forEach { event ->
                recentSignals.put(JSONObject().apply {
                    put("event_type", event.eventType)
                    put("timestamp", event.timestamp)
                    put("latitude", event.latitude)
                    put("longitude", event.longitude)
                    put("context", event.locationContext)
                    put("sensor_summary", event.sensorDataSnippet)
                })
            }
            json.put("recent_signals", recentSignals)
            
            json.toString(4) // pretty print with indent 4
        }
    }
}
