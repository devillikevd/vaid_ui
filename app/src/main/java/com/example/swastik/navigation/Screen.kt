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
    object PatientDashboard : Screen("patient_dashboard?tab={tab}") {
        fun createRoute(tab: Int = 0): String = "patient_dashboard?tab=${tab.coerceIn(0, 3)}"
    }
    object AppointmentHistory : Screen("appointment_history")
    object AppointmentBooking : Screen("appointment_booking?doctorId={doctorId}&hospitalId={hospitalId}&clinicId={clinicId}") {
        fun createRoute(
            doctorId: String? = null,
            hospitalId: String? = null,
            clinicId: String? = null
        ): String {
            val params = mutableListOf<String>()
            if (doctorId != null) params.add("doctorId=$doctorId")
            if (hospitalId != null) params.add("hospitalId=$hospitalId")
            if (clinicId != null) params.add("clinicId=$clinicId")
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
    object VideoConsultation : Screen("video_consultation/{appointmentId}/{doctorName}") {
        fun createRoute(appointmentId: String, doctorName: String): String {
            return "video_consultation/${appointmentId}/${java.net.URLEncoder.encode(doctorName, "UTF-8")}"
        }
    }
    object Reports : Screen("reports")
    object Prescriptions : Screen("prescriptions")
    object Chatbot : Screen("chatbot")
    object Emergency : Screen("emergency")
    object DiagnosticBooking : Screen("diagnostic_booking?centerId={centerId}") {
        fun createRoute(centerId: String? = null): String {
            return if (centerId.isNullOrBlank()) {
                "diagnostic_booking"
            } else {
                "diagnostic_booking?centerId=${java.net.URLEncoder.encode(centerId, "UTF-8")}"
            }
        }
    }
    object VitalsReminders : Screen("vitals_reminders")
    object MedicineCart : Screen("medicine_cart")
    object OrderHistory : Screen("order_history")
    object BookingHistory : Screen("booking_history")

    // Doctor Screens
    object DoctorLogin : Screen("doctor_login")
}
