package com.example.swastik.data.specialities

data class SpecialityDetailData(
    val id: String,
    val title: String,
    val subtitle: String,
    val heroDescription: String,
    val trustBadges: List<String>,
    val aboutDescription: String,
    val symptoms: List<SpecialitySymptom>,
    val conditionCategories: List<SpecialityConditionCategory>,
    val consultationSteps: List<SpecialityConsultationStep>,
    val faqs: List<SpecialityFaqItem>
)

data class SpecialitySymptom(
    val emoji: String,
    val title: String,
    val subtitle: String
)

data class SpecialityConditionCategory(
    val categoryName: String,
    val items: List<String>
)

data class SpecialityConsultationStep(
    val stepNumber: String,
    val title: String,
    val description: String
)

data class SpecialityFaqItem(
    val question: String,
    val answer: String
)
