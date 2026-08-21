package com.example.swastik.data.specialities

val dermatologistData = SpecialityDetailData(
    id = "dermatologist",
    title = "Dermatologist",
    subtitle = "Skin, Hair, Scalp & Nail Specialist",
    heroDescription = "Certified medical specialists dedicated to diagnosing and treating acne, hair fall, fungal infections, skin allergies, and advanced aesthetic dermatology.",
    trustBadges = listOf(
        "🩺 Skin & Hair Care",
        "⚡ In-Clinic & HD Photo/Video Consults",
        "🛡️ 100% Verified MD / DVD"
    ),
    aboutDescription = "A Dermatologist is a licensed medical doctor specialized in diagnosing, managing, and treating medical and aesthetic conditions affecting the skin, hair, scalp, and nails. Whether dealing with stubborn cystic acne, severe hair fall, eczema flare-ups, fungal infections, or hyperpigmentation, dermatologists provide customized clinical treatments, medical-grade prescriptions, and scientifically proven skincare and haircare regimens.",
    symptoms = listOf(
        SpecialitySymptom(
            emoji = "🔴",
            title = "Acne & Pimples",
            subtitle = "Cystic acne, blackheads, hormonal breakouts & post-acne scars"
        ),
        SpecialitySymptom(
            emoji = "💇",
            title = "Hair Fall & Thinning",
            subtitle = "Excessive hair shedding, receding hairline, dandruff & alopecia"
        ),
        SpecialitySymptom(
            emoji = "🧴",
            title = "Itching & Rashes",
            subtitle = "Eczema, contact dermatitis, hives & persistent skin redness"
        ),
        SpecialitySymptom(
            emoji = "🍄",
            title = "Fungal & Ringworm",
            subtitle = "Athlete's foot, jock itch, tinea infections & nail fungus"
        ),
        SpecialitySymptom(
            emoji = "☀️",
            title = "Dark Spots & Melasma",
            subtitle = "Hyperpigmentation, sun damage, uneven tone & dark circles"
        ),
        SpecialitySymptom(
            emoji = "🛡️",
            title = "Warts, Moles & Tags",
            subtitle = "Skin tags, changing moles, corns & viral wart evaluation"
        )
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "🧴 Acne & Complexion Disorders",
            items = listOf(
                "Acne Vulgaris & Cystic Breakouts",
                "Post-Inflammatory Hyperpigmentation",
                "Rosacea & Facial Flushing",
                "Eczema & Atopic Dermatitis"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "💇 Hair, Scalp & Follicle Care",
            items = listOf(
                "Androgenetic Alopecia (Pattern Baldness)",
                "Telogen Effluvium (Stress/Post-Covid Hair Loss)",
                "Alopecia Areata (Patchy Hair Loss)",
                "Severe Dandruff & Seborrheic Dermatitis"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🍄 Fungal & Bacterial Skin Infections",
            items = listOf(
                "Ringworm (Tinea Corporis & Cruris)",
                "Fungal Nail Infection (Onychomycosis)",
                "Bacterial Folliculitis & Skin Boils",
                "Urticaria (Allergic Hives) & Psoriasis"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "✨ Pigmentation & Anti-Aging",
            items = listOf(
                "Melasma & Hormonal Pigmentation",
                "Vitiligo & Hypopigmentation",
                "Sun Damage, Freckles & Age Spots",
                "Skin Barrier Repair & Anti-Aging Care"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep(
            stepNumber = "1",
            title = "Skin & Scalp Visual Examination",
            description = "Doctor reviews high-definition photos or in-clinic dermoscopy of your affected skin, hair, or nail areas."
        ),
        SpecialityConsultationStep(
            stepNumber = "2",
            title = "Triggers & Routine Analysis",
            description = "Assessment of current skincare products, diet, stress levels, hormonal history (PCOS/Thyroid), and allergies."
        ),
        SpecialityConsultationStep(
            stepNumber = "3",
            title = "Root-Cause Diagnosis",
            description = "Identification of exact condition (bacterial vs fungal, hormonal vs nutritional) and targeted blood panel advice if needed."
        ),
        SpecialityConsultationStep(
            stepNumber = "4",
            title = "Personalized Skincare / Hair Regimen",
            description = "Receive custom medicated topical creams, active serums, oral prescriptions, and a daily AM/PM barrier routine."
        )
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "Can a Dermatologist diagnose skin and hair issues on video calls accurately?",
            answer = "Yes! High-resolution photos taken in good natural lighting combined with live video evaluation allow dermatologists to accurately diagnose up to 85% of common dermatological issues including acne, eczema, hair loss, and fungal infections."
        ),
        SpecialityFaqItem(
            question = "How long does it take to see visible improvement in acne and hair fall?",
            answer = "Skin cell renewal takes 4 to 6 weeks, so noticeable acne improvement is typically observed in 4-8 weeks. Hair growth cycles are slower; shedding usually reduces in 6-8 weeks, with visible density improvement in 3-6 months."
        ),
        SpecialityFaqItem(
            question = "Should I stop using my current skincare products before my appointment?",
            answer = "Keep photos or a list of all products you currently apply (cleansers, moisturizers, serums, home remedies). Your dermatologist will review them and advise which ones to continue, swap, or eliminate."
        ),
        SpecialityFaqItem(
            question = "What is the difference between a Dermatologist and a Cosmetologist / Aesthetician?",
            answer = "A Dermatologist is a licensed medical doctor (MBBS + MD/Diploma in Dermatology) authorized to diagnose underlying medical diseases and prescribe prescription-strength drugs. A Cosmetologist or Aesthetician focuses on salon beauty procedures without clinical medical prescribing authority."
        )
    )
)
