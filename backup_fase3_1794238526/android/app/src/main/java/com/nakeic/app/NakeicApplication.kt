package com.nakeic.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import androidx.core.content.getSystemService
import dagger.hilt.android.HiltAndroidApp

/**
 * NAKEIC Application
 * Punto de entrada principal de la aplicación nativa Android.
 * Inicializa Hilt para inyección de dependencias, canales de notificación y motores de cifrado local.
 */
@HiltAndroidApp
class NakeicApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService<NotificationManager>() ?: return

            // Canal de Mensajes Directos y Grupos
            val messagesChannel = NotificationChannel(
                CHANNEL_MESSAGES_ID,
                "Mensajes NAKEIC",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notificaciones de chats privados y grupales"
                enableVibration(true)
                enableLights(true)
            }

            // Canal de Llamadas Entrantes (Máxima prioridad con sonido continuo)
            val callsChannel = NotificationChannel(
                CHANNEL_CALLS_ID,
                "Llamadas NAKEIC",
                NotificationManager.IMPORTANCE_MAX
            ).apply {
                description = "Notificaciones de llamadas de voz y videollamadas entrantes"
                setBypassDnd(true)
                enableVibration(true)
            }

            // Canal de Transferencias Multimedia
            val mediaChannel = NotificationChannel(
                CHANNEL_MEDIA_ID,
                "Transferencias Multimedia",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Progreso de subida y descarga de archivos"
            }

            notificationManager.createNotificationChannels(
                listOf(messagesChannel, callsChannel, mediaChannel)
            )
        }
    }

    companion object {
        const val CHANNEL_MESSAGES_ID = "nakeic_messages_channel"
        const val CHANNEL_CALLS_ID = "nakeic_calls_channel"
        const val CHANNEL_MEDIA_ID = "nakeic_media_channel"
    }
}
