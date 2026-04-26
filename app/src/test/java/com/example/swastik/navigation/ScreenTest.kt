package com.example.swastik.navigation

import com.example.swastik.data.model.FacilityType
import org.junit.Assert.assertEquals
import org.junit.Test

class ScreenTest {

    @Test
    fun patientDashboardRoute_clampsTabWithinBounds() {
        assertEquals("patient_dashboard?tab=0", Screen.PatientDashboard.createRoute(-2))
        assertEquals("patient_dashboard?tab=3", Screen.PatientDashboard.createRoute(8))
    }

    @Test
    fun hospitalFinderRoute_encodesFocusedFacilityName() {
        val route = Screen.HospitalFinder.createRoute(
            type = FacilityType.MEDICAL_STORE,
            focusFacilityId = "pharmacy-42",
            focusFacilityName = "City Care Pharmacy"
        )

        assertEquals(
            "hospital_finder?type=MEDICAL_STORE&focusFacilityId=pharmacy-42&focusFacilityName=City+Care+Pharmacy",
            route
        )
    }

    @Test
    fun appointmentBookingRoute_omitsMissingQueryParams() {
        assertEquals("appointment_booking", Screen.AppointmentBooking.createRoute())
        assertEquals(
            "appointment_booking?doctorId=doctor-1&clinicId=clinic-7",
            Screen.AppointmentBooking.createRoute(
                doctorId = "doctor-1",
                clinicId = "clinic-7"
            )
        )
    }

    @Test
    fun videoConsultationRoute_encodesDoctorName() {
        assertEquals(
            "video_consultation/appt-99/Dr.+Asha+Rao",
            Screen.VideoConsultation.createRoute(
                appointmentId = "appt-99",
                doctorName = "Dr. Asha Rao"
            )
        )
    }
}
