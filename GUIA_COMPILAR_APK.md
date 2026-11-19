# Guía de Compilación Android APK y AAB — Diclik.com

## Estado de Configuración Android (Verificado en Código)
- **Nombre de la aplicación:** `Diclik.com` (`android/app/src/main/res/values/strings.xml`)
- **Identificador de paquete:** `com.directo.app` (`capacitor.config.ts`)
- **Iconos y Splash Oficiales:** Generados sin el bloque inferior de 6 iconos (`mipmap-mdpi` a `mipmap-xxxhdpi` y `drawable*/splash.png`) sobre fondo corporativo `#00103d`.
- **Seguridad WebView/Red (`capacitor.config.ts`):**
  - URL temporal de previsualización eliminada (`CAPACITOR_SERVER_URL` solo si se define explícitamente).
  - `cleartext: false` y `allowMixedContent: false` (HTTPS obligatorio).
  - `webContentsDebuggingEnabled: false` en compilaciones de producción (`NODE_ENV=production`).
  - Ninguna credencial privada de PostgreSQL o secreto de servidor existe dentro del paquete Android ni del bundle público (`dist/web/`).


---

## 1. Preparar URL del Backend en Producción
Define la URL HTTPS definitiva de tu servidor API antes de generar el bundle web:

```bash
export VITE_API_BASE_URL="https://api.tudominio-diclik.com"
# Añade https://localhost a CORS_ORIGIN en la configuración del backend Android.
export NODE_ENV=production
npm run build
npx cap sync android
```

---

## 2. Generar APK de Prueba Instalable (`app-debug.apk`)
En tu computadora con Android Studio o Android SDK (JDK 21 y plataforma Android API 36):

```bash
cd android
./gradlew assembleDebug
```

**Ubicación esperada del archivo generado:**
`android/app/build/outputs/apk/debug/app-debug.apk`

**Instalación por USB (ADB):**
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 3. Firma de Distribución y AAB para Google Play (`app-release.aab`)

1. Genera tu llave privada de firma (guárdala fuera de Git):
```bash
keytool -genkey -v -keystore diclik-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias diclik_release
```

2. Configura las propiedades de firma (variables de entorno o `android/keystore.properties` ignorado en Git):
- `DICLIK_KEYSTORE_PATH=../diclik-release.jks`
- `DICLIK_KEY_ALIAS=diclik_release`
- `DICLIK_KEYSTORE_PASSWORD=...`
- `DICLIK_KEY_PASSWORD=...`

3. Compila el Android App Bundle (`.aab`) o APK de lanzamiento:
```bash
cd android
./gradlew bundleRelease
# o APK firmado:
./gradlew assembleRelease
```

**Ubicación del AAB para Google Play Console:**
`android/app/build/outputs/bundle/release/app-release.aab`
