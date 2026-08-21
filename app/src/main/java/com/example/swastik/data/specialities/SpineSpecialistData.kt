package com.example.swastik.data.specialities

val spineSpecialistData = SpecialityDetailData(
    id = "spine_specialist",
    title = "Spine Specialist",
    subtitle = "Spine Surgeon, Sciatica, Disc Herniation & Vertebral Care",
    heroDescription = "Consult expert spine surgeons and neuro-spine specialists for slipped disc (herniation), sciatica, cervical spondylosis, endoscopic spine surgery, and back pain relief.",
    trustBadges = listOf(
        "🦴 Advanced Spine & Nerve Care",
        "⚡ Endoscopic & Minimally Invasive Spine",
        "🛡️ 100% Verified MCh / MS / FNB Spine Specialists"
    ),
    aboutDescription = "A Spine Specialist is an orthopedic or neurosurgical specialist focusing exclusively on conditions of the cervical, thoracic, and lumbar spine — including intervertebral discs, spinal cord, spinal nerves, and vertebral column stability.",
    symptoms = listOf(
        SpecialitySymptom("⚡", "Sciatica & Shooting Leg Pain", "Electric shock-like pain radiating from lower back down the buttocks, back of the thigh, and into the foot"),
        SpecialitySymptom("💥", "Slipped / Herniated Disc Pain", "Acute back pain after bending or lifting, worsening with sitting, sneezing, or coughing"),
        SpecialitySymptom("🪵", "Cervical Pain & Arm Numbness", "Neck stiffness with shooting pain, tingling, or weakness in shoulder, arm, or fingers"),
        SpecialitySymptom("🚶", "Neurogenic Claudication", "Cramping or heaviness in both legs after walking short distances relieved by sitting or bending forward"),
        SpecialitySymptom("📐", "Spinal Deformity & Scoliosis", "Curvature of the spine, uneven shoulders, or forward hunching (Kyphosis)"),
        SpecialitySymptom("⚠️", "Loss of Bowel / Bladder Control", "Sudden numbness in groin area or loss of control (Cauda Equina Red Flag)")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "⚡ Disc & Nerve Compression Disorders",
            items = listOf(
                "Lumbar Disc Herniation (Slip Disc L4-L5, L5-S1)",
                "Cervical Radiculopathy & Disc Prolapse (C5-C6, C6-C7)",
                "Lumbar Canal Stenosis (Spinal Stenosis)",
                "Sciatica Nerve Compression & Piriformis Syndrome"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🦴 Degenerative & Structural Spine Diseases",
            items = listOf(
                "Cervical & Lumbar Spondylosis",
                "Spondylolisthesis (Vertebral Slippage)",
                "Osteoporotic Vertebral Compression Fractures",
                "Facet Joint Arthropathy & Back Spasms"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🔬 Minimally Invasive & Endoscopic Surgery",
            items = listOf(
                "Full Endoscopic Lumbar Discectomy (Keyhole)",
                "Microscopic Cervical Decompression & Fusion (ACDF)",
                "Percutaneous Vertebroplasty / Kyphoplasty",
                "Transforaminal Epidural Steroid Injections (TFESI)"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🛡️ Deformity & Spine Rehabilitation",
            items = listOf(
                "Adolescent & Adult Scoliosis Correction",
                "Kyphosis & Postural Deformity Management",
                "Spine Stability Core Rehab Programs",
                "Post-Spine Surgery Rehabilitation & Care"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Spine Pain & Functional History", "Assessing pain distribution, walking distance capacity, sitting tolerance, numbness zones, and daily disability."),
        SpecialityConsultationStep("2", "MRI & Dynamic X-Ray Analysis", "Detailed review of Spine MRI (T2 sagittal/axial views for disc protrusion and nerve impingement) and dynamic bending X-rays."),
        SpecialityConsultationStep("3", "Conservative vs Surgical Pathway", "Determining if targeted physiotherapy, nerve medications (Pregabalin/Gabapentin), or epidural blocks can resolve symptoms without surgery."),
        SpecialityConsultationStep("4", "Surgical Technique & Recovery Plan", "Clear evaluation of stitchless endoscopic discectomy or minimally invasive spine stabilization options if conservative care fails.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "Do all slipped discs require spine surgery?",
            answer = "No! Over 90% of herniated discs heal conservatively within 6 to 12 weeks with medication, targeted physical therapy, posture modification, and selective nerve root injections."
        ),
        SpecialityFaqItem(
            question = "What is Keyhole Endoscopic Spine Surgery?",
            answer = "Endoscopic spine surgery is an advanced, ultra-minimally invasive technique performed through an incision smaller than 8 mm. It relieves nerve pressure under local or general anesthesia with minimal tissue damage and same-day or next-day discharge."
        ),
        SpecialityFaqItem(
            question = "What are the red flag symptoms requiring emergency spine surgery?",
            answer = "Sudden loss of bowel or bladder control, numbness in the groin/perineal area (saddle anesthesia), or progressive motor weakness (like foot drop) are emergency signs of Cauda Equina Syndrome needing urgent decompression."
        ),
        SpecialityFaqItem(
            question = "What investigations should I have ready for the spine doctor?",
            answer = "Have your recent High-Resolution MRI of the Cervical or Lumbar Spine (films and written radiologist report) and standing X-rays ready for review."
        )
    )
)
