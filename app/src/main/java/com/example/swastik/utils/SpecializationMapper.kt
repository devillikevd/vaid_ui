package com.example.swastik.utils

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
            "Ayurveda", "Homeopathy", "Sexology", "Sexologist", "Sexual Health", "Andrology",
            "Veterinary"
        )
        val matchedSpec = specializations.find { it.equals(cleanName, ignoreCase = true) }
        if (matchedSpec != null) {
            return Pair(matchedSpec, null)
        }

        // 2. Map Symptoms & Conditions & Categories
        return when (cleanName.lowercase()) {
            // Category Exact Mappings
            "gynecologist", "gynecology" -> Pair("Gynecology", null)
            "dermatologist", "dermatology" -> Pair("Dermatology", null)
            "pediatrician", "pediatrics" -> Pair("Pediatrics", null)
            "dentist", "dentistry" -> Pair("Dentistry", null)
            "ent specialist", "ent" -> Pair("ENT", null)
            "cardiologist", "cardiology" -> Pair("Cardiology", null)
            "orthopedist", "orthopedics" -> Pair("Orthopedics", null)
            "psychiatrist", "psychiatry" -> Pair("Psychiatry", null)
            "neurologist", "neurology" -> Pair("Neurology", null)
            "urologist", "urology" -> Pair("Urology", null)
            "pulmonologist", "pulmonology" -> Pair("Pulmonology", null)
            "gastroenterologist", "gastroenterology" -> Pair("Gastroenterology", null)
            "endocrinologist", "endocrinology" -> Pair("Endocrinology", null)
            "oncologist", "oncology" -> Pair("Oncology", null)
            "physiotherapist", "physiotherapy" -> Pair("Physiotherapy", null)
            "general surgeon", "general surgery" -> Pair("General Surgery", null)
            "diet & nutrition", "nutrition & dietetics", "dietitian", "nutritionist" -> Pair("Nutrition & Dietetics", null)
            "cancer specialist", "cancer" -> Pair("Oncology", null)
            "diabetologist", "diabetology" -> Pair("Diabetology", null)
            "nephrologist", "nephrology" -> Pair("Nephrology", null)
            "rheumatologist", "rheumatology" -> Pair("Rheumatology", null)
            "plastic surgeon", "plastic surgery" -> Pair("Plastic Surgery", null)
            "fertility / ivf specialist", "fertility specialist", "ivf specialist" -> Pair("Gynecology", "IVF Fertility")
            "spine specialist" -> Pair("Orthopedics", "Spine")
            "liver specialist" -> Pair("Gastroenterology", "Hepatology")
            "kidney specialist", "kidney issues" -> Pair("Nephrology", "Kidney")
            "allergy specialist", "allergy & immunology", "allergist" -> Pair("Allergy & Immunology", null)
            "hair transplant specialist" -> Pair("Dermatology", "Hair Transplant")
            "cosmetic dermatologist" -> Pair("Dermatology", "Cosmetic")
            "mental health specialist", "mental health", "psychologist", "psychology" -> Pair("Psychology", "Mental Health")
            "vascular surgeon", "vascular surgery" -> Pair("Vascular Surgery", "Varicose Vein")
            "proctologist" -> Pair("General Surgery", "Proctology")
            "laparoscopic surgeon" -> Pair("General Surgery", "Laparoscopy")
            "pain management specialist", "pain management" -> Pair("Pain Management", null)
            "sports medicine specialist", "sports medicine" -> Pair("Sports Medicine", null)
            "sexologist", "sexual health", "sexual wellness", "intimacy", "sexology", "andrology", "andrologist" -> Pair("Sexology", "Sexual Health")
            "ophthalmologist", "ophthalmology", "eye specialist", "eye" -> Pair("Ophthalmology", null)

            // Home Speciality cards aliases
            "women's health", "women health" -> Pair("Gynecology", null)
            "skin specialist", "skin & hair", "skin and hair" -> Pair("Dermatology", null)
            "child care", "child specialist" -> Pair("Pediatrics", null)
            "ear, nose & throat", "ear, nose, throat" -> Pair("ENT", null)
            "mental wellness" -> Pair("Psychiatry", null)
            "bones & joints", "bone and joint", "bones and joints" -> Pair("Orthopedics", null)
            "brain & nerves", "brain and nerves" -> Pair("Neurology", null)
            "urinary issues" -> Pair("Urology", null)
            "lungs & breathing", "lungs and breathing" -> Pair("Pulmonology", null)
            "heart specialist", "heart" -> Pair("Cardiology", null)
            "stomach & digestion", "digestive issues" -> Pair("Gastroenterology", null)
            "diabetes management" -> Pair("Diabetology", null)
            "dental care" -> Pair("Dentistry", null)
            "veterinary", "vet" -> Pair("Veterinary", null)
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
            "piles/ hemorrhoids", "piles", "hemorrhoids" -> Pair("General Surgery", "Piles Hemorrhoids")
            "hernia" -> Pair("General Surgery", "Hernia")
            "appendicitis" -> Pair("General Surgery", "Appendicitis")
            "anal fissure/ anal fistula", "anal fissure", "fissure", "fistula" -> Pair("General Surgery", "Fissure Fistula")
            "varicose vein", "varicose veins" -> Pair("Vascular Surgery", "Varicose Vein")
            "kidney stone", "kidney stones" -> Pair("Urology", "Kidney Stone")
            "gall stones", "gallstones" -> Pair("Gastroenterology", "Gall Stones")
            "circumcision" -> Pair("Urology", "Circumcision")

            // Fallback: If no exact match but looks like a search query
            else -> Pair(null, cleanName)
        }
    }
}
