package com.example.swastik.data.remote.dto

import com.google.gson.annotations.SerializedName

data class DietQuotaResponse(
    val used: Int,
    val limit: Int,
    val remaining: Int,
    val exhausted: Boolean
)

data class DietAnalysisResponse(
    val identified_items: List<IdentifiedFoodItem>,
    @SerializedName("quota") val quota: DietQuotaResponse? = null
)

data class IdentifiedFoodItem(
    val name: String,
    val hindi_name: String? = null,
    val quantity: Double,
    val unit: String
)

data class DietCalculateRequest(
    val items: List<IdentifiedFoodItem>,
    val additional_notes: String? = null,
    val medical_conditions: List<String> = emptyList(),
    val language: String = "en"
)

data class DietCalculationResponse(
    val items: List<CalculatedFoodItem>,
    val totals: NutritionalTotals,
    val advice: DietAdvice
)

data class CalculatedFoodItem(
    val name: String,
    val hindi_name: String? = null,
    val quantity: Double,
    val unit: String,
    val standard_weight_g: Double,
    val calories: Double,
    val protein_g: Double,
    val carbs_g: Double,
    val fat_g: Double,
    val fiber_g: Double,
    val source: String
)

data class NutritionalTotals(
    val calories: Double,
    val protein_g: Double,
    val carbs_g: Double,
    val fat_g: Double,
    val fiber_g: Double
)

data class DietAdvice(
    val general_assessment: String,
    val health_warnings: List<String> = emptyList(),
    val recommendations: List<String> = emptyList()
)

data class MealLogDto(
    val id: String,
    val items: List<CalculatedFoodItem>,
    val totals: NutritionalTotals,
    val advice: DietAdvice?,
    val mealType: String,
    val createdAt: String
)
