# NAKEIC — Guía de Instalación, Despliegue, Infraestructura y Costos Operativos

## 1. Requisitos e Instalación Local

### 1.1 Backend y Aplicación Web (Node.js 20+)
```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno (ver .env.example)
cp .env.example .env

# 3. Compilar bundle web de producción y verificar tipos
npx tsc --noEmit
npm run build

# 4. Ejecutar en desarrollo (puerto 3000) o producción
npm run dev
# ó
NODE_ENV=production npm start
```

### 1.2 PostgreSQL 15+ y Redis 7+ (Recomendado para Producción)
```bash
# Crear base de datos NAKEIC
createdb -U postgres nakeic_db

# Ejecutar migraciones versionadas (0001 + 0002)
npm run dev   # o usar src/db/migrate.ts / PostgresService.runMigrations()
```

### 1.3 Compilación Nativa Android (JDK 17 + Android Studio / Gradle CLI)
> **Nota técnica**: El entorno contenedor de desarrollo en la nube no incluye JDK 17 ni Android SDK instalados. La compilación final de binarios `.apk` / `.aab` debe realizarse en Android Studio o en un runner CI (GitHub Actions `ubuntu-latest` + `setup-java@v4` + `setup-android`).

```bash
cd android

# Ejecutar pruebas unitarias Kotlin (Criptografía Signal + Wallet + Moderación)
./gradlew testDebugUnitTest

# Generar APK Debug para pruebas en dispositivo físico USB
./gradlew assembleDebug

# Generar Android App Bundle firmado para Google Play Console (vía variables de entorno)
export NAKEIC_KEYSTORE_PATH="/ruta/segura/nakeic-release.jks"
export NAKEIC_KEYSTORE_PASSWORD="..."
export NAKEIC_KEY_ALIAS="nakeic_prod"
export NAKEIC_KEY_PASSWORD="..."
./gradlew bundleRelease
```

---

## 2. Despliegue Comercial en Producción

### 2.1 Variables de Entorno Obligatorias
| Variable | Propósito |
| :--- | :--- |
| `NODE_ENV` | Debe establecerse en `production` (deshabilita rutas `/api/internal/*`). |
| `OTP_SECRET_SALT` | Sal secreta CSPRNG de mínimo 32 bytes para hash SHA-256 de OTP. |
| `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` | Conexión al clúster PostgreSQL gestionado (Cloud SQL / RDS). |
| `REDIS_URL` | URI `redis://` o `rediss://` para sincronización Pub/Sub entre réplicas. |
| `WALLET_WEBHOOK_SECRET`, `BILLING_WEBHOOK_SECRET` | Secretos HMAC de pasarelas de pago (Stripe / PayPal / Google Play). |
| `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | Clúster SFU LiveKit para retransmisión WebRTC a gran escala. |
| `TURN_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL` | Servidor Coturn para atravesar NAT simétrico en redes 4G/5G. |
| `GEMINI_API_KEY` *(opcional)* | Reservado únicamente si se activan funciones IA explícitas. |

### 2.2 Topología Recomendada (Cloud Run / Kubernetes + Servicios Gestionados)
1. **API & WebSockets (`server.ts`)**: Contenedores sin estado detrás de balanceador L7 con soporte WebSocket persistente y `timeout >= 3600s` (Cloud Run o GKE).
2. **Media SFU (`LiveKit`) + Relay NAT (`Coturn`)**: Máquinas dedicadas con red UDP de baja latencia (puertos `3478/udp`, `5349/tcp`, rango RTP `50000-60000/udp`).
3. **Base de Datos (`PostgreSQL`) + Caché (`Redis`)**: Instancia primaria con réplica de lectura y respaldos automáticos diarios PITR.
4. **Almacenamiento Multimedia (`GCS / S3 + CDN`)**: Recomendado migrar almacenamiento de subidas (`public/uploads` / data URLs) hacia buckets firmados con CDN para tráficos superiores a 10,000 usuarios activos.

---

## 3. Requisitos de Infraestructura por Etapa

| Componente | Etapa Inicial (MVP / < 5K MAU) | Escala Media (50K MAU) | Escala Comercial (250K+ MAU) |
| :--- | :--- | :--- | :--- |
| **Backend Node.js (`server.ts`)** | 1–2 instancias (1 vCPU, 1 GB RAM) | 3–6 réplicas autosescaladas (2 vCPU, 2 GB) | Clúster multiregión 8+ nodos |
| **PostgreSQL** | 1 vCPU, 2 GB RAM, 20 GB SSD | 2–4 vCPU, 8 GB RAM, 100 GB SSD + HA | 8 vCPU, 32 GB RAM + réplica lectura |
| **Redis Pub/Sub** | Instancia 256 MB–1 GB | HA 2 GB RAM | Clúster Redis 4–8 GB |
| **LiveKit SFU + Coturn** | 1 VM (2 vCPU, 4 GB) compartida | 2 nodos SFU (4 vCPU) + 1 Coturn dedicado | Auto-escalado SFU por región + Anycast TURN |

---

## 4. Estimación Realista de Costos Operativos Mensuales (USD)

> Estimaciones referenciales basadas en precios públicos vigentes de nube (GCP/AWS + pasarela), excluyendo comisiones variables de pasarela bancaria (2.9% + $0.30 Stripe/tarjetas o 15–30% tiendas móviles).

### Escenario A: Lanzamiento Piloto (Hasta 5,000 usuarios / ~50 directos diarios)
- Compute Cloud Run / VM Backend: **$25 – $45 / mes**
- PostgreSQL gestionado básico + Redis básico: **$30 – $55 / mes**
- Nodo único LiveKit + Coturn (VPS 4 vCPU + 2 TB egress): **$24 – $40 / mes**
- SMS OTP real (Twilio/Vonage, ~3,000 SMS/mes a ~$0.015–$0.04 según país): **$45 – $120 / mes**
- **Total Piloto Estimado**: **~$124 – $260 USD / mes**

### Escenario B: Crecimiento Regional (50,000 MAU / ~300 directos concurrentes)
- Backend autosescalado (3–5 instancias): **$120 – $220 / mes**
- PostgreSQL HA + Redis HA + Object Storage/CDN (5 TB): **$180 – $320 / mes**
- Flota LiveKit SFU + Coturn (25 TB tráfico video WebRTC): **$350 – $650 / mes**
- SMS OTP + Push FCM (FCM es gratuito; OTP ~20,000/mes): **$300 – $600 / mes**
- **Total Escala Media Estimado**: **~$950 – $1,790 USD / mes**

### Escenario C: Escala Masiva (250,000+ MAU / 2,000+ viewers concurrentes por sala)
- Infraestructura multi-zona Node.js + PG + Redis + CDN (30+ TB): **$1,200 – $2,200 / mes**
- Red LiveKit SFU distribuida + TURN relay (~150 TB tráfico video): **$2,500 – $5,000 / mes**
- Verificación SMS OTP + KYC automatizado (Stripe Identity / Veriff ~$1.00–$1.50 por creador verificado): **$1,200 – $2,500 / mes**
- **Total Escala Masiva Estimado**: **~$4,900 – $9,700+ USD / mes** (compensable con la comisión neta del **30%** de NAKEIC sobre monedas y suscripciones Premium/Business).
