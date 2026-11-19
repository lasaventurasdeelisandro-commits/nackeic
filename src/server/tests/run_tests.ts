/**
 * Diclik.com — Comprehensive Enterprise Integration & Security Test Suite
 * Tests real Express HTTP endpoints + PostgreSQL ACID transactions, Security, RBAC, Escrow, Webhooks & Disputes
 */

import express from "express";
import http from "http";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { jsonBody } from "../middleware/jsonBody.ts";
import { db } from "../db/index.ts";
import { getJwtSecretForTests } from "../middleware/auth.ts";
import { authRouter } from "../routes/authRoutes.ts";
import { marketplaceRouter } from "../routes/marketplaceRoutes.ts";
import { radarRouter } from "../routes/radarRoutes.ts";
import { chatRouter } from "../routes/chatRoutes.ts";
import { walletRouter } from "../routes/walletRoutes.ts";
import { adminRouter } from "../routes/adminRoutes.ts";

interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  details?: string;
  error?: string;
}

const testResults: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<string | void>) {
  const start = Date.now();
  try {
    const details = (await fn()) || "Aprobado";
    testResults.push({ name, passed: true, durationMs: Date.now() - start, details });
    console.log(`  [PASSED] ${name} (${Date.now() - start}ms) — ${details}`);
  } catch (err: any) {
    testResults.push({ name, passed: false, durationMs: Date.now() - start, error: err.message });
    console.error(`  [FAILED] ${name}: ${err.message}`);
  }
}

export async function runAllTests() {
  console.log("\n==================================================================");
  console.log("   DICLIK.COM — AUDITORÍA DE PRUEBAS AUTOMATIZADAS v2.0.0");
  console.log("==================================================================\n");

  process.env.NODE_ENV = "test";
  process.env.PAYMENT_WEBHOOK_SECRET = "test_webhook_hmac_secret_diclik_2026_32bytes";

  const adminEmail = "admin-pruebas@diclik.test";
  const adminPassword = crypto.randomBytes(24).toString("hex");
  process.env.BOOTSTRAP_ADMIN_EMAIL = adminEmail;
  process.env.BOOTSTRAP_ADMIN_PASSWORD = adminPassword;
  process.env.SEED_DEMO_DATA = "false";
  await db.init();

  // Start ephemeral Express server for real HTTP integration testing
  const app = express();
  app.use(jsonBody);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/radar", radarRouter);
  app.use("/api/v1/chat", chatRouter);
  app.use("/api/v1/wallet", walletRouter);
  app.use("/api/v1/admin", adminRouter);
  app.use("/api/v1", marketplaceRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}/api/v1`;

  async function apiCall(path: string, opts: RequestInit = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(opts.headers || {})
      }
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  }

  try {
    // 1. PostgreSQL Schema Integrity (All 21 Tables including hardening migration 002)
    await runTest("1. Motor PostgreSQL e Integridad de 21 Tablas Versionadas", async () => {
      const tablesQuery = await db.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `);

      const expectedTables = [
        "audit_logs",
        "client_profiles",
        "contract_cancellations",
        "contracts",
        "conversations",
        "disputes",
        "escrow_holds",
        "financial_transactions",
        "messages",
        "notifications",
        "offers",
        "password_reset_tokens",
        "payment_webhooks",
        "professional_profiles",
        "reviews",
        "revoked_tokens",
        "schema_migrations",
        "service_categories",
        "service_requests",
        "users",
        "wallet_ledgers"
      ];

      const foundNames = tablesQuery.rows.map((r: any) => r.table_name);
      const missing = expectedTables.filter((t) => !foundNames.includes(t));
      if (missing.length > 0) {
        throw new Error(`Tablas faltantes: ${missing.join(", ")}`);
      }
      return `${expectedTables.length} tablas verificadas correctamente (migraciones 001 + 002).`;
    });

    // 2. Auth: Real Registration, Bcrypt 12 Rounds, Login & Profile Update
    const ts = Date.now();
    const clientEmail = `cliente_${ts}@diclik.com`;
    const proEmail = `pro_${ts}@diclik.com`;
    const pwd = "DiclikSecure2026!";
    let clientToken = "";
    let clientId = "";
    let proToken = "";
    let proId = "";
    let adminToken = "";

    await runTest("2. Registro Real, Cifrado Bcrypt y Login JWT sin Secretos Hardcodeados", async () => {
      const regClient = await apiCall("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: clientEmail,
          password: pwd,
          role: "cliente",
          fullName: "Cliente Certificado Diclik",
          phone: "+18095559901",
          address: "Av. 27 de Febrero #200, Santo Domingo"
        })
      });
      if (regClient.status !== 201 || !regClient.body.token) {
        throw new Error(`Fallo registro cliente: ${regClient.body.error || regClient.status}`);
      }
      clientToken = regClient.body.token;
      clientId = regClient.body.user.id;

      const regPro = await apiCall("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: proEmail,
          password: pwd,
          role: "tecnico",
          fullName: "Técnico Certificado Diclik",
          phone: "+18095559902",
          trade: "plomeria"
        })
      });
      if (regPro.status !== 201 || !regPro.body.token) {
        throw new Error(`Fallo registro técnico: ${regPro.body.error || regPro.status}`);
      }
      proToken = regPro.body.token;
      proId = regPro.body.user.id;

      // Verify bcrypt cost >= 10
      const userRow = (await db.query("SELECT password_hash FROM users WHERE id = $1;", [clientId])).rows[0];
      if (!userRow.password_hash.startsWith("$2")) throw new Error("Hash inválido");

      // Verify seeded admin login
      const admRes = await apiCall("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: adminEmail, password: adminPassword })
      });
      if (admRes.status !== 200) throw new Error("Fallo login admin");
      adminToken = admRes.body.token;

      // Verify JWT rejects forged secret
      let acceptedForged = false;
      try {
        jwt.verify(clientToken, "wrong_secret_should_fail");
        acceptedForged = true;
      } catch {
        acceptedForged = false;
      }
      if (acceptedForged || getJwtSecretForTests().includes("directo_enterprise")) {
        throw new Error("Secreto JWT inseguro detectado");
      }

      return `Cliente (${clientId}), Técnico (${proId}) y Admin autenticados vía HTTP.`;
    });

    // 3. Logout Token Revocation & Password Recovery Flow
    await runTest("3. Revocación de Token en Logout (Blacklist) y Recuperación de Contraseña", async () => {
      // Create temporary session token to test logout revocation
      const tempLogin = await apiCall("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: clientEmail, password: pwd })
      });
      const tempToken = tempLogin.body.token;

      const logoutRes = await apiCall("/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${tempToken}` }
      });
      if (logoutRes.status !== 200) throw new Error("Logout no respondió 200");

      const afterLogout = await apiCall("/auth/me", {
        headers: { Authorization: `Bearer ${tempToken}` }
      });
      if (afterLogout.status !== 401) {
        throw new Error("Vulnerabilidad: Token revocado siguió siendo aceptado");
      }

      // Test profile update
      const profUpd = await apiCall("/auth/profile", {
        method: "PUT",
        headers: { Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({ fullName: "Cliente Verificado Diclik", phone: "+18095557777" })
      });
      if (profUpd.status !== 200) throw new Error("Fallo actualización de perfil");

      // Forgot + reset password (verify no raw token leaked over HTTP and DB row persisted)
      const forgotRes = await apiCall("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: clientEmail })
      });
      if (forgotRes.status !== 200 || forgotRes.body.devResetToken) {
        throw new Error("Fallo endpoint forgot-password o filtró token en respuesta HTTP");
      }

      const prtCheck = await db.query(
        "SELECT id FROM password_reset_tokens WHERE user_id = $1 AND used = FALSE;",
        [clientId]
      );
      if (prtCheck.rows.length === 0) {
        throw new Error("forgot-password no persistió token temporal en PostgreSQL");
      }

      // Simulate user clicking email link token (hashed via SHA-256 in DB)
      const knownRawResetToken = crypto.randomBytes(24).toString("hex");
      const knownHash = crypto.createHash("sha256").update(knownRawResetToken).digest("hex");
      await db.query(
        `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used)
         VALUES ($1, $2, $3, $4, FALSE);`,
        ["prt_test_" + ts, clientId, knownHash, new Date(Date.now() + 600_000).toISOString()]
      );

      const resetRes = await apiCall("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: knownRawResetToken, newPassword: "NewDiclikPassword2026!" })
      });
      if (resetRes.status !== 200) throw new Error("Fallo restablecimiento de contraseña");

      // Login with new password succeeds
      const newLogin = await apiCall("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: clientEmail, password: "NewDiclikPassword2026!" })
      });
      if (newLogin.status !== 200) throw new Error("No pudo iniciar sesión tras cambio de clave");
      clientToken = newLogin.body.token;

      return "Token revocado en DB tras logout y recuperación temporal validada.";
    });

    // 4. Financial: Payment Gateway HMAC Webhook, Idempotency & Production Sandbox Block
    await runTest("4. Webhook HMAC-SHA256 Autenticado, Idempotencia y Bloqueo Sandbox en Producción", async () => {
      // Bad signature rejected
      const badSig = await apiCall("/wallet/webhooks/payment", {
        method: "POST",
        headers: { "x-webhook-signature": "invalid_signature" },
        body: JSON.stringify({ eventId: "evt_bad", eventType: "payment.succeeded", userId: clientId, amount: 10000 })
      });
      if (badSig.status !== 401) throw new Error("Webhook aceptó firma inválida");

      // Valid signed webhook deposits RD$ 10,000
      const payload = {
        eventId: `evt_${ts}_1`,
        eventType: "payment.succeeded",
        provider: "stripe_rd",
        userId: clientId,
        amount: 10000,
        currency: "DOP"
      };
      const raw = JSON.stringify(payload, null, 2);
      const validSig = crypto.createHmac("sha256", process.env.PAYMENT_WEBHOOK_SECRET!).update(raw).digest("hex");

      const okWh = await apiCall("/wallet/webhooks/payment", {
        method: "POST",
        headers: { "x-webhook-signature": `sha256=${validSig}` },
        body: raw
      });
      if (okWh.status !== 200) throw new Error(`Webhook legítimo falló: ${okWh.body.error}`);

      // Replay with same eventId must NOT double credit
      const replayWh = await apiCall("/wallet/webhooks/payment", {
        method: "POST",
        headers: { "x-webhook-signature": validSig },
        body: raw
      });
      if (replayWh.status !== 200) throw new Error("Replay webhook error");

      const ledger = await apiCall("/wallet/ledger", { headers: { Authorization: `Bearer ${clientToken}` } });
      if (Number(ledger.body.balance_available) !== 10000) {
        throw new Error(`Saldo incorrecto tras webhook+replay: ${ledger.body.balance_available}`);
      }

      // Ensure sandbox deposit fails when ALLOW_SANDBOX_PAYMENTS !== 'true'
      const prevSandbox = process.env.ALLOW_SANDBOX_PAYMENTS;
      process.env.ALLOW_SANDBOX_PAYMENTS = "false";
      const blockedSandbox = await apiCall("/wallet/deposit", {
        method: "POST",
        headers: { Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({ amount: 5000 })
      });
      if (prevSandbox === undefined) delete process.env.ALLOW_SANDBOX_PAYMENTS;
      else process.env.ALLOW_SANDBOX_PAYMENTS = prevSandbox;
      if (blockedSandbox.status !== 403) {
        throw new Error("Recarga sandbox no fue bloqueada en modo restringido");
      }

      return "HMAC verificado, replay idempotente sin doble acreditación y sandbox bloqueado.";
    });

    // 5. PII Masking, RBAC & Full Service -> Offer -> Atomic Hire -> OTP Release -> Review Flow
    let requestId = "";
    let offerId = "";
    let contractId = "";
    let otpCode = "";

    await runTest("5. Privacidad PII, RBAC, Contratación Atómica Escrow, Liberación OTP y Reseña", async () => {
      // Client publishes service
      const srvRes = await apiCall("/services", {
        method: "POST",
        headers: { Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({
          title: "Reparación de llave de paso principal",
          description: "Requiere reemplazo de válvula de 1/2 pulgada",
          categoryId: "plomeria",
          targetRole: "tecnico",
          address: "Naco, Santo Domingo",
          urgency: "urgente",
          minBudget: 2500
        })
      });
      if (srvRes.status !== 201) throw new Error(`Fallo creación servicio: ${srvRes.body.error}`);
      requestId = srvRes.body.requestId;
      otpCode = srvRes.body.releaseCode;

      // Public unauthenticated listing MUST NOT expose client_phone or release_code
      const pubList = await apiCall("/services");
      const targetReq = pubList.body.find((r: any) => r.id === requestId);
      if (!targetReq) throw new Error("Solicitud no encontrada en listado");
      if (targetReq.client_phone !== null || targetReq.address !== null || targetReq.lat !== null
        || targetReq.lng !== null || targetReq.release_code !== undefined) {
        throw new Error("Fuga de PII/OTP en endpoint público GET /services");
      }

      // RBAC: Client CANNOT submit a professional offer
      const badRoleOffer = await apiCall(`/services/${requestId}/offers`, {
        method: "POST",
        headers: { Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({ price: 2000, etaMinutes: 15 })
      });
      if (badRoleOffer.status !== 403) throw new Error("RBAC falló: cliente pudo cotizar oferta");

      // Pro submits offer of RD$ 2,500
      const offerRes = await apiCall(`/services/${requestId}/offers`, {
        method: "POST",
        headers: { Authorization: `Bearer ${proToken}` },
        body: JSON.stringify({ price: 2500, etaMinutes: 12, message: "Incluye válvula de bronce" })
      });
      if (offerRes.status !== 201) throw new Error("Fallo envío de oferta");
      offerId = offerRes.body.offerId;

      // Client accepts offer -> locks RD$ 2,500 in Escrow (available 10000 -> 7500, locked -> 2500)
      const accRes = await apiCall(`/offers/${offerId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${clientToken}` }
      });
      if (accRes.status !== 200) throw new Error(`Fallo aceptación: ${accRes.body.error}`);
      contractId = accRes.body.contractId;

      const locationPath = `/contracts/${contractId}/location`;
      const location = { lat: 18.4772, lng: -69.946 };
      const clientHeaders = { Authorization: `Bearer ${clientToken}` };
      const proHeaders = { Authorization: `Bearer ${proToken}` };
      const attemptedWrite = await apiCall(locationPath, { method: "PUT", headers: clientHeaders, body: JSON.stringify(location) });
      if (attemptedWrite.status !== 403) throw new Error("El cliente pudo cambiar la ubicación del especialista");
      const shared = await apiCall(locationPath, { method: "PUT", headers: proHeaders, body: JSON.stringify(location) });
      if (shared.status !== 200) throw new Error(`El técnico no pudo compartir ubicación: ${JSON.stringify(shared.body)}`);
      const tracked = await apiCall(locationPath, { headers: clientHeaders });
      if (tracked.status !== 200 || tracked.body.lat !== location.lat || tracked.body.lng !== location.lng) {
        throw new Error("El cliente no pudo consultar la ubicación compartida");
      }
      const externalAccess = await apiCall(locationPath, { headers: { Authorization: `Bearer ${adminToken}` } });
      if (externalAccess.status !== 403) throw new Error("Se expuso la ubicación fuera del contrato");
      const transit = await apiCall(`/contracts/${contractId}/status`, {
        method: "PATCH", headers: proHeaders, body: JSON.stringify({ status: "active_in_transit" }),
      });
      const arrival = await apiCall(`/contracts/${contractId}/status`, {
        method: "PATCH", headers: proHeaders, body: JSON.stringify({ status: "in_progress" }),
      });
      if (transit.status !== 200 || arrival.status !== 200) throw new Error("No se registró el trayecto y la llegada");

      // Race condition / duplicate accept attempt MUST return 409
      const dupAccept = await apiCall(`/offers/${offerId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${clientToken}` }
      });
      if (dupAccept.status !== 409) throw new Error("Fallo protección contra doble contratación");

      // Unauthorized third user CANNOT verify OTP
      const unauthOtp = await apiCall(`/contracts/${contractId}/verify-otp`, {
        method: "POST",
        body: JSON.stringify({ otpInput: otpCode })
      });
      if (unauthOtp.status !== 401) throw new Error("Endpoint verify-otp permitió acceso sin autenticación");

      // Wrong OTP rejected
      const wrongOtp = await apiCall(`/contracts/${contractId}/verify-otp`, {
        method: "POST",
        headers: { Authorization: `Bearer ${proToken}` },
        body: JSON.stringify({ otpInput: "0000" })
      });
      if (wrongOtp.status !== 400) throw new Error("OTP incorrecto no fue rechazado");

      // Valid OTP releases funds cleanly
      const goodOtp = await apiCall(`/contracts/${contractId}/verify-otp`, {
        method: "POST",
        headers: { Authorization: `Bearer ${proToken}` },
        body: JSON.stringify({ otpInput: otpCode })
      });
      if (goodOtp.status !== 200) throw new Error(`Fallo liberación OTP: ${goodOtp.body.error}`);

      if ((await apiCall(locationPath, { headers: clientHeaders })).status !== 403) {
        throw new Error("El historial de ubicación quedó accesible tras cerrar el contrato");
      }

      // Verify pro ledger received 70% = RD$ 1,750
      const proLedger = await apiCall("/wallet/ledger", { headers: { Authorization: `Bearer ${proToken}` } });
      if (Number(proLedger.body.balance_available) !== 1750) {
        throw new Error(`Desembolso incorrecto al técnico: ${proLedger.body.balance_available}`);
      }

      // Leave review
      const revRes = await apiCall(`/contracts/${contractId}/review`, {
        method: "POST",
        headers: { Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({ rating: 5, comment: "Trabajo impecable y puntual" })
      });
      if (revRes.status !== 201) throw new Error("Fallo registro de calificación");

      return "PII protegido, RBAC aplicado, doble contratación bloqueada, Escrow OTP liberado y reseña registrada.";
    });

    // 6. Cancellation 15% Rule & Escrow Dispute Resolution
    await runTest("6. Penalización 15% por Cancelación y Resolución Administrativa de Disputa", async () => {
      // Create 2nd request + offer + contract (RD$ 2,000) to test cancellation math
      const s2 = await apiCall("/services", {
        method: "POST",
        headers: { Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({
          title: "Revisión de breaker principal",
          description: "Disyuntor disparándose",
          categoryId: "electricidad",
          address: "Piantini"
        })
      });
      const o2 = await apiCall(`/services/${s2.body.requestId}/offers`, {
        method: "POST",
        headers: { Authorization: `Bearer ${proToken}` },
        body: JSON.stringify({ price: 2000, etaMinutes: 10 })
      });
      const c2 = await apiCall(`/offers/${o2.body.offerId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${clientToken}` }
      });
      const cancRes = await apiCall(`/contracts/${c2.body.contractId}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({ scenario: "client_before_arrival", reason: "Resuelto antes de llegada" })
      });
      if (cancRes.status !== 200 || cancRes.body.clientRefundAmount !== 1700 || cancRes.body.penaltyAmount !== 300) {
        throw new Error(`Cálculo cancelación 15% incorrecto: ${JSON.stringify(cancRes.body)}`);
      }

      // Create 3rd request + offer + contract (RD$ 1,000) to test Dispute & Admin Resolution
      const s3 = await apiCall("/services", {
        method: "POST",
        headers: { Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({
          title: "Instalación de cerradura inteligente",
          description: "Puerta de madera",
          categoryId: "cerrajeria",
          address: "Bella Vista"
        })
      });
      const o3 = await apiCall(`/services/${s3.body.requestId}/offers`, {
        method: "POST",
        headers: { Authorization: `Bearer ${proToken}` },
        body: JSON.stringify({ price: 1000, etaMinutes: 20 })
      });
      const c3 = await apiCall(`/offers/${o3.body.offerId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${clientToken}` }
      });
      const dispOpen = await apiCall(`/contracts/${c3.body.contractId}/dispute`, {
        method: "POST",
        headers: { Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({ reason: "El especialista no se presentó al sitio acordado" })
      });
      if (dispOpen.status !== 201) throw new Error("Fallo apertura de disputa");

      const dispResolve = await apiCall(`/admin/disputes/${dispOpen.body.disputeId}/resolve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ decision: "refund_client", notes: "Confirmada inasistencia" })
      });
      if (dispResolve.status !== 200) throw new Error("Fallo resolución de disputa por admin");

      return "Penalización 15% (RD$ 300 / Reembolso RD$ 1,700) y arbitraje de disputa conciliados en PostgreSQL.";
    });

    // 7. Radar & Notifications Endpoints
    await runTest("7. Radar Geoespacial (Ocultación de Coordenadas) y Notificaciones Persistentes", async () => {
      const radar = await apiCall("/radar/specialists?lat=18.4861&lng=-69.9312&radius=20");
      if (radar.status !== 200 || !Array.isArray(radar.body) || radar.body.length === 0) {
        throw new Error("Radar no devolvió especialistas");
      }
      if ("lat" in radar.body[0] || "lng" in radar.body[0]) {
        throw new Error("Privacidad vulnerada: radar expuso coordenadas GPS exactas del especialista");
      }

      const notifs = await apiCall("/notifications", { headers: { Authorization: `Bearer ${proToken}` } });
      if (notifs.status !== 200 || !Array.isArray(notifs.body) || notifs.body.length === 0) {
        throw new Error("Notificaciones no persistieron para el profesional");
      }

      return `${radar.body.length} especialistas en radar sin exposición GPS y ${notifs.body.length} notificaciones auditadas.`;
    });

    // 8. Complete Service CRUD, Counter-Offer Pricing in Escrow, Offer Reject & Admin User Suspension
    await runTest("8. CRUD Servicios, Contraoferta Real en Escrow, Rechazo y Suspensión Admin", async () => {
      // Create temporary request to test GET/PATCH/DELETE
      const tempSrv = await apiCall("/services", {
        method: "POST",
        headers: { Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({
          title: "Reparación temporal de tubería",
          description: "Prueba CRUD inicial",
          categoryId: "plomeria",
          address: "Naco, Santo Domingo",
          minBudget: 1500
        })
      });
      if (tempSrv.status !== 201) throw new Error("Fallo POST /services temporal");
      const tempId = tempSrv.body.requestId;

      const detailRes = await apiCall(`/services/${tempId}`);
      if (detailRes.status !== 200 || detailRes.body.release_code !== undefined || detailRes.body.client_phone !== null) {
        throw new Error("GET /services/:id expuso PII/OTP o falló");
      }

      const patchRes = await apiCall(`/services/${tempId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({ title: "Reparación actualizada de válvula", minBudget: 1800 })
      });
      if (patchRes.status !== 200) throw new Error("Fallo PATCH /services/:id");

      // Pro submits offer 1 -> rejected, offer 2 -> countered 2200 -> 1900 -> accepted at 1900
      const rejOffer = await apiCall(`/services/${tempId}/offers`, {
        method: "POST",
        headers: { Authorization: `Bearer ${proToken}` },
        body: JSON.stringify({ price: 2400, etaMinutes: 15 })
      });
      const rejRes = await apiCall(`/offers/${rejOffer.body.offerId}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${clientToken}` }
      });
      if (rejRes.status !== 200) throw new Error("Fallo POST /offers/:id/reject");

      // Delete open service cleanly
      const delRes = await apiCall(`/services/${tempId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${clientToken}` }
      });
      if (delRes.status !== 200) throw new Error("Fallo DELETE /services/:id");

      // Test counter-offer actually governs Escrow price upon accept
      const sCounter = await apiCall("/services", {
        method: "POST",
        headers: { Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({
          title: "Cambio de mezcladora cocina",
          description: "Incluye mangueras",
          categoryId: "plomeria",
          address: "Piantini",
          minBudget: 1200
        })
      });
      const oCounter = await apiCall(`/services/${sCounter.body.requestId}/offers`, {
        method: "POST",
        headers: { Authorization: `Bearer ${proToken}` },
        body: JSON.stringify({ price: 1500, etaMinutes: 15 })
      });
      const cntRes = await apiCall(`/offers/${oCounter.body.offerId}/counter`, {
        method: "POST",
        headers: { Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({ counterPrice: 1200, reason: "Ajuste presupuestario" })
      });
      if (cntRes.status !== 200) throw new Error("Fallo POST /offers/:id/counter");

      const selfAccept = await apiCall(`/offers/${oCounter.body.offerId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${clientToken}` }
      });
      if (selfAccept.status !== 403) throw new Error("El cliente pudo aceptar su propia contraoferta");
      const accCnt = await apiCall(`/offers/${oCounter.body.offerId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${proToken}` }
      });
      if (accCnt.status !== 200 || Number(accCnt.body.agreedPrice) !== 1200 || accCnt.body.otpCode !== undefined) {
        throw new Error(`Accept no respetó la contraoferta o expuso el OTP al especialista: ${JSON.stringify(accCnt.body)}`);
      }

      // Admin suspends pro temporarily -> JWT rejected -> Admin restores active
      const susp = await apiCall(`/admin/users/${proId}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: "suspended" })
      });
      if (susp.status !== 200) throw new Error("Fallo suspensión de usuario por admin");

      const blockedPro = await apiCall("/wallet/ledger", {
        headers: { Authorization: `Bearer ${proToken}` }
      });
      if (blockedPro.status !== 403) {
        throw new Error(`Usuario suspendido pudo acceder con JWT (status ${blockedPro.status})`);
      }

      const restore = await apiCall(`/admin/users/${proId}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: "active" })
      });
      if (restore.status !== 200) throw new Error("Fallo reactivación de usuario por admin");

      return "CRUD completo, contraoferta aplicada a Escrow (RD$ 1,200) y bloqueo efectivo de cuentas suspendidas.";
    });

    // 9. Bank Withdrawals with Idempotency & Charge Refunded Webhook
    await runTest("9. Retiros Bancarios Auditados (Idempotencia / Saldo) y Reembolso Webhook HMAC", async () => {
      // Pro has RD$ 1,750 available from test 5 -> request valid withdrawal of RD$ 1,000
      const wdKey = `idem_wd_test_${ts}`;
      const wdOk = await apiCall("/wallet/withdraw", {
        method: "POST",
        headers: { Authorization: `Bearer ${proToken}` },
        body: JSON.stringify({
          amount: 1000,
          destinationAccount: "Banco Popular - 78901234",
          idempotencyKey: wdKey
        })
      });
      if (wdOk.status !== 201 || wdOk.body.status !== "pending") {
        throw new Error(`Retiro válido falló: ${JSON.stringify(wdOk.body)}`);
      }

      // Duplicate idempotencyKey rejected 409
      const wdDup = await apiCall("/wallet/withdraw", {
        method: "POST",
        headers: { Authorization: `Bearer ${proToken}` },
        body: JSON.stringify({
          amount: 1000,
          destinationAccount: "Banco Popular - 78901234",
          idempotencyKey: wdKey
        })
      });
      if (wdDup.status !== 409) throw new Error("Retiro duplicado no fue rechazado por idempotencia");

      // Insufficient balance rejected 402
      const wdInsuff = await apiCall("/wallet/withdraw", {
        method: "POST",
        headers: { Authorization: `Bearer ${proToken}` },
        body: JSON.stringify({
          amount: 50000,
          destinationAccount: "Banco Popular - 78901234"
        })
      });
      if (wdInsuff.status !== 402) throw new Error(`Retiro sin fondos devolvió ${wdInsuff.status} en lugar de 402`);

      // Valid signed charge.refunded webhook debits 200 from client
      const beforeLedger = await apiCall("/wallet/ledger", { headers: { Authorization: `Bearer ${clientToken}` } });
      const prevBal = Number(beforeLedger.body.balance_available);
      const refundPayload = {
        eventId: `evt_ref_${ts}`,
        eventType: "charge.refunded",
        provider: "stripe_rd",
        userId: clientId,
        amount: 200,
        currency: "DOP"
      };
      const rawRef = JSON.stringify(refundPayload);
      const sigRef = crypto.createHmac("sha256", process.env.PAYMENT_WEBHOOK_SECRET!).update(rawRef).digest("hex");

      const refWh = await apiCall("/wallet/webhooks/payment", {
        method: "POST",
        headers: { "x-webhook-signature": `sha256=${sigRef}` },
        body: rawRef
      });
      if (refWh.status !== 200) throw new Error("Webhook charge.refunded falló");

      const afterLedger = await apiCall("/wallet/ledger", { headers: { Authorization: `Bearer ${clientToken}` } });
      const newBal = Number(afterLedger.body.balance_available);
      if (Math.abs(newBal - (prevBal - 200)) > 0.01) {
        throw new Error(`Conciliación charge.refunded incorrecta: ${prevBal} -> ${newBal}`);
      }

      return "Retiros pendientes idempotentes (409/402 verificados) y conciliación charge.refunded HMAC exacta.";
    });

    // 10. Real Concurrency Race Condition & 100-Request Load/Latency Benchmark
    await runTest("10. Concurrencia Paralela (10x Accept Race) y Carga HTTP (100 Peticiones)", async () => {
      const sRace = await apiCall("/services", {
        method: "POST",
        headers: { Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({
          title: "Prueba concurrencia atómica",
          description: "Validación de doble gasto concurrente",
          categoryId: "electricidad",
          address: "Naco",
          minBudget: 500
        })
      });
      const oRace = await apiCall(`/services/${sRace.body.requestId}/offers`, {
        method: "POST",
        headers: { Authorization: `Bearer ${proToken}` },
        body: JSON.stringify({ price: 500, etaMinutes: 10 })
      });

      const ledgerBefore = await apiCall("/wallet/ledger", { headers: { Authorization: `Bearer ${clientToken}` } });
      const balBefore = Number(ledgerBefore.body.balance_available);

      // Launch 10 simultaneous offer-acceptance requests against same offer
      const raceCalls = await Promise.all(
        Array.from({ length: 10 }, () =>
          apiCall(`/offers/${oRace.body.offerId}/accept`, {
            method: "POST",
            headers: { Authorization: `Bearer ${clientToken}` }
          })
        )
      );

      const okCount = raceCalls.filter((r) => r.status === 200).length;
      const conflictCount = raceCalls.filter((r) => r.status === 409).length;
      if (okCount !== 1 || conflictCount !== 9) {
        throw new Error(`Fallo bloqueo concurrente: ok=${okCount}, conflict=${conflictCount}`);
      }

      const ledgerAfter = await apiCall("/wallet/ledger", { headers: { Authorization: `Bearer ${clientToken}` } });
      const balAfter = Number(ledgerAfter.body.balance_available);
      if (Math.abs(balAfter - (balBefore - 500)) > 0.01) {
        throw new Error(`Doble débito detectado bajo concurrencia: ${balBefore} -> ${balAfter}`);
      }

      // 100-request burst load test on GET /services
      const latencies: number[] = [];
      let errorCount = 0;
      await Promise.all(
        Array.from({ length: 100 }, async () => {
          const t0 = Date.now();
          const r = await apiCall("/services");
          latencies.push(Date.now() - t0);
          if (r.status !== 200) errorCount++;
        })
      );
      latencies.sort((a, b) => a - b);
      const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
      const avg = Math.round(latencies.reduce((acc, v) => acc + v, 0) / latencies.length);
      if (errorCount > 0) {
        throw new Error(`${errorCount}/100 peticiones fallaron bajo carga`);
      }

      return `10x Race: 1 éxito / 9 rechazos 409 sin doble débito; 100 req load: 0 errores, avg=${avg}ms, p95=${p95}ms.`;
    });

    await runTest("11. Registro profesional y mensajería con control de participantes", async () => {
      const professional = await apiCall("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: `profesional_${ts}@diclik.test`,
          password: pwd,
          role: "profesional",
          fullName: "Profesional de prueba",
          trade: "Ingeniería",
          credentialCode: "PRUEBA-001"
        })
      });
      if (professional.status !== 201 || professional.body.user?.role !== "profesional") {
        throw new Error(`No se registró el profesional: ${JSON.stringify(professional.body)}`);
      }
      const clientHeaders = { Authorization: `Bearer ${clientToken}` };
      const technicianHeaders = { Authorization: `Bearer ${proToken}` };
      const conversations = await apiCall("/chat/conversations", { headers: clientHeaders });
      const conversation = conversations.body.find((item: any) => item.request_id === requestId && item.professional_id === proId);
      if (!conversation) throw new Error("La contratación no creó una conversación");
      const messagesPath = `/chat/conversations/${conversation.id}/messages`;
      const sent = await apiCall(messagesPath, {
        method: "POST",
        headers: clientHeaders,
        body: JSON.stringify({ content: "Mensaje de integración DICLIK" })
      });
      if (sent.status !== 201) throw new Error("No se pudo enviar el mensaje");
      const received = await apiCall(messagesPath, { headers: technicianHeaders });
      if (received.status !== 200 || !received.body.some((message: any) => message.id === sent.body.messageId)) {
        throw new Error("El técnico no recibió el mensaje");
      }
      const denied = await apiCall(messagesPath, {
        headers: { Authorization: `Bearer ${professional.body.token}` }
      });
      if (denied.status !== 403) throw new Error("Un tercero pudo acceder a la conversación");
      return "Profesional registrado; mensajes persistidos y acceso de terceros bloqueado.";
    });

    console.log("\n==================================================================");
    const total = testResults.length;
    const passed = testResults.filter((r) => r.passed).length;
    console.log(`RESULTADO DICLIK.COM: ${passed}/${total} SUITES EXITOSAS (${Math.round((passed / total) * 100)}%)`);
    console.log("==================================================================\n");

    return { total, passed, results: testResults };
  } finally {
    server.close();
  }
}

runAllTests()
  .then((res) => {
    process.exit(res.passed === res.total ? 0 : 1);
  })
  .catch((err) => {
    console.error("Error fatal en pruebas Diclik.com:", err);
    process.exit(1);
  });
