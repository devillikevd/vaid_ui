package com.example.swastik.data.specialities

val pediatricianData = SpecialityDetailData(
    id = "pediatrician",
    title = "Pediatrician",
    subtitle = "Child Health, Growth & Vaccination Specialist",
    heroDescription = "Compassionate child specialists offering comprehensive medical care for newborns, infants, toddlers, and adolescents, including routine vaccinations and growth milestone tracking.",
    trustBadges = listOf(
        "👶 Newborn & Child Care",
        "⚡ Instant Child Video & Clinic Visits",
        "🛡️ 100% Verified MD / DCH Ped"
    ),
    aboutDescription = "A Pediatrician is a medical doctor specialized in managing the physical, behavioral, developmental, and emotional health of children from birth through age 18. They provide expert guidance on infant nutrition, immunization schedules, childhood infections, allergy management, and developmental milestone tracking.",
    symptoms = listOf(
        SpecialitySymptom("🤒", "Childhood Fever & Cold", "High temperature, runny nose, chest congestion, flu & croup in babies"),
        SpecialitySymptom("💉", "Vaccinations & Immunization", "National immunization schedule, booster shots, and painless vaccines"),
        SpecialitySymptom("🍼", "Colic, Vomiting & Diarrhea", "Infant gas discomfort, milk spitting, loose motions, and dehydration"),
        SpecialitySymptom("📏", "Growth & Milestone Delays", "Weight tracking, delayed speech, slow walking, and nutritional deficiencies"),
        SpecialitySymptom("🍓", "Skin Rashes & Allergies", "Diaper rash, baby eczema, food allergies, and viral heat rashes"),
        SpecialitySymptom("😴", "Sleep & Behavioral Issues", "Excessive crying, bedwetting, feeding aversion, and hyperactivity")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "🤒 Acute Pediatric Infections",
            items = listOf(
                "Viral Fever, Influenza & RSV",
                "Ear Infections & Tonsillitis",
                "Bronchiolitis & Childhood Pneumonia",
                "Hand, Foot, and Mouth Disease (HFMD)"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🍼 Infant Care & Gastrointestinal",
            items = listOf(
                "Infantile Colic & Acid Reflux",
                "Acute Gastroenteritis & Dehydration",
                "Lactose Intolerance & Milk Protein Allergy",
                "Constipation & Poor Weight Gain"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "💉 Preventive Pediatrics & Vaccines",
            items = listOf(
                "Routine IAP Immunization Schedule",
                "Flu & Rotavirus Vaccination",
                "Vitamin D3 & Iron Supplementation",
                "Newborn Jaundice & Screening"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "📏 Growth, Nutrition & Development",
            items = listOf(
                "Height & Weight Percentile Tracking",
                "Childhood Asthma & Allergic Rhinitis",
                "Speech & Motor Milestone Assessment",
                "ADHD & Childhood Behavioral Health"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Symptom & Feeding History", "Discussion about the child's fever chart, feeding patterns, wet diapers, and sleep schedule."),
        SpecialityConsultationStep("2", "Visual & Vital Assessment", "Evaluation of child's alertness, breathing rate, chest retraction, skin tone, and temperature."),
        SpecialityConsultationStep("3", "Milestone & Growth Check", "Review of growth curve percentiles, vaccination card, and developmental milestones."),
        SpecialityConsultationStep("4", "Weight-Adjusted Prescription", "Precise dosage syrups based on child's exact body weight, hydration instructions, and red-flag danger signs.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "Why are pediatric medication doses different from adults?",
            answer = "Children have developing metabolic systems and must strictly receive weight-adjusted pediatric dosages calculated in mg per kg of body weight to ensure complete safety and efficacy."
        ),
        SpecialityFaqItem(
            question = "When should a parent seek immediate emergency care for a child?",
            answer = "Seek immediate care if the child has rapid or labored breathing, continuous high fever above 102°F that doesn't respond to medication, extreme lethargy/unresponsiveness, or fewer than 3 wet diapers in 24 hours."
        ),
        SpecialityFaqItem(
            question = "Can I consult a Pediatrician online for common colds and infant rashes?",
            answer = "Yes. Online video consults are ideal for assessing infant rashes, feeding issues, sleep queries, non-emergency colds, and routine vaccination planning without taking a delicate infant to a crowded hospital."
        ),
        SpecialityFaqItem(
            question = "What should I keep ready for a pediatric consultation?",
            answer = "Keep your child's recent weight, current temperature reading, vaccination record booklet, and details of milk intake/urine output ready."
        )
    )
)
