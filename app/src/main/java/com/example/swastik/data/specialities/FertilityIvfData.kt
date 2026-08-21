package com.example.swastik.data.specialities

val fertilityIvfData = SpecialityDetailData(
    id = "fertility_ivf",
    title = "Fertility & IVF Specialist",
    subtitle = "Reproductive Medicine, IUI, IVF & Infertility Specialist",
    heroDescription = "Compassionate, advanced reproductive care and fertility treatments including IUI, IVF, ICSI, egg freezing, semen analysis, and hormonal optimization for couples planning parenthood.",
    trustBadges = listOf(
        "👶 Reproductive Medicine & IVF",
        "⚡ Advanced Embryology & IUI/ICSI",
        "🛡️ 100% Verified MS / DNB / DRM Fertility Specialists"
    ),
    aboutDescription = "A Fertility and IVF Specialist (Reproductive Endocrinologist) is a super-specialist dedicated to diagnosing and treating male and female infertility, recurring pregnancy losses, and guiding assisted reproductive technologies (ART) including IVF, IUI, and fertility preservation.",
    symptoms = listOf(
        SpecialitySymptom("⏳", "Inability to Conceive (>1 Year)", "Trying to conceive naturally for 12+ months (or 6+ months if woman is over 35) without success"),
        SpecialitySymptom("🌸", "Irregular Periods & Low AMH", "Infrequent ovulation, diminishing ovarian reserve (low Anti-Müllerian Hormone), or early menopause"),
        SpecialitySymptom("🩸", "Severe Pelvic Pain & Endometriosis", "Painful periods, pain during intercourse, chocolate cysts on ultrasound, and tubal blockages"),
        SpecialitySymptom("🧬", "Low Sperm Count or Motility", "Oligospermia (low count), Asthenospermia (poor motility), or Teratospermia (abnormal morphology)"),
        SpecialitySymptom("💔", "Recurrent Miscarriages", "Two or more consecutive pregnancy losses requiring immunological or genetic evaluation"),
        SpecialitySymptom("❄️", "Egg / Sperm Freezing Plans", "Desire to preserve fertility for social, personal, or pre-oncological medical reasons")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "🌸 Female Infertility & Ovarian Care",
            items = listOf(
                "Diminished Ovarian Reserve (Low AMH)",
                "Endometriosis & Adenomyosis Management",
                "Fallopian Tubal Blockage & Hydrosalpinx",
                "Uterine Fibroids, Polyps & Septum"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🧬 Male Factor Infertility Care",
            items = listOf(
                "Severe Oligozoospermia & Azoospermia",
                "Sperm DNA Fragmentation Index (DFI) Analysis",
                "Varicocele-Induced Subfertility",
                "Testicular Sperm Extraction (TESA / TESE)"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "👶 Assisted Reproductive Technology (ART)",
            items = listOf(
                "Intrauterine Insemination (IUI)",
                "In Vitro Fertilization (IVF) & Blastocyst Culture",
                "Intracytoplasmic Sperm Injection (ICSI)",
                "Pre-implantation Genetic Testing (PGT-A / PGT-M)"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🛡️ Fertility Preservation & Recurrent Loss",
            items = listOf(
                "Oocyte (Egg) & Embryo Vitrification / Freezing",
                "Recurrent Implantation Failure (RIF) Protocols",
                "Recurrent Pregnancy Loss (RPL) Workup",
                "Donor Egg / Sperm IVF Counseling"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Couples Fertility & History Review", "Comprehensive evaluation of marital history, previous conception attempts, menstrual regularity, and semen reports."),
        SpecialityConsultationStep("2", "Ovarian & Semen Diagnostic Analysis", "Interpretation of Day 2/3 hormone levels (AMH, FSH, LH, E2), Antral Follicle Count (AFC ultrasound), and Semen Analysis."),
        SpecialityConsultationStep("3", "Personalized Treatment Strategy", "Recommending ovulation induction, timed intercourse, natural cycle IUI, or stimulated IVF/ICSI based on clinical factors."),
        SpecialityConsultationStep("4", "Step-by-Step IVF Cycle Protocol", "Detailed walkthrough of stimulation medication protocol, egg retrieval, embryo transfer, and emotional support.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "When should a couple seek help from a fertility specialist?",
            answer = "Couples under 35 should consult a specialist if they haven't conceived after 1 year of unprotected intercourse. If the female partner is 35 or older, or if there is a known history of PCOS, endometriosis, or irregular cycles, consultation is recommended after 6 months."
        ),
        SpecialityFaqItem(
            question = "What is the difference between IUI and IVF?",
            answer = "IUI (Intrauterine Insemination) is a simpler procedure where washed and concentrated sperm is placed directly inside the uterus around ovulation. IVF (In Vitro Fertilization) involves stimulating the ovaries, retrieving eggs, fertilizing them in a specialized lab to form embryos, and transferring the embryo into the uterus."
        ),
        SpecialityFaqItem(
            question = "Does low AMH mean I cannot get pregnant naturally or with IVF?",
            answer = "Low AMH indicates a reduced number of remaining eggs (ovarian reserve), but it does not reflect egg quality. Pregnancy is still achievable through tailored stimulation protocols, pooled cycles, or personalized embryology care."
        ),
        SpecialityFaqItem(
            question = "What test reports should both partners have ready?",
            answer = "The female partner should have recent AMH, Day 2/3 Hormone Profile, Pelvic Ultrasound (AFC), and HSG (Tubal Test). The male partner should have a recent Semen Analysis report (with 2-3 days abstinence)."
        )
    )
)
