package com.example.swastik.navigation

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
    object PatientDashboard : Screen("patient_dashboard")
    object AppointmentHistory : Screen("appointment_history")
    object AppointmentBooking : Screen("appointment_booking?doctorId={doctorId}&hospitalId={hospitalId}") {
        fun createRoute(doctorId: String? = null, hospitalId: String? = null): String {
            val params = mutableListOf<String>()
            if (doctorId != null) params.add("doctorId=$doctorId")
            if (hospitalId != null) params.add("hospitalId=$hospitalId")
            return if (params.isEmpty()) "appointment_booking" else "appointment_booking?${params.joinToString("&")}"
        }
    }
    object MedicineFinder : Screen("medicine_finder")
    object MedicineDetail : Screen("medicine_detail/{medicineId}") {
        fun createRoute(medicineId: String): String = "medicine_detail/$medicineId"
    }
    object HospitalFinder : Screen("hospital_finder")
    object HospitalDetail : Screen("hospital_detail/{hospitalId}") {
        fun createRoute(hospitalId: String): String = "hospital_detail/$hospitalId"
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
    object ProfileEdit : Screen("profile_edit")
    object DiagnosticBooking : Screen("diagnostic_booking")
    object VitalsReminders : Screen("vitals_reminders")
    object MedicineCart : Screen("medicine_cart")
    object OrderHistory : Screen("order_history")
    object BookingHistory : Screen("booking_history")

    // Doctor Screens
    object DoctorLogin : Screen("doctor_login")
}
