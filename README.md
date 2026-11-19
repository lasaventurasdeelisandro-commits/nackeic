# DICLIK · Fase 4

Aplicación web y Android para solicitudes de servicios, ofertas, contratación, mensajería y gestión de contratos.

## Desarrollo y pruebas

Requiere Node.js 22.12 o superior y npm. Desde la raíz del proyecto:

```sh
npm ci
npm run lint
npm test
npm run build
npm run dev
```

`npm test` usa PGlite en memoria y crea sus propias cuentas. No restaura el archivo de respaldo ni usa la base configurada en `DATABASE_URL`. Para probar la interfaz de demostración, ejecuta `VITE_DICLIK_DEMO=true npx vite --mode test` en un entorno aislado. La compilación web normal usa las rutas de la API.

## Entorno previo a producción

Configura una base PostgreSQL de pruebas, los secretos y los orígenes permitidos según `.env.example`. El servidor compilado arranca desde la raíz con `NODE_ENV=production npm start`, una vez ejecutado `npm run build`. Sirve los archivos públicos desde `dist/web` y aplica las migraciones SQL de `src/server/db/migrations`.

Configura `SMTP_URL` y `PASSWORD_RESET_FROM` para enviar códigos de recuperación. Mantén `ENABLE_PAYMENT_WEBHOOK=false` mientras no haya una pasarela validada. `ALLOW_SANDBOX_PAYMENTS=true` permite la recarga de prueba solo con `NODE_ENV=test`.

Para Android, consulta `GUIA_COMPILAR_APK.md`. Define `VITE_API_BASE_URL` con la URL HTTPS del backend de pruebas antes de volver a compilar y sincronizar Capacitor. Para permitir acceso desde el WebView, configura `https://localhost` en `CORS_ORIGIN` del servidor junto a los demás orígenes autorizados.

Los veredictos y pendientes están en `INFORME_DICLIK_FASE4.md`.

Para publicar el entorno de pruebas bajo HTTPS, consulta `deploy/ENTORNO_PRUEBAS.md`.
