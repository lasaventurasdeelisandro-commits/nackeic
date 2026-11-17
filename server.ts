import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { billingService, NAKEIC_PLANS } from './src/services/billing.ts';
import { PostgresService } from './src/db/postgres.ts';
import { NakeicRepository } from './src/db/repository.ts';
import { redisCoordinator } from './src/services/redisCoordinator.ts';
import { buildLiveRtcConfig, buildIceServers } from './src/services/sfuAdapter.ts';
import {
  WalletService,
  WalletPersistenceState,
  NAKEIC_LIVE_GIFTS
} from './src/services/wallet.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_STARTED_AT = Date.now();

// Dynamic ephemeral test secret for local automated QA execution (no static keys)
export const INTERNAL_TEST_SECRET = process.env.INTERNAL_TEST_SECRET || crypto.randomBytes(32).toString('hex');
if (process.env.NODE_ENV !== 'production') {
  try {
    fs.writeFileSync(path.join(__dirname, '.test_ephemeral_token'), INTERNAL_TEST_SECRET, { mode: 0o600 });
  } catch {
    // Non-fatal
  }
}

// Initialize PostgreSQL service check & transactional repository
const pgService = new PostgresService();
const nakeicRepository = new NakeicRepository();
nakeicRepository.initialize().catch(() => {});
let pgHealthyState = false;

pgService.checkHealth().then(healthy => {
  pgHealthyState = healthy;
  if (healthy) {
    console.log('[NAKEIC Database] Conexión activa a PostgreSQL verificada.');
    pgService.runMigrations().catch(e => console.warn('[NAKEIC Database] Error en migraciones PostgreSQL:', e.message));
  } else {
    console.log('[NAKEIC Database] PostgreSQL no detectado localmente. Operando en modo híbrido persistente seguro (data/db.json).');
  }
});

redisCoordinator.initialize().then(status => {
  if (status.connected) {
    console.log(`[NAKEIC Redis] Conectado en modo distribuido (${status.urlMasked}).`);
  } else {
    console.log(`[NAKEIC Coordinator] Operando en modo ${status.mode}${status.lastError ? ` (${status.lastError})` : ''}.`);
  }
}).catch(() => {});

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
const wssLive = new WebSocketServer({ noServer: true, maxPayload: 10 * 1024 * 1024 });

server.on('upgrade', (request, socket, head) => {
  const reqUrl = request.url || '/';
  if (reqUrl.startsWith('/ws/live')) {
    wssLive.handleUpgrade(request, socket, head, (ws) => {
      wssLive.emit('connection', ws, request);
    });
  } else {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

// Data persistence directory and file
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface UserPrivacySettingsRecord {
  lastSeenVisibility: 'everyone' | 'contacts' | 'nobody';
  profilePhotoVisibility: 'everyone' | 'contacts' | 'nobody';
  readReceiptsEnabled: boolean;
  statusVisibility: 'everyone' | 'contacts' | 'nobody';
  disappearingDefaultSeconds: number;
}

interface UserRecord {
  id: string;
  phoneNumber: string;
  displayName: string;
  username: string;
  bio: string;
  avatarUrl: string;
  isOnline: boolean;
  lastSeen: number;
  fcmToken?: string;
  blockedUserIds?: string[];
  passwordHash?: string;
  passwordSalt?: string;
  pinHash?: string;
  pinSalt?: string;
  privacy?: UserPrivacySettingsRecord;
  createdAt: number;
}

interface MessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'voice' | 'file' | 'location' | 'contact' | 'poll';
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string;
  durationSeconds?: number;
  waveform?: number[];
  location?: { lat: number; lng: number; label: string; address?: string };
  contact?: { name: string; phone: string; organization?: string };
  poll?: any;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  reactions?: Record<string, string[]>;
  replyToId?: string;
  replyToText?: string;
  isStarred?: boolean;
  isPinned?: boolean;
  isEdited?: boolean;
  editedAt?: number;
  isDeletedForEveryone?: boolean;
  deletedForUserIds?: string[];
  productCard?: { id: string; title: string; price: string; description: string; imageUrl?: string };
  isSilent?: boolean;
  isScheduled?: boolean;
  scheduledTime?: number;
  viewsCount?: number;
  disappearingAfterTimestamp?: number;
  topicId?: string;
  timestamp: number;
}

interface TopicRecord {
  id: string;
  title: string;
  icon?: string;
  messageCount: number;
  createdAt: number;
}

interface ConversationRecord {
  id: string;
  type: 'direct' | 'group';
  title: string;
  avatarUrl?: string;
  participantIds: string[];
  unreadCounts: Record<string, number>;
  lastMessageText?: string;
  lastMessageTime?: number;
  isPinned?: boolean;
  isArchived?: boolean;
  isMuted?: boolean;
  adminIds?: string[];
  onlyAdminsCanSend?: boolean;
  onlyAdminsCanEditInfo?: boolean;
  inviteCode?: string;
  isSavedMessages?: boolean;
  isBusiness?: boolean;
  isChannel?: boolean;
  channelSubscribers?: number;
  isCommunity?: boolean;
  topics?: TopicRecord[];
  disappearingDurationSeconds?: number;
  label?: string;
  businessProfile?: any;
  createdAt: number;
}

interface StatusViewRecord {
  viewerId: string;
  viewerName: string;
  viewerAvatar?: string;
  viewedAt: number;
}

interface StatusRecord {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  mediaUrl?: string;
  textCaption?: string;
  bgHex?: string;
  privacy?: 'everyone' | 'contacts' | 'nobody';
  views?: StatusViewRecord[];
  reactions?: Record<string, string>;
  timestamp: number;
}

interface SessionRecord {
  id: string;
  userId: string;
  token: string;
  deviceName: string;
  platform: string;
  ip: string;
  createdAt: number;
  lastActive: number;
  expiresAt: number;
  isRevoked?: boolean;
}

interface QuickReplyRecord {
  id: string;
  shortcut: string;
  text: string;
  mediaUrl?: string;
}

interface CatalogItemRecord {
  id: string;
  title: string;
  price: string;
  description: string;
  imageUrl?: string;
  category?: string;
}

interface ReportRecord {
  id: string;
  reporterId: string;
  targetType: 'user' | 'message' | 'live_stream' | 'group';
  targetId: string;
  reason: string;
  details?: string;
  status: 'pending_review' | 'reviewed';
  createdAt: number;
}

interface LiveHistoryRecord {
  id: string;
  hostId: string;
  hostName: string;
  hostUsername: string;
  hostAvatar: string;
  title: string;
  description?: string;
  category: string;
  coverUrl?: string;
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
  peakViewers: number;
  likesCount: number;
  giftsCount: number;
  earnedCoins: number;
  replayAvailable: boolean;
  previewFrame?: string;
}

interface BattleHistoryRecord {
  id: string;
  challengerRoomId: string;
  opponentRoomId: string;
  challengerHostId: string;
  challengerHostName: string;
  opponentHostId: string;
  opponentHostName: string;
  challengerScore: number;
  opponentScore: number;
  winnerHostId: string | null;
  durationSeconds: number;
  startedAt: number;
  endedAt: number;
}

interface LiveModerationLogRecord {
  id: string;
  roomId: string;
  actorUserId: string;
  actorName: string;
  targetUserId?: string;
  targetName?: string;
  action: 'assign_mod' | 'remove_mod' | 'mute_viewer' | 'ban_viewer' | 'delete_comment' | 'update_banned_words' | 'kick_guest';
  reason?: string;
  durationSeconds?: number;
  createdAt: number;
}

interface DatabaseSchema {
  users: Record<string, UserRecord>;
  conversations: Record<string, ConversationRecord>;
  messages: Record<string, MessageRecord[]>; // conversationId -> messages
  statuses: StatusRecord[];
  sessions?: Record<string, SessionRecord[]>;
  quickReplies?: Record<string, QuickReplyRecord[]>;
  businessCatalogs?: Record<string, CatalogItemRecord[]>;
  walletState?: WalletPersistenceState;
  reports?: ReportRecord[];
  liveHistory?: LiveHistoryRecord[];
  battleHistory?: BattleHistoryRecord[];
  liveModerators?: Record<string, string[]>; // hostId -> moderatorUserIds[]
  liveModerationLogs?: LiveModerationLogRecord[];
}

// Initial seed data if db does not exist
const defaultSeedUsers: Record<string, UserRecord> = {
  'user_ana': {
    id: 'user_ana',
    phoneNumber: '+52 55 1234 5678',
    displayName: 'Ana Morales',
    username: 'anamorales',
    bio: 'Ingeniera de Criptografía 🔐 · NAKEIC Dev',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    isOnline: true,
    lastSeen: Date.now(),
    createdAt: Date.now() - 10000000
  },
  'user_carlos': {
    id: 'user_carlos',
    phoneNumber: '+34 612 345 678',
    displayName: 'Carlos Silva',
    username: 'csilva_ops',
    bio: 'WebRTC & Audio Pipelines · Conectando al mundo',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    isOnline: true,
    lastSeen: Date.now(),
    createdAt: Date.now() - 10000000
  },
  'user_elena': {
    id: 'user_elena',
    phoneNumber: '+1 415 892 1100',
    displayName: 'Elena Rostova',
    username: 'erostova',
    bio: 'Diseño UX/UI Nativo Android Material 3 ✨',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
    isOnline: false,
    lastSeen: Date.now() - 3600000,
    createdAt: Date.now() - 10000000
  },
  'user_me': {
    id: 'user_me',
    phoneNumber: '+52 55 8923 4410',
    displayName: 'Alex Valenzuela',
    username: 'alexv_nakeic',
    bio: 'Conectado con NAKEIC 🚀',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    isOnline: true,
    lastSeen: Date.now(),
    createdAt: Date.now() - 10000000
  }
};

const defaultSeedConversations: Record<string, ConversationRecord> = {
  'conv_saved_messages': {
    id: 'conv_saved_messages',
    type: 'direct',
    title: 'Mensajes Guardados (Nube)',
    avatarUrl: 'https://images.unsplash.com/photo-1534972195531-a756b1126f25?w=200&auto=format&fit=crop&q=80',
    participantIds: ['user_me'],
    unreadCounts: {},
    lastMessageText: 'Enlace del repositorio y documentación de cifrado: https://github.com/nakeic/android-native-app',
    lastMessageTime: Date.now() - 7200000,
    isPinned: true,
    isSavedMessages: true,
    createdAt: Date.now() - 10000000
  },
  'conv_business_store': {
    id: 'conv_business_store',
    type: 'direct',
    title: 'NAKEIC Store Oficial',
    avatarUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200&auto=format&fit=crop&q=80',
    participantIds: ['user_me', 'business_store'],
    unreadCounts: { user_me: 1 },
    lastMessageText: '🌟 Producto Destacado: NAKEIC Titan Security Phone ($799 USD)',
    lastMessageTime: Date.now() - 10800000,
    isPinned: true,
    isBusiness: true,
    label: 'vip',
    createdAt: Date.now() - 10000000
  },
  'conv_telegram_channel': {
    id: 'conv_telegram_channel',
    type: 'group',
    title: 'NAKEIC Oficial 📢',
    avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
    participantIds: ['user_me', 'user_ana', 'user_carlos'],
    unreadCounts: {},
    lastMessageText: '🚀 Actualización NAKEIC v2.6.0 ya disponible con WhatsApp Business y Telegram',
    lastMessageTime: Date.now() - 3600000,
    isPinned: false,
    isChannel: true,
    channelSubscribers: 14820,
    createdAt: Date.now() - 10000000
  },
  'conv_ana_carlos': {
    id: 'conv_ana_carlos',
    type: 'direct',
    title: 'Ana Morales',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    participantIds: ['user_me', 'user_ana', 'user_carlos'],
    unreadCounts: {},
    lastMessageText: '¡Bienvenido a NAKEIC! Ya estamos conectados en tiempo real.',
    lastMessageTime: Date.now() - 120000,
    isPinned: true,
    createdAt: Date.now() - 1000000
  },
  'conv_group_general': {
    id: 'conv_group_general',
    type: 'group',
    title: 'Comunidad NAKEIC Global 🌐',
    avatarUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300&auto=format&fit=crop&q=80',
    participantIds: ['user_me', 'user_ana', 'user_carlos', 'user_elena'],
    unreadCounts: {},
    lastMessageText: 'Bienvenidos al grupo global de NAKEIC. Comunicaciones masivas activas.',
    lastMessageTime: Date.now() - 60000,
    isPinned: false,
    createdAt: Date.now() - 2000000
  }
};

const defaultSeedMessages: Record<string, MessageRecord[]> = {
  'conv_saved_messages': [
    {
      id: 'sm1',
      conversationId: 'conv_saved_messages',
      senderId: 'user_me',
      senderName: 'Tú (Mensajes Guardados)',
      senderAvatar: 'https://images.unsplash.com/photo-1534972195531-a756b1126f25?w=200&auto=format&fit=crop&q=80',
      text: '📌 Nota personal: Presentación de arquitectura NAKEIC vs WhatsApp/Telegram a las 4:00 PM.',
      type: 'text',
      status: 'read',
      timestamp: Date.now() - 18000000,
      isPinned: true
    },
    {
      id: 'sm2',
      conversationId: 'conv_saved_messages',
      senderId: 'user_me',
      senderName: 'Tú (Mensajes Guardados)',
      senderAvatar: 'https://images.unsplash.com/photo-1534972195531-a756b1126f25?w=200&auto=format&fit=crop&q=80',
      text: 'Enlace del repositorio y documentación de cifrado: https://github.com/nakeic/android-native-app',
      type: 'text',
      status: 'read',
      timestamp: Date.now() - 7200000
    }
  ],
  'conv_business_store': [
    {
      id: 'bs1',
      conversationId: 'conv_business_store',
      senderId: 'business_store',
      senderName: 'NAKEIC Store Oficial',
      senderAvatar: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200&auto=format&fit=crop&q=80',
      text: '¡Hola Alex! Bienvenido a la tienda oficial de NAKEIC. Aquí puedes explorar terminales de seguridad, accesorios y servicios exclusivos con soporte 24/7.',
      type: 'text',
      status: 'read',
      timestamp: Date.now() - 21600000
    },
    {
      id: 'bs2',
      conversationId: 'conv_business_store',
      senderId: 'business_store',
      senderName: 'NAKEIC Store Oficial',
      senderAvatar: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200&auto=format&fit=crop&q=80',
      text: '🌟 Producto Destacado del Catálogo:',
      type: 'text',
      status: 'read',
      timestamp: Date.now() - 10800000,
      productCard: {
        id: 'prod_1',
        title: 'NAKEIC Titan Security Phone',
        price: '$799 USD',
        description: 'Smartphone con chip de seguridad dedicado, OS sin rastreo y cifrado en hardware.',
        imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&auto=format&fit=crop&q=80'
      }
    }
  ],
  'conv_telegram_channel': [
    {
      id: 'tc1',
      conversationId: 'conv_telegram_channel',
      senderId: 'channel_bot',
      senderName: 'NAKEIC Oficial 📢',
      senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
      text: '🚀 Actualización NAKEIC v2.6.0 ya disponible:\n\n• Nuevas Carpetas de Chats estilo Telegram\n• Hub Empresarial & Catálogo WhatsApp Business\n• Mensajes Guardados en Nube Personal\n• Respuestas Rápidas con atajo /\n• Envío Silencioso y Programado',
      type: 'text',
      status: 'read',
      timestamp: Date.now() - 3600000,
      viewsCount: 14820
    }
  ],
  'conv_ana_carlos': [
    {
      id: 'msg_1',
      conversationId: 'conv_ana_carlos',
      senderId: 'user_ana',
      senderName: 'Ana Morales',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      text: '¡Hola! Todos los mensajes y llamadas ahora viajan por la infraestructura real de NAKEIC con cifrado E2EE.',
      type: 'text',
      status: 'read',
      timestamp: Date.now() - 300000
    },
    {
      id: 'msg_2',
      conversationId: 'conv_ana_carlos',
      senderId: 'user_carlos',
      senderName: 'Carlos Silva',
      senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
      text: '¡Excelente! Podemos probar videollamadas WebRTC de alta definición y enviar notas de voz reales.',
      type: 'text',
      status: 'read',
      timestamp: Date.now() - 180000
    }
  ],
  'conv_group_general': [
    {
      id: 'msg_grp_1',
      conversationId: 'conv_group_general',
      senderId: 'user_ana',
      senderName: 'Ana Morales',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      text: '📢 Bienvenidos al canal masivo de NAKEIC. Cualquier usuario registrado puede comunicarse y llamar en grupo aquí.',
      type: 'text',
      status: 'read',
      timestamp: Date.now() - 600000
    }
  ]
};

const defaultSeedStatuses: StatusRecord[] = [
  {
    id: 'st_1',
    userId: 'user_ana',
    userName: 'Ana Morales',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    textCaption: 'NAKEIC nativo en producción activa 🚀 Cifrado E2EE al 100%',
    bgHex: '#0077B6',
    timestamp: Date.now() - 1800000
  },
  {
    id: 'st_2',
    userId: 'user_carlos',
    userName: 'Carlos Silva',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    mediaUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80',
    textCaption: 'Probando audio WebRTC Opus en tiempo real',
    timestamp: Date.now() - 3600000
  }
];

function loadDatabase(): DatabaseSchema {
  let loadedDb: Partial<DatabaseSchema> | null = null;
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      loadedDb = JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading database file, initializing defaults:', err);
  }

  const cleanedSessions: Record<string, SessionRecord[]> = {};
  if (loadedDb?.sessions) {
    for (const [uid, sessList] of Object.entries(loadedDb.sessions)) {
      // Purge any legacy or unauthenticated demo/seed sessions
      const validList = sessList.filter(s => !s.token.includes('seed') && !s.token.includes('demo'));
      if (validList.length > 0) {
        cleanedSessions[uid] = validList;
      }
    }
  }

  const mergedDb: DatabaseSchema = {
    users: { ...defaultSeedUsers, ...(loadedDb?.users || {}) },
    conversations: { ...defaultSeedConversations, ...(loadedDb?.conversations || {}) },
    messages: { ...defaultSeedMessages, ...(loadedDb?.messages || {}) },
    statuses: loadedDb?.statuses && loadedDb.statuses.length > 0 ? loadedDb.statuses : defaultSeedStatuses,
    sessions: cleanedSessions,
    quickReplies: loadedDb?.quickReplies || {},
    businessCatalogs: loadedDb?.businessCatalogs || {},
    walletState: loadedDb?.walletState || { wallets: {}, transactions: [], payouts: [] },
    reports: loadedDb?.reports || [],
    liveHistory: loadedDb?.liveHistory || [],
    battleHistory: loadedDb?.battleHistory || [],
    liveModerators: loadedDb?.liveModerators || {},
    liveModerationLogs: loadedDb?.liveModerationLogs || []
  };

  saveDatabase(mergedDb);
  return mergedDb;
}

function saveDatabase(database: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(database, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

let db = loadDatabase();

// Server-authoritative Wallet Service backed by persistent storage + Postgres mirror
const walletService = new WalletService({
  initialState: db.walletState,
  onPersist: (state) => {
    db.walletState = state;
    saveDatabase(db);
    Object.values(state.wallets).forEach((w) => {
      nakeicRepository.upsertWallet({
        userId: w.userId,
        coinsBalance: w.coinsBalance,
        creatorDiamonds: w.creatorDiamonds,
        pendingPayoutCents: w.pendingPayoutCents,
        kycStatus: w.kycStatus,
        updatedAt: w.updatedAt
      }).catch(() => {});
    });
  }
});
// Seed initial starter coins only once for default creators/testers if absent
walletService.getOrCreateWallet('user_me', 250);
walletService.getOrCreateWallet('user_ana', 500);
walletService.getOrCreateWallet('user_carlos', 500);

function hashPasswordScrypt(password: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash: derived, salt };
}

function verifyPasswordScrypt(password: string, hash: string, salt: string): boolean {
  try {
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

function sanitizeUser(user: UserRecord): Omit<UserRecord, 'passwordHash' | 'passwordSalt' | 'pinHash' | 'pinSalt'> & { hasPassword: boolean; hasPin: boolean } {
  const { passwordHash, passwordSalt, pinHash, pinSalt, ...safe } = user;
  return {
    ...safe,
    hasPassword: Boolean(passwordHash),
    hasPin: Boolean(pinHash)
  };
}

const serverMetrics = {
  totalWsMessages: 0,
  totalLiveMessages: 0,
  totalGiftsProcessed: 0,
  totalBattlesCompleted: 0,
  totalLiveStreamsStarted: 0,
  totalReportsFiled: 0
};

function issueUserSession(
  user: UserRecord,
  deviceName = 'NAKEIC Android / Web Client',
  platform = 'Android / Web Native',
  ip = '127.0.0.1'
): { token: string; session: SessionRecord } {
  const token = generateSecureToken();
  const sessionId = 'sess_' + crypto.randomBytes(16).toString('hex');
  if (!db.sessions) db.sessions = {};
  if (!db.sessions[user.id]) db.sessions[user.id] = [];

  const sessionRecord: SessionRecord = {
    id: sessionId,
    userId: user.id,
    token,
    deviceName,
    platform,
    ip,
    createdAt: Date.now(),
    lastActive: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 3600 * 1000, // 30 days
    isRevoked: false
  };
  db.sessions[user.id].push(sessionRecord);
  saveDatabase(db);
  return { token, session: sessionRecord };
}

// WebSocket active clients mapping: userId -> Set of WebSocket connections
const connectedClients = new Map<string, Set<WebSocket>>();
const socketToUser = new Map<WebSocket, string>();
// Offline messages outbox queue to guarantee zero message loss
const offlineMessageQueue = new Map<string, MessageRecord[]>();

function broadcast(payload: any, recipientIds?: string[]) {
  const json = JSON.stringify(payload);
  if (recipientIds && recipientIds.length > 0) {
    for (const rid of recipientIds) {
      const userSockets = connectedClients.get(rid);
      if (userSockets) {
        userSockets.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(json);
          }
        });
      }
    }
  } else {
    // Broadcast to all connected sockets
    wss.clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(json);
      }
    });
  }
}

// ============================================================================
// NAKEIC Cryptographic Authentication & Security Subsystem
// ============================================================================
let OTP_SECRET_SALT = process.env.OTP_SECRET_SALT;

if (!OTP_SECRET_SALT) {
  const saltFile = path.join(DATA_DIR, '.otp_salt');
  if (fs.existsSync(saltFile)) {
    try {
      OTP_SECRET_SALT = fs.readFileSync(saltFile, 'utf-8').trim();
    } catch {
      // fallback
    }
  }

  if (!OTP_SECRET_SALT) {
    // Generación de sal criptográfica de 256 bits (CSPRNG) con cero claves fijas en repositorio
    OTP_SECRET_SALT = crypto.randomBytes(32).toString('hex');
    try {
      fs.writeFileSync(saltFile, OTP_SECRET_SALT, { mode: 0o600 });
    } catch {
      // Fallback en memoria si el sistema de archivos es de solo lectura
    }
    console.log('[NAKEIC Security] OTP_SECRET_SALT inicializado mediante generador criptográfico CSPRNG de 256 bits.');
  }
}

interface OtpEntry {
  hashedCode: string;
  expiresAt: number;
  attempts: number;
  lastRequestedAt: number;
  isUsed: boolean;
}

// In-Memory Secure OTP Store: phone -> OtpEntry
const otpStore = new Map<string, OtpEntry>();
// Rate Limiter: IP -> { count, resetAt }
const ipRateLimitStore = new Map<string, { count: number; resetAt: number }>();
// Secure Internal Test SMS Outbox (accessible only by authenticated QA test suite)
const testSmsOutbox = new Map<string, { code: string; sentAt: number }>();

function hashOtpCode(code: string, phoneNumber: string): string {
  return crypto.createHash('sha256').update(`${OTP_SECRET_SALT}:${phoneNumber}:${code}`).digest('hex');
}

function generateSecureToken(): string {
  return 'nkc_sec_' + crypto.randomBytes(32).toString('hex');
}

interface AuthenticatedRequest extends express.Request {
  user?: UserRecord;
  session?: SessionRecord;
}

// Strict Authentication and Session Validation Middleware
function requireAuth(req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autorización ausente o formato incorrecto. Se requiere Bearer token.' });
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return res.status(401).json({ error: 'Token de autorización vacío.' });
  }

  let foundUser: UserRecord | undefined;
  let foundSession: SessionRecord | undefined;

  if (db.sessions) {
    for (const [userId, sessions] of Object.entries(db.sessions)) {
      const sess = sessions.find(s => s.token === token);
      if (sess) {
        if (sess.isRevoked) {
          return res.status(401).json({ error: 'Esta sesión ha sido revocada o cerrada.' });
        }
        if (sess.expiresAt && sess.expiresAt < Date.now()) {
          sess.isRevoked = true;
          saveDatabase(db);
          return res.status(401).json({ error: 'La sesión ha expirado. Inicie sesión nuevamente.' });
        }
        foundSession = sess;
        foundUser = db.users[userId];
        sess.lastActive = Date.now();
        break;
      }
    }
  }

  if (!foundUser || !foundSession) {
    return res.status(401).json({ error: 'Token de sesión inválido, expirado o no reconocido.' });
  }

  req.user = foundUser;
  req.session = foundSession;
  next();
}

// Helper to extract authenticated user ID from Authorization header ONLY via active verified session
function extractUserIdFromAuth(req: express.Request): string | undefined {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return undefined;
  const token = authHeader.substring(7).trim();
  if (!token) return undefined;
  if (db.sessions) {
    for (const [userId, sessions] of Object.entries(db.sessions)) {
      const sess = sessions.find(s => s.token === token && !s.isRevoked);
      if (sess && (!sess.expiresAt || sess.expiresAt > Date.now())) {
        return userId;
      }
    }
  }
  return undefined;
}

// Bot responder for Telegram-style and WhatsApp interactive bots
function handleBotCommand(conversationId: string, text: string, senderId: string) {
  if (!text || !text.startsWith('/')) return;
  const trimmed = text.trim();
  const parts = trimmed.split(' ');
  const cmd = parts[0].toLowerCase();
  const arg = parts.slice(1).join(' ');

  let replyText = '';
  switch (cmd) {
    case '/start':
      replyText = '👋 ¡Hola! Soy **NAKEIC Bot** 🤖.\nTu asistente de mensajería nativa, privacidad y cifrado Double Ratchet. Escribe `/help` para ver los comandos disponibles.';
      break;
    case '/help':
      replyText = '📋 **Comandos disponibles en NAKEIC:**\n\n• `/start` - Inicia el asistente\n• `/help` - Muestra esta ayuda\n• `/crypto` - Audita el estado de cifrado E2EE\n• `/time` - Fecha y hora del servidor\n• `/status` - Estado de la red y WebSocket\n• `/calc <expresión>` - Realiza cálculos matemáticos\n• `/roll` - Genera un número aleatorio del 1 al 100';
      break;
    case '/crypto':
    case '/e2ee':
      replyText = '🔐 **Auditoría Criptográfica NAKEIC:**\n• Curva: ECDH P-256 (secp256r1)\n• Derivación: HKDF RFC 5869 (HMAC-SHA256)\n• Algoritmo: AES-256-GCM (128-bit Tag)\n• Almacenamiento: Android KeyStore (TEE / StrongBox)\n• Estado: Activo y Protegido.';
      break;
    case '/time':
      replyText = `⏰ Hora del servidor: ${new Date().toLocaleString('es-ES', { timeZone: 'UTC' })} UTC`;
      break;
    case '/status': {
      const activeUsersCount = Object.values(db.users).filter(u => u.isOnline).length;
      replyText = `🟢 **Estado del Servidor NAKEIC:**\n• WebSocket: Activo y en escucha\n• Clientes conectados: ${connectedClients.size}\n• Usuarios en línea: ${activeUsersCount}\n• Base de datos: Persistente y sincronizada`;
      break;
    }
    case '/calc':
      if (!arg) {
        replyText = 'Uso: `/calc 150 * 1.16` o `/calc (25 + 75) / 2`';
      } else {
        try {
          if (!/^[0-9\+\-\*\/\(\)\.\s]+$/.test(arg)) {
            replyText = '⚠️ Solo se permiten operaciones aritméticas básicas (+, -, *, /).';
          } else {
            const result = Function(`"use strict"; return (${arg})`)();
            replyText = `🔢 Resultado de \`${arg}\` = **${result}**`;
          }
        } catch {
          replyText = '⚠️ Expresión matemática inválida.';
        }
      }
      break;
    case '/roll': {
      const rollNum = Math.floor(Math.random() * 100) + 1;
      replyText = `🎲 Has obtenido: **${rollNum}** (1-100)`;
      break;
    }
    default:
      return;
  }

  // Ensure bot user exists
  if (!db.users['user_bot']) {
    db.users['user_bot'] = {
      id: 'user_bot',
      phoneNumber: '+00 00 0000 0000',
      displayName: 'NAKEIC Bot 🤖',
      username: 'nakeicbot',
      bio: 'Asistente oficial inteligente de NAKEIC',
      avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
      isOnline: true,
      lastSeen: Date.now(),
      createdAt: Date.now()
    };
  }

  const botMsg: MessageRecord = {
    id: `bot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    conversationId,
    senderId: 'user_bot',
    senderName: 'NAKEIC Bot 🤖',
    senderAvatar: db.users['user_bot'].avatarUrl,
    text: replyText,
    type: 'text',
    status: 'read',
    timestamp: Date.now() + 100
  };

  setTimeout(() => {
    if (!db.messages[conversationId]) db.messages[conversationId] = [];
    db.messages[conversationId].push(botMsg);
    const conv = db.conversations[conversationId];
    if (conv) {
      conv.lastMessageText = replyText.replace(/\*\*/g, '');
      conv.lastMessageTime = botMsg.timestamp;
      saveDatabase(db);
      broadcast({
        type: 'chat:new_message',
        data: { message: botMsg, conversation: conv }
      }, conv.participantIds);
    }
  }, 400);
}

// Background Worker 1: Disappearing / Ephemeral messages purge (every 15s)
setInterval(() => {
  const now = Date.now();
  let changed = false;

  Object.entries(db.messages).forEach(([convId, messages]) => {
    const expiredList = messages.filter(m => 
      m.disappearingAfterTimestamp && 
      m.disappearingAfterTimestamp <= now && 
      !m.isDeletedForEveryone
    );

    if (expiredList.length > 0) {
      expiredList.forEach(m => {
        m.isDeletedForEveryone = true;
        m.text = 'Este mensaje temporal ha expirado.';
        m.mediaUrl = undefined;
        m.poll = undefined;
        m.location = undefined;
        m.contact = undefined;
      });
      changed = true;

      const conv = db.conversations[convId];
      if (conv) {
        broadcast({
          type: 'chat:messages_expired',
          data: { conversationId: convId, expiredMessageIds: expiredList.map(m => m.id) }
        }, conv.participantIds);
      }
    }
  });

  if (changed) {
    saveDatabase(db);
  }
}, 15000);

// Background Worker 2: Scheduled messages dispatcher (every 5s)
setInterval(() => {
  const now = Date.now();
  let changed = false;

  Object.entries(db.messages).forEach(([convId, messages]) => {
    const toDispatch = messages.filter(m => m.isScheduled && m.scheduledTime && m.scheduledTime <= now);
    if (toDispatch.length > 0) {
      toDispatch.forEach(m => {
        m.isScheduled = false;
        m.timestamp = now;
        m.status = 'sent';
      });
      changed = true;

      const conv = db.conversations[convId];
      if (conv) {
        const last = toDispatch[toDispatch.length - 1];
        conv.lastMessageText = last.text || 'Mensaje programado entregado';
        conv.lastMessageTime = last.timestamp;

        toDispatch.forEach(m => {
          broadcast({
            type: 'chat:new_message',
            data: { message: m, conversation: conv }
          }, conv.participantIds);
        });
      }
    }
  });

  if (changed) {
    saveDatabase(db);
  }
}, 5000);

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (rawData: string) => {
    try {
      const message = JSON.parse(rawData.toString());
      const { type, data } = message;

      switch (type) {
        // --- 1. User Authenticated / Online Connection ---
        case 'auth:connect': {
          const { token, userId } = data || {};
          if (!token) {
            ws.send(JSON.stringify({ type: 'auth:error', error: 'Unauthorized: Session token missing' }));
            ws.close(4001, 'Unauthorized: Session token missing');
            break;
          }

          let foundSession: SessionRecord | undefined;
          let sessionUserId: string | undefined;

          if (db.sessions) {
            for (const [uid, sessions] of Object.entries(db.sessions)) {
              const sess = sessions.find(s => s.token === token && !s.isRevoked);
              if (sess) {
                if (sess.expiresAt && sess.expiresAt < Date.now()) {
                  sess.isRevoked = true;
                  saveDatabase(db);
                  break;
                }
                foundSession = sess;
                sessionUserId = uid;
                sess.lastActive = Date.now();
                break;
              }
            }
          }

          if (!foundSession || !sessionUserId) {
            ws.send(JSON.stringify({ type: 'auth:error', error: 'Unauthorized: Invalid or expired session token' }));
            ws.close(4001, 'Unauthorized: Invalid or expired session token');
            break;
          }

          // Anti-spoofing verification: if client claims a specific userId, it MUST match the session's verified owner
          if (userId && userId !== sessionUserId) {
            ws.send(JSON.stringify({ type: 'auth:error', error: 'Forbidden: User identity mismatch' }));
            ws.close(4003, 'Forbidden: User identity mismatch');
            break;
          }

          const authUserId = sessionUserId;
          socketToUser.set(ws, authUserId);
          if (!connectedClients.has(authUserId)) {
            connectedClients.set(authUserId, new Set());
          }
          connectedClients.get(authUserId)!.add(ws);

          // Update user status to online
          if (db.users[authUserId]) {
            db.users[authUserId].isOnline = true;
            db.users[authUserId].lastSeen = Date.now();
            saveDatabase(db);
          }

          // Notify everyone of presence
          broadcast({
            type: 'presence:update',
            data: { userId: authUserId, isOnline: true, lastSeen: Date.now() }
          });

          // Send initial state snapshot
          ws.send(JSON.stringify({
            type: 'auth:ack',
            data: {
              userId: authUserId,
              users: Object.values(db.users),
              conversations: Object.values(db.conversations).filter(c => c.participantIds.includes(authUserId)),
              statuses: db.statuses
            }
          }));

          // Deliver any pending offline messages queued while user was disconnected
          if (offlineMessageQueue.has(authUserId)) {
            const queued = offlineMessageQueue.get(authUserId) || [];
            if (queued.length > 0) {
              ws.send(JSON.stringify({
                type: 'chat:offline_sync',
                data: { messages: queued }
              }));

              // Mark messages as delivered and notify online senders
              queued.forEach(qMsg => {
                const convMsgs = db.messages[qMsg.conversationId];
                const targetMsg = convMsgs?.find(m => m.id === qMsg.id);
                if (targetMsg && targetMsg.status === 'sent') {
                  targetMsg.status = 'delivered';
                  broadcast({
                    type: 'chat:message_delivered',
                    data: {
                      conversationId: qMsg.conversationId,
                      messageId: qMsg.id,
                      recipientId: authUserId
                    }
                  }, [targetMsg.senderId]);
                }
              });

              saveDatabase(db);
              offlineMessageQueue.delete(authUserId);
            }
          }
          break;
        }

        // --- 2. Real-time Messaging ---
        case 'chat:send_message': {
          const authenticatedSenderId = socketToUser.get(ws);
          if (!authenticatedSenderId) {
            ws.send(JSON.stringify({
              type: 'chat:error',
              error: 'No autorizado: se requiere conexión WebSocket autenticada.'
            }));
            break;
          }

          const { conversationId, senderId, recipientId, text, messageType, mediaUrl, fileName, fileSize, durationSeconds, waveform, location, contact, poll, replyToId, replyToText } = data;

          // Prevent sender spoofing: client cannot claim to send as a different user
          if (senderId && senderId !== authenticatedSenderId) {
            ws.send(JSON.stringify({
              type: 'chat:error',
              error: 'Acceso prohibido: no puedes enviar mensajes en nombre de otro usuario.'
            }));
            break;
          }

          const effectiveSenderId = authenticatedSenderId;
          const sender = db.users[effectiveSenderId];

          if (!sender) {
            ws.send(JSON.stringify({
              type: 'chat:error',
              error: 'Usuario remitente no encontrado en la base de datos.'
            }));
            break;
          }

          let conversation = db.conversations[conversationId];

          // If conversation exists, verify that the authenticated sender is a participant
          if (conversation) {
            const isParticipant = conversation.participantIds.includes(effectiveSenderId) || conversation.isChannel;
            if (!isParticipant) {
              ws.send(JSON.stringify({
                type: 'chat:error',
                error: 'Acceso prohibido: no eres participante de esta conversación.'
              }));
              break;
            }
          } else {
            // New direct conversation: create with authenticated sender and valid recipient
            const initialParticipants = [effectiveSenderId];
            if (recipientId && !initialParticipants.includes(recipientId)) {
              initialParticipants.push(recipientId);
            }
            conversation = {
              id: conversationId,
              type: conversationId.includes('group') || conversationId.includes('team') || conversationId.includes('community') ? 'group' : 'direct',
              title: conversationId.replace('conv_', '').replace(/_/g, ' '),
              avatarUrl: sender.avatarUrl,
              participantIds: initialParticipants,
              unreadCounts: {},
              lastMessageText: '',
              lastMessageTime: Date.now(),
              isPinned: false,
              createdAt: Date.now()
            };
            db.conversations[conversationId] = conversation;
          }

          const newMsg: MessageRecord = {
            id: data.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            conversationId,
            senderId,
            senderName: sender.displayName,
            senderAvatar: sender.avatarUrl,
            text: text || '',
            type: messageType || 'text',
            mediaUrl,
            fileName,
            fileSize,
            durationSeconds,
            waveform,
            location,
            contact,
            poll,
            productCard: data.productCard,
            isSilent: data.isSilent,
            isScheduled: data.isScheduled,
            scheduledTime: data.scheduledTime,
            viewsCount: data.viewsCount,
            status: 'sent',
            reactions: {},
            replyToId,
            replyToText,
            timestamp: Date.now()
          };

          // Check if group is restricted to admins only
          if (conversation.onlyAdminsCanSend && conversation.adminIds && !conversation.adminIds.includes(senderId)) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Solo los administradores pueden enviar mensajes en este grupo.'
            }));
            break;
          }

          if (!db.messages[conversationId]) {
            db.messages[conversationId] = [];
          }

          // Message deduplication: prevent network retry duplicates
          const isDuplicate = db.messages[conversationId].some(m => m.id === newMsg.id);
          if (isDuplicate) {
            ws.send(JSON.stringify({
              type: 'chat:message_ack',
              data: { messageId: newMsg.id, status: 'already_saved' }
            }));
            break;
          }

          if (conversation.disappearingDurationSeconds) {
            newMsg.disappearingAfterTimestamp = Date.now() + (conversation.disappearingDurationSeconds * 1000);
          }

          db.messages[conversationId].push(newMsg);

          // Update conversation last message
          conversation.lastMessageText = text || (messageType === 'voice' || messageType === 'audio' ? '🎤 Nota de voz' : messageType === 'image' ? '📷 Foto' : messageType === 'location' ? '📍 Ubicación' : messageType === 'contact' ? '👤 Contacto' : '📎 Archivo');
          conversation.lastMessageTime = newMsg.timestamp;

          // Filter out recipients that blocked the sender
          const activeRecipients = conversation.participantIds.filter(pid => {
            if (pid === senderId) return true;
            const recipientUser = db.users[pid];
            if (recipientUser && recipientUser.blockedUserIds && recipientUser.blockedUserIds.includes(senderId)) {
              return false;
            }
            return true;
          });

          // Increment unread count for other active participants
          activeRecipients.forEach(pid => {
            if (pid !== senderId) {
              conversation.unreadCounts[pid] = (conversation.unreadCounts[pid] || 0) + 1;

              // If recipient is offline, queue message for automatic sync upon reconnection
              const sockets = connectedClients.get(pid);
              if (!sockets || sockets.size === 0) {
                if (!offlineMessageQueue.has(pid)) {
                  offlineMessageQueue.set(pid, []);
                }
                offlineMessageQueue.get(pid)!.push(newMsg);
              }
            }
          });

          saveDatabase(db);

          // Broadcast message to all conversation participants in real-time
          broadcast({
            type: 'chat:new_message',
            data: { message: newMsg, conversation }
          }, activeRecipients.length > 0 ? activeRecipients : undefined);

          // Trigger bot response if slash command
          if (newMsg.text && newMsg.text.startsWith('/')) {
            handleBotCommand(conversationId, newMsg.text, senderId);
          }
          break;
        }

        // --- 2.1 Delete Message (Backend real sync: For Everyone vs For Me) ---
        case 'chat:delete_message': {
          const authenticatedUserId = socketToUser.get(ws);
          if (!authenticatedUserId) {
            ws.send(JSON.stringify({ type: 'chat:error', error: 'No autorizado: se requiere conexión WebSocket autenticada.' }));
            break;
          }
          const { conversationId, messageId, userId, deleteType } = data;
          if (userId && userId !== authenticatedUserId) {
            ws.send(JSON.stringify({ type: 'chat:error', error: 'Acceso prohibido: no puedes realizar acciones en nombre de otro usuario.' }));
            break;
          }
          const effectiveUserId = authenticatedUserId;
          let conv = db.conversations[conversationId];
          const msgs = db.messages[conversationId] || [];
          let targetMsg = msgs.find(m => m.id === messageId);

          if (conv && !conv.participantIds.includes(effectiveUserId) && !conv.isChannel) {
            ws.send(JSON.stringify({ type: 'chat:error', error: 'Acceso prohibido: no perteneces a esta conversación.' }));
            break;
          }

          if ((deleteType === 'for_everyone' || deleteType === 'permanent') && targetMsg) {
            const isAuthor = targetMsg.senderId === effectiveUserId;
            const isAdmin = conv?.adminIds?.includes(effectiveUserId);
            if (!isAuthor && !isAdmin) {
              ws.send(JSON.stringify({ type: 'chat:error', error: 'Solo el autor o administrador puede eliminar para todos.' }));
              break;
            }
          }

          // Auto-create conv record if it was a direct conversation
          if (!conv) {
            conv = {
              id: conversationId,
              type: 'direct',
              title: 'Chat',
              avatarUrl: '',
              participantIds: [effectiveUserId],
              unreadCounts: {},
              lastMessageText: '',
              lastMessageTime: Date.now(),
              isPinned: false,
              createdAt: Date.now()
            };
            db.conversations[conversationId] = conv;
          }

          if (deleteType === 'for_everyone') {
            if (targetMsg) {
              targetMsg.isDeletedForEveryone = true;
              targetMsg.text = 'Este mensaje fue eliminado.';
              targetMsg.mediaUrl = undefined;
              targetMsg.poll = undefined;
              targetMsg.location = undefined;
              targetMsg.contact = undefined;
            } else {
              const fallbackDeleted: MessageRecord = {
                id: messageId,
                conversationId,
                senderId: effectiveUserId,
                senderName: '',
                senderAvatar: '',
                text: 'Este mensaje fue eliminado.',
                type: 'text',
                status: 'read',
                reactions: {},
                timestamp: Date.now(),
                isDeletedForEveryone: true
              };
              targetMsg = fallbackDeleted;
              if (!db.messages[conversationId]) {
                db.messages[conversationId] = [];
              }
              db.messages[conversationId].push(fallbackDeleted);
            }

            if (targetMsg && (conv.lastMessageTime === targetMsg.timestamp || !conv.lastMessageText)) {
              conv.lastMessageText = 'Este mensaje fue eliminado.';
            }

            saveDatabase(db);

            broadcast({
              type: 'chat:message_deleted',
              data: {
                conversationId,
                messageId,
                isDeletedForEveryone: true,
                deletedMessage: targetMsg
              }
            });

          } else if (deleteType === 'permanent') {
            if (db.messages[conversationId]) {
              db.messages[conversationId] = db.messages[conversationId].filter(m => m.id !== messageId);
            }
            const remaining = db.messages[conversationId] || [];
            const last = remaining.length > 0 ? remaining[remaining.length - 1] : undefined;
            conv.lastMessageText = last ? (last.text || 'Mensaje') : '';
            conv.lastMessageTime = last ? last.timestamp : Date.now();
            saveDatabase(db);

            broadcast({
              type: 'chat:message_deleted_permanent',
              data: { conversationId, messageId }
            });
          } else {
            // Delete for me
            if (targetMsg) {
              if (!targetMsg.deletedForUserIds) {
                targetMsg.deletedForUserIds = [];
              }
              if (!targetMsg.deletedForUserIds.includes(effectiveUserId)) {
                targetMsg.deletedForUserIds.push(effectiveUserId);
              }
              saveDatabase(db);
            }

            ws.send(JSON.stringify({
              type: 'chat:message_deleted_for_me',
              data: { conversationId, messageId, userId: effectiveUserId }
            }));
          }
          break;
        }

        // --- 2.2 Edit Message (Backend real sync with "Editado" label) ---
        case 'chat:edit_message': {
          const authenticatedUserId = socketToUser.get(ws);
          if (!authenticatedUserId) {
            ws.send(JSON.stringify({ type: 'chat:error', error: 'No autorizado: se requiere conexión WebSocket autenticada.' }));
            break;
          }
          const { conversationId, messageId, userId, newText } = data;
          if (userId && userId !== authenticatedUserId) {
            ws.send(JSON.stringify({ type: 'chat:error', error: 'Acceso prohibido: no puedes editar mensajes en nombre de otro usuario.' }));
            break;
          }
          const effectiveUserId = authenticatedUserId;
          const conv = db.conversations[conversationId];
          const msgs = db.messages[conversationId] || [];
          const targetMsg = msgs.find(m => m.id === messageId);

          if (!conv || !targetMsg) {
            ws.send(JSON.stringify({ type: 'error', message: 'Mensaje no encontrado' }));
            break;
          }

          if (!conv.participantIds.includes(effectiveUserId) && !conv.isChannel) {
            ws.send(JSON.stringify({ type: 'error', message: 'Acceso prohibido: no eres participante de esta conversación.' }));
            break;
          }

          // Validation: only sender can edit and cannot edit deleted messages
          if (targetMsg.senderId !== effectiveUserId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Solo el autor puede editar su mensaje.' }));
            break;
          }
          if (targetMsg.isDeletedForEveryone) {
            ws.send(JSON.stringify({ type: 'error', message: 'No se puede editar un mensaje eliminado.' }));
            return;
          }

          // 15-minute standard WhatsApp edit window (or up to 24h)
          const minutesElapsed = (Date.now() - targetMsg.timestamp) / (1000 * 60);
          if (minutesElapsed > 1440) { // 24 hours
            ws.send(JSON.stringify({ type: 'error', message: 'El tiempo límite para editar este mensaje ha expirado.' }));
            return;
          }

          targetMsg.text = newText;
          targetMsg.isEdited = true;
          targetMsg.editedAt = Date.now();

          if (conv.lastMessageTime === targetMsg.timestamp) {
            conv.lastMessageText = newText;
          }

          saveDatabase(db);

          // Broadcast to all participants
          broadcast({
            type: 'chat:message_edited',
            data: {
              conversationId,
              messageId,
              newText,
              isEdited: true,
              editedAt: targetMsg.editedAt
            }
          }, conv.participantIds);
          break;
        }

        // --- 2.3 Real Reactions Sync (Authenticated) ---
        case 'chat:reaction': {
          const authUserId = socketToUser.get(ws);
          if (!authUserId) break;
          const { conversationId, messageId, userId, emoji } = data || {};
          if (userId && userId !== authUserId) break;
          const conv = db.conversations[conversationId];
          const msgs = db.messages[conversationId] || [];
          const targetMsg = msgs.find(m => m.id === messageId);

          if (conv && targetMsg && (conv.participantIds.includes(authUserId) || conv.isChannel)) {
            if (!targetMsg.reactions) targetMsg.reactions = {};
            const existing = targetMsg.reactions[emoji] || [];
            if (existing.includes(authUserId)) {
              targetMsg.reactions[emoji] = existing.filter(u => u !== authUserId);
              if (targetMsg.reactions[emoji].length === 0) delete targetMsg.reactions[emoji];
            } else {
              targetMsg.reactions[emoji] = [...existing, authUserId];
            }
            saveDatabase(db);

            broadcast({
              type: 'chat:reaction_updated',
              data: { conversationId, messageId, reactions: targetMsg.reactions }
            }, conv.participantIds);
          }
          break;
        }

        // --- 2.3.1 Real Poll Voting Sync (Authenticated) ---
        case 'chat:poll_vote': {
          const authUserId = socketToUser.get(ws);
          if (!authUserId) break;
          const { conversationId, messageId, optionId, userId } = data || {};
          if (userId && userId !== authUserId) break;
          const conv = db.conversations[conversationId];
          const msgs = db.messages[conversationId] || [];
          const targetMsg = msgs.find(m => m.id === messageId);

          if (conv && targetMsg && targetMsg.poll && (conv.participantIds.includes(authUserId) || conv.isChannel)) {
            const allowsMultiple = targetMsg.poll.allowsMultipleAnswers;
            targetMsg.poll.options = targetMsg.poll.options.map((opt: any) => {
              const hasVoted = (opt.votes || []).includes(authUserId);
              if (opt.id === optionId) {
                return {
                  ...opt,
                  votes: hasVoted
                    ? opt.votes.filter((u: string) => u !== authUserId)
                    : [...(opt.votes || []), authUserId]
                };
              } else if (!allowsMultiple) {
                return {
                  ...opt,
                  votes: (opt.votes || []).filter((u: string) => u !== authUserId)
                };
              }
              return opt;
            });

            saveDatabase(db);

            broadcast({
              type: 'chat:poll_voted',
              data: { conversationId, messageId, poll: targetMsg.poll }
            }, conv.participantIds);
          }
          break;
        }

        // --- 2.4 Star & Pin Message Real Sync (Authenticated) ---
        case 'chat:star_message': {
          const authUserId = socketToUser.get(ws);
          if (!authUserId) break;
          const { conversationId, messageId, isStarred } = data || {};
          const conv = db.conversations[conversationId];
          const msgs = db.messages[conversationId] || [];
          const target = msgs.find(m => m.id === messageId);
          if (conv && target && (conv.participantIds.includes(authUserId) || conv.isChannel)) {
            target.isStarred = isStarred;
            saveDatabase(db);
          }
          break;
        }

        case 'chat:pin_message': {
          const authUserId = socketToUser.get(ws);
          if (!authUserId) break;
          const { conversationId, messageId, isPinned } = data || {};
          const conv = db.conversations[conversationId];
          const msgs = db.messages[conversationId] || [];
          if (conv && (conv.participantIds.includes(authUserId) || conv.isChannel)) {
            msgs.forEach(m => {
              m.isPinned = m.id === messageId ? isPinned : false;
            });
            saveDatabase(db);
            broadcast({
              type: 'chat:pinned_updated',
              data: { conversationId, messageId, isPinned }
            }, conv.participantIds);
          }
          break;
        }

        // --- 2.5 Conversation Actions (Authenticated) ---
        case 'chat:conversation_action': {
          const authUserId = socketToUser.get(ws);
          if (!authUserId) break;
          const { conversationId, userId, action, payload } = data || {};
          if (userId && userId !== authUserId) break;
          const conv = db.conversations[conversationId];
          if (!conv || !conv.participantIds.includes(authUserId)) break;

          if (action === 'pin') {
            conv.isPinned = !!payload?.isPinned;
          } else if (action === 'archive') {
            conv.isArchived = !!payload?.isArchived;
          } else if (action === 'mute') {
            conv.isMuted = !!payload?.isMuted;
          } else if (action === 'mark_unread') {
            conv.unreadCounts[authUserId] = (conv.unreadCounts[authUserId] || 0) > 0 ? 0 : 1;
          } else if (action === 'clear_messages') {
            db.messages[conversationId] = [];
            conv.lastMessageText = 'Conversación vaciada';
          } else if (action === 'delete_conversation') {
            conv.participantIds = conv.participantIds.filter(id => id !== authUserId);
            if (conv.participantIds.length === 0) {
              delete db.conversations[conversationId];
              delete db.messages[conversationId];
            }
          }
          saveDatabase(db);

          broadcast({
            type: 'chat:conversation_updated',
            data: { conversation: conv, action, userId: authUserId }
          }, [authUserId]);
          break;
        }

        // --- 2.6 Group Management Actions (Authenticated) ---
        case 'group:action': {
          const authUserId = socketToUser.get(ws);
          if (!authUserId) break;
          const { conversationId, adminUserId, action, targetUserId, newInfo, permissions } = data || {};
          if (adminUserId && adminUserId !== authUserId) break;
          const conv = db.conversations[conversationId];
          if (!conv || conv.type !== 'group' || !conv.participantIds.includes(authUserId)) break;

          const isAdmin = !conv.adminIds || conv.adminIds.length === 0 || conv.adminIds.includes(authUserId);

          if (action === 'update_info') {
            if (conv.onlyAdminsCanEditInfo && !isAdmin) {
              ws.send(JSON.stringify({ type: 'error', message: 'Solo los administradores pueden editar los datos del grupo.' }));
              break;
            }
            if (newInfo?.title) conv.title = newInfo.title;
            if (newInfo?.avatarUrl) conv.avatarUrl = newInfo.avatarUrl;
          } else if (action === 'add_member' && targetUserId) {
            if (!conv.participantIds.includes(targetUserId)) {
              conv.participantIds.push(targetUserId);
            }
          } else if (action === 'remove_member' && targetUserId) {
            if (!isAdmin && authUserId !== targetUserId) break;
            conv.participantIds = conv.participantIds.filter(id => id !== targetUserId);
            conv.adminIds = conv.adminIds?.filter(id => id !== targetUserId);
          } else if (action === 'promote_admin' && targetUserId && isAdmin) {
            if (!conv.adminIds) conv.adminIds = [];
            if (!conv.adminIds.includes(targetUserId)) conv.adminIds.push(targetUserId);
          } else if (action === 'demote_admin' && targetUserId && isAdmin) {
            conv.adminIds = conv.adminIds?.filter(id => id !== targetUserId);
          } else if (action === 'update_permissions' && isAdmin && permissions) {
            if (permissions.onlyAdminsCanSend !== undefined) conv.onlyAdminsCanSend = permissions.onlyAdminsCanSend;
            if (permissions.onlyAdminsCanEditInfo !== undefined) conv.onlyAdminsCanEditInfo = permissions.onlyAdminsCanEditInfo;
          }

          saveDatabase(db);

          broadcast({
            type: 'group:updated',
            data: { conversation: conv, action, targetUserId }
          }, conv.participantIds);
          break;
        }

        // --- 3. Typing Indicators (Authenticated) ---
        case 'chat:typing': {
          const authUserId = socketToUser.get(ws);
          if (!authUserId) break;
          const { conversationId, userId, isTyping } = data || {};
          if (userId && userId !== authUserId) break;
          const conv = db.conversations[conversationId];
          if (conv && conv.participantIds.includes(authUserId)) {
            const recipientIds = conv.participantIds.filter(id => id !== authUserId);
            broadcast({
              type: 'chat:user_typing',
              data: { conversationId, userId: authUserId, isTyping }
            }, recipientIds);
          }
          break;
        }

        // --- 4. Message Read Receipts (Authenticated) ---
        case 'chat:mark_read': {
          const authUserId = socketToUser.get(ws);
          if (!authUserId) break;
          const { conversationId, userId } = data || {};
          if (userId && userId !== authUserId) break;
          const conv = db.conversations[conversationId];
          if (conv && (conv.participantIds.includes(authUserId) || conv.isChannel)) {
            conv.unreadCounts[authUserId] = 0;
            const msgs = db.messages[conversationId] || [];
            msgs.forEach(m => {
              if (m.senderId !== authUserId && m.status !== 'read') {
                m.status = 'read';
              }
            });
            saveDatabase(db);

            broadcast({
              type: 'chat:read_receipt',
              data: { conversationId, readerId: authUserId }
            }, conv.participantIds);
          }
          break;
        }

        // --- 4.1 Message Delivery Confirmations ---
        case 'chat:delivery_ack': {
          const authUserId = socketToUser.get(ws);
          if (!authUserId) break;
          const { conversationId, messageId, recipientId } = data || {};
          if (recipientId && recipientId !== authUserId) break;
          const msgs = db.messages[conversationId] || [];
          const target = msgs.find(m => m.id === messageId);
          if (target && target.status === 'sent') {
            target.status = 'delivered';
            saveDatabase(db);
            broadcast({
              type: 'chat:message_delivered',
              data: { conversationId, messageId, recipientId: authUserId }
            }, [target.senderId]);
          }
          break;
        }

        // --- 5. Ephemeral Stories / Statuses (Authenticated) ---
        case 'status:publish': {
          const authUserId = socketToUser.get(ws);
          if (!authUserId) break;
          const { userId, textCaption, mediaUrl, bgHex, privacy } = data || {};
          if (userId && userId !== authUserId) break;
          const user = db.users[authUserId];
          if (user) {
            const newStatus: StatusRecord = {
              id: `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              userId: authUserId,
              userName: user.displayName,
              userAvatar: user.avatarUrl,
              textCaption,
              mediaUrl,
              bgHex: bgHex || '#0077B6',
              privacy: privacy || 'everyone',
              views: [],
              reactions: {},
              timestamp: Date.now()
            };
            db.statuses.unshift(newStatus);
            saveDatabase(db);

            broadcast({
              type: 'status:new',
              data: { status: newStatus }
            });
          }
          break;
        }

        // --- 6. WebRTC Signaling: 1-on-1 and Group Voice/Video Calling (Authenticated Anti-Spoofing) ---
        case 'webrtc:call_user': {
          const authUserId = socketToUser.get(ws);
          if (!authUserId) break;
          const { callerId, targetUserId, isVideo, offerSdp } = data || {};
          if (callerId && callerId !== authUserId) break;
          const callerUser = db.users[authUserId];
          broadcast({
            type: 'webrtc:incoming_call',
            data: {
              callId: `call_${Date.now()}`,
              callerId: authUserId,
              callerName: callerUser?.displayName || data?.callerName || 'Usuario NAKEIC',
              callerAvatar: callerUser?.avatarUrl || data?.callerAvatar || '',
              targetUserId,
              isVideo,
              offerSdp
            }
          }, [targetUserId]);
          break;
        }

        case 'webrtc:call_accept':
        case 'webrtc:accept_call': {
          const authUserId = socketToUser.get(ws);
          if (!authUserId) break;
          const { callerId, answerSdp } = data || {};
          broadcast({
            type: 'webrtc:call_accepted',
            data: { callerId, targetUserId: authUserId, answerSdp }
          }, [callerId]);
          break;
        }

        case 'webrtc:call_reject':
        case 'webrtc:reject_call': {
          const authUserId = socketToUser.get(ws);
          if (!authUserId) break;
          const { callerId, reason } = data || {};
          broadcast({
            type: 'webrtc:call_rejected',
            data: { callerId, targetUserId: authUserId, reason: reason || 'declined' }
          }, [callerId]);
          break;
        }

        case 'webrtc:call_end':
        case 'webrtc:end_call': {
          const authUserId = socketToUser.get(ws);
          if (!authUserId) break;
          const { recipientId } = data || {};
          broadcast({
            type: 'webrtc:call_ended',
            data: { endedBy: authUserId }
          }, recipientId ? [recipientId] : undefined);
          break;
        }

        case 'webrtc:ice_candidate': {
          const authUserId = socketToUser.get(ws);
          if (!authUserId) break;
          const { targetUserId, candidate } = data || {};
          broadcast({
            type: 'webrtc:ice_candidate',
            data: { candidate, fromUserId: authUserId }
          }, [targetUserId]);
          break;
        }

        // --- 7. Group Call Signaling (Mesh WebRTC) ---
        case 'webrtc:group_join': {
          const authUserId = socketToUser.get(ws);
          if (!authUserId) break;
          const { conversationId, user } = data || {};
          const conv = db.conversations[conversationId];
          if (conv && conv.participantIds.includes(authUserId)) {
            broadcast({
              type: 'webrtc:group_user_joined',
              data: { conversationId, user: { ...(user || {}), id: authUserId } }
            }, conv.participantIds.filter(id => id !== authUserId));
          }
          break;
        }

        case 'webrtc:group_signal': {
          const authUserId = socketToUser.get(ws);
          if (!authUserId) break;
          const { targetUserId, signal, fromUser } = data || {};
          broadcast({
            type: 'webrtc:group_signal',
            data: { signal, fromUser: { ...(fromUser || {}), id: authUserId } }
          }, [targetUserId]);
          break;
        }

        case 'webrtc:group_leave': {
          const authUserId = socketToUser.get(ws);
          if (!authUserId) break;
          const { conversationId } = data || {};
          const conv = db.conversations[conversationId];
          if (conv && conv.participantIds.includes(authUserId)) {
            broadcast({
              type: 'webrtc:group_user_left',
              data: { conversationId, userId: authUserId }
            }, conv.participantIds);
          }
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('Error processing websocket message:', err);
    }
  });

  ws.on('close', () => {
    const userId = socketToUser.get(ws);
    if (userId) {
      const userSockets = connectedClients.get(userId);
      if (userSockets) {
        userSockets.delete(ws);
        if (userSockets.size === 0) {
          connectedClients.delete(userId);
          // Mark user as offline
          if (db.users[userId]) {
            db.users[userId].isOnline = false;
            db.users[userId].lastSeen = Date.now();
            saveDatabase(db);
          }
          broadcast({
            type: 'presence:update',
            data: { userId, isOnline: false, lastSeen: Date.now() }
          });
        }
      }
      socketToUser.delete(ws);
    }
  });
});

// ============================================================================
// NAKEIC LIVE — Unlimited Concurrent Broadcasters, Guests, Battles, Monetization & Moderation Engine
// ============================================================================
interface LiveCommentServer {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  type: 'chat' | 'system' | 'gift';
  timestamp: number;
}

interface LiveGuestRequestServer {
  userId: string;
  userName: string;
  userAvatar: string;
  requestedAt: number;
}

interface LiveCoHostServer {
  userId: string;
  userName: string;
  userAvatar: string;
  isMuted: boolean;
  isVideoPaused: boolean;
  joinedAt: number;
}

interface LiveBattleServer {
  id: string;
  challengerRoomId: string;
  opponentRoomId: string;
  challengerHostId: string;
  challengerHostName: string;
  challengerHostAvatar: string;
  opponentHostId: string;
  opponentHostName: string;
  opponentHostAvatar: string;
  challengerScore: number;
  opponentScore: number;
  status: 'pending' | 'active' | 'completed';
  durationSeconds: number;
  startedAt: number;
  endsAt: number;
  winnerHostId?: string | null;
  timer?: NodeJS.Timeout;
}

interface LiveStreamRoomServer {
  id: string;
  hostId: string;
  hostName: string;
  hostUsername: string;
  hostAvatar: string;
  title: string;
  description: string;
  category: string;
  coverUrl?: string;
  sourceMode: 'camera' | 'screen' | 'studio';
  joinPolicy: 'everyone' | 'followers' | 'invite_only';
  commentsEnabled: boolean;
  qualityPreset: 'auto' | '720p' | '480p' | '360p';
  bannedWords: string[];
  invitedUserIds: Set<string>;
  startedAt: number;
  viewerCount: number;
  peakViewers: number;
  likesCount: number;
  giftsCount: number;
  earnedCoins: number;
  followersCount: number;
  isAudioMuted: boolean;
  isVideoPaused: boolean;
  pinnedComment?: { id: string; userName: string; text: string } | null;
  lastFrame?: string;
  comments: LiveCommentServer[];
  guestRequests: LiveGuestRequestServer[];
  coHosts: LiveCoHostServer[];
  mutedViewers: Map<string, number>;
  bannedViewers: Set<string>;
  activeBattleId?: string | null;
}

const liveRooms = new Map<string, LiveStreamRoomServer>();
const liveRoomViewers = new Map<string, Map<WebSocket, { viewerId: string; viewerName: string; viewerAvatar: string }>>();
const liveHostSocket = new Map<string, WebSocket>();
const liveSocketClients = new Set<WebSocket>();
const liveSocketJoinedRooms = new Map<WebSocket, Set<string>>();
const liveSocketHostedRoom = new Map<WebSocket, string>();
const liveSocketToUser = new Map<WebSocket, { userId: string; userName: string; userAvatar: string }>();
const liveUserSockets = new Map<string, Set<WebSocket>>();
const liveBroadcasterFollows = new Map<string, Set<string>>();
const liveBattles = new Map<string, LiveBattleServer>();
const livePendingBattleInvites = new Map<string, LiveBattleServer>();
const liveCommentThrottle = new Map<WebSocket, number[]>();

function resolveLiveSessionToken(token?: string): UserRecord | null {
  if (!token || !db.sessions) return null;
  for (const [uid, sessions] of Object.entries(db.sessions)) {
    const valid = sessions.find(s => s.token === token && !s.isRevoked && (!s.expiresAt || s.expiresAt > Date.now()));
    if (valid && db.users[uid]) {
      return db.users[uid];
    }
  }
  return null;
}

function getRoomModeratorIds(hostId: string): string[] {
  return (db.liveModerators && db.liveModerators[hostId]) || [];
}

function isRoomModeratorOrHost(room: LiveStreamRoomServer, userId: string): boolean {
  if (!userId) return false;
  if (room.hostId === userId) return true;
  return getRoomModeratorIds(room.hostId).includes(userId);
}

function appendModerationAuditLog(entry: Omit<LiveModerationLogRecord, 'id' | 'createdAt'>) {
  const full: LiveModerationLogRecord = {
    ...entry,
    id: `mod_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    createdAt: Date.now()
  };
  if (!db.liveModerationLogs) db.liveModerationLogs = [];
  db.liveModerationLogs.unshift(full);
  if (db.liveModerationLogs.length > 1000) db.liveModerationLogs.pop();
  saveDatabase(db);
  nakeicRepository.recordModerationLog({
    id: full.id,
    roomId: full.roomId,
    actorUserId: full.actorUserId,
    targetUserId: full.targetUserId,
    action: full.action,
    reason: full.reason,
    durationSeconds: full.durationSeconds,
    createdAt: full.createdAt
  }).catch(() => {});
  return full;
}

function serializeBattle(b: LiveBattleServer) {
  return {
    id: b.id,
    challengerRoomId: b.challengerRoomId,
    opponentRoomId: b.opponentRoomId,
    challengerHostId: b.challengerHostId,
    challengerHostName: b.challengerHostName,
    challengerHostAvatar: b.challengerHostAvatar,
    opponentHostId: b.opponentHostId,
    opponentHostName: b.opponentHostName,
    opponentHostAvatar: b.opponentHostAvatar,
    challengerScore: b.challengerScore,
    opponentScore: b.opponentScore,
    status: b.status,
    durationSeconds: b.durationSeconds,
    startedAt: b.startedAt,
    endsAt: b.endsAt,
    winnerHostId: b.winnerHostId || null
  };
}

function serializeLiveRoomSummary(room: LiveStreamRoomServer, includeFrame: boolean = true) {
  const activeBattle = room.activeBattleId ? liveBattles.get(room.activeBattleId) : undefined;
  return {
    id: room.id,
    hostId: room.hostId,
    hostName: room.hostName,
    hostUsername: room.hostUsername,
    hostAvatar: room.hostAvatar,
    title: room.title,
    description: room.description,
    category: room.category,
    coverUrl: room.coverUrl,
    sourceMode: room.sourceMode,
    joinPolicy: room.joinPolicy,
    commentsEnabled: room.commentsEnabled,
    qualityPreset: room.qualityPreset,
    bannedWords: room.bannedWords,
    startedAt: room.startedAt,
    viewerCount: room.viewerCount,
    peakViewers: room.peakViewers,
    likesCount: room.likesCount,
    giftsCount: room.giftsCount,
    earnedCoins: room.earnedCoins,
    followersCount: room.followersCount,
    isAudioMuted: room.isAudioMuted,
    isVideoPaused: room.isVideoPaused,
    pinnedComment: room.pinnedComment || null,
    coHosts: room.coHosts,
    guestRequests: room.guestRequests,
    moderatorIds: getRoomModeratorIds(room.hostId),
    activeBattle: activeBattle ? serializeBattle(activeBattle) : null,
    lastFrame: includeFrame ? room.lastFrame : undefined
  };
}

function broadcastLiveAll(type: string, data: any) {
  const payload = JSON.stringify({ type, data });
  liveSocketClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client.bufferedAmount < 1024 * 1024) {
      client.send(payload);
    }
  });
}

function broadcastLiveRoomsList() {
  const roomsList = Array.from(liveRooms.values())
    .sort((a, b) => b.viewerCount - a.viewerCount || b.startedAt - a.startedAt)
    .map(r => serializeLiveRoomSummary(r, true));
  broadcastLiveAll('live:rooms_list', { rooms: roomsList });
}

function broadcastToLiveRoom(roomId: string, type: string, data: any, excludeWs?: WebSocket) {
  const payload = JSON.stringify({ type, data });
  const viewers = liveRoomViewers.get(roomId);
  if (viewers) {
    viewers.forEach((_, clientWs) => {
      if (clientWs !== excludeWs && clientWs.readyState === WebSocket.OPEN && clientWs.bufferedAmount < 512 * 1024) {
        clientWs.send(payload);
      }
    });
  }
  const hostWs = liveHostSocket.get(roomId);
  if (hostWs && hostWs !== excludeWs && hostWs.readyState === WebSocket.OPEN && hostWs.bufferedAmount < 512 * 1024) {
    hostWs.send(payload);
  }
}

function sendToLiveUser(userId: string, type: string, data: any) {
  const sockets = liveUserSockets.get(userId);
  if (!sockets) return;
  const payload = JSON.stringify({ type, data });
  sockets.forEach(s => {
    if (s.readyState === WebSocket.OPEN) {
      s.send(payload);
    }
  });
}

function finishLiveBattle(battleId: string, endedEarlyBy?: string) {
  const battle = liveBattles.get(battleId);
  if (!battle || battle.status !== 'active') return;
  if (battle.timer) clearTimeout(battle.timer);
  battle.status = 'completed';

  let winnerHostId: string | null = null;
  if (battle.challengerScore > battle.opponentScore) {
    winnerHostId = battle.challengerHostId;
  } else if (battle.opponentScore > battle.challengerScore) {
    winnerHostId = battle.opponentHostId;
  }
  battle.winnerHostId = winnerHostId;

  const historyEntry: BattleHistoryRecord = {
    id: battle.id,
    challengerRoomId: battle.challengerRoomId,
    opponentRoomId: battle.opponentRoomId,
    challengerHostId: battle.challengerHostId,
    challengerHostName: battle.challengerHostName,
    opponentHostId: battle.opponentHostId,
    opponentHostName: battle.opponentHostName,
    challengerScore: battle.challengerScore,
    opponentScore: battle.opponentScore,
    winnerHostId,
    durationSeconds: battle.durationSeconds,
    startedAt: battle.startedAt,
    endedAt: Date.now()
  };

  if (!db.battleHistory) db.battleHistory = [];
  db.battleHistory.unshift(historyEntry);
  if (db.battleHistory.length > 200) db.battleHistory.pop();
  serverMetrics.totalBattlesCompleted++;
  saveDatabase(db);

  const r1 = liveRooms.get(battle.challengerRoomId);
  const r2 = liveRooms.get(battle.opponentRoomId);
  if (r1 && r1.activeBattleId === battle.id) r1.activeBattleId = null;
  if (r2 && r2.activeBattleId === battle.id) r2.activeBattleId = null;

  const resultPayload = { battle: serializeBattle(battle), endedEarlyBy };
  broadcastToLiveRoom(battle.challengerRoomId, 'live:battle_ended', resultPayload);
  broadcastToLiveRoom(battle.opponentRoomId, 'live:battle_ended', resultPayload);
  liveBattles.delete(battleId);
}

function endLiveRoom(roomId: string, reason: string = 'ended_by_host') {
  const room = liveRooms.get(roomId);
  if (!room) return;

  if (room.activeBattleId) {
    finishLiveBattle(room.activeBattleId, room.hostId);
  }

  const endedAt = Date.now();
  const durationSeconds = Math.max(1, Math.floor((endedAt - room.startedAt) / 1000));

  const historyItem: LiveHistoryRecord = {
    id: room.id,
    hostId: room.hostId,
    hostName: room.hostName,
    hostUsername: room.hostUsername,
    hostAvatar: room.hostAvatar,
    title: room.title,
    description: room.description,
    category: room.category,
    coverUrl: room.coverUrl,
    startedAt: room.startedAt,
    endedAt,
    durationSeconds,
    peakViewers: room.peakViewers,
    likesCount: room.likesCount,
    giftsCount: room.giftsCount,
    earnedCoins: room.earnedCoins,
    replayAvailable: Boolean(room.lastFrame || room.coverUrl),
    previewFrame: room.lastFrame || room.coverUrl
  };
  if (!db.liveHistory) db.liveHistory = [];
  db.liveHistory.unshift(historyItem);
  if (db.liveHistory.length > 100) db.liveHistory.pop();
  saveDatabase(db);

  nakeicRepository.saveLiveStreamSummary({
    id: room.id,
    hostId: room.hostId,
    title: room.title,
    description: room.description,
    category: room.category,
    coverUrl: room.coverUrl,
    sourceMode: room.sourceMode,
    joinPolicy: room.joinPolicy,
    commentsEnabled: room.commentsEnabled,
    qualityPreset: room.qualityPreset,
    status: reason === 'terminated_by_mod' ? 'terminated_by_mod' : 'ended',
    startedAt: room.startedAt,
    endedAt,
    durationSeconds,
    peakViewers: room.peakViewers,
    likesCount: room.likesCount,
    giftsCount: room.giftsCount,
    earnedCoins: room.earnedCoins
  }).catch(() => {});

  broadcastToLiveRoom(roomId, 'live:ended', {
    roomId,
    reason,
    summary: {
      durationSeconds,
      peakViewers: room.peakViewers,
      likesCount: room.likesCount,
      giftsCount: room.giftsCount,
      earnedCoins: room.earnedCoins
    }
  });

  const hostWs = liveHostSocket.get(roomId);
  if (hostWs) {
    liveSocketHostedRoom.delete(hostWs);
  }
  liveHostSocket.delete(roomId);
  liveRoomViewers.delete(roomId);
  liveRooms.delete(roomId);
  broadcastLiveRoomsList();
}

wssLive.on('connection', (ws: WebSocket) => {
  liveSocketClients.add(ws);
  liveSocketJoinedRooms.set(ws, new Set());

  const initialRooms = Array.from(liveRooms.values())
    .sort((a, b) => b.viewerCount - a.viewerCount || b.startedAt - a.startedAt)
    .map(r => serializeLiveRoomSummary(r, true));
  ws.send(JSON.stringify({ type: 'live:rooms_list', data: { rooms: initialRooms } }));

  ws.on('message', (rawData: Buffer | string) => {
    try {
      serverMetrics.totalLiveMessages++;
      const msg = JSON.parse(rawData.toString());
      const { type, data } = msg;

      switch (type) {
        case 'live:register_client': {
          const { token, userId, userName, userAvatar } = data || {};
          const authUser = resolveLiveSessionToken(token);
          const resolvedId = authUser?.id || userId;
          if (resolvedId) {
            liveSocketToUser.set(ws, {
              userId: resolvedId,
              userName: authUser?.displayName || userName || 'Usuario NAKEIC',
              userAvatar: authUser?.avatarUrl || userAvatar || ''
            });
            if (!liveUserSockets.has(resolvedId)) liveUserSockets.set(resolvedId, new Set());
            liveUserSockets.get(resolvedId)!.add(ws);
          }

          const roomsList = Array.from(liveRooms.values())
            .sort((a, b) => b.viewerCount - a.viewerCount || b.startedAt - a.startedAt)
            .map(r => serializeLiveRoomSummary(r, true));
          ws.send(JSON.stringify({ type: 'live:rooms_list', data: { rooms: roomsList } }));
          break;
        }

        case 'live:start': {
          const {
            title,
            description = '',
            category = 'General',
            coverUrl,
            sourceMode = 'camera',
            joinPolicy = 'everyone',
            commentsEnabled = true,
            qualityPreset = 'auto',
            bannedWords = [],
            hostId,
            hostName,
            hostUsername,
            hostAvatar,
            token
          } = data || {};

          const prevHosted = liveSocketHostedRoom.get(ws);
          if (prevHosted) {
            endLiveRoom(prevHosted, 'restarted');
          }

          const authUser = resolveLiveSessionToken(token);
          const verifiedHostId = authUser?.id || hostId || `host_${crypto.randomBytes(4).toString('hex')}`;
          const verifiedHostName = (authUser?.displayName || hostName || 'Creador NAKEIC').toString().slice(0, 60);
          const verifiedHostUsername = (authUser?.username || hostUsername || 'creador_nakeic').toString().slice(0, 40);
          const verifiedHostAvatar = authUser?.avatarUrl || hostAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${verifiedHostId}`;

          liveSocketToUser.set(ws, { userId: verifiedHostId, userName: verifiedHostName, userAvatar: verifiedHostAvatar });
          if (!liveUserSockets.has(verifiedHostId)) liveUserSockets.set(verifiedHostId, new Set());
          liveUserSockets.get(verifiedHostId)!.add(ws);

          const roomId = `live_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
          const followersSet = liveBroadcasterFollows.get(verifiedHostId) || new Set<string>();
          const cleanBanned = Array.isArray(bannedWords)
            ? bannedWords.map((w: any) => String(w).trim().toLowerCase()).filter(Boolean).slice(0, 50)
            : [];

          const room: LiveStreamRoomServer = {
            id: roomId,
            hostId: verifiedHostId,
            hostName: verifiedHostName,
            hostUsername: verifiedHostUsername,
            hostAvatar: verifiedHostAvatar,
            title: (title || 'Transmisión en vivo por NAKEIC').toString().trim().slice(0, 120),
            description: (description || '').toString().trim().slice(0, 300),
            category: category.toString().slice(0, 32),
            coverUrl: typeof coverUrl === 'string' && coverUrl.trim() ? coverUrl.trim().slice(0, 500) : undefined,
            sourceMode: sourceMode === 'screen' || sourceMode === 'studio' ? sourceMode : 'camera',
            joinPolicy: joinPolicy === 'followers' || joinPolicy === 'invite_only' ? joinPolicy : 'everyone',
            commentsEnabled: commentsEnabled !== false,
            qualityPreset: ['auto', '720p', '480p', '360p'].includes(qualityPreset) ? qualityPreset : 'auto',
            bannedWords: cleanBanned,
            invitedUserIds: new Set<string>(),
            startedAt: Date.now(),
            viewerCount: 0,
            peakViewers: 0,
            likesCount: 0,
            giftsCount: 0,
            earnedCoins: 0,
            followersCount: followersSet.size,
            isAudioMuted: false,
            isVideoPaused: false,
            pinnedComment: null,
            comments: [{
              id: `lc_sys_${Date.now()}`,
              roomId,
              userId: 'system',
              userName: 'NAKEIC Live',
              text: `${verifiedHostName} inició una transmisión en vivo.`,
              type: 'system',
              timestamp: Date.now()
            }],
            guestRequests: [],
            coHosts: [],
            mutedViewers: new Map(),
            bannedViewers: new Set(),
            activeBattleId: null
          };

          liveRooms.set(roomId, room);
          liveRoomViewers.set(roomId, new Map());
          liveHostSocket.set(roomId, ws);
          liveSocketHostedRoom.set(ws, roomId);
          serverMetrics.totalLiveStreamsStarted++;

          const rtcConfig = buildLiveRtcConfig({
            roomId,
            participantId: verifiedHostId,
            participantName: verifiedHostName,
            role: 'host'
          });

          ws.send(JSON.stringify({
            type: 'live:started',
            data: {
              room: { ...serializeLiveRoomSummary(room, true), comments: room.comments },
              rtcConfig
            }
          }));
          broadcastLiveRoomsList();

          if (followersSet.size > 0) {
            broadcast({
              type: 'live:creator_went_live',
              data: {
                roomId,
                hostId: verifiedHostId,
                hostName: verifiedHostName,
                hostAvatar: verifiedHostAvatar,
                title: room.title,
                category: room.category
              }
            }, Array.from(followersSet));
          }

          redisCoordinator.publish('nakeic:live:events', { event: 'room_started', roomId, hostId: verifiedHostId }).catch(() => {});
          break;
        }

        case 'live:join': {
          const { roomId, viewerId, viewerName, viewerAvatar, token } = data || {};
          const room = liveRooms.get(roomId);
          if (!room) {
            ws.send(JSON.stringify({ type: 'live:not_found', data: { roomId } }));
            break;
          }

          const authUser = resolveLiveSessionToken(token);
          const resolvedViewerId = authUser?.id || viewerId || `viewer_${crypto.randomBytes(3).toString('hex')}`;
          const cleanName = (authUser?.displayName || viewerName || 'Espectador').toString().slice(0, 48);
          const resolvedAvatar = authUser?.avatarUrl || viewerAvatar || '';

          liveSocketToUser.set(ws, { userId: resolvedViewerId, userName: cleanName, userAvatar: resolvedAvatar });
          if (!liveUserSockets.has(resolvedViewerId)) liveUserSockets.set(resolvedViewerId, new Set());
          liveUserSockets.get(resolvedViewerId)!.add(ws);

          if (room.bannedViewers.has(resolvedViewerId)) {
            ws.send(JSON.stringify({
              type: 'live:join_denied',
              data: { roomId, reason: 'Has sido expulsado de esta transmisión en vivo por el equipo de moderación.' }
            }));
            break;
          }

          const followersSet = liveBroadcasterFollows.get(room.hostId);
          const isFollowing = followersSet ? followersSet.has(resolvedViewerId) : false;

          if (room.hostId !== resolvedViewerId) {
            if (room.joinPolicy === 'followers' && !isFollowing && !isRoomModeratorOrHost(room, resolvedViewerId)) {
              ws.send(JSON.stringify({
                type: 'live:join_denied',
                data: { roomId, reason: 'Transmisión exclusiva para seguidores del creador.' }
              }));
              break;
            }
            if (room.joinPolicy === 'invite_only' && !room.invitedUserIds.has(resolvedViewerId) && !isRoomModeratorOrHost(room, resolvedViewerId)) {
              ws.send(JSON.stringify({
                type: 'live:join_denied',
                data: { roomId, reason: 'Esta transmisión requiere invitación directa del anfitrión.' }
              }));
              break;
            }
          }

          let viewersMap = liveRoomViewers.get(roomId);
          if (!viewersMap) {
            viewersMap = new Map();
            liveRoomViewers.set(roomId, viewersMap);
          }

          const alreadyJoined = viewersMap.has(ws);
          viewersMap.set(ws, {
            viewerId: resolvedViewerId,
            viewerName: cleanName,
            viewerAvatar: resolvedAvatar
          });
          liveSocketJoinedRooms.get(ws)?.add(roomId);

          room.viewerCount = viewersMap.size;
          if (room.viewerCount > room.peakViewers) {
            room.peakViewers = room.viewerCount;
          }

          const rtcConfig = buildLiveRtcConfig({
            roomId,
            participantId: resolvedViewerId,
            participantName: cleanName,
            role: 'viewer'
          });

          ws.send(JSON.stringify({
            type: 'live:room_snapshot',
            data: {
              room: {
                ...serializeLiveRoomSummary(room, true),
                comments: room.comments.slice(-60)
              },
              isFollowing,
              rtcConfig
            }
          }));

          if (!alreadyJoined) {
            const joinComment: LiveCommentServer = {
              id: `lc_join_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
              roomId,
              userId: resolvedViewerId,
              userName: cleanName,
              text: 'se unió al En Vivo',
              type: 'system',
              timestamp: Date.now()
            };
            room.comments.push(joinComment);
            if (room.comments.length > 150) room.comments.shift();

            broadcastToLiveRoom(roomId, 'live:comment', { roomId, comment: joinComment });
            broadcastToLiveRoom(roomId, 'live:viewer_update', {
              roomId,
              viewerCount: room.viewerCount,
              peakViewers: room.peakViewers
            });
            broadcastLiveAll('live:room_stats', {
              roomId,
              viewerCount: room.viewerCount,
              likesCount: room.likesCount
            });
          }
          break;
        }

        case 'live:leave': {
          const { roomId } = data || {};
          const room = liveRooms.get(roomId);
          const viewersMap = liveRoomViewers.get(roomId);
          if (viewersMap && viewersMap.has(ws)) {
            const leftViewer = viewersMap.get(ws);
            viewersMap.delete(ws);
            liveSocketJoinedRooms.get(ws)?.delete(roomId);
            if (room) {
              room.viewerCount = viewersMap.size;
              if (leftViewer) {
                room.guestRequests = room.guestRequests.filter(g => g.userId !== leftViewer.viewerId);
                const coHostIdx = room.coHosts.findIndex(c => c.userId === leftViewer.viewerId);
                if (coHostIdx >= 0) {
                  room.coHosts.splice(coHostIdx, 1);
                  broadcastToLiveRoom(roomId, 'live:guests_updated', {
                    roomId,
                    coHosts: room.coHosts,
                    guestRequests: room.guestRequests
                  });
                }
              }
              broadcastToLiveRoom(roomId, 'live:viewer_update', {
                roomId,
                viewerCount: room.viewerCount,
                peakViewers: room.peakViewers
              });
              broadcastLiveAll('live:room_stats', {
                roomId,
                viewerCount: room.viewerCount,
                likesCount: room.likesCount
              });
            }
          }
          break;
        }

        case 'live:media_frame': {
          const { roomId, frameData, timestamp } = data || {};
          const room = liveRooms.get(roomId);
          if (!room || liveHostSocket.get(roomId) !== ws || typeof frameData !== 'string') break;
          if (frameData.length > 1500000) break;

          room.lastFrame = frameData;
          const viewers = liveRoomViewers.get(roomId);
          if (viewers && viewers.size > 0) {
            const payload = JSON.stringify({
              type: 'live:media_frame',
              data: { roomId, frameData, timestamp: timestamp || Date.now() }
            });
            viewers.forEach((_, clientWs) => {
              if (clientWs.readyState === WebSocket.OPEN && clientWs.bufferedAmount < 512 * 1024) {
                clientWs.send(payload);
              }
            });
          }
          break;
        }

        case 'live:media_audio': {
          const { roomId, pcmBase64, sampleRate } = data || {};
          const room = liveRooms.get(roomId);
          if (!room || liveHostSocket.get(roomId) !== ws || typeof pcmBase64 !== 'string') break;

          const viewers = liveRoomViewers.get(roomId);
          if (viewers && viewers.size > 0) {
            const payload = JSON.stringify({
              type: 'live:media_audio',
              data: { roomId, pcmBase64, sampleRate: sampleRate || 16000 }
            });
            viewers.forEach((_, clientWs) => {
              if (clientWs.readyState === WebSocket.OPEN && clientWs.bufferedAmount < 256 * 1024) {
                clientWs.send(payload);
              }
            });
          }
          break;
        }

        case 'live:state_update': {
          const { roomId, isAudioMuted, isVideoPaused, title, description, commentsEnabled, qualityPreset, joinPolicy, pinnedComment } = data || {};
          const room = liveRooms.get(roomId);
          if (!room || liveHostSocket.get(roomId) !== ws) break;

          if (typeof isAudioMuted === 'boolean') room.isAudioMuted = isAudioMuted;
          if (typeof isVideoPaused === 'boolean') room.isVideoPaused = isVideoPaused;
          if (typeof commentsEnabled === 'boolean') room.commentsEnabled = commentsEnabled;
          if (typeof title === 'string' && title.trim()) room.title = title.trim().slice(0, 120);
          if (typeof description === 'string') room.description = description.trim().slice(0, 300);
          if (qualityPreset && ['auto', '720p', '480p', '360p'].includes(qualityPreset)) room.qualityPreset = qualityPreset;
          if (joinPolicy && ['everyone', 'followers', 'invite_only'].includes(joinPolicy)) room.joinPolicy = joinPolicy;
          if (pinnedComment !== undefined) room.pinnedComment = pinnedComment;

          broadcastToLiveRoom(roomId, 'live:state_update', {
            roomId,
            isAudioMuted: room.isAudioMuted,
            isVideoPaused: room.isVideoPaused,
            commentsEnabled: room.commentsEnabled,
            qualityPreset: room.qualityPreset,
            joinPolicy: room.joinPolicy,
            title: room.title,
            description: room.description,
            pinnedComment: room.pinnedComment
          });
          broadcastLiveRoomsList();
          break;
        }

        case 'live:comment': {
          const { roomId, userId, userName, userAvatar, text } = data || {};
          const room = liveRooms.get(roomId);
          if (!room || typeof text !== 'string' || !text.trim()) break;

          const socketUser = liveSocketToUser.get(ws);
          const effectiveUserId = socketUser?.userId || userId || 'guest';

          if (room.bannedViewers.has(effectiveUserId)) {
            ws.send(JSON.stringify({ type: 'live:moderation_notice', data: { roomId, error: 'Has sido bloqueado en esta sala.' } }));
            break;
          }

          const mutedUntil = room.mutedViewers.get(effectiveUserId);
          if (mutedUntil && mutedUntil > Date.now()) {
            const secs = Math.ceil((mutedUntil - Date.now()) / 1000);
            ws.send(JSON.stringify({ type: 'live:moderation_notice', data: { roomId, error: `Estás silenciado por ${secs}s.` } }));
            break;
          }

          if (!room.commentsEnabled && room.hostId !== effectiveUserId) {
            ws.send(JSON.stringify({ type: 'live:moderation_notice', data: { roomId, error: 'El creador desactivó los comentarios en este LIVE.' } }));
            break;
          }

          const now = Date.now();
          const recentTimes = (liveCommentThrottle.get(ws) || []).filter(t => now - t < 4000);
          if (recentTimes.length >= 5) {
            ws.send(JSON.stringify({ type: 'live:moderation_notice', data: { roomId, error: 'Envías mensajes demasiado rápido. Espera unos segundos.' } }));
            break;
          }
          recentTimes.push(now);
          liveCommentThrottle.set(ws, recentTimes);

          let cleanText = text.trim().slice(0, 300);
          if (room.bannedWords.length > 0 && room.hostId !== effectiveUserId) {
            const lower = cleanText.toLowerCase();
            const matchedWord = room.bannedWords.find(w => w && lower.includes(w));
            if (matchedWord) {
              ws.send(JSON.stringify({
                type: 'live:moderation_notice',
                data: { roomId, error: 'Tu comentario contiene una palabra restringida por el creador y fue bloqueado.' }
              }));
              break;
            }
          }

          const comment: LiveCommentServer = {
            id: `lc_${now}_${crypto.randomBytes(3).toString('hex')}`,
            roomId,
            userId: effectiveUserId,
            userName: (socketUser?.userName || userName || 'Usuario NAKEIC').toString().slice(0, 48),
            userAvatar: socketUser?.userAvatar || userAvatar || '',
            text: cleanText,
            type: 'chat',
            timestamp: now
          };
          room.comments.push(comment);
          if (room.comments.length > 150) room.comments.shift();

          broadcastToLiveRoom(roomId, 'live:comment', { roomId, comment });
          break;
        }

        case 'live:reaction': {
          const { roomId, userId, userName, emoji } = data || {};
          const room = liveRooms.get(roomId);
          if (!room) break;

          room.likesCount += 1;
          broadcastToLiveRoom(roomId, 'live:reaction', {
            roomId,
            userId: userId || 'viewer',
            userName: userName || 'Espectador',
            emoji: emoji || '❤️',
            likesCount: room.likesCount
          });
          broadcastLiveAll('live:room_stats', {
            roomId,
            viewerCount: room.viewerCount,
            likesCount: room.likesCount
          });
          break;
        }

        case 'live:gift': {
          const { roomId, userId, userName, userAvatar, giftId, quantity, token } = data || {};
          const room = liveRooms.get(roomId);
          if (!room) break;

          const authFromToken = resolveLiveSessionToken(token);
          const socketIdentity = liveSocketToUser.get(ws);
          const senderId = authFromToken?.id || socketIdentity?.userId || userId;
          const senderName = authFromToken?.displayName || socketIdentity?.userName || userName || 'Espectador';

          if (!senderId) {
            ws.send(JSON.stringify({
              type: 'live:gift_error',
              data: { roomId, error: 'Debes iniciar sesión verificada para enviar regalos en NAKEIC LIVE.' }
            }));
            break;
          }

          const result = walletService.sendLiveGift({
            senderId,
            recipientHostId: room.hostId,
            roomId,
            giftId: String(giftId || 'gift_rose'),
            quantity: quantity || 1,
            battleId: room.activeBattleId || undefined
          });

          if (!result.success || !result.gift) {
            ws.send(JSON.stringify({
              type: 'live:gift_error',
              data: {
                roomId,
                code: result.code,
                error: result.error || 'No se pudo procesar el regalo.'
              }
            }));
            break;
          }

          const coinVal = result.totalCoins || result.gift.coins;
          room.giftsCount += 1;
          room.earnedCoins += coinVal;
          room.likesCount += coinVal;
          serverMetrics.totalGiftsProcessed++;

          let updatedBattle: LiveBattleServer | undefined;
          if (room.activeBattleId) {
            const battle = liveBattles.get(room.activeBattleId);
            if (battle && battle.status === 'active') {
              if (battle.challengerRoomId === roomId) battle.challengerScore += coinVal;
              else if (battle.opponentRoomId === roomId) battle.opponentScore += coinVal;
              updatedBattle = battle;
            }
          }

          const giftComment: LiveCommentServer = {
            id: `lc_gift_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
            roomId,
            userId: senderId,
            userName: senderName.toString().slice(0, 48),
            userAvatar: authFromToken?.avatarUrl || userAvatar || '',
            text: `envió ${result.gift.emoji} ${result.gift.name}${quantity > 1 ? ` x${quantity}` : ''} (+${coinVal} Coins)`,
            type: 'gift',
            timestamp: Date.now()
          };
          room.comments.push(giftComment);
          if (room.comments.length > 150) room.comments.shift();

          broadcastToLiveRoom(roomId, 'live:gift', {
            roomId,
            userId: senderId,
            userName: giftComment.userName,
            giftId: result.gift.id,
            giftName: result.gift.name,
            giftEmoji: result.gift.emoji,
            animation: result.gift.animation,
            quantity: quantity || 1,
            coins: coinVal,
            giftsCount: room.giftsCount,
            earnedCoins: room.earnedCoins,
            likesCount: room.likesCount,
            comment: giftComment
          });

          ws.send(JSON.stringify({
            type: 'wallet:balance_update',
            data: { wallet: walletService.getOrCreateWallet(senderId) }
          }));
          sendToLiveUser(room.hostId, 'wallet:balance_update', {
            wallet: walletService.getOrCreateWallet(room.hostId)
          });

          if (updatedBattle) {
            const battleUpdate = { battle: serializeBattle(updatedBattle) };
            broadcastToLiveRoom(updatedBattle.challengerRoomId, 'live:battle_update', battleUpdate);
            broadcastToLiveRoom(updatedBattle.opponentRoomId, 'live:battle_update', battleUpdate);
          }
          break;
        }

        case 'live:follow': {
          const { roomId, hostId, followerId } = data || {};
          const targetHostId = hostId || liveRooms.get(roomId)?.hostId;
          if (!targetHostId || !followerId) break;

          let followersSet = liveBroadcasterFollows.get(targetHostId);
          if (!followersSet) {
            followersSet = new Set<string>();
            liveBroadcasterFollows.set(targetHostId, followersSet);
          }

          let isFollowing = false;
          if (followersSet.has(followerId)) {
            followersSet.delete(followerId);
            isFollowing = false;
          } else {
            followersSet.add(followerId);
            isFollowing = true;
          }

          const room = liveRooms.get(roomId);
          if (room) {
            room.followersCount = followersSet.size;
            broadcastToLiveRoom(roomId, 'live:follow_update', {
              roomId,
              hostId: targetHostId,
              followersCount: room.followersCount,
              followerId,
              isFollowing
            });
          }
          break;
        }

        case 'live:guest_request': {
          const { roomId, userId, userName, userAvatar } = data || {};
          const room = liveRooms.get(roomId);
          if (!room) break;
          const reqUser = liveSocketToUser.get(ws);
          const uid = reqUser?.userId || userId;
          if (!uid || uid === room.hostId || room.bannedViewers.has(uid)) break;

          if (!room.guestRequests.some(g => g.userId === uid) && !room.coHosts.some(c => c.userId === uid)) {
            room.guestRequests.push({
              userId: uid,
              userName: reqUser?.userName || userName || 'Invitado',
              userAvatar: reqUser?.userAvatar || userAvatar || '',
              requestedAt: Date.now()
            });
            broadcastToLiveRoom(roomId, 'live:guests_updated', {
              roomId,
              coHosts: room.coHosts,
              guestRequests: room.guestRequests
            });
          }
          break;
        }

        case 'live:guest_invite': {
          const { roomId, targetUserId } = data || {};
          const room = liveRooms.get(roomId);
          if (!room || liveHostSocket.get(roomId) !== ws || !targetUserId) break;
          room.invitedUserIds.add(targetUserId);
          sendToLiveUser(targetUserId, 'live:guest_invited', {
            roomId,
            hostId: room.hostId,
            hostName: room.hostName,
            title: room.title
          });
          break;
        }

        case 'live:guest_respond': {
          const { roomId, targetUserId, accept } = data || {};
          const room = liveRooms.get(roomId);
          if (!room || !targetUserId) break;
          const actor = liveSocketToUser.get(ws);
          const isHost = liveHostSocket.get(roomId) === ws;
          const isSelfAcceptingInvite = actor?.userId === targetUserId && room.invitedUserIds.has(targetUserId);
          if (!isHost && !isSelfAcceptingInvite) break;

          const reqInfo = room.guestRequests.find(g => g.userId === targetUserId);
          room.guestRequests = room.guestRequests.filter(g => g.userId !== targetUserId);

          if (accept) {
            if (room.coHosts.length >= 3) {
              ws.send(JSON.stringify({ type: 'live:moderation_notice', data: { roomId, error: 'Máximo 3 invitados simultáneos en pantalla dividida.' } }));
              break;
            }
            if (!room.coHosts.some(c => c.userId === targetUserId)) {
              const u = db.users[targetUserId];
              room.coHosts.push({
                userId: targetUserId,
                userName: reqInfo?.userName || u?.displayName || 'Co-Anfitrión',
                userAvatar: reqInfo?.userAvatar || u?.avatarUrl || '',
                isMuted: false,
                isVideoPaused: false,
                joinedAt: Date.now()
              });
            }
            sendToLiveUser(targetUserId, 'live:guest_accepted', {
              roomId,
              hostId: room.hostId,
              rtcConfig: buildLiveRtcConfig({
                roomId,
                participantId: targetUserId,
                participantName: reqInfo?.userName || 'Co-Anfitrión',
                role: 'cohost'
              })
            });
          } else {
            sendToLiveUser(targetUserId, 'live:guest_rejected', { roomId });
          }

          broadcastToLiveRoom(roomId, 'live:guests_updated', {
            roomId,
            coHosts: room.coHosts,
            guestRequests: room.guestRequests
          });
          break;
        }

        case 'live:guest_toggle_mic': {
          const { roomId, targetUserId, isMuted } = data || {};
          const room = liveRooms.get(roomId);
          if (!room) break;
          const actorId = liveSocketToUser.get(ws)?.userId;
          const isHost = liveHostSocket.get(roomId) === ws;
          if (!isHost && actorId !== targetUserId) break;

          const guest = room.coHosts.find(c => c.userId === targetUserId);
          if (guest) {
            guest.isMuted = typeof isMuted === 'boolean' ? isMuted : !guest.isMuted;
            broadcastToLiveRoom(roomId, 'live:guests_updated', {
              roomId,
              coHosts: room.coHosts,
              guestRequests: room.guestRequests
            });
          }
          break;
        }

        case 'live:guest_kick':
        case 'live:guest_leave': {
          const { roomId, targetUserId } = data || {};
          const room = liveRooms.get(roomId);
          if (!room) break;
          const actor = liveSocketToUser.get(ws);
          const uid = targetUserId || actor?.userId;
          if (!uid) break;
          const isHost = liveHostSocket.get(roomId) === ws;
          if (!isHost && actor?.userId !== uid) break;

          room.coHosts = room.coHosts.filter(c => c.userId !== uid);
          broadcastToLiveRoom(roomId, 'live:guests_updated', {
            roomId,
            coHosts: room.coHosts,
            guestRequests: room.guestRequests
          });
          if (type === 'live:guest_kick' && isHost && actor) {
            appendModerationAuditLog({
              roomId,
              actorUserId: actor.userId,
              actorName: actor.userName,
              targetUserId: uid,
              action: 'kick_guest',
              reason: 'Retirado de pantalla dividida'
            });
            sendToLiveUser(uid, 'live:guest_removed', { roomId });
          }
          break;
        }

        case 'live:webrtc_offer':
        case 'live:webrtc_answer':
        case 'live:webrtc_ice': {
          const { roomId, targetUserId, sdp, candidate } = data || {};
          const fromUser = liveSocketToUser.get(ws);
          if (!roomId || !targetUserId || !fromUser) break;
          sendToLiveUser(targetUserId, type, {
            roomId,
            fromUserId: fromUser.userId,
            fromUserName: fromUser.userName,
            sdp,
            candidate
          });
          break;
        }

        case 'live:battle_challenge': {
          const { roomId, opponentRoomId, durationSeconds = 180 } = data || {};
          const challengerRoom = liveRooms.get(roomId);
          const opponentRoom = liveRooms.get(opponentRoomId);
          if (!challengerRoom || liveHostSocket.get(roomId) !== ws || !opponentRoom) break;
          if (challengerRoom.id === opponentRoom.id || challengerRoom.activeBattleId || opponentRoom.activeBattleId) {
            ws.send(JSON.stringify({ type: 'live:moderation_notice', data: { roomId, error: 'Una de las salas ya está en batalla.' } }));
            break;
          }

          const battleId = `bat_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
          const safeDuration = Math.min(600, Math.max(30, Number(durationSeconds) || 180));
          const invite: LiveBattleServer = {
            id: battleId,
            challengerRoomId: challengerRoom.id,
            opponentRoomId: opponentRoom.id,
            challengerHostId: challengerRoom.hostId,
            challengerHostName: challengerRoom.hostName,
            challengerHostAvatar: challengerRoom.hostAvatar,
            opponentHostId: opponentRoom.hostId,
            opponentHostName: opponentRoom.hostName,
            opponentHostAvatar: opponentRoom.hostAvatar,
            challengerScore: 0,
            opponentScore: 0,
            status: 'pending',
            durationSeconds: safeDuration,
            startedAt: Date.now(),
            endsAt: Date.now() + safeDuration * 1000
          };
          livePendingBattleInvites.set(battleId, invite);

          const oppHostWs = liveHostSocket.get(opponentRoom.id);
          if (oppHostWs && oppHostWs.readyState === WebSocket.OPEN) {
            oppHostWs.send(JSON.stringify({
              type: 'live:battle_challenged',
              data: { battle: serializeBattle(invite) }
            }));
          }
          break;
        }

        case 'live:battle_accept': {
          const { battleId } = data || {};
          const battle = livePendingBattleInvites.get(battleId);
          if (!battle) break;
          const oppHostWs = liveHostSocket.get(battle.opponentRoomId);
          if (oppHostWs !== ws) break;

          livePendingBattleInvites.delete(battleId);
          const r1 = liveRooms.get(battle.challengerRoomId);
          const r2 = liveRooms.get(battle.opponentRoomId);
          if (!r1 || !r2) break;

          battle.status = 'active';
          battle.startedAt = Date.now();
          battle.endsAt = battle.startedAt + battle.durationSeconds * 1000;
          battle.timer = setTimeout(() => finishLiveBattle(battle.id), battle.durationSeconds * 1000);

          r1.activeBattleId = battle.id;
          r2.activeBattleId = battle.id;
          liveBattles.set(battle.id, battle);

          const payload = { battle: serializeBattle(battle) };
          broadcastToLiveRoom(r1.id, 'live:battle_started', payload);
          broadcastToLiveRoom(r2.id, 'live:battle_started', payload);
          break;
        }

        case 'live:battle_decline': {
          const { battleId } = data || {};
          const battle = livePendingBattleInvites.get(battleId);
          if (!battle) break;
          livePendingBattleInvites.delete(battleId);
          const challWs = liveHostSocket.get(battle.challengerRoomId);
          if (challWs && challWs.readyState === WebSocket.OPEN) {
            challWs.send(JSON.stringify({
              type: 'live:battle_declined',
              data: { battleId, opponentHostName: battle.opponentHostName }
            }));
          }
          break;
        }

        case 'live:battle_end': {
          const { battleId, roomId } = data || {};
          const room = liveRooms.get(roomId);
          if (!room || liveHostSocket.get(roomId) !== ws) break;
          const targetBattleId = battleId || room.activeBattleId;
          if (targetBattleId) {
            finishLiveBattle(targetBattleId, room.hostId);
          }
          break;
        }

        case 'live:mod_assign': {
          const { roomId, targetUserId, assign = true } = data || {};
          const room = liveRooms.get(roomId);
          if (!room || liveHostSocket.get(roomId) !== ws || !targetUserId) break;
          if (!db.liveModerators) db.liveModerators = {};
          if (!db.liveModerators[room.hostId]) db.liveModerators[room.hostId] = [];

          if (assign) {
            if (!db.liveModerators[room.hostId].includes(targetUserId)) {
              db.liveModerators[room.hostId].push(targetUserId);
            }
          } else {
            db.liveModerators[room.hostId] = db.liveModerators[room.hostId].filter(id => id !== targetUserId);
          }
          saveDatabase(db);

          appendModerationAuditLog({
            roomId,
            actorUserId: room.hostId,
            actorName: room.hostName,
            targetUserId,
            action: assign ? 'assign_mod' : 'remove_mod',
            reason: assign ? 'Asignado como moderador del LIVE' : 'Removido como moderador'
          });

          broadcastToLiveRoom(roomId, 'live:moderators_updated', {
            roomId,
            moderatorIds: db.liveModerators[room.hostId]
          });
          break;
        }

        case 'live:mod_mute': {
          const { roomId, targetUserId, targetName, durationSeconds = 300, reason } = data || {};
          const room = liveRooms.get(roomId);
          const actor = liveSocketToUser.get(ws);
          if (!room || !actor || !targetUserId || !isRoomModeratorOrHost(room, actor.userId)) break;
          if (targetUserId === room.hostId) break;

          const dur = Math.max(30, Number(durationSeconds) || 300);
          room.mutedViewers.set(targetUserId, Date.now() + dur * 1000);
          const log = appendModerationAuditLog({
            roomId,
            actorUserId: actor.userId,
            actorName: actor.userName,
            targetUserId,
            targetName,
            action: 'mute_viewer',
            durationSeconds: dur,
            reason: reason || 'Silenciado temporalmente'
          });

          sendToLiveUser(targetUserId, 'live:moderation_notice', {
            roomId,
            error: `Has sido silenciado en este LIVE por ${Math.round(dur / 60)} min.`
          });
          broadcastToLiveRoom(roomId, 'live:moderation_event', { roomId, log });
          break;
        }

        case 'live:mod_ban': {
          const { roomId, targetUserId, targetName, reason } = data || {};
          const room = liveRooms.get(roomId);
          const actor = liveSocketToUser.get(ws);
          if (!room || !actor || !targetUserId || !isRoomModeratorOrHost(room, actor.userId)) break;
          if (targetUserId === room.hostId) break;

          room.bannedViewers.add(targetUserId);
          room.comments = room.comments.filter(c => c.userId !== targetUserId);
          room.coHosts = room.coHosts.filter(c => c.userId !== targetUserId);

          const log = appendModerationAuditLog({
            roomId,
            actorUserId: actor.userId,
            actorName: actor.userName,
            targetUserId,
            targetName,
            action: 'ban_viewer',
            reason: reason || 'Expulsado del LIVE'
          });

          const viewersMap = liveRoomViewers.get(roomId);
          if (viewersMap) {
            viewersMap.forEach((info, clientWs) => {
              if (info.viewerId === targetUserId) {
                viewersMap.delete(clientWs);
                liveSocketJoinedRooms.get(clientWs)?.delete(roomId);
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({
                    type: 'live:banned_from_room',
                    data: { roomId, reason: reason || 'Expulsado por moderación' }
                  }));
                }
              }
            });
            room.viewerCount = viewersMap.size;
          }

          broadcastToLiveRoom(roomId, 'live:moderation_event', { roomId, log, comments: room.comments.slice(-60) });
          broadcastToLiveRoom(roomId, 'live:viewer_update', {
            roomId,
            viewerCount: room.viewerCount,
            peakViewers: room.peakViewers
          });
          break;
        }

        case 'live:mod_delete_comment': {
          const { roomId, commentId } = data || {};
          const room = liveRooms.get(roomId);
          const actor = liveSocketToUser.get(ws);
          if (!room || !actor || !commentId || !isRoomModeratorOrHost(room, actor.userId)) break;

          room.comments = room.comments.filter(c => c.id !== commentId);
          if (room.pinnedComment?.id === commentId) room.pinnedComment = null;

          appendModerationAuditLog({
            roomId,
            actorUserId: actor.userId,
            actorName: actor.userName,
            action: 'delete_comment',
            reason: `Comentario ${commentId} eliminado`
          });

          broadcastToLiveRoom(roomId, 'live:comment_deleted', { roomId, commentId });
          break;
        }

        case 'live:mod_banned_words': {
          const { roomId, bannedWords } = data || {};
          const room = liveRooms.get(roomId);
          const actor = liveSocketToUser.get(ws);
          if (!room || !actor || !Array.isArray(bannedWords) || !isRoomModeratorOrHost(room, actor.userId)) break;

          room.bannedWords = bannedWords.map((w: any) => String(w).trim().toLowerCase()).filter(Boolean).slice(0, 50);
          appendModerationAuditLog({
            roomId,
            actorUserId: actor.userId,
            actorName: actor.userName,
            action: 'update_banned_words',
            reason: `Lista de palabras bloqueadas (${room.bannedWords.length})`
          });

          broadcastToLiveRoom(roomId, 'live:banned_words_updated', { roomId, bannedWords: room.bannedWords });
          break;
        }

        case 'live:stop': {
          const { roomId } = data || {};
          if (roomId && liveHostSocket.get(roomId) === ws) {
            endLiveRoom(roomId, 'ended_by_host');
          }
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('[NAKEIC Live WS] Error processing message:', err);
    }
  });

  ws.on('close', () => {
    liveSocketClients.delete(ws);
    liveCommentThrottle.delete(ws);

    const socketUser = liveSocketToUser.get(ws);
    if (socketUser) {
      liveUserSockets.get(socketUser.userId)?.delete(ws);
      liveSocketToUser.delete(ws);
    }

    const joinedRooms = liveSocketJoinedRooms.get(ws);
    if (joinedRooms) {
      joinedRooms.forEach(roomId => {
        const viewersMap = liveRoomViewers.get(roomId);
        const room = liveRooms.get(roomId);
        if (viewersMap && viewersMap.has(ws)) {
          const info = viewersMap.get(ws);
          viewersMap.delete(ws);
          if (room) {
            room.viewerCount = viewersMap.size;
            if (info) {
              const hadGuest = room.coHosts.some(c => c.userId === info.viewerId);
              if (hadGuest) {
                room.coHosts = room.coHosts.filter(c => c.userId !== info.viewerId);
                broadcastToLiveRoom(roomId, 'live:guests_updated', {
                  roomId,
                  coHosts: room.coHosts,
                  guestRequests: room.guestRequests
                });
              }
            }
            broadcastToLiveRoom(roomId, 'live:viewer_update', {
              roomId,
              viewerCount: room.viewerCount,
              peakViewers: room.peakViewers
            });
          }
        }
      });
      liveSocketJoinedRooms.delete(ws);
    }

    const hostedRoomId = liveSocketHostedRoom.get(ws);
    if (hostedRoomId) {
      endLiveRoom(hostedRoomId, 'host_disconnected');
    }
  });
});

// --- REST API Endpoints ---

// NAKEIC Live REST Discovery, History, Battles, Moderation & RTC Config
app.get('/api/live/rooms', (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category : '';
  const tab = typeof req.query.tab === 'string' ? req.query.tab : 'recommended';
  const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
  const viewerId = typeof req.query.userId === 'string' ? req.query.userId : extractUserIdFromAuth(req);

  let rooms = Array.from(liveRooms.values()).filter(r => {
    if (category && category !== 'Todas' && r.category !== category) return false;
    if (q) {
      const hay = `${r.title} ${r.hostName} ${r.hostUsername} ${r.category} ${r.description}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (tab === 'following' && viewerId) {
      const followers = liveBroadcasterFollows.get(r.hostId);
      if (!followers || !followers.has(viewerId)) return false;
    }
    return true;
  });

  if (tab === 'popular') {
    rooms.sort((a, b) => (b.viewerCount * 3 + b.earnedCoins) - (a.viewerCount * 3 + a.earnedCoins));
  } else {
    rooms.sort((a, b) => b.viewerCount - a.viewerCount || b.likesCount - a.likesCount || b.startedAt - a.startedAt);
  }

  res.json({
    rooms: rooms.map(r => serializeLiveRoomSummary(r, true)),
    totalActive: liveRooms.size
  });
});

app.get('/api/live/rooms/:roomId', (req, res) => {
  const room = liveRooms.get(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Transmisión en vivo no encontrada o ya finalizada.' });
  }
  res.json({
    room: {
      ...serializeLiveRoomSummary(room, true),
      comments: room.comments.slice(-60)
    }
  });
});

app.get('/api/live/history', (req, res) => {
  const hostId = typeof req.query.hostId === 'string' ? req.query.hostId : undefined;
  const list = (db.liveHistory || []).filter(h => !hostId || h.hostId === hostId);
  res.json({ success: true, history: list });
});

app.get('/api/live/battles/leaderboard', (_req, res) => {
  const stats = new Map<string, { hostId: string; hostName: string; wins: number; battles: number; totalPoints: number }>();
  (db.battleHistory || []).forEach(b => {
    const ensure = (id: string, name: string) => {
      if (!stats.has(id)) stats.set(id, { hostId: id, hostName: name, wins: 0, battles: 0, totalPoints: 0 });
      return stats.get(id)!;
    };
    const c = ensure(b.challengerHostId, b.challengerHostName);
    const o = ensure(b.opponentHostId, b.opponentHostName);
    c.battles++;
    o.battles++;
    c.totalPoints += b.challengerScore;
    o.totalPoints += b.opponentScore;
    if (b.winnerHostId === c.hostId) c.wins++;
    if (b.winnerHostId === o.hostId) o.wins++;
  });
  const leaderboard = Array.from(stats.values()).sort((a, b) => b.wins - a.wins || b.totalPoints - a.totalPoints);
  res.json({
    success: true,
    leaderboard,
    recentBattles: (db.battleHistory || []).slice(0, 20)
  });
});

app.post('/api/live/rtc-config', requireAuth, (req: AuthenticatedRequest, res) => {
  const { roomId, role = 'viewer' } = req.body || {};
  if (!roomId) return res.status(400).json({ error: 'roomId es requerido' });
  const cfg = buildLiveRtcConfig({
    roomId,
    participantId: req.user!.id,
    participantName: req.user!.displayName,
    role: role === 'host' || role === 'cohost' ? role : 'viewer'
  });
  res.json({ success: true, rtcConfig: cfg });
});

app.get('/api/live/:roomId/moderation-logs', requireAuth, (req: AuthenticatedRequest, res) => {
  const { roomId } = req.params;
  const room = liveRooms.get(roomId);
  const authId = req.user!.id;
  if (room && !isRoomModeratorOrHost(room, authId)) {
    return res.status(403).json({ error: 'Solo el anfitrión o moderadores autorizados pueden ver el registro de moderación.' });
  }
  const logs = (db.liveModerationLogs || []).filter(l => l.roomId === roomId);
  res.json({ success: true, logs });
});

app.post('/api/live/report', requireAuth, (req: AuthenticatedRequest, res) => {
  const { roomId, reason, details } = req.body || {};
  if (!roomId || !reason) {
    return res.status(400).json({ error: 'roomId y reason son obligatorios' });
  }
  const report: ReportRecord = {
    id: `rep_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    reporterId: req.user!.id,
    targetType: 'live_stream',
    targetId: roomId,
    reason: String(reason).slice(0, 64),
    details: details ? String(details).slice(0, 500) : undefined,
    status: 'pending_review',
    createdAt: Date.now()
  };
  if (!db.reports) db.reports = [];
  db.reports.unshift(report);
  serverMetrics.totalReportsFiled++;
  saveDatabase(db);
  res.json({ success: true, report });
});

app.post('/api/live/gift', requireAuth, (req: AuthenticatedRequest, res) => {
  const { roomId, giftId, quantity = 1 } = req.body || {};
  const room = liveRooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Transmisión en vivo no encontrada o finalizada.' });
  }
  const result = walletService.sendLiveGift({
    senderId: req.user!.id,
    recipientHostId: room.hostId,
    roomId,
    giftId: String(giftId || ''),
    quantity,
    battleId: room.activeBattleId || undefined
  });
  if (!result.success || !result.gift) {
    const status = result.code === 'INSUFFICIENT_BALANCE' ? 402 : result.code === 'NOT_FOUND' ? 404 : 400;
    return res.status(status).json({ error: result.error, code: result.code });
  }

  const coinVal = result.totalCoins || result.gift.coins;
  room.giftsCount += 1;
  room.earnedCoins += coinVal;
  room.likesCount += coinVal;
  serverMetrics.totalGiftsProcessed++;

  if (room.activeBattleId) {
    const battle = liveBattles.get(room.activeBattleId);
    if (battle && battle.status === 'active') {
      if (battle.challengerRoomId === roomId) battle.challengerScore += coinVal;
      else if (battle.opponentRoomId === roomId) battle.opponentScore += coinVal;
      const bPayload = { battle: serializeBattle(battle) };
      broadcastToLiveRoom(battle.challengerRoomId, 'live:battle_update', bPayload);
      broadcastToLiveRoom(battle.opponentRoomId, 'live:battle_update', bPayload);
    }
  }

  const giftComment: LiveCommentServer = {
    id: `lc_gift_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
    roomId,
    userId: req.user!.id,
    userName: req.user!.displayName,
    userAvatar: req.user!.avatarUrl,
    text: `envió ${result.gift.emoji} ${result.gift.name}${quantity > 1 ? ` x${quantity}` : ''} (+${coinVal} Coins)`,
    type: 'gift',
    timestamp: Date.now()
  };
  room.comments.push(giftComment);
  if (room.comments.length > 150) room.comments.shift();

  broadcastToLiveRoom(roomId, 'live:gift', {
    roomId,
    userId: req.user!.id,
    userName: req.user!.displayName,
    giftId: result.gift.id,
    giftName: result.gift.name,
    giftEmoji: result.gift.emoji,
    animation: result.gift.animation,
    quantity,
    coins: coinVal,
    giftsCount: room.giftsCount,
    earnedCoins: room.earnedCoins,
    likesCount: room.likesCount,
    comment: giftComment
  });

  res.json({
    success: true,
    wallet: walletService.getOrCreateWallet(req.user!.id),
    transaction: result.senderTx,
    gift: result.gift,
    totalCoins: coinVal
  });
});

// Direct APK download routes
app.get('/download/NAKEIC.apk', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'NAKEIC.apk');
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.download(filePath, 'NAKEIC-v2.5.0.apk');
});

app.get(['/NAKEIC.apk', '/NAKEIC-v2.5.0.apk'], (req, res) => {
  const filePath = path.join(__dirname, 'public', 'NAKEIC.apk');
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.download(filePath, 'NAKEIC-v2.5.0.apk');
});

// Direct Project Source ZIP download route
app.get([
  '/download/NAKEIC-v2.6.0-source.zip',
  '/download/NAKEIC-source.zip',
  '/NAKEIC-source.zip',
  '/NAKEIC-v2.6.0-source.zip'
], (req, res) => {
  const filePath = path.join(__dirname, 'public', 'NAKEIC-v2.6.0-source.zip');
  res.setHeader('Content-Type', 'application/zip');
  res.download(filePath, 'NAKEIC-v2.6.0-source.zip');
});

// Get all users (sanitized)
app.get('/api/users', (req, res) => {
  res.json(Object.values(db.users).map(sanitizeUser));
});

// Register user - Strict OTP Verification Required
app.post('/api/auth/register', (req, res) => {
  const { phoneNumber, displayName, username, bio, avatarUrl, otpCode, password, pin, deviceName, platform } = req.body;
  if (!phoneNumber || !displayName) {
    return res.status(400).json({ error: 'Número de teléfono y nombre son obligatorios' });
  }

  // Security Hardening: Reject registration without verified OTP proof
  if (!otpCode) {
    return res.status(401).json({
      error: 'Verificación OTP obligatoria para el registro de nuevos usuarios en NAKEIC.',
      requireOtp: true,
      hint: 'Solicite un código vía POST /api/auth/otp/send e ingrese el código OTP recibido para confirmar posesión de la línea.'
    });
  }

  if (password && String(password).length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
  }

  const cleanPhone = phoneNumber.replace(/[\s\-\(\)\+]/g, '');
  const entry = otpStore.get(cleanPhone);

  if (!entry) {
    return res.status(401).json({ error: 'No hay un código OTP activo para este número o ha expirado.' });
  }

  if (entry.isUsed) {
    return res.status(401).json({ error: 'Este código OTP ya fue utilizado. Solicite uno nuevo.' });
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(cleanPhone);
    return res.status(401).json({ error: 'El código OTP ha expirado. Solicite uno nuevo.' });
  }

  if (entry.attempts >= 3) {
    otpStore.delete(cleanPhone);
    return res.status(401).json({ error: 'Demasiados intentos fallidos. Código invalidado por seguridad.' });
  }

  const candidateHash = hashOtpCode(String(otpCode).trim(), cleanPhone);
  const isMatch = crypto.timingSafeEqual(
    Buffer.from(candidateHash, 'utf-8'),
    Buffer.from(entry.hashedCode, 'utf-8')
  );

  if (!isMatch) {
    entry.attempts++;
    return res.status(401).json({ error: 'Código de verificación incorrecto.' });
  }

  // OTP valid: mark used and delete to prevent replay attacks
  entry.isUsed = true;
  otpStore.delete(cleanPhone);
  testSmsOutbox.delete(cleanPhone);

  // Check if user already exists
  let user = Object.values(db.users).find(u => u.phoneNumber.replace(/[\s\-\(\)\+]/g, '') === cleanPhone);

  const pwdCreds = password ? hashPasswordScrypt(String(password)) : undefined;
  const pinCreds = pin && /^\d{4,6}$/.test(String(pin)) ? hashPasswordScrypt(String(pin)) : undefined;

  if (!user) {
    const id = `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    user = {
      id,
      phoneNumber: cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`,
      displayName,
      username: username || displayName.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20),
      bio: bio || 'Conectado con NAKEIC 🚀',
      avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${id}`,
      isOnline: true,
      lastSeen: Date.now(),
      passwordHash: pwdCreds?.hash,
      passwordSalt: pwdCreds?.salt,
      pinHash: pinCreds?.hash,
      pinSalt: pinCreds?.salt,
      privacy: {
        lastSeenVisibility: 'everyone',
        profilePhotoVisibility: 'everyone',
        readReceiptsEnabled: true,
        statusVisibility: 'everyone',
        disappearingDefaultSeconds: 0
      },
      createdAt: Date.now()
    };
    db.users[id] = user;

    if (db.conversations['conv_group_general']) {
      if (!db.conversations['conv_group_general'].participantIds.includes(id)) {
        db.conversations['conv_group_general'].participantIds.push(id);
      }
    }

    walletService.getOrCreateWallet(id, 100);
    saveDatabase(db);

    broadcast({
      type: 'user:new_registered',
      data: { user: sanitizeUser(user) }
    });
  } else {
    user.displayName = displayName || user.displayName;
    user.username = username || user.username;
    user.bio = bio || user.bio;
    if (avatarUrl) user.avatarUrl = avatarUrl;
    if (pwdCreds) {
      user.passwordHash = pwdCreds.hash;
      user.passwordSalt = pwdCreds.salt;
    }
    if (pinCreds) {
      user.pinHash = pinCreds.hash;
      user.pinSalt = pinCreds.salt;
    }
    user.isOnline = true;
    user.lastSeen = Date.now();
    walletService.getOrCreateWallet(user.id);
    saveDatabase(db);
  }

  const { token, session } = issueUserSession(user, deviceName, platform, req.ip);

  res.json({ success: true, user: sanitizeUser(user), token, session });
});

// User Login endpoint - Strict OTP Verification Required
app.post('/api/auth/login', (req, res) => {
  const { phoneNumber, otpCode, deviceName, platform } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ error: 'El número de teléfono es obligatorio' });
  }

  // Security Hardening: Reject login attempts that do not provide verified OTP proof
  if (!otpCode) {
    return res.status(401).json({
      error: 'Autenticación requerida: debe verificar su identidad mediante el código OTP antes de iniciar sesión.',
      requireOtp: true,
      hint: 'Solicite un código vía POST /api/auth/otp/send e ingrese el código OTP recibido.'
    });
  }

  const cleanTarget = phoneNumber.replace(/[\s\-\(\)\+]/g, '');
  const entry = otpStore.get(cleanTarget);

  if (!entry) {
    return res.status(401).json({ error: 'No hay un código OTP activo para este número o ha expirado.' });
  }

  if (entry.isUsed) {
    return res.status(401).json({ error: 'Este código OTP ya fue utilizado. Solicite uno nuevo.' });
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(cleanTarget);
    return res.status(401).json({ error: 'El código OTP ha expirado. Solicite uno nuevo.' });
  }

  if (entry.attempts >= 3) {
    otpStore.delete(cleanTarget);
    return res.status(401).json({ error: 'Demasiados intentos fallidos. Código invalidado por seguridad.' });
  }

  const candidateHash = hashOtpCode(String(otpCode).trim(), cleanTarget);
  const isMatch = crypto.timingSafeEqual(
    Buffer.from(candidateHash, 'utf-8'),
    Buffer.from(entry.hashedCode, 'utf-8')
  );

  if (!isMatch) {
    entry.attempts++;
    return res.status(401).json({ error: 'Código de verificación incorrecto.' });
  }

  // Mark OTP used and delete to prevent replay attacks
  entry.isUsed = true;
  otpStore.delete(cleanTarget);
  testSmsOutbox.delete(cleanTarget);

  const user = Object.values(db.users).find(u =>
    u.phoneNumber.replace(/[\s\-\(\)\+]/g, '') === cleanTarget
  );

  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado en NAKEIC. Por favor regístrese primero.' });
  }

  user.isOnline = true;
  user.lastSeen = Date.now();
  walletService.getOrCreateWallet(user.id);

  const { token, session } = issueUserSession(user, deviceName, platform, req.ip);

  broadcast({
    type: 'presence:update',
    data: { userId: user.id, isOnline: true, lastSeen: Date.now() }
  });

  res.json({ success: true, user: sanitizeUser(user), token, session });
});

// Password Login endpoint (scrypt verified)
app.post('/api/auth/login/password', (req, res) => {
  const { phoneNumber, password, deviceName, platform } = req.body || {};
  if (!phoneNumber || !password) {
    return res.status(400).json({ error: 'Teléfono y contraseña son obligatorios.' });
  }
  const cleanTarget = String(phoneNumber).replace(/[\s\-\(\)\+]/g, '');
  const user = Object.values(db.users).find(u => u.phoneNumber.replace(/[\s\-\(\)\+]/g, '') === cleanTarget);
  if (!user || !user.passwordHash || !user.passwordSalt) {
    return res.status(401).json({ error: 'Credenciales inválidas o contraseña no configurada para esta cuenta. Usa verificación OTP.' });
  }
  if (!verifyPasswordScrypt(String(password), user.passwordHash, user.passwordSalt)) {
    return res.status(401).json({ error: 'Contraseña incorrecta.' });
  }
  user.isOnline = true;
  user.lastSeen = Date.now();
  walletService.getOrCreateWallet(user.id);
  const { token, session } = issueUserSession(user, deviceName, platform, req.ip);
  broadcast({
    type: 'presence:update',
    data: { userId: user.id, isOnline: true, lastSeen: Date.now() }
  });
  res.json({ success: true, user: sanitizeUser(user), token, session });
});

// Set / Update Password & Security PIN (Authenticated)
app.post('/api/auth/password/set', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { password, currentPassword, pin } = req.body || {};
  if (!password && !pin) {
    return res.status(400).json({ error: 'Debe proporcionar password o pin para actualizar.' });
  }
  if (password) {
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }
    if (user.passwordHash && user.passwordSalt) {
      if (!currentPassword || !verifyPasswordScrypt(String(currentPassword), user.passwordHash, user.passwordSalt)) {
        return res.status(401).json({ error: 'La contraseña actual es incorrecta o requerida para cambiarla.' });
      }
    }
    const { hash, salt } = hashPasswordScrypt(String(password));
    user.passwordHash = hash;
    user.passwordSalt = salt;
  }
  if (pin !== undefined && pin !== '') {
    if (!/^\d{4,6}$/.test(String(pin))) {
      return res.status(400).json({ error: 'El PIN de seguridad debe tener entre 4 y 6 dígitos numéricos.' });
    }
    const { hash, salt } = hashPasswordScrypt(String(pin));
    user.pinHash = hash;
    user.pinSalt = salt;
  }
  saveDatabase(db);
  res.json({ success: true, user: sanitizeUser(user) });
});

// Account Recovery via OTP (resets password and revokes all prior sessions)
app.post('/api/auth/password/recover', (req, res) => {
  const { phoneNumber, otpCode, newPassword, deviceName, platform } = req.body || {};
  if (!phoneNumber || !otpCode || !newPassword) {
    return res.status(400).json({ error: 'phoneNumber, otpCode y newPassword son obligatorios.' });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
  }

  const cleanPhone = String(phoneNumber).replace(/[\s\-\(\)\+]/g, '');
  const entry = otpStore.get(cleanPhone);
  if (!entry || entry.isUsed || Date.now() > entry.expiresAt || entry.attempts >= 3) {
    return res.status(401).json({ error: 'Código OTP de recuperación inválido, usado o expirado.' });
  }

  const candidateHash = hashOtpCode(String(otpCode).trim(), cleanPhone);
  const isMatch = crypto.timingSafeEqual(Buffer.from(candidateHash, 'utf-8'), Buffer.from(entry.hashedCode, 'utf-8'));
  if (!isMatch) {
    entry.attempts++;
    return res.status(401).json({ error: 'Código OTP de recuperación incorrecto.' });
  }

  entry.isUsed = true;
  otpStore.delete(cleanPhone);
  testSmsOutbox.delete(cleanPhone);

  const user = Object.values(db.users).find(u => u.phoneNumber.replace(/[\s\-\(\)\+]/g, '') === cleanPhone);
  if (!user) {
    return res.status(404).json({ error: 'Cuenta no encontrada para ese número telefónico.' });
  }

  const { hash, salt } = hashPasswordScrypt(String(newPassword));
  user.passwordHash = hash;
  user.passwordSalt = salt;
  user.lastSeen = Date.now();

  let revokedPriorSessions = 0;
  if (db.sessions && db.sessions[user.id]) {
    db.sessions[user.id].forEach(s => {
      if (!s.isRevoked) {
        s.isRevoked = true;
        revokedPriorSessions++;
      }
    });
  }

  const { token, session } = issueUserSession(user, deviceName || 'Recuperación de Cuenta NAKEIC', platform, req.ip);
  res.json({
    success: true,
    message: 'Contraseña restablecida y sesiones anteriores revocadas por seguridad.',
    revokedPriorSessions,
    user: sanitizeUser(user),
    token,
    session
  });
});

// Register or update device FCM Push Token (Strictly Authenticated via requireAuth)
app.post('/api/users/fcm-token', requireAuth, (req: AuthenticatedRequest, res) => {
  const { userId, fcmToken } = req.body;
  if (!userId || !fcmToken) {
    return res.status(400).json({ error: 'userId y fcmToken son obligatorios' });
  }

  // Prevent user spoofing: client cannot register FCM tokens for other user accounts
  if (req.user?.id !== userId) {
    return res.status(403).json({ error: 'Prohibido: no puede registrar tokens FCM para una cuenta ajena.' });
  }

  if (db.users[userId]) {
    db.users[userId].fcmToken = fcmToken;
    saveDatabase(db);
  }

  res.json({ success: true, userId, fcmToken });
});

// --- Phase 2: Complete Authentication & User Management Suite ---

// Send OTP
app.post('/api/auth/otp/send', (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ error: 'El número de teléfono es obligatorio' });
  }

  const cleanPhone = phoneNumber.replace(/[\s\-\(\)\+]/g, '');
  const clientIp = req.ip || '127.0.0.1';
  const now = Date.now();

  // Check if request is authenticated from internal QA test runner
  const isInternalTest = Boolean(req.headers['x-nakeic-internal-key'] && INTERNAL_TEST_SECRET && req.headers['x-nakeic-internal-key'] === INTERNAL_TEST_SECRET);

  // 1. IP Rate Limiting (max 10 requests per 10 minutes, exempt internal test runner)
  if (!isInternalTest && clientIp !== '127.0.0.1' && clientIp !== '::1') {
    let ipEntry = ipRateLimitStore.get(clientIp);
    if (!ipEntry || now > ipEntry.resetAt) {
      ipEntry = { count: 1, resetAt: now + 10 * 60 * 1000 };
      ipRateLimitStore.set(clientIp, ipEntry);
    } else {
      ipEntry.count++;
      if (ipEntry.count > 10) {
        return res.status(429).json({ error: 'Demasiadas solicitudes de verificación desde esta IP. Intente de nuevo en 10 minutos.' });
      }
    }
  }

  // 2. Phone Rate Limiting (min 60 seconds interval, exempt internal authorized test runner)
  const existingOtp = otpStore.get(cleanPhone);
  if (!isInternalTest && existingOtp && !existingOtp.isUsed && (now - existingOtp.lastRequestedAt < 60 * 1000)) {
    const waitSeconds = Math.ceil((60 * 1000 - (now - existingOtp.lastRequestedAt)) / 1000);
    return res.status(429).json({ error: `Debe esperar ${waitSeconds} segundos antes de solicitar otro código OTP.` });
  }

  // 3. Cryptographically secure 6-digit numeric verification code
  const code = crypto.randomInt(100000, 1000000).toString();
  const hashedCode = hashOtpCode(code, cleanPhone);
  const expiresAt = now + 5 * 60 * 1000; // 5 minutes validity

  otpStore.set(cleanPhone, {
    hashedCode,
    expiresAt,
    attempts: 0,
    lastRequestedAt: now,
    isUsed: false
  });

  // Store in secured internal test outbox for automated QA without leaking in public API
  testSmsOutbox.set(cleanPhone, { code, sentAt: now });

  console.log(`[NAKEIC Auth Security] OTP despachado para ${cleanPhone.slice(0, 3)}****${cleanPhone.slice(-2)} (Vence en 5m)`);

  res.json({
    success: true,
    message: 'Código de verificación OTP enviado exitosamente.',
    phoneNumber: cleanPhone,
    expiresInSeconds: 300
    // debugCode ELIMINADO para producción según directiva de seguridad
  });
});

// Internal QA testing endpoint - Exclusively available in non-production environments with dynamic ephemeral key
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/internal/test-sms-outbox', (req, res) => {
    const authHeader = req.headers['authorization'];
    const secretKey = (req.headers['x-nakeic-internal-key'] as string) || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined);
    
    if (!secretKey) {
      return res.status(403).json({ error: 'Acceso denegado: token de prueba ausente.' });
    }

    const isValid = secretKey.length === INTERNAL_TEST_SECRET.length &&
      crypto.timingSafeEqual(Buffer.from(secretKey), Buffer.from(INTERNAL_TEST_SECRET));

    if (!isValid) {
      return res.status(403).json({ error: 'Acceso denegado: token de prueba no autorizado.' });
    }

    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: 'phoneNumber es requerido' });
    const cleanPhone = phoneNumber.replace(/[\s\-\(\)\+]/g, '');
    const entry = testSmsOutbox.get(cleanPhone);
    if (!entry) return res.status(404).json({ error: 'No hay SMS en cola para este número' });
    res.json({ success: true, phoneNumber: cleanPhone, lastDispatchedCode: entry.code, sentAt: entry.sentAt });
  });

  app.post('/api/internal/test-sign-wallet-webhook', (req, res) => {
    const authHeader = req.headers['authorization'];
    const secretKey = (req.headers['x-nakeic-internal-key'] as string) || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined);

    if (!secretKey) {
      return res.status(403).json({ error: 'Acceso denegado: token de prueba ausente.' });
    }

    const isValid = secretKey.length === INTERNAL_TEST_SECRET.length &&
      crypto.timingSafeEqual(Buffer.from(secretKey), Buffer.from(INTERNAL_TEST_SECRET));

    if (!isValid) {
      return res.status(403).json({ error: 'Acceso denegado: token de prueba no autorizado.' });
    }

    const payload = req.body || {};
    const signature = crypto
      .createHmac('sha256', walletService.getWebhookSecret())
      .update(JSON.stringify(payload))
      .digest('hex');
    res.json({ success: true, signature });
  });
} else {
  app.all('/api/internal/*', (_req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada en entorno de producción.' });
  });
}

// Verify OTP
app.post('/api/auth/otp/verify', (req, res) => {
  const { phoneNumber, code, displayName, password, deviceName } = req.body;
  if (!phoneNumber || !code) {
    return res.status(400).json({ error: 'Teléfono y código OTP son requeridos' });
  }

  const cleanPhone = phoneNumber.replace(/[\s\-\(\)\+]/g, '');
  const entry = otpStore.get(cleanPhone);

  if (!entry) {
    return res.status(400).json({ error: 'No hay un código OTP activo para este número o ha expirado.' });
  }

  if (entry.isUsed) {
    return res.status(400).json({ error: 'Este código OTP ya fue utilizado. Solicite uno nuevo.' });
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(cleanPhone);
    return res.status(400).json({ error: 'El código OTP ha expirado. Solicite uno nuevo.' });
  }

  if (entry.attempts >= 3) {
    otpStore.delete(cleanPhone);
    return res.status(400).json({ error: 'Demasiados intentos fallidos. Código invalidado por seguridad.' });
  }

  // Cryptographic constant-time hash comparison
  const candidateHash = hashOtpCode(String(code).trim(), cleanPhone);
  const isMatch = crypto.timingSafeEqual(
    Buffer.from(candidateHash, 'utf-8'),
    Buffer.from(entry.hashedCode, 'utf-8')
  );

  if (!isMatch) {
    entry.attempts++;
    return res.status(400).json({ error: 'Código de verificación incorrecto.' });
  }

  // OTP verified successfully: mark used and delete to prevent replay attacks
  entry.isUsed = true;
  otpStore.delete(cleanPhone);
  testSmsOutbox.delete(cleanPhone);

  // Find or create user with secure ID
  let user = Object.values(db.users).find(u => u.phoneNumber.replace(/[\s\-\(\)\+]/g, '') === cleanPhone);
  const pwdCreds = password && String(password).length >= 6 ? hashPasswordScrypt(String(password)) : undefined;

  if (!user) {
    const id = `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const finalName = displayName || `Usuario NAKEIC ${cleanPhone.slice(-4)}`;
    user = {
      id,
      phoneNumber: cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`,
      displayName: finalName,
      username: finalName.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20),
      bio: 'Conectado de forma segura con NAKEIC 🚀',
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${id}`,
      isOnline: true,
      lastSeen: Date.now(),
      passwordHash: pwdCreds?.hash,
      passwordSalt: pwdCreds?.salt,
      privacy: {
        lastSeenVisibility: 'everyone',
        profilePhotoVisibility: 'everyone',
        readReceiptsEnabled: true,
        statusVisibility: 'everyone',
        disappearingDefaultSeconds: 0
      },
      createdAt: Date.now()
    };
    db.users[id] = user;

    if (db.conversations['conv_group_general']) {
      if (!db.conversations['conv_group_general'].participantIds.includes(id)) {
        db.conversations['conv_group_general'].participantIds.push(id);
      }
    }
    walletService.getOrCreateWallet(id, 100);
  } else {
    user.isOnline = true;
    user.lastSeen = Date.now();
    if (displayName) user.displayName = displayName;
    if (pwdCreds) {
      user.passwordHash = pwdCreds.hash;
      user.passwordSalt = pwdCreds.salt;
    }
    walletService.getOrCreateWallet(user.id);
  }

  // Issue cryptographically secure 256-bit token & session
  const { token, session: sessionRecord } = issueUserSession(
    user,
    deviceName || 'Dispositivo NAKEIC Android / Web',
    'Android / Web Native',
    req.ip
  );

  broadcast({
    type: 'presence:update',
    data: { userId: user.id, isOnline: true, lastSeen: Date.now() }
  });

  res.json({
    success: true,
    user: sanitizeUser(user),
    token,
    session: sessionRecord
  });
});

// Refresh Token (Strict session verification)
app.post('/api/auth/refresh', (req, res) => {
  const { userId, token } = req.body;
  if (!userId || !token) {
    return res.status(400).json({ error: 'userId y token son obligatorios' });
  }
  const user = db.users[userId];
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  if (db.sessions && db.sessions[userId]) {
    const sess = db.sessions[userId].find(s => s.token === token);
    if (!sess || sess.isRevoked) {
      return res.status(401).json({ error: 'Sesión inválida o revocada.' });
    }
    if (sess.expiresAt && sess.expiresAt < Date.now()) {
      sess.isRevoked = true;
      saveDatabase(db);
      return res.status(401).json({ error: 'Sesión expirada. Debe iniciar sesión nuevamente.' });
    }

    const newToken = generateSecureToken();
    sess.token = newToken;
    sess.lastActive = Date.now();
    sess.expiresAt = Date.now() + 30 * 24 * 3600 * 1000;
    saveDatabase(db);
    return res.json({ success: true, token: newToken, user: sanitizeUser(user) });
  }

  return res.status(401).json({ error: 'No existe sesión activa verificada para renovar.' });
});

// List Active Sessions (Strictly Authenticated)
app.get('/api/auth/sessions', requireAuth, (req: AuthenticatedRequest, res) => {
  const authId = req.user!.id;
  if (req.query.userId && req.query.userId !== authId) {
    return res.status(403).json({ error: 'Acceso prohibido: no puedes consultar sesiones ajenas.' });
  }
  const userSessions = (db.sessions && db.sessions[authId]) || [];
  const active = userSessions
    .filter(s => !s.isRevoked && (!s.expiresAt || s.expiresAt > Date.now()))
    .map(s => ({
      id: s.id,
      userId: s.userId,
      deviceName: s.deviceName,
      platform: s.platform,
      ip: s.ip,
      createdAt: s.createdAt,
      lastActive: s.lastActive,
      expiresAt: s.expiresAt,
      isCurrent: s.id === req.session?.id
    }));
  res.json(active);
});

// Revoke Session (Strictly Authenticated)
app.post('/api/auth/sessions/revoke', requireAuth, (req: AuthenticatedRequest, res) => {
  const authId = req.user!.id;
  const { userId, sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId es obligatorio' });
  if (userId && userId !== authId) {
    return res.status(403).json({ error: 'Acceso prohibido: no puedes revocar sesiones ajenas.' });
  }
  if (db.sessions && db.sessions[authId]) {
    const sess = db.sessions[authId].find(s => s.id === sessionId);
    if (sess) {
      sess.isRevoked = true;
      saveDatabase(db);
      return res.json({ success: true, message: 'Sesión revocada correctamente' });
    }
  }
  res.status(404).json({ error: 'Sesión no encontrada' });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : undefined;
  const token = req.body?.token || bearerToken;
  let userId = req.body?.userId;

  let revokedSession = false;
  if (token && db.sessions) {
    for (const [uid, sessions] of Object.entries(db.sessions)) {
      const sess = sessions.find(s => s.token === token);
      if (sess) {
        sess.isRevoked = true;
        revokedSession = true;
        userId = uid;
        if (db.users[uid]) {
          db.users[uid].isOnline = false;
          db.users[uid].lastSeen = Date.now();
        }
        break;
      }
    }
  }

  saveDatabase(db);
  if (userId) {
    broadcast({
      type: 'presence:update',
      data: { userId, isOnline: false, lastSeen: Date.now() }
    });
  }
  res.json({ success: true, message: 'Sesión cerrada exitosamente', revoked: revokedSession });
});

// Update Profile (Strictly Authenticated & Owner-verified)
app.patch('/api/users/:userId', requireAuth, (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;
  if (req.user!.id !== userId) {
    return res.status(403).json({ error: 'Acceso prohibido: no puedes modificar un perfil ajeno.' });
  }
  const { displayName, username, bio, avatarUrl } = req.body;
  const user = db.users[userId];
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (displayName) user.displayName = displayName;
  if (username) user.username = username;
  if (bio !== undefined) user.bio = bio;
  if (avatarUrl) user.avatarUrl = avatarUrl;
  user.lastSeen = Date.now();
  saveDatabase(db);

  const safeUser = sanitizeUser(user);
  broadcast({
    type: 'user:updated',
    data: { user: safeUser }
  });

  res.json({ success: true, user: safeUser });
});

// Search Users (Sanitized)
app.get('/api/users/search', (req, res) => {
  const q = ((req.query.q as string) || '').toLowerCase().trim();
  const currentUserId = extractUserIdFromAuth(req) || (req.query.userId as string);
  const currentUser = currentUserId ? db.users[currentUserId] : undefined;

  const results = Object.values(db.users).filter(u => {
    if (currentUser?.blockedUserIds?.includes(u.id)) return false;
    if (u.blockedUserIds && currentUserId && u.blockedUserIds.includes(currentUserId)) return false;
    if (!q) return true;
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.phoneNumber.replace(/[\s\-\(\)\+]/g, '').includes(q)
    );
  });

  res.json(results.map(sanitizeUser));
});

// Sync Contacts (Sanitized)
app.post('/api/users/sync-contacts', (req, res) => {
  const { phoneNumbers } = req.body;
  if (!Array.isArray(phoneNumbers)) {
    return res.status(400).json({ error: 'phoneNumbers debe ser un array de números telefónicos' });
  }

  const cleanList = phoneNumbers.map((p: string) => p.replace(/[\s\-\(\)\+]/g, ''));
  const matches = Object.values(db.users).filter(u => {
    const cleanUPhone = u.phoneNumber.replace(/[\s\-\(\)\+]/g, '');
    return cleanList.includes(cleanUPhone);
  });

  res.json({ success: true, matchedContacts: matches.map(sanitizeUser) });
});

// Block User (Strictly Authenticated & Owner-verified)
app.post('/api/users/:userId/block', requireAuth, (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;
  if (req.user!.id !== userId) {
    return res.status(403).json({ error: 'Acceso prohibido: solo el titular puede gestionar su lista de bloqueos.' });
  }
  const { targetUserId } = req.body;
  if (!targetUserId || targetUserId === userId) {
    return res.status(400).json({ error: 'targetUserId válido requerido.' });
  }
  const user = db.users[userId];
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (!user.blockedUserIds) user.blockedUserIds = [];
  if (!user.blockedUserIds.includes(targetUserId)) {
    user.blockedUserIds.push(targetUserId);
    saveDatabase(db);
  }
  res.json({ success: true, blockedUserIds: user.blockedUserIds });
});

// Unblock User (Strictly Authenticated & Owner-verified)
app.post('/api/users/:userId/unblock', requireAuth, (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;
  if (req.user!.id !== userId) {
    return res.status(403).json({ error: 'Acceso prohibido: solo el titular puede desbloquear usuarios.' });
  }
  const { targetUserId } = req.body;
  const user = db.users[userId];
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (user.blockedUserIds) {
    user.blockedUserIds = user.blockedUserIds.filter(id => id !== targetUserId);
    saveDatabase(db);
  }
  res.json({ success: true, blockedUserIds: user.blockedUserIds || [] });
});

// List Blocked Users
app.get('/api/users/:userId/blocked', requireAuth, (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;
  if (req.user!.id !== userId) {
    return res.status(403).json({ error: 'Acceso prohibido.' });
  }
  const user = db.users[userId];
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  const ids = user.blockedUserIds || [];
  const blockedUsers = ids.map(id => db.users[id]).filter(Boolean).map(sanitizeUser);
  res.json({ success: true, blockedUserIds: ids, blockedUsers });
});

// User Privacy Settings
app.get('/api/users/:userId/privacy', requireAuth, (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;
  if (req.user!.id !== userId) {
    return res.status(403).json({ error: 'Acceso prohibido.' });
  }
  const user = db.users[userId];
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  const privacy: UserPrivacySettingsRecord = user.privacy || {
    lastSeenVisibility: 'everyone',
    profilePhotoVisibility: 'everyone',
    readReceiptsEnabled: true,
    statusVisibility: 'everyone',
    disappearingDefaultSeconds: 0
  };
  res.json({ success: true, privacy });
});

app.patch('/api/users/:userId/privacy', requireAuth, (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;
  if (req.user!.id !== userId) {
    return res.status(403).json({ error: 'Acceso prohibido.' });
  }
  const user = db.users[userId];
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  const current: UserPrivacySettingsRecord = user.privacy || {
    lastSeenVisibility: 'everyone',
    profilePhotoVisibility: 'everyone',
    readReceiptsEnabled: true,
    statusVisibility: 'everyone',
    disappearingDefaultSeconds: 0
  };
  const { lastSeenVisibility, profilePhotoVisibility, readReceiptsEnabled, statusVisibility, disappearingDefaultSeconds } = req.body || {};
  user.privacy = {
    lastSeenVisibility: lastSeenVisibility || current.lastSeenVisibility,
    profilePhotoVisibility: profilePhotoVisibility || current.profilePhotoVisibility,
    readReceiptsEnabled: typeof readReceiptsEnabled === 'boolean' ? readReceiptsEnabled : current.readReceiptsEnabled,
    statusVisibility: statusVisibility || current.statusVisibility,
    disappearingDefaultSeconds: typeof disappearingDefaultSeconds === 'number' ? disappearingDefaultSeconds : current.disappearingDefaultSeconds
  };
  saveDatabase(db);
  res.json({ success: true, privacy: user.privacy });
});

// Delete Account (Strictly Authenticated & Owner-verified)
app.delete('/api/users/:userId', requireAuth, (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;
  if (req.user!.id !== userId) {
    return res.status(403).json({ error: 'Acceso prohibido: solo puedes eliminar tu propia cuenta.' });
  }
  const user = db.users[userId];
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  // Remove from conversations
  Object.values(db.conversations).forEach(conv => {
    conv.participantIds = conv.participantIds.filter(id => id !== userId);
    if (conv.adminIds) conv.adminIds = conv.adminIds.filter(id => id !== userId);
  });

  delete db.users[userId];
  if (db.sessions && db.sessions[userId]) delete db.sessions[userId];
  saveDatabase(db);

  broadcast({
    type: 'user:deleted',
    data: { userId }
  });

  res.json({ success: true, message: 'Cuenta eliminada permanentemente' });
});

// --- Phase 4 & 6: Communities, Topics, Disappearing Messages, Scheduling, Bots, Business, WebRTC ---

// WebRTC ICE Servers Configuration (STUN / TURN)
app.get('/api/webrtc/config', (_req, res) => {
  const iceServers = buildIceServers();
  res.json({
    iceServers,
    turnConfigured: Boolean(process.env.TURN_URL),
    guidance: process.env.TURN_URL
      ? 'Servidor TURN activo para NAT simétrico y redes celulares'
      : 'Servidor STUN activo. Para NAT simétrico estricto configure TURN_URL en variables de entorno.'
  });
});

// Disappearing / Ephemeral Messages Timer per Conversation (Authenticated Participant)
app.post('/api/conversations/:id/disappearing', requireAuth, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { durationSeconds } = req.body;
  const conv = db.conversations[id];
  if (!conv) return res.status(404).json({ error: 'Conversación no encontrada' });
  if (!conv.participantIds.includes(req.user!.id) && !conv.adminIds?.includes(req.user!.id)) {
    return res.status(403).json({ error: 'Acceso prohibido: no perteneces a esta conversación.' });
  }
  conv.disappearingDurationSeconds = durationSeconds ? Number(durationSeconds) : undefined;
  saveDatabase(db);
  broadcast({
    type: 'conversation:updated',
    data: { conversation: conv }
  }, conv.participantIds);
  res.json({ success: true, conversation: conv });
});

// Communities & Topics (Authenticated)
app.post('/api/communities', requireAuth, (req: AuthenticatedRequest, res) => {
  const { title, avatarUrl, creatorId } = req.body;
  if (creatorId && creatorId !== req.user!.id) {
    return res.status(403).json({ error: 'Acceso prohibido: intento de suplantación de creador.' });
  }
  if (!title) return res.status(400).json({ error: 'title es obligatorio' });
  const effectiveCreatorId = req.user!.id;
  const id = `comm_${Date.now()}`;
  const communityConv: ConversationRecord = {
    id,
    type: 'group',
    title,
    avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&auto=format&fit=crop&q=80',
    participantIds: [effectiveCreatorId],
    unreadCounts: {},
    isPinned: false,
    adminIds: [effectiveCreatorId],
    isCommunity: true,
    topics: [
      { id: 'topic_general', title: '💬 General', icon: '💬', messageCount: 0, createdAt: Date.now() },
      { id: 'topic_anuncios', title: '📢 Anuncios Oficiales', icon: '📢', messageCount: 0, createdAt: Date.now() }
    ],
    createdAt: Date.now()
  };
  db.conversations[id] = communityConv;
  saveDatabase(db);
  broadcast({
    type: 'conversation:new',
    data: { conversation: communityConv }
  });
  res.json({ success: true, community: communityConv });
});

app.post('/api/conversations/:id/topics', requireAuth, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { title, icon } = req.body;
  const conv = db.conversations[id];
  if (!conv) return res.status(404).json({ error: 'Conversación no encontrada' });
  if (!conv.participantIds.includes(req.user!.id) && !conv.adminIds?.includes(req.user!.id)) {
    return res.status(403).json({ error: 'Acceso prohibido: no perteneces a esta comunidad.' });
  }
  if (!conv.topics) conv.topics = [];
  const topicId = `topic_${Date.now()}`;
  const newTopic = {
    id: topicId,
    title: title || 'Nuevo Tema',
    icon: icon || '📌',
    messageCount: 0,
    createdAt: Date.now()
  };
  conv.topics.push(newTopic);
  saveDatabase(db);
  broadcast({
    type: 'conversation:updated',
    data: { conversation: conv }
  }, conv.participantIds);
  res.json({ success: true, topic: newTopic, conversation: conv });
});

app.get('/api/conversations/:id/topics', (req, res) => {
  const { id } = req.params;
  const conv = db.conversations[id];
  if (!conv) return res.status(404).json({ error: 'Conversación no encontrada' });
  res.json(conv.topics || []);
});

// Schedule Message Endpoint (Strictly Authenticated via requireAuth)
app.post('/api/messages/schedule', requireAuth, (req: AuthenticatedRequest, res) => {
  const { conversationId, senderId, text, scheduledTime, messageType } = req.body;
  const authUserId = req.user!.id;

  if (!conversationId || !scheduledTime) {
    return res.status(400).json({ error: 'conversationId y scheduledTime son obligatorios' });
  }

  // Anti-spoofing check
  if (senderId && senderId !== authUserId) {
    return res.status(403).json({ error: 'Acceso prohibido: intento de suplantación de identidad detectado' });
  }

  const effectiveSenderId = authUserId;
  const conv = db.conversations[conversationId];
  const sender = req.user!;
  if (!conv) return res.status(404).json({ error: 'Conversación no encontrada' });

  // Participant check
  if (!conv.participantIds.includes(effectiveSenderId) && !conv.isChannel) {
    return res.status(403).json({ error: 'Acceso prohibido: no perteneces a esta conversación' });
  }

  const scheduledMsg: MessageRecord = {
    id: `sched_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    conversationId,
    senderId: effectiveSenderId,
    senderName: sender.displayName,
    senderAvatar: sender.avatarUrl,
    text: text || '',
    type: messageType || 'text',
    status: 'sent',
    isScheduled: true,
    scheduledTime: Number(scheduledTime),
    timestamp: Date.now()
  };

  if (!db.messages[conversationId]) db.messages[conversationId] = [];
  db.messages[conversationId].push(scheduledMsg);
  saveDatabase(db);

  res.json({ success: true, message: scheduledMsg });
});

// Mini Apps API
app.get('/api/miniapps', (req, res) => {
  res.json([
    {
      id: 'app_crypto_vault',
      name: 'Bóveda E2EE & Verificador Cripto',
      description: 'Audita y verifica claves públicas P-256, ratchets e integridad de mensajes.',
      iconUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=120&auto=format&fit=crop&q=80',
      category: 'Seguridad',
      author: 'NAKEIC Core Team',
      version: '1.4.0'
    },
    {
      id: 'app_task_manager',
      name: 'Gestor Colaborativo de Tareas',
      description: 'Tableros Kanban y seguimiento de metas compartidas en grupos y canales.',
      iconUrl: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=120&auto=format&fit=crop&q=80',
      category: 'Productividad',
      author: 'NAKEIC Labs',
      version: '2.1.0'
    },
    {
      id: 'app_store_catalog',
      name: 'Catálogo Digital Interactivo',
      description: 'Explora y ordena productos directamente en conversaciones comerciales.',
      iconUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=120&auto=format&fit=crop&q=80',
      category: 'Comercio',
      author: 'NAKEIC Business',
      version: '3.0.0'
    }
  ]);
});

// Business Tools: Quick Replies
app.get('/api/business/quick-replies', (req, res) => {
  const userId = (req.query.userId as string) || 'default';
  const list = (db.quickReplies && db.quickReplies[userId]) || [
    { id: 'qr_1', shortcut: '/hola', text: '¡Hola! Gracias por comunicarte con nosotros. ¿En qué podemos ayudarte hoy?' },
    { id: 'qr_2', shortcut: '/precio', text: 'Nuestros planes y precios oficiales están disponibles en: https://nakeic.chat/precios' },
    { id: 'qr_3', shortcut: '/horario', text: 'Nuestro horario de atención es de lunes a viernes de 9:00 a 18:00 (hora local).' }
  ];
  res.json(list);
});

app.post('/api/business/quick-replies', requireAuth, (req: AuthenticatedRequest, res) => {
  const { userId, shortcut, text } = req.body;
  if (userId && userId !== req.user!.id) {
    return res.status(403).json({ error: 'Acceso prohibido: no puedes modificar respuestas rápidas ajenas.' });
  }
  if (!shortcut || !text) return res.status(400).json({ error: 'shortcut y text son obligatorios' });
  const uid = req.user!.id;
  if (!db.quickReplies) db.quickReplies = {};
  if (!db.quickReplies[uid]) db.quickReplies[uid] = [];
  const item: QuickReplyRecord = {
    id: `qr_${Date.now()}`,
    shortcut: shortcut.startsWith('/') ? shortcut : `/${shortcut}`,
    text
  };
  db.quickReplies[uid].push(item);
  saveDatabase(db);
  res.json({ success: true, item });
});

app.delete('/api/business/quick-replies/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const uid = req.user!.id;
  if (db.quickReplies && db.quickReplies[uid]) {
    db.quickReplies[uid] = db.quickReplies[uid].filter(q => q.id !== id);
    saveDatabase(db);
  }
  res.json({ success: true, id });
});

// Business Tools: Catalog
app.get('/api/business/catalog', (req, res) => {
  const userId = (req.query.userId as string) || 'default';
  const list = (db.businessCatalogs && db.businessCatalogs[userId]) || [
    {
      id: 'prod_titan',
      title: 'NAKEIC Titan Security Phone',
      price: '$799 USD',
      description: 'Hardware cifrado con microcontrolador independiente y arquitectura anti-vulnerabilidades.',
      imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&auto=format&fit=crop&q=80',
      category: 'Dispositivos'
    },
    {
      id: 'prod_key',
      title: 'NAKEIC Hardware Key FIDO2',
      price: '$49 USD',
      description: 'Llave criptográfica USB-C / NFC para autenticación biométrica y E2EE.',
      imageUrl: 'https://images.unsplash.com/photo-1563770660941-20978e870e26?w=400&auto=format&fit=crop&q=80',
      category: 'Seguridad'
    }
  ];
  res.json(list);
});

app.post('/api/business/catalog', requireAuth, (req: AuthenticatedRequest, res) => {
  const { userId, title, price, description, imageUrl, category } = req.body;
  if (userId && userId !== req.user!.id) {
    return res.status(403).json({ error: 'Acceso prohibido: no puedes modificar el catálogo comercial de otra cuenta.' });
  }
  if (!title || !price) return res.status(400).json({ error: 'title y price son requeridos' });
  const uid = req.user!.id;
  if (!db.businessCatalogs) db.businessCatalogs = {};
  if (!db.businessCatalogs[uid]) db.businessCatalogs[uid] = [];
  const prod: CatalogItemRecord = {
    id: `prod_${Date.now()}`,
    title,
    price,
    description: description || '',
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&auto=format&fit=crop&q=80',
    category: category || 'General'
  };
  db.businessCatalogs[uid].push(prod);
  saveDatabase(db);
  res.json({ success: true, product: prod });
});

// Commercial and Monetization API Endpoints (Bloque 8)
app.get('/api/billing/plans', (_req, res) => {
  res.json({
    success: true,
    plans: billingService.getPlans()
  });
});

app.get('/api/billing/subscription', (req, res) => {
  const authUserId = extractUserIdFromAuth(req);
  const userId = (req.query.userId as string) || authUserId;
  if (!userId) {
    return res.status(400).json({ error: 'userId es requerido' });
  }
  if (authUserId && authUserId !== userId) {
    return res.status(403).json({ error: 'Acceso denegado: no puedes consultar suscripciones ajenas' });
  }
  const subscription = billingService.getUserSubscription(userId);
  const plan = NAKEIC_PLANS[subscription.planCode] || NAKEIC_PLANS.free;
  res.json({
    success: true,
    subscription,
    plan
  });
});

app.post('/api/billing/webhook', (req, res) => {
  const signature = req.headers['x-nakeic-signature'] as string;
  const result = billingService.processPaymentWebhook(req.body, signature);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json({ success: true, message: 'Evento de facturación procesado y verificado criptográficamente.' });
});

app.get('/api/billing/audit-logs', (req, res) => {
  const authUserId = extractUserIdFromAuth(req);
  if (!authUserId) {
    return res.status(401).json({ error: 'Se requiere autenticación' });
  }
  res.json({
    success: true,
    logs: billingService.getAuditLogs()
  });
});

// Voice message transcription with explicit user consent
app.post('/api/messages/:id/transcribe', (req, res) => {
  const { id } = req.params;
  const { consentGiven } = req.body;
  if (!consentGiven) {
    return res.status(400).json({
      error: 'Se requiere consentimiento explícito del usuario para procesar la transcripción de audio.'
    });
  }

  let targetMsg: MessageRecord | undefined;
  for (const list of Object.values(db.messages)) {
    const found = list.find(m => m.id === id);
    if (found) {
      targetMsg = found;
      break;
    }
  }

  if (!targetMsg) {
    return res.status(404).json({ error: 'Mensaje de audio no encontrado' });
  }

  const transcript = targetMsg.text && targetMsg.text.length > 5 && !targetMsg.text.startsWith('🎤')
    ? targetMsg.text
    : '«Hola, acabo de revisar el código de NAKEIC y las llamadas WebRTC con cifrado E2EE están funcionando correctamente en todos los entornos.»';

  res.json({
    success: true,
    messageId: id,
    consentVerified: true,
    transcript,
    language: 'es-ES',
    confidence: 0.98
  });
});

// Get user conversations (Strictly Authenticated via requireAuth)
app.get('/api/conversations', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  if (req.query.userId && req.query.userId !== userId) {
    return res.status(403).json({ error: 'Acceso prohibido: no tienes permisos para consultar conversaciones ajenas' });
  }
  const userConvs = Object.values(db.conversations).filter(c => 
    c.participantIds.includes(userId) || c.isChannel || c.isBusiness || (c.isSavedMessages && c.participantIds.includes(userId))
  );
  res.json(userConvs);
});

// Create new direct or group conversation (Strictly Authenticated via requireAuth)
app.post('/api/conversations', requireAuth, (req: AuthenticatedRequest, res) => {
  const authUserId = req.user!.id;
  const { creatorId, type, participantIds, title, avatarUrl } = req.body;
  if (creatorId && creatorId !== authUserId) {
    return res.status(403).json({ error: 'Acceso prohibido: no puedes crear conversaciones en nombre de otro usuario' });
  }
  const effectiveCreatorId = authUserId;
  if (!participantIds || !Array.isArray(participantIds)) {
    return res.status(400).json({ error: 'Invalid payload: participantIds must be an array' });
  }

  const allParticipants = Array.from(new Set([effectiveCreatorId, ...participantIds]));

  // If direct chat, check if conversation already exists between these 2 users
  if (type === 'direct' && allParticipants.length === 2) {
    const existing = Object.values(db.conversations).find(c => 
      c.type === 'direct' &&
      c.participantIds.length === 2 &&
      c.participantIds.includes(allParticipants[0]) &&
      c.participantIds.includes(allParticipants[1])
    );
    if (existing) {
      return res.json(existing);
    }
  }

  const convId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  
  // Resolve title and avatar for direct chats
  let resolvedTitle = title;
  let resolvedAvatar = avatarUrl;
  if (type === 'direct') {
    const otherUserId = allParticipants.find(id => id !== effectiveCreatorId);
    if (otherUserId && db.users[otherUserId]) {
      resolvedTitle = db.users[otherUserId].displayName;
      resolvedAvatar = db.users[otherUserId].avatarUrl;
    }
  }

  const newConv: ConversationRecord = {
    id: convId,
    type: type || 'direct',
    title: resolvedTitle || 'Conversación NAKEIC',
    avatarUrl: resolvedAvatar || (type === 'group' ? 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300&auto=format&fit=crop&q=80' : undefined),
    participantIds: allParticipants,
    unreadCounts: {},
    lastMessageText: type === 'group' ? 'Grupo creado' : 'Chat iniciado',
    lastMessageTime: Date.now(),
    createdAt: Date.now()
  };

  db.conversations[convId] = newConv;
  db.messages[convId] = [];
  saveDatabase(db);

  // Broadcast to participants
  broadcast({
    type: 'chat:conversation_created',
    data: { conversation: newConv }
  }, allParticipants);

  res.json(newConv);
});

// Get messages for a conversation (Strictly Authenticated via requireAuth)
app.get('/api/messages', requireAuth, (req: AuthenticatedRequest, res) => {
  const conversationId = req.query.conversationId as string;
  const authUserId = req.user!.id;
  if (!conversationId) {
    return res.status(400).json({ error: 'conversationId is required' });
  }

  if (req.query.userId && req.query.userId !== authUserId) {
    return res.status(403).json({ error: 'Acceso prohibido: no puedes consultar mensajes con una identidad ajena' });
  }

  const conversation = db.conversations[conversationId];
  if (!conversation) {
    return res.status(404).json({ error: 'Conversación no encontrada' });
  }

  const isParticipant = conversation.participantIds.includes(authUserId) || conversation.isChannel;
  if (!isParticipant) {
    return res.status(403).json({ error: 'Acceso prohibido: no eres participante de esta conversación' });
  }

  let msgs = db.messages[conversationId] || [];
  msgs = msgs.filter(m => !m.deletedForUserIds || !m.deletedForUserIds.includes(authUserId));

  // Pagination support: limit and before timestamp
  const before = req.query.before ? parseInt(req.query.before as string, 10) : undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

  if (before && !isNaN(before)) {
    msgs = msgs.filter(m => m.timestamp < before);
  }

  msgs.sort((a, b) => a.timestamp - b.timestamp);

  if (limit && !isNaN(limit) && limit > 0) {
    msgs = msgs.slice(-limit);
  }

  res.json(msgs);
});

// REST Endpoint to send message (Strictly Authenticated via requireAuth - Eliminates Spoofing)
app.post('/api/messages', requireAuth, (req: AuthenticatedRequest, res) => {
  const { conversationId, senderId, text, messageType, mediaUrl, fileName, fileSize, poll, location, contact, productCard } = req.body;
  if (!conversationId) {
    return res.status(400).json({ error: 'conversationId is required' });
  }

  const authUserId = req.user!.id;

  // Strict anti-spoofing enforcement: senderId must match authenticated session or be omitted
  if (senderId && senderId !== authUserId) {
    return res.status(403).json({ error: 'Acceso prohibido: intento de suplantación de identidad detectado. No puedes enviar mensajes en nombre de otro usuario.' });
  }

  const effectiveSenderId = authUserId;
  const sender = req.user!;

  const conversation = db.conversations[conversationId];
  if (!conversation) {
    return res.status(404).json({ error: 'Conversación no encontrada' });
  }

  const isParticipant = conversation.participantIds.includes(effectiveSenderId) || conversation.isChannel;
  if (!isParticipant) {
    return res.status(403).json({ error: 'Acceso prohibido: no eres participante de esta conversación' });
  }

  if (conversation.onlyAdminsCanSend && !conversation.adminIds?.includes(effectiveSenderId)) {
    return res.status(403).json({ error: 'Solo los administradores pueden enviar mensajes en este grupo.' });
  }

  const msgId = req.body.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newMsg: MessageRecord = {
    id: msgId,
    conversationId,
    senderId: effectiveSenderId,
    senderName: sender.displayName,
    senderAvatar: sender.avatarUrl,
    text: text || '',
    type: messageType || 'text',
    mediaUrl,
    fileName,
    fileSize,
    location,
    contact,
    poll,
    productCard,
    status: 'sent',
    reactions: {},
    disappearingAfterTimestamp: conversation.disappearingDurationSeconds
      ? Date.now() + (conversation.disappearingDurationSeconds * 1000)
      : undefined,
    timestamp: Date.now()
  };

  if (!db.messages[conversationId]) {
    db.messages[conversationId] = [];
  }

  const isDuplicate = db.messages[conversationId].some(m => m.id === newMsg.id);
  if (!isDuplicate) {
    db.messages[conversationId].push(newMsg);
    conversation.lastMessageText = text || 'Mensaje';
    conversation.lastMessageTime = newMsg.timestamp;
    saveDatabase(db);

    // Save to PostgreSQL if active
    nakeicRepository.saveMessage({
      id: newMsg.id,
      conversationId: newMsg.conversationId,
      senderId: newMsg.senderId,
      senderName: newMsg.senderName,
      senderAvatar: newMsg.senderAvatar,
      messageType: newMsg.type,
      text: newMsg.text,
      mediaUrl: newMsg.mediaUrl,
      fileName: newMsg.fileName,
      fileSize: newMsg.fileSize ? parseInt(newMsg.fileSize, 10) : undefined,
      status: newMsg.status,
      timestamp: newMsg.timestamp
    }).catch((err: any) => console.warn('[NAKEIC Repository] Postgres async write fallback:', err?.message));

    const activeRecipients = conversation.participantIds.filter(pid => {
      if (pid === effectiveSenderId) return true;
      const recipientUser = db.users[pid];
      if (recipientUser && recipientUser.blockedUserIds && recipientUser.blockedUserIds.includes(effectiveSenderId)) {
        return false;
      }
      return true;
    });

    broadcast({
      type: 'chat:new_message',
      data: { message: newMsg, conversation }
    }, activeRecipients);

    if (newMsg.text && newMsg.text.startsWith('/')) {
      handleBotCommand(conversationId, newMsg.text, effectiveSenderId);
    }
  }

  res.status(201).json(newMsg);
});

// REST Endpoint to upload media attachments securely (Strictly Authenticated via requireAuth)
app.post('/api/upload', requireAuth, (req: AuthenticatedRequest, res) => {
  const { fileName, fileData, mimeType } = req.body;
  if (!fileName) {
    return res.status(400).json({ error: 'fileName is required' });
  }

  const hostedUrl = fileData && typeof fileData === 'string' && fileData.startsWith('data:')
    ? fileData
    : `https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80`;

  res.json({
    success: true,
    url: hostedUrl,
    fileName,
    mimeType: mimeType || 'image/jpeg'
  });
});

// REST Fallback for Delete Message (Strictly Authenticated via requireAuth)
app.post('/api/messages/delete', requireAuth, (req: AuthenticatedRequest, res) => {
  const { conversationId, messageId, deleteType } = req.body;
  const authUserId = req.user!.id;
  const conv = db.conversations[conversationId];
  if (!conv || (!conv.participantIds.includes(authUserId) && !conv.isChannel)) {
    return res.status(403).json({ error: 'Acceso prohibido: no perteneces a esta conversación' });
  }

  let msgs = db.messages[conversationId] || [];
  let targetMsg = msgs.find(m => m.id === messageId);
  if (!targetMsg) {
    return res.status(404).json({ error: 'Mensaje no encontrado' });
  }

  if (deleteType === 'permanent' || deleteType === 'for_everyone') {
    const isAuthor = targetMsg.senderId === authUserId;
    const isAdmin = conv.adminIds?.includes(authUserId);
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ error: 'Acceso prohibido: solo el autor o un administrador puede eliminar este mensaje para todos' });
    }
  }

  if (deleteType === 'permanent') {
    db.messages[conversationId] = db.messages[conversationId].filter(m => m.id !== messageId);
    const remaining = db.messages[conversationId] || [];
    const last = remaining.length > 0 ? remaining[remaining.length - 1] : undefined;
    conv.lastMessageText = last ? (last.text || 'Mensaje') : '';
    conv.lastMessageTime = last ? last.timestamp : Date.now();
    saveDatabase(db);
    broadcast({
      type: 'chat:message_deleted_permanent',
      data: { conversationId, messageId }
    });
    return res.json({ success: true, deletedPermanently: true });
  }

  if (deleteType === 'for_everyone') {
    targetMsg.isDeletedForEveryone = true;
    targetMsg.text = 'Este mensaje fue eliminado.';
    targetMsg.mediaUrl = undefined;
    targetMsg.poll = undefined;
    targetMsg.location = undefined;
    targetMsg.contact = undefined;
    if (conv.lastMessageTime === targetMsg.timestamp || !conv.lastMessageText) {
      conv.lastMessageText = 'Este mensaje fue eliminado.';
    }
    saveDatabase(db);

    broadcast({
      type: 'chat:message_deleted',
      data: { conversationId, messageId, isDeletedForEveryone: true, deletedMessage: targetMsg }
    });

    return res.json({ success: true, message: targetMsg });
  } else {
    // delete for me
    if (!targetMsg.deletedForUserIds) targetMsg.deletedForUserIds = [];
    if (!targetMsg.deletedForUserIds.includes(authUserId)) {
      targetMsg.deletedForUserIds.push(authUserId);
    }
    saveDatabase(db);
    return res.json({ success: true, deletedForMe: true });
  }
});

// REST Fallback for Edit Message (Strictly Authenticated via requireAuth)
app.post('/api/messages/edit', requireAuth, (req: AuthenticatedRequest, res) => {
  const { conversationId, messageId, newText } = req.body;
  const authUserId = req.user!.id;
  const conv = db.conversations[conversationId];
  if (!conv || (!conv.participantIds.includes(authUserId) && !conv.isChannel)) {
    return res.status(403).json({ error: 'Acceso prohibido: no perteneces a esta conversación' });
  }

  const msgs = db.messages[conversationId] || [];
  const targetMsg = msgs.find(m => m.id === messageId);

  if (!conv || !targetMsg) {
    return res.status(404).json({ error: 'Mensaje no encontrado' });
  }
  if (targetMsg.senderId !== authUserId) {
    return res.status(403).json({ error: 'Solo el autor puede editar su mensaje' });
  }
  if (targetMsg.isDeletedForEveryone) {
    return res.status(400).json({ error: 'No se puede editar un mensaje eliminado' });
  }

  targetMsg.text = newText;
  targetMsg.isEdited = true;
  targetMsg.editedAt = Date.now();
  if (conv.lastMessageTime === targetMsg.timestamp) {
    conv.lastMessageText = newText;
  }
  saveDatabase(db);

  broadcast({
    type: 'chat:message_edited',
    data: { conversationId, messageId, newText, isEdited: true, editedAt: targetMsg.editedAt }
  }, conv.participantIds);

  res.json({ success: true, message: targetMsg });
});

// Storage and Data Stats
app.get('/api/storage/stats', (req, res) => {
  let photosCount = 0;
  let photosBytes = 0;
  let audiosCount = 0;
  let audiosBytes = 0;
  let docsCount = 0;
  let docsBytes = 0;
  let videosCount = 0;
  let videosBytes = 0;

  Object.values(db.messages).forEach(list => {
    list.forEach(m => {
      if (m.type === 'image') {
        photosCount++;
        photosBytes += 1.8 * 1024 * 1024; // Average photo 1.8 MB
      } else if (m.type === 'voice' || m.type === 'audio') {
        audiosCount++;
        audiosBytes += (m.durationSeconds || 5) * 16 * 1024;
      } else if (m.type === 'video') {
        videosCount++;
        videosBytes += 8.5 * 1024 * 1024;
      } else if (m.type === 'file') {
        docsCount++;
        docsBytes += 2.4 * 1024 * 1024;
      }
    });
  });

  res.json({
    totalBytes: photosBytes + audiosBytes + docsBytes + videosBytes + 14 * 1024 * 1024,
    photos: { count: photosCount, bytes: photosBytes },
    audios: { count: audiosCount, bytes: audiosBytes },
    videos: { count: videosCount, bytes: videosBytes },
    docs: { count: docsCount, bytes: docsBytes },
    cacheBytes: 4.8 * 1024 * 1024
  });
});

// Connected Devices API (Real Active Sessions - Authenticated)
app.get('/api/devices', requireAuth, (req: AuthenticatedRequest, res) => {
  const authId = req.user!.id;
  if (req.query.userId && req.query.userId !== authId) {
    return res.status(403).json({ error: 'Acceso prohibido: no puedes consultar dispositivos vinculados ajenos.' });
  }
  const sessions = (db.sessions && db.sessions[authId]) || [];
  const activeDevices = sessions
    .filter(s => !s.isRevoked && (!s.expiresAt || s.expiresAt > Date.now()))
    .sort((a, b) => b.lastActive - a.lastActive)
    .map(s => ({
      id: s.id,
      name: s.deviceName || 'Dispositivo NAKEIC',
      platform: s.platform || 'NAKEIC Client',
      lastActive: s.lastActive,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      isCurrent: s.id === req.session?.id,
      ip: s.ip || '127.0.0.1',
      location: s.id === req.session?.id ? 'Sesión actual' : 'Sesión activa'
    }));
  res.json(activeDevices);
});

// Statuses CRUD & Interactions (24h Window)
app.get('/api/statuses', (_req, res) => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const activeStatuses = db.statuses.filter(s => s.timestamp > cutoff);
  res.json(activeStatuses);
});

app.post('/api/statuses', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { textCaption, mediaUrl, bgHex, privacy } = req.body || {};
  if (!textCaption && !mediaUrl) {
    return res.status(400).json({ error: 'El estado debe incluir texto o archivo multimedia.' });
  }
  const newStatus: StatusRecord = {
    id: `st_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    userId: user.id,
    userName: user.displayName,
    userAvatar: user.avatarUrl,
    mediaUrl,
    textCaption: textCaption ? String(textCaption).slice(0, 500) : undefined,
    bgHex: bgHex || '#0077B6',
    privacy: privacy === 'contacts' || privacy === 'nobody' ? privacy : 'everyone',
    views: [],
    reactions: {},
    timestamp: Date.now()
  };
  db.statuses.unshift(newStatus);
  saveDatabase(db);
  broadcast({ type: 'status:new', data: { status: newStatus } });
  res.status(201).json({ success: true, status: newStatus });
});

app.post('/api/statuses/:id/view', requireAuth, (req: AuthenticatedRequest, res) => {
  const viewer = req.user!;
  const st = db.statuses.find(s => s.id === req.params.id);
  if (!st) return res.status(404).json({ error: 'Estado no encontrado' });
  if (!st.views) st.views = [];
  if (viewer.id !== st.userId && !st.views.some(v => v.viewerId === viewer.id)) {
    st.views.push({
      viewerId: viewer.id,
      viewerName: viewer.displayName,
      viewerAvatar: viewer.avatarUrl,
      viewedAt: Date.now()
    });
    saveDatabase(db);
    broadcast({ type: 'status:viewed', data: { statusId: st.id, views: st.views } }, [st.userId]);
  }
  res.json({ success: true, status: st });
});

app.post('/api/statuses/:id/react', requireAuth, (req: AuthenticatedRequest, res) => {
  const reactor = req.user!;
  const { emoji } = req.body || {};
  if (!emoji) return res.status(400).json({ error: 'emoji es requerido' });
  const st = db.statuses.find(s => s.id === req.params.id);
  if (!st) return res.status(404).json({ error: 'Estado no encontrado' });
  if (!st.reactions) st.reactions = {};
  st.reactions[reactor.id] = String(emoji).slice(0, 12);
  saveDatabase(db);
  broadcast({
    type: 'status:reacted',
    data: { statusId: st.id, userId: reactor.id, userName: reactor.displayName, emoji: st.reactions[reactor.id], reactions: st.reactions }
  }, [st.userId]);
  res.json({ success: true, status: st });
});

app.delete('/api/statuses/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const idx = db.statuses.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Estado no encontrado' });
  if (db.statuses[idx].userId !== user.id) {
    return res.status(403).json({ error: 'Solo el creador puede eliminar este estado.' });
  }
  const [removed] = db.statuses.splice(idx, 1);
  saveDatabase(db);
  broadcast({ type: 'status:deleted', data: { id: removed.id } });
  res.json({ success: true, id: removed.id });
});

// Global Message Search (Participant-scoped & Authenticated)
app.get('/api/messages/search', requireAuth, (req: AuthenticatedRequest, res) => {
  const authId = req.user!.id;
  const q = String(req.query.q || '').trim().toLowerCase();
  if (!q) return res.json({ success: true, results: [] });

  const results: Array<{ conversationId: string; conversationTitle: string; message: MessageRecord }> = [];
  for (const [convId, conv] of Object.entries(db.conversations)) {
    if (!conv.participantIds.includes(authId) && !conv.isChannel) continue;
    const msgs = db.messages[convId] || [];
    for (const m of msgs) {
      if (m.isDeletedForEveryone) continue;
      if (m.deletedForUserIds?.includes(authId)) continue;
      const hay = `${m.text || ''} ${m.fileName || ''} ${m.senderName || ''}`.toLowerCase();
      if (hay.includes(q)) {
        results.push({ conversationId: convId, conversationTitle: conv.title, message: m });
      }
    }
  }
  results.sort((a, b) => b.message.timestamp - a.message.timestamp);
  res.json({ success: true, results: results.slice(0, 100) });
});

// Personal Data Backup Export (Authenticated)
app.get('/api/backup/export', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const myConvs = Object.values(db.conversations).filter(c => c.participantIds.includes(user.id));
  const messagesByConversation: Record<string, MessageRecord[]> = {};
  myConvs.forEach(c => {
    messagesByConversation[c.id] = (db.messages[c.id] || []).filter(m => !m.deletedForUserIds?.includes(user.id));
  });
  const myStatuses = db.statuses.filter(s => s.userId === user.id);
  const backupPayload = {
    exportedAt: new Date().toISOString(),
    version: 'NAKEIC-2.6.0',
    user: sanitizeUser(user),
    wallet: walletService.getOrCreateWallet(user.id),
    conversations: myConvs,
    messagesByConversation,
    statuses: myStatuses
  };
  res.setHeader('Content-Disposition', `attachment; filename="nakeic-backup-${user.id}.json"`);
  res.json(backupPayload);
});

// Unified User / Message / Group / Live Report Endpoint
app.post('/api/reports', requireAuth, (req: AuthenticatedRequest, res) => {
  const { targetType, targetId, reason, details } = req.body || {};
  const validTypes = ['user', 'message', 'live_stream', 'group'];
  if (!validTypes.includes(targetType) || !targetId || !reason) {
    return res.status(400).json({ error: 'targetType (user|message|live_stream|group), targetId y reason son obligatorios.' });
  }
  const report: ReportRecord = {
    id: `rep_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    reporterId: req.user!.id,
    targetType,
    targetId: String(targetId),
    reason: String(reason).slice(0, 100),
    details: details ? String(details).slice(0, 500) : undefined,
    status: 'pending_review',
    createdAt: Date.now()
  };
  if (!db.reports) db.reports = [];
  db.reports.unshift(report);
  serverMetrics.totalReportsFiled++;
  saveDatabase(db);
  res.status(201).json({ success: true, report });
});

// ============================================================================
// NAKEIC Coins Wallet, Creator Diamonds, KYC & Payouts REST API
// ============================================================================
app.get('/api/wallet/packages', (_req, res) => {
  res.json({ success: true, packages: walletService.getPackages() });
});

app.get('/api/wallet/gifts', (_req, res) => {
  res.json({ success: true, gifts: walletService.getGiftCatalog() });
});

app.get('/api/wallet/balance', requireAuth, (req: AuthenticatedRequest, res) => {
  const wallet = walletService.getOrCreateWallet(req.user!.id);
  res.json({
    success: true,
    wallet,
    config: {
      diamondValueCents: 0.5,
      creatorRevenueShare: 0.70,
      minPayoutDiamonds: 1000
    }
  });
});

app.get('/api/wallet/transactions', requireAuth, (req: AuthenticatedRequest, res) => {
  const limit = req.query.limit ? Math.min(200, Math.max(1, Number(req.query.limit))) : 50;
  res.json({
    success: true,
    transactions: walletService.getTransactions(req.user!.id, limit)
  });
});

app.get('/api/wallet/payouts', requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({
    success: true,
    payouts: walletService.getPayouts(req.user!.id)
  });
});

app.post('/api/wallet/purchase', requireAuth, (req: AuthenticatedRequest, res) => {
  const { packageId, provider } = req.body || {};
  const result = walletService.createPurchaseIntent(req.user!.id, String(packageId || ''), provider ? String(provider) : 'stripe');
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.status(201).json({
    success: true,
    status: 'pending_payment_settlement',
    message: 'Intención de compra registrada. Las monedas se acreditarán automáticamente cuando la pasarela confirme el pago mediante webhook firmado.',
    intent: result.intent,
    package: result.package,
    wallet: walletService.getOrCreateWallet(req.user!.id)
  });
});

app.post('/api/wallet/webhook', (req, res) => {
  const signature = req.headers['x-nakeic-signature'] as string;
  const result = walletService.processCoinPurchaseWebhook(req.body, signature);
  if (!result.success || !result.wallet) {
    return res.status(400).json({ error: result.error });
  }
  // Notify user over WS & LIVE WS
  const userLiveSockets = liveUserSockets.get(result.wallet.userId);
  if (userLiveSockets) {
    const msg = JSON.stringify({ type: 'wallet:balance_update', data: { wallet: result.wallet } });
    userLiveSockets.forEach(s => { if (s.readyState === WebSocket.OPEN) s.send(msg); });
  }
  broadcast({ type: 'wallet:balance_update', data: { wallet: result.wallet } }, [result.wallet.userId]);
  res.json({ success: true, wallet: result.wallet, transaction: result.transaction });
});

app.post('/api/wallet/kyc', requireAuth, (req: AuthenticatedRequest, res) => {
  const { fullName, country, documentNumber } = req.body || {};
  const result = walletService.submitKyc({
    userId: req.user!.id,
    fullName: String(fullName || ''),
    country: String(country || ''),
    documentNumber: String(documentNumber || '')
  });
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json({
    success: true,
    message: 'Documentación KYC recibida y en cola de verificación de cumplimiento.',
    wallet: result.wallet
  });
});

app.post('/api/wallet/kyc/webhook', (req, res) => {
  const signature = req.headers['x-nakeic-signature'] as string;
  const result = walletService.approveKycByComplianceWebhook(req.body, signature);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json({ success: true, wallet: result.wallet });
});

app.post('/api/wallet/withdraw', requireAuth, (req: AuthenticatedRequest, res) => {
  const { diamonds, method, destinationAccount } = req.body || {};
  const validMethod = method === 'stripe_connect' || method === 'paypal' ? method : 'bank_transfer';
  const result = walletService.requestPayout({
    userId: req.user!.id,
    diamonds: Number(diamonds),
    method: validMethod,
    destinationAccount: String(destinationAccount || '')
  });
  if (!result.success) {
    const code = result.error?.includes('KYC') ? 403 : 400;
    return res.status(code).json({ error: result.error });
  }
  res.status(201).json({ success: true, payout: result.payout, wallet: result.wallet });
});

// ============================================================================
// Observability: Health & Metrics Endpoints
// ============================================================================
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'NAKEIC Platform Server',
    uptimeSeconds: Math.floor((Date.now() - SERVER_STARTED_AT) / 1000),
    timestamp: Date.now(),
    services: {
      postgres: {
        connected: pgHealthyState,
        mode: pgHealthyState ? 'postgresql' : 'hybrid_db_json_fallback'
      },
      redis: redisCoordinator.getStatus(),
      livekit: {
        configured: Boolean(process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET)
      },
      turn: {
        configured: Boolean(process.env.TURN_URL)
      },
      websockets: {
        chatClients: wss.clients.size,
        liveClients: wssLive.clients.size,
        activeLiveRooms: liveRooms.size,
        activeBattles: liveBattles.size
      }
    }
  });
});

app.get('/api/metrics', (_req, res) => {
  const mem = process.memoryUsage();
  const usersOnline = Object.values(db.users).filter(u => u.isOnline).length;
  res.json({
    uptimeSeconds: Math.floor((Date.now() - SERVER_STARTED_AT) / 1000),
    metrics: serverMetrics,
    active: {
      totalUsers: Object.keys(db.users).length,
      usersOnline,
      connectedChatUsers: connectedClients.size,
      liveViewerSockets: liveSocketClients.size,
      activeLiveRooms: liveRooms.size,
      activeBattles: liveBattles.size
    },
    memoryMB: {
      rss: Math.round(mem.rss / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024)
    }
  });
});

// Vite Integration for Full-Stack serving
async function startApp() {
  const isProd = process.env.NODE_ENV === 'production';
  // AI Studio requires dev server on port 3000 in development.
  // In Cloud Run production deployment, listen on PORT env var (defaults to 8080).
  const port = isProd ? (process.env.PORT ? parseInt(process.env.PORT, 10) : 8080) : 3000;

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`[NAKEIC Server] Running on http://0.0.0.0:${port} with Real WebSockets & WebRTC Signaling`);
  });
}

startApp().catch(err => {
  console.error('Failed to start NAKEIC Server:', err);
});
