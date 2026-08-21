package com.example.swastik.data.specialities

val allergySpecialistData = SpecialityDetailData(
    id = "allergy_specialist",
    title = "Allergy & Clinical Immunologist",
    subtitle = "Allergy Specialist, Food Allergies, Asthma & Immunotherapy",
    heroDescription = "Consult expert allergists and clinical immunologists for chronic sneezing, food allergies, urticaria (hives), dust/pollen allergies, eczema, and allergy immunotherapy (desensitization).",
    trustBadges = listOf(
        "🛡️ Allergy & Immunology Care",
        "⚡ Skin Prick & Total IgE Testing",
        "🛡️ Certified Clinical Allergists"
    ),
    aboutDescription = "An Allergy and Clinical Immunology Specialist is a medical expert specializing in the diagnosis, management, and treatment of allergic diseases and immune system dysfunctions — including respiratory allergies, severe food reactions, drug hypersensitivities, and chronic urticaria.",
    symptoms = listOf(
        SpecialitySymptom("🤧", "Continuous Sneezing & Runny Nose", "Morning sneezing attacks, clear watery rhinorrhea, itchy nose/throat, and nasal congestion"),
        SpecialitySymptom("🔴", "Urticaria (Hives & Welts)", "Sudden raised, intensely itchy red welts/wheals appearing across the body that vanish and reappear"),
        SpecialitySymptom("🥜", "Food Reaction & Swelling", "Lip swelling, facial angioedema, throat tightness, or abdominal cramps after eating specific foods"),
        SpecialitySymptom("🫁", "Allergic Cough & Wheezing", "Dry spasmodic coughing or chest whistling triggered by pet dander, cold air, smoke, or pollen"),
        SpecialitySymptom("👁️", "Allergic Conjunctivitis", "Red, itchy, burning eyes with excessive watery tearing and swollen eyelids"),
        SpecialitySymptom("⚠️", "Anaphylaxis (Severe Reaction)", "Sudden dizziness, difficulty breathing, throat closing, and blood pressure drop after stings or drugs")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "🤧 Respiratory & Seasonal Allergies",
            items = listOf(
                "Allergic Rhinitis (Hay Fever)",
                "Dust Mite & Pollen Hypersensitivity",
                "Pet Dander (Cat / Dog) Allergy",
                "Allergic Fungal Sinusitis"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🔴 Cutaneous & Skin Allergic Disorders",
            items = listOf(
                "Chronic Spontaneous Urticaria (Hives)",
                "Angioedema (Lip, Eyelid & Throat Swelling)",
                "Atopic Dermatitis & Contact Eczema",
                "Physical Urticaria (Cold, Pressure, Cholinergic)"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🥜 Food, Drug & Insect Venom Allergies",
            items = listOf(
                "Peanut, Tree Nut, Dairy & Seafood Allergies",
                "Antibiotic & Drug Hypersensitivity Testing",
                "Bee & Wasp Venom Allergy",
                "Latex Allergy & Cross-Reactivity Syndromes"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "⚡ Advanced Allergy Diagnostics & Care",
            items = listOf(
                "Skin Prick Testing (SPT) Guidance",
                "Serum Specific IgE (ImmunoCAP) Profiling",
                "Allergen Immunotherapy (AIT / Sublingual Drops)",
                "Biologics (Anti-IgE / Omalizumab) for Hives"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Allergy Trigger History", "Detailed analysis of reaction timings, seasonal patterns, dietary triggers, animal exposure, and home environment."),
        SpecialityConsultationStep("2", "IgE & Allergy Panel Review", "Evaluation of Total IgE levels, Absolute Eosinophil Count (AEC), and Component-Resolved Diagnostic (CRD) panels."),
        SpecialityConsultationStep("3", "Emergency & Preventative Action Plan", "Prescription of non-drowsy second-generation antihistamines, nasal steroid sprays, and EpiPen guidance."),
        SpecialityConsultationStep("4", "Desensitization & Immunotherapy", "Personalized immunotherapy road map (SLIT/SCIT) to train the immune system to tolerate allergens permanently.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "Can allergies be permanently cured with Allergen Immunotherapy (AIT)?",
            answer = "Yes! Allergen Immunotherapy (desensitization allergy shots or sublingual drops) is the only disease-modifying treatment that trains your immune system to stop overreacting to allergens, offering long-lasting freedom from symptoms."
        ),
        SpecialityFaqItem(
            question = "What is the difference between a food allergy and a food intolerance?",
            answer = "A food allergy is an immune system reaction (IgE-mediated) that can cause hives, swelling, or life-threatening anaphylaxis even from tiny amounts. A food intolerance (like lactose intolerance) is a digestive inability to process certain foods without an immune reaction."
        ),
        SpecialityFaqItem(
            question = "How is chronic urticaria (hives) treated when antihistamines fail?",
            answer = "For refractory chronic hives, modern biologic therapies such as Anti-IgE injections (Omalizumab) provide rapid and profound relief with high safety."
        ),
        SpecialityFaqItem(
            question = "What tests should I keep ready for my allergy doctor?",
            answer = "Keep your Total IgE report, Complete Blood Count (CBC/AEC), any previous Allergy Skin Prick or Blood Allergy Panel reports ready."
        )
    )
)
