package com.example.swastik.data.specialities

val diabetologistData = SpecialityDetailData(
    id = "diabetologist",
    title = "Diabetologist",
    subtitle = "Diabetes Management, Blood Sugar & Insulin Specialist",
    heroDescription = "Consult certified diabetologists and endocrinologists for HbA1c optimization, diabetes reversal plans, insulin dose titration, continuous glucose monitoring (CGM), and complication prevention.",
    trustBadges = listOf(
        "🩸 Comprehensive Diabetes Care",
        "⚡ CGM & Insulin Titration",
        "🛡️ Certified MD / C.Diab Specialists"
    ),
    aboutDescription = "A Diabetologist is a medical doctor specialized in diagnosing, treating, and preventing diabetes mellitus (Type 1, Type 2, and Gestational Diabetes) and associated metabolic conditions. They focus on glycemic control to prevent damage to the heart, eyes, kidneys, and nerves.",
    symptoms = listOf(
        SpecialitySymptom("🚰", "Excessive Thirst & Frequent Urination", "Polydipsia (constant thirst), dry mouth, and waking up multiple times to urinate (polyuria)"),
        SpecialitySymptom("🩸", "High HbA1c & Fasting Glucose", "Blood sugar >126 mg/dL fasting, post-prandial >200 mg/dL, or HbA1c >6.5%"),
        SpecialitySymptom("📉", "Unexplained Weight Loss & Hunger", "Eating frequently (polyphagia) while steadily losing weight due to insulin deficiency"),
        SpecialitySymptom("🦶", "Numbness & Burning in Feet", "Pins and needles, burning soles, loss of sensation, or diabetic neuropathy"),
        SpecialitySymptom("🩹", "Slow-Healing Cuts & Sores", "Minor wounds, cuts, or blisters on feet taking weeks to heal without progress"),
        SpecialitySymptom("🥶", "Hypoglycemia (Shakiness & Sweating)", "Sudden trembling, profuse cold sweating, dizziness, and confusion from low blood sugar")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "🩸 Type 1 & Type 2 Diabetes Management",
            items = listOf(
                "Type 2 Diabetes Mellitus & Pre-Diabetes",
                "Type 1 Diabetes & Basal-Bolus Insulin Plans",
                "Gestational Diabetes Mellitus (GDM in Pregnancy)",
                "Latent Autoimmune Diabetes in Adults (LADA)"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "⚡ Advanced Glycemic Technology",
            items = listOf(
                "Continuous Glucose Monitoring (CGM) Sensors",
                "Insulin Pump Therapy & Titration",
                "GLP-1 Receptor Agonists & SGLT2 Inhibitors",
                "Time-in-Range (TIR) Optimization"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🛡️ Diabetes Complication Prevention",
            items = listOf(
                "Diabetic Peripheral Neuropathy Care",
                "Diabetic Nephropathy (Microalbuminuria Screening)",
                "Diabetic Retinopathy Eye Health Guidance",
                "Diabetic Foot Ulcer Risk & Podiatry Care"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🥗 Metabolic & Lifestyle Reversal",
            items = listOf(
                "Early Diabetes Reversal & Remission Protocols",
                "Insulin Resistance & Acanthosis Nigricans",
                "Dyslipidemia & Fatty Liver Management",
                "Carb Counting & Glycemic Index Meal Plans"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Glycemic Trend & History Intake", "Review of daily fasting/post-meal sugar logs, HbA1c history, hypo episodes, and current medications."),
        SpecialityConsultationStep("2", "Metabolic & Organ Health Review", "Evaluation of Kidney Function (eGFR/Creatinine), Urine Albumin-Creatinine Ratio (UACR), Lipid profile, and eye reports."),
        SpecialityConsultationStep("3", "Targeted Prescription & Insulin Titration", "Adjusting oral hypoglycemics (metformin, DPP4i, SGLT2i) and fine-tuning insulin units for safety and efficacy."),
        SpecialityConsultationStep("4", "Lifestyle, CGM & Nutrition Road Map", "Custom dietary advice, exercise timing to prevent hypoglycemia, and home glucose monitoring schedules.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "Can Type 2 Diabetes be reversed?",
            answer = "In newly diagnosed patients or those in early stages, significant fat loss (especially liver and pancreatic fat) through low-carb nutrition, caloric restriction, and regular exercise can restore insulin sensitivity and achieve diabetes remission without medications."
        ),
        SpecialityFaqItem(
            question = "What is a safe target for HbA1c?",
            answer = "For most non-pregnant adults with diabetes, a target HbA1c of below 7.0% is recommended to prevent microvascular complications. Younger individuals may target below 6.5%, while elderly patients may have a tailored target of 7.5-8.0% to avoid hypoglycemia."
        ),
        SpecialityFaqItem(
            question = "What should I do immediately if my blood sugar drops below 70 mg/dL?",
            answer = "Follow the 'Rule of 15': Consume 15 grams of fast-acting carbohydrates (such as 3 glucose tablets, 1/2 cup of fruit juice, or 3 teaspoons of sugar), wait 15 minutes, and recheck blood sugar."
        ),
        SpecialityFaqItem(
            question = "What lab tests should I have ready before my consultation?",
            answer = "Bring your latest HbA1c, Fasting & Post-Prandial Blood Sugar, Urine Routine/Microalbumin, Lipid Profile, and Serum Creatinine reports."
        )
    )
)
