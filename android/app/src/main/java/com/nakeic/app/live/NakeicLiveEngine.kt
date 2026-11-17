package com.nakeic.app.live

import com.nakeic.app.data.network.NakeicApiClient
import com.nakeic.app.data.repository.NetworkEnvironment
import com.nakeic.app.domain.model.LiveBattle
import com.nakeic.app.domain.model.LiveCoHost
import com.nakeic.app.domain.model.LiveComment
import com.nakeic.app.domain.model.LiveGuestRequest
import com.nakeic.app.domain.model.LiveRoom
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONArray
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

data class LiveEngineState(
    val isConnected: Boolean = false,
    val rooms: List<LiveRoom> = emptyList(),
    val activeRoom: LiveRoom? = null,
    val hostingRoom: LiveRoom? = null,
    val comments: List<LiveComment> = emptyList(),
    val activeBattle: LiveBattle? = null,
    val pendingBattleChallenge: LiveBattle? = null,
    val lastGiftBanner: String? = null,
    val noticeBanner: String? = null,
    val latestFrameBase64: String? = null,
    val walletCoinsBalance: Int? = null,
    val isFollowingHost: Boolean = false
)

/**
 * NakeicLiveEngine
 * Cliente WebSocket nativo Android (OkHttp) para NAKEIC LIVE (/ws/live).
 * Gestiona salas en vivo ilimitadas, chat en tiempo real, regalos autoritativos,
 * pantalla dividida multi-invitado (hasta 3 co-anfitriones), batallas PK y moderación.
 */
@Singleton
class NakeicLiveEngine @Inject constructor() {

    private val client: OkHttpClient = NakeicApiClient.createOkHttpClient()
    private val env = NetworkEnvironment.resolve()
    private var ws: WebSocket? = null

    private var authToken: String? = null
    private var currentUserId: String = ""
    private var currentUserName: String = "Usuario NAKEIC"
    private var currentUserAvatar: String = ""

    private val _state = MutableStateFlow(LiveEngineState())
    val state: StateFlow<LiveEngineState> = _state.asStateFlow()

    fun connect(
        token: String?,
        userId: String,
        userName: String,
        userAvatar: String = ""
    ) {
        authToken = token
        currentUserId = userId
        currentUserName = userName
        currentUserAvatar = userAvatar

        if (ws != null) {
            registerClient()
            return
        }

        val request = Request.Builder()
            .url("${env.wsBaseUrl}/ws/live")
            .build()

        ws = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                _state.update { it.copy(isConnected = true) }
                registerClient()
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                handleIncomingEvent(text)
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                ws = null
                _state.update { it.copy(isConnected = false) }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                ws = null
                _state.update {
                    it.copy(
                        isConnected = false,
                        noticeBanner = "Reconectando NAKEIC LIVE: ${t.message ?: "red"}"
                    )
                }
            }
        })
    }

    fun disconnect() {
        ws?.close(1000, "client_disconnect")
        ws = null
        _state.update { it.copy(isConnected = false) }
    }

    private fun registerClient() {
        sendEvent(
            "live:register_client",
            JSONObject().apply {
                put("token", authToken ?: JSONObject.NULL)
                put("userId", currentUserId)
                put("userName", currentUserName)
                put("userAvatar", currentUserAvatar)
            }
        )
    }

    fun startBroadcast(
        title: String,
        description: String = "",
        category: String = "General",
        sourceMode: String = "camera",
        joinPolicy: String = "everyone",
        commentsEnabled: Boolean = true,
        qualityPreset: String = "auto",
        bannedWords: List<String> = emptyList()
    ) {
        sendEvent(
            "live:start",
            JSONObject().apply {
                put("title", title)
                put("description", description)
                put("category", category)
                put("sourceMode", sourceMode)
                put("joinPolicy", joinPolicy)
                put("commentsEnabled", commentsEnabled)
                put("qualityPreset", qualityPreset)
                put("bannedWords", JSONArray(bannedWords))
                put("hostId", currentUserId)
                put("hostName", currentUserName)
                put("hostUsername", currentUserName.lowercase().replace(" ", "_"))
                put("hostAvatar", currentUserAvatar)
                put("token", authToken ?: JSONObject.NULL)
            }
        )
    }

    fun stopBroadcast(roomId: String) {
        sendEvent("live:stop", JSONObject().apply { put("roomId", roomId) })
        _state.update { it.copy(hostingRoom = null) }
    }

    fun joinRoom(roomId: String) {
        sendEvent(
            "live:join",
            JSONObject().apply {
                put("roomId", roomId)
                put("viewerId", currentUserId)
                put("viewerName", currentUserName)
                put("viewerAvatar", currentUserAvatar)
                put("token", authToken ?: JSONObject.NULL)
            }
        )
    }

    fun leaveRoom(roomId: String) {
        sendEvent("live:leave", JSONObject().apply { put("roomId", roomId) })
        _state.update { it.copy(activeRoom = null, latestFrameBase64 = null) }
    }

    fun sendComment(roomId: String, text: String) {
        if (text.isBlank()) return
        sendEvent(
            "live:comment",
            JSONObject().apply {
                put("roomId", roomId)
                put("userId", currentUserId)
                put("userName", currentUserName)
                put("userAvatar", currentUserAvatar)
                put("text", text.trim())
            }
        )
    }

    fun sendReaction(roomId: String, emoji: String = "❤️") {
        sendEvent(
            "live:reaction",
            JSONObject().apply {
                put("roomId", roomId)
                put("userId", currentUserId)
                put("userName", currentUserName)
                put("emoji", emoji)
            }
        )
    }

    fun sendGift(roomId: String, giftId: String, quantity: Int = 1) {
        sendEvent(
            "live:gift",
            JSONObject().apply {
                put("roomId", roomId)
                put("userId", currentUserId)
                put("userName", currentUserName)
                put("userAvatar", currentUserAvatar)
                put("giftId", giftId)
                put("quantity", quantity)
                put("token", authToken ?: JSONObject.NULL)
            }
        )
    }

    fun toggleFollow(roomId: String, hostId: String) {
        sendEvent(
            "live:follow",
            JSONObject().apply {
                put("roomId", roomId)
                put("hostId", hostId)
                put("followerId", currentUserId)
            }
        )
    }

    fun requestCoHostSlot(roomId: String) {
        sendEvent(
            "live:guest_request",
            JSONObject().apply {
                put("roomId", roomId)
                put("userId", currentUserId)
                put("userName", currentUserName)
                put("userAvatar", currentUserAvatar)
            }
        )
    }

    fun respondGuestRequest(roomId: String, targetUserId: String, accept: Boolean) {
        sendEvent(
            "live:guest_respond",
            JSONObject().apply {
                put("roomId", roomId)
                put("targetUserId", targetUserId)
                put("accept", accept)
            }
        )
    }

    fun challengeBattle(roomId: String, opponentRoomId: String, durationSeconds: Int = 180) {
        sendEvent(
            "live:battle_challenge",
            JSONObject().apply {
                put("roomId", roomId)
                put("opponentRoomId", opponentRoomId)
                put("durationSeconds", durationSeconds)
            }
        )
    }

    fun respondBattle(battleId: String, accept: Boolean) {
        sendEvent(
            if (accept) "live:battle_accept" else "live:battle_decline",
            JSONObject().apply { put("battleId", battleId) }
        )
        _state.update { it.copy(pendingBattleChallenge = null) }
    }

    fun muteViewer(roomId: String, targetUserId: String, durationSeconds: Int = 300) {
        sendEvent(
            "live:mod_mute",
            JSONObject().apply {
                put("roomId", roomId)
                put("targetUserId", targetUserId)
                put("durationSeconds", durationSeconds)
            }
        )
    }

    fun banViewer(roomId: String, targetUserId: String, reason: String = "Moderación") {
        sendEvent(
            "live:mod_ban",
            JSONObject().apply {
                put("roomId", roomId)
                put("targetUserId", targetUserId)
                put("reason", reason)
            }
        )
    }

    fun deleteComment(roomId: String, commentId: String) {
        sendEvent(
            "live:mod_delete_comment",
            JSONObject().apply {
                put("roomId", roomId)
                put("commentId", commentId)
            }
        )
    }

    fun clearNotice() {
        _state.update { it.copy(noticeBanner = null) }
    }

    private fun sendEvent(type: String, data: JSONObject) {
        val payload = JSONObject().apply {
            put("type", type)
            put("data", data)
        }
        ws?.send(payload.toString())
    }

    private fun handleIncomingEvent(raw: String) {
        try {
            val root = JSONObject(raw)
            val type = root.optString("type")
            val data = root.optJSONObject("data") ?: JSONObject()

            when (type) {
                "live:rooms_list" -> {
                    val arr = data.optJSONArray("rooms") ?: JSONArray()
                    val parsed = (0 until arr.length()).mapNotNull { idx ->
                        arr.optJSONObject(idx)?.let { parseRoom(it) }
                    }
                    _state.update { it.copy(rooms = parsed) }
                }

                "live:started" -> {
                    data.optJSONObject("room")?.let { r ->
                        val room = parseRoom(r)
                        val commentsList = parseComments(r.optJSONArray("comments"))
                        _state.update {
                            it.copy(hostingRoom = room, comments = commentsList, noticeBanner = "Transmisión en vivo iniciada")
                        }
                    }
                }

                "live:room_snapshot" -> {
                    data.optJSONObject("room")?.let { r ->
                        val room = parseRoom(r)
                        val commentsList = parseComments(r.optJSONArray("comments"))
                        val frame = r.optString("lastFrame", "")
                        _state.update {
                            it.copy(
                                activeRoom = room,
                                comments = commentsList,
                                activeBattle = room.activeBattle,
                                isFollowingHost = data.optBoolean("isFollowing", false),
                                latestFrameBase64 = frame.ifBlank { it.latestFrameBase64 }
                            )
                        }
                    }
                }

                "live:media_frame" -> {
                    val frameData = data.optString("frameData", "")
                    if (frameData.isNotBlank()) {
                        _state.update { it.copy(latestFrameBase64 = frameData) }
                    }
                }

                "live:comment" -> {
                    data.optJSONObject("comment")?.let { cObj ->
                        val c = parseComment(cObj)
                        _state.update { st ->
                            st.copy(comments = (st.comments.filterNot { it.id == c.id } + c).takeLast(80))
                        }
                    }
                }

                "live:comment_deleted" -> {
                    val commentId = data.optString("commentId")
                    _state.update { st ->
                        st.copy(comments = st.comments.filterNot { it.id == commentId })
                    }
                }

                "live:viewer_update" -> {
                    val vCount = data.optInt("viewerCount", 0)
                    _state.update { st ->
                        st.copy(
                            activeRoom = st.activeRoom?.copy(viewerCount = vCount),
                            hostingRoom = st.hostingRoom?.copy(viewerCount = vCount)
                        )
                    }
                }

                "live:reaction" -> {
                    val likes = data.optInt("likesCount", 0)
                    _state.update { st ->
                        st.copy(
                            activeRoom = st.activeRoom?.copy(likesCount = likes),
                            hostingRoom = st.hostingRoom?.copy(likesCount = likes)
                        )
                    }
                }

                "live:gift" -> {
                    val banner = "${data.optString("userName")} envió ${data.optString("giftEmoji")} ${data.optString("giftName")} (+${data.optInt("coins")} Coins)"
                    val gCount = data.optInt("giftsCount", 0)
                    val coins = data.optInt("earnedCoins", 0)
                    val commentObj = data.optJSONObject("comment")?.let { parseComment(it) }
                    _state.update { st ->
                        st.copy(
                            lastGiftBanner = banner,
                            activeRoom = st.activeRoom?.copy(giftsCount = gCount, earnedCoins = coins),
                            hostingRoom = st.hostingRoom?.copy(giftsCount = gCount, earnedCoins = coins),
                            comments = if (commentObj != null) (st.comments + commentObj).takeLast(80) else st.comments
                        )
                    }
                }

                "live:gift_error", "live:moderation_notice", "live:join_denied", "live:banned_from_room" -> {
                    val msg = data.optString("error").ifBlank { data.optString("reason", "Aviso de NAKEIC LIVE") }
                    _state.update { it.copy(noticeBanner = msg) }
                    if (type == "live:banned_from_room") {
                        _state.update { st -> st.copy(activeRoom = null) }
                    }
                }

                "wallet:balance_update" -> {
                    data.optJSONObject("wallet")?.let { w ->
                        _state.update { it.copy(walletCoinsBalance = w.optInt("coinsBalance", 0)) }
                    }
                }

                "live:battle_challenged" -> {
                    data.optJSONObject("battle")?.let { b ->
                        _state.update { it.copy(pendingBattleChallenge = parseBattle(b)) }
                    }
                }

                "live:battle_started", "live:battle_update" -> {
                    data.optJSONObject("battle")?.let { b ->
                        _state.update { it.copy(activeBattle = parseBattle(b)) }
                    }
                }

                "live:battle_ended" -> {
                    _state.update { it.copy(activeBattle = null, noticeBanner = "Batalla PK finalizada") }
                }

                "live:ended" -> {
                    _state.update { it.copy(activeRoom = null, hostingRoom = null, activeBattle = null, noticeBanner = "Transmisión finalizada") }
                }
            }
        } catch (_: Exception) {
            // Ignore malformed frame safely
        }
    }

    private fun parseRoom(obj: JSONObject): LiveRoom {
        val coHostsArr = obj.optJSONArray("coHosts") ?: JSONArray()
        val coHosts = (0 until coHostsArr.length()).mapNotNull { i ->
            coHostsArr.optJSONObject(i)?.let { c ->
                LiveCoHost(
                    userId = c.optString("userId"),
                    userName = c.optString("userName"),
                    userAvatar = c.optString("userAvatar"),
                    isMuted = c.optBoolean("isMuted", false),
                    isVideoPaused = c.optBoolean("isVideoPaused", false)
                )
            }
        }
        val reqArr = obj.optJSONArray("guestRequests") ?: JSONArray()
        val guestReqs = (0 until reqArr.length()).mapNotNull { i ->
            reqArr.optJSONObject(i)?.let { g ->
                LiveGuestRequest(
                    userId = g.optString("userId"),
                    userName = g.optString("userName"),
                    userAvatar = g.optString("userAvatar"),
                    requestedAt = g.optLong("requestedAt", 0L)
                )
            }
        }
        val modsArr = obj.optJSONArray("moderatorIds") ?: JSONArray()
        val mods = (0 until modsArr.length()).map { modsArr.optString(it) }.filter { it.isNotBlank() }

        return LiveRoom(
            id = obj.optString("id"),
            hostId = obj.optString("hostId"),
            hostName = obj.optString("hostName"),
            hostUsername = obj.optString("hostUsername"),
            hostAvatar = obj.optString("hostAvatar"),
            title = obj.optString("title"),
            description = obj.optString("description"),
            category = obj.optString("category", "General"),
            coverUrl = obj.optString("coverUrl").ifBlank { null },
            sourceMode = obj.optString("sourceMode", "camera"),
            joinPolicy = obj.optString("joinPolicy", "everyone"),
            commentsEnabled = obj.optBoolean("commentsEnabled", true),
            qualityPreset = obj.optString("qualityPreset", "auto"),
            startedAt = obj.optLong("startedAt", 0L),
            viewerCount = obj.optInt("viewerCount", 0),
            peakViewers = obj.optInt("peakViewers", 0),
            likesCount = obj.optInt("likesCount", 0),
            giftsCount = obj.optInt("giftsCount", 0),
            earnedCoins = obj.optInt("earnedCoins", 0),
            followersCount = obj.optInt("followersCount", 0),
            isAudioMuted = obj.optBoolean("isAudioMuted", false),
            isVideoPaused = obj.optBoolean("isVideoPaused", false),
            coHosts = coHosts,
            guestRequests = guestReqs,
            moderatorIds = mods,
            activeBattle = obj.optJSONObject("activeBattle")?.let { parseBattle(it) }
        )
    }

    private fun parseComment(obj: JSONObject) = LiveComment(
        id = obj.optString("id"),
        roomId = obj.optString("roomId"),
        userId = obj.optString("userId"),
        userName = obj.optString("userName"),
        userAvatar = obj.optString("userAvatar").ifBlank { null },
        text = obj.optString("text"),
        type = obj.optString("type", "chat"),
        timestamp = obj.optLong("timestamp", System.currentTimeMillis())
    )

    private fun parseComments(arr: JSONArray?): List<LiveComment> {
        if (arr == null) return emptyList()
        return (0 until arr.length()).mapNotNull { i -> arr.optJSONObject(i)?.let { parseComment(it) } }
    }

    private fun parseBattle(obj: JSONObject) = LiveBattle(
        id = obj.optString("id"),
        challengerRoomId = obj.optString("challengerRoomId"),
        opponentRoomId = obj.optString("opponentRoomId"),
        challengerHostId = obj.optString("challengerHostId"),
        challengerHostName = obj.optString("challengerHostName"),
        opponentHostId = obj.optString("opponentHostId"),
        opponentHostName = obj.optString("opponentHostName"),
        challengerScore = obj.optInt("challengerScore", 0),
        opponentScore = obj.optInt("opponentScore", 0),
        status = obj.optString("status", "active"),
        durationSeconds = obj.optInt("durationSeconds", 180),
        startedAt = obj.optLong("startedAt", 0L),
        endsAt = obj.optLong("endsAt", 0L),
        winnerHostId = obj.optString("winnerHostId").ifBlank { null }
    )
}
