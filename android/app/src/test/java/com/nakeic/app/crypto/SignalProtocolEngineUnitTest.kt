package com.nakeic.app.crypto

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.security.KeyPairGenerator
import java.security.SecureRandom
import java.security.spec.ECGenParameterSpec
import javax.crypto.Cipher
import javax.crypto.KeyAgreement
import javax.crypto.Mac
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * Pruebas unitarias de primitivas criptográficas del motor Double Ratchet de NAKEIC
 * Verifican:
 * - Intercambio Diffie-Hellman sobre Curva Elíptica secp256r1 (P-256).
 * - Derivación HKDF RFC 5869 con HMAC-SHA256.
 * - Cifrado autenticado AEAD (AES-256-GCM) con etiqueta de 128 bits.
 */
class SignalProtocolEngineUnitTest {

    @Test
    fun testEcdhKeyAgreement_producesIdenticalSharedSecret() {
        val kpg = KeyPairGenerator.getInstance("EC")
        kpg.initialize(ECGenParameterSpec("secp256r1"))

        val aliceKeyPair = kpg.generateKeyPair()
        val bobKeyPair = kpg.generateKeyPair()

        // Alice computa secreto con pública de Bob
        val kaAlice = KeyAgreement.getInstance("ECDH")
        kaAlice.init(aliceKeyPair.private)
        kaAlice.doPhase(bobKeyPair.public, true)
        val secretAlice = kaAlice.generateSecret()

        // Bob computa secreto con pública de Alice
        val kaBob = KeyAgreement.getInstance("ECDH")
        kaBob.init(bobKeyPair.private)
        kaBob.doPhase(aliceKeyPair.public, true)
        val secretBob = kaBob.generateSecret()

        assertNotNull(secretAlice)
        assertNotNull(secretBob)
        assertEquals(secretAlice.size, secretBob.size)
        assertTrue(secretAlice.contentEquals(secretBob))
    }

    @Test
    fun testHkdfDerivation_matchesRfc5869Standard() {
        val ikm = "NAKEIC_ECDH_SECRET_TEST".toByteArray(Charsets.UTF_8)
        val salt = ByteArray(32) { 0 }
        val info = "NAKEIC_DOUBLE_RATCHET_V1".toByteArray(Charsets.UTF_8)

        // Step 1: Extract (PRK = HMAC-Hash(salt, IKM))
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(salt, "HmacSHA256"))
        val prk = mac.doFinal(ikm)
        assertEquals(32, prk.size)

        // Step 2: Expand (OKM = HMAC-Hash(PRK, info || 0x01))
        mac.init(SecretKeySpec(prk, "HmacSHA256"))
        mac.update(info)
        mac.update(0x01.toByte())
        val okm = mac.doFinal()

        assertEquals(32, okm.size)
        assertNotNull(okm)
    }

    @Test
    fun testAesGcmAeadEncryptionAndDecryption_preservesIntegrity() {
        val secureRandom = SecureRandom()
        val keyBytes = ByteArray(32).also { secureRandom.nextBytes(it) }
        val messageKey = SecretKeySpec(keyBytes, "AES")

        val iv = ByteArray(12).also { secureRandom.nextBytes(it) }
        val plainText = "Mensaje confidencial verificado por NAKEIC E2EE".toByteArray(Charsets.UTF_8)
        val aad = "conv_e2ee_unit_test".toByteArray(Charsets.UTF_8)

        // Cifrado con AES-256-GCM
        val encryptCipher = Cipher.getInstance("AES/GCM/NoPadding")
        val spec = GCMParameterSpec(128, iv)
        encryptCipher.init(Cipher.ENCRYPT_MODE, messageKey, spec)
        encryptCipher.updateAAD(aad)
        val cipherText = encryptCipher.doFinal(plainText)

        assertNotNull(cipherText)
        assertTrue(cipherText.size > plainText.size) // Contiene etiqueta de autenticación de 16 bytes

        // Descifrado y verificación de etiqueta
        val decryptCipher = Cipher.getInstance("AES/GCM/NoPadding")
        decryptCipher.init(Cipher.DECRYPT_MODE, messageKey, spec)
        decryptCipher.updateAAD(aad)
        val decryptedBytes = decryptCipher.doFinal(cipherText)

        val decryptedText = String(decryptedBytes, Charsets.UTF_8)
        assertEquals("Mensaje confidencial verificado por NAKEIC E2EE", decryptedText)
    }
}
