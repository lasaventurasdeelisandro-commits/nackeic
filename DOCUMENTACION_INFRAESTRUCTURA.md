# Infraestructura, Seguridad y Despliegue Comercial — Diclik.com

## 1. Arquitectura de Producción Recomendada
- **Backend API & SPA:** Google Cloud Run (`Dockerfile` estándar Node 20+, puerto 3000/PORT, HTTPS TLS 1.3 automático).
- **Base de Datos:** PostgreSQL administrado (Google Cloud SQL, Neon o Supabase Postgres) conectado vía `DATABASE_URL` con SSL habilitado.
- **Almacenamiento de Evidencias:** Google Cloud Storage / S3 para fotografías de averías y documentos KYC (evitar almacenamiento base64 masivo en DB a gran escala).
- **App Móvil:** Capacitor 8 Android (`dist/` empaquetado + llamadas HTTPS hacia `VITE_API_BASE_URL`).

---

## 2. Variables de Entorno Obligatorias en Producción
Configura las siguientes variables en tu plataforma de despliegue (nunca en el repositorio ni en el APK):

| Variable | Uso | Obligatoria en Prod |
|---|---|---|
| `NODE_ENV` | Debe ser `production` | Sí |
| `DATABASE_URL` | Cadena PostgreSQL administrado (`postgres://...`) | Sí |
| `JWT_SECRET` | Secreto aleatorio CSPRNG >= 32 caracteres (`openssl rand -hex 48`) | Sí (Falla al arrancar si falta) |
| `CORS_ORIGIN` | Orígenes permitidos separados por coma (ej: `https://diclik.com,capacitor://localhost`) | Sí |
| `PAYMENT_WEBHOOK_SECRET` | Clave secreta HMAC-SHA256 para validar webhooks del PSP | Sí para pagos |
| `PAYMENT_PROVIDER` | Identificador de pasarela (`stripe`, `azul`, `cardnet`) | Recomendado |
| `ALLOW_SANDBOX_PAYMENTS` | Debe permanecer `false` en producción | Sí (`false`) |
| `GEMINI_API_KEY` | Clave API servidor para asistente técnico | Opcional |

---

## 3. Respaldo y Restauración PostgreSQL
El script `scripts/db-backup.sh` ejecuta `pg_dump --format=custom` y valida integridad mediante `pg_restore --list`:

```bash
chmod +x scripts/db-backup.sh
DATABASE_URL="postgres://..." ./scripts/db-backup.sh
```

**Política mínima recomendada:**
- Respaldo automático diario con retención de 30 días + WAL/PITR en Cloud SQL.
- Prueba mensual de restauración automatizada en entorno de staging.

---

## 4. Servicios Externos Pendientes de Credenciales Comerciales
1. **Pasarela de Pagos Real (Stripe Connect / Azul / CardNET):** El backend ya verifica firma HMAC-SHA256 en `POST /api/v1/wallet/webhooks/payment` con idempotencia en `payment_webhooks`. Falta ingresar credenciales comerciales reales del comercio en las variables de entorno.
2. **Correo Transaccional (SMTP / SendGrid / Resend):** `POST /api/v1/auth/forgot-password` genera y persiste hashes seguros en `password_reset_tokens`; en producción requiere proveedor SMTP para enviar el enlace por correo en lugar de emitir logs internos.
3. **Notificaciones Push Móviles (FCM):** Las notificaciones se persisten en PostgreSQL (`notifications`), listas para conectar el SDK `firebase-admin` hacia dispositivos Android reales.
4. **Monitoreo (Sentry / OpenTelemetry):** Conectar `SENTRY_DSN` para alertas de errores y latencia en tiempo real.
