package com.example.swastik.data.specialities

val kidneySpecialistData = SpecialityDetailData(
    id = "kidney_specialist",
    title = "Kidney Specialist (Nephrologist)",
    subtitle = "Kidney Disease, Creatinine, Dialysis & Renal Care",
    heroDescription = "Consult leading kidney specialists and nephrologists for high creatinine management, Chronic Kidney Disease (CKD) staging, proteinuria, dialysis guidance, and kidney transplant second opinions.",
    trustBadges = listOf(
        "🫘 Renal & Kidney Health",
        "⚡ eGFR & Dialysis Management",
        "🛡️ 100% Verified DM / DNB Nephrology"
    ),
    aboutDescription = "A Kidney Specialist (Nephrologist) is a medical specialist dedicated to kidney health — diagnosing and treating kidney disease, systemic conditions affecting renal function (like diabetic nephropathy and hypertensive nephrosclerosis), electrolyte imbalances, dialysis management, and kidney transplantation.",
    symptoms = listOf(
        SpecialitySymptom("📈", "Elevated Serum Creatinine & Urea", "High creatinine levels (>1.2 mg/dL in women, >1.4 mg/dL in men) or rising blood urea nitrogen (BUN)"),
        SpecialitySymptom("🦶", "Swelling in Feet, Ankles & Face", "Fluid retention (edema) in lower legs, swollen eyelids in the morning (periorbital puffiness)"),
        SpecialitySymptom("🫧", "Foamy or Frothy Urine", "Excess protein (albuminuria / proteinuria) causing noticeable bubbling in urine"),
        SpecialitySymptom("🩸", "Blood in Urine (Hematuria)", "Tea-colored or reddish urine from glomerular filtration barrier inflammation"),
        SpecialitySymptom("🥱", "Chronic Fatigue & Metal Taste", "Loss of appetite, nausea, metallic taste in mouth, and uremic pruritus (itching)"),
        SpecialitySymptom("📉", "Reduced Urine Output (Oliguria)", "Significant drop in daily urine volume or difficulty passing normal amounts")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "🫘 Chronic & Acute Kidney Disease",
            items = listOf(
                "Chronic Kidney Disease (CKD Stages 1-5)",
                "Acute Kidney Injury (AKI / Sudden Renal Failure)",
                "Diabetic Kidney Disease (Diabetic Nephropathy)",
                "Hypertensive Nephrosclerosis & Renal Stenosis"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🫧 Glomerular & Proteinuria Disorders",
            items = listOf(
                "Nephrotic Syndrome & Minimal Change Disease",
                "Glomerulonephritis & IgA Nephropathy",
                "Lupus Nephritis (Systemic Lupus Erythematosus)",
                "Microalbuminuria & High Urine Protein Leakage"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "⚡ Dialysis & Renal Replacement",
            items = listOf(
                "Hemodialysis Prescription & AV Fistula Care",
                "Peritoneal Dialysis (CAPD / APD) Guidance",
                "Vascular Access & Dialysis Adequacy Review",
                "Anemia in CKD (Erythropoietin / Iron Therapy)"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🛡️ Polycystic Kidney & Transplantation",
            items = listOf(
                "Autosomal Dominant Polycystic Kidney Disease (ADPKD)",
                "Kidney Transplant Pre-Evaluation & Donor Screening",
                "Post-Transplant Immunosuppression Follow-up",
                "Electrolyte Disorders (Hyperkalemia / Hyponatremia)"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Renal History & Comorbidity Review", "Assessment of blood pressure control, diabetes duration, family kidney history, and NSAID/painkiller usage."),
        SpecialityConsultationStep("2", "Lab & eGFR Staging Evaluation", "Calculation of Estimated GFR (eGFR), review of Serum Creatinine, Electrolytes (Potassium/Sodium), and Serum Phosphorus/Calcium."),
        SpecialityConsultationStep("3", "Urine & Ultrasound KUB Review", "Interpretation of 24-hour urine protein, Spot Urine Protein-Creatinine Ratio (UPCR), and Kidney size/cortical echogenicity on Ultrasound."),
        SpecialityConsultationStep("4", "Renoprotective & Dietary Plan", "Prescription of SGLT2i / ARBs for kidney protection, blood pressure targets, and low-protein / low-potassium renal diet guidance.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "Can elevated creatinine be lowered or reversed?",
            answer = "If the rise in creatinine is due to Acute Kidney Injury (such as dehydration, medication toxicity, or infection), prompt treatment can often reverse creatinine to baseline. In Chronic Kidney Disease (CKD), timely nephrology care halts or significantly slows further progression."
        ),
        SpecialityFaqItem(
            question = "Why is high blood pressure damaging to kidneys?",
            answer = "High blood pressure causes the delicate blood vessels in the filtering units (nephrons) of the kidneys to narrow and harden over time, impairing their ability to filter toxins and waste from the blood."
        ),
        SpecialityFaqItem(
            question = "What dietary precautions are essential for kidney patients?",
            answer = "Patients with kidney impairment often need to moderate dietary protein, restrict dietary sodium (salt), limit high-potassium foods (like bananas, coconut water, citrus fruits), and regulate daily fluid intake under nephrologist advice."
        ),
        SpecialityFaqItem(
            question = "What test reports should I have ready for a kidney consultation?",
            answer = "Keep your latest Kidney Function Test (KFT - Creatinine, BUN, Uric Acid), Serum Electrolytes (Potassium, Sodium), Urine Routine/UPCR, and Ultrasound KUB report ready."
        )
    )
)
