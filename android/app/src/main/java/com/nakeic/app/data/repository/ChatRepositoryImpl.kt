package com.nakeic.app.data.repository

import android.content.Context
import android.util.Base64
import com.nakeic.app.core.crypto.SignalProtocolEngine
import com.nakeic.app.data.local.ConversationDao
import com.nakeic.app.data.local.ConversationEntity
import com.nakeic.app.data.local.MessageDao
import com.nakeic.app.data.local.MessageEntity
import com.nakeic.app.data.network.NakeicApiClient
import com.nakeic.app.domain.model.Conversation
import com.nakeic.app.domain.model.Message
import com.nakeic.app.domain.model.MessageStatus
import com.nakeic.app.domain.model.MessageType
import com.nakeic.app.domain.model.WalletAccount
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import javax.inject.Inject
import javax.inject.Singleton

data class NetworkEnvironment(
    val httpBaseUrl: String,
    val wsBaseUrl: String,
    val isProduction: Boolean
) {
    companion object {
        fun resolve(): NetworkEnvironment {
            val isProd = com.nakeic.app.BuildConfig.BUILD_TYPE.equals("release", ignoreCase = true)
            return if (isProd) {
                NetworkEnvironment(
                    httpBaseUrl = "https://nakeic.chat",
                    wsBaseUrl = "wss://nakeic.chat",
                    isProduction = true
                )
            } else {
                NetworkEnvironment(
                    httpBaseUrl = "http://10.0.2.2:3000",
                    wsBaseUrl = "ws://10.0.2.2:3000",
                    isProduction = false
                )
            }
        }
    }
}

@Singleton
class ChatRepositoryImpl @Inject constructor(
    @ApplicationContext private val context: Context,
    private val conversationDao: ConversationDao,
    private val messageDao: MessageDao,
    private val cryptoEngine: SignalProtocolEngine
) : ChatRepository {

    private val environment = NetworkEnvironment.resolve()
    private val apiService by lazy { NakeicApiClient.create(environment.httpBaseUrl) }
    private val prefs by lazy { context.getSharedPreferences("nakeic_auth_prefs", Context.MODE_PRIVATE) }

    private var currentAuthToken: String? = prefs.getString("auth_token", null)
    private var currentUserId: String? = prefs.getString("user_id", null)
    private var currentDisplayName: String = prefs.getString("display_name", "Usuario NAKEIC") ?: "Usuario NAKEIC"

    override fun setAuthSession(token: String, userId: String, displayName: String) {
        currentAuthToken = token
        currentUserId = userId
        currentDisplayName = displayName
        prefs.edit()
            .putString("auth_token", token)
            .putString("user_id", userId)
            .putString("display_name", displayName)
            .apply()
    }

    override fun clearAuthSession() {
        currentAuthToken = null
        currentUserId = null
        currentDisplayName = "Usuario NAKEIC"
        prefs.edit().clear().apply()
    }

    override fun getCurrentUserId(): String? = currentUserId

    override fun getCurrentUserDisplayName(): String = currentDisplayName

    override fun getAuthToken(): String? = currentAuthToken

    override fun getConversations(): Flow<List<Conversation>> {
        return conversationDao.getAllConversationsFlow().map { entities ->
            entities.map { it.toDomain() }
        }
    }

    override fun getMessages(conversationId: String): Flow<List<Message>> {
        return messageDao.getMessagesForConversationFlow(conversationId).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    override suspend fun syncRemoteConversations(userId: String): Result<Int> = withContext(Dispatchers.IO) {
        executeWithRetry {
            val token = currentAuthToken ?: throw IllegalStateException("Requiere sesión autenticada")
            val url = URL("${environment.httpBaseUrl}/api/conversations?userId=$userId")
            val connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 6000
                readTimeout = 6000
                setRequestProperty("Authorization", "Bearer $token")
            }

            if (connection.responseCode in 200..299) {
                val responseText = connection.inputStream.bufferedReader().use { it.readText() }
                val jsonArray = JSONArray(responseText)
                var count = 0

                for (i in 0 until jsonArray.length()) {
                    val item = jsonArray.getJSONObject(i)
                    val entity = ConversationEntity(
                        id = item.getString("id"),
                        title = item.getString("title"),
                        isGroup = item.optString("type") == "group" || item.optBoolean("isGroup", false),
                        avatarUrl = item.optString("avatarUrl", null),
                        unreadCount = 0,
                        isPinned = item.optBoolean("isPinned", false),
                        isMuted = item.optBoolean("isMuted", false),
                        disappearingDurationSeconds = null,
                        lastMessageSnippet = item.optString("lastMessageText", ""),
                        lastMessageTimestamp = item.optLong("lastMessageTime", System.currentTimeMillis()),
                        lastMessageStatus = "READ"
                    )
                    conversationDao.insertOrUpdate(entity)
                    count++
                }
                count
            } else if (connection.responseCode == 401) {
                throw IllegalStateException("Sesión vencida. Requiere re-autenticación.")
            } else {
                throw Exception("Error de red: código HTTP ${connection.responseCode}")
            }
        }
    }

    override suspend fun syncRemoteMessages(conversationId: String): Result<Int> = withContext(Dispatchers.IO) {
        executeWithRetry {
            val token = currentAuthToken ?: throw IllegalStateException("Requiere sesión autenticada")
            val url = URL("${environment.httpBaseUrl}/api/messages?conversationId=$conversationId")
            val connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 6000
                readTimeout = 6000
                setRequestProperty("Authorization", "Bearer $token")
            }

            if (connection.responseCode in 200..299) {
                val responseText = connection.inputStream.bufferedReader().use { it.readText() }
                val jsonArray = JSONArray(responseText)
                var count = 0

                for (i in 0 until jsonArray.length()) {
                    val item = jsonArray.getJSONObject(i)
                    val entity = MessageEntity(
                        id = item.getString("id"),
                        conversationId = item.getString("conversationId"),
                        senderId = item.getString("senderId"),
                        senderName = item.optString("senderName", ""),
                        text = item.optString("text", ""),
                        type = item.optString("type", "TEXT").uppercase(),
                        status = item.optString("status", "SENT").uppercase(),
                        timestamp = item.optLong("timestamp", System.currentTimeMillis()),
                        mediaUrl = item.optString("mediaUrl", null),
                        mimeType = null,
                        fileName = item.optString("fileName", null),
                        fileSizeBytes = null,
                        durationSeconds = null,
                        replyToId = item.optString("replyToId", null),
                        isPinned = item.optBoolean("isPinned", false),
                        reactionsJson = null,
                        disappearingAfterTimestamp = null
                    )
                    messageDao.insertMessage(entity)
                    count++
                }
                count
            } else {
                throw Exception("Error sincronizando mensajes: código HTTP ${connection.responseCode}")
            }
        }
    }

    override suspend fun sendMessage(message: Message): Result<Message> = withContext(Dispatchers.IO) {
        try {
            val entity = message.toEntity()
            messageDao.insertMessage(entity)

            val token = currentAuthToken
            if (token.isNullOrBlank()) {
                return@withContext Result.failure(IllegalStateException("Inicia sesión verificada para enviar mensajes."))
            }

            val url = URL("${environment.httpBaseUrl}/api/messages")
            val connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Authorization", "Bearer $token")
                connectTimeout = 5000
                readTimeout = 5000
            }

            val payload = JSONObject().apply {
                put("id", message.id)
                put("conversationId", message.conversationId)
                put("text", message.text)
                put("messageType", message.type.name.lowercase())
                message.mediaAttachment?.let { put("mediaUrl", it.url) }
            }

            OutputStreamWriter(connection.outputStream).use { it.write(payload.toString()) }

            if (connection.responseCode in 200..299) {
                messageDao.updateMessageStatus(message.id, MessageStatus.SENT.name)
                Result.success(message.copy(status = MessageStatus.SENT))
            } else {
                Result.success(message)
            }
        } catch (_: Exception) {
            Result.success(message)
        }
    }

    override suspend fun updateMessageStatus(messageId: String, status: MessageStatus) {
        withContext(Dispatchers.IO) {
            messageDao.updateMessageStatus(messageId, status.name)
        }
    }

    override suspend fun addReaction(messageId: String, emoji: String) {
        withContext(Dispatchers.IO) {
            val token = currentAuthToken ?: return@withContext
            try {
                val url = URL("${environment.httpBaseUrl}/api/messages/$messageId/react")
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json")
                    setRequestProperty("Authorization", "Bearer $token")
                }
                OutputStreamWriter(conn.outputStream).use {
                    it.write(JSONObject().apply { put("emoji", emoji) }.toString())
                }
                conn.responseCode
            } catch (_: Exception) {}
        }
    }

    override suspend fun deleteMessage(messageId: String, forEveryone: Boolean) = withContext(Dispatchers.IO) {
        if (forEveryone) {
            messageDao.updateMessageStatus(messageId, "DELETED_FOR_EVERYONE")
        }
        val token = currentAuthToken ?: return@withContext
        try {
            val url = URL("${environment.httpBaseUrl}/api/messages/$messageId?forEveryone=$forEveryone")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "DELETE"
                setRequestProperty("Authorization", "Bearer $token")
            }
            conn.responseCode
        } catch (_: Exception) {}
    }

    override suspend fun pinMessage(messageId: String, isPinned: Boolean) = withContext(Dispatchers.IO) {
        val token = currentAuthToken ?: return@withContext
        try {
            val url = URL("${environment.httpBaseUrl}/api/messages/$messageId/pin")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Authorization", "Bearer $token")
            }
            OutputStreamWriter(conn.outputStream).use {
                it.write(JSONObject().apply { put("isPinned", isPinned) }.toString())
            }
            conn.responseCode
        } catch (_: Exception) {}
    }

    override suspend fun setDisappearingTimer(conversationId: String, durationSeconds: Long?) = withContext(Dispatchers.IO) {
        val token = currentAuthToken ?: return@withContext
        try {
            val url = URL("${environment.httpBaseUrl}/api/conversations/$conversationId/disappearing")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "PATCH"
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Authorization", "Bearer $token")
            }
            OutputStreamWriter(conn.outputStream).use {
                it.write(JSONObject().apply { put("disappearingSeconds", durationSeconds ?: JSONObject.NULL) }.toString())
            }
            conn.responseCode
        } catch (_: Exception) {}
    }

    override suspend fun uploadMedia(fileBytes: ByteArray, fileName: String, mimeType: String): Result<String> = withContext(Dispatchers.IO) {
        try {
            val token = currentAuthToken ?: return@withContext Result.failure(IllegalStateException("Sesión requerida para subir multimedia"))
            val encoded = Base64.encodeToString(fileBytes, Base64.NO_WRAP)
            val dataUrl = "data:$mimeType;base64,$encoded"
            val url = URL("${environment.httpBaseUrl}/api/media/upload")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Authorization", "Bearer $token")
                connectTimeout = 10000
                readTimeout = 10000
            }
            OutputStreamWriter(conn.outputStream).use {
                it.write(JSONObject().apply {
                    put("fileName", fileName)
                    put("mimeType", mimeType)
                    put("dataUrl", dataUrl)
                }.toString())
            }
            if (conn.responseCode in 200..299) {
                val resJson = JSONObject(conn.inputStream.bufferedReader().use { it.readText() })
                Result.success(resJson.optString("url", ""))
            } else {
                Result.failure(Exception("HTTP ${conn.responseCode}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun searchRemoteMessages(query: String): Result<List<Message>> = withContext(Dispatchers.IO) {
        try {
            val token = currentAuthToken ?: return@withContext Result.failure(IllegalStateException("Sesión requerida"))
            val encodedQ = URLEncoder.encode(query, "UTF-8")
            val url = URL("${environment.httpBaseUrl}/api/messages/search?q=$encodedQ")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                setRequestProperty("Authorization", "Bearer $token")
            }
            if (conn.responseCode in 200..299) {
                val root = JSONObject(conn.inputStream.bufferedReader().use { it.readText() })
                val results = root.optJSONArray("results") ?: JSONArray()
                val msgs = (0 until results.length()).mapNotNull { i ->
                    val m = results.optJSONObject(i)?.optJSONObject("message") ?: return@mapNotNull null
                    Message(
                        id = m.optString("id"),
                        conversationId = m.optString("conversationId"),
                        senderId = m.optString("senderId"),
                        senderName = m.optString("senderName"),
                        text = m.optString("text"),
                        timestamp = m.optLong("timestamp", 0L)
                    )
                }
                Result.success(msgs)
            } else {
                Result.failure(Exception("Error buscando mensajes: HTTP ${conn.responseCode}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getWalletBalance(): Result<WalletAccount> = withContext(Dispatchers.IO) {
        try {
            val token = currentAuthToken ?: return@withContext Result.failure(IllegalStateException("Sesión requerida"))
            val response = apiService.getWalletBalance("Bearer $token")
            val body = response.body()
            if (response.isSuccessful && body?.wallet != null) {
                Result.success(body.wallet)
            } else {
                Result.failure(Exception("No se pudo obtener el saldo (HTTP ${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private suspend fun <T> executeWithRetry(
        maxRetries: Int = 3,
        initialDelayMs: Long = 500,
        block: suspend () -> T
    ): Result<T> {
        var currentDelay = initialDelayMs
        repeat(maxRetries - 1) {
            try {
                return Result.success(block())
            } catch (_: Exception) {
                delay(currentDelay)
                currentDelay *= 2
            }
        }
        return try {
            Result.success(block())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun ConversationEntity.toDomain() = Conversation(
        id = id,
        title = title,
        isGroup = isGroup,
        avatarUrl = avatarUrl,
        unreadCount = unreadCount,
        isPinned = isPinned,
        isMuted = isMuted,
        disappearingDurationSeconds = disappearingDurationSeconds
    )

    private fun MessageEntity.toDomain() = Message(
        id = id,
        conversationId = conversationId,
        senderId = senderId,
        senderName = senderName,
        text = text,
        type = try { MessageType.valueOf(type) } catch (_: Exception) { MessageType.TEXT },
        status = try { MessageStatus.valueOf(status) } catch (_: Exception) { MessageStatus.SENT },
        timestamp = timestamp,
        isPinned = isPinned
    )

    private fun Message.toEntity() = MessageEntity(
        id = id,
        conversationId = conversationId,
        senderId = senderId,
        senderName = senderName,
        text = text,
        type = type.name,
        status = status.name,
        timestamp = timestamp,
        mediaUrl = mediaAttachment?.url,
        mimeType = mediaAttachment?.mimeType,
        fileName = mediaAttachment?.fileName,
        fileSizeBytes = mediaAttachment?.fileSizeBytes,
        durationSeconds = mediaAttachment?.durationSeconds,
        replyToId = replyTo?.messageId,
        isPinned = isPinned,
        reactionsJson = null,
        disappearingAfterTimestamp = disappearingAfterSeconds?.let { timestamp + (it * 1000) }
    )
}
