package com.nakeic.app.service

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.getSystemService
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.nakeic.app.NakeicApplication
import com.nakeic.app.data.repository.NetworkEnvironment
import com.nakeic.app.presentation.MainActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

/**
 * NakeicFirebaseMessagingService
 * Implementación oficial de FirebaseMessagingService para NAKEIC Android.
 * - Registra y rota tokens FCM con el backend (/api/users/fcm-token) usando la sesión autenticada real.
 * - Maneja notificaciones entrantes de mensajes, llamadas VoIP y alertas NAKEIC LIVE.
 */
class NakeicFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        registerFcmTokenWithBackend(token)
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)

        val data = remoteMessage.data
        val title = data["title"] ?: remoteMessage.notification?.title ?: "Mensaje NAKEIC"
        val body = data["body"] ?: remoteMessage.notification?.body ?: "Tienes una actualización nueva"
        val conversationId = data["conversationId"]
        val liveRoomId = data["roomId"]
        val isCallSignal = data["isCallSignal"]?.toBoolean() ?: false

        if (isCallSignal) {
            val callerName = data["callerName"] ?: "Llamada NAKEIC"
            val isVideo = data["isVideo"]?.toBoolean() ?: false

            val callIntent = Intent(this, NakeicCallService::class.java).apply {
                action = NakeicCallService.ACTION_START_CALL
                putExtra(NakeicCallService.EXTRA_CALLER_NAME, callerName)
                putExtra(NakeicCallService.EXTRA_IS_VIDEO, isVideo)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(callIntent)
            } else {
                startService(callIntent)
            }
        } else {
            dispatchMessageNotification(title, body, conversationId, liveRoomId)
        }
    }

    private fun registerFcmTokenWithBackend(token: String) {
        val prefs = applicationContext.getSharedPreferences("nakeic_auth_prefs", Context.MODE_PRIVATE)
        val userId = prefs.getString("user_id", null)
        val authToken = prefs.getString("auth_token", null)
        if (userId.isNullOrBlank() || authToken.isNullOrBlank()) {
            // Token pendiente hasta completar inicio de sesión verificado
            prefs.edit().putString("pending_fcm_token", token).apply()
            return
        }

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val environment = NetworkEnvironment.resolve()
                val url = URL("${environment.httpBaseUrl}/api/users/fcm-token")
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json")
                    setRequestProperty("Authorization", "Bearer $authToken")
                    connectTimeout = 5000
                    readTimeout = 5000
                }
                val payload = JSONObject().apply {
                    put("userId", userId)
                    put("fcmToken", token)
                }
                OutputStreamWriter(conn.outputStream).use { it.write(payload.toString()) }
                conn.responseCode
            } catch (_: Exception) {}
        }
    }

    private fun dispatchMessageNotification(
        title: String,
        body: String,
        conversationId: String?,
        liveRoomId: String?
    ) {
        val notificationManager = getSystemService<NotificationManager>() ?: return

        val clickIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            if (!conversationId.isNullOrBlank()) putExtra("CONVERSATION_ID", conversationId)
            if (!liveRoomId.isNullOrBlank()) putExtra("LIVE_ROOM_ID", liveRoomId)
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            System.currentTimeMillis().toInt(),
            clickIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, NakeicApplication.CHANNEL_MESSAGES_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .build()

        notificationManager.notify((System.currentTimeMillis() % 100000).toInt(), notification)
    }
}
