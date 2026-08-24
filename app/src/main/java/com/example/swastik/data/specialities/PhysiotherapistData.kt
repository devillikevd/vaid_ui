package com.example.swastik.data.specialities

val physiotherapistData = SpecialityDetailData(
    id = "physiotherapist",
    title = "Physiotherapist",
    subtitle = "Physical Therapy, Rehabilitation & Mobility Specialist",
    heroDescription = "Restore movement, relieve pain, and recover faster with certified physiotherapists for neck/back pain, knee arthritis, sports injuries, posture correction, and post-surgery rehab.",
    trustBadges = listOf(
        "🏃 Mobility & Pain Relief",
        "⚡ Personalized Exercise Routines",
        "🛡️ 100% Certified BPT / MPT Therapists"
    ),
    aboutDescription = "A Physiotherapist (Physical Therapist) is a healthcare professional specialized in physical medicine and movement science — restoring strength, improving joint mobility, treating musculoskeletal injuries, and assisting post-operative rehabilitation through tailored exercise therapy and manual techniques.",
    symptoms = listOf(
        SpecialitySymptom("⚡", "Chronic Back & Neck Pain", "Stiff neck, lower back spasms, sciatica nerve pain shooting down legs, or desk work strain"),
        SpecialitySymptom("🦵", "Knee & Joint Stiffness", "Difficulty climbing stairs, joint crepitus (cracking), osteoarthritis discomfort"),
        SpecialitySymptom("🦾", "Frozen Shoulder & Limited Range", "Inability to lift arm overhead, reach behind back, or sleep on affected shoulder"),
        SpecialitySymptom("🏃", "Sports & Ligament Injuries", "Sprains, muscle tears, ACL / Meniscus rehab, tennis elbow, or ankle twists"),
        SpecialitySymptom("🚶", "Post-Surgery Recovery", "Joint replacement (TKR/THR), fracture rehab, or post-operative stiffness"),
        SpecialitySymptom("🧘", "Poor Posture & Ergonomic Strain", "Hunched shoulders, forward head posture, rounded back, and repetitive strain injury")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "⚡ Spine & Neck Care",
            items = listOf(
                "Cervical Spondylosis & Radiculopathy",
                "Lumbar Spondylolisthesis & Sciatica",
                "Herniated Disc & Postural Ergonomics",
                "Core Strengthening & Spine Stabilization"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🦵 Joint & Arthritis Rehabilitation",
            items = listOf(
                "Knee Osteoarthritis & Quadriceps Strengthening",
                "Total Knee & Hip Replacement (TKR/THR) Rehab",
                "Frozen Shoulder (Adhesive Capsulitis)",
                "Rotator Cuff & Bursitis Management"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🏃 Sports Medicine & Soft Tissue Care",
            items = listOf(
                "ACL, PCL & Meniscus Tear Rehab",
                "Tennis Elbow & Golfer's Elbow",
                "Plantar Fasciitis & Achilles Tendinitis",
                "Hamstring & Calf Muscle Strain Recovery"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🛡️ Neuro & Geriatric Mobility",
            items = listOf(
                "Post-Stroke Motor Rehabilitation",
                "Bell's Palsy & Facial Muscle Re-education",
                "Parkinson's Gait & Balance Training",
                "Fall Prevention & Senior Mobility Protocols"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Movement & Pain History", "Detailed assessment of injury onset, daily movement limitations, sitting posture, and pain scale (1-10)."),
        SpecialityConsultationStep("2", "Functional Movement Analysis", "Interactive evaluation of range of motion, muscle strength, joint flexibility, and gait."),
        SpecialityConsultationStep("3", "Step-by-Step Exercise Prescription", "Live demonstration of customized stretching, isometric strengthening, and mobility drills."),
        SpecialityConsultationStep("4", "Ergonomic & Recovery Protocol", "Guidance on desk setup, hot/cold therapy, kinesiology taping advice, and follow-up milestones.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "How does online video physiotherapy work effectively?",
            answer = "Online physiotherapy allows the therapist to evaluate your posture, joint movement, and painful movements visually. They teach and correct your exercise form in real time, providing custom rehabilitation routines you can follow at home."
        ),
        SpecialityFaqItem(
            question = "Should I apply ice or heat to my painful joint or back?",
            answer = "Use ice (cold therapy) for acute injuries, swelling, and new sprains during the first 48 hours. Use moist heat for chronic muscle stiffness, recurring neck/back tightness, and to relax tight muscles before stretching."
        ),
        SpecialityFaqItem(
            question = "Can physiotherapy cure a frozen shoulder without surgery?",
            answer = "Yes, in the vast majority of cases, structured physical therapy combining passive stretching, pendulum exercises, and scapular strengthening restores full shoulder range and relieves stiffness without requiring surgery."
        ),
        SpecialityFaqItem(
            question = "How long does it take to see improvements with physiotherapy?",
            answer = "Most patients notice meaningful pain reduction and mobility gains within 2 to 4 weeks of consistent, guided exercise sessions."
        )
    )
)
