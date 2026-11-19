# DICLIK — Fase 2: endurecimiento adicional

Cambios efectuados sobre `diclik_work`:

- Rate limiter: elimina confianza directa en `X-Forwarded-For` proporcionado por el cliente. Usa `req.ip`, sujeto a configuración segura de `trust proxy` en Express.
- Producción: impide sembrar cuentas de demostración y contraseñas conocidas, incluso si se establece `SEED_DEMO_DATA=true`.
- Desarrollo: datos de demostración solo con `SEED_DEMO_DATA=true` explícito. Las pruebas antiguas que dependen de cuentas demo deben adaptarse.
- Login y validación JWT: solo usuarios con `status=active` pueden iniciar o continuar sesión.
- Login: reduce datos de billetera a los saldos y totales necesarios.

## Sin certificar

No se han ejecutado pruebas automatizadas ni pruebas de carga, porque aún faltan dependencias instaladas y entorno PostgreSQL de producción. Tampoco se ha validado `trust proxy` detrás del balanceador definitivo. No desplegar sin pruebas.
