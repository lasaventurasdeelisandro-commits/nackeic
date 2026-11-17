# NAKEIC — Arquitectura Técnica Definitiva (Plataforma Integral de Mensajería y LIVE)

## 1. Visión General y Principios de Identidad
**NAKEIC** es una plataforma unificada de comunicación privada y transmisiones en vivo (**NAKEIC LIVE**), construida con identidad visual, protocolo en tiempo real, economía virtual y modelo de datos 100% propios.

- **Frontend Web / PWA**: React 19 + TypeScript + Vite + Tailwind CSS v4 (`src/components/`, `src/context/AppContext.tsx`, `src/services/`).
- **App Nativa Android**: Kotlin + Jetpack Compose + Material 3 + Hilt + Room + Retrofit 2 + OkHttp WebSocket + Android KeyStore (`android/app/src/main/java/com/nakeic/app/`).
- **Backend Unificado**: Node.js + Express + `ws` (`server.ts`) con doble canal WebSocket (`/` para chat, estados y llamadas 1:1 WebRTC; `/ws/live` para NAKEIC LIVE, batallas PK, co-anfitriones y regalos).
- **Persistencia Relacional y Híbrida**: PostgreSQL (`src/db/postgres.ts`, `src/db/repository.ts`, migraciones `0001` y `0002`) con respaldo local persistente seguro en modo híbrido (`data/db.json`) cuando PostgreSQL no está disponible en entornos locales.

---

## 2. Diagrama de Arquitectura Lógica

```
+-------------------------------------------------------------------+
|                     CLIENTES OFICIALES NAKEIC                      |
|   [ Web / PWA React 19 ]          [ Android Nativo Kotlin M3 ]     |
|   - Auth / Chats / Status         - Auth + KeyStore E2EE           |
|   - Calls WebRTC + LiveFeedView   - LiveScreen + NakeicLiveEngine  |
+------------------+-------------------------------+-----------------+
                   | HTTPS REST + Bearer Token     | WSS (/ y /ws/live)
                   v                               v
+-------------------------------------------------------------------+
|                 NAKEIC CORE SERVER (server.ts :3000)              |
|  - Auth OTP SHA-256 + scrypt Password/PIN + Sesiones 256-bit      |
|  - Messaging Router + Anti-Spoofing Session Binding               |
|  - NAKEIC LIVE Engine (Salas, Co-Hosts WebRTC, Batallas PK, Mod)  |
|  - WalletService (Coins, Regalos 70/30, KYC, Payouts, HMAC)       |
|  - SFU & ICE Adapter (sfuAdapter.ts -> LiveKit JWT + Coturn)      |
+---------+--------------------+--------------------+---------------+
          |                    |                    |
          v                    v                    v
+-------------------+  +---------------+  +-------------------------+
| PostgreSQL (PG)   |  | Redis Pub/Sub |  | LiveKit SFU & Coturn    |
| Migraciones 0001  |  | (Opcional     |  | (Escalamiento masivo    |
| y 0002 (ACID)     |  | multinodo)    |  | WebRTC multi-región)    |
+-------------------+  +---------------+  +-------------------------+
```

---

## 3. Modelo de Seguridad y Criptografía (Alcance Honesto)

1. **Autenticación y Sesiones**:
   - Sin sesiones semilla ni tokens de demostración automáticos en producción (`nkc_sec_*` generados con 256 bits vía CSPRNG, expiración de 30 días y revocación inmediata).
   - Códigos OTP almacenados como hash SHA-256 con sal (`OTP_SECRET_SALT` por variable de entorno o generado por CSPRNG en `.otp_salt` `0600`), límite de intentos y protección anti-reutilización.
   - Contraseñas y PINs cifrados con `crypto.scryptSync` + sal aleatoria de 16 bytes + comparación en tiempo constante (`timingSafeEqual`).
2. **Protección Anti-Suplantación (REST y WebSocket)**:
   - Toda ruta privada deriva `req.user.id` estrictamente desde la sesión Bearer autenticada (nunca confía en `senderId` enviado en el payload).
   - WebSockets exigen token válido en `auth:connect` (cierres `4001`/`4003` si falta token o hay discordancia de usuario).
3. **Alcance Real de Cifrado E2EE**:
   - Implementación real de primitivas en cliente Web y Kotlin (`SignalProtocolEngine.kt` + `SignalProtocolEngineUnitTest.kt`): **ECDH P-256 (`secp256r1`) + HKDF-SHA256 (RFC 5869) + Double Symmetric Ratchet + AEAD AES-256-GCM (etiqueta de 128 bits)**.
   - *Aclaración técnica honesta*: La verificación de intercambio automático de pre-keys X3DH multi-dispositivo y códigos de seguridad QR/Safety Numbers entre dispositivos distintos requiere habilitar el servicio de directorio de pre-keys persistente en PostgreSQL y la distribución compilada de la app Android; las primitivas matemáticas y almacenamiento en Android KeyStore ya están implementados y probados en Node y en pruebas unitarias Kotlin.

---

## 4. Subsistema de Base de Datos (PostgreSQL)

- **`src/db/migrations/0001_initial_schema.sql`**: 13 tablas canónicas (`users`, `sessions`, `user_contacts`, `conversations`, `conversation_participants`, `messages`, `message_reactions`, `device_fcm_tokens`, `calls`, `user_privacy_settings`, `commercial_plans`, `user_subscriptions`, `commercial_audit_logs`).
- **`src/db/migrations/0002_live_wallet_moderation.sql`**:
  - Credenciales `password_hash`/`pin_hash` en `users`.
  - Estados efímeros 24h (`statuses`, `status_views`, `status_reactions`) y reportes (`user_reports`).
  - Libro contable de billetera (`wallets`, `wallet_transactions`, `payout_requests`).
  - Motor NAKEIC LIVE (`live_streams`, `live_battles`, `live_gifts_ledger`, `live_moderators`, `live_moderation_logs`).

---

## 5. Subsistema NAKEIC LIVE y Economía Virtual

### 5.1 Protocolo WebSocket (`/ws/live`)
- `live:register_client`: Vincula socket con token verificado de sesión.
- `live:start` / `live:stop`: Apertura y cierre de sala con generación automática de resumen e historial persistente (`live_streams` / `db.liveHistory`).
- `live:join` / `live:leave`: Control de políticas de acceso (`everyone`, `followers`, `invite_only`), bloqueo de usuarios expulsados y conteo real de espectadores simultáneos y pico máximo.
- `live:media_frame` / `live:media_audio`: Distribución con control de contrapresión (`bufferedAmount` guard) hacia todos los espectadores.
- `live:guest_request`, `live:guest_invite`, `live:guest_respond`, `live:guest_toggle_mic`, `live:guest_kick`, `live:webrtc_offer/answer/ice`: Hasta **3 co-anfitriones simultáneos** en pantalla dividida con negociación WebRTC dedicada (`rtcConfig`).
- `live:battle_challenge`, `live:battle_accept`, `live:battle_decline`, `live:battle_update`, `live:battle_end`: Batallas PK cronometradas con marcador alimentado por regalos en vivo y tabla clasificatoria.
- `live:mod_assign`, `live:mod_mute`, `live:mod_ban`, `live:mod_delete_comment`, `live:mod_banned_words`: Moderación en tiempo real con registro de auditoría consultable en `/api/live/:roomId/moderation-logs`.

### 5.2 WalletService Autorizado por el Servidor (`src/services/wallet.ts`)
- Precios oficiales y catálogo fijo de regalos (`gift_rose` 1 Coin -> `gift_universe` 2500 Coins). El servidor ignora cualquier precio enviado por el cliente.
- **Recargas con HMAC-SHA256**: `POST /api/wallet/purchase` genera una intención pendiente (`coins = 0` acreditadas); únicamente `POST /api/wallet/webhook` con firma válida `x-nakeic-signature` y sin idempotencia repetida acredita monedas.
- **Reparto 70/30**: Cada regalo debita monedas del emisor y abona `floor(coins * 0.70)` Diamantes al creador (`1 Diamante = $0.005 USD`).
- **Cumplimiento KYC y Retiros**: `POST /api/wallet/withdraw` exige `kycStatus === 'verified'` (aprobado por webhook firmado `/api/wallet/kyc/webhook`) y mínimo `1000` diamantes (`$5.00 USD`).

---

## 6. Despliegue Nativo Android (`android/`)
- **Networking**: `NakeicApiService.kt` + `ChatRepositoryImpl.kt` con persistencia de sesión en `SharedPreferences` (`nakeic_auth_prefs`) e inyección dinámica de `Authorization: Bearer <token>`.
- **LIVE Nativo**: `NakeicLiveEngine.kt` sobre OkHttp WebSocket + `LiveScreen.kt` (Compose Material 3) integrados en `MainActivity.kt` (`NavigationTab.LIVE`).
- **Push FCM**: `NakeicFirebaseMessagingService.kt` lee el `userId` y token autenticados (cero referencias estáticas de demostración) y enruta notificaciones a conversaciones o `LIVE_ROOM_ID`.
