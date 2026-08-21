package com.example.swastik.data.specialities

val liverSpecialistData = SpecialityDetailData(
    id = "liver_specialist",
    title = "Liver Specialist (Hepatologist)",
    subtitle = "Hepatology, Fatty Liver, Cirrhosis & Liver Transplant Care",
    heroDescription = "Consult expert hepatologists for fatty liver (Grade 1-3), elevated SGOT/SGPT, viral hepatitis, jaundice, liver cirrhosis management, and liver transplant evaluations.",
    trustBadges = listOf(
        "🫀 Advanced Hepatology Care",
        "⚡ FibroScan & LFT Interpretation",
        "🛡️ 100% Verified DM / DNB Hepatology"
    ),
    aboutDescription = "A Hepatologist (Liver Specialist) is a super-specialized physician dedicated to the prevention, diagnosis, and medical management of diseases of the liver, gallbladder, biliary tree, and pancreas.",
    symptoms = listOf(
        SpecialitySymptom("🟡", "Jaundice (Yellow Eyes & Skin)", "Yellowing of sclera/skin, dark brownish-yellow urine, pale stools, and generalized itching"),
        SpecialitySymptom("📈", "Elevated SGOT / SGPT & Enzymes", "High liver transaminases, elevated Alkaline Phosphatase (ALP), or high Gamma-GT on blood tests"),
        SpecialitySymptom("🫄", "Abdominal Swelling & Fluid (Ascites)", "Progressive distension of the abdomen, bloating, and fluid retention in lower legs"),
        SpecialitySymptom("🥱", "Chronic Lethargy & Hepatic Fatigue", "Unremitting fatigue, loss of appetite, brain fog, nausea, and morning vomiting"),
        SpecialitySymptom("🩸", "Easy Bruising & Blood Vomiting", "Nosebleeds, spontaneous skin bruises, or vomiting of blood (esophageal varices)"),
        SpecialitySymptom("🧠", "Confusion & Sleep Inversion (HE)", "Altered sleep cycles, daytime drowsiness, flapping hand tremors, or forgetfulness")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "🫀 Metabolic & Fatty Liver Diseases",
            items = listOf(
                "Non-Alcoholic Fatty Liver Disease (NAFLD)",
                "Metabolic Dysfunction-Associated Steatohepatitis (MASH)",
                "Alcoholic Liver Disease (ALD) & Detoxification",
                "Drug-Induced Liver Injury (DILI)"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🟡 Viral & Autoimmune Hepatitis",
            items = listOf(
                "Chronic Hepatitis B & Viral Load Suppression",
                "Hepatitis C Curative Antiviral Therapy",
                "Autoimmune Hepatitis & Overlap Syndromes",
                "Primary Biliary Cholangitis (PBC) & PSC"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "⚡ Cirrhosis & Portal Hypertension Care",
            items = listOf(
                "Liver Cirrhosis (Compensated & Decompensated)",
                "Ascites & Spontaneous Bacterial Peritonitis (SBP)",
                "Esophageal Variceal Bleeding Prevention",
                "Hepatorenal Syndrome & Hepatic Encephalopathy"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🛡️ Liver Tumors & Transplantation",
            items = listOf(
                "Hepatocellular Carcinoma (HCC) Surveillance",
                "Liver Hemangiomas & Focal Nodular Hyperplasia",
                "Living & Deceased Donor Liver Transplant Evaluation",
                "Post-Transplant Immunosuppression Follow-up"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Liver History & Toxin Assessment", "Assessing alcohol intake history, herbal supplements, lipid levels, metabolic profile, and family liver background."),
        SpecialityConsultationStep("2", "FibroScan & Liver Function Review", "Evaluating Liver Stiffness Measurement (LSM in kPa), CAP score for steatosis, Albumin/Globulin ratio, and PT/INR."),
        SpecialityConsultationStep("3", "Ultrasound / CT Triple Phase Review", "Interpreting liver parenchymal echotexture, portal vein flow velocity, splenomegaly, and focal liver lesions."),
        SpecialityConsultationStep("4", "Liver Protection & Reversal Protocol", "Prescription of hepatoprotective medications, direct-acting antivirals, strict dietary roadmap, and surveillance intervals.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "Is Grade 2 or 3 Fatty Liver dangerous if left untreated?",
            answer = "Yes. If left unmanaged, fatty liver (steatosis) can progress to liver inflammation (steatohepatitis), causing irreversible scarring (fibrosis) and eventually liver cirrhosis or liver failure. Early intervention is completely reversible."
        ),
        SpecialityFaqItem(
            question = "What is a FibroScan test for the liver?",
            answer = "A FibroScan is a non-invasive, painless ultrasound-based elastography test that measures the stiffness of your liver (fibrosis) and the exact percentage of fat in liver cells (steatosis) within minutes."
        ),
        SpecialityFaqItem(
            question = "Can Hepatitis C be completely cured?",
            answer = "Yes! Modern Direct-Acting Antiviral (DAA) medications taken orally for 12 weeks cure over 95-98% of chronic Hepatitis C infections with minimal side effects."
        ),
        SpecialityFaqItem(
            question = "What blood reports are required before a liver consultation?",
            answer = "Keep your Liver Function Test (LFT), Hepatitis B (HBsAg), Hepatitis C (Anti-HCV), Complete Blood Count (CBC/Platelets), PT/INR, and Ultrasound Abdomen report ready."
        )
    )
)
