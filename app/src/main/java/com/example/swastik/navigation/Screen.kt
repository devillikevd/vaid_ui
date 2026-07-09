package com.example.swastik.navigation

import com.example.swastik.data.model.FacilityType

sealed class Screen(val route: String) {
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
    object MedicineFinder : Screen("medicine_finder")
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
    object ClinicDetail : Screen("clinic_detail/{clinicId}") {
        fun createRoute(clinicId: String): String = "clinic_detail/$clinicId"
    }
    object PharmacyDetail : Screen("pharmacy_detail/{pharmacyId}") {
        fun createRoute(pharmacyId: String): String = "pharmacy_detail/$pharmacyId"
    }
    object DiagnosticDetail : Screen("diagnostic_detail/{centerId}") {
        fun createRoute(centerId: String): String = "diagnostic_detail/$centerId"
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
    object MedicineCart : Screen("medicine_cart")
    object OrderHistory : Screen("order_history?tab={tab}") {
        fun createRoute(tab: Int) = "order_history?tab=$tab"
    }
    object BookingHistory : Screen("booking_history")
    object DietTracker : Screen("diet_tracker")
    
    // AI Diagnostics

}
