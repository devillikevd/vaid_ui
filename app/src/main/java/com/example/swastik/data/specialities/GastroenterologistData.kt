package com.example.swastik.data.specialities

val gastroenterologistData = SpecialityDetailData(
    id = "gastroenterologist",
    title = "Gastroenterologist",
    subtitle = "Digestive Health, Liver, Stomach & Gut Specialist",
    heroDescription = "Consult leading gastro and liver specialists for relief from chronic acidity, GERD, gas, constipation, IBS, fatty liver, ulcers, and digestive ailments.",
    trustBadges = listOf(
        "🫄 Gut & Liver Health",
        "⚡ Endoscopy & Scan Reports",
        "🛡️ 100% Verified DM / DNB Gastro"
    ),
    aboutDescription = "A Gastroenterologist is a medical specialist dedicated to the health of the entire digestive system — including the esophagus, stomach, small intestine, colon, rectum, liver, pancreas, gallbladder, and biliary ducts.",
    symptoms = listOf(
        SpecialitySymptom("🔥", "Heartburn & Acidity (GERD)", "Burning sensation in chest or throat, sour burping, and regurgitation of food"),
        SpecialitySymptom("😣", "Stomach Pain & Cramping", "Upper abdominal fullness, sharp epigastric pain, bloating, or colic"),
        SpecialitySymptom("🚽", "Constipation & Irregular Stool", "Hard stools, straining, feeling of incomplete evacuation, or alternating diarrhea"),
        SpecialitySymptom("🫧", "Bloating & Excessive Gas", "Abdominal swelling after meals, flatulence, and indigestion"),
        SpecialitySymptom("🟡", "Jaundice & Pale Stool", "Yellowing of skin or eyes, dark urine, and elevated bilirubin"),
        SpecialitySymptom("🩸", "Blood in Stool or Vomit", "Dark tarry stools (melena), bright red rectal bleeding, or persistent nausea")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "🔥 Acid Peptic & Gastric Disorders",
            items = listOf(
                "Gastroesophageal Reflux Disease (GERD)",
                "Peptic & Duodenal Ulcers",
                "H. Pylori Bacterial Infection",
                "Chronic Gastritis & Dyspepsia"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🫄 Bowel & Intestinal Conditions",
            items = listOf(
                "Irritable Bowel Syndrome (IBS)",
                "Inflammatory Bowel Disease (Crohn's / Ulcerative Colitis)",
                "Celiac Disease & Gluten Sensitivity",
                "Small Intestinal Bacterial Overgrowth (SIBO)"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🟡 Liver & Biliary System Care",
            items = listOf(
                "Non-Alcoholic Fatty Liver Disease (NAFLD)",
                "Hepatitis (A, B, C, E) & Liver Cirrhosis",
                "Gallbladder Stones & Cholecystitis",
                "Elevated SGOT / SGPT & Liver Enzymes"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🛡️ Pancreas & Colorectal Wellness",
            items = listOf(
                "Acute & Chronic Pancreatitis",
                "Colonic Polyps & Colorectal Screening",
                "Chronic Constipation & Motility Disorders",
                "Lactose & Food Intolerance Evaluation"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Digestive History & Triggers", "Comprehensive analysis of your symptoms, meal habits, trigger foods, bowel movements, and medication history."),
        SpecialityConsultationStep("2", "Clinical Abdominal Review", "Assessment of pain localization, bloating patterns, liver tenderness, and nutritional status."),
        SpecialityConsultationStep("3", "Endoscopy & Lab Report Analysis", "Evaluation of Ultrasound Abdomen, Liver Function Tests (LFT), Endoscopy/Colonoscopy reports, or stool tests."),
        SpecialityConsultationStep("4", "Gut Healing Prescription", "Tailored treatment plan with acid reducers (PPIs), motility regulators, probiotics, enzymes, and gut-friendly nutrition.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "How can I tell the difference between normal gas and IBS?",
            answer = "Normal gas occurs occasionally and passes without significant distress. Irritable Bowel Syndrome (IBS) is a chronic disorder involving recurring abdominal cramping, bloating, and noticeable alterations in bowel habits (frequent loose motions or severe constipation) lasting weeks to months."
        ),
        SpecialityFaqItem(
            question = "Can Grade 1 or 2 Fatty Liver be reversed?",
            answer = "Yes! Early stages of Fatty Liver (Grade 1 & 2) are completely reversible with targeted weight management, a low-glycemic Mediterranean diet, regular aerobic exercise, and liver-supportive medical care."
        ),
        SpecialityFaqItem(
            question = "When is an Upper GI Endoscopy required?",
            answer = "An endoscopy is recommended if you have persistent acidity unresponsive to medicines, difficulty swallowing, unexplained weight loss, chronic vomiting, or signs of gastrointestinal bleeding."
        ),
        SpecialityFaqItem(
            question = "What tests should I keep ready for my gastro consultation?",
            answer = "Keep your recent Ultrasound Abdomen scan, Liver Function Test (LFT), Complete Blood Count (CBC), and any previous endoscopy reports ready for review."
        )
    )
)
