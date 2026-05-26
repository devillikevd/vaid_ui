package com.example.swastik.services.guardian

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.google.android.gms.location.ActivityRecognitionResult

class GuardianActivityReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        if (intent != null && ActivityRecognitionResult.hasResult(intent)) {
            val result = ActivityRecognitionResult.extractResult(intent)
            if (result != null) {
                val mostProbableActivity = result.mostProbableActivity
                
                // Send the activity update back to the GuardianService
                val updateIntent = Intent(GuardianService.ACTION_ACTIVITY_UPDATE).apply {
                    putExtra(GuardianService.EXTRA_ACTIVITY_TYPE, mostProbableActivity.type)
                }
                context?.sendBroadcast(updateIntent)
            }
        }
    }
}
