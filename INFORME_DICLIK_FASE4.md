# DICLIK · Informe de entrega de la fase 4

## Resultado

Se trabajó sobre `DICLIK_FASE4_LIMPIO_PARA_CODEX (1).zip`. El código resultante se puede usar para pruebas controladas. La publicación y los ensayos con servicios externos requieren la configuración y comprobaciones descritas abajo.

## Correcciones

- La vista operativa usa la API para solicitudes, cotizaciones, contratación, chat, etapas del servicio y validación OTP. Los escenarios de demostración del portal se conservan en modo de pruebas explícito. Se comprobó que 49 archivos visuales y multimedia coinciden byte por byte con el ZIP de origen.
- Las contraofertas se aceptan desde la contraparte. Se evita exponer el OTP al especialista. La aceptación comprueba el estado de la oferta y realiza el débito con una condición atómica de saldo suficiente.
- Se eliminó la dependencia del administrador de demostración para registrar las comisiones de la plataforma. Se aplican el estado del contrato y el rol para determinar la cancelación. Se agregaron guardas transaccionales para abrir y resolver disputas.
- El especialista puede compartir una posición de forma explícita. La consulta limita la ubicación a participantes durante un contrato activo. El listado público oculta teléfono, dirección y coordenadas. Las rutas públicas que admiten sesión opcional comprueban vigencia, revocación y estado de usuario.
- La recuperación despacha el código por SMTP. El token se guarda como hash, caduca y se consume una sola vez. La interfaz ya evita afirmar que una cuenta recién creada está verificada.
- Las recargas simuladas requieren el modo de pruebas. El receptor de pagos reales queda desactivado por defecto. El webhook genérico verifica la firma sobre los bytes recibidos. El retiro registra una solicitud pendiente para conciliación.
- Las migraciones fallan si una instrucción SQL falla. El servidor espera la inicialización de la base antes de aceptar peticiones. La compilación separa los archivos públicos del servidor. Capacitor sincroniza exclusivamente la salida web. La URL de la API admite un host o una URL que ya incluye `/api/v1`.

## Verificación

| Prueba | Resultado |
| --- | --- |
| TypeScript, `npm run lint` | Pasó. |
| Compilación web y servidor Node, `npm run build` | Pasó. |
| `npm test` con PGlite en memoria | 11 de 11 suites. Incluye autenticación, autorización, recuperación, webhook simulado, ofertas, escrow, OTP, comisiones, disputas, cancelaciones, notificaciones internas, chat y GPS del contrato. |
| Suite con PostgreSQL 18.7 aislado | 11 de 11 suites. Se ejecutó desde una copia de pruebas que seleccionaba el controlador externo. El comando de pruebas del ZIP sigue usando PGlite aislado por defecto. |
| Chromium sobre el servidor compilado y PostgreSQL 18 | Registro de cliente, técnico y profesional, solicitud, cotización, contratación, trayecto, GPS compartido con coordenadas de prueba, chat y OTP. También se comprobó el acceso al panel de administración. |
| Recuperación por SMTP de pruebas y PostgreSQL 18 | Registró una cuenta, recibió el código en un servidor SMTP local, cambió la contraseña, rechazó la reutilización del código y autenticó con la contraseña nueva. |
| Android | Capacitor sincronizado. Gradle compiló `assembleDebug` y pasó `testDebugUnitTest`. La prueba nativa existente es una prueba unitaria básica. |
| Dependencias de ejecución | `npm audit --omit=dev` informó cero vulnerabilidades en la consulta realizada. |

El servidor compilado arrancó con PostgreSQL 18 y aplicó cinco migraciones. La verificación HTTP confirmó el servicio operativo y el webhook de pagos desactivado.

## Dependencias y límites

- **Android en dispositivo.** El APK suministrado es de depuración y comprueba la compilación. Para probar los flujos conectados, configura `VITE_API_BASE_URL` con la URL HTTPS del entorno de pruebas, autoriza el origen de Capacitor en `CORS_ORIGIN`, recompila y prueba en un teléfono o emulador. Falta validar permisos GPS, cámara y navegación en dispositivo. La distribución requiere una firma de lanzamiento.
- **Pagos reales.** El código conserva la billetera y la conciliación contable de pruebas. Faltan una pasarela elegida, su adaptador y credenciales, pruebas certificadas de cobros y desembolsos, y validación de las reglas financieras antes de activar pagos. No se efectuaron cargos ni transferencias reales.
- **Correo y notificaciones.** La entrega real de correos requiere un remitente y un SMTP autorizado. Se verificaron notificaciones persistentes dentro de Diclik. El envío push a dispositivos requiere integración con un proveedor y pruebas adicionales.
- **GPS.** El intercambio de GPS en contratos es puntual y explícito. La navegación abre un proveedor de mapas externo. Los resultados del radar dependen de los datos del perfil. No se certificó rastreo continuo en segundo plano.
- **Respaldo original.** El ZIP de respaldo superó la comprobación de integridad como archivo y contiene un directorio físico de PostgreSQL 18. La restauración y la compatibilidad de sus datos siguen pendientes. Se probó con bases nuevas e independientes y se conservó el respaldo original por separado.
- **Secretos.** El ZIP de entrega incluye `.env.example`. El archivo `data/.jwt_secret` presente en el insumo, las bases de datos, las dependencias instaladas y las credenciales de QA se excluyeron. Si la clave del insumo llegó a usarse en un despliegue, debe rotarse allí.

La guía de arranque y los comandos de compilación están en el `README.md` y `GUIA_COMPILAR_APK.md`. El ZIP contiene código, migraciones, archivos de compilación, el proyecto Android y sus recursos. Se regenera la salida web con `npm run build`.

## Secuencia 1 · Base nueva

Se inicializó una base PostgreSQL 18 local y persistente en el volumen de Docker `diclik-secuencia1-data`. DICLIK se conecta a la base mediante un archivo `.env` privado. Se aplicaron cinco migraciones, se verificó el inicio de sesión de una cuenta de prueba después de reiniciar PostgreSQL y se retiró esa cuenta de la base nueva. Se generó un respaldo inicial y se comprobó su restauración en otra base. El respaldo histórico se conserva por separado. Esta base local sirve para las pruebas y aún queda pendiente configurar el entorno accesible por HTTPS.

## Continuación de las secuencias 2 a 7

- **2. HTTPS.** La web y la API respondieron por HTTPS local con PostgreSQL 18 en una base de QA aparte de la base nueva. La verificación del certificado local pasó. El archivo `deploy/Caddyfile` fue validado con Caddy 2 y queda acompañado de la guía para un dominio de pruebas. El túnel público temporal falló porque la conexión a Cloudflare fue rechazada. La prueba desde otro equipo sigue pendiente.
- **3. Roles.** Pasó el recorrido web con registro de cliente, técnico y profesional, y acceso de administrador. Se verificaron publicación, oferta, contratación, chat, GPS compartido y cierre por OTP. Una prueba HTTPS adicional confirmó la contratación de un profesional, el bloqueo del rol incorrecto, la disputa con arbitraje administrativo, el rechazo del segundo intento de resolverla, el reembolso, la cancelación y la notificación persistente.
- **4. Android.** Pasaron `assembleDebug`, `testDebugUnitTest` y `bundleRelease`. Se verificó la firma del APK de depuración. Se generó un AAB sin firma de distribución. Sigue pendiente la prueba en un dispositivo con un backend HTTPS accesible desde el teléfono. El APK de depuración usa la configuración de compilación local.
- **5. Avisos.** Se comprobó nuevamente la entrega del código de recuperación por SMTP de pruebas y se verificaron notificaciones dentro de la app. Queda pendiente configurar y probar el correo de entrega pública y la integración push.
- **6. Pagos.** En HTTPS se comprobó que el webhook está desactivado y que un cliente autenticado no puede hacer una recarga simulada ni cambiar su saldo mediante esa ruta. La integración y certificación con la pasarela elegida siguen pendientes.
- **7. Empaquetado.** Se actualizaron el ZIP y este informe con la configuración HTTPS. La entrega sigue siendo una candidata de pruebas.
