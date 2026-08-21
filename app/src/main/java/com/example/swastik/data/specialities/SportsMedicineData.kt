package com.example.swastik.data.specialities

val sportsMedicineData = SpecialityDetailData(
    id = "sports_medicine",
    title = "Sports Medicine Specialist",
    subtitle = "Athletic Injuries, Arthroscopy, Performance & Return-to-Play",
    heroDescription = "Consult expert sports medicine physicians and arthroscopy surgeons for ACL/ligament tears, meniscus injuries, rotator cuff strains, runner's knee, and fast return-to-sport rehabilitation.",
    trustBadges = listOf(
        "🏃 Elite Athletic Care",
        "⚡ Arthroscopy & Biologics (PRP)",
        "🛡️ 100% Certified Sports Medicine Physicians"
    ),
    aboutDescription = "A Sports Medicine Specialist is a physician dedicated to the prevention, acute diagnosis, non-surgical / surgical treatment, and athletic rehabilitation of injuries sustained during sports, fitness training, and high-performance physical activities.",
    symptoms = listOf(
        SpecialitySymptom("💥", "Sudden Knee Pop & Giving Way", "Audible 'pop' sound during a sudden twist or jump, rapid joint swelling, and instability (ACL / Meniscus Tear)"),
        SpecialitySymptom("🦾", "Shoulder Dislocation & Labral Tear", "Shoulder slipping out of joint during overhead throw, weakness, or catching pain (Bankart / SLAP Tear)"),
        SpecialitySymptom("🎾", "Elbow Tendon Pain (Tennis / Golfer's)", "Sharp pain on outer or inner elbow aggravated by gripping, racket sports, or typing"),
        SpecialitySymptom("🏃", "Shin Splints & Stress Fractures", "Aching along the shinbone during running, persistent pinpoint bone tenderness"),
        SpecialitySymptom("🦶", "Ankle Inversion Sprain & Swelling", "Twisted ankle during sports, bruising, difficulty bearing weight on the foot"),
        SpecialitySymptom("⚡", "Hamstring & Groin Muscle Pull", "Sudden sharp tearing sensation in thigh during sprinting or kicking a ball")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "🏃 Knee Ligament & Meniscus Injuries",
            items = listOf(
                "ACL, PCL & Collateral (MCL/LCL) Ligament Tears",
                "Meniscus Tears (Bucket Handle & Radial Tears)",
                "Patellofemoral Pain Syndrome (Runner's Knee)",
                "Arthroscopic Knee Reconstruction & Repair"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🦾 Shoulder & Upper Limb Sports Injuries",
            items = listOf(
                "Rotator Cuff Tendinopathy & Tears",
                "Shoulder Instability & Bankart Repair",
                "SLAP Tears & Biceps Tendonitis",
                "Tennis Elbow (Lateral Epicondylitis) & Golfer's Elbow"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🔬 Regenerative Biologics & Non-Surgical Care",
            items = listOf(
                "Ultrasound-Guided PRP Injections for Tendons",
                "Hyaluronic Acid Viscosupplementation",
                "Shockwave Therapy (ESWT) for Plantar Fasciitis",
                "Targeted Anti-Inflammatory Modalities"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🛡️ Return-to-Play & Athletic Conditioning",
            items = listOf(
                "Biomechanical Gait & Running Analysis",
                "Graduated Return-to-Sport (RTP) Protocol",
                "Concussion Assessment & Management",
                "ACL Injury Prevention Neuromuscular Training"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Sport & Mechanism of Injury", "Review of exact movement during injury (twisting, contact, deceleration), immediate swelling, and athletic goals."),
        SpecialityConsultationStep("2", "High-Resolution MRI Review", "Detailed evaluation of Knee/Shoulder/Ankle MRI scans for ligament grade (I, II, III), cartilage damage, or bone contusion."),
        SpecialityConsultationStep("3", "Surgical vs Non-Surgical Decision", "Determining if aggressive sports physical therapy & PRP or arthroscopic keyhole repair is best for your sport."),
        SpecialityConsultationStep("4", "Structured Return-to-Play Roadmap", "Step-by-step phased protocol: Phase 1 (Swelling/ROM), Phase 2 (Strength), Phase 3 (Agility), Phase 4 (Full Sport).")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "Does every ACL tear require surgical reconstruction?",
            answer = "Not always. Partial tears (Grade 1/2) or low-demand individuals with good knee stability may do well with dedicated neuromuscular rehabilitation. High-demand athletes involved in cutting/pivoting sports (football, basketball, cricket) usually benefit from arthroscopic reconstruction to protect the meniscus."
        ),
        SpecialityFaqItem(
            question = "What is Platelet-Rich Plasma (PRP) therapy in sports injuries?",
            answer = "PRP is an advanced regenerative therapy where a small sample of your own blood is concentrated to extract growth factors and injected under ultrasound guidance into injured tendons or ligaments to accelerate natural healing."
        ),
        SpecialityFaqItem(
            question = "When is it safe to return to competitive sports after a ligament injury?",
            answer = "Return to sport is based on objective functional criteria (at least 90% strength symmetry compared to the healthy limb, passing agility and single-leg hop tests) rather than just time."
        ),
        SpecialityFaqItem(
            question = "What should I have ready for my sports medicine tele-consultation?",
            answer = "Have your recent MRI scans of the affected joint, video clips of how you walk or move, and details of your specific sport, position, and competition schedule."
        )
    )
)
