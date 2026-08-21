package com.example.swastik.data.specialities

val cosmeticDermatologistData = SpecialityDetailData(
    id = "cosmetic_dermatologist",
    title = "Cosmetic Dermatologist",
    subtitle = "Aesthetic Dermatology, Anti-Aging, Laser & Skin Rejuvenation",
    heroDescription = "Consult expert aesthetic dermatologists for anti-aging treatments (Botox, Fillers), acne scar resurfacing, laser skin brightening, chemical peels, and glowing glass skin therapies.",
    trustBadges = listOf(
        "✨ Aesthetic & Laser Dermatology",
        "⚡ US-FDA Approved Treatments",
        "🛡️ 100% Verified MD / DNB Dermatology"
    ),
    aboutDescription = "A Cosmetic Dermatologist is a medical skin specialist dedicated to non-surgical aesthetic enhancements, anti-aging rejuvenation, laser therapeutics, and medical-grade skincare procedures designed to enhance skin texture, tone, and youthfulness.",
    symptoms = listOf(
        SpecialitySymptom("🕳️", "Acne Scars & Open Pores", "Pitted ice-pick, boxcar, or rolling scars from past acne, large dilated facial pores"),
        SpecialitySymptom("👵", "Fine Lines, Crow's Feet & Wrinkles", "Dynamic expression lines around eyes, forehead furrows, laugh lines (nasolabial folds)"),
        SpecialitySymptom("🤎", "Stubborn Pigmentation & Melasma", "Dark patches on cheeks, forehead, post-inflammatory hyperpigmentation (PIH), sun spots"),
        SpecialitySymptom("✨", "Dull, Uneven Skin & Tan", "Lack of skin glow, uneven texture, roughness, and photodamage"),
        SpecialitySymptom("💉", "Facial Volume Loss & Under-Eye Hollows", "Dark circles with sunken tear troughs, hollow cheeks, and sagging skin"),
        SpecialitySymptom("🏷️", "Skin Tags, Warts & DPNs", "Small brown/black fleshy growths on face, neck, and eyelids requiring RF removal")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "💉 Injectable Aesthetics & Anti-Aging",
            items = listOf(
                "Botulinum Toxin (Botox / Dysport) for Wrinkles",
                "Hyaluronic Acid Dermal Fillers (Lips, Cheeks, Under-Eyes)",
                "Skin Boosters (Profhilo / Juvederm Volite)",
                "Thread Lifts for Non-Surgical Face Tightening"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🔬 Laser & Energy-Based Devices (EBD)",
            items = listOf(
                "CO2 Fractional Laser for Deep Acne Scars",
                "Q-Switched Nd:YAG Laser for Pigmentation & Melasma",
                "Laser Hair Reduction (Triple Wavelength Diode)",
                "HIFU & Microneedling RF (MNRF) for Tightening"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🧪 Medical Chemical Peels & Glow",
            items = listOf(
                "Glycolic, Salicylic & Mandelic Peels",
                "TCA Cross for Ice-Pick Acne Scars",
                "Yellow & Retinol Peels for Melasma",
                "HydraFacial & Carbon Laser Peel"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🛡️ Clinical Skincare Formulations",
            items = listOf(
                "Prescription Retinoids (Tretinoin, Adapalene)",
                "Medical-Grade Vitamin C & Niacinamide Serums",
                "Broad-Spectrum Mineral & Chemical Sunscreens",
                "Barrier Repair & Ceramide Regimens"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Skin Type & Aesthetic Goals", "Analysis of skin Fitzpatrick phototype, oiliness/dryness, lifestyle habits, and key concerns."),
        SpecialityConsultationStep("2", "Facial Vector & Scar Assessment", "Evaluating dynamic vs static wrinkles, scar depths, pigmentation depth (epidermal vs dermal), and volume distribution."),
        SpecialityConsultationStep("3", "In-Clinic vs At-Home Regimen Selection", "Recommending the safest combination of in-clinic procedures and daily active skincare."),
        SpecialityConsultationStep("4", "Sun Protection & Maintenance Plan", "Personalized skincare routine with active ingredients, application order, and seasonal adaptations.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "Will Botox make my face look frozen or unnatural?",
            answer = "No! When administered by an experienced cosmetic dermatologist, Botox micro-doses specifically relax targeted muscles to soften wrinkles while preserving natural expressions and emotions."
        ),
        SpecialityFaqItem(
            question = "Can deep acne scars be completely removed?",
            answer = "Acne scars can be improved by 70% to 85% through combination treatments such as Subcision, MNRF (Microneedling RF), and Fractional CO2 laser to stimulate collagen regeneration."
        ),
        SpecialityFaqItem(
            question = "How long do dermal fillers and skin boosters last?",
            answer = "Hyaluronic acid fillers typically last between 9 to 18 months depending on the area treated, product density, and your individual metabolism."
        ),
        SpecialityFaqItem(
            question = "What should I have ready for my cosmetic dermatology consultation?",
            answer = "Have high-resolution photos of your face in natural daylight without makeup or filters, and make a list of your current skincare products (cleanser, serum, sunscreen, moisturizer)."
        )
    )
)
