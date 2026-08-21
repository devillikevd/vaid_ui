package com.example.swastik.data.specialities

val hairTransplantData = SpecialityDetailData(
    id = "hair_transplant",
    title = "Hair Transplant & Restoration Surgeon",
    subtitle = "FUE, DHI, Hair Loss & Scalp Restoration Specialist",
    heroDescription = "Consult leading hair transplant surgeons and trichologists for natural hairline design, FUE/DHI transplant evaluation, graft count estimations, PRP/GFC therapy, and baldness reversal.",
    trustBadges = listOf(
        "💇 Natural Hairline Restoration",
        "⚡ Advanced FUE & DHI Protocols",
        "🛡️ Board-Certified Hair Restoration Surgeons"
    ),
    aboutDescription = "A Hair Transplant and Restoration Surgeon is a specialized cosmetic and dermatologic surgeon expert in surgical follicular unit extraction (FUE), direct hair implantation (DHI), medical trichology, and biological regenerative therapies for male and female pattern baldness.",
    symptoms = listOf(
        SpecialitySymptom("👴", "Receding Hairline & M-Pattern", "Gradual recession of temporal peaks, widening forehead, and thinning at the frontal hairline (Norwood Scale 2-4)"),
        SpecialitySymptom("🌀", "Crown & Vertex Balding", "Thinning spot at the top-back of the scalp, visible scalp skin through hair"),
        SpecialitySymptom("📉", "Diffuse Hair Thinning & Widening Part", "Gradual reduction in overall hair density, widening center partition line in women (Ludwig Scale)"),
        SpecialitySymptom("🚿", "Excessive Daily Hair Shedding", "Losing more than 100-150 strands daily, hair accumulation on pillow and shower drain"),
        SpecialitySymptom("🩹", "Previous Unnatural Hairline / Scars", "Pluggy hairline, depleted donor area, or visible linear strip scar from past surgeries"),
        SpecialitySymptom("🧔", "Patchy Beard or Eyebrow Loss", "Sparse facial hair, gaps in beard growth, or loss of outer third of eyebrows")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "💇 Surgical Hair Restoration Techniques",
            items = listOf(
                "Follicular Unit Extraction (Sapphire FUE)",
                "Direct Hair Implantation (DHI / Choi Pen)",
                "Beard & Moustache Hair Restoration",
                "Eyebrow Reconstruction & Micro-Grafts"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🔬 Regenerative & Biological Therapies",
            items = listOf(
                "Platelet-Rich Plasma (PRP) Therapy",
                "Growth Factor Concentrate (GFC) Injections",
                "Low-Level Laser Light Therapy (LLLT)",
                "Exosome Scalp Regeneration Therapy"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "💊 Medical Trichology & Stabilisation",
            items = listOf(
                "Male Androgenetic Alopecia (AGA) Medical Regimen",
                "Female Pattern Hair Loss (FPHL) Therapy",
                "Topical & Oral Minoxidil / Finasteride Protocols",
                "Nutritional & DHT-Blocker Formulations"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🛡️ Corrective & Donor Area Management",
            items = listOf(
                "Donor Area Density & Safe Donor Zone Mapping",
                "Revision & Repair of Previous Unnatural Transplants",
                "Scalp Micropigmentation (SMP) Guidance",
                "Trichoscopy Scalp Examination"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Hair Loss History & Genetic Mapping", "Assessing onset of thinning, family baldness patterns, medical background, and previous treatments tried."),
        SpecialityConsultationStep("2", "Trichoscopy & Donor Density Analysis", "Virtual assessment of scalp images, donor area follicles/cm², miniaturization percentage, and graft requirement."),
        SpecialityConsultationStep("3", "Hairline Design & Graft Estimation", "Personalized hairline planning tailored to facial proportions, temple angles, and long-term donor preservation."),
        SpecialityConsultationStep("4", "Procedure & Post-Op Maintenance Protocol", "Detailed walkthrough of the procedure, healing timeline (scab shedding at day 10, growth at month 4-12), and medical maintenance.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "Is hair transplant permanent, and will transplanted hair fall out?",
            answer = "Transplanted hair follicles are harvested from the safe donor area (back and sides of head), which are genetically resistant to DHT hormones. Once transplanted and healed, these follicles grow naturally for a lifetime."
        ),
        SpecialityFaqItem(
            question = "What is the difference between FUE and DHI techniques?",
            answer = "In Sapphire FUE, micro-slits/channels are created in the recipient area first, and grafts are placed manually. In DHI, each graft is loaded into a specialized implanter pen (Choi Pen) and implanted directly in one step, allowing higher density and precise angle control."
        ),
        SpecialityFaqItem(
            question = "How many grafts will I need for my hair transplant?",
            answer = "Graft requirements depend on your stage of baldness. Frontal hairline restoration typically requires 1,500-2,500 grafts, while larger areas covering frontal and crown balding may need 3,500-4,500 grafts."
        ),
        SpecialityFaqItem(
            question = "When can I resume normal work and exercise after a hair transplant?",
            answer = "Most patients return to desk work in 3 to 4 days. Light walking can begin on day 2, while heavy gym workouts, swimming, and helmet-wearing should be avoided for 3 to 4 weeks."
        )
    )
)
