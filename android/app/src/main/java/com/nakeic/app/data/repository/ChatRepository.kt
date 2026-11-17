package com.nakeic.app.data.repository

import com.nakeic.app.domain.model.Conversation
import com.nakeic.app.domain.model.Message
import com.nakeic.app.domain.model.MessageStatus
import com.nakeic.app.domain.model.WalletAccount
import kotlinx.coroutines.flow.Flow

interface ChatRepository {
    fun getConversations(): Flow<List<Conversation>>
    fun getMessages(conversationId: String): Flow<List<Message>>
    suspend fun sendMessage(message: Message): Result<Message>
    suspend fun updateMessageStatus(messageId: String, status: MessageStatus)
    suspend fun addReaction(messageId: String, emoji: String)
    suspend fun deleteMessage(messageId: String, forEveryone: Boolean)
    suspend fun pinMessage(messageId: String, isPinned: Boolean)
    suspend fun setDisappearingTimer(conversationId: String, durationSeconds: Long?)
    suspend fun uploadMedia(fileBytes: ByteArray, fileName: String, mimeType: String): Result<String>
    suspend fun searchRemoteMessages(query: String): Result<List<Message>>
    suspend fun getWalletBalance(): Result<WalletAccount>
    suspend fun syncRemoteConversations(userId: String): Result<Int>
    suspend fun syncRemoteMessages(conversationId: String): Result<Int>
    fun setAuthSession(token: String, userId: String, displayName: String)
    fun clearAuthSession()
    fun getCurrentUserId(): String?
    fun getCurrentUserDisplayName(): String
    fun getAuthToken(): String?
}
