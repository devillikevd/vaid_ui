package com.example.swastik.data.specialities

val homeopathyData = SpecialityDetailData(
    id = "homeopathy",
    title = "Homeopathy Specialist",
    subtitle = "Homeopathic Doctor, Constitutional & Gentle Medicine (BHMS / MD)",
    heroDescription = "Consult certified homeopathic physicians for gentle, non-toxic, and individualised treatments for allergic rhinitis, asthma, skin warts/eczema, migraines, child immunity, and chronic ailments.",
    trustBadges = listOf(
        "🌸 Gentle & Natural Care",
        "⚡ Individualized Constitutional Remedies",
        "🛡️ 100% Verified BHMS / MD Homeopathy"
    ),
    aboutDescription = "A Homeopathy Specialist is a qualified medical practitioner of homeopathic science — applying the principle of 'like cures like' (Similia Similibus Curentur) using ultra-diluted natural substances to stimulate the body's self-healing vital force without side effects.",
    symptoms = listOf(
        SpecialitySymptom("🤧", "Recurring Allergies & Sneezing", "Morning bouts of sneezing, continuous clear nasal discharge, itchy palate and eyes (Allergic Rhinitis)"),
        SpecialitySymptom("🌸", "Chronic Eczema & Psoriasis", "Dry, peeling, red or itchy skin patches, recurrent fungal eruptions, and hives"),
        SpecialitySymptom("🫁", "Childhood Asthma & Wheezing", "Recurrent bronchitis, nocturnal coughing spasms, and dust sensitivity in children"),
        SpecialitySymptom("⚡", "Migraines & Chronic Headaches", "Recurrent pulsating headaches triggered by sun, stress, or missed meals"),
        SpecialitySymptom("🩸", "Piles & Anal Fissures", "Burning pain after bowel movements, bleeding, and chronic constipation"),
        SpecialitySymptom("👧", "Tonsillitis & Adenoid Enlargement", "Frequent sore throats, enlarged neck lymph nodes, and mouth-breathing in children")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "🤧 Respiratory & Allergic Care",
            items = listOf(
                "Allergic Rhinitis & Sinusitis",
                "Bronchial Asthma & Cough in Kids",
                "Chronic Tonsillitis & Adenoid Hypertrophy",
                "Nasal Polyps & Dust Allergy"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🌸 Dermatology & Hair Wellness",
            items = listOf(
                "Atopic Dermatitis & Eczema",
                "Psoriasis & Lichen Planus",
                "Warts, Corns & Molluscum Contagiosum",
                "Alopecia Areata & Dandruff"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🫄 Gastrointestinal & Anorectal Relief",
            items = listOf(
                "Chronic Acidity & Gastritis",
                "Piles / Hemorrhoids & Anal Fissure",
                "Irritable Bowel Syndrome (IBS)",
                "Gallbladder & Kidney Stone Colic Relief"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🛡️ Women & Pediatric Immunity",
            items = listOf(
                "PCOD & Irregular Menstrual Flow",
                "Dysmenorrhea & Fibroid Symptoms",
                "Pediatric Immunity Boosting",
                "Anxiety, Panic & Sleep Disturbances"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Detailed Case Taking", "In-depth discussion covering emotional temperament, physical sensitivities, thermal preferences (chilly/warm), and disease history."),
        SpecialityConsultationStep("2", "Constitutional Evaluation", "Matching your totality of symptoms with precise homeopathic Materia Medica remedies."),
        SpecialityConsultationStep("3", "Remedy & Potency Prescription", "Selection of exact single or bio-chemic remedies with dosage and dilution instructions."),
        SpecialityConsultationStep("4", "Follow-up & Progress Review", "Monitoring gentle symptomatic relief and adjusting potency for long-term curative response.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "Are homeopathic medicines safe for infants, pregnant women, and the elderly?",
            answer = "Yes! Homeopathic remedies are highly diluted, non-toxic, non-drowsy, and safe across all age groups including newborns, pregnant mothers, and elderly patients."
        ),
        SpecialityFaqItem(
            question = "Do homeopathic treatments take a very long time to work?",
            answer = "Not necessarily. In acute conditions like sudden cough, cold, fever, or pain, the correct homeopathic remedy can provide relief within hours. For chronic diseases lasting years, steady progressive healing occurs over a few months."
        ),
        SpecialityFaqItem(
            question = "Should I avoid coffee, garlic, or onion while taking homeopathic pills?",
            answer = "It is generally advised to avoid strong flavors, coffee, or raw onions 15-30 minutes before and after taking homeopathic pills to ensure optimal sublingual absorption."
        ),
        SpecialityFaqItem(
            question = "Can homeopathy prevent surgical removal of enlarged tonsils or adenoids in kids?",
            answer = "In many mild to moderate cases, constitutional homeopathic treatment reduces recurrent tonsillar inflammation and adenoid swelling, helping avoid surgery when evaluated early."
        )
    )
)
