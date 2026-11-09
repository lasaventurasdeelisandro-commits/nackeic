package com.nakeic.app.service

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.nakeic.app.NakeicApplication
import com.nakeic.app.presentation.MainActivity

/**
 * NakeicCallService
 * Servicio en primer plano (Foreground Service) para llamadas VoIP WebRTC en Android.
 * Gestiona ciclo de vida de llamada, foco de audio, botones en notificación y compatibilidad Android 14/15.
 */
class NakeicCallService : Service() {

    private var audioManager: AudioManager? = null
    private var isMuted: Boolean = false
    private var isSpeakerOn: Boolean = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        audioManager = getSystemService(Context.AUDIO_SERVICE) as? AudioManager
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: ACTION_START_CALL
        val callerName = intent?.getStringExtra(EXTRA_CALLER_NAME) ?: "Contacto NAKEIC"
        val isVideo = intent?.getBooleanExtra(EXTRA_IS_VIDEO, false) ?: false

        when (action) {
            ACTION_START_CALL -> {
                acquireAudioFocus()
                startForegroundNotification(callerName, isVideo)
            }
            ACTION_TOGGLE_MUTE -> {
                isMuted = !isMuted
                audioManager?.isMicrophoneMute = isMuted
                startForegroundNotification(callerName, isVideo)
            }
            ACTION_TOGGLE_SPEAKER -> {
                isSpeakerOn = !isSpeakerOn
                audioManager?.isSpeakerphoneOn = isSpeakerOn
                startForegroundNotification(callerName, isVideo)
            }
            ACTION_END_CALL -> {
                releaseAudioFocus()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
        }

        return START_NOT_STICKY
    }

    private fun acquireAudioFocus() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val playbackAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build()
            val focusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                .setAudioAttributes(playbackAttributes)
                .setAcceptsDelayedFocusGain(false)
                .build()
            audioManager?.requestAudioFocus(focusRequest)
        } else {
            @Suppress("DEPRECATION")
            audioManager?.requestAudioFocus(
                null,
                AudioManager.STREAM_VOICE_CALL,
                AudioManager.AUDIOFOCUS_GAIN_TRANSIENT
            )
        }
        audioManager?.mode = AudioManager.MODE_IN_COMMUNICATION
    }

    private fun releaseAudioFocus() {
        audioManager?.mode = AudioManager.MODE_NORMAL
    }

    private fun startForegroundNotification(callerName: String, isVideo: Boolean) {
        val fullScreenIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val fullScreenPendingIntent = PendingIntent.getActivity(
            this,
            0,
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val endCallIntent = Intent(this, NakeicCallService::class.java).apply {
            action = ACTION_END_CALL
        }
        val endCallPendingIntent = PendingIntent.getService(
            this,
            1,
            endCallIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val muteIntent = Intent(this, NakeicCallService::class.java).apply {
            action = ACTION_TOGGLE_MUTE
            putExtra(EXTRA_CALLER_NAME, callerName)
            putExtra(EXTRA_IS_VIDEO, isVideo)
        }
        val mutePendingIntent = PendingIntent.getService(
            this,
            2,
            muteIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification: Notification = NotificationCompat.Builder(this, NakeicApplication.CHANNEL_CALLS_ID)
            .setContentTitle(if (isVideo) "Videollamada NAKEIC E2EE" else "Llamada de voz NAKEIC E2EE")
            .setContentText("En llamada con $callerName")
            .setSmallIcon(android.R.drawable.ic_menu_call)
            .setContentIntent(fullScreenPendingIntent)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Colgar", endCallPendingIntent)
            .addAction(
                if (isMuted) android.R.drawable.stat_notify_chat else android.R.drawable.ic_btn_speak_now,
                if (isMuted) "Activar Mic" else "Silenciar",
                mutePendingIntent
            )
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val foregroundServiceType = if (isVideo) {
                ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL or
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE or
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA
            } else {
                ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL or
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
            }
            startForeground(NOTIFICATION_ID, notification, foregroundServiceType)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        releaseAudioFocus()
        stopForeground(STOP_FOREGROUND_REMOVE)
    }

    companion object {
        const val NOTIFICATION_ID = 2001
        const val ACTION_START_CALL = "com.nakeic.app.action.START_CALL"
        const val ACTION_END_CALL = "com.nakeic.app.action.END_CALL"
        const val ACTION_TOGGLE_MUTE = "com.nakeic.app.action.TOGGLE_MUTE"
        const val ACTION_TOGGLE_SPEAKER = "com.nakeic.app.action.TOGGLE_SPEAKER"
        const val EXTRA_CALLER_NAME = "CALLER_NAME"
        const val EXTRA_IS_VIDEO = "IS_VIDEO"
    }
}
