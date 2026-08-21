package com.example.swastik.data.specialities

val neurologistData = SpecialityDetailData(
    id = "neurologist",
    title = "Neurologist",
    subtitle = "Brain, Spine & Nervous System Specialist",
    heroDescription = "Consult expert neurologists for diagnosis and clinical management of migraines, chronic headaches, epilepsy/seizures, neuropathy, stroke recovery, and movement disorders.",
    trustBadges = listOf(
        "🧠 Brain & Nerve Care",
        "⚡ EEG & MRI Report Review",
        "🛡️ 100% Verified DM / DNB Neurology"
    ),
    aboutDescription = "A Neurologist is a physician specialized in diagnosing, managing, and treating disorders of the central and peripheral nervous system — including the brain, spinal cord, cranial nerves, peripheral nerves, and muscles. They address both acute neurological episodes and chronic neuro-degenerative conditions.",
    symptoms = listOf(
        SpecialitySymptom("⚡", "Severe Migraine & Headaches", "Throbbing unilateral headaches, aura, nausea, and light/sound sensitivity"),
        SpecialitySymptom("⚡", "Seizures & Blackouts", "Sudden involuntary convulsions, staring spells, or temporary loss of awareness"),
        SpecialitySymptom("🦶", "Numbness & Tingling", "Pins-and-needles sensation, loss of feeling, or burning pain in hands and feet"),
        SpecialitySymptom("🌀", "Dizziness & Vertigo", "Room-spinning sensation, unsteadiness while walking, or frequent balance loss"),
        SpecialitySymptom("💪", "Muscle Weakness & Tremors", "Shakiness in hands, stiffness, facial drooping, or sudden limb weakness"),
        SpecialitySymptom("🧠", "Memory Loss & Confusion", "Forgetfulness, difficulty finding words, disorientation, or cognitive decline")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "🧠 Headache & Migraine Disorders",
            items = listOf(
                "Chronic Migraine with/without Aura",
                "Tension-type & Cluster Headaches",
                "Trigeminal Neuralgia & Facial Pain",
                "Medication Overuse Headaches"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "⚡ Seizure & Cerebrovascular Care",
            items = listOf(
                "Epilepsy & Seizure Disorders",
                "Ischemic & Hemorrhagic Stroke Recovery",
                "Transient Ischemic Attack (TIA)",
                "Post-Stroke Spasticity & Rehab"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🧬 Neuropathies & Movement Disorders",
            items = listOf(
                "Diabetic & Peripheral Neuropathy",
                "Parkinson's Disease & Tremors",
                "Multiple Sclerosis (MS)",
                "Bell's Palsy & Facial Nerve Paralysis"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🛡️ Spine & Cognitive Conditions",
            items = listOf(
                "Cervical & Lumbar Radiculopathy",
                "Alzheimer's Disease & Dementia",
                "Myasthenia Gravis & Muscle Dystrophy",
                "Restless Leg Syndrome & Sleep Disorders"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Neurological Symptom History", "Detailed review of headache frequency, seizure episodes, tingling patterns, and family medical history."),
        SpecialityConsultationStep("2", "Nerve & Cognitive Assessment", "Evaluation of motor reflexes, balance, sensory perception, cranial nerves, and cognitive alertness."),
        SpecialityConsultationStep("3", "Scan & Neuro-Test Review", "In-depth interpretation of Brain/Spine MRI, CT scans, EEG recordings, or Nerve Conduction Studies (NCV/EMG)."),
        SpecialityConsultationStep("4", "Custom Neuro-Therapy Plan", "Prescription of neuromodulators, anti-epileptic medications, migraine abortive/preventive therapies, and physiotherapy advice.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "How is a migraine different from a regular tension headache?",
            answer = "Migraines are typically intense, throbbing, one-sided headaches often accompanied by nausea, vomiting, and sensitivity to light and sound, lasting from 4 to 72 hours. Regular tension headaches feel like a tight band around the head without throbbing or nausea."
        ),
        SpecialityFaqItem(
            question = "What should I do if someone near me has a seizure?",
            answer = "Gently place them on their side in a recovery position to keep their airway clear, clear the area of hard or sharp objects, do not put anything in their mouth, time the seizure, and seek immediate emergency care if it lasts longer than 5 minutes."
        ),
        SpecialityFaqItem(
            question = "Can diabetic nerve pain (neuropathy) be cured?",
            answer = "While nerve damage cannot be entirely reversed, diabetic neuropathy pain, burning, and tingling can be greatly minimized through strict blood sugar control, neuro-protective vitamins, and targeted neuropathy medications."
        ),
        SpecialityFaqItem(
            question = "What reports should I bring for a neurological consultation?",
            answer = "Bring any past MRI/CT scans of the brain or spine, EEG reports, Nerve Conduction Studies (NCV/EMG), blood sugar records, and a diary log of your headache or seizure episodes."
        )
    )
)
