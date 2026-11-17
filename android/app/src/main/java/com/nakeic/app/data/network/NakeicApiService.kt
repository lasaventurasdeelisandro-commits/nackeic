package com.nakeic.app.data.network

import com.nakeic.app.domain.model.CoinPackage
import com.nakeic.app.domain.model.LiveBattle
import com.nakeic.app.domain.model.LiveGift
import com.nakeic.app.domain.model.LiveHistoryItem
import com.nakeic.app.domain.model.LiveModerationLog
import com.nakeic.app.domain.model.LiveRoom
import com.nakeic.app.domain.model.PayoutRequest
import com.nakeic.app.domain.model.WalletAccount
import com.nakeic.app.domain.model.WalletTransaction
import okhttp3.OkHttpClient
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import java.util.concurrent.TimeUnit

data class OtpSendRequest(val phoneNumber: String)
data class OtpSendResponse(val success: Boolean, val message: String? = null, val expiresInSeconds: Int = 300)

data class LoginOtpRequest(val phoneNumber: String, val otpCode: String, val deviceName: String = "NAKEIC Android")
data class PasswordLoginRequest(val phoneNumber: String, val password: String, val deviceName: String = "NAKEIC Android")
data class RegisterRequest(
    val phoneNumber: String,
    val otpCode: String,
    val displayName: String,
    val username: String,
    val password: String? = null
)
data class RecoverPasswordRequest(val phoneNumber: String, val otpCode: String, val newPassword: String)

data class AuthUserDto(
    val id: String,
    val phoneNumber: String,
    val displayName: String,
    val username: String,
    val avatarUrl: String? = null
)
data class AuthResponse(
    val success: Boolean,
    val token: String? = null,
    val user: AuthUserDto? = null,
    val error: String? = null
)

data class LiveRoomsResponse(val rooms: List<LiveRoom> = emptyList(), val totalActive: Int = 0)
data class LiveHistoryResponse(val success: Boolean = true, val history: List<LiveHistoryItem> = emptyList())
data class BattleLeaderboardEntry(val hostId: String, val hostName: String, val wins: Int, val totalScore: Int)
data class BattlesLeaderboardResponse(
    val success: Boolean = true,
    val leaderboard: List<BattleLeaderboardEntry> = emptyList(),
    val recentBattles: List<LiveBattle> = emptyList()
)
data class ModerationLogsResponse(val success: Boolean = true, val logs: List<LiveModerationLog> = emptyList())
data class LiveReportRequest(val roomId: String, val reportedUserId: String, val reason: String, val details: String = "")
data class GeneralReportRequest(val reportedUserId: String? = null, val conversationId: String? = null, val reason: String, val details: String = "")
data class GenericSuccessResponse(val success: Boolean = true, val error: String? = null)

data class WalletBalanceResponse(val success: Boolean = true, val wallet: WalletAccount? = null)
data class CoinPackagesResponse(val success: Boolean = true, val packages: List<CoinPackage> = emptyList())
data class GiftCatalogResponse(val success: Boolean = true, val gifts: List<LiveGift> = emptyList())
data class WalletTransactionsResponse(val success: Boolean = true, val transactions: List<WalletTransaction> = emptyList())
data class WalletPayoutsResponse(val success: Boolean = true, val payouts: List<PayoutRequest> = emptyList())
data class PurchaseIntentRequest(val packageId: String, val provider: String = "stripe")
data class PurchaseIntentWrapper(val paymentReference: String? = null, val packageId: String? = null)
data class PurchaseIntentResponse(
    val success: Boolean = true,
    val status: String? = null,
    val intent: PurchaseIntentWrapper? = null,
    val error: String? = null
)
data class KycSubmitRequest(val fullName: String, val country: String, val documentNumber: String)
data class WithdrawRequest(val diamonds: Int, val method: String, val destinationAccount: String)
data class FcmTokenRequest(val userId: String, val fcmToken: String)
data class IceConfigRequest(val roomId: String? = null, val role: String = "viewer")
data class RtcServerEntry(val urls: Any? = null, val username: String? = null, val credential: String? = null)
data class RtcConfigWrapper(
    val mode: String = "webrtc_mesh_relay",
    val livekitConfigured: Boolean = false,
    val livekitUrl: String? = null,
    val livekitToken: String? = null,
    val iceServers: List<RtcServerEntry> = emptyList(),
    val turnConfigured: Boolean = false
)
data class RtcConfigResponse(val success: Boolean = true, val rtcConfig: RtcConfigWrapper? = null)

/**
 * NakeicApiService
 * Interfaz Retrofit 2 oficial contra el backend Node.js/TypeScript de NAKEIC.
 */
interface NakeicApiService {

    // --- Autenticación verificada (OTP + Contraseña + Recuperación) ---
    @POST("/api/auth/otp/send")
    suspend fun sendOtp(@Body req: OtpSendRequest): Response<OtpSendResponse>

    @POST("/api/auth/register")
    suspend fun register(@Body req: RegisterRequest): Response<AuthResponse>

    @POST("/api/auth/login")
    suspend fun loginWithOtp(@Body req: LoginOtpRequest): Response<AuthResponse>

    @POST("/api/auth/login/password")
    suspend fun loginWithPassword(@Body req: PasswordLoginRequest): Response<AuthResponse>

    @POST("/api/auth/password/recover")
    suspend fun recoverPassword(@Body req: RecoverPasswordRequest): Response<GenericSuccessResponse>

    // --- Notificaciones Push FCM ---
    @POST("/api/users/fcm-token")
    suspend fun registerFcmToken(
        @Header("Authorization") bearer: String,
        @Body req: FcmTokenRequest
    ): Response<GenericSuccessResponse>

    // --- NAKEIC LIVE ---
    @GET("/api/live/rooms")
    suspend fun getLiveRooms(
        @Query("tab") tab: String = "recommended",
        @Query("category") category: String? = null,
        @Query("q") query: String? = null,
        @Query("userId") userId: String? = null
    ): Response<LiveRoomsResponse>

    @GET("/api/live/history")
    suspend fun getLiveHistory(): Response<LiveHistoryResponse>

    @GET("/api/live/battles/leaderboard")
    suspend fun getBattlesLeaderboard(): Response<BattlesLeaderboardResponse>

    @POST("/api/live/rtc-config")
    suspend fun getLiveRtcConfig(
        @Header("Authorization") bearer: String,
        @Body req: IceConfigRequest
    ): Response<RtcConfigResponse>

    @GET("/api/live/{roomId}/moderation-logs")
    suspend fun getLiveModerationLogs(
        @Header("Authorization") bearer: String,
        @Path("roomId") roomId: String
    ): Response<ModerationLogsResponse>

    @POST("/api/live/report")
    suspend fun reportLiveRoom(
        @Header("Authorization") bearer: String,
        @Body req: LiveReportRequest
    ): Response<GenericSuccessResponse>

    @POST("/api/reports")
    suspend fun reportUserOrChat(
        @Header("Authorization") bearer: String,
        @Body req: GeneralReportRequest
    ): Response<GenericSuccessResponse>

    // --- Billetera NAKEIC Coins, Diamantes, KYC y Retiros ---
    @GET("/api/wallet/balance")
    suspend fun getWalletBalance(@Header("Authorization") bearer: String): Response<WalletBalanceResponse>

    @GET("/api/wallet/packages")
    suspend fun getCoinPackages(): Response<CoinPackagesResponse>

    @GET("/api/wallet/gifts")
    suspend fun getGiftCatalog(): Response<GiftCatalogResponse>

    @GET("/api/wallet/transactions")
    suspend fun getWalletTransactions(
        @Header("Authorization") bearer: String,
        @Query("limit") limit: Int = 30
    ): Response<WalletTransactionsResponse>

    @GET("/api/wallet/payouts")
    suspend fun getWalletPayouts(@Header("Authorization") bearer: String): Response<WalletPayoutsResponse>

    @POST("/api/wallet/purchase")
    suspend fun createCoinPurchaseIntent(
        @Header("Authorization") bearer: String,
        @Body req: PurchaseIntentRequest
    ): Response<PurchaseIntentResponse>

    @POST("/api/wallet/kyc")
    suspend fun submitKyc(
        @Header("Authorization") bearer: String,
        @Body req: KycSubmitRequest
    ): Response<WalletBalanceResponse>

    @POST("/api/wallet/withdraw")
    suspend fun requestWithdrawal(
        @Header("Authorization") bearer: String,
        @Body req: WithdrawRequest
    ): Response<GenericSuccessResponse>
}

object NakeicApiClient {
    fun createOkHttpClient(): OkHttpClient {
        return OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(25, TimeUnit.SECONDS)
            .writeTimeout(25, TimeUnit.SECONDS)
            .pingInterval(20, TimeUnit.SECONDS)
            .build()
    }

    fun create(baseUrl: String, client: OkHttpClient = createOkHttpClient()): NakeicApiService {
        val normalized = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"
        return Retrofit.Builder()
            .baseUrl(normalized)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(NakeicApiService::class.java)
    }
}
