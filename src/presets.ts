import { ModuleAnswers } from "./types";

export interface Preset {
  name: string;
  description: string;
  answers: ModuleAnswers;
  specs: { [moduleId: string]: string };
}

export const PRESETS: { [key: string]: Preset } = {
  mvp_economico: {
    name: "🔋 MVP Rápido y Económico",
    description: "Ideal para validación de mercado ágil y bajo costo mensual de infraestructura.",
    answers: {
      monetizacion: "comision",
      negociacion: "cotizacion_cerrada",
      tipo_infraestructura: "monolito_modular",
      comunicacion_tiempo_real: "websocket",
      unificacion_perfiles: "cuenta_unica",
      cuentas_empresa: "no_b2b",
      proceso_servicio: "pago_directo",
      tipo_db: "postgres_postgis",
      geo_indexing: "postgres_spatial_idx",
      verificacion_kyc: "verificacion_manual",
      enmascaramiento: "libertad_contacto",
      pasarela_pago: "dlocal",
      retencion_impuestos: "responsabilidad_profesional",
      esquema_wallet: "saldo_virtual_basico",
      metodos_retiro: "retiro_programado",
      limites_negociacion: "mercado_libre",
      visibilidad_ofertas: "subasta_transparente",
      estrategia_tracking: "tracking_distancia",
      geofencing: "no_geofence",
      arquitectura_chat: "chat_firebase",
      moderacion_chat: "regex_basico",
      algoritmo_reputacion: "promedio_estrellas_simple",
      resolucion_disputas: "reembolso_rapido",
      ia_matching: "ia_matching_precios",
      arquitectura_escalabilidad: "read_replicas_db"
    },
    specs: {
      modelo_negocio: `# Módulo 1: Modelo de Negocio (MVP Económico)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Monetización**: Comisión sobre el valor del servicio (Fee transaccional). Se retendrá un **10% a 15%** por cada trabajo completado de forma exitosa.
- **Negociación**: Cotización Privada del Profesional. El cliente describe su problema y recibe ofertas formales cerradas, evitando subastas agresivas a la baja en la primera fase.

## 🚀 Especificación Técnica Detallada
- **Algoritmo de Comisión**: Al liquidar un servicio, el sistema calcula el fee transaccional:
  \`\`\`typescript
  const platformFeePercent = 0.12; // 12% comisión base
  const platformFee = totalAmount * platformFeePercent;
  const netProfessionalPayout = totalAmount - platformFee;
  \`\`\`
- **Flujo de Oferta**: Las solicitudes se propagan por categorías a profesionales en un rango de 10km utilizando queries de base de datos indexadas por coordenadas geográficas.

## 🎨 Flujo de Usuario y UX
- **Onboarding de Solicitud**: 3 pasos simples: Categoría -> Descripción y Fotos -> Publicación.
- **Visualización de Ofertas**: Panel tipo lista ordenado por puntaje simple del profesional, mostrando el precio de cotización cerrado.

## 🔒 Seguridad y Cumplimiento
- Las transacciones se procesan mediante pasarela local con cifrado HTTPS SSL estándar. Se guardan logs detallados de creación de ofertas con direcciones IP para auditar comportamientos colusorios.`,

      arquitectura: `# Módulo 2: Arquitectura General (MVP Económico)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Infraestructura**: Monolito Modular con Escalado de Contenedores. Un único repositorio backend en Node.js/TypeScript empaquetado en Docker y desplegado en Google Cloud Run.
- **Comunicación en Tiempo Real**: WebSockets bidireccionales con Socket.io para coordinar las notificaciones rápidas de ofertas y el estado de la ruta del proveedor.

## 🚀 Especificación Técnica Detallada
- **Stack Tecnológico**: Node.js v20, Express, Socket.io, TypeScript.
- **Topología de Red**: Clúster monolítico modular con escalado automático de instancias (mínimo 0 para ahorrar costos por la noche, máximo 10).
- **Esquema de Socket**:
  \`\`\`json
  {
    "event": "service_offer_created",
    "payload": { "orderId": "ORD-492", "bidAmount": 450.00 }
  }
  \`\`\`

## 🎨 Flujo de Usuario y UX
- Conexión silenciosa del WebSocket al abrir la app. Icono sutil de conectividad activa.
- Reconexión automática con backoff exponencial si el usuario ingresa a un ascensor o zona de túneles.

## 🔒 Seguridad y Cumplimiento
- Autenticación de Sockets mediante token JWT en el handshake inicial.
- Límite de tasa (Rate Limiting) de 100 mensajes por minuto por IP para mitigar inundaciones maliciosas.`,

      roles_usuario: `# Módulo 3: Roles de Usuario (MVP Económico)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Estructura de Perfiles**: Cuenta Unificada con Selector de Rol rápido. Un solo registro de credenciales; el usuario alterna entre "Modo Cliente" y "Modo Profesional" mediante un toggle instantáneo en el menú.
- **Soporte Corporativo**: Solo Profesionales Independientes en Fase 1 para reducir la complejidad inicial del modelo de base de datos.

## 🚀 Especificación Técnica Detallada
- **Modelo de Datos de Usuario**:
  \`\`\`sql
  CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(30),
    active_role VARCHAR(20) DEFAULT 'client', -- 'client' | 'professional'
    is_professional_approved BOOLEAN DEFAULT false
  );
  \`\`\`

## 🎨 Flujo de Usuario y UX
- Interruptor tipo "Toggle Switch" prominente en la barra de navegación lateral con animación de desvanecimiento que reestructura la vista principal.

## 🔒 Seguridad y Cumplimiento
- Control de acceso basado en roles (RBAC) validado en el middleware de la API en cada petición, denegando el acceso a endpoints de cotización para usuarios no autorizados o sin verificación aprobada.`,

      flujos_completos: `# Módulo 4: Flujo Completo de Servicio (MVP Económico)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Esquema Transaccional**: Flujo con Pago Directo al Finalizar. La plataforma actúa puramente como puente de contacto. El cliente liquida el dinero de forma directa al profesional al terminar el trabajo técnico en efectivo o mediante código QR local.

## 🚀 Especificación Técnica Detallada
- **Estados de la Orden**:
  \`\`\`
  [CREADA] -> [PROPAGADA] -> [COTIZADA] -> [ACEPTADA] -> [EN_CAMINO] -> [COMPLETADA]
  \`\`\`
- Al marcar la orden como "Completada" por ambas partes, se dispara un webhook que registra la comisión del sistema a ser facturada al profesional de manera mensual.

## 🎨 Flujo de Usuario y UX
- Vista de progreso lineal del servicio con iconos interactivos: profesional en camino, servicio en progreso, y botón final de confirmar pago realizado.

## 🔒 Seguridad y Cumplimiento
- Al no retener fondos en garantía, se mitigan los riesgos regulatorios bancarios de custodia de capital de terceros. Obligatoriedad de firma digital básica en la pantalla móvil del cliente para cerrar el trabajo.`,

      base_datos: `# Módulo 5: Base de Datos (MVP Económico)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Motor Principal**: PostgreSQL con PostGIS. Consistencia transaccional ACID de clase mundial y soporte geoespacial nativo de alta precisión.
- **Indexación Geoespacial**: PostgreSQL Spatial Indices (R-Tree / GiST). Consultas de radio directas sobre la base de datos persistente.

## 🚀 Especificación Técnica Detallada
- **Query de Búsqueda Radial de Profesionales (PostGIS)**:
  \`\`\`sql
  SELECT id, name, ST_Distance(geom, ST_SetSRID(ST_Point(-74.006, 40.7128), 4326)) AS distance
  FROM professional_profiles
  WHERE ST_DWithin(geom, ST_SetSRID(ST_Point(-74.006, 40.7128), 4326), 10000) -- 10km de radio
  ORDER BY distance ASC;
  \`\`\`

## 🎨 Flujo de Usuario y UX
- El cliente ve un mapa sutil con marcadores estáticos de los profesionales listos para recibir trabajos en un radio dinámico de su ubicación actual.

## 🔒 Seguridad y Cumplimiento
- Backups automáticos diarios cifrados en reposo (AES-256) alojados en bucket de almacenamiento con políticas de retención inmutables.`,

      seguridad: `# Módulo 6: Seguridad y KYC (MVP Económico)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Verificación**: Carga de Documentos y Aprobación Manual. Los profesionales suben PDF de antecedentes, cédulas y comprobantes a un portal administrativo para revisión manual del equipo.
- **Enmascaramiento**: Intercambio libre de datos de contacto tras aceptar la oferta, permitiendo que coordinen directamente vía telefónica o WhatsApp para agilizar el inicio físico del servicio.

## 🚀 Especificación Técnica Detallada
- **Almacenamiento de Documentos**: Subida cifrada a Google Cloud Storage mediante URLs firmadas temporales para salvaguardar información de identidad personal.
- **Flujo Administrativo**: Endpoint administrativo de aprobación:
  \`\`\`json
  POST /api/admin/verify-professional { "userId": "USR-192", "status": "APPROVED" }
  \`\`\`

## 🎨 Flujo de Usuario y UX
- Sección de "Subir Documentos" en el onboarding profesional con indicadores de progreso claros y soporte para arrastrar archivos o tomar fotos directas desde el teléfono.

## 🔒 Seguridad y Cumplimiento
- Cifrado en tránsito con TLS 1.3. Los documentos personales de KYC se marcan con acceso privado estricto restringido únicamente a administradores logueados.`,

      sistema_pagos: `# Módulo 7: Sistema de Pagos e Impuestos (MVP Económico)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Procesador de Pago**: dLocal API. Soporte de pagos locales mediante transferencias interbancarias y redes de efectivo en mercados emergentes.
- **Esquema Fiscal**: Responsabilidad Exclusiva del Profesional. La plataforma solo emite factura electrónica por el fee de comisión de intermediación cobrado.

## 🚀 Especificación Técnica Detallada
- **Flujo de Checkout**: dLocal Hosted Checkout para delegar la interfaz de tarjeta y prevenir el alcance PCI en la infraestructura propia del MVP.
- **Webhook de Notificación de Pago**:
  \`\`\`json
  {
    "event": "payment_succeeded",
    "payment_id": "PAY-821",
    "amount": 120.50
  }
  \`\`\`

## 🎨 Flujo de Usuario y UX
- Pantalla de pago segura con redirección limpia, mostrando múltiples opciones locales como efectivo, débito o transferencias inmediatas de bajo costo.

## 🔒 Seguridad y Cumplimiento
- Delegación completa del procesamiento de tarjetas a dLocal, garantizando cumplimiento de estándares PCI-DSS sin requerir certificaciones complejas en los servidores del monolito.`,

      wallet: `# Módulo 8: Wallet y Monedero Interno (MVP Económico)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Esquema de Wallet**: Saldo en Tabla de Perfil con Historial de Movimientos. Estructura tradicional de columna balance en el perfil del usuario conectada a un log de movimientos contables.
- **Método de Retiro**: Transferencia Programada Semanal sin costo. Los fondos acumulados se transfieren de forma automática cada viernes al banco registrado del profesional.

## 🚀 Especificación Técnica Detallada
- **Esquema Simplificado de Base de Datos**:
  \`\`\`sql
  ALTER TABLE professional_profiles ADD COLUMN balance DECIMAL(12, 2) DEFAULT 0.00;
  
  CREATE TABLE balance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID REFERENCES users(id),
    amount DECIMAL(12, 2),
    type VARCHAR(10), -- 'credit' | 'debit'
    created_at TIMESTAMP DEFAULT NOW()
  );
  \`\`\`

## 🎨 Flujo de Usuario y UX
- Sección "Mi Billetera" mostrando el saldo acumulado en tiempo real, el historial de ganancias desglosado y la fecha del próximo depósito programado.

## 🔒 Seguridad y Cumplimiento
- Firma criptográfica SHA-256 en cada fila de balance_logs para detectar manipulaciones externas en las tablas transaccionales de saldos de base de datos.`,

      negociacion_precios: `# Módulo 9: Motor de Negociación Directa (MVP Económico)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Límites de Precio**: Mercado Totalmente Libre. El cliente propone un precio, el profesional cotiza libremente y la oferta y demanda autorregulan el costo del mercado según calificaciones.
- **Visibilidad**: Subasta Semi-Transparente. Los profesionales visualizan el promedio de las cotizaciones ya enviadas para calibrar sus ofertas sin ver los nombres de la competencia.

## 🚀 Especificación Técnica Detallada
- **Algoritmo de Cálculo de Promedio de Oferta**:
  \`\`\`sql
  SELECT AVG(amount) as average_bid, COUNT(id) as total_bids 
  FROM service_offers 
  WHERE order_id = 'ORD-291';
  \`\`\`

## 🎨 Flujo de Usuario y UX
- Badge dinámico para los profesionales: "El promedio de cotizaciones para este trabajo es de $45. ¡Ajusta tu precio para ganar!"

## 🔒 Seguridad y Cumplimiento
- Auditoría automatizada de ofertas que detecte duplicados o variaciones absurdas (e.g., ofertas de $0.01) para prevenir spammers o bots maliciosos.`,

      gps_geolocalizacion: `# Módulo 10: GPS y Geolocalización (MVP Económico)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Frecuencia de Rastreo**: Filtro de Distancia Adaptativa (Ahorro Crítico de Batería). Actualizaciones geográficas se transmiten solo cuando el proveedor móvil reporta un desplazamiento mayor a 20 metros.
- **Geocercas (Geofencing)**: Confirmaciones de arribo manuales mediante un botón interactivo "He llegado al domicilio" para evitar complejos cálculos espaciales en segundo plano.

## 🚀 Especificación Técnica Detallada
- **Algoritmo de Envío de Coordenadas**:
  \`\`\`javascript
  navigator.geolocation.watchPosition((pos) => {
    const dist = calculateDistance(pos.coords.latitude, pos.coords.longitude, lastLat, lastLng);
    if (dist > 20) { // Enviar si se movió más de 20 metros
      socket.emit("update_coords", { lat: pos.coords.latitude, lng: pos.coords.longitude });
    }
  }, null, { enableHighAccuracy: true });
  \`\`\`

## 🎨 Flujo de Usuario y UX
- Mapa interactivo de ruta simplificado con Google Maps, mostrando la última ubicación conocida del profesional moviéndose hacia el domicilio.

## 🔒 Seguridad y Cumplimiento
- Anonimización de la geolocalización exacta del cliente: el mapa del profesional solo muestra un radio aproximado de 100m hasta que el trabajo es aceptado de mutuo acuerdo.`,

      chat_tiempo_real: `# Módulo 11: Chat en Tiempo Real (MVP Económico)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Backend Tecnológico**: Firebase Cloud Firestore. Permite sincronización de mensajería instantánea en tiempo real out-of-the-box sin saturar la CPU de nuestra API monolítica.
- **Moderación**: Moderación por Filtro Regex tradicional. Un parser básico de expresiones regulares en el cliente y servidor bloquea correos, enlaces y patrones numéricos de teléfonos.

## 🚀 Especificación Técnica Detallada
- **Regex de Censura de Datos de Contacto**:
  \`\`\`javascript
  const contactRegex = /(\\+?\\d{1,4}[-\\s]?\\d{7,10}|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})/g;
  const sanitizedMessage = originalMessage.replace(contactRegex, "[DATOS CENSURADOS POR SEGURIDAD]");
  \`\`\`

## 🎨 Flujo de Usuario y UX
- Burbujas de chat elegantes con doble check de lectura sutil, permitiendo enviar adjuntos fotográficos y textos cortos rápidos.

## 🔒 Seguridad y Cumplimiento
- Reglas de Seguridad estrictas de Firestore que impiden que un usuario lea el chat que no le pertenece, contrastando el UID del autenticado contra los participantes de la sala de chat.`,

      reputacion_disputas: `# Módulo 12: Reputación y Disputas (MVP Económico)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Scoring**: Promedio de Estrellas Simple. Un puntaje aritmético simple basado en las reseñas dejadas por los clientes de forma histórica.
- **Resolución**: Reembolso Automatizado basado en scoring previo. Para resolver rápidamente reclamos de montos menores, el sistema devuelve créditos virtuales en la cuenta del cliente para mitigar costos de atención de soporte humano.

## 🚀 Especificación Técnica Detallada
- **Query de Promedio Aritmético de Reseñas**:
  \`\`\`sql
  SELECT AVG(rating) as rating_average 
  FROM reviews 
  WHERE professional_id = 'USR-928';
  \`\`\`

## 🎨 Flujo de Usuario y UX
- Formulario de calificación al finalizar el servicio, con selección de 1 a 5 estrellas táctiles y opción de añadir un comentario descriptivo opcional.

## 🔒 Seguridad y Cumplimiento
- Límite estricto de una calificación por servicio completado para evitar campañas de desprestigio o inflación artificial de reputación mediante cuentas falsas de clientes.`,

      inteligencia_artificial: `# Módulo 13: IA y Automatización (MVP Económico)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Foco del Motor de IA**: Sugerencia Inteligente de Precios y Clasificación de Tareas. Utiliza Gemini en el backend para predecir precios base de ofertas según la descripción escrita por el cliente y categorizar automáticamente la tarea.

## 🚀 Especificación Técnica Detallada
- **Integración con Gemini**:
  Llamada al modelo de IA enviando el texto de descripción del servicio y retornando un JSON estructurado con el precio base sugerido de mercado y la categoría idónea de plomería, electricidad, etc.

## 🎨 Flujo de Usuario y UX
- Al escribir la descripción: "Necesito cambiar un grifo goteando", la app muestra instantáneamente un tag animado: "Precio sugerido: $25 - $40 | Categoría: Plomería".

## 🔒 Seguridad y Cumplimiento
- Validación de que las entradas enviadas a la API de Gemini no contengan datos personales del usuario, resguardando la privacidad de datos bajo los acuerdos de uso de la API.`,

      escalabilidad_internacional: `# Módulo 14: Escalabilidad e Internacionalización (MVP Económico)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Escalabilidad de Infraestructura**: Réplicas de Lectura en Base de Datos y Colas de Tareas. Toda consulta de lectura de profesionales se envía a réplicas dedicadas para liberar la base de datos principal de escrituras y transacciones financieras críticas.

## 🚀 Especificación Técnica Detallada
- **Balanceador de Conexiones**:
  Conexión dual utilizando librerías ORM/Query Builder en Node.js que dirigen las escrituras al nodo Primary de Postgres y las lecturas de perfiles públicos al nodo Read Replica de Postgres.

## 🎨 Flujo de Usuario y UX
- El cliente percibe tiempos de respuesta extremadamente bajos (<80ms) incluso durante horas pico gracias a la caché distribuida y la nula congestión en la lectura de bases de datos.

## 🔒 Seguridad y Cumplimiento
- Configuración de cortafuegos restrictivos de Google Cloud para que únicamente los servidores del monolito modular tengan acceso por puerto 5432 a las réplicas y base de datos relacional Postgres.`
    }
  },
  corporativo_escrow: {
    name: "🔒 Ultra-Seguro & Escrow B2B",
    description: "Para plataformas corporativas con custodia de fondos segura, soporte multi-operador y KYC biométrico.",
    answers: {
      monetizacion: "hibrido",
      negociacion: "oferta_contraoferta",
      tipo_infraestructura: "microservicios",
      comunicacion_tiempo_real: "websocket",
      unificacion_perfiles: "cuenta_unica",
      cuentas_empresa: "b2b_multi_seat",
      proceso_servicio: "escrow_flujo",
      tipo_db: "spanner",
      geo_indexing: "geohash_redis",
      verificacion_kyc: "verificacion_biometrica",
      enmascaramiento: "enmascaramiento_completo",
      pasarela_pago: "stripe_connect",
      retencion_impuestos: "automatico_tax",
      esquema_wallet: "ledger_doble_entrada",
      metodos_retiro: "retiro_instantaneo",
      limites_negociacion: "bandas_inteligentes",
      visibilidad_ofertas: "subasta_ciega",
      estrategia_tracking: "tracking_continuo",
      geofencing: "geofence_activo",
      arquitectura_chat: "socket_io_redis",
      moderacion_chat: "moderacion_ia_nlp",
      algoritmo_reputacion: "reputacion_ponderada",
      resolucion_disputas: "auditoria_evidencia",
      ia_matching: "ia_moderacion_imagenes",
      arquitectura_escalabilidad: "auto_scaling_k8s"
    },
    specs: {
      modelo_negocio: `# Módulo 1: Modelo de Negocio (Ultra-Seguro & Escrow B2B)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Monetización**: Modelo Híbrido. Cuotas mensuales para profesionales Premium combinadas con una comisión transaccional reducida del **8%** por servicio concretado.
- **Negociación**: Subasta Abierta (Modelo InDrive). El cliente define su precio estimado, y los profesionales contraofertan de forma dinámica.

## 🚀 Especificación Técnica Detallada
- **Algoritmo de Reparto de Ganancia (Split)**:
  \`\`\`typescript
  const splitWithEscrow = (totalAmount: number) => {
    const platformFee = totalAmount * 0.08;
    const professionalShare = totalAmount - platformFee;
    return { platformFee, professionalShare };
  };
  \`\`\`
- Las contraofertas están limitadas en tiempo real mediante un microservicio de control de pujas para evitar spam de precios en la base de datos de subastas.

## 🎨 Flujo de Usuario y UX
- Interfaz interactiva de puja con botones rápidos de incremento: "+$5", "+$10" y contraofertas con cronómetros de expiración de 5 minutos para agilizar la toma de decisión.

## 🔒 Seguridad y Cumplimiento
- Auditoría total de tarifas con detección de blanqueo de capitales mediante transacciones sospechosas infladas artificialmente entre cuentas vinculadas.`,

      arquitectura: `# Módulo 2: Arquitectura General (Ultra-Seguro & Escrow B2B)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Enfoque Arquitectónico**: Microservicios Desacoplados. Servicios totalmente autónomos (Auth, Geolocalización, Pagos, Chat, Notificaciones) orquestados mediante Kubernetes en Google Cloud.
- **Mensajería en Tiempo Real**: WebSockets nativos escalados horizontalmente mediante Redis Pub/Sub, garantizando redundancia y latencias extremadamente bajas (<50ms).

## 🚀 Especificación Técnica Detallada
- **Stack**: Go, Node.js, Kubernetes (GKE), Docker, Redis.
- **Topología**: Puerta de enlace API Gateway (Kong/Apisix) que distribuye el tráfico a los microservicios en base a rutas:
  \`\`\`
  /api/v1/auth    -> Auth Service
  /api/v1/billing -> Billing (Escrow) Service
  /api/v1/geo     -> Geospatial Tracking Service
  \`\`\`

## 🎨 Flujo de Usuario y UX
- Sincronización instantánea de mapas y ofertas en pantalla con transiciones fluidas de los marcadores en tiempo real.

## 🔒 Seguridad y Cumplimiento
- Arquitectura de red de Confianza Cero (Zero Trust) utilizando Service Mesh (Istio) para encriptar toda comunicación interna de microservicio a microservicio.`,

      roles_usuario: `# Módulo 3: Roles de Usuario (Ultra-Seguro & Escrow B2B)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Estructura de Perfiles**: Cuenta Unificada con Selector de Rol rápido.
- **Soporte Corporativo**: Soporte Corporativo B2B (Multi-operario). Una empresa de servicios (e.g. cooperativa de plomería o agencia de limpieza) registra un perfil institucional y gestiona sub-cuentas para sus operarios.

## 🚀 Especificación Técnica Detallada
- **Modelo de Cuentas B2B**:
  \`\`\`sql
  CREATE TABLE organization_profiles (
    id UUID PRIMARY KEY,
    company_name VARCHAR(255),
    tax_id VARCHAR(50)
  );
  
  CREATE TABLE operators (
    id UUID PRIMARY KEY,
    organization_id UUID REFERENCES organization_profiles(id),
    user_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'active'
  );
  \`\`\`

## 🎨 Flujo de Usuario y UX
- Panel administrativo corporativo para dueños de empresas, donde ven el mapa con la ubicación y estatus de servicio de todos sus operarios activos.

## 🔒 Seguridad y Cumplimiento
- Permisos granulares de acceso de lectura de datos bancarios protegidos únicamente para el rol de administrador de la organización B2B.`,

      flujos_completos: `# Módulo 4: Flujo Completo de Servicio (Ultra-Seguro & Escrow B2B)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Esquema Transaccional**: Flujo con Depósito en Garantía (Escrow Obligatorio). El cliente paga antes de recibir la visita técnica. Los fondos se bloquean de forma segura y se liberan al profesional tras confirmación física de entrega.

## 🚀 Especificación Técnica Detallada
- **Esquema de Estados y Webhooks**:
  \`\`\`
  [SOLICITUD] -> [PUJA] -> [PAGO_ESCROW] -> [ASIGNADO] -> [RUTA] -> [EN_SITIO] -> [FINALIZADO] -> [LIBERADO]
  \`\`\`
- Si el cliente no confirma en 48 horas post-trabajo y no hay reclamos, un cron automático ejecuta la liberación de fondos para evitar jineteo de capital de profesionales.

## 🎨 Flujo de Usuario y UX
- Indicadores interactivos de color para reflejar la seguridad del depósito: "Fondos resguardados en garantía por Directo".

## 🔒 Seguridad y Cumplimiento
- Cumplimiento riguroso de normativas anti-lavado de dinero (AML). Los fondos de garantía se custodian en cuentas bancarias corporativas fiduciarias segregadas de los fondos operativos de Directo.`,

      base_datos: `# Módulo 5: Base de Datos (Ultra-Seguro & Escrow B2B)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Motor Principal**: Google Cloud Spanner. Base de datos relacional de escala global con consistencia fuerte y replicación multi-región para tolerancia total a fallos catastróficos.
- **Indexación Geoespacial**: Redis Geospatial para Tracking Activo. Las coordenadas en ruta activa de profesionales se guardan exclusivamente en RAM en memoria caché reduciendo en un 95% el I/O del disco duro.

## 🚀 Especificación Técnica Detallada
- **Comandos Redis Geospatial**:
  \`\`\`redis
  GEOADD active_professionals -74.006 40.7128 "prof_821"
  GEORADIUS active_professionals -74.006 40.7128 5 km WITHDIST WITHCOORD
  \`\`\`

## 🎨 Flujo de Usuario y UX
- Movimiento ultra-fluido de los vehículos de profesionales en el mapa del cliente gracias a la nula latencia en las consultas geográficas directas de la memoria caché.

## 🔒 Seguridad y Cumplimiento
- Replicación síncrona en 3 zonas continentales diferentes para garantizar disponibilidad de los datos financieros del 99.999% ante desastres físicos de centros de datos.`,

      seguridad: `# Módulo 6: Seguridad y KYC (Ultra-Seguro & Escrow B2B)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Verificación**: Verificación Biométrica y Documental Automatizada mediante Stripe Identity / Onfido. Validación de pasaporte, ID nacional y selfie biométrica en tiempo real para evitar fraudes de identidad física.
- **Enmascaramiento**: Enmascaramiento completo de teléfonos y Chat Encriptado. Todo mensaje y llamada VoIP pasa cifrada por proxy impidiendo el robo de datos y fuga de comisiones.

## 🚀 Especificación Técnica Detallada
- **Flujo de Integración de Onfido API**:
  Envío del SDK móvil con captura inteligente de rostros. Recepción de webhook seguro firmado criptográficamente de aprobación o rechazo por parte del motor de Onfido.
- **Enmascaramiento VoIP**: Twilio Voice Proxy para enmascarar números de teléfono.

## 🎨 Flujo de Usuario y UX
- Asistente de verificación con animaciones faciales 3D que indica al profesional girar la cabeza para validar la selfie de vida en 5 segundos.

## 🔒 Seguridad y Cumplimiento
- Estricto cumplimiento de GDPR y estándares de privacidad de datos locales de ciberseguridad. Encriptación militar AES-GCM-256 de todas las fotos de portafolios y chats.`,

      sistema_pagos: `# Módulo 7: Sistema de Pagos (Ultra-Seguro & Escrow B2B)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Procesador de Pago**: Stripe Connect (Custom / Express). Sistema de sub-cuentas vinculadas que permite la automatización completa de retiros, división de fees transaccionales y reembolsos inmediatos.
- **Esquema Fiscal**: Cálculo y Retención Fiscal Automatizada vía Stripe Tax. Facturación automática e impuesto desglosado retenido y transferido a las dependencias gubernamentales locales.

## 🚀 Especificación Técnica Detallada
- **Llamada de Creación de Transferencia en Stripe Connect**:
  \`\`\`typescript
  const transfer = await stripe.transfers.create({
    amount: netAmountInCents,
    currency: "usd",
    destination: professionalStripeAccountId,
    transfer_group: "order_9182",
  });
  \`\`\`

## 🎨 Flujo de Usuario y UX
- Checkout integrado y pulido en el flujo de la aplicación con guardado seguro de tarjetas, compatible con Apple Pay y Google Pay con validación biométrica.

## 🔒 Seguridad y Cumplimiento
- Certificación completa PCI-DSS Nivel 1. Los servidores de Directo jamás tocan, guardan ni procesan números crudos de tarjetas de crédito o débito de los clientes.`,

      wallet: `# Módulo 8: Wallet y Monedero Interno (Ultra-Seguro & Escrow B2B)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Esquema de Wallet**: Libro Mayor de Doble Entrada (Ledger ACID). Diseñado para máxima consistencia financiera donde cada movimiento contable tiene contrapartida estricta de origen y destino.
- **Método de Retiro**: Retiro Express/Instantáneo. El profesional puede retirar sus fondos a su banco en un lapso menor a 15 minutos pagando un fee de conveniencia del 1.5%.

## 🚀 Especificación Técnica Detallada
- **Modelo de Datos de Doble Entrada**:
  \`\`\`sql
  CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_account VARCHAR(100), -- 'platform_escrow', 'user_wallet_92'
    destination_account VARCHAR(100),
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );
  \`\`\`

## 🎨 Flujo de Usuario y UX
- Animaciones elegantes al retirar dinero, mostrando el progreso de la transferencia interbancaria en segundos con confirmación sonora.

## 🔒 Seguridad y Cumplimiento
- Conciliación contable automatizada cada 1 hora entre los saldos reportados en base de datos interna y los saldos reales de depósito en Stripe Connect.`,

      negociacion_precios: `# Módulo 9: Motor de Negociación Directa (Ultra-Seguro & Escrow B2B)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Límites de Precio**: Bandas de Negociación Sugeridas por IA. Algoritmos de Machine Learning analizan la tarea propuesta y acotan la subasta a +/- 30% del precio promedio histórico para evitar dumping abusivo.
- **Visibilidad**: Subasta Ciega (Privacidad Total). Los profesionales no conocen las cotizaciones enviadas por sus competidores, motivando a ofertar la tarifa más justa y de calidad.

## 🚀 Especificación Técnica Detallada
- **Algoritmo de Cálculo de Banda de Precios por IA**:
  El sistema consulta el promedio del mercado de la categoría en la sub-región y define las cotizaciones límite permitidas.

## 🎨 Flujo de Usuario y UX
- Barra de sugerencia para el profesional: "Sugerencia del Experto: Cotiza entre $40 y $55 para maximizar tu probabilidad de ser seleccionado hoy."

## 🔒 Seguridad y Cumplimiento
- Bloqueo instantáneo y reporte de perfiles que intenten burlar las bandas de precio mediante tácticas colusorias.`,

      gps_geolocalizacion: `# Módulo 10: GPS y Geolocalización (Ultra-Seguro & Escrow B2B)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Frecuencia de Rastreo**: Actualización Continua Constante (Alta Precisión). Coordenadas en tránsito activo se emiten por WebSocket con latencia menor a 5 segundos para seguridad extrema.
- **Geocercas (Geofencing)**: Geocercas de Arribo Automático. Al ingresar el profesional al radio de 50 metros del cliente, la app dispara el estatus "Profesional en Sitio" sin intervención manual.

## 🚀 Especificación Técnica Detallada
- **Servicio de Geofencing en Servidor**:
  \`\`\`typescript
  const checkGeofence = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const dist = getHaversineDistance(lat1, lon1, lat2, lon2);
    if (dist <= 50) { // Menor a 50 metros
      triggerArrivalWebhook();
    }
  };
  \`\`\`

## 🎨 Flujo de Usuario y UX
- Animación de zoom de mapa cuando el profesional entra al vecindario y notificación emergente flotante: "¡Tu profesional está a la puerta!".

## 🔒 Seguridad y Cumplimiento
- Borrado definitivo de las coordenadas en tiempo real del caché del servidor al completarse la orden para respetar los estándares de privacidad más altos.`,

      chat_tiempo_real: `# Módulo 11: Chat en Tiempo Real (Ultra-Seguro & Escrow B2B)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Backend Tecnológico**: Node.js con Sockets propios e indexación de mensajes en Redis, persistiendo en base de datos de manera asíncrona.
- **Moderación**: Filtro Inteligente con IA en Tiempo Real. Algoritmos rápidos procesan los textos bloqueando de raíz datos sensibles, links de pago no autorizados o lenguaje amenazante.

## 🚀 Especificación Técnica Detallada
- **Algoritmo de Procesamiento de Filtro de Mensajes por IA**:
  El pipeline de mensajería intercepta el payload y ejecuta la llamada de validación del texto mediante un modelo de lenguaje local embebido (TensorFlow.js) antes de propagarlo al destinatario.

## 🎨 Flujo de Usuario y UX
- Indicadores interactivos visuales que guían la conversación segura: "Por tu seguridad, mantén los tratos y pagos dentro de Directo".

## 🔒 Seguridad y Cumplimiento
- Encriptación de mensajes en la base de datos persistente mediante claves AES exclusivas de cada conversación para evitar filtración masiva de datos en caso de brechas.`,

      reputacion_disputas: `# Módulo 12: Reputación y Disputas (Ultra-Seguro & Escrow B2B)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Scoring**: Scoring Ponderado Multidimensional. Combina promedio de estrellas (40%), tasa de finalización exitosa (30%), velocidad de respuesta (20%) y antigüedad en la plataforma (10%).
- **Resolución**: Auditoría de Conversaciones y Multimedia Obligatoria. Se requiere que el profesional suba fotos del estado inicial y del resultado final del trabajo como evidencia indiscutible para resolver reclamos.

## 🚀 Especificación Técnica Detallada
- **Fórmula de Cálculo de Scoring Ponderado**:
  \`\`\`
  Scoring = (Stars * 0.4) + (CompletionRate * 3.0) + (ResponseSpeed * 2.0) + (TenureBonus)
  \`\`\`

## 🎨 Flujo de Usuario y UX
- Gráficas e insignias interactivas de confianza en el perfil del profesional, detallando sus estadísticas de desempeño de manera totalmente transparente para el cliente.

## 🔒 Seguridad y Cumplimiento
- Firma digital criptográfica de los adjuntos de evidencia para asegurar la cadena de custodia legal de fotos en caso de demandas civiles por daños.`,

      inteligencia_artificial: `# Módulo 13: IA y Automatización (Ultra-Seguro & Escrow B2B)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Foco del Motor de IA**: Moderación de Fotos de Identidad, Trabajos y Perfiles (Visión por Computadora). Auditoría instantánea de imágenes subidas para evitar desnudos, contenido peligroso, o fotos de trabajos plagiados en los portafolios.

## 🚀 Especificación Técnica Detallada
- **Integración con Modelos de Gemini**:
  Llamada al servicio de visión artificial para verificar que la foto subida en la selfie coincida con la del documento de identidad y detectar fotos copiadas de la web en los portafolios de trabajo.

## 🎨 Flujo de Usuario y UX
- Al subir una foto, un escáner luminoso simula la auditoría inteligente, confirmando la validación del adjunto en menos de 2 segundos de manera interactiva.

## 🔒 Seguridad y Cumplimiento
- Cumplimiento de políticas estrictas de privacidad biométrica. El hashing del mapeo facial se encripta y se destruye una vez realizada la validación de coincidencia de identidad.`,

      escalabilidad_internacional: `# Módulo 14: Escalabilidad e Internacionalización (Ultra-Seguro & Escrow B2B)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Escalabilidad de Infraestructura**: Auto-escalado Horizontal de Contenedores y CDN Global en múltiples centros de datos internacionales.

## 🚀 Especificación Técnica Detallada
- **Arquitectura Distribuída en Kubernetes**:
  Orquestador K8s desplegado en Google Kubernetes Engine (GKE) configurado con Horizontal Pod Autoscalers (HPA) que clona los Pods del backend en segundos al superar el 70% de consumo de CPU/Memoria.

## 🎨 Flujo de Usuario y UX
- El sistema de ruteo por CDN de Google Cloud entrega los activos multimedia y mapas con latencia insignificante en cualquier continente del planeta.

## 🔒 Seguridad y Cumplimiento
- Protección robusta de mitigación de ataques de Denegación de Servicio (DDoS) mediante Google Cloud Armor configurado a nivel de la puerta de enlace global.`
    }
  },
  indrive_clone: {
    name: "🏎️ Clon de InDrive (Subasta)",
    description: "Centrado en subastas ciegas en tiempo real con negociación directa, chat rápido y geolocalización adaptativa.",
    answers: {
      monetizacion: "comision",
      negociacion: "oferta_contraoferta",
      tipo_infraestructura: "monolito_modular",
      comunicacion_tiempo_real: "websocket",
      unificacion_perfiles: "cuenta_unica",
      cuentas_empresa: "no_b2b",
      proceso_servicio: "pago_directo",
      tipo_db: "postgres_postgis",
      geo_indexing: "postgres_spatial_idx",
      verificacion_kyc: "basico",
      enmascaramiento: "libertad_contacto",
      pasarela_pago: "procesadores_multiples",
      retencion_impuestos: "responsabilidad_profesional",
      esquema_wallet: "saldo_virtual_basico",
      metodos_retiro: "retiro_programado",
      limites_negociacion: "mercado_libre",
      visibilidad_ofertas: "subasta_ciega",
      estrategia_tracking: "tracking_distancia",
      geofencing: "no_geofence",
      arquitectura_chat: "chat_firebase",
      moderacion_chat: "regex_basico",
      algoritmo_reputacion: "promedio_estrellas_simple",
      resolucion_disputas: "reembolso_rapido",
      ia_matching: "ia_matching_precios",
      arquitectura_escalabilidad: "read_replicas_db"
    },
    specs: {
      modelo_negocio: `# Módulo 1: Modelo de Negocio (Clon de InDrive)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Monetización**: Comisión reducida del **10%** por transacción cobrada al profesional para mantener la competitividad extrema en precios.
- **Negociación**: Subasta Abierta en Tiempo Real (Modelo InDrive). El cliente inicia con un precio sugerido y los profesionales realizan contraofertas inmediatas.

## 🚀 Especificación Técnica Detallada
- **Lógica de Pujas Bidireccionales**:
  El profesional recibe un push con el servicio y puede ofertar la tarifa propuesta por el cliente, o incrementarla en un rango determinado con contraofertas en tiempo real.

## 🎨 Flujo de Usuario y UX
- Panel de ofertas recibidas por el cliente que se actualiza dinámicamente con animaciones elegantes, permitiendo comparar precios y estrellas en una vista unificada rápida.

## 🔒 Seguridad y Cumplimiento
- Limitación estricta a un máximo de 3 contraofertas por profesional para evitar el acoso o acaparamiento del canal de negociación del cliente.`,

      arquitectura: `# Módulo 2: Arquitectura General (Clon de InDrive)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Enfoque de Sistemas**: Monolito Modular con Escalado. Agilidad absoluta y simplicidad de mantenimiento, con despliegue de base de datos Postgres de alto rendimiento.
- **Mensajería**: WebSockets directos para emparejar y comunicar las ofertas de forma sub-milisegundo.

## 🚀 Especificación Técnica Detallada
- **Eventos WebSocket de Pujas**:
  \`\`\`typescript
  // Al enviar una contraoferta
  socket.emit("send_counter_offer", { orderId: "192", amount: 35.00 });
  \`\`\`

## 🎨 Flujo de Usuario y UX
- Al recibir ofertas, la app emite un sonido sutil y actualiza los precios con un destello animado de color verde para llamar la atención del cliente.

## 🔒 Seguridad y Cumplimiento
- Control de tasa de peticiones a la API para evitar ataques que busquen bloquear ofertas o saturar el portal con peticiones duplicadas.`,

      roles_usuario: `# Módulo 3: Roles de Usuario (Clon de InDrive)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Identidad**: Cuenta Unificada con Selector de Rol rápido para facilitar el flujo de usuarios que contratan y ofrecen sus servicios técnicos.
- **Multi-perfil**: Solo profesionales individuales en esta fase para un onboarding veloz.

## 🚀 Especificación Técnica Detallada
- **Estructura de Base de Datos**:
  Tabla centralizada de usuarios con columnas específicas para habilitar el estatus y documentos profesionales una vez verificados por el equipo.

## 🎨 Flujo de Usuario y UX
- Switch de rol interactivo ubicado en el menú superior derecho con cambio inmediato de paleta de colores para denotar el cambio de modo de trabajo.

## 🔒 Seguridad y Cumplimiento
- Middleware de validación que impide de forma absoluta que un usuario se auto-contrate o envíe ofertas a su propia solicitud.`,

      flujos_completos: `# Módulo 4: Flujo Completo de Servicio (Clon de InDrive)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Ciclo Transaccional**: Pago Directo al Finalizar. Al terminar el trabajo, el cliente liquida de forma libre en efectivo o transferencia local, sin custodia por parte de la plataforma.

## 🚀 Especificación Técnica Detallada
- **Ciclo de Estados**:
  \`\`\`
  [SOLICITUD_ACTIVA] -> [NEGOCIACION] -> [ACEPTADO] -> [TRABAJO_INICIADO] -> [PAGO_DIRECTO] -> [RESEÑA]
  \`\`\`

## 🎨 Flujo de Usuario y UX
- Pantalla interactiva que guía al cliente a pagar la cantidad acordada cara a cara, con botón prominente de "Liberar y Calificar".

## 🔒 Seguridad y Cumplimiento
- Deslinde de responsabilidades contractuales explícito en los términos de uso. La plataforma es un mero facilitador de contacto y no asume custodia financiera directa del servicio principal.`,

      base_datos: `# Módulo 5: Base de Datos (Clon de InDrive)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Motor**: PostgreSQL con PostGIS para una consistencia e indexación geoespacial óptima y estable.
- **Indexación Geoespacial**: PostgreSQL Spatial Indices (R-Tree / GiST) para búsquedas directas de geolocalización.

## 🚀 Especificación Técnica Detallada
- **Configuración de Índices Espaciales**:
  \`\`\`sql
  CREATE INDEX professional_geom_idx ON professional_profiles USING GIST (geom);
  \`\`\`

## 🎨 Flujo de Usuario y UX
- El cliente ve un mapa con marcadores activos que se reposicionan con transiciones suaves cada vez que la base de datos registra movimiento del profesional.

## 🔒 Seguridad y Cumplimiento
- Encriptación y resguardo de claves de conexión mediante variables de entorno del servidor seguras sin almacenar datos crudos en el código fuente.`,

      seguridad: `# Módulo 6: Seguridad y KYC (Clon de InDrive)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Verificación**: Registro por teléfono SMS y verificación social básica de reputación para un crecimiento agresivo de oferta.
- **Enmascaramiento**: Intercambio libre de datos de contacto tras aceptar oferta. Una vez cerrado el trato, los teléfonos se hacen visibles para coordinar de inmediato por llamada tradicional.

## 🚀 Especificación Técnica Detallada
- **Integración de SMS OTP**:
  Servicio Twilio Verify para validar el número telefónico en el registro inicial enviando un código de 6 dígitos que expira en 5 minutos.

## 🎨 Flujo de Usuario y UX
- Formulario de ingreso de código OTP con salto automático al siguiente input y cuenta regresiva interactiva de reenvío de SMS.

## 🔒 Seguridad y Cumplimiento
- Protección de límites de llamadas (Rate limiting) de OTP por número telefónico para evitar fraudes de consumo y sobrecostos por envío masivo de mensajes.`,

      sistema_pagos: `# Módulo 7: Sistema de Pagos (Clon de InDrive)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Procesador**: Multi-pasarela Integrada (MercadoPago + dLocal). Se busca la máxima compatibilidad de métodos de cobro según el mercado local hispano.
- **Esquema Fiscal**: Responsabilidad exclusiva del profesional independiente de emitir factura por sus servicios brindados.

## 🚀 Especificación Técnica Detallada
- **Webhook de Conciliación de Pagos**:
  Procesamiento asíncrono para acreditar el pago de las comisiones del profesional acumuladas en el sistema.

## 🎨 Flujo de Usuario y UX
- Panel de facturación de comisiones para el profesional, con opciones de recarga de balance mediante métodos rápidos locales de un solo clic.

## 🔒 Seguridad y Cumplimiento
- Cifrado de datos de transferencias de punta a punta y almacenamiento seguro de logs de Webhooks para control administrativo interno.`,

      wallet: `# Módulo 8: Wallet y Monedero Interno (Clon de InDrive)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Estructura**: Saldo en Tabla de Perfil con Historial de Movimientos de Recarga de Comisiones.
- **Retiros**: Transferencia Programada Semanal.

## 🚀 Especificación Técnica Detallada
- **Estructura de Base de Datos**:
  Actualización atómica de balances mediante transacciones SQL con bloqueo de fila para evitar condiciones de carrera contables.

## 🎨 Flujo de Usuario y UX
- Indicador visual claro de "Tu Saldo de Comisión Disponible: $15.00". Permite recargar saldo para continuar cotizando trabajos activos.

## 🔒 Seguridad y Cumplimiento
- Auditoría automática de saldos inconsistentes que congela temporalmente la cuenta del profesional en caso de incongruencias en su histórico de transacciones.`,

      negociacion_precios: `# Módulo 9: Motor de Negociación Directa (Clon de InDrive)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Límites**: Mercado Totalmente Libre de tarifas, autorregulado por oferta y demanda de la comunidad.
- **Visibilidad**: Subasta Ciega (Privacidad Total). El profesional postula a ciegas, compitiendo por calidad y precio sin viciar la subasta con la tarifa de los demás competidores.

## 🚀 Especificación Técnica Detallada
- **Lógica del Motor de Subasta Ciega**:
  El sistema oculta los montos de ofertas de la competencia en el endpoint público, enviando los datos desglosados exclusivamente al creador del servicio solicitado.

## 🎨 Flujo de Usuario y UX
- Al profesional se le indica de manera sutil: "Envía tu mejor oferta. Las ofertas son privadas y el cliente elegirá en base a tu precio y reputación".

## 🔒 Seguridad y Cumplimiento
- Hashing y encriptación de datos transaccionales de ofertas en tránsito para mantener el secreto absoluto de las subastas ciegas en el backend.`,

      gps_geolocalizacion: `# Módulo 10: GPS y Geolocalización (Clon de InDrive)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Estrategia**: Filtro de Distancia Adaptativa (Ahorro de Batería) que actualiza la geolocalización solo tras desplazamientos mayores a 20 metros.
- **Geocercas**: Estados manuales por botón "Llegué al Sitio" operados de manera voluntaria por el profesional técnico.

## 🚀 Especificación Técnica Detallada
- **API Geolocation en Dispositivo Móvil**:
  Uso de APIs móviles para detectar el movimiento físico eficiente y notificar al servidor de manera asíncrona mediante peticiones HTTP estructuradas.

## 🎨 Flujo de Usuario y UX
- Pantalla intuitiva que muestra la ruta trazada sobre el mapa interactivo y un gran botón flotante de color naranja "Ya llegué al Domicilio" para notificar al cliente.

## 🔒 Seguridad y Cumplimiento
- Desactivación absoluta del tracking en segundo plano una vez concluido el servicio para salvaguardar la intimidad física y privacidad de coordenadas de los usuarios.`,

      chat_tiempo_real: `# Módulo 11: Chat en Tiempo Real (Clon de InDrive)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Soporte**: Firebase Cloud Firestore para mensajería y envío de fotos fluida y sin latencia.
- **Moderación**: Moderación por Filtro Regex tradicional para mitigar fraudes en enlaces de pago y compartir teléfonos fuera del acuerdo comercial inicial.

## 🚀 Especificación Técnica Detallada
- **Reglas de Firestore para Chats de Orden**:
  \`\`\`javascript
  match /chats/{chatId} {
    allow read, write: if request.auth.uid in resource.data.participants;
  }
  \`\`\`

## 🎨 Flujo de Usuario y UX
- Caja de texto interactiva con envío rápido de imágenes del estado de las instalaciones mecánicas o del área de trabajo técnico.

## 🔒 Seguridad y Cumplimiento
- Expiración de acceso a la sala de chat de manera automática 48 horas después de finalizado con éxito el servicio correspondiente para resguardar la privacidad.`,

      reputacion_disputas: `# Módulo 12: Reputación y Disputas (Clon de InDrive)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Scoring**: Promedio de Estrellas Simple.
- **Resolución**: Soporte Humano Directo y Reembolso Automatizado rápido en créditos virtuales para montos bajos, asegurando una retención ágil del cliente descontento.

## 🚀 Especificación Técnica Detallada
- **Lógica de Almacenamiento de Reseñas**:
  Modelo relacional simple de calificaciones de clientes hacia profesionales, asociando ID de servicio, estrellas, comentarios y fecha de emisión.

## 🎨 Flujo de Usuario y UX
- Visualización de estrellas en formato de barras horizontales desglosadas (e.g. porcentaje de 5 estrellas, 4 estrellas) en el perfil público del profesional.

## 🔒 Seguridad y Cumplimiento
- Filtro de spam de reseñas duplicadas utilizando validaciones de ID de servicio cerrado de forma forzosa en la base de datos relacional.`,

      inteligencia_artificial: `# Módulo 13: IA y Automatización (Clon de InDrive)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Foco del Motor de IA**: Sugerencia Inteligente de Precios y Clasificación de Tareas. Utiliza Gemini en el backend para predecir precios base de ofertas según la descripción escrita por el cliente y categorizar automáticamente la tarea.

## 🚀 Especificación Técnica Detallada
- **Consumo de Gemini API**:
  Integración de prompts especializados de categorización para asignar de forma instantánea el servicio a la rama correspondiente del catálogo técnico.

## 🎨 Flujo de Usuario y UX
- En la interfaz, se muestra una estimación flotante animada: "La IA estima el costo de este trabajo entre $30 - $45" para ayudar al usuario a cotizar de forma realista.

## 🔒 Seguridad y Cumplimiento
- Sanitización obligatoria de cualquier entrada del usuario para mitigar ataques de inyección de prompts maliciosos (Prompt Injection) en las llamadas de IA.`,

      escalabilidad_internacional: `# Módulo 14: Escalabilidad e Internacionalización (Clon de InDrive)
## 📋 Resumen Ejecutivo y Decisiones Clave
- **Escalabilidad**: Réplicas de Lectura en Base de Datos y Colas de Tareas para agilizar las consultas concurrentes de mapas y ofertas durante horas de alta demanda de movilidad.

## 🚀 Especificación Técnica Detallada
- **Gestión de Colas de Notificaciones Push**:
  Uso de colas de tareas asíncronas para propagar de inmediato las alertas de subastas a miles de profesionales registrados en el vecindario de manera paralela.

## 🎨 Flujo de Usuario y UX
- Recepción instantánea y en segundo plano de alertas push, incluso con la aplicación en estado suspendido o con la pantalla apagada.

## 🔒 Seguridad y Cumplimiento
- Cifrado seguro de tokens de notificaciones push en base de datos persistente Postgres utilizando políticas estrictas de actualización de credenciales expiradas.`
    }
  }
};
