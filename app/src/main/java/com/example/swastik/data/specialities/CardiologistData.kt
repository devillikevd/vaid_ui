package com.example.swastik.data.specialities

val cardiologistData = SpecialityDetailData(
    id = "cardiologist",
    title = "Cardiologist",
    subtitle = "Heart, Blood Pressure & Cardiovascular Specialist",
    heroDescription = "Renowned cardiac specialists dedicated to heart health, hypertension management, cholesterol control, ECG/ECHO analysis, and preventive cardiovascular care.",
    trustBadges = listOf(
        "❤️ Heart & Vascular Health",
        "⚡ Preventive & Post-Angio Follow-up",
        "🛡️ 100% Verified DM / DNB Cardiology"
    ),
    aboutDescription = "A Cardiologist is a specialized medical doctor dedicated to diagnosing, treating, and preventing diseases of the cardiovascular system — including the heart and blood vessels. They manage coronary artery disease, heart failure, irregular heart rhythms (arrhythmias), high blood pressure, and cholesterol disorders.",
    symptoms = listOf(
        SpecialitySymptom("💔", "Chest Pain & Pressure", "Heaviness, tightness, or burning in the chest radiating to jaw, shoulder, or left arm"),
        SpecialitySymptom("🫀", "Palpitations & Racing Heart", "Skipped heartbeats, sudden rapid heart rate, or irregular fluttering"),
        SpecialitySymptom("😮‍💨", "Shortness of Breath", "Difficulty breathing during mild exertion, walking, or lying flat at night"),
        SpecialitySymptom("🩺", "High Blood Pressure", "Uncontrolled hypertension readings, dizziness, and morning occipital headaches"),
        SpecialitySymptom("🦶", "Swollen Ankles & Feet", "Fluid retention (edema) in lower legs, sudden unexplained weight gain"),
        SpecialitySymptom("🌀", "Dizziness & Fainting", "Lightheadedness, syncope (blackouts), and unexplained loss of consciousness")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "❤️ Coronary & Ischemic Heart Disease",
            items = listOf(
                "Coronary Artery Disease (CAD)",
                "Angina Pectoris (Chest Pain)",
                "Post-Myocardial Infarction (Heart Attack) Care",
                "Stent & Bypass (CABG) Follow-up"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🫀 Rhythm & Conduction Disorders",
            items = listOf(
                "Atrial Fibrillation & Arrhythmias",
                "Tachycardia & Bradycardia",
                "Heart Block & Pacemaker Management",
                "Premature Ventricular Contractions (PVCs)"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🩺 Vascular & Metabolic Conditions",
            items = listOf(
                "Essential & Secondary Hypertension",
                "Hyperlipidemia & High Triglycerides",
                "Atherosclerosis & Carotid Artery Disease",
                "Peripheral Artery Disease (PAD)"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🛡️ Structural & Heart Failure Care",
            items = listOf(
                "Congestive Heart Failure (CHF)",
                "Valvular Heart Disease (Mitral/Aortic)",
                "Cardiomyopathy (Hypertrophic/Dilated)",
                "Pericarditis & Congenital Heart Defects"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Cardiac Risk History", "Evaluation of family history of heart disease, smoking, diabetes, BP trends, and symptoms."),
        SpecialityConsultationStep("2", "Vitals & Symptom Analysis", "Review of recent BP readings, pulse rate, oxygen saturation, and exertion tolerance."),
        SpecialityConsultationStep("3", "ECG, ECHO & Lipid Profile Review", "In-depth review of 12-lead ECG, 2D Echocardiogram, TMT stress test, or Lipid panels."),
        SpecialityConsultationStep("4", "Cardiovascular Care Plan", "Prescription of cardioprotective medications (statins, beta-blockers, ACE inhibitors), diet, and exercise limits.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "How do I distinguish between gas/acidity and a cardiac chest pain?",
            answer = "Cardiac chest pain is typically a dull, heavy squeezing sensation that worsens with exertion and may radiate to the left arm, neck, or jaw, often accompanied by sweating. Acidity is usually a sharp burning pain related to food intake that improves with antacids. When in doubt, always get an immediate ECG."
        ),
        SpecialityFaqItem(
            question = "What is a healthy blood pressure target?",
            answer = "For most adults, a normal blood pressure reading is below 120/80 mmHg. Consistent readings above 130/80 mmHg are considered hypertension and should be evaluated by a cardiologist."
        ),
        SpecialityFaqItem(
            question = "Can heart disease be reversed with medication and lifestyle changes?",
            answer = "Early-stage cardiovascular disease and arterial plaque progression can be significantly halted and stabilized with strict LDL cholesterol control (statins), blood pressure control, smoking cessation, and Mediterranean/heart-healthy nutrition."
        ),
        SpecialityFaqItem(
            question = "What cardiac reports should I have ready for a consultation?",
            answer = "Have your latest 12-Lead ECG, 2D Echo report, Lipid Profile (Cholesterol/Triglycerides), HbA1c, and a log of your home blood pressure readings ready."
        )
    )
)
