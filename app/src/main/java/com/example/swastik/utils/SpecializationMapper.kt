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

        // 2. Map Symptoms & Conditions & Categories
        return when (cleanName.lowercase()) {
            // Category Exact Mappings
            "gynecologist" -> Pair("Gynecology", null)
            "dermatologist" -> Pair("Dermatology", null)
            "pediatrician" -> Pair("Pediatrics", null)
            "dentist" -> Pair("Dentistry", null)
            "ent specialist" -> Pair("ENT", null)
            "cardiologist" -> Pair("Cardiology", null)
            "orthopedist" -> Pair("Orthopedics", null)
            "psychiatrist" -> Pair("Psychiatry", null)
            "neurologist" -> Pair("Neurology", null)
            "urologist" -> Pair("Urology", null)
            "pulmonologist" -> Pair("Pulmonology", null)
            "gastroenterologist" -> Pair("Gastroenterology", null)
            "endocrinologist" -> Pair("Endocrinology", null)
            "oncologist" -> Pair("Oncology", null)
            "physiotherapist" -> Pair("Physiotherapy", null)
            "general surgeon" -> Pair("General Surgery", null)
            "diet & nutrition" -> Pair("Nutrition & Dietetics", null)
            "cancer specialist", "cancer" -> Pair("Oncology", null)
            "diabetologist" -> Pair("Diabetology", null)
            "nephrologist" -> Pair("Nephrology", null)
            "rheumatologist" -> Pair("Rheumatology", null)
            "plastic surgeon" -> Pair("Plastic Surgery", null)
            "fertility / ivf specialist" -> Pair("Gynecology", null)
            "spine specialist" -> Pair("Orthopedics", null)
            "liver specialist" -> Pair("Gastroenterology", null)
            "kidney specialist", "kidney issues" -> Pair("Nephrology", null)
            "allergy specialist" -> Pair("Allergy & Immunology", null)
            "hair transplant specialist", "cosmetic dermatologist" -> Pair("Dermatology", null)
            "mental health specialist", "mental wellness" -> Pair("Psychiatry", null)
            "vascular surgeon" -> Pair("Vascular Surgery", null)
            "proctologist", "laparoscopic surgeon" -> Pair("General Surgery", null)
            "pain management specialist" -> Pair("Pain Management", null)
            "sports medicine specialist" -> Pair("Sports Medicine", null)
            "sexologist", "sexual health" -> Pair("Psychiatry", "Sexology")
            "ophthalmologist", "eye specialist" -> Pair("Ophthalmology", null)

            // Home Speciality cards aliases
            "women's health" -> Pair("Gynecology", null)
            "skin specialist", "skin & hair", "skin and hair" -> Pair("Dermatology", null)
            "child care", "child specialist" -> Pair("Pediatrics", null)
            "ear, nose & throat", "ear, nose, throat" -> Pair("ENT", null)
            "bones & joints", "bone and joint" -> Pair("Orthopedics", null)
            "brain & nerves", "brain and nerves" -> Pair("Neurology", null)
            "urinary issues" -> Pair("Urology", null)
            "lungs & breathing", "lungs and breathing" -> Pair("Pulmonology", null)
            "heart specialist", "heart" -> Pair("Cardiology", null)
            "stomach & digestion", "digestive issues" -> Pair("Gastroenterology", null)
            "diabetes management" -> Pair("Diabetology", null)
            "dental care" -> Pair("Dentistry", null)
            "veterinary" -> Pair("Veterinary", null)
            "chronic problems" -> Pair("General Physician", "Chronic")

            // Symptoms
            "covid" -> Pair("General Physician", "COVID")
            "stomach pain" -> Pair("Gastroenterology", "Stomach Pain")
            "headache" -> Pair("Neurology", "Headache")
            "sinusitis" -> Pair("ENT", "Sinusitis")
            "vertigo" -> Pair("ENT", "Vertigo")
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
            "gall stones" -> Pair("Gastroenterology", "Gall Stones")
            "circumcision" -> Pair("Urology", "Circumcision")

            // Fallback: If no exact match but looks like a search query
            else -> Pair(null, cleanName)
        }
    }
}
