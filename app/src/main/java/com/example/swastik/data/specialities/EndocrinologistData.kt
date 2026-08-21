package com.example.swastik.data.specialities

val endocrinologistData = SpecialityDetailData(
    id = "endocrinologist",
    title = "Endocrinologist",
    subtitle = "Hormone Specialist, Thyroid, Pituitary & Metabolic Care",
    heroDescription = "Consult leading hormone specialists for thyroid disorders (Hypo/Hyperthyroidism), PCOS/PCOD, osteoporosis, pituitary conditions, adrenal disorders, and growth/puberty delays.",
    trustBadges = listOf(
        "🧬 Hormone & Metabolic Health",
        "⚡ Thyroid & Endocrine Profiles",
        "🛡️ 100% Verified DM / DNB Endocrinology"
    ),
    aboutDescription = "An Endocrinologist is a super-specialist medical doctor who diagnoses and manages disorders of the endocrine system — the glands and hormones that regulate metabolism, growth, reproduction, mood, bone density, and energy balance.",
    symptoms = listOf(
        SpecialitySymptom("🦋", "Thyroid Swelling & TSH Fluctuations", "High TSH (Hypothyroidism) with weight gain and cold sensitivity, or low TSH with tremors and weight loss"),
        SpecialitySymptom("🌸", "Irregular Periods & Facial Hair (Hirsutism)", "Excess male hormones (androgens) in women, cystic acne, severe hair thinning, and PCOD"),
        SpecialitySymptom("🦴", "Bone Pain & Frequent Fractures", "Osteoporosis, low bone mineral density (DEXA T-score), and hyperparathyroidism with high calcium"),
        SpecialitySymptom("🥱", "Unexplained Chronic Exhaustion", "Adrenal fatigue, cortisol deficiency (Addison's), or elevated cortisol (Cushing's syndrome)"),
        SpecialitySymptom("🧒", "Growth & Puberty Concerns", "Short stature in children, delayed puberty milestones, or precocious early puberty"),
        SpecialitySymptom("📉", "Severe Unintended Weight Shift", "Rapid unexplained weight gain with purple stretch marks, or severe sudden weight loss")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "🦋 Thyroid & Parathyroid Disorders",
            items = listOf(
                "Hypothyroidism & Hashimoto's Thyroiditis",
                "Hyperthyroidism & Graves' Disease",
                "Thyroid Nodules, Goiter & Post-Thyroidectomy Care",
                "Hyperparathyroidism & Calcium/Vitamin D Imbalance"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🌸 Reproductive Endocrinology & PCOS",
            items = listOf(
                "Polycystic Ovary Syndrome (PCOS/PCOD)",
                "Hyperandrogenism & Hirsutism Management",
                "Hyperprolactinemia (High Prolactin & Milk Discharge)",
                "Hypogonadism & Testosterone Replacement Therapy"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🦴 Bone Health & Metabolic Metabolism",
            items = listOf(
                "Osteopenia & Osteoporosis Management",
                "DEXA Scan Interpretation & Bisphosphonate Therapy",
                "Severe Vitamin D Resistant Rickets & Osteomalacia",
                "Paget's Disease & Rare Bone Disorders"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🛡️ Pituitary, Adrenal & Growth Disorders",
            items = listOf(
                "Pituitary Adenomas & Acromegaly / Growth Hormone Issues",
                "Cushing's Syndrome & Addison's Disease",
                "Pheochromocytoma & Adrenal Incidentalomas",
                "Childhood Short Stature & Growth Hormone Therapy"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Endocrine & Hormonal Intake", "Detailed review of menstrual cycles, temperature tolerance, weight shifts, mood changes, and growth patterns."),
        SpecialityConsultationStep("2", "Endocrine Lab Panel Analysis", "Evaluation of Free T3/T4, TSH, Anti-TPO antibodies, Serum Cortisol, Prolactin, LH/FSH, and DHEA-S."),
        SpecialityConsultationStep("3", "Targeted Hormonal Therapy", "Accurate dosing and titration of Levothyroxine, anti-thyroid drugs (Methimazole), or hormone modulators."),
        SpecialityConsultationStep("4", "Metabolic & Long-Term Monitoring", "Guidance on repeat blood testing intervals (every 6-12 weeks) and bone/metabolic maintenance.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "How should Levothyroxine (thyroid medicine) be taken correctly?",
            answer = "Take your thyroid tablet first thing in the morning on an empty stomach with a full glass of plain water. Wait at least 30-45 minutes before having tea, coffee, milk, breakfast, or other medications."
        ),
        SpecialityFaqItem(
            question = "Is PCOS purely a gynecological problem or an endocrine disorder?",
            answer = "PCOS is primarily a complex metabolic and endocrine disorder driven by insulin resistance and androgen imbalances that manifest with ovarian cysts and irregular cycles. An endocrinologist treats the underlying hormonal driver."
        ),
        SpecialityFaqItem(
            question = "When should a child's short height be evaluated by an endocrinologist?",
            answer = "If a child is consistently growing at less than 4-5 cm per year, falling significantly below parental target height percentiles, or not keeping up with peers, a pediatric endocrine evaluation for growth hormone or thyroid deficiency is recommended."
        ),
        SpecialityFaqItem(
            question = "What test reports should I have ready for an endocrine consultation?",
            answer = "Have your complete Thyroid Profile (TSH, Free T3, Free T4), Anti-TPO, Prolactin, LH, FSH, AMH, Fasting Insulin, and any recent Neck Thyroid Ultrasound ready."
        )
    )
)
