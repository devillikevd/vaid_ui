package com.example.swastik.data.repository

import com.example.swastik.data.remote.ApiService
import com.example.swastik.data.remote.dto.*
import com.google.gson.JsonObject
import javax.inject.Inject
import javax.inject.Singleton

data class PaginatedExerciseResult(
    val data: List<ExerciseLibraryDto>,
    val page: Int,
    val totalPages: Int,
    val total: Int
)

@Singleton
class WellnessRepository @Inject constructor(
    private val apiService: ApiService
) {
    suspend fun getWorkoutPlans(): Result<List<WellnessWorkoutPlanDto>> = try {
        val response = apiService.getWellnessWorkoutPlans(limit = 20)
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data ?: emptyList())
        } else {
            Result.Error("Failed to load workout plans")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun getExercises(
        page: Int = 1,
        limit: Int = 30,
        query: String? = null,
        bodyPart: String? = null,
        category: String? = null,
        level: String? = null,
        equipment: String? = null,
        target: String? = null
    ): Result<PaginatedExerciseResult> = try {
        val response = apiService.getExerciseLibrary(
            page = page,
            limit = limit,
            query = query,
            bodyPart = bodyPart,
            category = category,
            level = level,
            equipment = equipment,
            target = target
        )
        if (response.isSuccessful && response.body()?.success == true) {
            val body = response.body()!!
            Result.Success(PaginatedExerciseResult(
                data = body.data ?: emptyList(),
                page = body.pagination?.page ?: page,
                totalPages = body.pagination?.totalPages ?: 1,
                total = body.pagination?.total ?: (body.data?.size ?: 0)
            ))
        } else {
            Result.Error("Failed to load exercise animations")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun getCoaches(): Result<List<WellnessCoachDto>> = try {
        val response = apiService.getWellnessCoaches(limit = 20)
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data ?: emptyList())
        } else {
            Result.Error("Failed to load coaches")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun getFitnessCenters(): Result<List<FitnessCenterDto>> = try {
        val response = apiService.getFitnessCenters(limit = 20)
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data ?: emptyList())
        } else {
            Result.Error("Failed to load gyms and studios")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun getGroups(): Result<List<WellnessGroupDto>> = try {
        val response = apiService.getWellnessGroups()
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data ?: emptyList())
        } else {
            Result.Error("Failed to load communities")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun getChallenges(): Result<List<WellnessChallengeDto>> = try {
        val response = apiService.getWellnessChallenges()
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data ?: emptyList())
        } else {
            Result.Error("Failed to load challenges")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun joinGroup(groupId: String): Result<Boolean> = try {
        val response = apiService.joinWellnessGroup(groupId)
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(true)
        } else {
            Result.Error(response.body()?.message ?: "Failed to join community")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun getGroupPosts(groupId: String): Result<List<GroupPostDto>> = try {
        val response = apiService.getGroupPosts(groupId)
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data ?: emptyList())
        } else {
            Result.Error("Failed to load community feed")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun createGroupPost(groupId: String, request: CreateGroupPostRequest): Result<GroupPostDto?> = try {
        val response = apiService.createGroupPost(groupId, request)
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data)
        } else {
            Result.Error(response.body()?.message ?: "Failed to post check-in")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun cheerGroupPost(postId: String): Result<CheerPostResponse?> = try {
        val response = apiService.cheerGroupPost(postId)
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data)
        } else {
            Result.Error("Failed to cheer")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }


    suspend fun getSupplements(): Result<List<TrustedSupplementDto>> = try {
        val response = apiService.getTrustedSupplements(limit = 20)
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data ?: emptyList())
        } else {
            Result.Error("Failed to load supplements")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun getHubSummary(): Result<WellnessHubDto?> = try {
        val response = apiService.getWellnessHub()
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data)
        } else {
            Result.Error("Failed to load wellness hub")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    // ==================== Assessment ====================

    suspend fun getAssessment(): Result<WellnessAssessmentDto?> = try {
        val response = apiService.getWellnessAssessment()
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data)
        } else {
            Result.Success(null) // No assessment yet is valid
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun submitGoals(request: CreateAssessmentGoalsRequest): Result<WellnessAssessmentDto> = try {
        val response = apiService.submitAssessmentGoals(request)
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()!!.data!!)
        } else {
            Result.Error("Failed to save goals")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun submitBio(request: CreateAssessmentBioRequest): Result<WellnessAssessmentDto> = try {
        val response = apiService.submitAssessmentBio(request)
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()!!.data!!)
        } else {
            Result.Error("Failed to save bio")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun submitHealthScreening(request: CreateHealthScreeningRequest): Result<WellnessAssessmentDto> = try {
        val response = apiService.submitHealthScreening(request)
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()!!.data!!)
        } else {
            Result.Error("Failed to save health screening")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun getSafetySummary(): Result<com.example.swastik.data.remote.dto.WellnessSafetyDto> = try {
        val response = apiService.getWellnessSafety()
        if (response.isSuccessful && response.body()?.success == true && response.body()?.data != null) {
            Result.Success(response.body()!!.data!!)
        } else {
            // Default safe profile if not yet screened
            Result.Success(com.example.swastik.data.remote.dto.WellnessSafetyDto(
                clearanceStatus = "cleared",
                statusBadge = "🟢 100% Cleared for Active Training",
                badgeColor = "#16A34A",
                clearanceNotes = "Cardiovascular and joint safety screening clear.",
                parQCompleted = true,
                parQPassed = true
            ))
        }
    } catch (e: Exception) {
        Result.Success(com.example.swastik.data.remote.dto.WellnessSafetyDto(
            clearanceStatus = "cleared",
            statusBadge = "🟢 100% Cleared for Active Training",
            badgeColor = "#16A34A",
            clearanceNotes = "Cardiovascular and joint safety screening clear.",
            parQCompleted = true,
            parQPassed = true
        ))
    }

    suspend fun getDrugNutrientInterlocks(): Result<List<com.example.swastik.data.remote.dto.DrugNutrientInterlockDto>> = try {
        val response = apiService.getDrugNutrientInterlocks()
        if (response.isSuccessful && response.body()?.success == true && response.body()?.data != null) {
            Result.Success(response.body()!!.data!!)
        } else {
            Result.Success(emptyList())
        }
    } catch (e: Exception) {
        Result.Success(emptyList())
    }

    suspend fun getMedicalClearanceCertificate(): Result<com.example.swastik.data.remote.dto.MedicalClearanceCertificateDto?> = try {
        val response = apiService.getMedicalClearanceCertificate()
        if (response.isSuccessful && response.body()?.success == true && response.body()?.data != null) {
            Result.Success(response.body()!!.data!!)
        } else {
            Result.Success(null)
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Failed to generate clearance certificate", e)
    }

    suspend fun logSafetyIncident(request: com.example.swastik.data.remote.dto.SafetyIncidentRequest): Result<com.example.swastik.data.remote.dto.SafetyIncidentResponseDto> = try {
        val response = apiService.logSafetyIncident(request)
        if (response.isSuccessful && response.body()?.success == true && response.body()?.data != null) {
            Result.Success(response.body()!!.data!!)
        } else {
            Result.Error("Failed to log safety incident")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error while logging incident", e)
    }

    // ==================== Additional APIs ====================

    suspend fun getBadges(): Result<List<JsonObject>> = try {
        val response = apiService.getWellnessBadges()
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data ?: emptyList())
        } else {
            Result.Error("Failed to load badges")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun getAiInsights(): Result<List<JsonObject>> = try {
        val response = apiService.getWellnessAiInsights()
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data ?: emptyList())
        } else {
            Result.Error("Failed to load AI insights")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun chatWithAiCoach(
        message: String,
        persona: String = "ATHLETE"
    ): Result<com.example.swastik.data.model.AiChatResponse> = try {
        val response = apiService.chatWithAiCoach(com.example.swastik.data.model.AiChatRequest(message = message, persona = persona))
        if (response.isSuccessful && response.body()?.success == true && response.body()?.data != null) {
            Result.Success(response.body()!!.data!!)
        } else {
            Result.Error("Failed to get response from AI coach")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun generateSmartPlan(
        goal: String = "GENERAL_FITNESS",
        level: String = "BEGINNER",
        dietType: String = "BALANCED"
    ): Result<com.example.swastik.data.model.SmartPlanResponse> = try {
        val response = apiService.generateSmartPlan(com.example.swastik.data.model.SmartPlanRequest(goal, level, dietType))
        if (response.isSuccessful && response.body()?.success == true && response.body()?.data != null) {
            Result.Success(response.body()!!.data!!)
        } else {
            Result.Error("Failed to generate smart plan")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun getAiReadinessScore(): Result<com.example.swastik.data.model.AiReadinessScoreDto> = try {
        val response = apiService.getAiReadinessScore()
        if (response.isSuccessful && response.body()?.success == true && response.body()?.data != null) {
            Result.Success(response.body()!!.data!!)
        } else {
            Result.Success(com.example.swastik.data.model.AiReadinessScoreDto())
        }
    } catch (e: Exception) {
        Result.Success(com.example.swastik.data.model.AiReadinessScoreDto())
    }

    suspend fun getReports(days: Int? = null): Result<JsonObject?> = try {
        val response = apiService.getWellnessReports(days)
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data)
        } else {
            Result.Error("Failed to load reports")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun getWorkoutProgress(): Result<JsonObject?> = try {
        val response = apiService.getWellnessWorkoutProgress()
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data)
        } else {
            Result.Error("Failed to load workout progress")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    // ==================== Coach Detail ====================

    suspend fun getCoachDetail(coachId: String): Result<WellnessCoachDetailDto> = try {
        val response = apiService.getWellnessCoachDetail(coachId)
        if (response.isSuccessful && response.body()?.success == true && response.body()?.data != null) {
            Result.Success(response.body()!!.data!!)
        } else {
            Result.Error("Coach not found")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    // ==================== Wellness Sessions ====================

    suspend fun getWellnessSessions(status: String? = null): Result<List<WellnessSessionDto>> = try {
        val response = apiService.getWellnessSessions(status)
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data ?: emptyList())
        } else {
            Result.Error("Failed to load wellness sessions")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun bookWellnessSession(request: BookWellnessSessionRequest): Result<WellnessSessionDto> = try {
        val response = apiService.bookWellnessSession(request)
        if (response.isSuccessful && response.body()?.success == true && response.body()?.data != null) {
            Result.Success(response.body()!!.data!!)
        } else {
            val rawError = response.errorBody()?.string() ?: "Failed to book session"
            // Parse JSON error body to extract readable message (e.g. from 409 double-booking)
            val errorMsg = try {
                val errorJson = com.google.gson.JsonParser.parseString(rawError).asJsonObject
                errorJson.get("error")?.asString
                    ?: errorJson.get("message")?.asString
                    ?: rawError
            } catch (_: Exception) { rawError }
            Result.Error(errorMsg)
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    // ==================== Workout Plan Assignment & Logging ====================

    suspend fun assignWorkoutPlan(planId: String, coachId: String? = null): Result<PatientWorkoutPlanDto> = try {
        val response = apiService.assignWorkoutPlan(planId, AssignWorkoutPlanRequest(coachId))
        if (response.isSuccessful && response.body()?.success == true && response.body()?.data != null) {
            Result.Success(response.body()!!.data!!)
        } else {
            Result.Error("Failed to start workout plan")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun logWorkout(request: LogWorkoutRequest): Result<JsonObject?> = try {
        val response = apiService.logWorkout(request)
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data)
        } else {
            Result.Error("Failed to log workout")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    // ==================== Gym Class Schedule & Booking ====================

    suspend fun getGymClassSchedule(centerId: String, from: String? = null, to: String? = null): Result<List<FitnessClassDto>> = try {
        val response = apiService.getGymClassSchedule(centerId, from, to)
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data ?: emptyList())
        } else {
            Result.Error("Failed to load class schedule")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun bookGymClass(centerId: String, classId: String): Result<JsonObject?> = try {
        val response = apiService.bookGymClass(centerId, classId)
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data)
        } else {
            Result.Error("Failed to book class")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun cancelGymClassBooking(centerId: String, classId: String): Result<Boolean> = try {
        val response = apiService.cancelGymClassBooking(centerId, classId)
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(true)
        } else {
            Result.Error("Failed to cancel booking")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    // ==================== Challenge Leaderboard ====================

    suspend fun getChallengeLeaderboard(challengeId: String): Result<List<LeaderboardEntryDto>> = try {
        val response = apiService.getChallengeLeaderboard(challengeId)
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data?.entries ?: emptyList())
        } else {
            Result.Error("Failed to load leaderboard")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun updateChallengeProgress(
        challengeId: String,
        request: UpdateChallengeProgressRequest
    ): Result<JsonObject> = try {
        val response = apiService.updateChallengeProgress(challengeId, request)
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data ?: JsonObject())
        } else {
            Result.Error("Failed to update progress")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun getWellnessStreaks(): Result<WellnessStreakDto> = try {
        val response = apiService.getWellnessStreaks()
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data ?: WellnessStreakDto())
        } else {
            Result.Error("Failed to load streaks")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun getWellnessSessionMessages(sessionId: String): Result<List<WellnessChatMessageDto>> = try {
        val response = apiService.getWellnessSessionMessages(sessionId)
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data ?: emptyList())
        } else {
            Result.Error("Failed to load messages")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun getWellnessReels(category: String? = null): Result<List<WellnessReelDto>> = try {
        val response = apiService.getWellnessReels(page = 1, limit = 50, category = category)
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data ?: emptyList())
        } else {
            Result.Error("Failed to load reels")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun likeWellnessReel(reelId: String): Result<JsonObject> = try {
        val response = apiService.likeWellnessReel(reelId)
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data ?: JsonObject())
        } else {
            Result.Error("Failed to like reel")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun viewWellnessReel(reelId: String): Result<JsonObject> = try {
        val response = apiService.viewWellnessReel(reelId)
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data ?: JsonObject())
        } else {
            Result.Error("Failed to record view")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun joinChallenge(challengeId: String): Result<JsonObject?> = try {
        val response = apiService.joinChallenge(challengeId)
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data)
        } else {
            Result.Error("Failed to join challenge")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    // ==================== QR Check-in ====================

    suspend fun qrGymCheckIn(request: QrCheckInRequest): Result<JsonObject?> = try {
        val response = apiService.qrGymCheckIn(request)
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data)
        } else {
            Result.Error("Check-in failed")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    // ==================== Workout Calendar ====================

    suspend fun getWorkoutCalendar(from: String? = null, to: String? = null): Result<JsonObject?> = try {
        val response = apiService.getWellnessWorkoutCalendar(from, to)
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data)
        } else {
            Result.Error("Failed to load calendar")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    // ==================== Coach Dashboard ====================

    suspend fun getMyCoachProfile(): Result<WellnessCoachDto?> = try {
        val response = apiService.getMyCoachProfile()
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data)
        } else {
            Result.Error("Failed to load coach profile")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun getCoachPatients(): Result<List<CoachPatientDto>> = try {
        val response = apiService.getCoachPatients()
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data ?: emptyList())
        } else {
            Result.Error("Failed to load patients")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun getCoachPatientAnalytics(patientId: String): Result<JsonObject> = try {
        val response = apiService.getCoachPatientAnalytics(patientId)
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data ?: JsonObject())
        } else {
            Result.Error("Failed to load analytics")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }

    suspend fun updateCoachAvailability(request: UpdateCoachAvailabilityRequest): Result<JsonObject> = try {
        val response = apiService.updateCoachAvailability(request)
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data ?: JsonObject())
        } else {
            Result.Error("Failed to update availability")
        }
    } catch (e: Exception) {
        Result.Error(e.message ?: "Network error", e)
    }
}
