package com.example.swastik.data.specialities

val rheumatologistData = SpecialityDetailData(
    id = "rheumatologist",
    title = "Rheumatologist",
    subtitle = "Arthritis, Autoimmune Diseases & Joint Inflammation Specialist",
    heroDescription = "Consult expert rheumatologists for Rheumatoid Arthritis, Lupus (SLE), Ankylosing Spondylitis, Gout, Psoriatic Arthritis, chronic joint stiffness, and autoimmune care.",
    trustBadges = listOf(
        "🦴 Autoimmune & Joint Health",
        "⚡ DMARDs & Biologic Therapy",
        "🛡️ 100% Verified DM / DNB Rheumatology"
    ),
    aboutDescription = "A Rheumatologist is a specialized internal medicine physician who focuses on diagnosing and managing autoimmune and inflammatory musculoskeletal diseases — conditions where the immune system mistakenly attacks healthy joints, muscles, bones, and connective tissues.",
    symptoms = listOf(
        SpecialitySymptom("🌅", "Morning Joint Stiffness (>30-60 Mins)", "Stiffness and difficulty closing fists or bending knees upon waking up in the morning"),
        SpecialitySymptom("🔥", "Warm, Swollen & Painful Joints", "Symmetrical swelling in knuckles, wrists, knees, or ankles accompanied by warmth and pain"),
        SpecialitySymptom("🪵", "Severe Back Stiffness at Rest", "Lower back and buttock pain that worsens during rest/sleep and improves with movement (Ankylosing Spondylitis)"),
        SpecialitySymptom("🦶", "Excruciating Big Toe Pain & Gout", "Sudden intense burning pain, redness, and swelling at the base of the big toe after high-purine meals"),
        SpecialitySymptom("🦋", "Butterfly Facial Rash & Sun Sensitivity", "Red rash across bridge of nose and cheeks, mouth ulcers, hair loss, and joint pain (Lupus / SLE)"),
        SpecialitySymptom("❄️", "Color Changes in Fingers with Cold", "Fingers turning pale white, blue, and then red in cold weather (Raynaud's phenomenon)")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "🦴 Inflammatory Arthritis Care",
            items = listOf(
                "Rheumatoid Arthritis (Seropositive & Seronegative)",
                "Ankylosing Spondylitis & Axial Spondyloarthritis",
                "Psoriatic Arthritis & Dactylitis (Sausage Digits)",
                "Juvenile Idiopathic Arthritis (JIA in Children)"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🦋 Systemic Autoimmune & Connective Tissue",
            items = listOf(
                "Systemic Lupus Erythematosus (Lupus / SLE)",
                "Sjögren's Syndrome (Severe Dry Eyes & Mouth)",
                "Systemic Sclerosis (Scleroderma)",
                "Mixed Connective Tissue Disease (MCTD)"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🦶 Crystal & Muscle Disorders",
            items = listOf(
                "Gout & Hyperuricemia (High Uric Acid)",
                "Pseudogout (CPPD Disease)",
                "Polymyalgia Rheumatica & Dermatomyositis",
                "Fibromyalgia & Central Pain Sensitization"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🛡️ Advanced Immunotherapy & Biologics",
            items = listOf(
                "DMARDs (Methotrexate, Sulfasalazine, Leflunomide)",
                "Targeted Biologics (Anti-TNF, Interleukin Blockers)",
                "JAK Inhibitors for Autoimmune Control",
                "Joint Injection & Synovial Fluid Guidance"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Joint & Autoimmune Intake", "Detailed evaluation of joint swelling patterns, morning stiffness duration, skin rashes, and family autoimmune history."),
        SpecialityConsultationStep("2", "Autoimmune Serology Review", "Interpretation of RA Factor, Anti-CCP, ANA (IFA profile), HLA-B27, Serum Uric Acid, and ESR / CRP."),
        SpecialityConsultationStep("3", "Disease Activity Score & Joint Preservation", "Assessment of DAS28 score to evaluate active joint inflammation and prevent permanent joint erosions."),
        SpecialityConsultationStep("4", "Custom DMARD / Biologic Regimen", "Prescription of disease-modifying antirheumatic drugs (DMARDs), NSAIDs, and joint preservation exercises.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "How is Rheumatoid Arthritis different from Osteoarthritis?",
            answer = "Osteoarthritis is a mechanical 'wear-and-tear' breakdown of joint cartilage common with aging. Rheumatoid Arthritis is an autoimmune disease where the immune system attacks joint linings, causing symmetrical swelling, morning stiffness, and systemic inflammation."
        ),
        SpecialityFaqItem(
            question = "Can early diagnosis prevent permanent joint deformities?",
            answer = "Yes! Starting Disease-Modifying Antirheumatic Drugs (DMARDs) during the 'window of opportunity' (within the first few months of symptom onset) can achieve clinical remission and completely prevent joint damage and deformity."
        ),
        SpecialityFaqItem(
            question = "How should high uric acid and gout attacks be managed?",
            answer = "Acute gout attacks require anti-inflammatory medicines (like Colchicine/NSAIDs). Long-term uric acid lowering drugs (like Febuxostat/Allopurinol) prevent future painful attacks, combined with reducing red meat, alcohol, and high-fructose drinks."
        ),
        SpecialityFaqItem(
            question = "What test reports should I have ready for a rheumatology consultation?",
            answer = "Bring your latest ESR, CRP, RA Factor, Anti-CCP, ANA profile, HLA-B27, Serum Uric Acid, and any X-rays or MRIs of painful joints."
        )
    )
)
