import { Specialist, Module } from "./types";

export const SPECIALISTS: Specialist[] = [
  {
    id: "pm_uber",
    name: "Santiago Rossi",
    role: "Product Manager de Uber",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
    bio: "Ex-Lead PM en Uber LatAm. Especialista en liquidez de mercado, algoritmos de asignación dinámica de precios, retención de conductores/socios y escalabilidad de operaciones locales.",
    specialty: "Estrategias de liquidez de oferta/demanda y gamificación.",
    focus: "Mapear flujos de usuario de fricción cero, optimización del embudo de registro, y retención a largo plazo."
  },
  {
    id: "arch_sr",
    name: "Elena Rostova",
    role: "Arquitecta de Software Senior",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&h=256&q=80",
    bio: "Arquitecta de sistemas distribuídos a gran escala, experta en arquitecturas de microservicios con alta disponibilidad e integración asíncrona mediante sistemas de colas de mensajería.",
    specialty: "Sistemas distribuidos y tiempo real.",
    focus: "Tolerancia a fallos, acoplamiento débil de módulos, integración de APIs robustas y diagramas de flujo."
  },
  {
    id: "backend_eng",
    name: "Marcus Vance",
    role: "Ingeniero Backend Senior",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80",
    bio: "Especialista en desarrollo backend con Node.js, Go y Rust. Experto en sockets de alto rendimiento, optimización de consultas de bases de datos y APIs GraphQL/REST.",
    specialty: "APIs de alta velocidad y conexiones WebSocket.",
    focus: "Optimización de carga del servidor, gestión de memoria, y procesamiento eficiente de colas de tareas."
  },
  {
    id: "mobile_eng",
    name: "Ji-Min Park",
    role: "Ingeniero Mobile Lead (Android/iOS/Flutter)",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&h=256&q=80",
    bio: "Desarrollador mobile líder de aplicaciones híbridas y nativas. Experto en geolocalización eficiente en segundo plano, optimización de consumo de batería de GPS y WebRTC.",
    specialty: "Optimización de recursos móviles y mapas offline.",
    focus: "Diseño para conectividad inestable, almacenamiento local móvil y renderizado rápido en dispositivos de gama baja."
  },
  {
    id: "ux_ui_ds",
    name: "Clara Dupont",
    role: "Diseñadora UX/UI Senior",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&h=256&q=80",
    bio: "Diseñadora con experiencia en interfaces transaccionales para plataformas de movilidad y entrega. Creadora de sistemas de diseño corporativos modernos, limpios y accesibles.",
    specialty: "Sistemas de diseño, consistencia visual y ergonomía móvil.",
    focus: "Creación de layouts de alta densidad informativa, legibilidad y jerarquías visuales intuitivas."
  },
  {
    id: "ai_spec",
    name: "Dr. Hiroshi Tanaka",
    role: "Especialista en Inteligencia Artificial",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&h=256&q=80",
    bio: "Doctor en Machine Learning. Ex-investigador de DeepMind. Experto en procesamiento de lenguaje natural para moderación, y aprendizaje supervisado para predicción de tarifas óptimas.",
    specialty: "Modelos predictivos, sistemas de recomendación y NLP.",
    focus: "Algoritmos de matching, detección de comportamiento fraudulento de profesionales y asistencia inteligente en chat."
  },
  {
    id: "security_spec",
    name: "Nadia Al-Mutawa",
    role: "Especialista en Seguridad Informática",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&h=256&q=80",
    bio: "Especialista en ciberseguridad corporativa y cumplimiento. Experta en auditorías de penetración, encriptación militar de datos personales y prevención de ataques de denegación de servicio (DDoS).",
    specialty: "Protección de datos (GDPR/KYC) y encriptación robusta.",
    focus: "Estrategia de enmascaramiento de identidad, tokens seguros, autenticación multifactor (MFA) y cumplimiento regulatorio bancario."
  },
  {
    id: "db_spec",
    name: "Carlos Mendes",
    role: "Especialista en Bases de Datos",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80",
    bio: "Ingeniero principal de datos con enfoque en PostgreSQL de alto rendimiento, optimización de índices espaciales PostGIS y escalabilidad horizontal de bases relacionales y NoSQL.",
    specialty: "Indexación geoespacial, optimización de queries y sharding.",
    focus: "Esquema robusto de datos con consistencia ACID absoluta para transacciones financieras y wallets."
  },
  {
    id: "payment_spec",
    name: "Sarah Jenkins",
    role: "Especialista en Sistemas de Pago",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&h=256&q=80",
    bio: "Consultora experta en procesadores de pago globales y locales. Arquitecta de flujos de pago multi-moneda (Stripe Connect, PayPal Billing, dLocal y transferencias inmediatas de bajo costo).",
    specialty: "Depósitos en garantía (Escrow), split de pagos y prevención de contracargos.",
    focus: "Cumplimiento del estándar PCI-DSS, contabilidad de doble entrada en monedero digital (ledger) y conciliación automática bancaria."
  },
  {
    id: "devops_eng",
    name: "Sven Lindqvist",
    role: "Ingeniero DevOps Senior",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&h=256&q=80",
    bio: "Especialista en Kubernetes en Google Cloud e infraestructura automatizada como código con Terraform. Arquitecto de pipelines de entrega continua (CI/CD) con cero tiempo de inactividad.",
    specialty: "Infraestructura auto-escalable e infra-as-code.",
    focus: "Configuración de balanceadores de carga globales, monitorización de latencia en tiempo real y despliegue rápido."
  }
];

export const MODULES: Module[] = [
  {
    id: "modelo_negocio",
    title: "1. Modelo de Negocio",
    icon: "Briefcase",
    category: "Negocio",
    description: "Establece los pilares comerciales, la propuesta de valor y las reglas básicas de interacción entre el cliente y el profesional.",
    specialistIds: ["pm_uber", "payment_spec"],
    questions: [
      {
        id: "monetizacion",
        text: "¿Cuál será la estrategia de monetización principal de la plataforma?",
        description: "Elige cómo generará ingresos la empresa para asegurar rentabilidad y viabilidad.",
        options: [
          { value: "comision", label: "Comisión sobre el valor del servicio (Fee transaccional)", details: "La plataforma retiene un porcentaje (e.g. 10% a 15%) de cada transacción completada." },
          { value: "suscripcion", label: "Suscripción para Profesionales (SaaS)", details: "Los profesionales pagan una cuota fija mensual para cotizar y recibir solicitudes ilimitadas." },
          { value: "lead", label: "Pago por contacto/lead (Modelo Thumbtack)", details: "El profesional paga un costo bajo para poder enviar su cotización al cliente." },
          { value: "hibrido", label: "Modelo Híbrido (Suscripción + Comisión reducida)", details: "Mezcla de cuotas de acceso con comisiones pequeñas para reducir barreras de entrada." }
        ]
      },
      {
        id: "negociacion",
        text: "¿Cómo funcionará el mecanismo básico de negociación de precios?",
        description: "El núcleo del negocio. Cómo se definirá la tarifa final del servicio.",
        options: [
          { value: "oferta_contraoferta", label: "Subasta Abierta (Modelo InDrive)", details: "El cliente sugiere una tarifa base; los profesionales pueden aceptarla o enviar hasta 3 contraofertas dinámicas en tiempo real." },
          { value: "cotizacion_cerrada", label: "Cotización Privada de Profesional", details: "El cliente describe la tarea y los profesionales envían cotizaciones formales cerradas, sin contraofertas inmediatas." },
          { value: "tarifas_fijas", label: "Tarifas Fijas por Catálogo (Modelo TaskRabbit)", details: "El profesional tiene tarifas predefinidas por hora o por servicio estándar, y el cliente contrata directamente." }
        ]
      }
    ]
  },
  {
    id: "arquitectura",
    title: "2. Arquitectura General",
    icon: "Cpu",
    category: "Tecnología",
    description: "Diseña la base de ingeniería para soportar millones de conexiones en tiempo real sin interrupciones.",
    specialistIds: ["arch_sr", "devops_eng"],
    questions: [
      {
        id: "tipo_infraestructura",
        text: "¿Cuál es el enfoque inicial para la arquitectura del sistema backend?",
        description: "Balance de velocidad de desarrollo contra escalabilidad futura de millones de usuarios.",
        options: [
          { value: "monolito_modular", label: "Monolito Modular con Escalado de Contenedores", details: "Un único repositorio backend organizado con estricta separación de carpetas, empaquetado en contenedores de Cloud Run. Permite desarrollo veloz y migración simple a microservicios." },
          { value: "microservicios", label: "Arquitectura de Microservicios Desacoplados", details: "Servicios independientes (Auth, Geoloc, Pagos, Chat) en Kubernetes desde el inicio. Recomendado si cuentas con gran presupuesto de DevOps." }
        ]
      },
      {
        id: "comunicacion_tiempo_real",
        text: "¿Qué protocolo se utilizará para manejar los eventos en tiempo real?",
        description: "Crucial para la geolocalización de profesionales, el chat y la actualización de ofertas.",
        options: [
          { value: "websocket", label: "WebSockets bidireccionales persistentes", details: "Conexión continua idónea para chat, GPS activo e interacción de ofertas instantáneas." },
          { value: "sse", label: "Server-Sent Events (SSE) + HTTP POST", details: "Unidireccional del servidor al cliente. Excelente para actualizar mapas de ofertas con menor carga de servidor que WebSockets." },
          { value: "grpc", label: "gRPC Web", details: "Conexiones de baja latencia con serialización de datos muy rápida mediante Protocol Buffers." }
        ]
      }
    ]
  },
  {
    id: "roles_usuario",
    title: "3. Roles de Usuario",
    icon: "Users",
    category: "Negocio",
    description: "Determina los tipos de cuentas del sistema y cómo interactúan las empresas, contratistas e independientes.",
    specialistIds: ["pm_uber", "ux_ui_ds"],
    questions: [
      {
        id: "unificacion_perfiles",
        text: "¿Cómo se gestionará la identidad del cliente contra la del profesional?",
        description: "Define si un usuario requiere cuentas diferentes para contratar servicios y ofrecerlos.",
        options: [
          { value: "cuenta_unica", label: "Cuenta Unificada con Selector de Rol (Recomendado)", details: "Un solo registro de correo/teléfono. El usuario puede alternar instantáneamente entre 'Modo Cliente' y 'Modo Profesional' desde el menú lateral." },
          { value: "cuenta_separada", label: "Cuentas Completamente Separadas", details: "Plataformas o aplicaciones separadas por completo (e.g. App de Clientes vs App de Profesionales)." }
        ]
      },
      {
        id: "cuentas_empresa",
        text: "¿Se requiere soporte para Multi-perfiles y Roles Corporativos?",
        description: "Permite que empresas de servicios (e.g. agencias de limpieza) registren múltiples operarios de campo.",
        options: [
          { value: "no_b2b", label: "Solo Profesionales Independientes (Fase 1)", details: "Cada profesional es una sola persona física que ejecuta la tarea." },
          { value: "b2b_multi_seat", label: "Soporte Corporativo B2B (Multi-operario)", details: "Un perfil de empresa puede registrar una marca corporativa y crear sub-cuentas para empleados que realizan las tareas físicas bajo el mismo perfil fiscal." }
        ]
      }
    ]
  },
  {
    id: "flujos_completos",
    title: "4. Flujo Completo de Servicio",
    icon: "GitBranch",
    category: "Negocio",
    description: "Define paso a paso el ciclo de vida de un servicio, desde que el cliente lo solicita hasta que finaliza con éxito.",
    specialistIds: ["pm_uber", "ux_spec"],
    questions: [
      {
        id: "proceso_servicio",
        text: "¿Cuál es el flujo definitivo del ciclo de vida de una orden?",
        description: "Este flujo regirá los estados de la base de datos y las notificaciones push.",
        options: [
          { value: "escrow_flujo", label: "Flujo con Depósito en Garantía (Escrow Obligatorio)", details: "1. Solicitud -> 2. Ofertas de Profesionales -> 3. Acuerdo de Precio -> 4. Pago del Cliente a la Plataforma (Garantía) -> 5. Ejecución del Servicio -> 6. Cliente confirma -> 7. Pago liberado al Profesional." },
          { value: "pago_directo", label: "Flujo con Pago Directo al Finalizar", details: "1. Solicitud -> 2. Acuerdo de Precio -> 3. Ejecución -> 4. Pago directo del cliente al profesional mediante efectivo o pasarela externa sin intermediación." }
        ]
      }
    ]
  },
  {
    id: "base_datos",
    title: "5. Base de Datos",
    icon: "Database",
    category: "Tecnología",
    description: "Especifica la tecnología de almacenamiento para garantizar velocidad geoespacial y consistencia transaccional.",
    specialistIds: ["db_spec", "arch_sr"],
    questions: [
      {
        id: "tipo_db",
        text: "¿Qué motor de base de datos principal se utilizará?",
        description: "El pilar de los datos transaccionales, las cuentas y las auditorías de wallets.",
        options: [
          { value: "postgres_postgis", label: "PostgreSQL con PostGIS (Relacional)", details: "Ofrece transaccionalidad ACID perfecta, soporte nativo de extensiones geoespaciales avanzadas (PostGIS) y búsquedas de radio eficientes." },
          { value: "spanner", label: "Google Cloud Spanner (Escala Global)", details: "Base de datos relacional con escalabilidad horizontal infinita para plataformas multi-país de millones de usuarios." },
          { value: "hibrido_nosql", label: "Esquema Híbrido: Postgres + MongoDB/Firestore", details: "Postgres para transacciones financieras y wallets; NoSQL para documentos JSON de categorías de servicios hiper-flexibles." }
        ]
      },
      {
        id: "geo_indexing",
        text: "¿Cómo se estructurará la indexación de la geolocalización?",
        description: "Crucial para consultar profesionales disponibles en un radio específico sin saturar el CPU.",
        options: [
          { value: "geohash_redis", label: "Redis Geospatial para Tracking en Vivo", details: "Mantiene las coordenadas dinámicas de profesionales en caché en memoria ram con comandos GEORADIUS de respuesta sub-milisegundo." },
          { value: "postgres_spatial_idx", label: "PostGIS con Índices R-Tree / GiST", details: "Consulta directa en base de datos persistente mediante geometrías, ideal para búsquedas complejas con filtros de reputación." }
        ]
      }
    ]
  },
  {
    id: "seguridad",
    title: "6. Seguridad y KYC",
    icon: "ShieldAlert",
    category: "Seguridad y Pagos",
    description: "Determina cómo proteger la identidad de los usuarios, prevenir el fraude y verificar antecedentes de los profesionales.",
    specialistIds: ["security_spec", "pm_uber"],
    questions: [
      {
        id: "verificacion_kyc",
        text: "¿Qué nivel de verificación de identidad se exigirá a los profesionales?",
        description: "El fraude y los delitos físicos son riesgos críticos en contratación de servicios del hogar.",
        options: [
          { value: "verificacion_biometrica", label: "Verificación Biométrica y Documental Automatizada (Onfido/Stripe)", details: "El profesional debe escanear su documento de identidad gubernamental y hacerse una selfie biométrica con detección de vida para poder recibir ofertas." },
          { value: "verificacion_manual", label: "Carga de Documentos y Aprobación Manual", details: "El profesional sube PDF de antecedentes penales, cédula y comprobantes. El equipo administrativo revisa y aprueba uno por uno en consola." },
          { value: "basico", label: "Registro por Teléfono / SMS con Verificación Social", details: "Registro rápido. La confianza se delega puramente al sistema de reseñas y reputación de la comunidad." }
        ]
      },
      {
        id: "enmascaramiento",
        text: "¿Cómo se gestionará la privacidad de datos de contacto personales?",
        description: "Evita que profesionales contacten a clientes fuera de la app de forma indebida o insegura.",
        options: [
          { value: "enmascaramiento_completo", label: "Enmascaramiento de Teléfonos y Chat Encriptado (Twilio / Firebase)", details: "Las llamadas VoIP pasan por la app y los chats ocultan correos y teléfonos. Los datos reales se resguardan celosamente." },
          { value: "libertad_contacto", label: "Intercambio libre de datos de contacto tras aceptar oferta", details: "Una vez cerrada la negociación de precio, la app muestra el número de WhatsApp y teléfono directo de forma libre." }
        ]
      }
    ]
  },
  {
    id: "sistema_pagos",
    title: "7. Sistema de Pagos e Impuestos",
    icon: "CreditCard",
    category: "Seguridad y Pagos",
    description: "Define el flujo del dinero, pasarelas compatibles y retenciones tributarias automáticas en múltiples países.",
    specialistIds: ["payment_spec", "security_spec"],
    questions: [
      {
        id: "pasarela_pago",
        text: "¿Qué procesador de pago integrado se utilizará?",
        description: "Define la infraestructura de procesamiento y soporte de monedas nacionales.",
        options: [
          { value: "stripe_connect", label: "Stripe Connect (Custom / Express)", details: "Soporte perfecto de Wallet, división automática de comisiones y transferencias bancarias nativas a profesionales en segundos." },
          { value: "dlocal", label: "dLocal API (Especialista en Mercados Emergentes)", details: "Permite cobros locales con tarjetas nacionales, transferencias, efectivo y wallets de pago en toda América Latina, Asia y África." },
          { value: "procesadores_multiples", label: "Multi-pasarela Integrada (Stripe + MercadoPago + PayPal)", details: "Máxima conversión adaptándose a la pasarela dominante de cada país o mercado local." }
        ]
      },
      {
        id: "retencion_impuestos",
        text: "¿Cómo se manejará la retención fiscal y el IVA?",
        description: "El cumplimiento de normativas locales para plataformas de economía colaborativa.",
        options: [
          { value: "automatico_tax", label: "Cálculo y Retención Fiscal Automatizada (Stripe Tax / TaxJar)", details: "La plataforma calcula automáticamente el impuesto según la ubicación geográfica del servicio, emite factura y retiene el impuesto para el fisco local." },
          { value: "responsabilidad_profesional", label: "El profesional emite factura directamente", details: "La plataforma solo factura su comisión por servicio. La declaración de impuestos de la transacción principal es responsabilidad exclusiva del profesional." }
        ]
      }
    ]
  },
  {
    id: "wallet",
    title: "8. Wallet y Monedero Interno",
    icon: "Wallet",
    category: "Seguridad y Pagos",
    description: "Diseña el balance virtual para profesionales y clientes, con soporte para reembolsos, depósitos y retiros rápidos.",
    specialistIds: ["payment_spec", "arch_sr"],
    questions: [
      {
        id: "esquema_wallet",
        text: "¿Cómo se estructurará el monedero digital (Wallet)?",
        description: "Evita inconsistencias de saldos (doble contabilidad en base de datos).",
        options: [
          { value: "ledger_doble_entrada", label: "Libro Mayor de Doble Entrada (Ledger ACID)", details: "Cada transacción tiene un origen y un destino. Ningún saldo se actualiza con un simple 'UPDATE balance SET...'. Garantiza auditorías impecables y previene hackeos de saldos virtuales." },
          { value: "saldo_virtual_basico", label: "Saldo en Tabla de Perfil con Historial", details: "Una columna 'balance' en la tabla 'user_profiles' asociada a un registro de movimientos transaccionales. Más rápido de implementar, menor rigurosidad financiera." }
        ]
      },
      {
        id: "metodos_retiro",
        text: "¿Cuáles serán las condiciones de retiro (Payouts) de fondos para los profesionales?",
        description: "Define el tiempo que toma el dinero en llegar a la cuenta bancaria del profesional.",
        options: [
          { value: "retiro_instantaneo", label: "Retiro Express/Instantáneo (Fee adicional)", details: "El profesional puede retirar su dinero acumulado inmediatamente las 24/7 con una comisión extra del 1.5%." },
          { value: "retiro_programado", label: "Transferencia Programada Semanal sin costo", details: "Los fondos acumulados se transfieren automáticamente todos los viernes a la cuenta bancaria configurada del profesional." }
        ]
      }
    ]
  },
  {
    id: "negociacion_precios",
    title: "9. Motor de Negociación Directa",
    icon: "Scale",
    category: "Negocio",
    description: "Establece el corazón del producto: límites, contraofertas y el algoritmo de ajuste de precios dinámicos.",
    specialistIds: ["pm_uber", "ux_spec", "ai_spec"],
    questions: [
      {
        id: "limites_negociacion",
        text: "¿Existirán límites o bandas de precio en las ofertas y contraofertas?",
        description: "Previene ofertas ridículamente bajas (dumping) o fraudes por cobros excesivos.",
        options: [
          { value: "bandas_inteligentes", label: "Bandas de Negociación Sugeridas por IA", details: "El sistema analiza el servicio solicitado y sugiere un rango (e.g. $40 - $60). Los profesionales solo pueden contraofertar dentro de este rango +/- 30%." },
          { value: "mercado_libre", label: "Mercado Totalmente Libre y sin restricciones", details: "Cualquier profesional puede pedir lo que desee y cualquier cliente puede ofrecer desde $1. El sistema de selección de mercado autorregula los precios." }
        ]
      },
      {
        id: "visibilidad_ofertas",
        text: "¿Pueden los profesionales ver las cotizaciones y ofertas de sus competidores?",
        description: "Define si la subasta es abierta o ciega.",
        options: [
          { value: "subasta_ciega", label: "Subasta Ciega (Privacidad Total)", details: "Un profesional no sabe cuánto están pidiendo los otros competidores por el mismo servicio. Evita una carrera destructiva hacia el precio más bajo." },
          { value: "subasta_transparente", label: "Subasta Semi-Transparente", details: "Los profesionales pueden ver el promedio de las ofertas de la competencia o el número total de competidores postulados, sin ver los nombres." }
        ]
      }
    ]
  },
  {
    id: "gps_geolocalizacion",
    title: "10. GPS y Geolocalización en Tiempo Real",
    icon: "Navigation",
    category: "Tecnología",
    description: "Asegura el rastreo preciso del profesional mientras se desplaza al domicilio del cliente.",
    specialistIds: ["mobile_eng", "db_spec"],
    questions: [
      {
        id: "estrategia_tracking",
        text: "¿Cuál será la frecuencia y método de rastreo del profesional en ruta?",
        description: "Optimiza la precisión del mapa contra el consumo crítico de la batería del celular del profesional.",
        options: [
          { value: "tracking_distancia", label: "Filtro de Distancia Adaptativa (Ahorro de Batería)", details: "Actualiza la posición GPS cada 20 metros de movimiento o cada 30 segundos de inactividad. Detiene el tracking por completo si el profesional no se está moviendo." },
          { value: "tracking_continuo", label: "Actualización Continua Constante (Alta Precisión)", details: "Envía coordenadas por WebSocket de forma estricta cada 5-10 segundos en ruta activa, similar a Uber Rides." }
        ]
      },
      {
        id: "geofencing",
        text: "¿Se requiere un sistema de Geocercas (Geofencing)?",
        description: "Dispara eventos automáticos en base a la cercanía física.",
        options: [
          { value: "geofence_activo", label: "Geocercas de Arribo Automático (Recomendado)", details: "Cuando el profesional se encuentra a menos de 50 metros de la ubicación del cliente, la app notifica automáticamente al cliente: 'Tu profesional ha llegado al domicilio' sin que nadie presione un botón." },
          { value: "no_geofence", label: "Estados manuales por botón", details: "El profesional debe presionar manualmente un botón de 'Llegué al domicilio' en la aplicación." }
        ]
      }
    ]
  },
  {
    id: "chat_tiempo_real",
    title: "11. Chat en Tiempo Real",
    icon: "MessageSquare",
    category: "Tecnología",
    description: "Configura canales bidireccionales rápidos para coordinar detalles técnicos antes y durante el servicio.",
    specialistIds: ["backend_eng", "ux_ui_ds"],
    questions: [
      {
        id: "arquitectura_chat",
        text: "¿Cuál será el backend tecnológico para el servicio de mensajería?",
        description: "Establece los requerimientos de sincronización, envío de fotos, historial y estados de lectura.",
        options: [
          { value: "chat_firebase", label: "Firebase Cloud Firestore / Realtime Database", details: "Conexión en tiempo real nativa out-of-the-box, escalable para millones de usuarios, con caché sin conexión y gestión de persistencia automática." },
          { value: "socket_io_redis", label: "Node.js con Sockets propios e indexación en Redis", details: "Control total del código de mensajería. Requiere orquestar persistencia propia en bases de datos relacionales y escalado de WebSockets en clúster." }
        ]
      },
      {
        id: "moderacion_chat",
        text: "¿Se implementará censura y moderación automática en el chat?",
        description: "Evita que envíen datos de pago externos o lenguaje abusivo.",
        options: [
          { value: "moderacion_ia_nlp", label: "Filtro Inteligente con IA en Tiempo Real", details: "Un modelo local rápido o servicio de IA analiza los mensajes. Bloquea de inmediato el envío de números de teléfono, correos y palabras clave de pago externo ANTES de entregarlos." },
          { value: "regex_basico", label: "Moderación por Filtro Regex tradicional", details: "Censura simple de enlaces web y palabras obscenas usando expresiones regulares estándar en el backend." }
        ]
      }
    ]
  },
  {
    id: "reputacion_disputas",
    title: "12. Reputación y Disputas",
    icon: "Star",
    category: "Operaciones y Crecimiento",
    description: "Garantiza la confianza del ecosistema mediante algoritmos de reseñas justos y un tribunal de soporte eficiente.",
    specialistIds: ["pm_uber", "security_spec", "ux_spec"],
    questions: [
      {
        id: "algoritmo_reputacion",
        text: "¿Cómo se calculará el puntaje (Scoring) de los profesionales?",
        description: "La forma de ordenar la lista de ofertas recibidas por el cliente.",
        options: [
          { value: "reputacion_ponderada", label: "Scoring Ponderado Multidimensional", details: "La reputación se compone de: promedio de estrellas (40%), tasa de finalización de trabajos aceptados (30%), velocidad de respuesta (20%) y volumen total de servicios (10%)." },
          { value: "promedio_estrellas_simple", label: "Promedio de Estrellas Simple", details: "Cálculo estándar (Total estrellas / número de reseñas). Es fácil de entender por el usuario pero propenso a manipulación." }
        ]
      },
      {
        id: "resolucion_disputas",
        text: "¿Cuál es el proceso y recopilación de evidencias en disputas de servicios fallidos?",
        description: "Cómo actúa la plataforma ante quejas de daños o trabajos no realizados.",
        options: [
          { value: "auditoria_evidencia", label: "Auditoría de Conversaciones y Multimedia", details: "Se congela el pago en escrow. El mediador humano tiene acceso al historial de chat completo, fotos de evidencia antes/después subidas al chat obligatorio, y coordenadas GPS de visita." },
          { value: "reembolso_rapido", label: "Reembolso Automatizado basado en scoring previo", details: "Si el monto es bajo y el cliente tiene excelente reputación, se emite un reembolso automático en créditos virtuales para mitigar costos operativos de soporte." }
        ]
      }
    ]
  },
  {
    id: "inteligencia_artificial",
    title: "13. Especialidad de IA y Automatización",
    icon: "Sparkles",
    category: "Tecnología",
    description: "Saca provecho de los modelos Gemini para moderación visual, estimación de precios y coincidencia predictiva.",
    specialistIds: ["ai_spec", "arch_sr"],
    questions: [
      {
        id: "ia_matching",
        text: "¿Dónde aportará el mayor valor el motor de IA en el MVP?",
        description: "Determina cómo integrar los modelos generativos e interactivos en el sistema.",
        options: [
          { value: "ia_matching_precios", label: "Sugerencia Inteligente de Precios y Clasificación de Tareas", details: "Utiliza Gemini en el backend para predecir precios base de ofertas según la descripción escrita por el cliente y categorizar automáticamente la tarea." },
          { value: "ia_moderacion_imagenes", label: "Moderación de Fotos de Identidad, Trabajos y Perfiles (Visión por Computadora)", details: "Auditoría instantánea de imágenes subidas para evitar desnudos, contenido peligroso, o fotos de trabajos plagiados en los portafolios." }
        ]
      }
    ]
  },
  {
    id: "escalabilidad_internacional",
    title: "14. Escalabilidad e Internacionalización",
    icon: "Globe",
    category: "Operaciones y Crecimiento",
    description: "Prepara la plataforma para operar en decenas de divisas, zonas horarias e idiomas con alta disponibilidad global.",
    specialistIds: ["devops_eng", "pm_uber"],
    questions: [
      {
        id: "arquitectura_escalabilidad",
        text: "¿Cuál será la estrategia para manejar picos masivos de tráfico?",
        description: "Garantiza tiempos de respuesta rápidos bajo condiciones de uso extremo.",
        options: [
          { value: "auto_scaling_k8s", label: "Auto-escalado Horizontal de Contenedores y CDN Global", details: "Despliegue distribuido de APIs geográficamente cercanas al usuario, uso intensivo de Redis para almacenamiento en caché de perfiles, y CDN para recursos estáticos." },
          { value: "read_replicas_db", label: "Réplicas de Lectura en Base de Datos y Colas de Tareas", details: "Toda consulta de lectura de profesionales se envía a réplicas dedicadas para liberar la base de datos principal de escrituras y transacciones." }
        ]
      }
    ]
  }
];

// INITIAL MARKETPLACE DATA
export const INITIAL_CATEGORIES = [
  { id: "plomeria", name: "Plomería y Fugas", icon: "Wrench", description: "Reparación de cañerías, destapes y fugas de agua urgente", averagePrice: "RD$ 2,000 - RD$ 3,600", countActive: 14 },
  { id: "cerrajeria", name: "Cerrajería 24/7", icon: "Key", description: "Apertura de puertas, cambio de combinaciones y cerrojos", averagePrice: "RD$ 1,500 - RD$ 3,000", countActive: 9 },
  { id: "electricidad", name: "Electricidad y Tableros", icon: "Zap", description: "Cortocircuitos, cableados, luminarias y tableros eléctricos", averagePrice: "RD$ 2,400 - RD$ 4,500", countActive: 11 },
  { id: "mecanica", name: "Mecánica y Auxilio", icon: "Car", description: "Auxilio mecánico, cambio de batería, puentes y escaneo", averagePrice: "RD$ 3,000 - RD$ 7,200", countActive: 8 },
  { id: "limpieza", name: "Limpieza y Hogar", icon: "Sparkles", description: "Limpieza de pisos, muebles, alfombras y sanitización", averagePrice: "RD$ 1,800 - RD$ 3,600", countActive: 18 },
  { id: "fletes", name: "Fletes y Mudanzas", icon: "Truck", description: "Transporte de cargas, muebles, cajas y mudanzas locales", averagePrice: "RD$ 3,600 - RD$ 12,000", countActive: 7 },
  { id: "tecnologia", name: "Tecnología y Wi-Fi", icon: "Wifi", description: "Reparación de PC, redes Wi-Fi, cámaras e impresoras", averagePrice: "RD$ 2,100 - RD$ 4,800", countActive: 6 },
  { id: "climatizacion", name: "Aire Acondicionado", icon: "Wind", description: "Instalación, recarga de gas y mantenimiento de A/C", averagePrice: "RD$ 3,000 - RD$ 6,500", countActive: 12 }
];

export const INITIAL_REQUESTS = [
  {
    id: "req_01",
    title: "Fuga de agua urgente debajo del lavaplatos en cocina",
    category: "plomeria",
    description: "Tengo una filtración constante en la tubería flexible de PVC debajo del fregadero de la cocina. Se llena el balde en 30 minutos. Necesito un plomero capacitado con repuestos con urgencia.",
    address: "Av. Winston Churchill #402, Piantini, Santo Domingo",
    urgency: "Inmediata" as const,
    targetPrice: 2700,
    clientName: "Valeria Mendoza",
    clientAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
    clientPhone: "+1 809-819-3041",
    createdAt: "Hace 12 minutos",
    status: "negotiating" as const,
    photoUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80",
    locationCoords: { lat: 18.4861, lng: -69.9312 },
    proCurrentCoords: { lat: 18.4820, lng: -69.9350, speedKmH: 22, distanceKm: 1.2 },
    releaseCode: "9482",
    escrowLockedAmount: 2700
  },
  {
    id: "req_02",
    title: "Apertura de puerta principal (Chapa trabada con llave dentro)",
    category: "cerrajeria",
    description: "Salí a tirar la basura y la puerta blindada se cerró de golpe. La llave quedó colocada del lado de adentro. Necesito cerrajero urgente que pueda abrir sin romper el marco.",
    address: "Av. Abraham Lincoln #1288, Naco, Santo Domingo",
    urgency: "Inmediata" as const,
    targetPrice: 2100,
    clientName: "Roberto Gomez",
    clientAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80",
    clientPhone: "+1 829-491-2001",
    createdAt: "Hace 25 minutos",
    status: "open" as const,
    photoUrl: "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80",
    locationCoords: { lat: 18.4750, lng: -69.9280 }
  },
  {
    id: "req_03",
    title: "Instalación de 4 plafones LED y breakers en tablero principal",
    category: "electricidad",
    description: "Quiero reemplazar el tablero monofásico antiguo con breakers termomagnéticos modernos de 20A e instalar 4 luces embutidas en el techo de sheetrock de la sala.",
    address: "Calle Polanco 88, Bella Vista, Santo Domingo",
    urgency: "Agendada" as const,
    targetPrice: 4200,
    clientName: "Camila Torres",
    clientAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&h=256&q=80",
    clientPhone: "+1 849-920-1123",
    createdAt: "Hace 1 hora",
    status: "open" as const,
    locationCoords: { lat: 18.4550, lng: -69.9500 }
  }
];

export const INITIAL_OFFERS = [
  {
    id: "off_101",
    requestId: "req_01",
    proId: "pro_santiago",
    proName: "Ing. Esteban Morales",
    proAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80",
    proRole: "Plomero Sanitarista Matriculado",
    proRating: 4.95,
    proReviews: 142,
    badges: ["KYC Biométrico", "Seguro RD$ 500,000", "Top Rated 2026"],
    price: 2700,
    estimatedArrivalMin: 12,
    message: "¡Hola Valeria! Estoy a solo 1.2 km de tu domicilio en Piantini con repuestos flexibles de bronce de alta durabilidad y sellador de teflón industrial. Llego en 12 minutos.",
    status: "pending" as const,
    createdAt: "Hace 5 minutos"
  },
  {
    id: "off_102",
    requestId: "req_01",
    proId: "pro_mario",
    proName: "Mario 'El Maestro' Ramos",
    proAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&h=256&q=80",
    proRole: "Técnico en Redes de Agua",
    proRating: 4.88,
    proReviews: 89,
    badges: ["KYC Biométrico", "Garantía Directo RD$ 50k"],
    price: 2400,
    estimatedArrivalMin: 25,
    message: "Puedo ofrecerte tarifa reducida de RD$ 2,400 si aguardas 25 minutos mientras concluyo un servicio en la zona.",
    status: "pending" as const,
    createdAt: "Hace 8 minutos"
  },
  {
    id: "off_103",
    requestId: "req_02",
    proId: "pro_lucas",
    proName: "Lucas Cerrajería Express RD",
    proAvatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&h=256&q=80",
    proRole: "Especialista en Chapas de Alta Seguridad",
    proRating: 4.98,
    proReviews: 210,
    badges: ["KYC Biométrico", "Insignia 24/7", "Top Rated"],
    price: 2100,
    estimatedArrivalMin: 10,
    message: "Cuento con instrumental de ganzúa electromagnética no destructiva. Abro tu puerta en menos de 3 minutos sin dañar cilindro.",
    status: "pending" as const,
    createdAt: "Hace 15 minutos"
  }
];

export const INITIAL_TRANSACTIONS = [
  {
    id: "tx_01",
    type: "escrow_hold" as const,
    amount: 2700.00,
    title: "Retención Escrow: Fuga de agua urgente en cocina",
    date: "14 Jul 2026, 08:30 AM",
    status: "completed" as const,
    referenceId: "req_01"
  },
  {
    id: "tx_02",
    type: "income" as const,
    amount: 7200.00,
    title: "Pago liberado: Mantenimiento de A/C Piantini",
    date: "12 Jul 2026, 04:15 PM",
    status: "completed" as const
  },
  {
    id: "tx_03",
    type: "payout" as const,
    amount: 6000.00,
    title: "Retiro a Cuenta Bancaria (Banreservas / Popular ****",
    date: "10 Jul 2026, 11:00 AM",
    status: "completed" as const
  }
];

