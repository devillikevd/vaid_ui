package com.example.swastik.data.specialities

val vascularSurgeonData = SpecialityDetailData(
    id = "vascular_surgeon",
    title = "Vascular & Endovascular Surgeon",
    subtitle = "Varicose Veins, DVT, Diabetic Foot & Arterial Bypass Specialist",
    heroDescription = "Consult expert vascular and endovascular surgeons for laser varicose veins treatment (EVLT), Deep Vein Thrombosis (DVT), diabetic foot salvage, AV fistula creation, and peripheral arterial disease.",
    trustBadges = listOf(
        "🩸 Advanced Vascular Surgery",
        "⚡ Endovenous Laser & Doppler Review",
        "🛡️ 100% Verified MCh / DNB Vascular Surgery"
    ),
    aboutDescription = "A Vascular and Endovascular Surgeon is a super-specialist who diagnoses and treats conditions of the vascular circulatory system — including veins, arteries, and lymphatic vessels outside the heart and brain.",
    symptoms = listOf(
        SpecialitySymptom("🩻", "Twisted, Bulging Varicose Veins", "Enlarged, bluish-purple rope-like veins on calves and thighs causing heaviness and leg ache"),
        SpecialitySymptom("🦵", "Sudden One-Sided Leg Swelling", "Painful calf swelling, warmth, and redness indicating possible Deep Vein Thrombosis (DVT)"),
        SpecialitySymptom("🚶", "Calf Pain While Walking (Claudication)", "Cramping pain in calves or buttocks that starts after walking a fixed distance and stops when resting"),
        SpecialitySymptom("🩹", "Non-Healing Venous / Diabetic Ulcers", "Dark brown discoloration around ankles, open weeping sores, or numb diabetic foot wounds"),
        SpecialitySymptom("❄️", "Cold Feet & Weak Foot Pulses", "Pale or bluish toes, cold feet even in warm weather, and loss of foot hair"),
        SpecialitySymptom("🩺", "Dialysis Access & AV Fistula Issues", "Need for Arteriovenous (AV) Fistula creation, aneurysm swelling, or failing fistula thrill")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "🩻 Venous Disorders & Varicose Veins",
            items = listOf(
                "Endovenous Laser Ablation (EVLA / EVLT)",
                "Radiofrequency Ablation (RFA) & Foam Sclerotherapy",
                "Chronic Venous Insufficiency (CVI) & Stasis Dermatitis",
                "Deep Vein Thrombosis (DVT) & Anticoagulation"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🚶 Arterial & Peripheral Vascular Disease",
            items = listOf(
                "Peripheral Artery Disease (PAD / Arteriosclerosis)",
                "Aortic Aneurysm (AAA) Endovascular Repair (EVAR)",
                "Carotid Artery Stenosis & Stroke Prevention",
                "Critical Limb Ischemia (CLI) & Bypass Surgeries"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🩹 Diabetic Foot & Limb Salvage",
            items = listOf(
                "Diabetic Peripheral Angiopathy & Revascularization",
                "Diabetic Foot Ulcer Debridement & Negative Pressure Therapy",
                "Angioplasty & Stenting for Leg Artery Blockages",
                "Gangrene Prevention & Limb Preservation"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🛡️ Dialysis Vascular Access & Lymphatics",
            items = listOf(
                "Radio-Cephalic & Brachio-Cephalic AV Fistula Creation",
                "Fistuloplasty for Stenosed / Failing AV Fistulas",
                "Lymphedema & Elephantiasis Medical Management",
                "Vascular Malformations & Hemangiomas"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Vascular History & Walking Tolerance", "Evaluation of leg swelling duration, walking distance before cramping, skin discoloration, and diabetes history."),
        SpecialityConsultationStep("2", "Venous / Arterial Doppler Analysis", "Detailed review of Color Doppler Ultrasound of lower limbs (reflux duration, venous diameter, DVT clot presence, or arterial PSV)."),
        SpecialityConsultationStep("3", "Minimally Invasive Treatment Plan", "Selecting the most effective day-care procedure (Laser ablation, glue closure, angioplasty, or compression therapy)."),
        SpecialityConsultationStep("4", "Circulation & Compression Roadmap", "Prescription of graduated compression stockings (Class 2), circulation stimulants, and wound healing protocols.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "Is laser treatment for varicose veins painful, and does it require hospital stay?",
            answer = "Endovenous Laser Treatment (EVLT) is a minimally invasive, virtually painless procedure performed under local anesthesia through a tiny needle prick. It takes about 45 minutes, requires no stitches, and you can walk home the same day."
        ),
        SpecialityFaqItem(
            question = "Why is calf swelling and DVT considered an emergency?",
            answer = "A blood clot in the deep veins of the leg (DVT) can break off and travel to the lungs, causing a life-threatening pulmonary embolism. Sudden painful leg swelling requires an urgent Doppler scan and blood thinners."
        ),
        SpecialityFaqItem(
            question = "Can diabetic foot ulcers be healed without amputation?",
            answer = "Yes! Modern endovascular techniques (balloon angioplasty to restore blood flow) combined with advanced wound debridement allow vascular surgeons to save over 90% of limbs from amputation."
        ),
        SpecialityFaqItem(
            question = "What investigations should I have ready for a vascular consultation?",
            answer = "Have your Lower Limb Arterial or Venous Color Doppler report, Blood sugar/HbA1c levels, and clear photos of any leg veins or ulcers ready."
        )
    )
)
