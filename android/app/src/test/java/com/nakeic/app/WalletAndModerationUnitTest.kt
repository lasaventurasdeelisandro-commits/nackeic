package com.nakeic.app

import com.nakeic.app.domain.model.LiveBattle
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Pruebas unitarias de reglas de negocio para Monetización (70/30),
 * umbral de retiros KYC, filtrado de palabras restringidas y Batallas PK.
 */
class WalletAndModerationUnitTest {

    private fun computeCreatorDiamonds(giftCoins: Int): Int {
        return Math.round(giftCoins * 0.70f)
    }

    private fun canWithdrawDiamonds(diamonds: Int, kycStatus: String): Boolean {
        return diamonds >= 1000 && kycStatus == "verified"
    }

    private fun containsBannedWord(comment: String, bannedWords: List<String>): Boolean {
        val normalized = comment.lowercase()
        return bannedWords.any { w -> w.isNotBlank() && normalized.contains(w.trim().lowercase()) }
    }

    private fun determineBattleWinner(battle: LiveBattle): String? {
        return when {
            battle.challengerScore > battle.opponentScore -> battle.challengerHostId
            battle.opponentScore > battle.challengerScore -> battle.opponentHostId
            else -> null
        }
    }

    @Test
    fun revenueShare_allocates70PercentCreatorDiamonds() {
        assertEquals(70, computeCreatorDiamonds(100))
        assertEquals(350, computeCreatorDiamonds(500))
        assertEquals(1750, computeCreatorDiamonds(2500))
    }

    @Test
    fun payoutGate_requiresVerifiedKycAndMinimum1000Diamonds() {
        assertFalse(canWithdrawDiamonds(1500, "pending"))
        assertFalse(canWithdrawDiamonds(999, "verified"))
        assertTrue(canWithdrawDiamonds(1000, "verified"))
    }

    @Test
    fun bannedWordFilter_blocksRestrictedTermsCaseInsensitively() {
        val blocked = listOf("estafa", "phishing", "spam")
        assertTrue(containsBannedWord("Cuidado con esta ESTAFA", blocked))
        assertFalse(containsBannedWord("Excelente transmisión en vivo", blocked))
    }

    @Test
    fun pkBattle_identifiesWinnerOrTieCorrectly() {
        val challengerWins = LiveBattle(
            id = "b1",
            challengerRoomId = "r1",
            opponentRoomId = "r2",
            challengerHostId = "h1",
            challengerHostName = "Host1",
            opponentHostId = "h2",
            opponentHostName = "Host2",
            challengerScore = 500,
            opponentScore = 120
        )
        val tie = challengerWins.copy(challengerScore = 200, opponentScore = 200)

        assertEquals("h1", determineBattleWinner(challengerWins))
        assertNull(determineBattleWinner(tie))
    }
}
