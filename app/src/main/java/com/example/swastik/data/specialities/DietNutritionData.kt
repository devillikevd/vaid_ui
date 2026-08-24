package com.example.swastik.data.specialities

val dietNutritionData = SpecialityDetailData(
    id = "diet_nutrition",
    title = "Diet & Nutrition Specialist",
    subtitle = "Clinical Dietitian, Weight Management & Nutritionist",
    heroDescription = "Consult certified clinical nutritionists and dietitians for sustainable weight loss, diabetes reversal diet, PCOS/PCOD management, gut health, and personalized meal plans.",
    trustBadges = listOf(
        "🥗 Clinical & Lifestyle Nutrition",
        "⚡ 100% Customized Meal Charts",
        "🛡️ Certified Clinical Dietitians (RD / MSc)"
    ),
    aboutDescription = "A Clinical Dietitian / Nutrition Specialist is an expert in food science, human metabolism, and medical nutrition therapy (MNT). They design customized, culturally adaptable nutrition plans to treat clinical health conditions and optimize vitality.",
    symptoms = listOf(
        SpecialitySymptom("⚖️", "Weight Gain & Inability to Lose Weight", "Stubborn belly fat, slow metabolism, yo-yo dieting cycles, or post-pregnancy weight"),
        SpecialitySymptom("🩸", "High Blood Sugar & Pre-Diabetes", "Elevated fasting sugar, high HbA1c, and insulin resistance needing dietary management"),
        SpecialitySymptom("🌸", "PCOS / PCOD & Hormonal Weight", "Irregular periods, facial hair, cystic acne, and difficulty losing weight"),
        SpecialitySymptom("🫀", "High Cholesterol & Triglycerides", "Elevated LDL, fatty liver, or hypertension requiring heart-healthy meal planning"),
        SpecialitySymptom("🥱", "Low Energy, Fatigue & Deficiencies", "Vitamin B12 / D3 deficiency, iron deficiency anemia, and chronic fatigue"),
        SpecialitySymptom("🫄", "Digestive Issues & Food Sensitivity", "Chronic bloating, acid reflux, gluten/dairy intolerance, and poor gut biome")
    ),
    conditionCategories = listOf(
        SpecialityConditionCategory(
            categoryName = "⚖️ Weight Management & Metabolic Health",
            items = listOf(
                "Healthy Fat Loss & Muscle Preservation",
                "Underweight & Healthy Weight Gain Plans",
                "Metabolic Syndrome & Insulin Resistance",
                "Post-Bariatric & Post-Pregnancy Weight Loss"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🩸 Medical Nutrition Therapy (MNT)",
            items = listOf(
                "Diabetes & Pre-Diabetes Meal Plans",
                "Dyslipidemia & Heart-Healthy DASH Diet",
                "Kidney Disease (Renal Diet: Low K/Na/P)",
                "Non-Alcoholic Fatty Liver (NAFLD) Reversal"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🌸 Women's & Hormonal Nutrition",
            items = listOf(
                "PCOS / PCOD Anti-Inflammatory Diet",
                "Thyroid (Hypo/Hyperthyroidism) Nutrition",
                "Pregnancy & Lactation Trimester Meal Plans",
                "Menopause Nutrition & Bone Density Support"
            )
        ),
        SpecialityConditionCategory(
            categoryName = "🛡️ Gut Health & Sports Nutrition",
            items = listOf(
                "Low-FODMAP Diet for IBS & Bloating",
                "Athletic & High-Protein Fitness Nutrition",
                "Plant-Based & Vegan Balanced Meal Planning",
                "Childhood Nutrition & Picky Eating Solutions"
            )
        )
    ),
    consultationSteps = listOf(
        SpecialityConsultationStep("1", "Lifestyle & Dietary Recall", "Comprehensive review of daily food intake, meal timings, regional food preferences, cravings, and exercise habits."),
        SpecialityConsultationStep("2", "Metabolic & Lab Panel Analysis", "Evaluation of BMI, body composition, lipid levels, thyroid markers, HbA1c, and vitamin deficiencies."),
        SpecialityConsultationStep("3", "Custom Meal Chart Creation", "Designing an easy-to-follow, balanced meal plan with exact portions, swaps, and grocery recommendations."),
        SpecialityConsultationStep("4", "Weekly Progress & Habit Coaching", "Regular check-ins to monitor weight, energy levels, adjust macronutrients, and sustain lifelong results.")
    ),
    faqs = listOf(
        SpecialityFaqItem(
            question = "Are crash diets like keto or extreme fasting healthy for weight loss?",
            answer = "While extreme diets may cause rapid short-term water and muscle loss, they are often unsustainable and can lead to nutrient deficiencies or rebound weight gain. A balanced, calorie-calibrated diet tailored to your lifestyle is safer and lasting."
        ),
        SpecialityFaqItem(
            question = "Can diabetes really be managed or reversed through diet alone?",
            answer = "In early-stage type 2 diabetes and pre-diabetes, structured carbohydrate moderation, high dietary fiber, and healthy fats combined with weight loss can significantly normalize HbA1c levels and reduce medication reliance."
        ),
        SpecialityFaqItem(
            question = "Will I have to give up my traditional cultural foods?",
            answer = "No! A clinical dietitian customizes your meal plan around your family's staple diet (e.g. roti, rice, dal, vegetables) by adjusting portion sizes, cooking methods, and protein balance."
        ),
        SpecialityFaqItem(
            question = "What details should I prepare before my nutrition session?",
            answer = "Keep a 2-day food diary noting everything you ate, your current weight/height, and any recent blood test reports (HbA1c, Lipid Profile, Thyroid, Vitamin B12/D3)."
        )
    )
)
