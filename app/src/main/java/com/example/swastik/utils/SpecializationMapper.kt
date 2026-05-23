package com.example.swastik.utils
// Add mapping for all categories to search parameters
object SpecializationMapper {
    /**
     * Maps a display name from the UI (symptoms, conditions, categories, etc.)
     * to a pair of (Specialization, Search Keyword) for the backend API.
     */
    fun mapToSearchParams(displayName: String): Pair<String?, String?> {
        val cleanName = displayName.replace("\n", " ").trim()

        // 1. Check if it's already an exact backend specialization match
        val specializations = listOf(
            "General Physician", "Family Medicine", "Gynecology", "Obstetrics",
            "Dermatology", "Pediatrics", "Dentistry", "Ophthalmology", "ENT",
            "Psychiatry", "Psychology", "Orthopedics", "Neurology", "Neurosurgery",
            "Urology", "Nephrology", "Pulmonology", "Cardiology", "Cardiac Surgery",
            "Gastroenterology", "Endocrinology", "Diabetology", "Oncology",
            "General Surgery", "Plastic Surgery", "Vascular Surgery", "Physiotherapy",
            "Radiology", "Pathology", "Anesthesiology", "Emergency Medicine",
            "Infectious Disease", "Rheumatology", "Allergy & Immunology", "Hematology",
            "Geriatrics", "Sports Medicine", "Pain Management", "Nutrition & Dietetics",
            "Ayurveda", "Homeopathy"
        )
        if (specializations.any { it.equals(cleanName, ignoreCase = true) }) {
            return Pair(cleanName, null)
        }

        // 2. Map Symptoms & Conditions
        return when (cleanName.lowercase()) {
            // Home Speciality cards aliases
            "women's health" -> Pair("Gynecology", null)
            "skin specialist", "skin & hair", "skin and hair" -> Pair("Dermatology", null)
            "child care", "child specialist" -> Pair("Pediatrics", null)
            "eye specialist" -> Pair("Ophthalmology", null)
            "ear, nose & throat", "ear, nose, throat" -> Pair("ENT", null)
            "mental wellness" -> Pair("Psychiatry", null) // Or Psychology
            "bones & joints", "bone and joint" -> Pair("Orthopedics", null)
            "brain & nerves", "brain and nerves" -> Pair("Neurology", null)
            "urinary issues" -> Pair("Urology", null)
            "lungs & breathing", "lungs and breathing" -> Pair("Pulmonology", null)
            "heart specialist", "heart" -> Pair("Cardiology", null)
            "stomach & digestion", "digestive issues" -> Pair("Gastroenterology", null)
            "diabetes management" -> Pair("Diabetology", null) // Or Endocrinology
            "cancer specialist", "cancer" -> Pair("Oncology", null)
            "dental care" -> Pair("Dentistry", null)
            "kidney issues" -> Pair("Nephrology", null)
            "veterinary" -> Pair("Veterinary", null)
            "diet & nutrition" -> Pair("Nutrition & Dietetics", null)
            "chronic problems" -> Pair("General Physician", "Chronic")
            "sexual health" -> Pair("Urology", "Sexual Health") // Often Urology or Gynecology depending on gender, Urology is a safe default for now, or Sexologist if available. Using Urology + search.

            // Symptoms
            "covid" -> Pair("General Physician", "COVID")
            "stomach pain" -> Pair("Gastroenterology", "Stomach Pain")
            "headache" -> Pair("Neurology", "Headache") // Or General Physician
            "sinusitis" -> Pair("ENT", "Sinusitis")
            "vertigo" -> Pair("ENT", "Vertigo") // Or Neurology
            "cold & cough" -> Pair("General Physician", "Cold Cough")
            "fever" -> Pair("General Physician", "Fever")
            "constipation" -> Pair("Gastroenterology", "Constipation")

            // Surgery Conditions
            "piles/ hemorrhoids" -> Pair("General Surgery", "Piles Hemorrhoids")
            "hernia" -> Pair("General Surgery", "Hernia")
            "appendicitis" -> Pair("General Surgery", "Appendicitis")
            "anal fissure/ anal fistula" -> Pair("General Surgery", "Fissure Fistula")
            "varicose vein" -> Pair("Vascular Surgery", "Varicose Vein")
            "kidney stone" -> Pair("Urology", "Kidney Stone")
            "gall stones" -> Pair("Gastroenterology", "Gall Stones") // Or General Surgery
            "circumcision" -> Pair("Urology", "Circumcision") // Or General Surgery

            // Fallback: If no exact match but looks like a search query
            else -> Pair(null, cleanName)
        }
    }
}
