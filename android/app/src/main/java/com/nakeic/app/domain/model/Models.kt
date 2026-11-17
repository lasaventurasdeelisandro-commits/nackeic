package com.nakeic.app.domain.model

/**
 * Modelos de Dominio de Alto Nivel para NAKEIC Android.
 * Incluyen mensajería E2EE, NAKEIC LIVE (co-hosts, batallas PK, regalos, moderación)
 * y billetera monetizable (NAKEIC Coins, Creator Diamonds, KYC y Retiros).
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
    val publicKeyFingerprint: String = "",
    val hasPassword: Boolean = false,
    val hasPin: Boolean = false
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
    val disappearingDurationSeconds: Long? = null,
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
    val reactions: Map<String, List<String>> = emptyMap(),
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
    val durationSeconds: Int? = null,
    val waveformPoints: List<Float> = emptyList(),
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
    val privacy: Visibility = Visibility.EVERYONE,
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

// =========================================================================
// NAKEIC LIVE STREAMING MODELS
// =========================================================================

data class LiveComment(
    val id: String,
    val roomId: String,
    val userId: String,
    val userName: String,
    val userAvatar: String? = null,
    val text: String,
    val type: String = "chat",
    val timestamp: Long = System.currentTimeMillis()
)

data class LiveGift(
    val id: String,
    val name: String,
    val emoji: String,
    val coins: Int,
    val animation: String = "pulse"
)

data class LiveCoHost(
    val userId: String,
    val userName: String,
    val userAvatar: String = "",
    val isMuted: Boolean = false,
    val isVideoPaused: Boolean = false,
    val joinedAt: Long = 0L
)

data class LiveGuestRequest(
    val userId: String,
    val userName: String,
    val userAvatar: String = "",
    val requestedAt: Long = 0L
)

data class LiveBattle(
    val id: String,
    val challengerRoomId: String,
    val opponentRoomId: String,
    val challengerHostId: String,
    val challengerHostName: String,
    val challengerHostAvatar: String = "",
    val opponentHostId: String,
    val opponentHostName: String,
    val opponentHostAvatar: String = "",
    val challengerScore: Int = 0,
    val opponentScore: Int = 0,
    val status: String = "active",
    val durationSeconds: Int = 180,
    val startedAt: Long = 0L,
    val endsAt: Long = 0L,
    val winnerHostId: String? = null
)

data class LiveRoom(
    val id: String,
    val hostId: String,
    val hostName: String,
    val hostUsername: String,
    val hostAvatar: String = "",
    val title: String,
    val description: String = "",
    val category: String = "General",
    val coverUrl: String? = null,
    val sourceMode: String = "camera",
    val joinPolicy: String = "everyone",
    val commentsEnabled: Boolean = true,
    val qualityPreset: String = "auto",
    val startedAt: Long = 0L,
    val viewerCount: Int = 0,
    val peakViewers: Int = 0,
    val likesCount: Int = 0,
    val giftsCount: Int = 0,
    val earnedCoins: Int = 0,
    val followersCount: Int = 0,
    val isAudioMuted: Boolean = false,
    val isVideoPaused: Boolean = false,
    val coHosts: List<LiveCoHost> = emptyList(),
    val guestRequests: List<LiveGuestRequest> = emptyList(),
    val moderatorIds: List<String> = emptyList(),
    val activeBattle: LiveBattle? = null
)

data class LiveHistoryItem(
    val id: String,
    val hostId: String,
    val hostName: String,
    val hostUsername: String,
    val hostAvatar: String = "",
    val title: String,
    val category: String,
    val durationSeconds: Int,
    val peakViewers: Int,
    val likesCount: Int,
    val giftsCount: Int,
    val earnedCoins: Int
)

data class LiveModerationLog(
    val id: String,
    val roomId: String,
    val actorUserId: String,
    val actorName: String,
    val targetUserId: String? = null,
    val action: String,
    val reason: String? = null,
    val createdAt: Long
)

// =========================================================================
// NAKEIC WALLET, COINS, DIAMONDS, KYC & PAYOUTS MODELS
// =========================================================================

data class CoinPackage(
    val id: String,
    val name: String,
    val coins: Int,
    val bonusCoins: Int,
    val priceCents: Int,
    val currency: String = "USD",
    val badge: String? = null
)

data class WalletAccount(
    val userId: String,
    val coinsBalance: Int = 0,
    val creatorDiamonds: Int = 0,
    val pendingPayoutCents: Int = 0,
    val kycStatus: String = "unverified",
    val kycFullName: String? = null,
    val kycCountry: String? = null,
    val updatedAt: Long = 0L
)

data class WalletTransaction(
    val id: String,
    val userId: String,
    val type: String,
    val amountCoins: Int,
    val amountDiamonds: Int,
    val amountCents: Int,
    val feeCents: Int,
    val currency: String,
    val balanceAfterCoins: Int,
    val status: String,
    val description: String,
    val createdAt: Long
)

data class PayoutRequest(
    val id: String,
    val userId: String,
    val amountDiamonds: Int,
    val grossCents: Int,
    val platformFeeCents: Int,
    val netCents: Int,
    val payoutMethod: String,
    val destinationMasked: String,
    val status: String,
    val kycVerified: Boolean,
    val createdAt: Long
)
