package com.example.swastik.data.specialities

val pulmonologistData = SpecialityDetailData(
    id = "pulmonologist",
    title = "Pulmonologist",
    subtitle = "Chest Physician, Lungs & Respiratory Specialist",
    heroDescription = "Expert chest physicians for diagnosis and long-term control of asthma, persistent cough, COPD, bronchitis, pneumonia, allergy breathlessness, and sleep apnea.",
    trustBadges = listOf(
        "🫁 Lung & Respiratory Health",
        "⚡ Spirometry & PFT Review",
        "🛡️ 100% Verified MD / DM Pulmonology"
    ),
    aboutDescription = "A Pulmonologist (Chest Specialist) is a physician who specializes in diseases of the respiratory tract — including the lungs, bronchial tubes, trachea, and respiratory muscles.",
    symptoms = listOf(
        SpecialitySymptom("😮‍💨", "Chronic Cough (>3 Weeks)", "Persistent dry or phlegm-producing cough, coughing fits at night, or throat tickling"),
        SpecialitySymptom("🌬️", "Wheezing & Chest Tightness", "High-pitched whistling sound while breathing, heavy chest tightness after dust or pollen exposure"),
        SpecialitySymptom("🫁", "Shortness of Breath (Dyspnea)", "Breathlessness on walking upstairs, rapid shallow breathing, or air hunger"),
        SpecialitySymptom("🩸", "Blood in Phlegm (Hemoptysis)", "Streaks of blood in sputum or rusty cough requiring immediate medical check"),
        SpecialitySymptom("😴", "Snoring & Daytime Fatigue", "Heavy snoring, waking up gasping for air, and daytime drowsiness (Sleep Apnea)"),
        SpecialitySymptom("🤒", "Chest Infection & Fever", "High fever with chills, pleuritic chest pain that worsens when breathing in")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "🌬️ Airway & Allergic Lung Diseases",
            items = listOf(
                "Bronchial Asthma & Allergic Bronchitis",
                "Chronic Obstructive Pulmonary Disease (COPD)",
                "Occupational Lung Disease & Dust Allergy",
                "Chronic Cough & Bronchiectasis"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🦠 Infectious Lung Diseases",
            items = listOf(
                "Pneumonia (Bacterial, Viral & Fungal)",
                "Pulmonary & Extrapulmonary Tuberculosis (TB)",
                "Post-COVID Lung Fibrosis & Long COVID",
                "Pleurisy & Pleural Effusion (Fluid in Lungs)"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "😴 Sleep-Related Breathing Disorders",
            items = listOf(
                "Obstructive Sleep Apnea (OSA)",
                "CPAP / BiPAP Machine Therapy Guidance",
                "Sleep Hypopnea & Chronic Snoring",
                "Hypoventilation Syndrome"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🛡️ Interstitial & Vascular Lung Care",
            items = listOf(
                "Interstitial Lung Disease (ILD) & Fibrosis",
                "Pulmonary Arterial Hypertension (PAH)",
                "Sarcoidosis & Hypersensitivity Pneumonitis",
                "Smoking De-Addiction & Lung Detox"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Respiratory History & Triggers", "Assessment of cough duration, sputum color, allergy triggers, smoking history, and SpO2 levels."),
        SpecialityConsultationStep("2", "Lung Function & PFT Analysis", "Interpretation of Spirometry (FEV1/FVC), Lung Volumes, DLCO, and Peak Expiratory Flow rate."),
        SpecialityConsultationStep("3", "Chest X-Ray & CT Review", "Detailed evaluation of Chest X-ray, High-Resolution CT (HRCT) Thorax, or Sleep Study (PSG) reports."),
        SpecialityConsultationStep("4", "Personalized Inhaler & Drug Protocol", "Prescription of appropriate inhalers (metered-dose / dry powder), proper spacer technique, and breathing exercises.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "Are asthma inhalers habit-forming or safe for long-term use?",
            answer = "Asthma inhalers deliver micro-doses directly to the lungs with minimal systemic absorption, making them much safer and more effective than oral steroid tablets. They are not habit-forming."
        ),
        SpecialityFaqItem(
            question = "What is the difference between Asthma and COPD?",
            answer = "Asthma is characterized by reversible airway narrowing, often triggered by allergies and starting in childhood or young adulthood. COPD (common in smokers) causes permanent, progressive airflow limitation that worsens gradually over time."
        ),
        SpecialityFaqItem(
            question = "How do I know if my loud snoring is Obstructive Sleep Apnea (OSA)?",
            answer = "If your snoring is accompanied by choking or gasping sounds during sleep, morning headaches, unrefreshed waking, and falling asleep during the day, you should undergo a sleep study (Polysomnography)."
        ),
        SpecialityFaqItem(
            question = "What reports should I keep handy for my pulmonologist?",
            answer = "Have your latest Chest X-ray or HRCT scan, Pulmonary Function Test (PFT/Spirometry) report, CBC with Absolute Eosinophil Count (AEC), and current inhaler names ready."
        )
    )
)
