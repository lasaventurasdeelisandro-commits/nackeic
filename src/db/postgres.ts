import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

export interface PostgresConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
}

// Configured using environment variables with the Object Method
export function getPostgresPool(config?: PostgresConfig): pg.Pool {
  const host = config?.host || process.env.SQL_HOST || process.env.PGHOST || '127.0.0.1';
  const port = config?.port || (process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432);
  const user = config?.user || process.env.SQL_USER || process.env.PGUSER || 'postgres';
  const password = config?.password || process.env.SQL_PASSWORD || process.env.PGPASSWORD || '';
  const database = config?.database || process.env.SQL_DB_NAME || process.env.PGDATABASE || 'nakeic_db';

  return new Pool({
    host,
    port,
    user,
    password,
    database,
    max: 10,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
  });
}

export class PostgresService {
  private pool: pg.Pool;
  private isConnected: boolean = false;

  constructor(pool?: pg.Pool) {
    this.pool = pool || getPostgresPool();
    this.pool.on('error', (err) => {
      console.warn('[NAKEIC PostgreSQL] Pool error:', err.message);
    });
  }

  async checkHealth(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      try {
        const res = await client.query('SELECT 1 as alive');
        this.isConnected = res.rows.length > 0;
        return this.isConnected;
      } finally {
        client.release();
      }
    } catch {
      this.isConnected = false;
      return false;
    }
  }

  async runMigrations(): Promise<void> {
    const migrationFile = path.resolve(process.cwd(), 'src/db/migrations/0001_initial_schema.sql');
    if (!fs.existsSync(migrationFile)) {
      throw new Error(`Migration file not found at ${migrationFile}`);
    }
    const sql = fs.readFileSync(migrationFile, 'utf-8');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log('[NAKEIC PostgreSQL] Migrations executed successfully.');
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw new Error(`Migration failed: ${err.message}`);
    } finally {
      client.release();
    }
  }

  // Safe migration from existing data/db.json without data loss or duplication
  async migrateFromExistingJson(jsonPath: string): Promise<{ users: number; convs: number; msgs: number }> {
    if (!fs.existsSync(jsonPath)) {
      return { users: 0, convs: 0, msgs: 0 };
    }
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const data = JSON.parse(raw);

    const client = await this.pool.connect();
    let migratedUsers = 0;
    let migratedConvs = 0;
    let migratedMsgs = 0;

    try {
      await client.query('BEGIN');

      // 1. Users
      if (data.users) {
        for (const u of Object.values<any>(data.users)) {
          await client.query(
            `INSERT INTO users (id, phone_number, display_name, username, bio, avatar_url, is_online, last_seen, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (id) DO UPDATE SET
               display_name = EXCLUDED.display_name,
               avatar_url = EXCLUDED.avatar_url,
               is_online = EXCLUDED.is_online,
               last_seen = EXCLUDED.last_seen`,
            [u.id, u.phoneNumber || `+000000000_${u.id}`, u.displayName || 'Usuario NAKEIC', u.username || null, u.bio || '', u.avatarUrl || null, !!u.isOnline, u.lastSeen || Date.now(), u.createdAt || Date.now()]
          );
          migratedUsers++;
        }
      }

      // 2. Conversations and Participants
      if (data.conversations) {
        for (const c of Object.values<any>(data.conversations)) {
          await client.query(
            `INSERT INTO conversations (id, type, title, avatar_url, is_channel, is_business, is_saved_messages, is_pinned, disappearing_duration_seconds, last_message_text, last_message_time, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             ON CONFLICT (id) DO UPDATE SET
               last_message_text = EXCLUDED.last_message_text,
               last_message_time = EXCLUDED.last_message_time,
               updated_at = EXCLUDED.updated_at`,
            [c.id, c.type || 'direct', c.title || 'Chat NAKEIC', c.avatarUrl || null, !!c.isChannel, !!c.isBusiness, !!c.isSavedMessages, !!c.isPinned, c.disappearingDurationSeconds || 0, c.lastMessageText || '', c.lastMessageTime || Date.now(), c.createdAt || Date.now(), Date.now()]
          );
          migratedConvs++;

          if (Array.isArray(c.participantIds)) {
            for (const pid of c.participantIds) {
              if (data.users && data.users[pid]) {
                await client.query(
                  `INSERT INTO conversation_participants (conversation_id, user_id, unread_count, joined_at)
                   VALUES ($1, $2, $3, $4)
                   ON CONFLICT (conversation_id, user_id) DO NOTHING`,
                  [c.id, pid, (c.unreadCounts && c.unreadCounts[pid]) || 0, c.createdAt || Date.now()]
                );
              }
            }
          }
        }
      }

      // 3. Messages (Preserving E2EE ciphertexts intact)
      if (data.messages) {
        for (const [convId, msgList] of Object.entries<any>(data.messages)) {
          if (!Array.isArray(msgList)) continue;
          for (const m of msgList) {
            // Ensure sender exists in DB
            if (data.users && data.users[m.senderId]) {
              await client.query(
                `INSERT INTO messages (id, conversation_id, sender_id, sender_name, sender_avatar, text, message_type, media_url, file_name, file_size, status, disappearing_after_timestamp, timestamp)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                 ON CONFLICT (id) DO UPDATE SET
                   status = EXCLUDED.status`,
                [m.id, convId, m.senderId, m.senderName || '', m.senderAvatar || null, m.text || '', m.type || 'text', m.mediaUrl || null, m.fileName || null, m.fileSize || null, m.status || 'sent', m.disappearingAfterTimestamp || null, m.timestamp || Date.now()]
              );
              migratedMsgs++;
            }
          }
        }
      }

      await client.query('COMMIT');
      console.log(`[NAKEIC PostgreSQL] Migración completada: ${migratedUsers} usuarios, ${migratedConvs} conversaciones, ${migratedMsgs} mensajes.`);
      return { users: migratedUsers, convs: migratedConvs, msgs: migratedMsgs };
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('[NAKEIC PostgreSQL] Error durante la migración JSON -> PostgreSQL:', err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  getPool(): pg.Pool {
    return this.pool;
  }
}
