package com.example.swastik.data.specialities

val orthopedistData = SpecialityDetailData(
    id = "orthopedist",
    title = "Orthopedist",
    subtitle = "Bones, Joints, Muscle & Spine Specialist",
    heroDescription = "Board-certified orthopedic specialists providing expert diagnosis and advanced treatments for joint pain, bone fractures, ligament tears, arthritis, and spinal disorders.",
    trustBadges = listOf(
        "🦴 Bone & Joint Health",
        "⚡ In-Clinic & Video Post-Op Follow-up",
        "🛡️ 100% Verified MS / DNB Ortho"
    ),
    aboutDescription = "An Orthopedist (Orthopedic Surgeon) is a specialized medical doctor dedicated to diagnosing, treating, and rehabilitating conditions affecting the musculoskeletal system — including bones, joints, ligaments, tendons, muscles, and nerves. They treat everything from sports injuries and acute fractures to chronic arthritis and complex joint replacements.",
    symptoms = listOf(
        SpecialitySymptom("🦴", "Joint Pain & Stiffness", "Persistent knee, shoulder, hip, or elbow pain and limited range of motion"),
        SpecialitySymptom("💥", "Fractures & Trauma", "Sudden bone injury, severe swelling, bruising, or inability to bear weight"),
        SpecialitySymptom("⚡", "Back & Neck Pain", "Lower back ache, sciatica nerve shooting pain, and cervical stiffness"),
        SpecialitySymptom("🏃", "Ligament & Sports Injury", "ACL/PCL tears, ankle sprains, meniscus damage, and sports trauma"),
        SpecialitySymptom("🔥", "Arthritis & Swelling", "Morning joint stiffness, gout flare-ups, and degenerative osteoarthritis"),
        SpecialitySymptom("🦶", "Heel & Foot Pain", "Plantar fasciitis, heel spurs, flat feet, and Achilles tendonitis")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "🦴 Joint & Arthritis Disorders",
            items = listOf(
                "Osteoarthritis & Rheumatoid Arthritis",
                "Knee & Hip Joint Degeneration",
                "Frozen Shoulder & Rotator Cuff Tendonitis",
                "Bursitis & Synovitis"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🏃 Sports & Soft Tissue Injuries",
            items = listOf(
                "ACL, PCL & Meniscus Tears",
                "Ankle Sprains & Ligament Ruptures",
                "Tennis Elbow & Golfer's Elbow",
                "Hamstring & Muscle Tears"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "⚡ Spine & Neck Conditions",
            items = listOf(
                "Herniated & Slipped Disc",
                "Sciatica & Lumbar Spondylosis",
                "Cervical Spondylitis & Neck Pain",
                "Scoliosis & Postural Deformities"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "💥 Bone Trauma & Deformities",
            items = listOf(
                "Complex Bone Fractures & Dislocations",
                "Osteoporosis & Bone Density Loss",
                "Carpal Tunnel Syndrome & Trigger Finger",
                "Pediatric Bone & Growth Plate Issues"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Pain & Mobility Assessment", "Detailed discussion of pain location, onset, trigger activities, and past injury history."),
        SpecialityConsultationStep("2", "Physical & Range of Motion Exam", "Clinical evaluation of joint alignment, swelling, ligament stability, and weight-bearing capacity."),
        SpecialityConsultationStep("3", "X-Ray / MRI Imaging Guidance", "Review of digital X-rays, MRI scans, or bone mineral density (DEXA) reports."),
        SpecialityConsultationStep("4", "Custom Treatment & Rehab Plan", "Prescription of anti-inflammatory medications, joint supplements, brace/cast support, and physical therapy exercises.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "When should I consult an Orthopedist instead of a General Physician?",
            answer = "You should consult an Orthopedist if you experience severe joint pain, inability to bear weight, joint swelling, sudden sports injury, numbness in limbs, or persistent back pain lasting over two weeks."
        ),
        SpecialityFaqItem(
            question = "Can joint pain and arthritis be managed without surgery?",
            answer = "Yes. More than 80% of orthopedic cases are successfully managed using non-surgical treatments including targeted physiotherapy, hyaluronic acid or PRP injections, weight optimization, and anti-inflammatory medications."
        ),
        SpecialityFaqItem(
            question = "What should I keep ready for my online Orthopedic consultation?",
            answer = "Have your recent X-rays, MRI reports, a clear video showing your walking gait or range of motion, and a list of existing medications ready for the doctor."
        ),
        SpecialityFaqItem(
            question = "How do I know if I have an ACL tear or a simple sprain?",
            answer = "An ACL tear often involves an audible 'pop' sound at the time of injury, immediate swelling within hours, and a sensation of the knee 'giving way'. An MRI scan evaluated by an orthopedic specialist confirms the diagnosis."
        )
    )
)
