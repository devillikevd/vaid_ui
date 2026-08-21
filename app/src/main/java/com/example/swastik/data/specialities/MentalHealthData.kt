package com.example.swastik.data.specialities

val mentalHealthData = SpecialityDetailData(
    id = "mental_health_specialist",
    title = "Mental Health & Counseling Specialist",
    subtitle = "Clinical Psychologist, Psychotherapist & Mental Wellness Expert",
    heroDescription = "Safe, confidential, and empathetic therapy sessions with certified clinical psychologists for anxiety, depression, burnout, relationship conflict, grief, and emotional self-regulation.",
    trustBadges = listOf(
        "🧠 100% Confidential & Secure",
        "⚡ Certified Clinical Psychologists (RCI)",
        "🛡️ Evidence-Based Therapy (CBT / DBT)"
    ),
    aboutDescription = "A Mental Health Specialist / Clinical Psychologist provides psychological assessments, behavioral counseling, and structured evidence-based psychotherapy (such as Cognitive Behavioral Therapy and Mindfulness-Based Therapy) to help individuals overcome emotional distress, mental disorders, and life challenges.",
    symptoms = listOf(
        SpecialitySymptom("😫", "Severe Stress & Burnout", "Overwhelming work exhaustion, emotional drainage, lack of motivation, and irritability"),
        SpecialitySymptom("💔", "Relationship & Marriage Conflicts", "Communication breakdown, trust issues, frequent arguments, or separation distress"),
        SpecialitySymptom("🌧️", "Grief, Loss & Trauma (PTSD)", "Difficulty coping with the loss of a loved one, past emotional trauma, or disturbing flashbacks"),
        SpecialitySymptom("📉", "Low Self-Esteem & Imposter Feelings", "Chronic self-doubt, fear of failure, feelings of inadequacy, and excessive self-criticism"),
        SpecialitySymptom("🌪️", "Overthinking & Panic Attacks", "Catastrophizing thoughts, inability to calm the mind, racing pulse, and fear of losing control"),
        SpecialitySymptom("🧒", "Child & Adolescent Behavior Issues", "Academic pressure, school refusal, temper tantrums, or peer conflict in teens")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "🧠 Psychotherapy & Talk Therapies",
            items = listOf(
                "Cognitive Behavioral Therapy (CBT)",
                "Dialectical Behavior Therapy (DBT)",
                "Acceptance & Commitment Therapy (ACT)",
                "Mindfulness-Based Stress Reduction (MBSR)"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "❤️ Relationship & Family Counseling",
            items = listOf(
                "Couples & Marriage Therapy",
                "Family Systems & Conflict Resolution",
                "Divorce & Co-Parenting Counseling",
                "Intimacy & Emotional Reconnection"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🌧️ Trauma, Grief & Life Transitions",
            items = listOf(
                "Grief & Bereavement Support",
                "Post-Traumatic Stress Disorder (PTSD) Therapy",
                "Career Transitions & Workplace Burnout",
                "Postpartum Emotional Support for Mothers"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🛡️ Child, Teen & Student Wellness",
            items = listOf(
                "Adolescent Counseling & Peer Stress",
                "Exam Anxiety & Performance Coaching",
                "Parenting Strategies for Behavioral Challenges",
                "Screen Addiction & Sleep Routine Therapy"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Safe & Non-Judgmental Intake", "A private space to express your feelings, current stressors, personal history, and what brings you to therapy."),
        SpecialityConsultationStep("2", "Therapeutic Goal Setting", "Collaboratively defining key emotional goals, triggers to manage, and behavioral patterns to transform."),
        SpecialityConsultationStep("3", "Evidence-Based Therapy Techniques", "Learning practical cognitive tools, emotional regulation exercises, and thought-reframing frameworks."),
        SpecialityConsultationStep("4", "Actionable Takeaways & Growth", "Weekly reflection prompts, grounding exercises, and ongoing support for lasting psychological resilience.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "How is psychotherapy different from talking to a friend?",
            answer = "While friends offer support, a trained clinical psychologist provides objective, confidential, and scientifically backed techniques (like CBT) to help you understand root psychological patterns and build lasting behavioral coping skills."
        ),
        SpecialityFaqItem(
            question = "How many therapy sessions will I need?",
            answer = "The number of sessions depends on your individual goals. Many people experience significant clarity and relief within 4 to 8 focused sessions, while deep-seated trauma or chronic distress may benefit from longer engagement."
        ),
        SpecialityFaqItem(
            question = "Is my online therapy conversation completely private?",
            answer = "Yes! All counseling sessions on Swastik are 100% private, end-to-end encrypted, and follow strict psychological confidentiality ethics."
        ),
        SpecialityFaqItem(
            question = "Do psychologists prescribe medicines?",
            answer = "Psychologists do not prescribe medications. If your therapist determines that medication would benefit your condition (e.g. for severe depression or panic), they will coordinate with a Psychiatrist for combined care."
        )
    )
)
