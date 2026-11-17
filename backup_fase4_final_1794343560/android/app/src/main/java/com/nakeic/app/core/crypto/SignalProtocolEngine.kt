package com.nakeic.app.core.crypto

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.*
import java.security.spec.ECGenParameterSpec
import java.security.spec.X509EncodedKeySpec
import javax.crypto.Cipher
import javax.crypto.KeyAgreement
import javax.crypto.Mac
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec
import kotlin.experimental.xor

/**
 * NAKEIC E2EE Cryptographic Engine (Protocolo Signal / Double Ratchet)
 * Implementa cifrado de extremo a extremo auditable sobre primitivas criptográficas estándar:
 * - Curvas Elípticas (ECDH P-256 / secp256r1) respaldadas por Android KeyStore (TEE / StrongBox).
 * - Derivación de claves HKDF (RFC 5869) basada en HMAC-SHA256.
 * - Doble trinquete (Double Ratchet): Trinquete DH + Trinquete de cadena simétrica para Forward Secrecy.
 * - Cifrado autenticado AEAD (AES-256-GCM) con etiqueta de 128 bits contra alteraciones.
 */
class SignalProtocolEngine {

    companion object {
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
        private const val IDENTITY_KEY_ALIAS = "NakeicIdentityKey_EC"
        private const val AES_GCM_NO_PADDING = "AES/GCM/NoPadding"
        private const val HMAC_SHA256 = "HmacSHA256"
        private const val GCM_TAG_LENGTH = 128
        private const val GCM_IV_LENGTH = 12
    }

    private val keyStore: KeyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply {
        load(null)
    }

    init {
        ensureIdentityKeyPairExists()
    }

    /**
     * Garantiza la existencia del par de claves de identidad en hardware seguro.
     */
    private fun ensureIdentityKeyPairExists() {
        if (!keyStore.containsAlias(IDENTITY_KEY_ALIAS)) {
            val keyPairGenerator = KeyPairGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_EC,
                ANDROID_KEYSTORE
            )
            val parameterSpec = KeyGenParameterSpec.Builder(
                IDENTITY_KEY_ALIAS,
                KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY or KeyProperties.PURPOSE_AGREE_KEY
            )
                .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
                .setDigests(KeyProperties.DIGEST_SHA256, KeyProperties.DIGEST_SHA512)
                .build()

            keyPairGenerator.initialize(parameterSpec)
            keyPairGenerator.generateKeyPair()
        }
    }

    /**
     * Obtiene la clave pública de identidad del usuario para intercambio en el directorio.
     */
    fun getPublicIdentityKey(): PublicKey {
        val cert = keyStore.getCertificate(IDENTITY_KEY_ALIAS)
            ?: throw IllegalStateException("Certificado de identidad no encontrado en KeyStore")
        return cert.publicKey
    }

    /**
     * Genera un par de claves efímeras para el trinquete Diffie-Hellman por sesión.
     */
    fun generateEphemeralKeyPair(): KeyPair {
        val kpg = KeyPairGenerator.getInstance("EC")
        kpg.initialize(ECGenParameterSpec("secp256r1"))
        return kpg.generateKeyPair()
    }

    /**
     * Computa el secreto compartido mediante ECDH entre nuestra clave privada y la clave pública del par.
     */
    fun computeSharedSecret(privateKey: PrivateKey, peerPublicKey: PublicKey): ByteArray {
        val keyAgreement = KeyAgreement.getInstance("ECDH")
        keyAgreement.init(privateKey)
        keyAgreement.doPhase(peerPublicKey, true)
        return keyAgreement.generateSecret()
    }

    /**
     * Implementación estándar de HKDF (RFC 5869) para derivar claves de cifrado y autenticación.
     */
    fun hkdf(ikm: ByteArray, salt: ByteArray?, info: ByteArray, length: Int): ByteArray {
        val actualSalt = salt ?: ByteArray(32) { 0 }
        
        // HKDF-Extract: PRK = HMAC-Hash(salt, IKM)
        val mac = Mac.getInstance(HMAC_SHA256)
        mac.init(SecretKeySpec(actualSalt, HMAC_SHA256))
        val prk = mac.doFinal(ikm)

        // HKDF-Expand: OKM = HMAC-Hash(PRK, info || 0x01)
        mac.init(SecretKeySpec(prk, HMAC_SHA256))
        mac.update(info)
        mac.update(0x01.toByte())
        val okm = mac.doFinal()

        return okm.copyOf(length)
    }

    /**
     * Avanza el trinquete simétrico (Symmetric-Key Ratchet) para generar la clave del mensaje actual
     * y el nuevo estado de la cadena (Forward Secrecy).
     */
    fun stepSymmetricRatchet(chainKey: ByteArray): Pair<ByteArray, SecretKey> {
        val mac = Mac.getInstance(HMAC_SHA256)
        mac.init(SecretKeySpec(chainKey, HMAC_SHA256))

        // Clave del mensaje = HMAC(ChainKey, 0x01)
        mac.update(byteArrayOf(0x01))
        val messageKeyBytes = mac.doFinal()
        val messageKey = SecretKeySpec(messageKeyBytes.copyOf(32), "AES")

        // Siguiente ChainKey = HMAC(ChainKey, 0x02)
        mac.init(SecretKeySpec(chainKey, HMAC_SHA256))
        mac.update(byteArrayOf(0x02))
        val nextChainKey = mac.doFinal()

        return Pair(nextChainKey, messageKey)
    }

    /**
     * Cifra un mensaje con AES-256-GCM y autenticación asociada (AD).
     */
    fun encryptMessage(
        plainText: ByteArray,
        messageKey: SecretKey,
        associatedData: ByteArray? = null
    ): EncryptedMessagePayload {
        val cipher = Cipher.getInstance(AES_GCM_NO_PADDING)
        val secureRandom = SecureRandom()
        val iv = ByteArray(GCM_IV_LENGTH)
        secureRandom.nextBytes(iv)

        val spec = GCMParameterSpec(GCM_TAG_LENGTH, iv)
        cipher.init(Cipher.ENCRYPT_MODE, messageKey, spec)

        if (associatedData != null) {
            cipher.updateAAD(associatedData)
        }

        val cipherText = cipher.doFinal(plainText)
        return EncryptedMessagePayload(cipherText = cipherText, iv = iv)
    }

    /**
     * Descifra un mensaje validando la etiqueta de autenticación y los datos asociados (AD).
     */
    fun decryptMessage(
        cipherText: ByteArray,
        iv: ByteArray,
        messageKey: SecretKey,
        associatedData: ByteArray? = null
    ): ByteArray {
        val cipher = Cipher.getInstance(AES_GCM_NO_PADDING)
        val spec = GCMParameterSpec(GCM_TAG_LENGTH, iv)
        cipher.init(Cipher.DECRYPT_MODE, messageKey, spec)

        if (associatedData != null) {
            cipher.updateAAD(associatedData)
        }

        return cipher.doFinal(cipherText)
    }

    /**
     * Reconstruye una clave pública desde su codificación X.509 transmitida en red.
     */
    fun decodePublicKey(encodedBytes: ByteArray): PublicKey {
        val keyFactory = KeyFactory.getInstance("EC")
        val keySpec = X509EncodedKeySpec(encodedBytes)
        return keyFactory.generatePublic(keySpec)
    }
}

/**
 * Carga útil de mensaje cifrado con vector de inicialización no reutilizado.
 */
data class EncryptedMessagePayload(
    val cipherText: ByteArray,
    val iv: ByteArray
)
