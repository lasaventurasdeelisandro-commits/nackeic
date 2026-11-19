# DICLIK — paquete de código depurado

Este paquete conserva el código fuente, recursos visuales, estructura Android y migraciones SQL.

## Archivos retirados del paquete de código
- `data/postgres/`: archivos binarios de una base de datos local, separados en `DICLIK_DATOS_POSTGRES_RESPALDO.zip`. **No eliminarlos sin respaldo**: pueden contener datos. Para desarrollo, el servidor crea una nueva base local cuando no existe; para producción, configurar PostgreSQL externo.
- `.aistudio/`: artefactos y medios temporales del editor, no código fuente de la app.
- ZIP anidados `public/directo-proyecto-completo.zip` y su copia dentro del paquete Android: copias redundantes del proyecto.

## Estado de validación
- Integridad del ZIP original: comprobada.
- Dependencias Node no disponibles en este entorno; `npm run lint` falla por módulos faltantes, **no es un diagnóstico de TypeScript**.
- No se ha certificado compilación, pruebas, funcionamiento Android ni pagos reales.
- Los pagos sandbox no deben confundirse con pagos reales.

## Para validar
1. `npm install` en entorno con acceso a paquetes.
2. `npm run lint && npm test && npm run build`.
3. Configurar secretos y base de datos (ver `.env.example`), probar cliente/profesional/admin y flujos financieros.
4. `npx cap sync android`, compilar y probar en Android real.
