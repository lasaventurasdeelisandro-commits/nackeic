import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { db } from "../db/index.ts";
import { generateToken, revokeToken, requireAuth, AuthenticatedRequest } from "../middleware/auth.ts";
import { rateLimiter } from "../middleware/rateLimiter.ts";

export const authRouter = Router();

// Strict brute-force rate limiting on auth endpoints (max 20 attempts per minute)
authRouter.use(rateLimiter({ maxRequests: 20, windowMs: 60000 }));

// POST /api/v1/auth/register
authRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, role, fullName, phone, trade, credentialCode, address } = req.body;

    if (!email || !password || !role || !fullName) {
      res.status(400).json({ error: "Campos requeridos faltantes: email, password, role, fullName" });
      return;
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const cleanName = String(fullName).trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail) || cleanEmail.length > 255) {
      res.status(400).json({ error: "Formato de correo electrónico inválido" });
      return;
    }

    if (typeof password !== "string" || password.length < 8 || password.length > 128) {
      res.status(400).json({ error: "La contraseña debe tener entre 8 y 128 caracteres" });
      return;
    }

    if (cleanName.length < 2 || cleanName.length > 120) {
      res.status(400).json({ error: "El nombre completo debe tener entre 2 y 120 caracteres" });
      return;
    }

    if (!["cliente", "tecnico", "profesional"].includes(role)) {
      res.status(400).json({ error: "Rol no válido. Debe ser: cliente, tecnico o profesional" });
      return;
    }

    const existing = await db.query("SELECT id FROM users WHERE email = $1;", [cleanEmail]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "Ya existe una cuenta registrada con este correo electrónico" });
      return;
    }

    // Password hash using bcrypt (12 rounds for production strength)
    const passwordHash = await bcrypt.hash(password, 12);
    const userId = "usr_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);

    await db.transaction(async (tx) => {
      await tx.query(
        `INSERT INTO users (id, email, password_hash, role, status, full_name, phone, email_verified)
         VALUES ($1, $2, $3, $4, 'active', $5, $6, FALSE);`,
        [userId, cleanEmail, passwordHash, role, cleanName, phone ? String(phone).trim().slice(0, 32) : null]
      );

      if (role === "cliente") {
        await tx.query(
          `INSERT INTO client_profiles (user_id, default_address, lat, lng, total_requests)
           VALUES ($1, $2, 18.4861, -69.9312, 0);`,
          [userId, address ? String(address).trim().slice(0, 300) : "Santo Domingo, República Dominicana"]
        );
      } else {
        await tx.query(
          `INSERT INTO professional_profiles (user_id, trade, credential_code, bio, experience_years, rating, review_count, hourly_rate, verified, lat, lng, radius_km, is_available)
           VALUES ($1, $2, $3, $4, 1, 5.0, 0, 1500.0, FALSE, 18.4861, -69.9312, 10.0, TRUE);`,
          [
            userId,
            trade ? String(trade).trim().slice(0, 64) : "plomeria",
            credentialCode ? String(credentialCode).trim().slice(0, 128) : "EN-TRAMITE",
            "Especialista registrado en Diclik.com"
          ]
        );
      }

      await tx.query(
        `INSERT INTO wallet_ledgers (user_id, balance_available, balance_locked_escrow, total_earned, total_spent)
         VALUES ($1, 0.0, 0.0, 0.0, 0.0);`,
        [userId]
      );

      await tx.query(
        `INSERT INTO audit_logs (id, actor_id, event_type, target_table, target_id, ip_address, details)
         VALUES ($1, $2, 'USER_REGISTERED', 'users', $2, $3, $4);`,
        ["aud_" + crypto.randomUUID().slice(0, 12), userId, req.ip || null, JSON.stringify({ email: cleanEmail, role, fullName: cleanName })]
      );
    });

    const userPayload = {
      id: userId,
      email: cleanEmail,
      role,
      fullName: cleanName
    };

    const token = generateToken(userPayload);

    res.status(201).json({
      message: "Cuenta creada exitosamente en Diclik.com",
      user: userPayload,
      token
    });
  } catch (error: any) {
    console.error("[Auth Register Error]:", error?.message || error);
    res.status(500).json({ error: "Error en el servidor al procesar el registro" });
  }
});

// POST /api/v1/auth/login
authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password || typeof password !== "string") {
      res.status(400).json({ error: "Correo electrónico y contraseña requeridos" });
      return;
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const userQuery = await db.query(
      `SELECT id, email, password_hash, role, status, full_name, phone, avatar_url, email_verified
       FROM users WHERE email = $1;`,
      [cleanEmail]
    );

    if (userQuery.rows.length === 0) {
      res.status(401).json({ error: "Credenciales inválidas. Verifica tu correo y contraseña." });
      return;
    }

    const user = userQuery.rows[0];

    if (user.status !== "active") {
      await db.query(
        `INSERT INTO audit_logs (id, actor_id, event_type, target_table, target_id, ip_address, details)
         VALUES ($1, $2, 'LOGIN_BLOCKED_SUSPENDED', 'users', $2, $3, $4);`,
        ["aud_" + crypto.randomUUID().slice(0, 12), user.id, req.ip || null, JSON.stringify({ status: user.status })]
      );
      res.status(403).json({ error: "Tu cuenta ha sido restringida. Contacta a soporte de Diclik.com." });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      await db.query(
        `INSERT INTO audit_logs (id, actor_id, event_type, target_table, target_id, ip_address, details)
         VALUES ($1, $2, 'LOGIN_FAILED', 'users', $2, $3, $4);`,
        ["aud_" + crypto.randomUUID().slice(0, 12), user.id, req.ip || null, JSON.stringify({ email: cleanEmail })]
      );
      res.status(401).json({ error: "Credenciales inválidas. Verifica tu correo y contraseña." });
      return;
    }

    let profileData: any = null;
    if (user.role === "cliente") {
      const p = await db.query("SELECT user_id, default_address, lat, lng, total_requests, created_at FROM client_profiles WHERE user_id = $1;", [user.id]);
      profileData = p.rows[0] || null;
    } else {
      const p = await db.query("SELECT user_id, trade, bio, experience_years, rating, review_count, hourly_rate, verified, lat, lng, radius_km, is_available, created_at FROM professional_profiles WHERE user_id = $1;", [user.id]);
      profileData = p.rows[0] || null;
    }

    const walletQuery = await db.query("SELECT balance_available, balance_locked_escrow, total_earned, total_spent FROM wallet_ledgers WHERE user_id = $1;", [user.id]);
    const wallet = walletQuery.rows[0] || { balance_available: 0, balance_locked_escrow: 0 };

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name
    });

    await db.query(
      `INSERT INTO audit_logs (id, actor_id, event_type, target_table, target_id, ip_address, details)
       VALUES ($1, $2, 'USER_LOGIN', 'users', $2, $3, $4);`,
      ["aud_" + crypto.randomUUID().slice(0, 12), user.id, req.ip || null, JSON.stringify({ role: user.role })]
    );

    res.json({
      message: "Inicio de sesión exitoso en Diclik.com",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        emailVerified: user.email_verified
      },
      profile: profileData,
      wallet
    });
  } catch (error: any) {
    console.error("[Auth Login Error]:", error?.message || error);
    res.status(500).json({ error: "Error interno al procesar el inicio de sesión" });
  }
});

// POST /api/v1/auth/logout (Revoke JWT token)
authRouter.post("/logout", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    if (req.rawToken) {
      await revokeToken(req.rawToken, user.id);
    }

    await db.query(
      `INSERT INTO audit_logs (id, actor_id, event_type, target_table, target_id, ip_address, details)
       VALUES ($1, $2, 'USER_LOGOUT', 'users', $2, $3, $4);`,
      ["aud_" + crypto.randomUUID().slice(0, 12), user.id, req.ip || null, JSON.stringify({ jti: user.jti })]
    );

    res.json({ message: "Sesión cerrada y token revocado correctamente." });
  } catch {
    res.status(500).json({ error: "Error al revocar la sesión" });
  }
});

// GET /api/v1/auth/me
authRouter.get("/me", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const userDetails = await db.query(
      "SELECT id, email, role, full_name, phone, avatar_url, email_verified, created_at FROM users WHERE id = $1;",
      [user.id]
    );

    let profile: any = null;
    if (user.role === "cliente") {
      const cp = await db.query("SELECT user_id, default_address, lat, lng, total_requests, created_at FROM client_profiles WHERE user_id = $1;", [user.id]);
      profile = cp.rows[0] || null;
    } else {
      const pp = await db.query("SELECT user_id, trade, bio, experience_years, rating, review_count, hourly_rate, verified, lat, lng, radius_km, is_available, created_at FROM professional_profiles WHERE user_id = $1;", [user.id]);
      profile = pp.rows[0] || null;
    }

    const wallet = await db.query("SELECT balance_available, balance_locked_escrow, total_earned, total_spent FROM wallet_ledgers WHERE user_id = $1;", [user.id]);

    res.json({
      user: userDetails.rows[0],
      profile,
      wallet: wallet.rows[0] || { balance_available: 0, balance_locked_escrow: 0 }
    });
  } catch {
    res.status(500).json({ error: "Error al obtener perfil de usuario" });
  }
});

// PUT /api/v1/auth/profile (Update own profile)
authRouter.put("/profile", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { fullName, phone, address, trade, bio, hourlyRate, radiusKm, isAvailable } = req.body;

    await db.transaction(async (tx) => {
      if (fullName || phone !== undefined) {
        await tx.query(
          `UPDATE users
           SET full_name = COALESCE($1, full_name),
               phone = COALESCE($2, phone),
               updated_at = NOW()
           WHERE id = $3;`,
          [
            fullName ? String(fullName).trim().slice(0, 120) : null,
            phone !== undefined ? String(phone).trim().slice(0, 32) : null,
            user.id
          ]
        );
      }

      if (user.role === "cliente" && address) {
        await tx.query(
          "UPDATE client_profiles SET default_address = $1 WHERE user_id = $2;",
          [String(address).trim().slice(0, 300), user.id]
        );
      } else if (user.role === "tecnico" || user.role === "profesional") {
        await tx.query(
          `UPDATE professional_profiles
           SET trade = COALESCE($1, trade),
               bio = COALESCE($2, bio),
               hourly_rate = COALESCE($3, hourly_rate),
               radius_km = COALESCE($4, radius_km),
               is_available = COALESCE($5, is_available)
           WHERE user_id = $6;`,
          [
            trade ? String(trade).trim().slice(0, 64) : null,
            bio !== undefined ? String(bio).trim().slice(0, 1000) : null,
            hourlyRate !== undefined && Number(hourlyRate) > 0 ? Number(hourlyRate) : null,
            radiusKm !== undefined && Number(radiusKm) >= 1 && Number(radiusKm) <= 100 ? Number(radiusKm) : null,
            typeof isAvailable === "boolean" ? isAvailable : null,
            user.id
          ]
        );
      }

      await tx.query(
        `INSERT INTO audit_logs (id, actor_id, event_type, target_table, target_id, details)
         VALUES ($1, $2, 'PROFILE_UPDATED', 'users', $2, $3);`,
        ["aud_" + crypto.randomUUID().slice(0, 12), user.id, JSON.stringify({ role: user.role })]
      );
    });

    res.json({ message: "Perfil actualizado correctamente en Diclik.com" });
  } catch {
    res.status(500).json({ error: "Error al actualizar perfil" });
  }
});

// POST /api/v1/auth/forgot-password (Generate time-limited temporary token)
authRouter.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: "El correo electrónico es obligatorio" });
      return;
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const smtpUrl = process.env.SMTP_URL?.trim();
    const sender = process.env.PASSWORD_RESET_FROM?.trim();
    const isTest = process.env.NODE_ENV === "test";
    if (!isTest && (!smtpUrl || !sender)) {
      res.status(503).json({ error: "El servicio de recuperación de contraseña no está disponible." });
      return;
    }
    const userRes = await db.query("SELECT id FROM users WHERE email = $1;", [cleanEmail]);

    // Always respond identically to avoid email enumeration
    if (userRes.rows.length > 0) {
      const userId = userRes.rows[0].id;
      const rawToken = crypto.randomBytes(24).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      await db.query(
        `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used)
         VALUES ($1, $2, $3, $4, FALSE);`,
        ["prt_" + crypto.randomUUID().slice(0, 12), userId, tokenHash, expiresAt]
      );

      await db.query(
        `INSERT INTO audit_logs (id, actor_id, event_type, target_table, target_id, ip_address, details)
         VALUES ($1, $2, 'PASSWORD_RESET_REQUESTED', 'users', $2, $3, $4);`,
        ["aud_" + crypto.randomUUID().slice(0, 12), userId, req.ip || null, JSON.stringify({ expiresAt })]
      );
      if (!isTest && smtpUrl && sender) {
        try {
          await nodemailer.createTransport(smtpUrl).sendMail({
            from: sender,
            to: cleanEmail,
            subject: "Código de recuperación de Diclik.com",
            text: `Introduce este código en la pantalla de recuperación de Diclik.com: ${rawToken}. Caduca en 15 minutos.`,
          });
        } catch {
          console.error("[Auth] No se pudo enviar un código de recuperación por SMTP.");
          await db.query("DELETE FROM password_reset_tokens WHERE token_hash = $1;", [tokenHash]);
        }
      }
    }

    res.json({
      message: "Si el correo existe en Diclik.com, recibirás instrucciones válidas por 15 minutos."
    });
  } catch {
    res.status(500).json({ error: "Error al procesar solicitud de recuperación" });
  }
});

// POST /api/v1/auth/reset-password (Validate temporary token and update password)
authRouter.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (typeof token !== "string" || !/^[a-f0-9]{48}$/i.test(token.trim()) || typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 128) {
      res.status(400).json({ error: "Token válido y contraseña nueva (mínimo 8 caracteres) requeridos" });
      return;
    }

    const tokenHash = crypto.createHash("sha256").update(String(token).trim()).digest("hex");
    // Consume the token atomically so concurrent requests cannot reuse it.
    // All password changes and token revocations occur in the same transaction.
    const newHash = await bcrypt.hash(newPassword, 12);
    let consumed = false;
    await db.transaction(async (tx) => {
      const claimed = await tx.query(
        `UPDATE password_reset_tokens
         SET used = TRUE
         WHERE token_hash = $1 AND used = FALSE AND expires_at > NOW()
         RETURNING id, user_id;`,
        [tokenHash]
      );
      if (claimed.rows.length !== 1) return;
      consumed = true;
      const userId = claimed.rows[0].user_id;
      await tx.query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2;", [newHash, userId]);
      await tx.query(
        `INSERT INTO audit_logs (id, actor_id, event_type, target_table, target_id, ip_address, details)
         VALUES ($1, $2, 'PASSWORD_RESET_COMPLETED', 'users', $2, $3, '{}');`,
        ["aud_" + crypto.randomUUID().slice(0, 12), userId, req.ip || null]
      );
    });
    if (!consumed) {
      res.status(400).json({ error: "Token de recuperación inválido o expirado" });
      return;
    }

    res.json({ message: "Contraseña restablecida correctamente en Diclik.com" });
  } catch {
    res.status(500).json({ error: "Error al restablecer contraseña" });
  }
});
