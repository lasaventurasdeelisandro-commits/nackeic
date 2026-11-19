import { Router, Response } from "express";
import crypto from "crypto";
import type { PaymentWebhookRequest } from "../middleware/jsonBody.ts";
import { db } from "../db/index.ts";
import { requireAuth, requireRole, AuthenticatedRequest } from "../middleware/auth.ts";

export const walletRouter = Router();

// GET /api/v1/wallet/ledger
walletRouter.get("/ledger", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const result = await db.query("SELECT * FROM wallet_ledgers WHERE user_id = $1;", [user.id]);

    if (result.rows.length === 0) {
      res.json({ balance_available: 0, balance_locked_escrow: 0, total_earned: 0, total_spent: 0 });
      return;
    }

    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Error al consultar estado de billetera" });
  }
});

// GET /api/v1/wallet/transactions
walletRouter.get("/transactions", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const result = await db.query(
      `SELECT ft.*, c.request_id, sr.title as request_title
       FROM financial_transactions ft
       LEFT JOIN contracts c ON ft.contract_id = c.id
       LEFT JOIN service_requests sr ON c.request_id = sr.id
       WHERE ft.user_id = $1
       ORDER BY ft.created_at DESC
       LIMIT 100;`,
      [user.id]
    );

    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Error al obtener historial de transacciones" });
  }
});

// GET /api/v1/wallet/reconciliation (Audit wallet balances vs transaction history)
walletRouter.get("/reconciliation", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId =
      req.user!.role === "admin" && typeof req.query.userId === "string"
        ? req.query.userId
        : req.user!.id;

    const ledgerRes = await db.query("SELECT * FROM wallet_ledgers WHERE user_id = $1;", [targetUserId]);
    const txSummary = await db.query(
      `SELECT type, COUNT(*) as count, COALESCE(SUM(amount), 0) as total
       FROM financial_transactions
       WHERE user_id = $1 AND status = 'completed'
       GROUP BY type;`,
      [targetUserId]
    );

    res.json({
      userId: targetUserId,
      ledger: ledgerRes.rows[0] || {
        balance_available: 0,
        balance_locked_escrow: 0,
        total_earned: 0,
        total_spent: 0
      },
      transactionsByType: txSummary.rows,
      reconciledAt: new Date().toISOString()
    });
  } catch {
    res.status(500).json({ error: "Error al ejecutar conciliación financiera" });
  }
});

// POST /api/v1/wallet/deposit (Strictly restricted to explicit sandbox testing outside production)
walletRouter.post("/deposit", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isTest = process.env.NODE_ENV === "test";
    const sandboxAllowed = process.env.ALLOW_SANDBOX_PAYMENTS === "true";

    if (!isTest || !sandboxAllowed) {
      res.status(403).json({
        error: "Recarga directa deshabilitada. En producción las acreditaciones se procesan exclusivamente mediante webhook verificado de la pasarela de pago autorizada."
      });
      return;
    }

    const user = req.user!;
    const { amount, idempotencyKey } = req.body;
    const numAmount = Number(amount);

    if (!Number.isFinite(numAmount) || numAmount <= 0 || numAmount > 500000) {
      res.status(400).json({ error: "El monto a recargar debe ser un valor válido mayor a 0 y hasta RD$ 500,000" });
      return;
    }

    const key =
      typeof idempotencyKey === "string" && idempotencyKey.trim().length > 0
        ? idempotencyKey.trim()
        : "idem_dep_" + crypto.randomUUID();

    // Prevent duplicate deposit with same idempotency key
    const existing = await db.query("SELECT id FROM financial_transactions WHERE idempotency_key = $1;", [key]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "Transacción duplicada detectada (Idempotencia)" });
      return;
    }

    await db.transaction(async (tx) => {
      await tx.query(
        "UPDATE wallet_ledgers SET balance_available = balance_available + $1, updated_at = NOW() WHERE user_id = $2;",
        [numAmount, user.id]
      );

      await tx.query(
        `INSERT INTO financial_transactions (id, user_id, type, amount, status, idempotency_key, description)
         VALUES ($1, $2, 'deposit', $3, 'completed', $4, 'Recarga de saldo en entorno de pruebas Diclik.com (Sandbox)');`,
        ["tx_" + crypto.randomUUID().slice(0, 12), user.id, numAmount, key]
      );

      await tx.query(
        `INSERT INTO audit_logs (id, actor_id, event_type, target_table, target_id, details)
         VALUES ($1, $2, 'SANDBOX_WALLET_DEPOSIT', 'wallet_ledgers', $2, $3);`,
        ["aud_" + crypto.randomUUID().slice(0, 12), user.id, JSON.stringify({ amount: numAmount, idempotencyKey: key })]
      );
    });

    const updated = await db.query("SELECT * FROM wallet_ledgers WHERE user_id = $1;", [user.id]);
    res.json({
      message: "Recarga sandbox acreditada exitosamente en billetera",
      wallet: updated.rows[0]
    });
  } catch {
    res.status(500).json({ error: "Error al procesar recarga" });
  }
});

// POST /api/v1/wallet/webhooks/payment (Authenticated PSP Webhook with HMAC-SHA256 & Idempotency)
walletRouter.post("/webhooks/payment", async (req: PaymentWebhookRequest, res: Response) => {
  try {
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET?.trim();
    if (!webhookSecret || (process.env.NODE_ENV !== "test" && process.env.ENABLE_PAYMENT_WEBHOOK !== "true")) {
      res.status(503).json({
        error: "Recepción de pagos deshabilitada."
      });
      return;
    }

    const signatureHeader = (req.headers["x-webhook-signature"] as string | undefined)?.trim();
    if (!signatureHeader) {
      res.status(401).json({ error: "Firma criptográfica de webhook faltante (x-webhook-signature)" });
      return;
    }

    if (!req.rawPaymentBody) {
      res.status(400).json({ error: "Se requiere un cuerpo JSON firmado." });
      return;
    }
    const expectedHmac = crypto.createHmac("sha256", webhookSecret).update(req.rawPaymentBody).digest("hex");
    const providedBuf = Buffer.from(signatureHeader.replace(/^sha256=/, ""), "utf8");
    const expectedBuf = Buffer.from(expectedHmac, "utf8");

    if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
      res.status(401).json({ error: "Firma HMAC de webhook inválida" });
      return;
    }

    const { eventId, eventType, provider, userId, amount, currency } = req.body || {};
    if (!eventId || !eventType || !userId) {
      res.status(400).json({ error: "Payload de webhook incompleto: se requiere eventId, eventType y userId" });
      return;
    }

    const numAmount = Number(amount || 0);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      res.status(400).json({ error: "Monto de transacción de webhook inválido" });
      return;
    }

    // Idempotency check on external event ID
    const existingWebhook = await db.query(
      "SELECT id, status FROM payment_webhooks WHERE provider_event_id = $1;",
      [String(eventId)]
    );
    if (existingWebhook.rows.length > 0) {
      res.status(200).json({
        message: "Evento webhook ya procesado previamente (idempotencia garantizada)",
        eventId,
        status: existingWebhook.rows[0].status
      });
      return;
    }

    // Verify target user exists
    const userRes = await db.query("SELECT id FROM users WHERE id = $1;", [String(userId)]);
    if (userRes.rows.length === 0) {
      res.status(404).json({ error: "Usuario destinatario no encontrado para conciliar pago" });
      return;
    }

    const webhookId = "wh_" + crypto.randomUUID().slice(0, 12);
    const prov = String(provider || process.env.PAYMENT_PROVIDER || "psp_external");

    await db.transaction(async (tx) => {
      if (eventType === "payment.succeeded" || eventType === "charge.succeeded") {
        await tx.query(
          `INSERT INTO payment_webhooks (id, provider, provider_event_id, event_type, signature_verified, user_id, amount, currency, status, payload)
           VALUES ($1, $2, $3, $4, TRUE, $5, $6, $7, 'reconciled', $8);`,
          [webhookId, prov, String(eventId), String(eventType), String(userId), numAmount, String(currency || "DOP"), JSON.stringify(req.body)]
        );

        await tx.query(
          "UPDATE wallet_ledgers SET balance_available = balance_available + $1, updated_at = NOW() WHERE user_id = $2;",
          [numAmount, String(userId)]
        );

        await tx.query(
          `INSERT INTO financial_transactions (id, user_id, type, amount, status, idempotency_key, reference, description)
           VALUES ($1, $2, 'deposit', $3, 'completed', $4, $5, $6);`,
          [
            "tx_" + crypto.randomUUID().slice(0, 12),
            String(userId),
            numAmount,
            "idem_wh_" + String(eventId),
            String(eventId),
            `Depósito conciliado vía pasarela autorizada (${prov})`
          ]
        );

        await tx.query(
          `INSERT INTO notifications (id, user_id, type, title, body, data)
           VALUES ($1, $2, 'PAYMENT_CREDITED', 'Pago confirmado en Diclik.com', $3, $4);`,
          [
            "notif_" + crypto.randomUUID().slice(0, 12),
            String(userId),
            `Se acreditaron RD$ ${numAmount.toLocaleString()} tras confirmación de tu pasarela de pago.`,
            JSON.stringify({ eventId, amount: numAmount, provider: prov })
          ]
        );
      } else if (eventType === "payment.failed") {
        await tx.query(
          `INSERT INTO payment_webhooks (id, provider, provider_event_id, event_type, signature_verified, user_id, amount, currency, status, payload)
           VALUES ($1, $2, $3, $4, TRUE, $5, $6, $7, 'ignored', $8);`,
          [webhookId, prov, String(eventId), String(eventType), String(userId), numAmount, String(currency || "DOP"), JSON.stringify(req.body)]
        );

        await tx.query(
          `INSERT INTO notifications (id, user_id, type, title, body, data)
           VALUES ($1, $2, 'PAYMENT_FAILED', 'Pago no procesado', $3, $4);`,
          [
            "notif_" + crypto.randomUUID().slice(0, 12),
            String(userId),
            "Tu intento de recarga no pudo confirmarse. Verifica con tu entidad bancaria.",
            JSON.stringify({ eventId, provider: prov })
          ]
        );
      } else if (eventType === "charge.refunded" || eventType === "payment.refunded") {
        await tx.query(
          `INSERT INTO payment_webhooks (id, provider, provider_event_id, event_type, signature_verified, user_id, amount, currency, status, payload)
           VALUES ($1, $2, $3, $4, TRUE, $5, $6, $7, 'reconciled', $8);`,
          [webhookId, prov, String(eventId), String(eventType), String(userId), numAmount, String(currency || "DOP"), JSON.stringify(req.body)]
        );

        await tx.query(
          `UPDATE wallet_ledgers
           SET balance_available = GREATEST(0, balance_available - $1), updated_at = NOW()
           WHERE user_id = $2;`,
          [numAmount, String(userId)]
        );

        await tx.query(
          `INSERT INTO financial_transactions (id, user_id, type, amount, status, idempotency_key, reference, description)
           VALUES ($1, $2, 'refund', $3, 'completed', $4, $5, $6);`,
          [
            "tx_" + crypto.randomUUID().slice(0, 12),
            String(userId),
            numAmount,
            "idem_wh_ref_" + String(eventId),
            String(eventId),
            `Reembolso bancario conciliado vía pasarela (${prov})`
          ]
        );
      } else {
        await tx.query(
          `INSERT INTO payment_webhooks (id, provider, provider_event_id, event_type, signature_verified, user_id, amount, currency, status, payload)
           VALUES ($1, $2, $3, $4, TRUE, $5, $6, $7, 'received', $8);`,
          [webhookId, prov, String(eventId), String(eventType), String(userId), numAmount, String(currency || "DOP"), JSON.stringify(req.body)]
        );
      }

      await tx.query(
        `INSERT INTO audit_logs (id, actor_id, event_type, target_table, target_id, details)
         VALUES ($1, $2, 'PAYMENT_WEBHOOK_VERIFIED', 'payment_webhooks', $3, $4);`,
        ["aud_" + crypto.randomUUID().slice(0, 12), String(userId), webhookId, JSON.stringify({ eventId, eventType, provider: prov, amount: numAmount })]
      );
    });

    res.status(200).json({
      message: "Webhook autenticado y conciliado correctamente",
      webhookId,
      eventId
    });
  } catch (error: any) {
    console.error("[Payment Webhook Error]:", error?.message);
    res.status(500).json({ error: "Error procesando webhook de pago" });
  }
});

// POST /api/v1/wallet/withdraw (Audited withdrawal request from available balance with idempotency)
walletRouter.post("/withdraw", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { amount, destinationAccount, idempotencyKey } = req.body;
    const numAmount = Number(amount);

    if (!Number.isFinite(numAmount) || numAmount < 100 || numAmount > 250000) {
      res.status(400).json({ error: "El monto de retiro debe estar entre RD$ 100 y RD$ 250,000" });
      return;
    }

    const dest = String(destinationAccount || "").trim();
    if (dest.length < 4) {
      res.status(400).json({ error: "Especifica la cuenta o referencia bancaria de destino (mín. 4 caracteres)" });
      return;
    }

    const key =
      typeof idempotencyKey === "string" && idempotencyKey.trim().length > 0
        ? idempotencyKey.trim()
        : "idem_wd_" + crypto.randomUUID();

    const dup = await db.query("SELECT id FROM financial_transactions WHERE idempotency_key = $1;", [key]);
    if (dup.rows.length > 0) {
      res.status(409).json({ error: "Solicitud de retiro duplicada (Idempotencia)" });
      return;
    }

    const txId = "tx_" + crypto.randomUUID().slice(0, 12);

    try {
      await db.transaction(async (tx) => {
        const debit = await tx.query(
          `UPDATE wallet_ledgers
           SET balance_available = balance_available - $1, updated_at = NOW()
           WHERE user_id = $2 AND balance_available >= $1
           RETURNING balance_available;`,
          [numAmount, user.id]
        );
        if (debit.rows.length === 0) {
          throw new Error("INSUFFICIENT_FUNDS");
        }

        // Payout stays 'pending' until external bank/PSP transfer confirms
        await tx.query(
          `INSERT INTO financial_transactions (id, user_id, type, amount, status, idempotency_key, reference, description)
           VALUES ($1, $2, 'payout', $3, 'pending', $4, $5, $6);`,
          [txId, user.id, numAmount, key, dest.slice(-8), `Solicitud de desembolso bancario hacia cuenta terminada en ${dest.slice(-4)}`]
        );

        await tx.query(
          `INSERT INTO audit_logs (id, actor_id, event_type, target_table, target_id, details)
           VALUES ($1, $2, 'WALLET_WITHDRAW_REQUESTED', 'financial_transactions', $3, $4);`,
          ["aud_" + crypto.randomUUID().slice(0, 12), user.id, txId, JSON.stringify({ amount: numAmount, idempotencyKey: key })]
        );
      });
    } catch (txErr: any) {
      if (txErr.message === "INSUFFICIENT_FUNDS") {
        res.status(402).json({ error: "Saldo disponible insuficiente para realizar este retiro" });
        return;
      }
      throw txErr;
    }

    const updated = await db.query("SELECT * FROM wallet_ledgers WHERE user_id = $1;", [user.id]);
    res.status(201).json({
      message: "Retiro registrado como pendiente de liquidación bancaria",
      transactionId: txId,
      status: "pending",
      wallet: updated.rows[0]
    });
  } catch {
    res.status(500).json({ error: "Error al registrar solicitud de retiro" });
  }
});

// GET /api/v1/wallet/webhooks (Admin inspection of reconciled payment events)
walletRouter.get("/webhooks", requireAuth, requireRole("admin"), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await db.query("SELECT * FROM payment_webhooks ORDER BY received_at DESC LIMIT 100;");
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Error al consultar webhooks de pago" });
  }
});
