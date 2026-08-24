package com.example.swastik.data.specialities

val psychiatristData = SpecialityDetailData(
    id = "psychiatrist",
    title = "Psychiatrist",
    subtitle = "Mental Health, Mood, Sleep & Emotional Wellness Specialist",
    heroDescription = "Confidential, compassionate, and clinically advanced consultations with certified psychiatrists for anxiety, depression, insomnia, stress, ADHD, and emotional well-being.",
    trustBadges = listOf(
        "🧠 100% Confidential & Secure",
        "⚡ Video & In-Clinic Sessions",
        "🛡️ Verified MD / DPM Psychiatry"
    ),
    aboutDescription = "A Psychiatrist is a licensed medical doctor specialized in psychiatric medicine — diagnosing, managing, and treating behavioral, emotional, mood, and mental health conditions. They provide comprehensive care combining clinical medication management, psychotherapy, and lifestyle guidance.",
    symptoms = listOf(
        SpecialitySymptom("😔", "Persistent Sadness & Low Mood", "Loss of interest in daily activities, feeling hopeless, or unexplained crying spells"),
        SpecialitySymptom("😰", "Severe Anxiety & Panic Attacks", "Racing thoughts, restlessness, excessive worry, rapid heartbeat, and shortness of breath"),
        SpecialitySymptom("😴", "Insomnia & Sleep Disturbances", "Difficulty falling asleep, waking up frequently, or excessive daytime tiredness"),
        SpecialitySymptom("⚡", "Mood Swings & Irritability", "Sudden shifts between extreme highs and lows, anger outbursts, or emotional reactivity"),
        SpecialitySymptom("🎯", "Poor Focus & ADHD Symptoms", "Inattention, hyperactivity, impulsivity, procrastination, and brain fog"),
        SpecialitySymptom("🌪️", "Intrusive Thoughts & OCD", "Unwanted repetitive thoughts, compulsive checking behaviors, or irrational fears")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "😔 Mood & Depressive Disorders",
            items = listOf(
                "Major Depressive Disorder (MDD)",
                "Bipolar Affective Disorder",
                "Dysthymia (Chronic Low Mood)",
                "Postpartum Depression & Seasonal Affective Disorder"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "😰 Anxiety & Stress-Related Disorders",
            items = listOf(
                "Generalized Anxiety Disorder (GAD)",
                "Panic Disorder & Agoraphobia",
                "Social Anxiety & Phobias",
                "Post-Traumatic Stress Disorder (PTSD)"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🌪️ Neurodevelopmental & Obsessive Conditions",
            items = listOf(
                "Adult & Pediatric ADHD",
                "Obsessive-Compulsive Disorder (OCD)",
                "Autism Spectrum Support & Guidance",
                "Tourette Syndrome & Tic Disorders"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🛡️ Sleep, Eating & Addiction Recovery",
            items = listOf(
                "Chronic Insomnia & Circadian Rhythm Disorders",
                "Substance De-Addiction & Alcohol Withdrawal",
                "Nicotine & Smoking Cessation",
                "Anorexia, Bulimia & Binge Eating Disorders"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Empathetic Intake & History", "A supportive, non-judgmental space to discuss your emotional experiences, stressors, and mental health background."),
        SpecialityConsultationStep("2", "Clinical Psychiatric Assessment", "Screening for mood, anxiety, cognitive clarity, sleep architecture, and neurotransmitter balance indicators."),
        SpecialityConsultationStep("3", "Evidence-Based Treatment Plan", "Personalized recommendations including medication management (SSRIs, mood stabilizers) and therapy frameworks (CBT)."),
        SpecialityConsultationStep("4", "Continuous Wellness & Follow-up", "Regular reviews to monitor therapeutic response, optimize dosage, and build long-term emotional resilience.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "What is the difference between a Psychiatrist and a Psychologist?",
            answer = "A Psychiatrist is a medical doctor (MBBS + MD/DNB Psychiatry) who can prescribe medications and diagnose chemical/biological mental health disorders. A Psychologist specializes in psychotherapy, counseling, and behavioral techniques without prescribing drugs."
        ),
        SpecialityFaqItem(
            question = "Are psychiatric medications addictive?",
            answer = "Most modern medications for depression and anxiety (like SSRIs) are non-addictive and work by balancing neurotransmitters like serotonin and dopamine. Your psychiatrist will carefully tailor dosages and guide gradual tapering when appropriate."
        ),
        SpecialityFaqItem(
            question = "Is my online consultation completely confidential?",
            answer = "Yes, 100%. All consultations on Swastik are encrypted, private, and adhere to strict medical confidentiality laws. Your records are never shared with anyone without your explicit consent."
        ),
        SpecialityFaqItem(
            question = "How long does psychiatric treatment usually take?",
            answer = "Treatment duration varies depending on the condition. Acute anxiety or sleep issues may stabilize within a few weeks to months, while chronic mood disorders may benefit from a 6-12 month supportive regimen."
        )
    )
)
