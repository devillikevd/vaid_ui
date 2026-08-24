package com.example.swastik.data.specialities

val plasticSurgeonData = SpecialityDetailData(
    id = "plastic_surgeon",
    title = "Plastic & Reconstructive Surgeon",
    subtitle = "Cosmetic, Reconstructive, Scar Revision & Aesthetics Expert",
    heroDescription = "Consult board-certified plastic and reconstructive surgeons for cosmetic enhancements, scar revision, burn contracture release, gynecomastia, rhinoplasty, and reconstructive procedures.",
    trustBadges = listOf(
        "✨ Aesthetic & Reconstructive Surgery",
        "⚡ Board-Certified Plastic Surgeons",
        "🛡️ 100% Verified MCh / DNB Plastic Surgery"
    ),
    aboutDescription = "A Plastic and Reconstructive Surgeon specializes in restoring, reconstructing, and enhancing the form and function of body tissues damaged by trauma, birth defects, burns, diseases, or elective cosmetic aesthetic desires.",
    symptoms = listOf(
        SpecialitySymptom("🩹", "Prominent Scars & Keloids", "Raised, dark, thick, or tight scars following surgery, burns, or laceration accidents"),
        SpecialitySymptom("👃", "Nose Reshaping & Breathing (Rhinoplasty)", "Deviated nasal septum, crooked nose bridge, dorsal humps, or cosmetic tip refinement"),
        SpecialitySymptom("👔", "Male Chest Enlargement (Gynecomastia)", "Swelling of glandular breast tissue or excess fat in men causing self-consciousness"),
        SpecialitySymptom("✨", "Body Contouring & Excess Skin", "Loose skin after massive weight loss, post-pregnancy abdominal laxity (Tummy Tuck), or stubborn fat deposits"),
        SpecialitySymptom("🔥", "Post-Burn Contractures & Deformity", "Tight skin tightening joints, limited limb movement, or hypertrophic burn scars"),
        SpecialitySymptom("👄", "Facial Aging & Asymmetry", "Drooping eyelids (Blepharoplasty), sagging jowls, facial fat loss, or congenital cleft lip/palate")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "✨ Aesthetic & Body Contouring",
            items = listOf(
                "Liposuction (VASER / Microaire) & High-Definition Contouring",
                "Abdominoplasty (Tummy Tuck) & Post-Bariatric Body Lift",
                "Gynecomastia (Male Breast Reduction) Surgery",
                "Breast Augmentation, Reduction & Mastopexy (Lift)"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "👃 Facial Aesthetics & Rhinoplasty",
            items = listOf(
                "Functional & Cosmetic Rhinoplasty",
                "Blepharoplasty (Upper/Lower Eyelid Rejuvenation)",
                "Rhytidectomy (Face & Neck Lift)",
                "Facial Fat Grafting & Chin Augmentation"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🩹 Reconstructive & Trauma Surgery",
            items = listOf(
                "Microvascular Free Tissue Flap Surgery",
                "Cleft Lip & Cleft Palate Repair",
                "Post-Oncological Breast Reconstruction",
                "Hand Trauma & Tendon / Nerve Repair"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🔥 Burn & Scar Revision Care",
            items = listOf(
                "Keloid & Hypertrophic Scar Management",
                "Post-Burn Contracture Release & Skin Grafting",
                "Laser Scar Resurfacing Guidance",
                "Mole, Cyst & Skin Lesion Minimal Scar Excision"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Aesthetic Goals & Medical Intake", "Private discussion of your aesthetic goals, realistic expectations, lifestyle, and medical history."),
        SpecialityConsultationStep("2", "Anatomical & Proportion Evaluation", "Clinical analysis of skin elasticity, tissue volume, symmetry, and scar architecture."),
        SpecialityConsultationStep("3", "Surgical Technique & Technology Selection", "Detailed review of surgical approach, incision placement, scar minimization protocols, and anesthesia."),
        SpecialityConsultationStep("4", "Recovery & Aftercare Roadmap", "Guidance on compression garments, recovery timeline, swelling resolution, and follow-up reviews.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "What is the difference between cosmetic surgery and reconstructive surgery?",
            answer = "Cosmetic surgery is performed to enhance aesthetic appearance and body symmetry by choice. Reconstructive surgery is performed to restore normal function and appearance to body parts affected by congenital defects, trauma, burns, or cancer."
        ),
        SpecialityFaqItem(
            question = "Are scars completely invisible after plastic surgery?",
            answer = "While every incision creates a scar, plastic surgeons place incisions along natural skin creases and use delicate layered suturing techniques and silicone/laser scar therapies to make scars as faint and unnoticeable as possible."
        ),
        SpecialityFaqItem(
            question = "What is the recovery time for gynecomastia surgery or liposuction?",
            answer = "Most patients return to light desk work within 3-5 days. Wearing a medical compression garment for 3-4 weeks supports healing, and intense gym workouts can typically be resumed after 4 weeks."
        ),
        SpecialityFaqItem(
            question = "How can I prepare for a plastic surgery tele-consultation?",
            answer = "Have clear photographs of the area from front and side profiles ready, list any previous surgeries, allergies, or blood thinners, and write down your specific aesthetic goals."
        )
    )
)
