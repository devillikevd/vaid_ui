package com.example.swastik.data.specialities

val urologistData = SpecialityDetailData(
    id = "urologist",
    title = "Urologist",
    subtitle = "Urinary System, Kidney Stones & Men's Health Specialist",
    heroDescription = "Consult top urologists for kidney stones, painful urination, UTIs, prostate enlargement (BPH), bladder issues, and male reproductive health.",
    trustBadges = listOf(
        "💧 Urinary & Kidney Care",
        "⚡ Laser Stone & Prostate Guidance",
        "🛡️ 100% Verified MCh / DNB Urology"
    ),
    aboutDescription = "A Urologist is a medical and surgical specialist focusing on conditions of the male and female urinary tract system (kidneys, ureters, bladder, and urethra) as well as the male reproductive system (prostate, testes, and penis).",
    symptoms = listOf(
        SpecialitySymptom("⚡", "Severe Flank & Back Pain", "Sharp, excruciating pain in the lower back or side radiating to the groin (classic kidney stone)"),
        SpecialitySymptom("🔥", "Painful & Burning Urination", "Dysuria, burning sensation during urination, and cloudy or foul-smelling urine"),
        SpecialitySymptom("🚽", "Frequent Urination & Urgency", "Waking up multiple times at night (nocturia), sudden uncontrollable urge to urinate"),
        SpecialitySymptom("🩸", "Blood in Urine (Hematuria)", "Pink, reddish, or brownish urine, requiring prompt medical evaluation"),
        SpecialitySymptom("💧", "Weak Urinary Stream", "Difficulty initiating urination, dribbling at the end of stream, or feeling of incomplete bladder emptying"),
        SpecialitySymptom("⚠️", "Pelvic & Testicular Pain", "Ache or swelling in the scrotum, testicles, or lower pelvic floor")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "🪨 Kidney Stones & Obstructions",
            items = listOf(
                "Renal & Ureteric Calculi (Kidney Stones)",
                "Bladder Stones & Hydronephrosis",
                "Laser Lithotripsy (RIRS/URSL/PCNL) Advice",
                "Metabolic Stone Prevention & Diet"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "💧 Prostate & Bladder Disorders",
            items = listOf(
                "Benign Prostatic Hyperplasia (BPH / Enlarged Prostate)",
                "Prostatitis & Chronic Pelvic Pain",
                "Overactive Bladder (OAB) & Incontinence",
                "Neurogenic Bladder & Urinary Retention"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🦠 Urinary Tract Infections (UTI)",
            items = listOf(
                "Recurrent UTIs in Women & Men",
                "Pyelonephritis (Kidney Infection)",
                "Cystitis & Urethritis",
                "Catheter-Associated Urinary Infections"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🛡️ Men's Urological & Reproductive Health",
            items = listOf(
                "Varicocele & Hydrocele",
                "Erectile Dysfunction & Premature Ejaculation",
                "Male Infertility & Low Sperm Count",
                "Phimosis, Paraphimosis & Circumcision"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Urological History & Symptoms", "Detailed discussion regarding pain intensity, urination frequency, stream force, and fever episodes."),
        SpecialityConsultationStep("2", "Clinical & Uro-Score Evaluation", "Assessment using IPSS (International Prostate Symptom Score) and fluid intake balance."),
        SpecialityConsultationStep("3", "Scan & Urine Report Review", "Interpretation of KUB Ultrasound, Non-Contrast CT KUB, Urine Routine/Culture, Serum Creatinine, and PSA levels."),
        SpecialityConsultationStep("4", "Treatment & Stone Clearance Plan", "Prescription of stone-expulsive therapy, targeted antibiotics, prostate reducers (Alpha-blockers), and surgical advice if indicated.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "Can a kidney stone pass naturally without surgery?",
            answer = "Small stones (less than 5-6 mm) located in the kidney or ureter frequently pass on their own with high fluid intake, pain medications, and alpha-blocker therapy. Larger stones (>7-8 mm) or those causing severe obstruction or infection may require minimally invasive laser treatment (URSL/RIRS)."
        ),
        SpecialityFaqItem(
            question = "What causes enlarged prostate (BPH) in older men?",
            answer = "BPH is a common, non-cancerous enlargement of the prostate gland influenced by age-related hormonal changes. It can press against the urethra, causing weak urine flow, night urination, and difficulty starting the stream."
        ),
        SpecialityFaqItem(
            question = "How can I prevent recurring urinary tract infections (UTIs)?",
            answer = "Stay well-hydrated (2.5-3L water daily), do not hold urine for prolonged periods, urinate after intercourse, wipe from front to back, and consider cranberry extract or D-mannose supplements under medical guidance."
        ),
        SpecialityFaqItem(
            question = "What investigations should I have ready for the urologist?",
            answer = "Have your recent Ultrasound KUB (Kidney, Ureter, Bladder), Urine Routine & Culture report, and Serum Creatinine (or Serum PSA for men over 50) ready."
        )
    )
)
