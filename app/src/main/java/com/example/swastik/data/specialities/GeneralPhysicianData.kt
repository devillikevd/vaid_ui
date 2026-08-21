package com.example.swastik.data.specialities

val generalPhysicianData = SpecialityDetailData(
    id = "general_physician",
    title = "General Physician",
    subtitle = "Primary Care & Family Medicine",
    heroDescription = "Your primary doctor for everyday health, comprehensive whole-body diagnosis, preventive care, and ongoing wellness management.",
    trustBadges = listOf(
        "🩺 Primary Healthcare",
        "⚡ Instant Video & Clinic Visits",
        "🛡️ 100% Verified MD / MBBS"
    ),
    aboutDescription = "A General Physician (Internal Medicine / Family Doctor) is a medical doctor trained to prevent, diagnose, and treat a wide spectrum of acute and chronic health conditions in adults and families. They serve as your first point of medical contact, conducting comprehensive clinical evaluations, analyzing diagnostic lab reports, managing multi-system disorders, and seamlessly coordinating referrals with super-specialists when specialized surgical or organ-specific care is required.",
    symptoms = listOf(
        SpecialitySymptom(
            emoji = "🤒",
            title = "Fever & Chills",
            subtitle = "High body temperature, viral flu, dengue & malaria"
        ),
        SpecialitySymptom(
            emoji = "🤧",
            title = "Cough, Cold & Flu",
            subtitle = "Throat pain, persistent cough, chest congestion & allergies"
        ),
        SpecialitySymptom(
            emoji = "🤢",
            title = "Stomach & Digestion",
            subtitle = "Acidity, abdominal cramps, diarrhea, nausea & gas"
        ),
        SpecialitySymptom(
            emoji = "🤕",
            title = "Headache & Body Pain",
            subtitle = "Migraines, muscle weakness, joint aches & chronic fatigue"
        ),
        SpecialitySymptom(
            emoji = "🩺",
            title = "Blood Pressure & Sugar",
            subtitle = "Hypertension check, routine blood glucose tracking"
        ),
        SpecialitySymptom(
            emoji = "🌀",
            title = "Dizziness & Weakness",
            subtitle = "Low energy, vertigo, dehydration & appetite loss"
        )
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "🦠 Viral & Bacterial Infections",
            items = listOf(
                "Typhoid & Dengue Fever",
                "Seasonal Influenza & Viral Flu",
                "Urinary Tract Infections (UTI)",
                "Throat & Upper Respiratory Infections"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🩺 Chronic Lifestyle & Metabolic",
            items = listOf(
                "Type 2 Diabetes Mellitus",
                "Hypertension (High BP)",
                "Thyroid Imbalances (Hypo/Hyper)",
                "High Cholesterol & Lipid Management"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🫁 Respiratory & Digestive Health",
            items = listOf(
                "Asthma & Acute Bronchitis",
                "Acid Reflux, GERD & Heartburn",
                "Irritable Bowel Syndrome (IBS)",
                "Gastritis, Indigestion & Constipation"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🌿 General Wellness & Deficiencies",
            items = listOf(
                "Vitamin D & B12 Deficiency",
                "Anemia & Low Hemoglobin",
                "Seasonal Skin Allergies & Rashes",
                "Sleep Disturbances & Chronic Fatigue"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep(
            stepNumber = "1",
            title = "Medical History & Symptoms",
            description = "The doctor reviews your current complaints, duration, prior illnesses, and ongoing medications."
        ),
        SpecialityConsultationStep(
            stepNumber = "2",
            title = "Clinical Assessment & Vitals",
            description = "Vitals evaluation (BP, Pulse, SpO2, Temperature) and detailed symptom review."
        ),
        SpecialityConsultationStep(
            stepNumber = "3",
            title = "Diagnostic Test Guidance",
            description = "If necessary, the physician prescribes targeted blood tests (CBC, HbA1c, Thyroid) or scans for accurate diagnosis."
        ),
        SpecialityConsultationStep(
            stepNumber = "4",
            title = "Digital Prescription & Care Plan",
            description = "Receive an official signed digital prescription, dosage schedule, lifestyle tips, and follow-up guidance."
        )
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "What is the difference between an MBBS and MD General Physician?",
            answer = "An MBBS doctor is a certified medical graduate capable of treating general illnesses and infections, while an MD in General Medicine has completed 3 years of post-graduate specialization in managing complex internal medical conditions and adult diseases."
        ),
        SpecialityFaqItem(
            question = "Can a General Physician prescribe diagnostic lab tests and scans?",
            answer = "Yes. General Physicians routinely prescribe blood profiles (CBC, Lipid, HbA1c, Liver/Kidney tests), urine tests, ECG, and X-rays to accurately evaluate your underlying health condition."
        ),
        SpecialityFaqItem(
            question = "When should I consult a specialist instead of a General Physician?",
            answer = "Starting with a General Physician is always recommended for non-emergency symptoms. If your diagnosis indicates organ-specific disease requiring advanced procedures (e.g. Cardiology, Neurology, Gastroenterology), your physician will refer you to the appropriate super-specialist."
        ),
        SpecialityFaqItem(
            question = "Can I manage long-term Diabetes and High BP with a General Physician?",
            answer = "Yes, General Physicians are expertly trained in chronic metabolic disease management, routine dose adjustments, dietary lifestyle advice, and preventive complications monitoring."
        )
    )
)
