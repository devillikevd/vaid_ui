package com.example.swastik.data.specialities

val laparoscopicSurgeonData = SpecialityDetailData(
    id = "laparoscopic_surgeon",
    title = "Laparoscopic & Minimal Access Surgeon",
    subtitle = "Keyhole Surgery, Gallbladder, Hernia & Bariatric Specialist",
    heroDescription = "Consult expert laparoscopic and robotic surgeons for keyhole gallbladder stone removal, hernia repairs (TEP/TAPP), appendectomy, bariatric weight-loss surgery, and rapid recovery.",
    trustBadges = listOf(
        "🔬 Keyhole & Robotic Surgery",
        "⚡ Rapid 24-48 Hr Recovery",
        "🛡️ 100% Verified MS / DNB / FMAS Surgeons"
    ),
    aboutDescription = "A Laparoscopic Surgeon (Minimal Access Surgeon) specializes in performing abdominal and pelvic surgical operations through tiny incisions (5-10 mm) using high-definition video cameras and specialized precision instruments, minimizing surgical trauma and recovery time.",
    symptoms = listOf(
        SpecialitySymptom("🫓", "Right Upper Abdomen Pain & Stones", "Severe pain under the right rib cage after meals, nausea, and indigestion caused by Gallbladder Calculi"),
        SpecialitySymptom("⚡", "Groin / Abdominal Bulge (Hernia)", "Painless or aching swelling in the groin, navel, or old surgical scar that enlarges with coughing"),
        SpecialitySymptom("🤢", "Acute Lower Right Abdomen Pain", "Sudden sharp pain starting around navel and migrating to right iliac fossa (Appendicitis)"),
        SpecialitySymptom("⚖️", "Morbid Obesity (BMI >35-40)", "Severe weight issues unresponsive to diet and exercise with associated diabetes and sleep apnea"),
        SpecialitySymptom("🔥", "Severe Acid Reflux & Hiatus Hernia", "Chronic heartburn, regurgitation of acid while lying down, and chest discomfort"),
        SpecialitySymptom("🩸", "Intestinal Obstruction & Adhesions", "Severe abdominal bloating, inability to pass gas or stool, and persistent vomiting")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "🫓 Gallbladder & Biliary Laparoscopy",
            items = listOf(
                "Laparoscopic Cholecystectomy (Gallstone Removal)",
                "Gallbladder Polyps & Chronic Cholecystitis",
                "Common Bile Duct (CBD) Exploration",
                "Single-Incision Laparoscopic Surgery (SILS)"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "⚡ Advanced Hernia Repair (Laparoscopic / Robotic)",
            items = listOf(
                "Laparoscopic Inguinal Hernia (TEP & TAPP Repair)",
                "Ventral & Umbilical Hernia Mesh Repair (IPOM)",
                "Complex Incisional Hernia & TAR Procedure",
                "Hiatal Hernia & Laparoscopic Nissen Fundoplication"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "⚖️ Bariatric & Metabolic Surgery",
            items = listOf(
                "Laparoscopic Sleeve Gastrectomy",
                "Roux-en-Y Gastric Bypass (RYGB)",
                "Metabolic Surgery for Type 2 Diabetes Remission",
                "Post-Bariatric Nutrition & Weight Maintenance"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🛡️ Emergency & GI Laparoscopy",
            items = listOf(
                "Laparoscopic Appendectomy (Stitchless)",
                "Diagnostic Laparoscopy & Adhesiolysis",
                "Laparoscopic Perforated Peptic Ulcer Repair",
                "Colorectal Resection & Laparoscopic Colectomy"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Surgical Symptoms & Scan Intake", "Evaluating pain episodes, Ultrasound Abdomen findings, CT abdomen scans, and prior surgery history."),
        SpecialityConsultationStep("2", "Surgical Indication & Approach Selection", "Determining eligibility for laparoscopic or robotic keyhole approach over conventional open surgery."),
        SpecialityConsultationStep("3", "Pre-Operative Fitness Evaluation", "Reviewing routine pre-anesthetic checkup tests (ECG, CBC, Chest X-ray, LFT/KFT, Coagulation)."),
        SpecialityConsultationStep("4", "Hospital Stay & Post-Op Recovery Plan", "Clear guidance on 24-48 hour discharge, pain management, dietary progression, and return to work.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "Why is Laparoscopic surgery preferred over open surgery?",
            answer = "Laparoscopic surgery uses 3-4 tiny punctures (0.5 to 1 cm) instead of a large incision. This results in far less post-operative pain, minimal blood loss, almost no visible scarring, and patients can usually walk on the same day and return to work within 3 to 7 days."
        ),
        SpecialityFaqItem(
            question = "Is it safe to remove the entire gallbladder for gallstones?",
            answer = "Yes. The gallbladder merely stores bile produced by the liver. After removal (Cholecystectomy), the liver continues to produce bile, which flows directly into the small intestine, allowing normal digestion without any long-term restriction."
        ),
        SpecialityFaqItem(
            question = "Who qualifies for Bariatric (Weight Loss) Surgery?",
            answer = "Candidates typically have a BMI of 35 or above (or BMI >30 with associated medical conditions like Type 2 diabetes, high blood pressure, or sleep apnea) who haven't achieved lasting weight loss through diet and exercise."
        ),
        SpecialityFaqItem(
            question = "What investigations should I have ready for the laparoscopic surgeon?",
            answer = "Bring your Ultrasound Abdomen & Pelvis report, any CT scan films/reports, blood test panel (CBC, LFT, KFT, Blood Sugar), and past surgical records."
        )
    )
)
