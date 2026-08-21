package com.example.swastik.data.specialities

val entSpecialistData = SpecialityDetailData(
    id = "ent_specialist",
    title = "ENT Specialist",
    subtitle = "Ear, Nose, Throat & Sinus Specialist (Otolaryngologist)",
    heroDescription = "Expert medical specialists diagnosing and treating ear infections, hearing loss, sinus congestion, allergies, tonsillitis, and voice disorders.",
    trustBadges = listOf(
        "👂 Ear, Nose & Throat",
        "⚡ In-Clinic Endoscopy & Video Consults",
        "🛡️ 100% Verified MS / DLO ENT"
    ),
    aboutDescription = "An ENT Specialist (Otolaryngologist) is a trained medical doctor and surgeon specializing in the diagnosis and surgical treatment of diseases affecting the ears, nose, nasal passages, sinuses, larynx (voice box), throat, and structures of the neck and face.",
    symptoms = listOf(
        SpecialitySymptom("👂", "Ear Pain & Discharge", "Sharp earache, fluid drainage, ear wax blockage, and swimmer's ear"),
        SpecialitySymptom("🔊", "Hearing Loss & Tinnitus", "Muffled hearing, ringing or buzzing sounds in ear, and vertigo/balance issues"),
        SpecialitySymptom("👃", "Sinus & Nasal Blockage", "Chronic nasal congestion, facial pressure, sinus headache, and loss of smell"),
        SpecialitySymptom("🗣️", "Sore Throat & Tonsillitis", "Difficulty swallowing, swollen tonsils, white patches, and persistent throat irritation"),
        SpecialitySymptom("🎙️", "Hoarseness & Voice Changes", "Raspy voice, vocal cord strain, voice loss, and chronic coughing"),
        SpecialitySymptom("😴", "Snoring & Sleep Apnea", "Heavy nighttime snoring, mouth breathing, and obstructed sleep patterns")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "👂 Ear & Hearing Disorders",
            items = listOf(
                "Otitis Media & Externa (Ear Infections)",
                "Tympanic Membrane Perforation (Eardrum Tear)",
                "Tinnitus & Meniere's Disease (Vertigo)",
                "Impacted Cerumen (Ear Wax Removal)"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "👃 Nose & Sinus Conditions",
            items = listOf(
                "Chronic Sinusitis & Nasal Polyps",
                "Deviated Nasal Septum (DNS)",
                "Allergic Rhinitis & Hay Fever",
                "Epistaxis (Nose Bleeding)"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🗣️ Throat, Voice & Swallowing",
            items = listOf(
                "Acute Tonsillitis & Adenoid Hypertrophy",
                "Pharyngitis & Laryngitis",
                "Vocal Cord Nodules & Polyps",
                "Dysphagia (Difficulty Swallowing)"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "😴 Sleep & Head-Neck Care",
            items = listOf(
                "Obstructive Sleep Apnea (OSA)",
                "Thyroid Nodules & Neck Swellings",
                "Salivary Gland Infections & Stones",
                "Temporomandibular Joint (TMJ) Pain"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Symptom & Duration History", "Review of ear discharge, sinus headache triggers, allergy history, and voice changes."),
        SpecialityConsultationStep("2", "Visual & Otoscopic Review", "In-clinic otoscopy/endoscopy or high-res photo/video inspection of throat and ears."),
        SpecialityConsultationStep("3", "Audiometry & CT Scan Guidance", "Recommendations for Pure Tone Audiometry (hearing test) or Sinus CT scan if required."),
        SpecialityConsultationStep("4", "Targeted Medical Prescription", "Medicated antibiotic/steroid ear drops, nasal sprays, steam regimens, and allergy management.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "Can chronic sinusitis be cured without surgery?",
            answer = "Yes. Most sinus cases respond very well to medicated nasal steroid sprays, saline rinses, steam inhalation, and targeted antibiotics. Functional Endoscopic Sinus Surgery (FESS) is only needed for structural blockages or polyps."
        ),
        SpecialityFaqItem(
            question = "Is using cotton buds safe for cleaning ear wax?",
            answer = "No. Cotton buds often push ear wax deeper against the eardrum, increasing the risk of impaction or eardrum rupture. An ENT specialist uses safe softening drops or painless microsuction to clear wax."
        ),
        SpecialityFaqItem(
            question = "Why does an ear infection cause dizziness or balance loss?",
            answer = "The inner ear contains the vestibular balance apparatus. When inflammation or fluid accumulates in the ear, it disrupts balance signals to the brain, causing vertigo and lightheadedness."
        ),
        SpecialityFaqItem(
            question = "When should tonsils be surgically removed?",
            answer = "Tonsillectomy is recommended when a patient suffers from recurrent severe tonsillitis (more than 5-7 episodes per year), peritonsillar abscess, or when enlarged tonsils cause obstructive sleep apnea."
        )
    )
)
