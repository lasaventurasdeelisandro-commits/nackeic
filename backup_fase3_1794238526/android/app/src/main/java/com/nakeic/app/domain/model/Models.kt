package com.nakeic.app.domain.model

/**
 * Modelos de Dominio de Alto Nivel para NAKEIC Android.
 * Desacoplados de Room y redes para pureza arquitectónica Clean Architecture.
 */

data class User(
    val id: String,
    val phoneNumber: String,
    val displayName: String,
    val username: String = "",
    val bio: String = "¡Hola! Estoy usando NAKEIC.",
    val avatarUrl: String? = null,
    val isOnline: Boolean = false,
    val lastSeenTimestamp: Long = 0L,
    val publicKeyFingerprint: String = ""
)

data class Conversation(
    val id: String,
    val title: String,
    val isGroup: Boolean = false,
    val avatarUrl: String? = null,
    val lastMessage: Message? = null,
    val unreadCount: Int = 0,
    val isPinned: Boolean = false,
    val isMuted: Boolean = false,
    val disappearingDurationSeconds: Long? = null, // 0 / null = OFF, 86400 = 24h, 604800 = 7d, 2592000 = 30d
    val memberIds: List<String> = emptyList(),
    val adminIds: List<String> = emptyList(),
    val description: String = ""
)

data class Message(
    val id: String,
    val conversationId: String,
    val senderId: String,
    val senderName: String = "",
    val text: String = "",
    val type: MessageType = MessageType.TEXT,
    val status: MessageStatus = MessageStatus.SENT,
    val timestamp: Long = System.currentTimeMillis(),
    val mediaAttachment: MediaAttachment? = null,
    val location: LocationAttachment? = null,
    val contactShare: ContactAttachment? = null,
    val replyTo: ReplySnapshot? = null,
    val isPinned: Boolean = false,
    val isEdited: Boolean = false,
    val reactions: Map<String, List<String>> = emptyMap(), // Emoji -> Lista de UserIds
    val disappearingAfterSeconds: Long? = null
)

enum class MessageType {
    TEXT,
    IMAGE,
    VIDEO,
    AUDIO_VOICE,
    DOCUMENT,
    LOCATION,
    CONTACT,
    SYSTEM_EVENT
}

enum class MessageStatus {
    SENDING,
    SENT,
    DELIVERED,
    READ,
    FAILED
}

data class MediaAttachment(
    val url: String,
    val localUri: String? = null,
    val mimeType: String,
    val fileName: String,
    val fileSizeBytes: Long,
    val durationSeconds: Int? = null, // Para audio y video
    val waveformPoints: List<Float> = emptyList(), // Para notas de voz
    val thumbnailBase64: String? = null
)

data class LocationAttachment(
    val latitude: Double,
    val longitude: Double,
    val addressName: String? = null
)

data class ContactAttachment(
    val name: String,
    val phoneNumber: String,
    val avatarUrl: String? = null
)

data class ReplySnapshot(
    val messageId: String,
    val senderName: String,
    val previewText: String,
    val type: MessageType
)

data class CallRecord(
    val id: String,
    val contactId: String,
    val contactName: String,
    val contactAvatarUrl: String? = null,
    val isVideo: Boolean,
    val direction: CallDirection,
    val timestamp: Long,
    val durationSeconds: Int = 0
)

enum class CallDirection {
    INCOMING,
    OUTGOING,
    MISSED
}

data class EphemeralStatus(
    val id: String,
    val userId: String,
    val userName: String,
    val userAvatarUrl: String?,
    val mediaUrl: String? = null,
    val textCaption: String = "",
    val backgroundHex: String? = null,
    val timestamp: Long,
    val expiresAt: Long,
    val viewersCount: Int = 0,
    val isViewed: Boolean = false
)

data class PrivacySettings(
    val lastSeenVisibility: Visibility = Visibility.EVERYONE,
    val onlineStatusVisibility: Visibility = Visibility.EVERYONE,
    val profilePhotoVisibility: Visibility = Visibility.EVERYONE,
    val statusVisibility: Visibility = Visibility.CONTACTS,
    val readReceipts: Boolean = true,
    val defaultDisappearingTimerSeconds: Long? = null,
    val blockedUserIds: List<String> = emptyList()
)

enum class Visibility {
    EVERYONE,
    CONTACTS,
    NOBODY
}
