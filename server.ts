import express, { Request, Response, NextFunction } from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { jsonBody } from "./src/server/middleware/jsonBody.ts";
import { db } from "./src/server/db/index.ts";
import { authRouter } from "./src/server/routes/authRoutes.ts";
import { marketplaceRouter } from "./src/server/routes/marketplaceRoutes.ts";
import { radarRouter } from "./src/server/routes/radarRoutes.ts";
import { chatRouter } from "./src/server/routes/chatRoutes.ts";
import { walletRouter } from "./src/server/routes/walletRoutes.ts";
import { adminRouter } from "./src/server/routes/adminRoutes.ts";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0";
const isProd = process.env.NODE_ENV === "production";

app.disable("x-powered-by");
// Trust forwarded client IPs only when deployment explicitly declares its proxy topology.
// A public-facing server must not accept arbitrary X-Forwarded-For values.
const trustedProxyHops = Number(process.env.TRUST_PROXY_HOPS || "0");
if (!Number.isInteger(trustedProxyHops) || trustedProxyHops < 0 || trustedProxyHops > 5) {
  throw new Error("TRUST_PROXY_HOPS debe ser un entero entre 0 y 5");
}
app.set("trust proxy", trustedProxyHops);

// Production Security Headers & HTTPS Enforcement
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(self), camera=(self), microphone=(self)");
  if (isProd) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

// Restrictive CORS Policy
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin) {
    const isLocalOrigin =
      origin.startsWith("http://localhost") ||
      origin.startsWith("http://127.0.0.1") ||
      origin === "capacitor://localhost" ||
      origin === "https://localhost";

    const hostHeader = req.headers.host;
    const isSameHost = hostHeader && (origin === `https://${hostHeader}` || origin === `http://${hostHeader}`);

    if (allowedOrigins.includes(origin) || isSameHost || (!isProd && isLocalOrigin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,x-webhook-signature");
    } else if (isProd && allowedOrigins.length > 0 && req.path.startsWith("/api/")) {
      res.status(403).json({ error: "Origen no autorizado por política CORS de Diclik.com" });
      return;
    }
  }

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

// Middleware to parse JSON bodies
app.use(jsonBody);

// Simple Rate Limiter for Gemini AI endpoints
const aiRateLimitStore = new Map<string, { count: number; resetAt: number }>();
function rateLimitGemini(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const entry = aiRateLimitStore.get(ip);
  if (!entry || entry.resetAt <= now) {
    aiRateLimitStore.set(ip, { count: 1, resetAt: now + 60_000 });
    next();
    return;
  }
  if (entry.count >= 25) {
    res.status(429).json({ error: "Límite de consultas al asistente alcanzado. Espera un minuto." });
    return;
  }
  entry.count += 1;
  next();
}

// Health Check Endpoint
app.get("/api/v1/health", async (_req: Request, res: Response) => {
  try {
    await db.query("SELECT 1 as ok;");
    res.json({
      status: "ok",
      service: "diclik-api",
      brand: "Diclik.com",
      database: "connected",
      timestamp: new Date().toISOString()
    });
  } catch {
    res.status(503).json({ status: "degraded", service: "diclik-api", database: "error" });
  }
});

// Enterprise REST API v1 Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/radar", radarRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/wallet", walletRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1", marketplaceRouter);

// Initialize Gemini SDK cleanly
const hasApiKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0;
const ai = hasApiKey
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "diclik-api-gateway",
        },
      },
    })
  : null;

function getFallbackSpecialistResponse(specialistId: string, message: string): string {
  const msgLower = message.toLowerCase();

  if (specialistId === "pm_uber") {
    if (msgLower.includes("comision") || msgLower.includes("salten") || msgLower.includes("evitar") || msgLower.includes("desintermediacion")) {
      return `### Propuesta de Santiago Rossi para Evitar la Desintermediación en Diclik.com:
      
1. **Comisión Invertida (Cashback de Garantía):** Reducimos la comisión del 15% al 8% si el pago se mantiene dentro de la app, y devolvemos un 2% al cliente en saldo para su siguiente servicio.
2. **Seguro de Responsabilidad Civil Gratis:** Solo los servicios pagados a través de la plataforma cuentan con cobertura contra daños materiales en el hogar de hasta $5,000 USD.
3. **Puntaje de Reputación Acelerado:** Completar transacciones dentro de Diclik.com multiplica por 2x el puntaje para subir en el ranking de búsquedas.`;
    }
    return `### Estrategia Corporativa de Crecimiento (Santiago Rossi):
    
Como PM ex-Uber, entiendo perfectamente la fricción de los marketplaces locales. Para el lanzamiento de **Diclik.com**, propongo:
- **Enfoque de Liquidez Local:** Concentrar la inversión en una sola categoría (ej: plomeros y electricistas) en una zona geográfica de 5km de radio.
- **Incentivos Cruzados:** Ofrecer un bono garantizado a los primeros 100 profesionales verificados por completar sus primeros 5 servicios sin incidentes.`;
  }

  if (specialistId === "arch_sr") {
    if (msgLower.includes("microservicio") || msgLower.includes("monolito")) {
      return `### Arquitectura Evolutiva para Diclik.com (Elena Rostova):
      
1. **Monolito Modular Inicial:** Módulos estructurados (\`auth\`, \`payments\`, \`matching\`, \`tracking\`) con migraciones versionadas en PostgreSQL.
2. **Despliegue en Cloud Run:** Escala contenedores de cero a miles de peticiones por segundo sin complejidad de Kubernetes.`;
    }
    return `### Propuesta de Infraestructura Asíncrona (Elena Rostova):
    
Para soportar millones de ofertas simultáneas y geolocalizaciones GPS continuas en Diclik.com:
- **Base de Datos Desacoplada:** PostgreSQL ACID para transacciones y estados definitivos de contratos y Escrow.
- **Workers en segundo plano:** Notificaciones push e integraciones KYC asíncronas fuera del hilo HTTP principal.`;
  }

  if (specialistId === "backend_eng") {
    return `### Solución de Sockets de Alto Rendimiento (Marcus Vance):
    
Para la mensajería y la subasta interactiva en tiempo real de **Diclik.com**:
- **WebSocket Gateway + HTTP Polling:** Sincronización de ofertas con fallback automático para conexiones móviles de baja señal.`;
  }

  if (specialistId === "mobile_eng") {
    return `### Ingeniería Móvil Android y Optimización (Ji-Min Park):
    
En dispositivos Android para **Diclik.com**:
- **GPS Inteligente:** Alta precisión activada únicamente durante traslados activos.
- **Persistencia Resiliente:** Reconexión automática ante cambios entre Wi-Fi y red celular.`;
  }

  if (specialistId === "ux_ui_ds") {
    return `### Sistema de Diseño y Usabilidad sin Fricciones (Clara Dupont):
    
Mi enfoque para la experiencia de usuario en **Diclik.com** (*Un clic, miles de soluciones*):
- **Selector de Rol Unificado:** Cambio instantáneo entre Cliente, Técnico y Profesional.
- **Fichas de Ofertas Limpias:** Precios, distancia y reputación claros sin sobrecarga cognitiva.`;
  }

  if (specialistId === "ai_spec") {
    return `### Inteligencia Artificial Aplicada a Negociación (Dr. Hiroshi Tanaka):
    
Clasificación semántica automática de solicitudes en Diclik.com y verificación asistida de evidencias.`;
  }

  if (specialistId === "security_spec") {
    return `### Seguridad Corporativa y KYC (Nadia Al-Mutawa):
    
Verificación biométrica obligatoria, enmascaramiento de teléfonos privados antes de cerrar contrato y protección Escrow OTP.`;
  }

  if (specialistId === "db_spec") {
    return `### Estructura de Datos Geoespacial (Carlos Mendes):
    
PostgreSQL ACID para integridad financiera del libro mayor, índices geoespaciales y bloqueos atómicos contra doble contratación.`;
  }

  if (specialistId === "payment_spec") {
    return `### Arquitectura de Wallet y Flujo Escrow (Sarah Jenkins):
    
Depósitos en Garantía (Escrow), webhooks autenticados por firma HMAC-SHA256 e idempotencia estricta por clave única.`;
  }

  if (specialistId === "devops_eng") {
    return `### DevOps e Infraestructura Elástica (Sven Lindqvist):
    
Despliegue en Google Cloud Run con PostgreSQL administrado, copias de seguridad automatizadas y CI/CD con pruebas obligatorias.`;
  }

  return `### Sugerencia Estratégica General:
  
Para la plataforma **Diclik.com** (*Un clic, miles de soluciones*), la clave del éxito comercial reside en mantener la simplicidad del flujo transaccional, pagos protegidos por Escrow y una validación estricta de identidad.`;
}

function getFallbackWorkshopSpec(moduleTitle: string, moduleKey: string, questions: any[], answers: any[]): string {
  let spec = `## ESPECIFICACIÓN TÉCNICA Y DE PRODUCTO: ${moduleTitle.toUpperCase()}\n\n`;
  spec += `### 📋 1. Resumen Ejecutivo y Decisiones Clave\n`;
  spec += `Este capítulo consolida los requerimientos y definiciones estratégicas para el módulo de **${moduleTitle}** en la plataforma **Diclik.com**.\n\n`;

  spec += `#### Decisiones Tomadas:\n`;
  Object.entries(answers || {}).forEach(([qKey, val]) => {
    const questionText = questions?.find((q: any) => q.id === qKey)?.text || qKey;
    spec += `- **${questionText}**:\n  *Decisión adoptada:* \`${val}\`\n\n`;
  });

  spec += `### 🚀 2. Especificación Técnica Detallada\n`;
  spec += `Implementación del módulo **${moduleKey}** bajo arquitectura modular, ACID en PostgreSQL y controles de seguridad de producción.`;
  return spec;
}

// AI Workshop Synthesis Route
app.post("/api/gemini/workshop", rateLimitGemini, async (req, res) => {
  const { moduleKey, moduleTitle, questions, answers, previousSpecs } = req.body;
  try {
    if (!moduleTitle) {
      return res.status(400).json({ error: "Module title is required" });
    }

    if (!hasApiKey || !ai) {
      const text = getFallbackWorkshopSpec(moduleTitle, moduleKey, questions, answers);
      return res.json({ text });
    }

    const answersFormatted = Object.entries(answers || {})
      .map(([qKey, answer]) => {
        const questionText = questions?.find((q: any) => q.id === qKey)?.text || qKey;
        return `### Pregunta: ${questionText}\n**Respuesta del Usuario:** ${answer}\n`;
      })
      .join("\n");

    const prompt = `
Actúa como el equipo de arquitectura e ingeniería senior para diseñar la plataforma "Diclik.com" ("Un clic, miles de soluciones").
"Diclik.com" es una plataforma tecnológica comercial para contratar servicios profesionales, técnicos y freelancers con negociación directa de precios y custodia Escrow.

Módulo actual: ${moduleTitle} (ID: ${moduleKey})

Preguntas y respuestas:
${answersFormatted}

Contexto previo:
${JSON.stringify(previousSpecs || {}, null, 2)}

Redacta la especificación definitiva en español en formato Markdown estructurado.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: { temperature: 0.2 }
    });

    res.json({ text: response.text });
  } catch {
    const text = getFallbackWorkshopSpec(moduleTitle, moduleKey, questions, answers);
    res.json({ text });
  }
});

// Specialist Boardroom Chat Route
app.post("/api/gemini/chat", rateLimitGemini, async (req, res) => {
  const { specialistId, specialistName, specialistRole, specialistBio, specialistFocus, message, chatHistory } = req.body;
  try {
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    if (!hasApiKey || !ai) {
      const text = getFallbackSpecialistResponse(specialistId, message);
      return res.json({ text });
    }

    const historyFormatted = (chatHistory || [])
      .map((msg: any) => `${msg.sender === "user" ? "Usuario" : specialistName}: ${msg.text}`)
      .join("\n");

    const prompt = `
Eres ${specialistName}, actuando en tu rol de ${specialistRole} para diseñar la plataforma "Diclik.com" ("Un clic, miles de soluciones").
Perfil: ${specialistBio}
Enfoque: ${specialistFocus}

Historial previo:
${historyFormatted}

Consulta actual:
"${message}"

Responde de manera experta en español con recomendaciones prácticas y estructuradas.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: { temperature: 0.7 }
    });

    res.json({ text: response.text });
  } catch {
    const text = getFallbackSpecialistResponse(specialistId, message);
    res.json({ text });
  }
});

// Global API Error Handler (Never leak stack traces)
app.use("/api", (err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[API Unhandled Error]:", err?.message || err);
  if (!res.headersSent) {
    res.status(err?.status || 500).json({ error: "Error interno del servidor Diclik.com" });
  }
});

// Mount Vite middleware or serve static dist folder
async function configureServer() {
  await db.init();
  console.log("PostgreSQL database and versioned migrations ready.");

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Ruta de API no encontrada" });
  });

  if (!isProd) {
    console.log("Configuring Diclik.com server in development mode with Vite middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Configuring Diclik.com server in production mode...");
    const distPath = path.join(process.cwd(), "dist", "web");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Diclik.com enterprise server running on port ${PORT}`);
  });
}

configureServer().catch((error) => {
  console.error("No se pudo iniciar Diclik.com:", error);
  process.exit(1);
});
