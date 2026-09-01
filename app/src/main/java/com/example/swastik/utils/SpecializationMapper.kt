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

        val lower = cleanName.lowercase().trim()

        // 2. Exact match for common terms & symptoms
        val exactMatch = when (lower) {
            // Category Exact Mappings
            "gynecologist", "gynecology", "obstetrics", "obgyn" -> Pair("Gynecology", null)
            "dermatologist", "dermatology" -> Pair("Dermatology", null)
            "pediatrician", "pediatrics" -> Pair("Pediatrics", null)
            "dentist", "dentistry", "dental" -> Pair("Dentistry", null)
            "ent specialist", "ent", "otolaryngologist" -> Pair("ENT", null)
            "cardiologist", "cardiology" -> Pair("Cardiology", null)
            "orthopedist", "orthopedics" -> Pair("Orthopedics", null)
            "psychiatrist", "psychiatry" -> Pair("Psychiatry", null)
            "neurologist", "neurology", "neuro" -> Pair("Neurology", null)
            "urologist", "urology" -> Pair("Urology", null)
            "pulmonologist", "pulmonology" -> Pair("Pulmonology", null)
            "gastroenterologist", "gastroenterology", "gastro" -> Pair("Gastroenterology", null)
            "endocrinologist", "endocrinology" -> Pair("Endocrinology", null)
            "oncologist", "oncology" -> Pair("Oncology", null)
            "physiotherapist", "physiotherapy" -> Pair("Physiotherapy", null)
            "general surgeon", "general surgery" -> Pair("General Surgery", null)
            "diet & nutrition", "nutrition & dietetics", "dietitian", "nutritionist", "diet" -> Pair("Nutrition & Dietetics", null)
            "cancer specialist", "cancer" -> Pair("Oncology", null)
            "diabetologist", "diabetology", "diabetes" -> Pair("Diabetology", null)
            "nephrologist", "nephrology" -> Pair("Nephrology", null)
            "rheumatologist", "rheumatology" -> Pair("Rheumatology", null)
            "plastic surgeon", "plastic surgery" -> Pair("Plastic Surgery", null)
            "fertility / ivf specialist", "fertility specialist", "ivf specialist", "fertility", "ivf" -> Pair("Gynecology", "IVF Fertility")
            "spine specialist", "spine" -> Pair("Orthopedics", "Spine")
            "liver specialist", "hepatologist" -> Pair("Gastroenterology", "Hepatology")
            "kidney specialist", "kidney issues" -> Pair("Nephrology", "Kidney")
            "allergy specialist", "allergy & immunology", "allergist", "allergy" -> Pair("Allergy & Immunology", null)
            "hair transplant specialist" -> Pair("Dermatology", "Hair Transplant")
            "cosmetic dermatologist" -> Pair("Dermatology", "Cosmetic")
            "mental health specialist", "mental health", "psychologist", "psychology", "counselor" -> Pair("Psychology", "Mental Health")
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
            "veterinary", "vet", "pet care" -> Pair("Veterinary", null)
            "chronic problems" -> Pair("General Physician", "Chronic")

            // Symptoms
            "headache", "migraine", "head pain", "tension headache", "cluster headache" -> Pair("Neurology", "Headache")
            "fever", "viral fever", "high temperature", "chills" -> Pair("General Physician", "Fever")
            "cold & cough", "cold", "cough", "runny nose", "sore throat", "flu", "sneezing" -> Pair("General Physician", "Cold Cough")
            "covid", "covid-19", "corona" -> Pair("General Physician", "COVID")
            "stomach pain", "abdominal pain", "stomach ache", "belly pain" -> Pair("Gastroenterology", "Stomach Pain")
            "acidity", "gas", "acid reflux", "gerd", "heartburn", "indigestion", "bloating" -> Pair("Gastroenterology", "Acidity")
            "constipation", "loose motion", "diarrhea", "vomiting", "nausea" -> Pair("Gastroenterology", "Digestion")
            "sinusitis", "sinus", "nasal blockage" -> Pair("ENT", "Sinusitis")
            "vertigo", "dizziness", "giddiness" -> Pair("ENT", "Vertigo")
            "ear pain", "ear discharge", "hearing problem", "ringing in ear", "tinnitus" -> Pair("ENT", "Ear Pain")
            "throat pain", "tonsillitis", "tonsils", "hoarse voice" -> Pair("ENT", "Throat")
            "chest pain", "palpitations", "high bp", "blood pressure", "hypertension" -> Pair("Cardiology", "Chest Pain")
            "back pain", "lower back pain", "sciatica", "slip disc", "spondylitis" -> Pair("Orthopedics", "Back Pain")
            "knee pain", "joint pain", "joint stiffness", "arthritis", "frozen shoulder", "neck pain" -> Pair("Orthopedics", "Joint Pain")
            "hair fall", "hair loss", "dandruff", "baldness", "thinning hair" -> Pair("Dermatology", "Hair Fall")
            "acne", "pimples", "dark spots", "skin rash", "itching", "eczema", "psoriasis", "fungal infection" -> Pair("Dermatology", "Skin Care")
            "toothache", "tooth pain", "bleeding gums", "cavity", "bad breath", "wisdom tooth" -> Pair("Dentistry", "Toothache")
            "eye pain", "blurry vision", "red eye", "watery eye", "dry eyes", "cataract" -> Pair("Ophthalmology", "Vision")
            "anxiety", "depression", "panic attack", "stress", "insomnia", "sleep disorder" -> Pair("Psychiatry", "Mental Health")
            "period pain", "irregular periods", "delayed periods", "pcos", "pcod", "white discharge", "pregnancy" -> Pair("Gynecology", "Women Health")
            "burning urination", "painful urination", "frequent urination", "uti", "blood in urine", "urine infection" -> Pair("Urology", "Urinary")
            "kidney stone", "kidney stones", "renal stone" -> Pair("Urology", "Kidney Stone")
            "asthma", "breathlessness", "shortness of breath", "wheezing", "chest congestion" -> Pair("Pulmonology", "Asthma")

            // Surgery Conditions
            "piles/ hemorrhoids", "piles", "hemorrhoids", "bawasir" -> Pair("General Surgery", "Piles Hemorrhoids")
            "hernia" -> Pair("General Surgery", "Hernia")
            "appendicitis", "appendix" -> Pair("General Surgery", "Appendicitis")
            "anal fissure/ anal fistula", "anal fissure", "fissure", "fistula" -> Pair("General Surgery", "Fissure Fistula")
            "varicose vein", "varicose veins" -> Pair("Vascular Surgery", "Varicose Vein")
            "gall stones", "gallstones", "gallbladder stones" -> Pair("Gastroenterology", "Gall Stones")
            "circumcision" -> Pair("Urology", "Circumcision")

            else -> null
        }

        if (exactMatch != null) return exactMatch

        // 3. Keyword / Substring containment fallback (Smart Search)
        return when {
            lower.contains("headache") || lower.contains("migraine") || lower.contains("head pain") -> Pair("Neurology", "Headache")
            lower.contains("fever") || lower.contains("chills") || lower.contains("temperature") -> Pair("General Physician", "Fever")
            lower.contains("cough") || lower.contains("cold") || lower.contains("sore throat") || lower.contains("flu") || lower.contains("sneez") -> Pair("General Physician", "Cold Cough")
            lower.contains("stomach") || lower.contains("acidity") || lower.contains("gas") || lower.contains("digest") || lower.contains("constipat") || lower.contains("diarrhea") || lower.contains("vomit") || lower.contains("gerd") || lower.contains("reflux") -> Pair("Gastroenterology", "Stomach")
            lower.contains("skin") || lower.contains("rash") || lower.contains("acne") || lower.contains("pimple") || lower.contains("hair") || lower.contains("dandruff") || lower.contains("itch") || lower.contains("derma") || lower.contains("eczema") || lower.contains("fungal") -> Pair("Dermatology", "Skin Hair")
            lower.contains("heart") || lower.contains("chest pain") || lower.contains("palpitat") || lower.contains("blood pressure") || lower.contains("hypertens") || lower.contains("cardio") -> Pair("Cardiology", "Cardiology")
            lower.contains("bone") || lower.contains("joint") || lower.contains("knee") || lower.contains("back pain") || lower.contains("neck pain") || lower.contains("fracture") || lower.contains("arthrit") || lower.contains("ortho") || lower.contains("shoulder") || lower.contains("spine") -> Pair("Orthopedics", "Orthopedics")
            lower.contains("ear") || lower.contains("nose") || lower.contains("throat") || lower.contains("sinus") || lower.contains("vertigo") || lower.contains("tonsil") || lower.contains("tinnitus") -> Pair("ENT", "ENT")
            lower.contains("eye") || lower.contains("vision") || lower.contains("cataract") || lower.contains("lasik") || lower.contains("ophthalm") -> Pair("Ophthalmology", "Vision")
            lower.contains("tooth") || lower.contains("teeth") || lower.contains("dental") || lower.contains("dentist") || lower.contains("gum") || lower.contains("cavity") || lower.contains("root canal") -> Pair("Dentistry", "Dental")
            lower.contains("anxiety") || lower.contains("depress") || lower.contains("stress") || lower.contains("insomnia") || lower.contains("mental") || lower.contains("psych") -> Pair("Psychiatry", "Mental Health")
            lower.contains("period") || lower.contains("pregnant") || lower.contains("pregnancy") || lower.contains("pcos") || lower.contains("pcod") || lower.contains("gynec") || lower.contains("maternity") || lower.contains("fertility") || lower.contains("ivf") -> Pair("Gynecology", "Women Health")
            lower.contains("urine") || lower.contains("urinary") || lower.contains("uti") || lower.contains("kidney stone") || lower.contains("prostate") || lower.contains("urolog") -> Pair("Urology", "Urology")
            lower.contains("kidney") || lower.contains("nephrolog") || lower.contains("dialysis") || lower.contains("renal") -> Pair("Nephrology", "Kidney")
            lower.contains("breath") || lower.contains("asthma") || lower.contains("lung") || lower.contains("pulmono") || lower.contains("chest") -> Pair("Pulmonology", "Respiratory")
            lower.contains("sugar") || lower.contains("diabet") || lower.contains("thyroid") || lower.contains("hormon") || lower.contains("endocrin") -> Pair("Endocrinology", "Endocrinology")
            lower.contains("child") || lower.contains("baby") || lower.contains("infant") || lower.contains("pediatric") || lower.contains("paediatric") -> Pair("Pediatrics", "Pediatrics")
            lower.contains("cancer") || lower.contains("tumor") || lower.contains("oncolog") || lower.contains("chemo") -> Pair("Oncology", "Oncology")
            lower.contains("piles") || lower.contains("fissure") || lower.contains("fistula") || lower.contains("hernia") || lower.contains("appendix") || lower.contains("surgeon") || lower.contains("surgery") -> Pair("General Surgery", "Surgery")
            lower.contains("physio") || lower.contains("rehab") || lower.contains("posture") -> Pair("Physiotherapy", "Physiotherapy")
            lower.contains("diet") || lower.contains("nutrit") || lower.contains("weight") -> Pair("Nutrition & Dietetics", "Diet")
            lower.contains("ayurved") -> Pair("Ayurveda", "Ayurveda")
            lower.contains("homeopath") -> Pair("Homeopathy", "Homeopathy")
            lower.contains("sex") || lower.contains("intimacy") || lower.contains("erectile") || lower.contains("androlog") -> Pair("Sexology", "Sexology")
            lower.contains("pet") || lower.contains("dog") || lower.contains("cat") || lower.contains("vet") || lower.contains("animal") -> Pair("Veterinary", "Veterinary")
            else -> Pair(null, cleanName)
        }
    }

    /**
     * Returns a user-friendly subtitle or specialist badge for symptoms and categories.
     * Example: "Headache" -> "Consult Neurologist 🧠"
     */
    fun getSpecialistSubtitle(query: String): String {
        val (spec, _) = mapToSearchParams(query)
        return when (spec) {
            "Neurology" -> "Consult Neurologist 🧠"
            "General Physician" -> "Consult General Physician 🩺"
            "Dermatology" -> "Consult Dermatologist 🧴"
            "Gastroenterology" -> "Consult Gastroenterologist 🫄"
            "Cardiology" -> "Consult Cardiologist ❤️"
            "Orthopedics" -> "Consult Orthopedic Specialist 🦴"
            "ENT" -> "Consult ENT Specialist 👂"
            "Ophthalmology" -> "Consult Eye Specialist 👁️"
            "Dentistry" -> "Consult Dental Surgeon 🦷"
            "Gynecology" -> "Consult Gynecologist 🌸"
            "Pediatrics" -> "Consult Pediatrician 👶"
            "Psychiatry", "Psychology" -> "Consult Mental Health Expert 🧘"
            "Urology" -> "Consult Urologist 💧"
            "Nephrology" -> "Consult Nephrologist 🩺"
            "Pulmonology" -> "Consult Pulmonologist 🫁"
            "Endocrinology", "Diabetology" -> "Consult Diabetologist / Endocrinologist 🩸"
            "Oncology" -> "Consult Cancer Specialist 🎗️"
            "General Surgery" -> "Consult General Surgeon 🏥"
            "Physiotherapy" -> "Consult Physiotherapist 🏃"
            "Nutrition & Dietetics" -> "Consult Dietitian 🥗"
            "Ayurveda" -> "Consult Ayurvedic Doctor 🌿"
            "Homeopathy" -> "Consult Homeopathic Doctor 💊"
            "Sexology" -> "Consult Sexual Health Specialist 🔒"
            "Veterinary" -> "Consult Veterinary Doctor 🐾"
            else -> "Specialist Consultation"
        }
    }
}
