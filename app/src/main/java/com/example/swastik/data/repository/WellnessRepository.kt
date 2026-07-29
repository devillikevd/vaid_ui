package com.example.swastik.data.repository

import com.example.swastik.data.remote.ApiService
import com.example.swastik.data.remote.dto.ExerciseLibraryDto
import com.example.swastik.data.remote.dto.FitnessCenterDto
import com.example.swastik.data.remote.dto.TrustedSupplementDto
import com.example.swastik.data.remote.dto.WellnessChallengeDto
import com.example.swastik.data.remote.dto.WellnessCoachDto
import com.example.swastik.data.remote.dto.WellnessGroupDto
import com.example.swastik.data.remote.dto.WellnessWorkoutPlanDto
import javax.inject.Inject
import javax.inject.Singleton

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

    suspend fun getExercises(): Result<List<ExerciseLibraryDto>> = try {
        val response = apiService.getExerciseLibrary(limit = 30)
        if (response.isSuccessful && response.body()?.success == true) {
            Result.Success(response.body()?.data ?: emptyList())
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
}
