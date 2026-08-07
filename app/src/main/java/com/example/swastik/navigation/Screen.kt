package com.example.swastik.navigation

import com.example.swastik.data.model.FacilityType

sealed class Screen(val route: String) {
    object Splash : Screen("splash")
    // Auth Screens
    object Home : Screen("home")
    object PatientRegister : Screen("patient_register")
    object PatientLogin : Screen("patient_login")
    object EmailVerificationPending : Screen("email_verification_pending?email={email}") {
        fun createRoute(email: String): String =
            "email_verification_pending?email=${java.net.URLEncoder.encode(email, "UTF-8")}"
    }

    // Patient Screens
    object CommunityQA : Screen("community_qa")
    object AskQuestion : Screen("community_ask")
    object CommunityQADetails : Screen("community_qa_details/{questionId}") {
        fun createRoute(questionId: String): String = "community_qa_details/$questionId"
    }
    object PatientDashboard : Screen("patient_dashboard?tab={tab}") {
        fun createRoute(tab: Int = 0): String = "patient_dashboard?tab=${tab.coerceIn(0, 4)}"
    }
    object LocationSelection : Screen("location_selection")
    object AppointmentHistory : Screen("appointment_history?filter={filter}") {
        fun createRoute(filter: String? = null): String {
            return if (filter == null) "appointment_history" else "appointment_history?filter=$filter"
        }
    }
    object FindDoctorsCategories : Screen("find_doctors_categories?mode={mode}") {
        fun createRoute(mode: String = "in_person"): String = "find_doctors_categories?mode=$mode"
    }
    object DoctorProfile : Screen("doctor_profile/{doctorId}") {
        fun createRoute(doctorId: String): String = "doctor_profile/$doctorId"
    }
    object AllSpecialities : Screen("all_specialities?mode={mode}") {
        fun createRoute(mode: String = "in_person"): String = "all_specialities?mode=$mode"
    }
    object AllCategories : Screen("all_categories")
    object AppointmentBooking : Screen("appointment_booking?doctorId={doctorId}&hospitalId={hospitalId}&clinicId={clinicId}&specialization={specialization}&consultationMode={consultationMode}&search={search}") {
        fun createRoute(
            doctorId: String? = null,
            hospitalId: String? = null,
            clinicId: String? = null,
            specialization: String? = null,
            consultationMode: String? = null,
            search: String? = null
        ): String {
            val params = mutableListOf<String>()
            if (doctorId != null) params.add("doctorId=$doctorId")
            if (hospitalId != null) params.add("hospitalId=$hospitalId")
            if (clinicId != null) params.add("clinicId=$clinicId")
            if (specialization != null) params.add("specialization=${java.net.URLEncoder.encode(specialization, "UTF-8").replace("+", "%20")}")
            if (consultationMode != null) params.add("consultationMode=$consultationMode")
            if (search != null) params.add("search=${java.net.URLEncoder.encode(search, "UTF-8").replace("+", "%20")}")
            return if (params.isEmpty()) "appointment_booking" else "appointment_booking?${params.joinToString("&")}"
        }
    }
    object ActiveBookingStatus : Screen("active_booking_status/{appointmentId}") {
        fun createRoute(appointmentId: String): String = "active_booking_status/$appointmentId"
    }
    object MedicineFinder : Screen("medicine_finder")
    object FavoriteMedicines : Screen("favorite_medicines")
    object FavoriteDoctors : Screen("favorite_doctors")
    object FavoriteFacilities : Screen("favorite_facilities/{type}") {
        fun createRoute(type: String): String = "favorite_facilities/$type"
    }
    object MedicineDetail : Screen("medicine_detail/{medicineId}") {
        fun createRoute(medicineId: String): String = "medicine_detail/$medicineId"
    }
    object HospitalFinder : Screen("hospital_finder?type={type}&focusFacilityId={focusFacilityId}&focusFacilityName={focusFacilityName}") {
        fun createRoute(
            type: FacilityType? = null,
            focusFacilityId: String? = null,
            focusFacilityName: String? = null
        ): String {
            val params = mutableListOf<String>()
            if (type != null) params.add("type=${type.name}")
            if (!focusFacilityId.isNullOrBlank()) params.add("focusFacilityId=$focusFacilityId")
            if (!focusFacilityName.isNullOrBlank()) {
                params.add("focusFacilityName=${java.net.URLEncoder.encode(focusFacilityName, "UTF-8")}")
            }
            return if (params.isEmpty()) "hospital_finder" else "hospital_finder?${params.joinToString("&")}"
        }
    }
    object HospitalDetail : Screen("hospital_detail/{hospitalId}") {
        fun createRoute(hospitalId: String): String = "hospital_detail/$hospitalId"
    }
    object FacilityDetail : Screen("facility_detail/{facilityId}/{facilityType}") {
        fun createRoute(facilityId: String, facilityType: String): String = "facility_detail/$facilityId/$facilityType"
    }
    object ClinicDetail : Screen("clinic_detail/{clinicId}") {
        fun createRoute(clinicId: String): String = "clinic_detail/$clinicId"
    }
    object PharmacyDetail : Screen("pharmacy_detail/{pharmacyId}") {
        fun createRoute(pharmacyId: String): String = "pharmacy_detail/$pharmacyId"
    }
    object DiagnosticDetail : Screen("diagnostic_detail/{centerId}") {
        fun createRoute(centerId: String): String = "diagnostic_detail/$centerId"
    }
    object FitnessCenterDetail : Screen("fitness_center_detail/{centerId}") {
        fun createRoute(centerId: String): String = "fitness_center_detail/$centerId"
    }
    object VideoConsultation : Screen("video_consultation/{appointmentId}/{doctorName}") {
        fun createRoute(appointmentId: String, doctorName: String): String {
            return "video_consultation/${appointmentId}/${java.net.URLEncoder.encode(doctorName, "UTF-8")}"
        }
    }
    object Reports : Screen("reports")
    object Prescriptions : Screen("prescriptions?appointmentId={appointmentId}") {
        fun createRoute(appointmentId: String? = null): String {
            return if (appointmentId == null) "prescriptions" else "prescriptions?appointmentId=$appointmentId"
        }
    }
    object Chatbot : Screen("chatbot")
    object Emergency : Screen("emergency")
    object DiagnosticBooking : Screen("diagnostic_booking?centerId={centerId}") {
        fun createRoute(centerId: String? = null): String {
            return if (centerId.isNullOrBlank()) {
                "diagnostic_booking"
            } else {
                "diagnostic_booking?centerId=${java.net.URLEncoder.encode(centerId, "UTF-8").replace("+", "%20")}"
            }
        }
    }
    object HealthCard : Screen("health_card")
    object GuardianDashboard : Screen("guardian_dashboard")
    object HealthConnectSetup : Screen("health_connect_setup")
    object HealthConnectDashboard : Screen("health_connect_dashboard")
    object WellnessHub : Screen("wellness_hub?section={section}") {
        fun createRoute(section: String? = null): String =
            if (section == null) "wellness_hub" else "wellness_hub?section=$section"
    }
    object MedicineCart : Screen("medicine_cart/{type}") {
        fun createRoute(type: String) = "medicine_cart/$type"
    }
    object OrderHistory : Screen("order_history?tab={tab}") {
        fun createRoute(tab: Int) = "order_history?tab=$tab"
    }
    object BookingHistory : Screen("booking_history")
    object DietTracker : Screen("diet_tracker")

    // Wellness Sub-Screens (Separate Pages)
    object WellnessWorkouts : Screen("wellness_workouts")
    object WorkoutPlayer : Screen("workout_player/{planId}") {
        fun createRoute(planId: String): String = "workout_player/$planId"
    }
    object WellnessExperts : Screen("wellness_experts")
    object WellnessCommunity : Screen("wellness_community")
    object WellnessSupplements : Screen("wellness_supplements")
    object WellnessReports : Screen("wellness_reports")
    object WellnessAICoach : Screen("wellness_ai_coach")
    object WellnessAssessment : Screen("wellness_assessment")

    // Wellness Coach & Sessions
    object WellnessCoachDetail : Screen("wellness_coach_detail/{coachId}") {
        fun createRoute(coachId: String): String = "wellness_coach_detail/$coachId"
    }
    object WellnessSessionBooking : Screen("wellness_session_booking/{coachId}") {
        fun createRoute(coachId: String): String = "wellness_session_booking/$coachId"
    }
    object WellnessSessions : Screen("wellness_sessions")
    object WellnessVideoCall : Screen("wellness_video_call/{sessionId}/{coachName}") {
        fun createRoute(sessionId: String, coachName: String): String {
            return "wellness_video_call/${sessionId}/${java.net.URLEncoder.encode(coachName, "UTF-8")}"
        }
    }

    object CoachDashboard : Screen("coach_dashboard")

    // Phase 2 — High Value
    object WorkoutCalendar : Screen("workout_calendar")
    object GymClassSchedule : Screen("gym_class_schedule/{centerId}/{centerName}") {
        fun createRoute(centerId: String, centerName: String): String {
            return "gym_class_schedule/$centerId/${java.net.URLEncoder.encode(centerName, "UTF-8")}"
        }
    }
    object WellnessTypedReports : Screen("wellness_typed_reports")
    object ChallengeLeaderboard : Screen("challenge_leaderboard/{challengeId}/{challengeTitle}") {
        fun createRoute(challengeId: String, challengeTitle: String): String {
            return "challenge_leaderboard/$challengeId/${java.net.URLEncoder.encode(challengeTitle, "UTF-8")}"
        }
    }

    // Phase 3 — Differentiator
    object QrGymCheckIn : Screen("qr_gym_checkin")
    object WellnessChat : Screen("wellness_chat/{sessionId}/{coachName}") {
        fun createRoute(sessionId: String, coachName: String): String {
            return "wellness_chat/$sessionId/${java.net.URLEncoder.encode(coachName, "UTF-8")}"
        }
    }
    object WellnessReminders : Screen("wellness_reminders")
    object WellnessBadges : Screen("wellness_badges")
    object WellnessReels : Screen("wellness_reels")
    
    // AI Diagnostics

}
