package com.example.swastik.data.specialities

val gynecologistData = SpecialityDetailData(
    id = "gynecologist",
    title = "Gynecologist",
    subtitle = "Women's Health, Pregnancy & Fertility Specialist",
    heroDescription = "Expert medical specialists dedicated to women's reproductive health, menstrual disorders, PCOS/PCOD care, prenatal & pregnancy management, and fertility guidance.",
    trustBadges = listOf(
        "🌸 Women's Health & OB-GYN",
        "⚡ Private & Confidential Consults",
        "🛡️ 100% Verified MD / MS / DGO"
    ),
    aboutDescription = "A Gynecologist and Obstetrician (OB-GYN) is a specialized medical doctor (MD/MS/DGO in Obstetrics & Gynecology) trained in female reproductive health, hormonal balance, pregnancy, and childbirth. They provide compassionate, confidential, and comprehensive care for menstrual irregularities, PCOS/PCOD, uterine fibroids, pelvic infections, contraception, pre-conception planning, and menopausal wellness.",
    symptoms = listOf(
        SpecialitySymptom(
            emoji = "🩸",
            title = "Irregular Periods",
            subtitle = "Delayed cycles, heavy bleeding, spotting & severe menstrual cramps"
        ),
        SpecialitySymptom(
            emoji = "🌸",
            title = "PCOS / PCOD Care",
            subtitle = "Weight gain, facial hair, cystic acne & hormonal imbalances"
        ),
        SpecialitySymptom(
            emoji = "🤰",
            title = "Pregnancy & Prenatal",
            subtitle = "Positive pregnancy test, morning sickness, scans & trimester care"
        ),
        SpecialitySymptom(
            emoji = "⚡",
            title = "Pelvic & Abdominal Pain",
            subtitle = "Endometriosis discomfort, ovarian cysts & persistent lower pain"
        ),
        SpecialitySymptom(
            emoji = "💧",
            title = "Discharge & Itching",
            subtitle = "Foul odor, yeast/bacterial infections, burning & vaginal irritation"
        ),
        SpecialitySymptom(
            emoji = "👶",
            title = "Fertility & Planning",
            subtitle = "Pre-conception counseling, ovulation tracking & contraception"
        )
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "🩸 Menstrual & Hormonal Health",
            items = listOf(
                "Polycystic Ovary Syndrome (PCOS/PCOD)",
                "Dysmenorrhea (Severe Period Cramps)",
                "Menorrhagia (Abnormally Heavy Bleeding)",
                "Premenstrual Dysphoric Disorder (PMDD)"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🤰 Obstetrics & Pregnancy Care",
            items = listOf(
                "Comprehensive Trimester-by-Trimester Care",
                "High-Risk Pregnancy Management (BP/Diabetes)",
                "Routine Prenatal Scans & Blood Panels",
                "Postpartum Care & Lactation Support"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🌸 Reproductive & Pelvic Health",
            items = listOf(
                "Uterine Fibroids & Endometriosis",
                "Ovarian Cysts & Pelvic Infections (PID)",
                "Bacterial Vaginosis & Vaginal Candidiasis",
                "Cervical Health & Routine Pap Smears"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🌿 Fertility, Contraception & Menopause",
            items = listOf(
                "Ovulation Tracking & Infertility Workup",
                "Safe Contraceptive Counseling (IUD, Pills)",
                "Perimenopause & Menopause Symptoms",
                "Hormonal Replacement Therapy (HRT) Review"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep(
            stepNumber = "1",
            title = "Confidential Health & Cycle History",
            description = "Private discussion regarding your cycle dates, symptoms, previous pregnancies, and current concerns."
        ),
        SpecialityConsultationStep(
            stepNumber = "2",
            title = "Clinical & Symptom Assessment",
            description = "Assessment of hormonal triggers, pelvic symptoms, and pain patterns in a safe, confidential environment."
        ),
        SpecialityConsultationStep(
            stepNumber = "3",
            title = "Ultrasound & Hormone Panel Advice",
            description = "If required, doctor recommends pelvic ultrasound (USG), thyroid/hormone panel (FSH, LH, AMH, Prolactin), or Pap smear."
        ),
        SpecialityConsultationStep(
            stepNumber = "4",
            title = "Personalized Treatment & Lifestyle Plan",
            description = "Tailored medical prescription, hormonal regulation therapies, nutritional diet plan for PCOS, and follow-up support."
        )
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "Are online video consultations confidential and safe for Gynecological concerns?",
            answer = "Absolutely. All consultations on Swastik are 100% private, encrypted, and strictly confidential. You can comfortably discuss intimate symptoms, cycle history, and fertility queries from the privacy of your home."
        ),
        SpecialityFaqItem(
            question = "Can PCOS / PCOD be managed effectively with medication and lifestyle changes?",
            answer = "Yes. While PCOS has no permanent one-time cure, it can be completely managed and reversed through customized hormonal regulation, targeted insulin-sensitizing medications, and strategic dietary and exercise regimens."
        ),
        SpecialityFaqItem(
            question = "When should I book my first prenatal consultation after a positive home pregnancy test?",
            answer = "It is recommended to schedule your first consultation between 6 to 8 weeks of pregnancy (calculated from the first day of your last menstrual period) to confirm fetal viability via an early dating ultrasound and start essential folic acid supplementation."
        ),
        SpecialityFaqItem(
            question = "How often should women get a routine Pap smear or pelvic health checkup?",
            answer = "Women between the ages of 21 to 65 are medically recommended to undergo a routine Pap smear and cervical screening every 3 years (or every 5 years when combined with an HPV test) for early preventive detection."
        )
    )
)
