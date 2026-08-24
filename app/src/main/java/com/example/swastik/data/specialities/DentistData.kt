package com.example.swastik.data.specialities

val dentistData = SpecialityDetailData(
    id = "dentist",
    title = "Dentist",
    subtitle = "Oral Health, Teeth, Gums & Smile Specialist",
    heroDescription = "Consult dental surgeons and orthodontists for toothache relief, cavities, bleeding gums, root canal advice, teeth alignment (braces/aligners), and smile makeovers.",
    trustBadges = listOf(
        "🦷 Dental & Oral Health",
        "⚡ X-Ray & OPG Scan Review",
        "🛡️ 100% Verified BDS / MDS Dental Surgeons"
    ),
    aboutDescription = "A Dentist (Dental Surgeon) is an oral healthcare professional specializing in the prevention, diagnosis, and treatment of conditions affecting the teeth, gums, jaw joints, oral mucosa, and overall oral hygiene.",
    symptoms = listOf(
        SpecialitySymptom("⚡", "Severe Toothache & Throbbing", "Sharp, continuous, or pulsating pain triggered by hot or cold food and drinks"),
        SpecialitySymptom("🩸", "Bleeding & Swollen Gums", "Redness, tenderness, bleeding during brushing/flossing, or bad breath (halitosis)"),
        SpecialitySymptom("🕳️", "Cavities & Visible Decay", "Dark spots, holes, enamel erosion, food lodgement, or chipped teeth"),
        SpecialitySymptom("😬", "Crooked or Crowded Teeth", "Misaligned bite, spacing, gaps, or jaw clicking and discomfort (TMJ)"),
        SpecialitySymptom("🦷", "Impacted Wisdom Tooth Pain", "Swelling and soreness at the back of the jaw, difficulty opening mouth"),
        SpecialitySymptom("✨", "Yellowing & Tooth Stains", "Enamel discoloration, coffee/tea stains, or tartar buildup requiring cleaning")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "🦷 Endodontics & Tooth Decay",
            items = listOf(
                "Dental Caries & Deep Cavities",
                "Root Canal Treatment (RCT) Guidance",
                "Dental Pulpitis & Abscess",
                "Tooth Sensitivity & Enamel Erosion"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🩸 Periodontics & Gum Disease",
            items = listOf(
                "Gingivitis & Periodontitis",
                "Gum Bleeding & Recession",
                "Calculus & Tartar Removal (Scaling)",
                "Chronic Halitosis (Bad Breath)"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "😬 Orthodontics & Smile Design",
            items = listOf(
                "Invisible Clear Aligners & Metal Braces",
                "Overbite, Underbite & Malocclusion",
                "Teeth Whitening & Bleaching",
                "Porcelain Veneers & Dental Crowns"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🛡️ Oral Surgery & Prosthodontics",
            items = listOf(
                "Wisdom Tooth Extraction & Impaction",
                "Dental Implants & Fixed Bridges",
                "Dentures (Complete & Partial)",
                "TMJ Disorder & Teeth Grinding (Bruxism)"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Oral Symptom & Pain Intake", "Discussion of tooth pain location, sensitivity triggers, duration, and chewing difficulties."),
        SpecialityConsultationStep("2", "Dental Photo & X-Ray Review", "Evaluation of dental X-rays (IOPA, OPG), photographs, and clinical visual indicators."),
        SpecialityConsultationStep("3", "Emergency Pain Management", "Prescription of dental-grade analgesics, targeted antibiotics, and antiseptic mouth rinses."),
        SpecialityConsultationStep("4", "Treatment & Procedure Plan", "Detailed advice on whether you need fillings, RCT, aligners, extraction, or deep cleaning.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "When does a tooth require a Root Canal Treatment (RCT)?",
            answer = "An RCT is necessary when deep tooth decay or trauma reaches the innermost soft tissue (pulp), causing persistent throbbing pain, sensitivity to hot food, or an abscess at the root tip."
        ),
        SpecialityFaqItem(
            question = "How often should I get professional dental cleaning (scaling)?",
            answer = "Dentists recommend a professional dental scaling and polish once every 6 months to remove hardened plaque (calculus/tartar) and keep gums healthy."
        ),
        SpecialityFaqItem(
            question = "Are clear aligners as effective as traditional metal braces?",
            answer = "Yes! Modern clear aligners are virtually invisible, removable, and highly effective for correcting crowded teeth, spacing, and moderate bite issues in teens and adults."
        ),
        SpecialityFaqItem(
            question = "What should I do in case of sudden severe nighttime toothache?",
            answer = "Rinse your mouth with warm salt water, take an over-the-counter pain reliever like Paracetamol/Ibuprofen (if not contraindicated), avoid chewing on that side, and consult a dentist online immediately."
        )
    )
)
