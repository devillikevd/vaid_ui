package com.example.swastik.data.specialities

val oncologistData = SpecialityDetailData(
    id = "cancerspecialist",
    title = "Cancer Specialist (Oncologist)",
    subtitle = "Medical, Surgical & Radiation Oncology Expert",
    heroDescription = "Consult leading oncology specialists for second opinions, biopsy & PET scan reviews, chemotherapy guidance, immunotherapy, surgical oncology, and compassionate cancer care.",
    trustBadges = listOf(
        "🎗️ Comprehensive Cancer Care",
        "⚡ Multidisciplinary Second Opinion",
        "🛡️ 100% Verified DM / MCh / DNB Oncology"
    ),
    aboutDescription = "An Oncologist (Cancer Specialist) is a physician and surgical expert dedicated to the screening, staging, diagnosis, and evidence-based treatment of benign and malignant tumors and blood cancers. They coordinate chemotherapy, targeted therapy, immunotherapy, radiation therapy, and surgical resection.",
    symptoms = listOf(
        SpecialitySymptom("🎗️", "Painless Lump or Thickening", "Unexplained lump in the breast, neck, groin, testicle, or underarms that persists or grows"),
        SpecialitySymptom("📉", "Unexplained Rapid Weight Loss", "Losing 5-10% of body weight within 6 months without dieting or known lifestyle change"),
        SpecialitySymptom("🩸", "Abnormal Bleeding or Discharge", "Post-menopausal vaginal bleeding, blood in urine/stool, or chronic blood-streaked cough"),
        SpecialitySymptom("🕳️", "Non-Healing Mouth Sore / Ulcer", "Ulcer or white patch (Leukoplakia) in the oral cavity persisting for more than 2-3 weeks"),
        SpecialitySymptom("🥱", "Chronic Extreme Fatigue & Fever", "Persistent low-grade fever, drenching night sweats, and severe unremitting exhaustion"),
        SpecialitySymptom("🔍", "Changing Mole or Skin Growth", "Mole changing in size, shape, color asymmetry, irregular border, or bleeding")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "🎗️ Solid Tumor Oncology",
            items = listOf(
                "Breast Cancer Screening & Management",
                "Lung, Head & Neck (Oral) Cancer",
                "Gastrointestinal Cancers (Colorectal, Stomach, Liver)",
                "Gynecological Cancers (Cervical, Ovarian, Uterine)"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🩸 Hematologic & Blood Cancers",
            items = listOf(
                "Leukemia (Acute & Chronic)",
                "Lymphoma (Hodgkin & Non-Hodgkin)",
                "Multiple Myeloma & Myelodysplasia",
                "Bone Marrow Transplant (BMT) Guidance"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "⚡ Advanced Oncology Therapies",
            items = listOf(
                "Targeted Therapy & Precision Medicine",
                "Immunotherapy (Checkpoint Inhibitors)",
                "Chemotherapy Protocols & Side Effect Care",
                "Radiation Oncology Planning (IMRT, SBRT)"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🛡️ Second Opinion & Palliative Care",
            items = listOf(
                "Biopsy & Histopathology Second Opinion",
                "PET-CT & MRI Staging Review",
                "Oncologic Pain Management & Nutrition",
                "Cancer Survivorship & Surveillance"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Comprehensive Diagnostic Review", "Detailed examination of biopsy pathology reports, immunohistochemistry (IHC), and genetic mutation markers (e.g. EGFR, KRAS, BRCA)."),
        SpecialityConsultationStep("2", "Imaging & Staging Evaluation", "Assessment of whole-body PET-CT scans, Contrast CT, and MRI to accurately determine cancer stage (I-IV)."),
        SpecialityConsultationStep("3", "Personalized Treatment Protocol", "Clear recommendations on surgical feasibility, neo-adjuvant chemotherapy, radiation therapy, or targeted biologics."),
        SpecialityConsultationStep("4", "Symptom & Supportive Care Guidance", "Prescription of supportive anti-nausea medications, nutritional counseling, and post-treatment follow-up intervals.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "Why is getting a second opinion crucial in cancer diagnosis?",
            answer = "Cancer treatments are highly specialized and rapidly advancing. A second opinion verifies histological diagnosis, ensures accurate staging, and can offer alternative treatment options such as targeted immunotherapy or clinical trials."
        ),
        SpecialityFaqItem(
            question = "How are modern targeted therapies and immunotherapies different from chemotherapy?",
            answer = "Traditional chemotherapy kills both cancerous and rapidly dividing healthy cells. Targeted therapy and immunotherapy specifically recognize unique molecular markers on cancer cells or empower the body's immune system to attack tumors, resulting in fewer generic side effects."
        ),
        SpecialityFaqItem(
            question = "Can cancer be detected early through routine screening tests?",
            answer = "Yes! Mammography (breast), Pap smears & HPV testing (cervical), Colonoscopy (colorectal), and Low-Dose CT (for high-risk smokers) can detect pre-cancerous lesions and early-stage cancers with high cure rates."
        ),
        SpecialityFaqItem(
            question = "What records are required for an oncology tele-consultation?",
            answer = "Ensure you upload your Biopsy / Histopathology / IHC report, latest Whole Body PET-CT or Contrast CT scan, complete blood count (CBC, LFT, KFT), and current medication list."
        )
    )
)
