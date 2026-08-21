package com.example.swastik.data.specialities

val ophthalmologistData = SpecialityDetailData(
    id = "ophthalmologist",
    title = "Ophthalmologist",
    subtitle = "Eye Specialist, Vision Care & Ophthalmic Surgeon",
    heroDescription = "Consult eye specialists and surgeons for blurry vision, dry eyes, eye infections, cataract evaluation, glaucoma screening, and LASIK guidance.",
    trustBadges = listOf(
        "👁️ Vision & Eye Health",
        "⚡ Spectacle Power & Retina Care",
        "🛡️ 100% Verified MS / DNB Ophthalmology"
    ),
    aboutDescription = "An Ophthalmologist is a medical and surgical eye doctor specializing in comprehensive eye care, optical corrections, cataract surgery, retinal disease management, and corneal treatments.",
    symptoms = listOf(
        SpecialitySymptom("👓", "Blurry or Dim Vision", "Difficulty reading small print, hazy distance vision, or frequent changes in spectacle power"),
        SpecialitySymptom("🔴", "Red, Watery or Itchy Eyes", "Conjunctivitis, allergic irritation, foreign body sensation, or discharge"),
        SpecialitySymptom("💻", "Digital Eye Strain & Dry Eyes", "Burning, gritty sensation, eye fatigue after prolonged screen use, and headaches"),
        SpecialitySymptom("🌫️", "Cloudy Vision & Halos", "Seeing rings/halos around lights at night, faded colors, and glare (cataract signs)"),
        SpecialitySymptom("⚡", "Flashes of Light & Floaters", "Sudden spots, webs, or flashing streaks in field of vision (retinal alert)"),
        SpecialitySymptom("👁️", "Eye Pain & High Pressure", "Ache around the eye, throbbing pain with nausea, and peripheral vision loss (glaucoma)")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "👓 Refractive & Cornea Care",
            items = listOf(
                "Myopia (Nearsightedness) & Astigmatism",
                "Hyperopia & Presbyopia (Reading Vision)",
                "LASIK & PRK Laser Vision Correction",
                "Keratoconus & Corneal Ulcers"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🌫️ Cataract & Glaucoma Management",
            items = listOf(
                "Senile & Traumatic Cataract (MICS / Phaco)",
                "Open-Angle & Closed-Angle Glaucoma",
                "Intraocular Pressure (IOP) Monitoring",
                "Premium IOL Lens Selection (Toric/Multifocal)"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "💻 Dry Eye & Surface Diseases",
            items = listOf(
                "Computer Vision Syndrome (CVS)",
                "Chronic Dry Eye Disease & Blepharitis",
                "Allergic & Viral Conjunctivitis (Pink Eye)",
                "Stye & Chalazion Eyelid Lumps"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🛡️ Retina & Neuro-Ophthalmic Care",
            items = listOf(
                "Diabetic Retinopathy & Macular Edema",
                "Age-Related Macular Degeneration (AMD)",
                "Retinal Detachment Screening",
                "Optic Neuritis & Uveitis"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Vision & Symptom Assessment", "Review of blurry vision onset, screen time habits, light sensitivity, and eye pain history."),
        SpecialityConsultationStep("2", "Visual & Power Report Review", "Evaluation of current refractive power, visual acuity (6/6 score), and previous prescriptions."),
        SpecialityConsultationStep("3", "Medication & Eye Drop Protocol", "Prescription of lubricant tears, anti-allergic/antibiotic eye drops, and anti-inflammatory care."),
        SpecialityConsultationStep("4", "Surgery & Screen Hygiene Plan", "Guidance on cataract surgery timing, LASIK suitability, and 20-20-20 screen break rules.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "What is the 20-20-20 rule for digital screen strain?",
            answer = "Every 20 minutes spent looking at a screen, take a 20-second break and focus your eyes on an object at least 20 feet away to relax the eye's focusing muscles."
        ),
        SpecialityFaqItem(
            question = "When should cataract surgery be performed?",
            answer = "Cataract surgery should be considered when clouding of the eye lens interferes with your daily activities like reading, driving at night, or recognizing faces. Modern Phacoemulsification is quick, painless, and highly safe."
        ),
        SpecialityFaqItem(
            question = "Why is glaucoma called the silent thief of sight?",
            answer = "Glaucoma often develops gradually without pain or early symptoms while damaging the optic nerve through elevated eye pressure. Regular eye exams after age 40 are essential for early detection."
        ),
        SpecialityFaqItem(
            question = "Can eye drops for red eye be bought over the counter safely?",
            answer = "No, using steroid-containing eye drops without a doctor's prescription can increase intraocular pressure and cause corneal damage or glaucoma. Always consult an ophthalmologist first."
        )
    )
)
