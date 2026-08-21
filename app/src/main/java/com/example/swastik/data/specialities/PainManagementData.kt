package com.example.swastik.data.specialities

val painManagementData = SpecialityDetailData(
    id = "pain_management",
    title = "Pain Management Specialist",
    subtitle = "Interventional Pain Physician, Chronic Pain & Nerve Block Specialist",
    heroDescription = "Consult expert interventional pain specialists for non-surgical relief from chronic back/neck pain, sciatica, trigeminal neuralgia, cancer pain, arthritis, and fibromyalgia.",
    trustBadges = listOf(
        "⚡ Interventional Pain Relief",
        "🛡️ Non-Surgical Nerve Blocks",
        "🩺 100% Verified MD / FIPM Pain Physicians"
    ),
    aboutDescription = "A Pain Management Specialist (Interventional Pain Physician) is a medical doctor who specializes in evaluating, diagnosing, and treating acute and chronic pain using advanced image-guided minimally invasive nerve blocks, radiofrequency ablation, and multimodal pharmacological regimens.",
    symptoms = listOf(
        SpecialitySymptom("⚡", "Chronic Intractable Back / Neck Pain", "Pain lasting longer than 3-6 months unresponsive to standard painkillers, physiotherapy, or rest"),
        SpecialitySymptom("⚡", "Shooting Nerve Pain (Sciatica / Neuralgia)", "Electric-like shocks, sharp stabbing pain, or burning sensation radiating down arms or legs"),
        SpecialitySymptom("👵", "Severe Joint Pain & Osteoarthritis", "Knee, hip, or shoulder joint pain when surgery is contraindicated or unwanted"),
        SpecialitySymptom("🎗️", "Cancer Pain & Breakthrough Pain", "Deep visceral, bony, or neuropathic pain caused by tumors requiring specialized palliative analgesia"),
        SpecialitySymptom("🌩️", "Trigeminal Neuralgia & Facial Pain", "Excruciating lightning-bolt facial shocks triggered by light touch, brushing, or chewing"),
        SpecialitySymptom("🌪️", "Widespread Body Pain (Fibromyalgia)", "Diffuse muscular aching, multiple tender trigger points, fatigue, and sleep disturbance")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "⚡ Spine & Interventional Nerve Blocks",
            items = listOf(
                "Transforaminal Epidural Injections (TFESI) for Sciatica",
                "Facet Joint Injections & Medial Branch Blocks",
                "Radiofrequency Ablation (RFA) for Chronic Back/Neck Pain",
                "Sacroiliac (SI) Joint Injections & Denervation"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🦴 Joint & Musculoskeletal Pain Therapies",
            items = listOf(
                "Genicular Nerve Block & RFA for Knee Arthritis",
                "Intra-Articular Hyaluronic Acid / PRP Joint Injections",
                "Suprascapular Nerve Block for Frozen Shoulder",
                "Trigger Point Injections for Myofascial Pain Syndrome"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🌩️ Neuropathic & Facial Pain Care",
            items = listOf(
                "Trigeminal Neuralgia Gasserian Ganglion Block",
                "Post-Herpetic Neuralgia (Shingles Nerve Pain)",
                "Complex Regional Pain Syndrome (CRPS / RSD)",
                "Occipital Nerve Blocks for Chronic Migraines"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🛡️ Cancer Pain & Advanced Neuromodulation",
            items = listOf(
                "Celiac Plexus & Splanchnic Nerve Block for Abdominal Cancer",
                "Superior Hypogastric Plexus Block for Pelvic Pain",
                "Intrathecal Targeted Drug Delivery Pumps",
                "Spinal Cord Stimulation (SCS) Guidance"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Pain Mapping & Score Assessment", "Detailed localization of pain generators, severity scale (1-10), aggravating factors, and functional impact."),
        SpecialityConsultationStep("2", "MRI & Diagnostic Imaging Review", "Correlating Spine MRI, X-rays, or CT scans directly with physical nerve root dermatomes and facet levels."),
        SpecialityConsultationStep("3", "Interventional Procedure Selection", "Recommending fluoroscopy/ultrasound-guided targeted blocks or radiofrequency ablation (RFA) to stop pain signals."),
        SpecialityConsultationStep("4", "Multimodal Rehabilitation Plan", "Tailored non-addictive nerve medications, gentle functional rehabilitation, and pain-free living strategies.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "How does an interventional nerve block provide pain relief?",
            answer = "Using real-time X-ray (fluoroscopy) or ultrasound guidance, a tiny needle delivers targeted anti-inflammatory and numbing medication directly onto the irritated nerve root or joint capsule, extinguishing pain at its exact origin without systemic side effects."
        ),
        SpecialityFaqItem(
            question = "What is Radiofrequency Ablation (RFA) for back pain?",
            answer = "Radiofrequency Ablation uses gentle heat energy to temporarily deactivate the sensory nerves transmitting pain from arthritic spine joints (facet joints) or knees, providing long-lasting pain relief for 9 to 18 months."
        ),
        SpecialityFaqItem(
            question = "Are pain management injections painful to undergo?",
            answer = "The procedure is performed under local anesthesia with light sedation if needed. Most patients experience only minimal discomfort, comparable to a routine injection, and can walk home within 1-2 hours."
        ),
        SpecialityFaqItem(
            question = "What documents should I have ready for my pain specialist consultation?",
            answer = "Have your recent Spine MRI / CT scans / Joint X-rays, list of all pain medications tried in the past, and a clear description of when the pain is at its worst."
        )
    )
)
