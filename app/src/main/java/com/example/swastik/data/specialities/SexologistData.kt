package com.example.swastik.data.specialities

val sexologistData = SpecialityDetailData(
    id = "sexologist",
    title = "Sexologist",
    subtitle = "Sexual Health, Intimacy & Reproductive Wellness Specialist",
    heroDescription = "100% confidential and expert clinical guidance for erectile dysfunction, premature ejaculation, low libido, performance anxiety, and couples intimacy concerns.",
    trustBadges = listOf(
        "🔒 100% Private & Confidential",
        "⚡ Certified Clinical Sexologists",
        "🛡️ Evidence-Based Medical Care"
    ),
    aboutDescription = "A Sexologist is a qualified medical doctor and sexual health expert specializing in diagnosing and treating physiological, psychological, and hormonal issues affecting human sexuality, performance, intimacy, and reproductive health.",
    symptoms = listOf(
        SpecialitySymptom("⚡", "Erectile Dysfunction (ED)", "Difficulty achieving or maintaining an erection sufficient for satisfactory intimacy"),
        SpecialitySymptom("⏱️", "Premature Ejaculation (PE)", "Ejaculation occurring earlier than desired, causing distress or performance anxiety"),
        SpecialitySymptom("📉", "Low Libido & Loss of Desire", "Reduced sexual drive, lack of interest in physical intimacy, or hormonal fatigue"),
        SpecialitySymptom("😰", "Performance Anxiety & Stress", "Nervousness, psychological pressure, or fear of underperformance during intimacy"),
        SpecialitySymptom("🔥", "Painful Intercourse (Dyspareunia)", "Discomfort or pain during sexual activity in men or women (vaginismus, prostatitis)"),
        SpecialitySymptom("🧬", "Infertility & Semen Concerns", "Low sperm count, poor motility, abnormal morphology, or conception difficulties")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "⚡ Male Sexual Health Disorders",
            items = listOf(
                "Erectile Dysfunction (Organic & Psychogenic)",
                "Premature & Delayed Ejaculation",
                "Low Testosterone (Hypogonadism)",
                "Penile Curvature (Peyronie's Disease)"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🌸 Female Sexual Wellness & Comfort",
            items = listOf(
                "Vaginismus & Involuntary Pelvic Tightness",
                "Female Sexual Arousal Disorder (FSAD)",
                "Dyspareunia (Painful Intercourse)",
                "Postpartum & Menopausal Intimacy Changes"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🧠 Psychological & Relationship Wellness",
            items = listOf(
                "Performance Anxiety & Intimacy Phobia",
                "Couples Psychosexual Counseling",
                "Pornography-Induced Sexual Dysfunction",
                "Stress-Induced Hormonal Imbalances"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🛡️ Hormonal & STI Screening",
            items = listOf(
                "Total & Free Testosterone Evaluation",
                "Prolactin & Thyroid Imbalance Care",
                "Sexually Transmitted Infection (STI/STD) Screening",
                "Pre-Marital Sexual Health Checkups"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Confidential Health Intake", "A private, respectful, and completely non-judgmental discussion regarding your concerns, lifestyle, and relationship history."),
        SpecialityConsultationStep("2", "Root-Cause Evaluation", "Distinguishing between organic (vascular/hormonal/nerve) and psychogenic (stress/anxiety) contributors."),
        SpecialityConsultationStep("3", "Hormonal & Diagnostic Review", "Interpretation of Total Testosterone, Free Testosterone, Prolactin, HbA1c, and Lipid panel."),
        SpecialityConsultationStep("4", "Custom Medical & Behavioral Plan", "Prescription of approved medical therapies (PDE5 inhibitors, SSRIs for PE), pelvic floor exercises, and counseling.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "Is erectile dysfunction caused by psychological stress or physical disease?",
            answer = "It can be either or a combination of both. Physical causes include diabetes, high blood pressure, low testosterone, or vascular plaque. Psychological causes include performance anxiety, work stress, and depression. A sexologist accurately identifies the root cause."
        ),
        SpecialityFaqItem(
            question = "Can premature ejaculation be permanently treated?",
            answer = "Yes. Modern treatment approaches combining targeted medical therapy, behavioral techniques (stop-start / squeeze methods), pelvic floor strengthening (Kegels), and desensitizing protocols offer high success rates."
        ),
        SpecialityFaqItem(
            question = "Is an online consultation with a sexologist truly anonymous and secure?",
            answer = "Yes, absolutely. Swastik provides fully encrypted, HIPAA-compliant consultations where your identity and personal health data remain strictly confidential."
        ),
        SpecialityFaqItem(
            question = "What blood tests help diagnose sexual health problems?",
            answer = "A morning Serum Total Testosterone, Serum Prolactin, Thyroid Profile (TSH), Fasting Blood Sugar/HbA1c, and Lipid Profile are commonly evaluated."
        )
    )
)
