import { Router, Response } from "express";
import crypto from "crypto";
import { db } from "../db/index.ts";
import { requireAuth, requireRole, AuthenticatedRequest } from "../middleware/auth.ts";

export const adminRouter = Router();

// Protect all admin endpoints with admin role check
adminRouter.use(requireAuth, requireRole("admin"));

// GET /api/v1/admin/metrics
adminRouter.get("/metrics", async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const totalUsers = await db.query("SELECT COUNT(*) as count FROM users;");
    const totalPros = await db.query("SELECT COUNT(*) as count FROM professional_profiles WHERE verified = TRUE;");
    const totalRequests = await db.query("SELECT COUNT(*) as count FROM service_requests;");
    const activeContracts = await db.query("SELECT COUNT(*) as count FROM contracts WHERE status IN ('held_in_escrow', 'active_in_transit', 'in_progress');");
    const openDisputes = await db.query("SELECT COUNT(*) as count FROM disputes WHERE status IN ('open', 'under_review');");
    const totalEscrowLocked = await db.query("SELECT COALESCE(SUM(amount), 0) as total FROM escrow_holds WHERE status = 'locked';");
    const totalCommissionEarned = await db.query("SELECT COALESCE(SUM(amount), 0) as total FROM financial_transactions WHERE type = 'fee_deduction';");

    res.json({
      totalUsers: parseInt(totalUsers.rows[0].count, 10),
      verifiedProfessionals: parseInt(totalPros.rows[0].count, 10),
      totalRequests: parseInt(totalRequests.rows[0].count, 10),
      activeContracts: parseInt(activeContracts.rows[0].count, 10),
      openDisputes: parseInt(openDisputes.rows[0].count, 10),
      escrowLockedRD: parseFloat(totalEscrowLocked.rows[0].total),
      platformEarningsRD: parseFloat(totalCommissionEarned.rows[0].total),
      timestamp: new Date().toISOString()
    });
  } catch {
    res.status(500).json({ error: "Error al recopilar métricas operativas" });
  }
});

// GET /api/v1/admin/users
adminRouter.get("/users", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { role, status } = req.query;
    let query = `
      SELECT u.id, u.email, u.role, u.status, u.full_name, u.phone, u.created_at,
             pp.trade, pp.verified, pp.rating, pp.review_count,
             wl.balance_available, wl.balance_locked_escrow
      FROM users u
      LEFT JOIN professional_profiles pp ON u.id = pp.user_id
      LEFT JOIN wallet_ledgers wl ON u.id = wl.user_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (role) {
      params.push(role);
      query += ` AND u.role = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND u.status = $${params.length}`;
    }

    query += " ORDER BY u.created_at DESC LIMIT 100;";

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Error al listar usuarios para administración" });
  }
});

// PATCH /api/v1/admin/professionals/:id/verify
adminRouter.patch("/professionals/:id/verify", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { verified } = req.body;

    const updated = await db.query(
      "UPDATE professional_profiles SET verified = $1 WHERE user_id = $2;",
      [Boolean(verified), id]
    );

    if ((updated.rowCount ?? 0) === 0) {
      res.status(404).json({ error: "Perfil profesional no encontrado" });
      return;
    }

    await db.query(
      `INSERT INTO audit_logs (id, actor_id, event_type, target_table, target_id, details)
       VALUES ($1, $2, 'PRO_VERIFICATION_STATUS_CHANGED', 'professional_profiles', $3, $4);`,
      ["aud_" + crypto.randomUUID().slice(0, 12), req.user!.id, id, JSON.stringify({ verified: Boolean(verified) })]
    );

    res.json({ message: "Estado de acreditación actualizado correctamente" });
  } catch {
    res.status(500).json({ error: "Error al actualizar acreditación del profesional" });
  }
});

// PATCH /api/v1/admin/users/:id/status (Activate, suspend or ban a user account)
adminRouter.patch("/users/:id/status", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["active", "pending_verification", "suspended", "banned"].includes(status)) {
      res.status(400).json({ error: "Estado de usuario inválido" });
      return;
    }
    if (id === req.user!.id) {
      res.status(400).json({ error: "No puedes modificar tu propio estado administrativo" });
      return;
    }

    const updated = await db.query(
      "UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2;",
      [status, id]
    );
    if ((updated.rowCount ?? 0) === 0) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    await db.query(
      `INSERT INTO audit_logs (id, actor_id, event_type, target_table, target_id, details)
       VALUES ($1, $2, 'USER_STATUS_CHANGED', 'users', $3, $4);`,
      ["aud_" + crypto.randomUUID().slice(0, 12), req.user!.id, id, JSON.stringify({ status })]
    );

    res.json({ message: "Estado de usuario actualizado correctamente", userId: id, status });
  } catch {
    res.status(500).json({ error: "Error al actualizar estado del usuario" });
  }
});

// GET /api/v1/admin/disputes
adminRouter.get("/disputes", async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await db.query(
      `SELECT d.*,
              c.agreed_price, c.client_id, c.professional_id, c.status as contract_status,
              sr.title as request_title,
              cu.full_name as client_name, pu.full_name as pro_name
       FROM disputes d
       JOIN contracts c ON d.contract_id = c.id
       JOIN service_requests sr ON c.request_id = sr.id
       JOIN users cu ON c.client_id = cu.id
       JOIN users pu ON c.professional_id = pu.id
       ORDER BY d.created_at DESC
       LIMIT 100;`
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Error al consultar disputas y reclamaciones" });
  }
});

// POST /api/v1/admin/disputes/:id/resolve
adminRouter.post("/disputes/:id/resolve", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { decision, notes } = req.body; // 'refund_client' | 'release_pro'

    if (decision !== "refund_client" && decision !== "release_pro") {
      res.status(400).json({ error: "Decisión inválida. Use 'refund_client' o 'release_pro'" });
      return;
    }

    const disputeRes = await db.query("SELECT * FROM disputes WHERE id = $1;", [id]);
    if (disputeRes.rows.length === 0) {
      res.status(404).json({ error: "Disputa no encontrada" });
      return;
    }

    const dispute = disputeRes.rows[0];
    if (dispute.status === "resolved_refund_client" || dispute.status === "resolved_release_pro") {
      res.status(409).json({ error: "Esta disputa ya fue resuelta previamente" });
      return;
    }

    const contractRes = await db.query("SELECT * FROM contracts WHERE id = $1;", [dispute.contract_id]);
    if (contractRes.rows.length === 0) {
      res.status(404).json({ error: "Contrato asociado no encontrado" });
      return;
    }
    const contract = contractRes.rows[0];
    const resolutionNotes = String(notes || `Resolución administrativa Diclik.com (${decision})`).trim();

    await db.transaction(async (tx) => {
      const nextStatus = decision === "refund_client" ? "resolved_refund_client" : "resolved_release_pro";
      const updated = await tx.query(
        `UPDATE disputes SET status = $1, resolution_notes = $2, resolved_by = $3, resolved_at = NOW()
         WHERE id = $4 AND status IN ('open', 'under_review') RETURNING id;`,
        [nextStatus, resolutionNotes, req.user!.id, id]
      );
      if (!updated.rows.length) throw new Error("DISPUTE_STATE_CHANGED");
      if (decision === "refund_client") {
        await tx.query("UPDATE contracts SET status = 'cancelled' WHERE id = $1;", [contract.id]);
        await tx.query("UPDATE service_requests SET status = 'cancelled', updated_at = NOW() WHERE id = $1;", [contract.request_id]);
        await tx.query(
          "UPDATE escrow_holds SET status = 'refunded_to_client', refunded_at = NOW(), reason = $1 WHERE contract_id = $2;",
          [resolutionNotes, contract.id]
        );
        await tx.query(
          `UPDATE wallet_ledgers
           SET balance_locked_escrow = GREATEST(0, balance_locked_escrow - $1),
               balance_available = balance_available + $1,
               updated_at = NOW()
           WHERE user_id = $2;`,
          [contract.agreed_price, contract.client_id]
        );
        await tx.query(
          `INSERT INTO financial_transactions (id, user_id, contract_id, type, amount, status, idempotency_key, description)
           VALUES ($1, $2, $3, 'refund', $4, 'completed', $5, $6);`,
          [
            "tx_" + crypto.randomUUID().slice(0, 12),
            contract.client_id,
            contract.id,
            contract.agreed_price,
            "idem_dispute_refund_" + id,
            `Reembolso total por resolución de disputa (${id}): ${resolutionNotes}`
          ]
        );
      } else {
        await tx.query("UPDATE contracts SET status = 'completed', completed_at = NOW() WHERE id = $1;", [contract.id]);
        await tx.query("UPDATE service_requests SET status = 'completed', updated_at = NOW() WHERE id = $1;", [contract.request_id]);
        await tx.query(
          "UPDATE escrow_holds SET status = 'released_to_pro', released_at = NOW(), reason = $1 WHERE contract_id = $2;",
          [resolutionNotes, contract.id]
        );
        await tx.query(
          `UPDATE wallet_ledgers
           SET balance_locked_escrow = GREATEST(0, balance_locked_escrow - $1),
               total_spent = total_spent + $1,
               updated_at = NOW()
           WHERE user_id = $2;`,
          [contract.agreed_price, contract.client_id]
        );
        await tx.query(
          `UPDATE wallet_ledgers
           SET balance_available = balance_available + $1,
               total_earned = total_earned + $1,
               updated_at = NOW()
           WHERE user_id = $2;`,
          [contract.professional_payout, contract.professional_id]
        );
        await tx.query(
          `INSERT INTO financial_transactions (id, user_id, contract_id, type, amount, status, idempotency_key, description)
           VALUES ($1, $2, $3, 'escrow_release', $4, 'completed', $5, $6);`,
          [
            "tx_" + crypto.randomUUID().slice(0, 12),
            contract.professional_id,
            contract.id,
            contract.professional_payout,
            "idem_dispute_release_" + id,
            `Liberación Escrow tras resolución de disputa (${id})`
          ]
        );
        await tx.query(
          `INSERT INTO financial_transactions (id, user_id, contract_id, type, amount, status, idempotency_key, description)
           VALUES ($1, NULL, $2, 'fee_deduction', $3, 'completed', $4, $5);`,
          [
            "tx_" + crypto.randomUUID().slice(0, 12),
            contract.id,
            contract.platform_fee,
            "idem_dispute_fee_" + id,
            "Comisión de plataforma Diclik.com por resolución de disputa"
          ]
        );
      }

      await tx.query(
        `INSERT INTO audit_logs (id, actor_id, event_type, target_table, target_id, details)
         VALUES ($1, $2, 'DISPUTE_RESOLVED', 'disputes', $3, $4);`,
        ["aud_" + crypto.randomUUID().slice(0, 12), req.user!.id, id, JSON.stringify({ decision, notes: resolutionNotes })]
      );
    });

    res.json({ message: "Disputa resuelta y fondos conciliados en PostgreSQL", decision, disputeId: id });
  } catch (error: any) {
    if (error?.message === "DISPUTE_STATE_CHANGED") {
      res.status(409).json({ error: "El estado de la disputa cambió antes de resolverla." });
      return;
    }
    console.error("[Admin Resolve Dispute Error]:", error?.message);
    res.status(500).json({ error: "Error al resolver la disputa" });
  }
});

// GET /api/v1/admin/audit-logs
adminRouter.get("/audit-logs", async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await db.query(
      `SELECT al.*, u.email as actor_email, u.full_name as actor_name
       FROM audit_logs al
       LEFT JOIN users u ON al.actor_id = u.id
       ORDER BY al.created_at DESC
       LIMIT 100;`
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Error al consultar bitácora de auditoría" });
  }
});
