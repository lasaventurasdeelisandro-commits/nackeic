# Fase 4 — Seguridad de proxy y minimización de datos

- `TRUST_PROXY_HOPS` es 0 por defecto y requiere configuración explícita detrás de un balanceador confiable.
- Las respuestas de perfil ya no incluyen `credential_code` del profesional.
- Los datos de billetera se seleccionan mediante columnas explícitas.
- Estas modificaciones requieren pruebas con dependencias y PostgreSQL; no constituyen certificación de producción.
