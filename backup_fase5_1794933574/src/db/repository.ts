import { PostgresService, getPostgresPool } from './postgres.ts';
import pg from 'pg';

export interface UserEntity {
  id: string;
  phoneNumber: string;
  displayName: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  isOnline: boolean;
  lastSeen: number;
  fcmToken?: string;
  createdAt: number;
}

export interface SessionEntity {
  id: string;
  userId: string;
  token: string;
  deviceName: string;
  deviceId?: string;
  platform: string;
  ipAddress?: string;
  createdAt: number;
  lastActive: number;
  expiresAt: number;
  isRevoked: boolean;
}

export interface ConversationEntity {
  id: string;
  type: 'direct' | 'group' | 'channel';
  title?: string;
  avatarUrl?: string;
  isChannel?: boolean;
  isBusiness?: boolean;
  isSavedMessages?: boolean;
  isPinned?: boolean;
  disappearingDurationSeconds?: number;
  lastMessageText?: string;
  lastMessageTime?: number;
  createdAt: number;
  updatedAt: number;
  participantIds: string[];
}

export interface MessageEntity {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  text: string; // Ciphertext in E2EE
  messageType: string;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  disappearingAfterTimestamp?: number;
  timestamp: number;
}

export class NakeicRepository {
  private pool: pg.Pool;
  private isPgAvailable: boolean = false;

  constructor() {
    this.pool = getPostgresPool();
  }

  async initialize(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      try {
        const res = await client.query('SELECT 1');
        this.isPgAvailable = res.rows.length > 0;
        return this.isPgAvailable;
      } finally {
        client.release();
      }
    } catch {
      this.isPgAvailable = false;
      return false;
    }
  }

  isAvailable(): boolean {
    return this.isPgAvailable;
  }

  // --- Users ---
  async findUserById(id: string): Promise<UserEntity | null> {
    if (!this.isPgAvailable) return null;
    const res = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      phoneNumber: r.phone_number,
      displayName: r.display_name,
      username: r.username,
      bio: r.bio,
      avatarUrl: r.avatar_url,
      isOnline: r.is_online,
      lastSeen: Number(r.last_seen),
      createdAt: Number(r.created_at)
    };
  }

  async findUserByPhone(phone: string): Promise<UserEntity | null> {
    if (!this.isPgAvailable) return null;
    const clean = phone.replace(/[\s\-\(\)\+]/g, '');
    const res = await this.pool.query(
      "SELECT * FROM users WHERE regexp_replace(phone_number, '[^0-9]', '', 'g') = $1",
      [clean]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      phoneNumber: r.phone_number,
      displayName: r.display_name,
      username: r.username,
      bio: r.bio,
      avatarUrl: r.avatar_url,
      isOnline: r.is_online,
      lastSeen: Number(r.last_seen),
      createdAt: Number(r.created_at)
    };
  }

  async saveUser(user: UserEntity): Promise<void> {
    if (!this.isPgAvailable) return;
    await this.pool.query(
      `INSERT INTO users (id, phone_number, display_name, username, bio, avatar_url, is_online, last_seen, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         username = EXCLUDED.username,
         bio = EXCLUDED.bio,
         avatar_url = EXCLUDED.avatar_url,
         is_online = EXCLUDED.is_online,
         last_seen = EXCLUDED.last_seen`,
      [
        user.id,
        user.phoneNumber,
        user.displayName,
        user.username || null,
        user.bio || '',
        user.avatarUrl || null,
        user.isOnline,
        user.lastSeen,
        user.createdAt
      ]
    );
  }

  // --- Sessions ---
  async saveSession(sess: SessionEntity): Promise<void> {
    if (!this.isPgAvailable) return;
    await this.pool.query(
      `INSERT INTO sessions (id, user_id, token_hash, device_name, device_id, platform, ip_address, created_at, last_active, expires_at, is_revoked)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         last_active = EXCLUDED.last_active,
         is_revoked = EXCLUDED.is_revoked`,
      [
        sess.id,
        sess.userId,
        sess.token,
        sess.deviceName,
        sess.deviceId || null,
        sess.platform,
        sess.ipAddress || null,
        sess.createdAt,
        sess.lastActive,
        sess.expiresAt,
        sess.isRevoked
      ]
    );
  }

  async findSessionByToken(token: string): Promise<SessionEntity | null> {
    if (!this.isPgAvailable) return null;
    const res = await this.pool.query(
      'SELECT * FROM sessions WHERE token_hash = $1 AND is_revoked = false AND expires_at > $2',
      [token, Date.now()]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      token: r.token_hash,
      deviceName: r.device_name,
      deviceId: r.device_id,
      platform: r.platform,
      ipAddress: r.ip_address,
      createdAt: Number(r.created_at),
      lastActive: Number(r.last_active),
      expiresAt: Number(r.expires_at),
      isRevoked: r.is_revoked
    };
  }

  async revokeSession(sessionId: string, userId: string): Promise<boolean> {
    if (!this.isPgAvailable) return false;
    const res = await this.pool.query(
      'UPDATE sessions SET is_revoked = true WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  // --- Conversations & Messages ---
  async saveMessage(msg: MessageEntity): Promise<void> {
    if (!this.isPgAvailable) return;
    await this.pool.query(
      `INSERT INTO messages (id, conversation_id, sender_id, sender_name, sender_avatar, text, message_type, media_url, file_name, file_size, status, disappearing_after_timestamp, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status`,
      [
        msg.id,
        msg.conversationId,
        msg.senderId,
        msg.senderName || '',
        msg.senderAvatar || null,
        msg.text,
        msg.messageType || 'text',
        msg.mediaUrl || null,
        msg.fileName || null,
        msg.fileSize || null,
        msg.status,
        msg.disappearingAfterTimestamp || null,
        msg.timestamp
      ]
    );
  }

  async getMessages(conversationId: string, limit: number = 50, before?: number): Promise<MessageEntity[]> {
    if (!this.isPgAvailable) return [];
    let query = 'SELECT * FROM messages WHERE conversation_id = $1';
    const params: any[] = [conversationId];

    if (before) {
      params.push(before);
      query += ` AND timestamp < $${params.length}`;
    }

    params.push(limit);
    query += ` ORDER BY timestamp DESC LIMIT $${params.length}`;

    const res = await this.pool.query(query, params);
    return res.rows.reverse().map((r: any) => ({
      id: r.id,
      conversationId: r.conversation_id,
      senderId: r.sender_id,
      senderName: r.sender_name,
      senderAvatar: r.sender_avatar,
      text: r.text,
      messageType: r.message_type,
      mediaUrl: r.media_url,
      fileName: r.file_name,
      fileSize: Number(r.file_size || 0),
      status: r.status,
      disappearingAfterTimestamp: r.disappearing_after_timestamp ? Number(r.disappearing_after_timestamp) : undefined,
      timestamp: Number(r.timestamp)
    }));
  }
}

export const nakeicRepository = new NakeicRepository();
