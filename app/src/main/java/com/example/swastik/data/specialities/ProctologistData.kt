package com.example.swastik.data.specialities

val proctologistData = SpecialityDetailData(
    id = "proctologist",
    title = "Proctologist (Colorectal & Anorectal Specialist)",
    subtitle = "Piles, Fissure, Fistula, Pilonidal Sinus & Laser Anorectal Surgery",
    heroDescription = "Consult expert proctologists for painless laser treatment of piles (hemorrhoids), anal fissures, complex fistulas, pilonidal sinus, and chronic perianal pain.",
    trustBadges = listOf(
        "🩹 Advanced Laser Proctology",
        "⚡ Painless Same-Day Procedures",
        "🛡️ 100% Verified MS / DNB / Colorectal Surgeons"
    ),
    aboutDescription = "A Proctologist (Anorectal and Colorectal Specialist) is a surgical expert dedicated to disorders of the rectum, anus, and perianal region — providing gentle, advanced medical care and stitchless laser procedures for piles, fissures, fistulas, and abscesses.",
    symptoms = listOf(
        SpecialitySymptom("🩸", "Bright Red Rectal Bleeding", "Blood drops in the toilet bowl or on toilet paper during or after bowel movements (Piles / Fissure)"),
        SpecialitySymptom("⚡", "Excruciating Pain During Defecation", "Severe burning, knife-like sharp pain during bowel movements lasting hours (Anal Fissure)"),
        SpecialitySymptom("💧", "Perianal Pus Discharge & Boils", "Recurrent boiling lump near the anus with pus or blood drainage (Anal Fistula)"),
        SpecialitySymptom("🍇", "Prolapsed Lump at the Anus", "Fleshy grape-like mass protruding during straining that may need manual repositioning"),
        SpecialitySymptom("🪵", "Tailbone Pain & Swelling (Pilonidal)", "Swelling, pain, and hair discharge at the upper crease of buttocks near tailbone"),
        SpecialitySymptom("😣", "Severe Perianal Itching & Burning", "Intense pruritus ani, skin irritation, and wetness around the anal area")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "🍇 Piles / Hemorrhoids Care",
            items = listOf(
                "Internal & External Hemorrhoids (Grades 1-4)",
                "Laser Hemorrhoidoplasty (LHP - Stitchless)",
                "Rubber Band Ligation & Infrared Coagulation",
                "Thrombosed External Hemorrhoids Management"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "⚡ Anal Fissures & Spasms",
            items = listOf(
                "Acute & Chronic Anal Fissures",
                "Laser Sphincterolysis & Fissurectomy",
                "Topical Glyceryl Trinitrate / Diltiazem Creams",
                "Anal Botulinum Toxin Injections for Spasm"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "💧 Anal Fistula & Perianal Abscess",
            items = listOf(
                "High & Low Anal Fistulas (Intersphincteric / Transsphincteric)",
                "FiLaC (Fistula-tract Laser Closure)",
                "LIFT (Ligation of Intersphincteric Fistula Tract)",
                "Ksharasutra & Seton Placement"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🪵 Pilonidal Sinus & Rectal Prolapse",
            items = listOf(
                "Laser Pilonidal Sinus Treatment (SiLaC / EPSiT)",
                "Full-Thickness Rectal Prolapse Evaluation",
                "Rectal Polyps & Proctitis Care",
                "Dietary Fiber & Chronic Constipation Management"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Anorectal Symptom History", "Detailed assessment of bleeding frequency, pain severity, bowel hardness, sitting comfort, and duration of symptoms."),
        SpecialityConsultationStep("2", "Condition Classification & Staging", "Accurate differentiation between piles grade, acute vs chronic fissure, or fistula tract complexity."),
        SpecialityConsultationStep("3", "Medical vs Laser Procedure Evaluation", "Prescribing stool softeners, sitz bath routines, healing ointments, or scheduling minimally invasive laser treatment."),
        SpecialityConsultationStep("4", "Painless Recovery & Bowel Hygiene Plan", "Comprehensive post-treatment guidance on high-fiber diet, hydration, and preventing recurrence.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "How is Laser Piles surgery better than traditional open surgery?",
            answer = "Laser piles surgery (LHP) uses focused laser energy to shrink hemorrhoids from the inside without cutting or stitching the sensitive anal skin. It results in almost zero pain, no open wounds, minimal bleeding, and discharge within 24 hours."
        ),
        SpecialityFaqItem(
            question = "Can an anal fissure heal without surgery?",
            answer = "Over 80% of acute anal fissures heal with a high-fiber diet, plenty of water, warm water sitz baths twice daily, and prescribed muscle-relaxing ointments (like Diltiazem) within 2-4 weeks."
        ),
        SpecialityFaqItem(
            question = "Why does an anal fistula require surgical intervention?",
            answer = "An anal fistula is an abnormal tunnel connecting an infected gland inside the anus to an external opening on the skin. Because it continuously re-infects, medications alone cannot close the tunnel; definitive laser closure (FiLaC) or surgery is required."
        ),
        SpecialityFaqItem(
            question = "What immediate relief steps can I take at home?",
            answer = "Take warm water sitz baths (sitting in warm water for 10-15 mins), take prescribed stool softeners, avoid sitting on the toilet for prolonged periods, and avoid spicy or oily foods."
        )
    )
)
