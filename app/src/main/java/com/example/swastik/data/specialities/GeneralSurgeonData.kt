package com.example.swastik.data.specialities

val generalSurgeonData = SpecialityDetailData(
    id = "general_surgeon",
    title = "General Surgeon",
    subtitle = "Surgical Specialist, Hernia, Appendix & Wound Care",
    heroDescription = "Consult expert general and laparoscopic surgeons for pre-surgical evaluation, second opinions on hernia, appendix, gallbladder stones, piles, cysts, and wound healing.",
    trustBadges = listOf(
        "🔪 Surgical & Laparoscopic Care",
        "⚡ Second Opinion on Surgeries",
        "🛡️ 100% Verified MS / DNB Surgery"
    ),
    aboutDescription = "A General Surgeon is a surgically trained specialist who manages a wide spectrum of surgical conditions involving the abdomen, digestive tract, hernia repairs, endocrine glands, soft tissue lumps, and wound care.",
    symptoms = listOf(
        SpecialitySymptom("⚡", "Bulge or Lump in Groin / Abdomen", "Visible bulge that increases when coughing or standing and disappears when lying down (Hernia)"),
        SpecialitySymptom("🤢", "Right Lower Abdominal Pain", "Sudden sharp pain starting near the navel and shifting to the right lower abdomen (Appendicitis)"),
        SpecialitySymptom("🫓", "Right Upper Abdomen Pain", "Severe pain under right ribs after fatty meals radiating to the back (Gallbladder issue)"),
        SpecialitySymptom("🩸", "Painful Bowel Movement & Bleeding", "Lump, pain, or bleeding during defecation (Piles / Hemorrhoids, Fissure, or Fistula)"),
        SpecialitySymptom("🔴", "Painful Skin Swelling & Abscess", "Tender, red, pus-filled boils, carbuncles, or cysts needing drainage or excision"),
        SpecialitySymptom("🩹", "Non-Healing Ulcer or Wound", "Diabetic foot sores, chronic ulcers, or infected post-surgical wounds")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "🛡️ Hernia & Abdominal Wall Care",
            items = listOf(
                "Inguinal (Groin) & Femoral Hernia",
                "Umbilical & Paraumbilical Hernia",
                "Incisional (Post-Surgery) Hernia",
                "Laparoscopic Mesh Repair Guidance"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🫓 Gallbladder & Appendix Surgery",
            items = listOf(
                "Laparoscopic Cholecystectomy (Gallbladder Removal)",
                "Acute & Chronic Appendicitis",
                "Biliary Colic & Sludge Management",
                "Post-Operative Recovery Protocols"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🩸 Proctology & Anorectal Conditions",
            items = listOf(
                "Piles / Hemorrhoids (Grades 1-4 & Laser Therapy)",
                "Anal Fissures & Severe Spasm",
                "Anal Fistula & Pilonidal Sinus Excision",
                "Perianal Abscess Drainage"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🩹 Soft Tissue, Thyroid & Wound Care",
            items = listOf(
                "Lipoma, Sebaceous Cyst & Ganglion Excision",
                "Thyroid Nodules & Goiter Evaluation",
                "Diabetic Foot Ulcer Debridement",
                "Burn Wound Healing & Suture Management"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Surgical History & Symptom Review", "Detailed evaluation of lump appearance, pain triggers, bowel changes, and previous operations."),
        SpecialityConsultationStep("2", "Scan & Diagnostic Assessment", "Review of Ultrasound Abdomen, CT scans, Blood Tests, and previous discharge summaries."),
        SpecialityConsultationStep("3", "Surgical vs Non-Surgical Evaluation", "Clear expert opinion on whether surgery is essential, elective, or manageable medically."),
        SpecialityConsultationStep("4", "Procedure & Post-Op Recovery Plan", "Guidance on laparoscopic vs open options, hospital stay duration, wound care, and diet.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "Can a hernia heal on its own with medications or exercises?",
            answer = "No. A hernia is a physical anatomical defect (a hole or tear in the muscle wall) where tissue protrudes. Exercises or medicines cannot close the muscle opening; surgical repair with mesh is the definitive cure."
        ),
        SpecialityFaqItem(
            question = "What is the advantage of Laparoscopic (keyhole) surgery over open surgery?",
            answer = "Laparoscopic surgery uses tiny incisions (5-10mm), resulting in significantly less post-operative pain, minimal blood loss, smaller scars, and a much faster return to normal activities (often within 3-5 days)."
        ),
        SpecialityFaqItem(
            question = "Are piles (hemorrhoids) treatable without open surgery?",
            answer = "Yes! Early-stage piles (Grade 1 & 2) respond well to high-fiber diets, stool softeners, and sitz baths. Advanced piles can be treated with painless, minimally invasive laser procedures."
        ),
        SpecialityFaqItem(
            question = "What should I bring for a surgical consultation?",
            answer = "Bring all recent Ultrasound / CT scan reports, Blood reports (Complete Blood Count, PT/INR), and any previous surgery discharge summaries."
        )
    )
)
