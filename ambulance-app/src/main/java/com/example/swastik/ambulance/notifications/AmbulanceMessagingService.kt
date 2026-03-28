package com.example.swastik.ambulance.notifications

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class AmbulanceMessagingService : FirebaseMessagingService() {

    @Inject
    lateinit var pushNotificationCoordinator: AmbulancePushNotificationCoordinator

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        pushNotificationCoordinator.onNewToken(token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        pushNotificationCoordinator.showNotification(
            title = message.notification?.title ?: message.data["title"].orEmpty(),
            message = message.notification?.body ?: message.data["message"].orEmpty()
        )
    }
}
