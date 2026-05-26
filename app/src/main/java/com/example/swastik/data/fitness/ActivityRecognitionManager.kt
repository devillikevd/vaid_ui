package com.example.swastik.data.fitness

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.util.Log
import com.google.android.gms.location.ActivityRecognition
import com.google.android.gms.location.ActivityTransition
import com.google.android.gms.location.ActivityTransitionRequest
import com.google.android.gms.location.DetectedActivity

class ActivityRecognitionManager(private val context: Context) {

    private val pendingIntent: PendingIntent by lazy {
        val intent = Intent(context, ActivityTransitionReceiver::class.java).apply {
            action = ActivityTransitionReceiver.ACTION_ACTIVITY_TRANSITION
        }
        PendingIntent.getBroadcast(
            context,
            100,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        )
    }

    fun startTracking() {
        val transitions = mutableListOf<ActivityTransition>()

        // Walking
        transitions.add(ActivityTransition.Builder()
            .setActivityType(DetectedActivity.WALKING)
            .setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_ENTER)
            .build())
        transitions.add(ActivityTransition.Builder()
            .setActivityType(DetectedActivity.WALKING)
            .setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_EXIT)
            .build())

        // Running
        transitions.add(ActivityTransition.Builder()
            .setActivityType(DetectedActivity.RUNNING)
            .setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_ENTER)
            .build())
        transitions.add(ActivityTransition.Builder()
            .setActivityType(DetectedActivity.RUNNING)
            .setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_EXIT)
            .build())

        // Still
        transitions.add(ActivityTransition.Builder()
            .setActivityType(DetectedActivity.STILL)
            .setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_ENTER)
            .build())

        val request = ActivityTransitionRequest(transitions)

        try {
            val task = ActivityRecognition.getClient(context)
                .requestActivityTransitionUpdates(request, pendingIntent)

            task.addOnSuccessListener {
                Log.d("ActivityRecognition", "Successfully registered for transitions")
            }
            task.addOnFailureListener { e ->
                Log.e("ActivityRecognition", "Failed to register for transitions", e)
            }
        } catch (e: SecurityException) {
            Log.e("ActivityRecognition", "Missing permission: ACTIVITY_RECOGNITION", e)
        }
    }

    fun stopTracking() {
        try {
            ActivityRecognition.getClient(context)
                .removeActivityTransitionUpdates(pendingIntent)
                .addOnSuccessListener {
                    Log.d("ActivityRecognition", "Successfully unregistered transitions")
                }
                .addOnFailureListener { e ->
                    Log.e("ActivityRecognition", "Failed to unregister transitions", e)
                }
        } catch (e: SecurityException) {
            Log.e("ActivityRecognition", "Missing permission: ACTIVITY_RECOGNITION", e)
        }
    }
}
