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
import kotlinx.coroutines.flow.update

@Singleton
class GuardianRepository @Inject constructor(
    private val guardianDao: GuardianDao
) {

    private val _telemetryFlow = MutableStateFlow(GuardianTelemetry())
    val telemetryFlow = _telemetryFlow.asStateFlow()

    fun updateTelemetry(update: (GuardianTelemetry) -> GuardianTelemetry) {
        _telemetryFlow.update { current -> update(current) }
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

    // V2: Gait session persistence for trending
    suspend fun saveGaitSession(session: com.example.swastik.data.local.db.GaitSessionEntity) {
        withContext(Dispatchers.IO) {
            guardianDao.insertGaitSession(session)
        }
    }

    suspend fun getAverageSymmetrySince(sinceTimestamp: Long): Float? {
        return withContext(Dispatchers.IO) {
            guardianDao.getAverageSymmetrySince(sinceTimestamp)
        }
    }

    suspend fun getRecentGaitSessions(limit: Int = 50): List<com.example.swastik.data.local.db.GaitSessionEntity> {
        return withContext(Dispatchers.IO) {
            guardianDao.getRecentGaitSessions(limit)
        }
    }

    suspend fun getGaitTrendReport(): JSONObject {
        return withContext(Dispatchers.IO) {
            val now = System.currentTimeMillis()
            val sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000L
            val thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000L
            
            val report = JSONObject()
            report.put("report_type", "Guardian Gait & Mobility V2 Trend Report")
            report.put("generated_at", java.time.Instant.now().toString())
            
            // 7-day averages
            val week = JSONObject()
            week.put("avg_cadence_spm", guardianDao.getAverageCadenceSince(sevenDaysAgo))
            week.put("avg_symmetry_percent", guardianDao.getAverageSymmetrySince(sevenDaysAgo))
            week.put("avg_walking_speed_kmh", guardianDao.getAverageWalkingSpeedSince(sevenDaysAgo))
            week.put("avg_stride_length_m", guardianDao.getAverageStrideLengthSince(sevenDaysAgo))
            week.put("anomalous_sessions", guardianDao.countAnomalousSessionsSince(sevenDaysAgo))
            report.put("last_7_days", week)
            
            // 30-day averages
            val month = JSONObject()
            month.put("avg_cadence_spm", guardianDao.getAverageCadenceSince(thirtyDaysAgo))
            month.put("avg_symmetry_percent", guardianDao.getAverageSymmetrySince(thirtyDaysAgo))
            month.put("avg_walking_speed_kmh", guardianDao.getAverageWalkingSpeedSince(thirtyDaysAgo))
            month.put("avg_stride_length_m", guardianDao.getAverageStrideLengthSince(thirtyDaysAgo))
            month.put("anomalous_sessions", guardianDao.countAnomalousSessionsSince(thirtyDaysAgo))
            report.put("last_30_days", month)
            
            // Recent sessions detail
            val recentSessions = org.json.JSONArray()
            guardianDao.getRecentGaitSessions(10).forEach { s ->
                recentSessions.put(JSONObject().apply {
                    put("timestamp", s.timestamp)
                    put("cadence_spm", s.cadenceSpm)
                    put("symmetry_percent", s.symmetryPercent)
                    put("walking_speed_kmh", s.walkingSpeedKmh)
                    put("stride_length_m", s.strideLengthMeters)
                    put("fatigue_score", s.fatigueScore)
                    put("turn_count", s.turnCount)
                    put("turn_instability", s.turnInstabilityScore)
                    put("is_anomalous", s.isAnomalous)
                })
            }
            report.put("recent_sessions", recentSessions)
            
            report
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
                sources.put("V2: Step counter for stride length estimation and post-impact verification")
                sources.put("V2: GPS distance tracking for walking speed and stride calculation")
            }
            if (features.respiratoryTracker) {
                sources.put("Google Health Connect heart-rate records, only when patient has granted Health Connect permission")
            }
            if (features.fallDetection || features.crashDetection) {
                sources.put("V2: Barometer (pressure sensor) for elevation change during falls")
                sources.put("V2: Microphone peak detection for crash audio confirmation")
            }
            json.put("data_sources", sources)

            val reliability = JSONObject()
            reliability.put("fall_detection_contact_alerts", "V2: Fall detection uses freefall phase detection, impact waveform analysis, post-impact orientation, step counter verification, and barometer elevation change. Notifies emergency contacts only.")
            reliability.put("vehicle_crash_auto_sos", "V2: Crash detection uses speed deceleration rate, multi-axis impact pattern, post-crash accelerometer silence, and audio peak analysis in addition to in-vehicle context and tumbling checks.")
            reliability.put("gait_mobility_analysis", "V2: Enhanced with stride length estimation, walking speed tracking, fatigue scoring, turn instability detection, and 7/30-day trend comparisons. Supports doctor review for recovery monitoring.")
            reliability.put("respiratory_distress_tracker", "Implemented as contextual high heart-rate while still/low-activity. It requires Health Connect heart-rate permission and wearable/phone data availability.")
            reliability.put("false_positive_reduction", "V2: Uses freefall detection (90% phone drop elimination), impact waveform duration analysis, barometer elevation change, and raised confidence threshold (3+ signals). Zero false positives cannot be guaranteed.")
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
