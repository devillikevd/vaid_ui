package com.example.swastik.data.fitness

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.example.swastik.data.repository.FitnessRepository
import com.google.android.gms.location.ActivityTransition
import com.google.android.gms.location.ActivityTransitionResult
import com.google.android.gms.location.DetectedActivity
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class ActivityTransitionReceiver : BroadcastReceiver() {

    @Inject
    lateinit var fitnessRepository: FitnessRepository

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    companion object {
        const val ACTION_ACTIVITY_TRANSITION = "com.example.swastik.ACTION_ACTIVITY_TRANSITION"
        
        // Keep track of when the user started an active session
        private var activeSessionStartTime: Long = 0L
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == ACTION_ACTIVITY_TRANSITION && ActivityTransitionResult.hasResult(intent)) {
            val result = ActivityTransitionResult.extractResult(intent) ?: return

            for (event in result.transitionEvents) {
                val activityType = event.activityType
                val transitionType = event.transitionType
                val timestamp = System.currentTimeMillis()

                val activityName = when (activityType) {
                    DetectedActivity.WALKING -> "WALKING"
                    DetectedActivity.RUNNING -> "RUNNING"
                    DetectedActivity.ON_BICYCLE -> "BICYCLE"
                    DetectedActivity.STILL -> "STILL"
                    else -> "UNKNOWN"
                }

                val transitionName = when (transitionType) {
                    ActivityTransition.ACTIVITY_TRANSITION_ENTER -> "ENTER"
                    ActivityTransition.ACTIVITY_TRANSITION_EXIT -> "EXIT"
                    else -> "UNKNOWN"
                }

                Log.d("ActivityTransition", "Transition: $activityName - $transitionName")

                scope.launch {
                    val pendingResult = goAsync()
                    try {
                        if (activityType == DetectedActivity.WALKING || activityType == DetectedActivity.RUNNING) {
                            if (transitionType == ActivityTransition.ACTIVITY_TRANSITION_ENTER) {
                                // Started walking/running
                                activeSessionStartTime = timestamp
                            } else if (transitionType == ActivityTransition.ACTIVITY_TRANSITION_EXIT) {
                                // Stopped walking/running
                                if (activeSessionStartTime > 0) {
                                    val durationMillis = timestamp - activeSessionStartTime
                                    val durationMinutes = (durationMillis / (1000 * 60)).toInt()
                                    if (durationMinutes > 0) {
                                        fitnessRepository.addActiveTime(durationMinutes)
                                    }
                                    activeSessionStartTime = 0L
                                }
                            }
                        }
                    } catch (e: Exception) {
                        Log.e("ActivityTransition", "Error handling transition", e)
                    } finally {
                        pendingResult.finish()
                    }
                }
            }
        }
    }
}
