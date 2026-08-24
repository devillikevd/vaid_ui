package com.example.swastik.data.specialities

val ayurvedaData = SpecialityDetailData(
    id = "ayurveda",
    title = "Ayurveda Specialist",
    subtitle = "Ayurvedic Doctor, Holistic Healing & Dosha Balance (BAMS / MD)",
    heroDescription = "Experience timeless holistic healing with certified Ayurvedic doctors for chronic digestive disorders, joint arthritis, skin allergies, stress, immunity, and Panchakarma guidance.",
    trustBadges = listOf(
        "🌿 Traditional & Holistic Healing",
        "⚡ Prakriti & Dosha Assessment",
        "🛡️ 100% Verified BAMS / MD Ayurveda"
    ),
    aboutDescription = "An Ayurvedic Specialist (Vaidya / BAMS Doctor) practices the ancient, natural science of Ayurveda — focusing on identifying root imbalances across the three primary bio-energies (Vata, Pitta, and Kapha) and restoring harmony through herbal formulations, dietary regimens (Ahara), lifestyle practices (Vihara), and detox therapies.",
    symptoms = listOf(
        SpecialitySymptom("🔥", "Digestive Imbalance & Agni Mandya", "Chronic constipation, bloating, hyperacidity, sluggish metabolism, and toxic build-up (Ama)"),
        SpecialitySymptom("🦴", "Joint Pain & Sandhivata", "Stiff joints, rheumatoid swelling (Amavata), neck stiffness (Greeva Sandhi), and backache"),
        SpecialitySymptom("🌿", "Chronic Skin Allergies & Twak Roga", "Eczema, psoriasis, dry itchy patches, urticaria (Sheetapitta), and acne"),
        SpecialitySymptom("🧠", "Stress, Anxiety & Manasika Roga", "Restlessness, sleep deprivation (Anidra), mental exhaustion, and memory fatigue"),
        SpecialitySymptom("🌸", "Hormonal & Stree Roga Issues", "Irregular menstrual cycles, PCOD/PCOS, painful periods (Kashtartava), and menopausal heat"),
        SpecialitySymptom("🛡️", "Low Immunity & Frequent Illness", "Recurring colds, coughs, sinusitis (Pratishyaya), and general weakness (Daurbalya)")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "🌿 Gastrointestinal & Detox Care",
            items = listOf(
                "IBS (Grahani) & Acid Peptic Disorders",
                "Constipation & Liver Cleansing Formulations",
                "Ama Detoxification Protocols",
                "Panchakarma Consultation (Vamana, Virechana, Basti)"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🦴 Musculoskeletal & Vata Disorders",
            items = listOf(
                "Osteoarthritis (Sandhivata) & Gout (Vatarakta)",
                "Sciatica (Gridhrasi) & Spondylosis Care",
                "Ayurvedic Herbal Oil Massages (Abhyanga Guidance)",
                "Inflammatory Arthritis (Amavata Management)"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🌸 Skin, Hair & Women's Health",
            items = listOf(
                "Psoriasis, Eczema & Urticaria Treatment",
                "Hair Fall (Khalitya) & Dandruff (Darunak)",
                "PCOD / PCOS & Ovarian Cyst Management",
                "Postnatal Care (Sootika Paricharya)"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🛡️ Rasayana & Immunity Rejuvenation",
            items = listOf(
                "Rasayana Herbs for Longevity & Vitality",
                "Herbal Memory Tonics (Medhya Rasayana)",
                "Respiratory Immunity (Chyawanprash & Sitopaladi)",
                "Stress Modulation with Ashwagandha & Brahmi"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Prakriti & Symptom Analysis", "Comprehensive assessment of your constitutional body type (Vata, Pitta, Kapha), sleep, digestion, and daily routine."),
        SpecialityConsultationStep("2", "Root Cause & Ama Assessment", "Determining the origin of metabolic toxins, gut fire status (Agni), and tissue balance (Dhatus)."),
        SpecialityConsultationStep("3", "Classical Herbal Formulation", "Prescription of standardized Ayurvedic medicines (Kwaths, Churnas, Asavas, and Vatis)."),
        SpecialityConsultationStep("4", "Ahara-Vihara (Diet & Lifestyle) Plan", "Customized seasonal diet (Ritucharya), daily habits (Dinacharya), and home remedies for sustained health.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "Are Ayurvedic medicines completely safe and chemical-free?",
            answer = "When prescribed by a qualified, verified BAMS/MD doctor and sourced from certified GMP pharmaceutical manufacturers, Ayurvedic medicines are natural, safe, and free from synthetic chemicals."
        ),
        SpecialityFaqItem(
            question = "Can I take Ayurvedic remedies alongside my regular allopathic medicines?",
            answer = "In most cases, yes! You should maintain a 1-to-2-hour time gap between allopathic and Ayurvedic medications. Always inform both doctors about your ongoing prescriptions."
        ),
        SpecialityFaqItem(
            question = "How quickly do Ayurvedic treatments show results?",
            answer = "Acute symptoms like simple indigestion or throat irritation can improve within 24-48 hours. Chronic conditions like arthritis, skin ailments, or autoimmune issues typically show progressive benefits over 4 to 12 weeks of root-cause healing."
        ),
        SpecialityFaqItem(
            question = "What is Panchakarma and do I need it?",
            answer = "Panchakarma is a five-fold Ayurvedic cleansing and detoxification therapy. Your doctor will evaluate whether your body has accumulated toxins (Ama) requiring in-clinic detox or if simple home formulations suffice."
        )
    )
)
