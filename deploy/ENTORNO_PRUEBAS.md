# Entorno HTTPS de pruebas de DICLIK

El dominio de pruebas debe apuntar al servidor donde se ejecutan DICLIK y Caddy. Caddy obtiene y renueva el certificado público cuando el dominio resuelve a ese servidor y los puertos HTTP y HTTPS son accesibles.

1. Crea una base PostgreSQL para pruebas. Configura `DATABASE_URL`, `JWT_SECRET`, `APP_URL` y `CORS_ORIGIN` mediante variables privadas del servidor. Configura el remitente y SMTP de pruebas si quieres verificar la recuperación de contraseña.
2. Configura `NODE_ENV=production`, `HOST=127.0.0.1`, `PORT=4331` y `TRUST_PROXY_HOPS=1` para esta topología con un proxy local. Mantén `ENABLE_PAYMENT_WEBHOOK=false` y `ALLOW_SANDBOX_PAYMENTS=false`. Ejecuta `npm ci`, `npm run build` y `npm start`.
3. Configura `DICLIK_TEST_DOMAIN` con el nombre DNS de pruebas, sin el prefijo `https://`. Valida la configuración con `caddy validate --config deploy/Caddyfile --adapter caddyfile` y ejecútala con `caddy run --config deploy/Caddyfile --adapter caddyfile`.
4. Visita `https://<dominio-de-pruebas>/api/v1/health`. Comprueba que devuelve `database: connected`. Abre la raíz en el navegador del equipo de pruebas.
5. Para Android, añade `https://localhost` a `CORS_ORIGIN` y reinicia la API. Compila con `VITE_API_BASE_URL=https://<dominio-de-pruebas>`, sincroniza Capacitor y genera el APK según `GUIA_COMPILAR_APK.md`. Instálalo en el dispositivo y comprueba acceso, OTP, ubicación, cámara y apertura de ruta.
