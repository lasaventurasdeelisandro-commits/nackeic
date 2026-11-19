import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db } from "../db/index.ts";

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret && secret.length >= 32 && !secret.includes("REPLACE_WITH")) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET debe configurarse con al menos 32 caracteres seguros antes de iniciar producción.");
  }
  console.warn("[DEV ONLY] JWT_SECRET temporal: las sesiones se invalidarán al reiniciar.");
  return crypto.randomBytes(64).toString("hex");
}

const JWT_SECRET = resolveJwtSecret();

export function getJwtSecretForTests(): string {
  return JWT_SECRET;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: "cliente" | "tecnico" | "profesional" | "admin";
  fullName: string;
  jti?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  rawToken?: string;
}

export function generateToken(user: AuthenticatedUser): string {
  const jti = crypto.randomUUID();
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName
    },
    JWT_SECRET,
    { expiresIn: "7d", jwtid: jti }
  );
}

export async function revokeToken(token: string, userId?: string): Promise<void> {
  try {
    const decoded = jwt.decode(token) as (jwt.JwtPayload & AuthenticatedUser) | null;
    const jti = decoded?.jti || crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000).toISOString()
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await db.query(
      `INSERT INTO revoked_tokens (jti, user_id, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (jti) DO NOTHING;`,
      [jti, userId || decoded?.id || null, expiresAt]
    );
  } catch (err) {
    console.error("[Auth Revoke Warning]:", err);
  }
}

class AuthenticationError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function authenticateToken(token: string): Promise<AuthenticatedUser> {
  const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as jwt.JwtPayload & AuthenticatedUser;
  const jti = decoded.jti || crypto.createHash("sha256").update(token).digest("hex");
  const userResult = await db.query(
    `SELECT id, email, role, full_name AS "fullName", status,
            EXISTS (SELECT 1 FROM revoked_tokens WHERE jti = $2) AS revoked
     FROM users WHERE id = $1;`,
    [decoded.id, jti]
  );
  const user = userResult.rows[0];
  if (!user) throw new AuthenticationError(401, "Sesión inválida.");
  if (user.revoked) throw new AuthenticationError(401, "Sesión revocada. Inicia sesión nuevamente en Diclik.com.");
  if (user.status !== "active") throw new AuthenticationError(403, "Acceso denegado: Tu cuenta se encuentra suspendida.");
  return { id: user.id, email: user.email, role: user.role, fullName: user.fullName, jti };
}

export async function optionalUser(req: Request): Promise<AuthenticatedUser | null> {
  const token = req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) return null;
  try {
    return await authenticateToken(token);
  } catch {
    return null;
  }
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) {
    res.status(401).json({ error: "Acceso no autorizado: Token no proporcionado" });
    return;
  }
  try {
    req.user = await authenticateToken(token);
    req.rawToken = token;
    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    res.status(401).json({ error: "Token inválido o expirado. Inicia sesión nuevamente." });
  }
}

export function requireRole(...allowedRoles: Array<"cliente" | "tecnico" | "profesional" | "admin">) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Acceso denegado: El rol '${req.user.role}' no tiene permisos para realizar esta acción. Roles requeridos: ${allowedRoles.join(", ")}`
      });
      return;
    }

    next();
  };
}
