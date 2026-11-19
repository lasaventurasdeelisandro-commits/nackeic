import path from "path";
import fs from "fs";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export interface QueryResult<T = any> {
  rows: T[];
  rowCount?: number;
}

class DatabaseManager {
  private pgliteInstance: PGlite | null = null;
  private pgPool: Pool | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.isInitialized) return;
    if (!this.initPromise) {
      this.initPromise = this._doInit().catch((err) => {
        this.initPromise = null;
        throw err;
      });
    }
    return this.initPromise;
  }

  private async _doInit(): Promise<void> {
    if (this.isInitialized) return;

    if (process.env.NODE_ENV === "test") {
      this.pgliteInstance = new PGlite();
      await this.pgliteInstance.waitReady;
    } else {
      const sqlHost = process.env.SQL_HOST;
      const databaseUrl = process.env.DATABASE_URL;

      if (sqlHost || databaseUrl) {
        console.log("[DB] Connecting to external PostgreSQL server via pg.Pool...");
        const useSsl =
          process.env.PGSSLMODE !== "disable" &&
          (process.env.NODE_ENV === "production" || process.env.PGSSLMODE === "require");

        this.pgPool = new Pool({
          host: process.env.SQL_HOST,
          user: process.env.SQL_USER,
          password: process.env.SQL_PASSWORD,
          database: process.env.SQL_DB_NAME,
          connectionString: databaseUrl,
          max: parseInt(process.env.PG_POOL_MAX || "20", 10),
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
          ssl: useSsl
            ? { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== "false" }
            : undefined,
        });

        this.pgPool.on("error", (err) => {
          console.error("[DB] Unexpected error on idle client in pg.Pool:", err);
        });
      } else {
        if (process.env.NODE_ENV === "production") {
          throw new Error("DATABASE_URL o SQL_HOST es obligatorio en producción; PGlite no está permitido.");
        }
        console.log("[DB] Initializing embedded PostgreSQL engine (PGlite) with filesystem persistence...");
        const dataDir = path.join(process.cwd(), "data", "postgres");
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        this.pgliteInstance = new PGlite(dataDir);
        await this.pgliteInstance.waitReady;
      }
    }

    this.isInitialized = true;
    try {
      await this.runMigrations();
      await this.seedInitialData();
    } catch (error) {
      this.isInitialized = false;
      throw error;
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      if (this.pgPool) {
        const res = await this.pgPool.query(sql, params);
        return { rows: res.rows as T[], rowCount: res.rowCount ?? 0 };
      } else if (this.pgliteInstance) {
        const res = await this.pgliteInstance.query<T>(sql, params);
        return { rows: res.rows, rowCount: (res as any).affectedRows ?? res.rows.length };
      }
      throw new Error("No database driver initialized");
    } catch (error: any) {
      console.error("[DB Query Error]:", error.message);
      throw error;
    }
  }

  async transaction<T>(callback: (client: { query: <R = any>(sql: string, params?: any[]) => Promise<QueryResult<R>> }) => Promise<T>): Promise<T> {
    if (!this.isInitialized) {
      await this.init();
    }

    if (this.pgPool) {
      const client = await this.pgPool.connect();
      try {
        await client.query("BEGIN");
        const wrapped = {
          query: async <R = any>(sql: string, params: any[] = []) => {
            const res = await client.query(sql, params);
            return { rows: res.rows as R[], rowCount: res.rowCount ?? 0 };
          }
        };
        const result = await callback(wrapped);
        await client.query("COMMIT");
        return result;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    } else if (this.pgliteInstance) {
      return await this.pgliteInstance.transaction(async (tx) => {
        const wrapped = {
          query: async <R = any>(sql: string, params: any[] = []) => {
            const res = await tx.query<R>(sql, params);
            return { rows: res.rows, rowCount: (res as any).affectedRows ?? res.rows.length };
          }
        };
        return await callback(wrapped);
      });
    }

    throw new Error("Database not available for transaction");
  }

  private async runMigrations(): Promise<void> {
    console.log("[DB] Verifying and running PostgreSQL versioned migrations...");
    const migrationsDir = path.join(process.cwd(), "src", "server", "db", "migrations");
    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`No se encontró el directorio de migraciones: ${migrationsDir}`);
    }

    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of migrationFiles) {
      const version = file.replace(/\.sql$/, "");
      const migrationPath = path.join(migrationsDir, file);
      const migrationSql = fs.readFileSync(migrationPath, "utf-8");

      const statements = migrationSql
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      await this.transaction(async (tx) => {
        for (const statement of statements) {
          await tx.query(statement);
        }
        await tx.query(
          "INSERT INTO schema_migrations (version, description) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING;",
          [version, `Applied enterprise migration ${file}`]
        );
      });
    }

    console.log(`[DB] ${migrationFiles.length} PostgreSQL migrations applied successfully.`);
  }

  private async seedInitialData(): Promise<void> {
    try {
      // 1. Seed Categories if empty (official catalog required in all environments)
      const catCount = await this.query("SELECT COUNT(*) as count FROM service_categories;");
      if (parseInt(catCount.rows[0]?.count || "0", 10) === 0) {
        console.log("[DB] Seeding official service categories...");
        const categories = [
          { id: "plomeria", name: "Plomería y Filtraciones", slug: "plomeria", icon: "Wrench", desc: "Fugas de agua, bombas, tuberías, tinacos e inodoros.", price: 2000.0 },
          { id: "electricidad", name: "Electricidad y Paneles", slug: "electricidad", icon: "Zap", desc: "Cortocircuitos, plantas eléctricas, inversores y paneles.", price: 2200.0 },
          { id: "climatizacion", name: "Aire Acondicionado & HVAC", slug: "climatizacion", icon: "Wind", desc: "Mantenimiento, recarga de gas y reparación de split.", price: 2500.0 },
          { id: "cerrajeria", name: "Cerrajería Residencial y Autos", slug: "cerrajeria", icon: "Key", desc: "Apertura urgente 24/7, candados y cerraduras inteligentes.", price: 1800.0 },
          { id: "mecanica", name: "Mecánica Ligera y Grúas", slug: "mecanica", icon: "Car", desc: "Auxilio vial, cambio de batería, frenos y neumáticos.", price: 2800.0 },
          { id: "salud", name: "Salud, Médicos y Pediatras", slug: "salud", icon: "Stethoscope", desc: "Consultas médicas a domicilio, urgencias y enfermería.", price: 4000.0 },
          { id: "legal", name: "Legal y Notaría", slug: "legal", icon: "Scale", desc: "Asesoría jurídica, contratos inmobiliarios y declaraciones.", price: 5000.0 },
          { id: "ingenieria", name: "Ingeniería Estructural (CODIA)", slug: "ingenieria", icon: "Activity", desc: "Peritajes de grietas, cálculo de carga y dictámenes.", price: 6500.0 },
          { id: "arquitectura", name: "Arquitectura y DRO", slug: "arquitectura", icon: "Compass", desc: "Planos arquitectónicos, licencias de construcción y reformas.", price: 6000.0 },
        ];

        for (const cat of categories) {
          await this.query(
            "INSERT INTO service_categories (id, name, slug, icon, description, base_min_price, is_active) VALUES ($1, $2, $3, $4, $5, $6, TRUE) ON CONFLICT (id) DO NOTHING;",
            [cat.id, cat.name, cat.slug, cat.icon, cat.desc, cat.price]
          );
        }
      }

      // 2. Optional Admin Bootstrap via explicit production environment variables
      const bootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
      const bootstrapPwd = process.env.BOOTSTRAP_ADMIN_PASSWORD?.trim();
      if (bootstrapEmail && bootstrapPwd && bootstrapPwd.length >= 12) {
        const existingAdmin = await this.query("SELECT id FROM users WHERE email = $1;", [bootstrapEmail]);
        if (existingAdmin.rows.length === 0) {
          const bcrypt = await import("bcryptjs");
          const adminHash = await bcrypt.hash(bootstrapPwd, 12);
          await this.query(
            "INSERT INTO users (id, email, password_hash, role, status, full_name, email_verified) VALUES ($1, $2, $3, 'admin', 'active', 'Administrador Diclik.com', TRUE);",
            ["usr_admin_" + Date.now().toString(36), bootstrapEmail, adminHash]
          );
          console.log("[DB] Production admin bootstrapped from environment variables.");
        }
      }

      // 3. Seed Sample Demo Accounts ONLY in non-production or when SEED_DEMO_DATA=true
      const allowDemoSeed = process.env.NODE_ENV !== "production" && process.env.SEED_DEMO_DATA === "true";
      const userCount = await this.query("SELECT COUNT(*) as count FROM users;");
      if (allowDemoSeed && parseInt(userCount.rows[0]?.count || "0", 10) === 0) {
        console.log("[DB] Seeding non-production demo users and specialists...");
        const bcrypt = await import("bcryptjs");
        const defaultHash = await bcrypt.hash("Directo2026!", 10);

        // Admin User (non-production only)
        await this.query(
          "INSERT INTO users (id, email, password_hash, role, status, full_name, phone, email_verified) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE);",
          ["usr_admin", "admin@directo.app", defaultHash, "admin", "active", "Director de Operaciones Diclik.com", "+18095550100"]
        );

        // Demo Client User
        await this.query(
          "INSERT INTO users (id, email, password_hash, role, status, full_name, phone, email_verified) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE);",
          ["usr_client_01", "cliente@directo.app", defaultHash, "cliente", "active", "Carlos Mendoza", "+18095550101"]
        );
        await this.query(
          "INSERT INTO client_profiles (user_id, default_address, lat, lng, total_requests) VALUES ($1, $2, $3, $4, $5);",
          ["usr_client_01", "Av. Winston Churchill #402, Piantini, Santo Domingo", 18.4861, -69.9312, 1]
        );
        await this.query(
          "INSERT INTO wallet_ledgers (user_id, balance_available, balance_locked_escrow) VALUES ($1, 15000.0, 0.0);",
          ["usr_client_01"]
        );

        // Demo Specialist 1: Plumber
        await this.query(
          "INSERT INTO users (id, email, password_hash, role, status, full_name, phone, avatar_url, email_verified) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE);",
          ["usr_pro_01", "ramon.plomero@directo.app", defaultHash, "tecnico", "active", "Ramón Valdez (Plomero Certificado)", "+18095550201", "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&w=256&q=80"]
        );
        await this.query(
          "INSERT INTO professional_profiles (user_id, trade, credential_code, bio, experience_years, rating, review_count, hourly_rate, verified, lat, lng, radius_km, is_available) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9, $10, 8.0, TRUE);",
          ["usr_pro_01", "plomeria", "CERT-INFOTEP-8821", "Técnico en plomería hidráulica y residencial. Detección no destructiva de fugas.", 12, 4.95, 142, 2200.0, 18.4890, -69.9330]
        );
        await this.query(
          "INSERT INTO wallet_ledgers (user_id, balance_available, balance_locked_escrow, total_earned) VALUES ($1, 48000.0, 0.0, 154000.0);",
          ["usr_pro_01"]
        );

        // Demo Specialist 2: Electrician
        await this.query(
          "INSERT INTO users (id, email, password_hash, role, status, full_name, phone, avatar_url, email_verified) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE);",
          ["usr_pro_02", "marcos.electricista@directo.app", defaultHash, "tecnico", "active", "Ing. Marcos Peña (Electricista Matriculado)", "+18095550202", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80"]
        );
        await this.query(
          "INSERT INTO professional_profiles (user_id, trade, credential_code, bio, experience_years, rating, review_count, hourly_rate, verified, lat, lng, radius_km, is_available) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9, $10, 10.0, TRUE);",
          ["usr_pro_02", "electricidad", "CODIA-ELEC-4412", "Especialista en cortocircuitos, inversores solares y balanceo de carga.", 9, 4.92, 98, 2500.0, 18.4820, -69.9280]
        );
        await this.query(
          "INSERT INTO wallet_ledgers (user_id, balance_available, balance_locked_escrow, total_earned) VALUES ($1, 35000.0, 0.0, 92000.0);",
          ["usr_pro_02"]
        );

        // Initial Sample Request
        await this.query(
          `INSERT INTO service_requests (id, client_id, category_id, target_role, title, description, address, lat, lng, urgency, budget_strategy, min_budget, status, release_code)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);`,
          [
            "req_live_01",
            "usr_client_01",
            "plomeria",
            "tecnico",
            "Fuga continua en tubería de lavamanos principal",
            "Gotea a chorro bajo el lavamanos, requiere cambio de mangueras flexibles y sellado de desagüe.",
            "Av. Winston Churchill #402, Piantini, Santo Domingo",
            18.4861,
            -69.9312,
            "urgente",
            "intemperie",
            2400.0,
            "open",
            "8492"
          ]
        );

        await this.query(
          `INSERT INTO offers (id, request_id, professional_id, price, eta_minutes, message, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7);`,
          [
            "off_live_01",
            "req_live_01",
            "usr_pro_01",
            2200.0,
            12,
            "Hola Carlos, tengo el kit de conectores flexibles y teflón de alta presión en mi vehículo. Puedo llegar en 12 minutos.",
            "pending"
          ]
        );
      }
    } catch (e: any) {
      console.warn("[DB Seed Warning]:", e.message);
    }
  }
}

export const db = new DatabaseManager();
