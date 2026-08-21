package com.example.swastik.data.specialities

object SpecialityRegistry {

    fun getSpecialityData(specialization: String, search: String? = null): SpecialityDetailData {
        val combined = "${specialization.trim()} ${search?.trim() ?: ""}".lowercase()

        return when {
            // Veterinary / Pet Care
            combined.contains("veterinary") || combined.contains("vet") || combined.contains("pet") || combined.contains("animal") -> {
                veterinaryData
            }
            // Hair Transplant & Restoration
            combined.contains("hair transplant") || combined.contains("hair restoration") || combined.contains("tricholog") -> {
                hairTransplantData
            }
            // Cosmetic Dermatology
            combined.contains("cosmetic derma") || combined.contains("aesthetic derma") || combined.contains("cosmetolog") -> {
                cosmeticDermatologistData
            }
            // General Dermatology / Skin & Hair
            combined.contains("derma") || combined.contains("skin") || combined.contains("hair") -> {
                dermatologistData
            }
            // Proctology & Anorectal (Piles, Fissure, Fistula, Pilonidal)
            combined.contains("piles") || combined.contains("fissure") || combined.contains("fistula") || combined.contains("proctolog") || combined.contains("anorectal") || combined.contains("hemorrhoid") -> {
                proctologistData
            }
            // Vascular Surgery (Varicose Veins, DVT)
            combined.contains("varicose") || combined.contains("vascular") || combined.contains("endovascular") || combined.contains("dvt") -> {
                vascularSurgeonData
            }
            // Laparoscopic / Minimal Access Surgery (Gallbladder stones, Hernia, Appendix)
            combined.contains("gall stone") || combined.contains("gallstone") || combined.contains("gallbladder") || combined.contains("laparoscop") || combined.contains("minimal access") || combined.contains("keyhole") || combined.contains("bariatric") -> {
                laparoscopicSurgeonData
            }
            // General Surgery (Hernia, Appendix, Circumcision, Abscess)
            combined.contains("hernia") || combined.contains("appendicitis") || combined.contains("general surgeon") || (combined.contains("surgeon") && !combined.contains("neuro") && !combined.contains("cardio") && !combined.contains("plastic") && !combined.contains("vascular")) -> {
                generalSurgeonData
            }
            // Plastic & Reconstructive Surgery
            combined.contains("plastic") || combined.contains("reconstructive") || combined.contains("cosmetic surgeon") || combined.contains("rhinoplasty") -> {
                plasticSurgeonData
            }
            // Fertility & IVF
            combined.contains("fertility") || combined.contains("ivf") || combined.contains("iui") || combined.contains("reproductive") || combined.contains("infertility") -> {
                fertilityIvfData
            }
            // Spine Surgery & Sciatica
            combined.contains("spine") || combined.contains("vertebra") || combined.contains("sciatica") || combined.contains("slipped disc") -> {
                spineSpecialistData
            }
            // Hepatology & Liver
            combined.contains("liver") || combined.contains("hepatolog") || combined.contains("jaundice") || combined.contains("fatty liver") || combined.contains("cirrhosis") -> {
                liverSpecialistData
            }
            // Nephrology & Kidney
            combined.contains("kidney stone") || combined.contains("circumcision") -> {
                urologistData
            }
            combined.contains("kidney") || combined.contains("nephrolog") || combined.contains("dialysis") || combined.contains("renal") || combined.contains("creatinine") -> {
                kidneySpecialistData
            }
            // Interventional Pain Management
            combined.contains("pain management") || combined.contains("pain specialist") || combined.contains("nerve block") || combined.contains("chronic pain") -> {
                painManagementData
            }
            // Sports Medicine & Arthroscopy
            combined.contains("sports") || combined.contains("athlete") || combined.contains("athletic") || combined.contains("ligament") -> {
                sportsMedicineData
            }
            // Mental Health & Clinical Psychology / Counseling
            combined.contains("mental health") || combined.contains("psycholog") || combined.contains("counsel") || combined.contains("therapy") || combined.contains("therapist") -> {
                mentalHealthData
            }
            // Psychiatry
            combined.contains("psychiatr") || combined.contains("depression") || combined.contains("anxiety") || combined.contains("mental wellness") -> {
                psychiatristData
            }
            // Allergy & Immunology
            combined.contains("allerg") || combined.contains("immunolog") || combined.contains("urticaria") -> {
                allergySpecialistData
            }
            // Rheumatology & Autoimmune
            combined.contains("rheumatolog") || combined.contains("lupus") || combined.contains("gout") || combined.contains("ankylosing") -> {
                rheumatologistData
            }
            // Endocrinology & Thyroid
            combined.contains("endocrinolog") || combined.contains("thyroid") || combined.contains("hormone") || combined.contains("hormonal") -> {
                endocrinologistData
            }
            // Diabetology & Blood Sugar
            combined.contains("diabet") || combined.contains("glucose") || combined.contains("hba1c") -> {
                diabetologistData
            }
            // Oncology & Cancer
            combined.contains("cancer") || combined.contains("oncolog") || combined.contains("tumor") || combined.contains("chemo") -> {
                oncologistData
            }
            // Homeopathy
            combined.contains("homeopath") || combined.contains("homoeopath") || combined.contains("bhms") -> {
                homeopathyData
            }
            // Ayurveda
            combined.contains("ayurved") || combined.contains("panchakarma") || combined.contains("bams") || combined.contains("vaidya") -> {
                ayurvedaData
            }
            // Diet & Nutrition
            combined.contains("diet") || combined.contains("nutrit") || combined.contains("weight loss") || combined.contains("meal plan") -> {
                dietNutritionData
            }
            // Physiotherapy & Rehabilitation
            combined.contains("physiotherap") || combined.contains("physical therap") || combined.contains("rehab") || combined.contains("posture") -> {
                physiotherapistData
            }
            // Pulmonology & Chest / Lungs
            combined.contains("pulmonolog") || combined.contains("chest") || combined.contains("lung") || combined.contains("asthma") || combined.contains("respiratory") -> {
                pulmonologistData
            }
            // Ophthalmology & Eyes / Vision
            combined.contains("ophthalmolog") || combined.contains("eye") || combined.contains("vision") || combined.contains("cataract") || combined.contains("lasik") || combined.contains("optom") -> {
                ophthalmologistData
            }
            // Dentistry & Oral Health
            combined.contains("dentist") || combined.contains("dental") || combined.contains("teeth") || combined.contains("tooth") || combined.contains("orthodont") -> {
                dentistData
            }
            // Sexology & Intimacy
            combined.contains("sexolog") || combined.contains("sexual") || combined.contains("intimacy") || combined.contains("erectile") || combined.contains("ejaculation") -> {
                sexologistData
            }
            // Urology & Urinary System
            combined.contains("urolog") || combined.contains("urinary") || combined.contains("bladder") || combined.contains("prostate") -> {
                urologistData
            }
            // Gastroenterology & Digestion
            combined.contains("gastro") || combined.contains("gut") || combined.contains("stomach") || combined.contains("digestion") || combined.contains("acidity") || combined.contains("ibs") || combined.contains("gerd") || combined.contains("constipation") -> {
                gastroenterologistData
            }
            // Neurology & Brain / Nerves
            combined.contains("neuro") || combined.contains("brain") || combined.contains("epilepsy") || combined.contains("seizure") || combined.contains("stroke") || combined.contains("headache") || combined.contains("vertigo") -> {
                neurologistData
            }
            // Cardiology & Heart
            combined.contains("cardio") || combined.contains("heart") || combined.contains("cardiac") || combined.contains("hypertension") || combined.contains("ecg") -> {
                cardiologistData
            }
            // ENT (Ear, Nose, Throat)
            combined.contains("ent") || combined.contains("ear") || combined.contains("throat") || combined.contains("sinus") || combined.contains("audiolog") -> {
                entSpecialistData
            }
            // Pediatrics & Child Care
            combined.contains("pediatric") || combined.contains("paediatric") || combined.contains("child") || combined.contains("baby") || combined.contains("infant") -> {
                pediatricianData
            }
            // Orthopedics & Bones / Joints
            combined.contains("orthoped") || combined.contains("orthopaed") || combined.contains("bone") || combined.contains("joint") || combined.contains("fracture") || combined.contains("knee") -> {
                orthopedistData
            }
            // Gynecology & Women's Health
            combined.contains("gynec") || combined.contains("gynaec") || combined.contains("women") || combined.contains("obgyn") || combined.contains("pregnancy") || combined.contains("obstetric") || combined.contains("maternity") -> {
                gynecologistData
            }
            // General Physician & Internal Medicine (Fever, Cold, Cough, COVID)
            combined.contains("general") || combined.contains("physician") || combined.contains("internal") || combined.contains("family") || combined.contains("fever") || combined.contains("cold") || combined.contains("cough") || combined.contains("covid") -> {
                generalPhysicianData
            }
            // Fallback for any other specialities
            else -> {
                buildFallbackSpecialityData(specialization)
            }
        }
    }

    private fun buildFallbackSpecialityData(specialization: String): SpecialityDetailData {
        return SpecialityDetailData(
            id = specialization.lowercase().replace(" ", "_"),
            title = specialization,
            subtitle = "Clinical Specialist & Healthcare Expert",
            heroDescription = "Consult verified and certified $specialization specialists for comprehensive diagnosis, treatment, and ongoing care.",
            trustBadges = listOf(
                "🩺 Specialized Care",
                "⚡ In-Person & Video Consultations",
                "🛡️ 100% Verified Doctors"
            ),
            aboutDescription = "A $specialization is a certified medical specialist dedicated to providing advanced care, diagnosis, and evidence-based treatment plans tailored to your specific health requirements.",
            symptoms = listOf(
                SpecialitySymptom("🩺", "Routine Consultation", "Specialized evaluation and regular health checkup"),
                SpecialitySymptom("📋", "Second Opinion", "Expert review of diagnosis, reports, and treatment plans"),
                SpecialitySymptom("💊", "Ongoing Care", "Medication management and follow-up reviews"),
                SpecialitySymptom("🔬", "Test Interpretation", "Analysis of diagnostic reports and scans")
            ),
            conditionCategories = listOf(
                SpecialityConditionCategory(
                    categoryName = "🩺 Specialized Care & Management",
                    items = listOf(
                        "Comprehensive Assessment",
                        "Targeted Medical Treatment",
                        "Preventive Health Checkups",
                        "Follow-up & Recovery Tracking"
                    )
                )
            ),
            consultationSteps = listOf(
                SpecialityConsultationStep("1", "History Review", "Detailed discussion of your symptoms and medical history."),
                SpecialityConsultationStep("2", "Clinical Evaluation", "In-depth examination and symptom analysis."),
                SpecialityConsultationStep("3", "Treatment & Prescription", "Personalized treatment plan, prescriptions, and lifestyle guidance.")
            ),
            faqs = listOf(
                SpecialityFaqItem(
                    question = "How do I prepare for my consultation?",
                    answer = "Keep your past medical records, recent lab test reports, and a list of your current medications ready for the doctor to review."
                )
            )
        )
    }
}
