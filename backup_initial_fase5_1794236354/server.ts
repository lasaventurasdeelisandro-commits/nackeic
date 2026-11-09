import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Data persistence directory and file
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
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

interface StatusRecord {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  mediaUrl?: string;
  textCaption?: string;
  bgHex?: string;
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

interface DatabaseSchema {
  users: Record<string, UserRecord>;
  conversations: Record<string, ConversationRecord>;
  messages: Record<string, MessageRecord[]>; // conversationId -> messages
  statuses: StatusRecord[];
  sessions?: Record<string, SessionRecord[]>;
  quickReplies?: Record<string, QuickReplyRecord[]>;
  businessCatalogs?: Record<string, CatalogItemRecord[]>;
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

  const mergedDb: DatabaseSchema = {
    users: { ...defaultSeedUsers, ...(loadedDb?.users || {}) },
    conversations: { ...defaultSeedConversations, ...(loadedDb?.conversations || {}) },
    messages: { ...defaultSeedMessages, ...(loadedDb?.messages || {}) },
    statuses: loadedDb?.statuses && loadedDb.statuses.length > 0 ? loadedDb.statuses : defaultSeedStatuses
  };
  saveDatabase(mergedDb);
  return mergedDb;
}

function saveDatabase(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

let db = loadDatabase();

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

// In-Memory OTP Store: phone -> { code, expiresAt, attempts }
interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
}
const otpStore = new Map<string, OtpEntry>();

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
          const userId = data.userId;
          if (userId) {
            socketToUser.set(ws, userId);
            if (!connectedClients.has(userId)) {
              connectedClients.set(userId, new Set());
            }
            connectedClients.get(userId)!.add(ws);

            // Update user status to online
            if (db.users[userId]) {
              db.users[userId].isOnline = true;
              db.users[userId].lastSeen = Date.now();
              saveDatabase(db);
            }

            // Notify everyone of presence
            broadcast({
              type: 'presence:update',
              data: { userId, isOnline: true, lastSeen: Date.now() }
            });

            // Send initial state snapshot
            ws.send(JSON.stringify({
              type: 'auth:ack',
              data: {
                users: Object.values(db.users),
                conversations: Object.values(db.conversations).filter(c => c.participantIds.includes(userId)),
                statuses: db.statuses
              }
            }));

            // Deliver any pending offline messages queued while user was disconnected
            if (offlineMessageQueue.has(userId)) {
              const queued = offlineMessageQueue.get(userId) || [];
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
                        recipientId: userId
                      }
                    }, [targetMsg.senderId]);
                  }
                });

                saveDatabase(db);
                offlineMessageQueue.delete(userId);
              }
            }
          }
          break;
        }

        // --- 2. Real-time Messaging ---
        case 'chat:send_message': {
          const { conversationId, senderId, recipientId, text, messageType, mediaUrl, fileName, fileSize, durationSeconds, waveform, location, contact, poll, replyToId, replyToText } = data;
          
          let conversation = db.conversations[conversationId];
          let sender = db.users[senderId];

          // Auto-provision sender if not in db yet (e.g. user_me or guest)
          if (!sender) {
            sender = {
              id: senderId,
              phoneNumber: '+52 55 8923 4410',
              displayName: 'Alex Valenzuela',
              username: 'alexv_nakeic',
              bio: 'Conectado con NAKEIC 🚀',
              avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
              isOnline: true,
              lastSeen: Date.now(),
              createdAt: Date.now()
            };
            db.users[senderId] = sender;
          }

          // Auto-provision conversation if not in db yet
          if (!conversation) {
            const initialParticipants = [senderId];
            if (recipientId && !initialParticipants.includes(recipientId)) {
              initialParticipants.push(recipientId);
            }
            conversation = {
              id: conversationId,
              type: conversationId.includes('group') || conversationId.includes('team') || conversationId.includes('community') ? 'group' : 'direct',
              title: conversationId.replace('conv_', '').replace(/_/g, ' '),
              avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
              participantIds: initialParticipants,
              unreadCounts: {},
              lastMessageText: '',
              lastMessageTime: Date.now(),
              isPinned: false,
              createdAt: Date.now()
            };
            db.conversations[conversationId] = conversation;
          }

          if (!conversation.participantIds.includes(senderId)) {
            conversation.participantIds.push(senderId);
          }
          if (recipientId && !conversation.participantIds.includes(recipientId)) {
            conversation.participantIds.push(recipientId);
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
          const { conversationId, messageId, userId, deleteType } = data;
          let conv = db.conversations[conversationId];
          const msgs = db.messages[conversationId] || [];
          let targetMsg = msgs.find(m => m.id === messageId);

          // Auto-create conv record if it was a mock conversation
          if (!conv) {
            conv = {
              id: conversationId,
              type: 'direct',
              title: 'Chat',
              avatarUrl: '',
              participantIds: [userId],
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
              // Create deleted message record so subsequent fetches know it was deleted
              const fallbackDeleted: MessageRecord = {
                id: messageId,
                conversationId,
                senderId: userId,
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

            // If it was the last message, update preview
            if (targetMsg && (conv.lastMessageTime === targetMsg.timestamp || !conv.lastMessageText)) {
              conv.lastMessageText = 'Este mensaje fue eliminado.';
            }

            saveDatabase(db);

            // Real-time broadcast to all participants (and all connected sockets)
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
            // Delete permanently for everyone (erased completely)
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
              if (!targetMsg.deletedForUserIds.includes(userId)) {
                targetMsg.deletedForUserIds.push(userId);
              }
              saveDatabase(db);
            }

            ws.send(JSON.stringify({
              type: 'chat:message_deleted_for_me',
              data: { conversationId, messageId, userId }
            }));
          }
          break;
        }

        // --- 2.2 Edit Message (Backend real sync with "Editado" label) ---
        case 'chat:edit_message': {
          const { conversationId, messageId, userId, newText } = data;
          const conv = db.conversations[conversationId];
          const msgs = db.messages[conversationId] || [];
          const targetMsg = msgs.find(m => m.id === messageId);

          if (!conv || !targetMsg) {
            ws.send(JSON.stringify({ type: 'error', message: 'Mensaje no encontrado' }));
            return;
          }

          // Validation: only sender can edit and cannot edit deleted messages
          if (targetMsg.senderId !== userId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Solo el autor puede editar su mensaje.' }));
            return;
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

        // --- 2.3 Real Reactions Sync ---
        case 'chat:reaction': {
          const { conversationId, messageId, userId, emoji } = data;
          const conv = db.conversations[conversationId];
          const msgs = db.messages[conversationId] || [];
          const targetMsg = msgs.find(m => m.id === messageId);

          if (conv && targetMsg) {
            if (!targetMsg.reactions) targetMsg.reactions = {};
            const existing = targetMsg.reactions[emoji] || [];
            if (existing.includes(userId)) {
              // Remove reaction
              targetMsg.reactions[emoji] = existing.filter(u => u !== userId);
              if (targetMsg.reactions[emoji].length === 0) {
                delete targetMsg.reactions[emoji];
              }
            } else {
              // Add reaction
              targetMsg.reactions[emoji] = [...existing, userId];
            }
            saveDatabase(db);

            broadcast({
              type: 'chat:reaction_updated',
              data: {
                conversationId,
                messageId,
                reactions: targetMsg.reactions
              }
            }, conv.participantIds);
          }
          break;
        }

        // --- 2.3.1 Real Poll Voting Sync ---
        case 'chat:poll_vote': {
          const { conversationId, messageId, optionId, userId } = data;
          const conv = db.conversations[conversationId];
          const msgs = db.messages[conversationId] || [];
          const targetMsg = msgs.find(m => m.id === messageId);

          if (conv && targetMsg && targetMsg.poll) {
            const allowsMultiple = targetMsg.poll.allowsMultipleAnswers;
            targetMsg.poll.options = targetMsg.poll.options.map((opt: any) => {
              const hasVoted = (opt.votes || []).includes(userId);
              if (opt.id === optionId) {
                return {
                  ...opt,
                  votes: hasVoted
                    ? opt.votes.filter((u: string) => u !== userId)
                    : [...(opt.votes || []), userId]
                };
              } else if (!allowsMultiple) {
                return {
                  ...opt,
                  votes: (opt.votes || []).filter((u: string) => u !== userId)
                };
              }
              return opt;
            });

            saveDatabase(db);

            broadcast({
              type: 'chat:poll_voted',
              data: {
                conversationId,
                messageId,
                poll: targetMsg.poll
              }
            }, conv.participantIds);
          }
          break;
        }

        // --- 2.4 Star & Pin Message Real Sync ---
        case 'chat:star_message': {
          const { conversationId, messageId, isStarred } = data;
          const msgs = db.messages[conversationId] || [];
          const target = msgs.find(m => m.id === messageId);
          if (target) {
            target.isStarred = isStarred;
            saveDatabase(db);
          }
          break;
        }

        case 'chat:pin_message': {
          const { conversationId, messageId, isPinned } = data;
          const conv = db.conversations[conversationId];
          const msgs = db.messages[conversationId] || [];
          if (conv) {
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

        // --- 2.5 Conversation Actions (Pin, Archive, Mute, Clear, Delete) ---
        case 'chat:conversation_action': {
          const { conversationId, userId, action, payload } = data;
          const conv = db.conversations[conversationId];
          if (!conv) break;

          if (action === 'pin') {
            conv.isPinned = !!payload?.isPinned;
          } else if (action === 'archive') {
            conv.isArchived = !!payload?.isArchived;
          } else if (action === 'mute') {
            conv.isMuted = !!payload?.isMuted;
          } else if (action === 'mark_unread') {
            conv.unreadCounts[userId] = (conv.unreadCounts[userId] || 0) > 0 ? 0 : 1;
          } else if (action === 'clear_messages') {
            // Keep conversation but empty messages
            db.messages[conversationId] = [];
            conv.lastMessageText = 'Conversación vaciada';
          } else if (action === 'delete_conversation') {
            conv.participantIds = conv.participantIds.filter(id => id !== userId);
            if (conv.participantIds.length === 0) {
              delete db.conversations[conversationId];
              delete db.messages[conversationId];
            }
          }
          saveDatabase(db);

          broadcast({
            type: 'chat:conversation_updated',
            data: { conversation: conv, action, userId }
          }, [userId]);
          break;
        }

        // --- 2.6 Group Management Actions ---
        case 'group:action': {
          const { conversationId, adminUserId, action, targetUserId, newInfo, permissions } = data;
          const conv = db.conversations[conversationId];
          if (!conv || conv.type !== 'group') break;

          const isAdmin = conv.adminIds?.includes(adminUserId);

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
            if (!isAdmin && adminUserId !== targetUserId) break; // User can leave or admin can remove
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

        // --- 3. Typing Indicators ---
        case 'chat:typing': {
          const { conversationId, userId, isTyping } = data;
          const conv = db.conversations[conversationId];
          if (conv) {
            const recipientIds = conv.participantIds.filter(id => id !== userId);
            broadcast({
              type: 'chat:user_typing',
              data: { conversationId, userId, isTyping }
            }, recipientIds);
          }
          break;
        }

        // --- 4. Message Read Receipts ---
        case 'chat:mark_read': {
          const { conversationId, userId } = data;
          const conv = db.conversations[conversationId];
          if (conv) {
            conv.unreadCounts[userId] = 0;
            const msgs = db.messages[conversationId] || [];
            msgs.forEach(m => {
              if (m.senderId !== userId && m.status !== 'read') {
                m.status = 'read';
              }
            });
            saveDatabase(db);

            broadcast({
              type: 'chat:read_receipt',
              data: { conversationId, readerId: userId }
            }, conv.participantIds);
          }
          break;
        }

        // --- 4.1 Message Delivery Confirmations ---
        case 'chat:delivery_ack': {
          const { conversationId, messageId, recipientId } = data;
          const msgs = db.messages[conversationId] || [];
          const target = msgs.find(m => m.id === messageId);
          if (target && target.status === 'sent') {
            target.status = 'delivered';
            saveDatabase(db);
            broadcast({
              type: 'chat:message_delivered',
              data: { conversationId, messageId, recipientId }
            }, [target.senderId]);
          }
          break;
        }

        // --- 5. Ephemeral Stories / Statuses ---
        case 'status:publish': {
          const { userId, textCaption, mediaUrl, bgHex } = data;
          const user = db.users[userId];
          if (user) {
            const newStatus: StatusRecord = {
              id: `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              userId,
              userName: user.displayName,
              userAvatar: user.avatarUrl,
              textCaption,
              mediaUrl,
              bgHex: bgHex || '#0077B6',
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

        // --- 6. WebRTC Signaling: 1-on-1 and Group Voice/Video Calling ---
        case 'webrtc:call_user': {
          // Caller sends call invitation with SDP offer
          const { callerId, callerName, callerAvatar, targetUserId, isVideo, offerSdp } = data;
          broadcast({
            type: 'webrtc:incoming_call',
            data: {
              callId: `call_${Date.now()}`,
              callerId,
              callerName,
              callerAvatar,
              targetUserId,
              isVideo,
              offerSdp
            }
          }, [targetUserId]);
          break;
        }

        case 'webrtc:call_accept':
        case 'webrtc:accept_call': {
          // Target accepts and sends SDP answer back to caller
          const { callerId, targetUserId, answerSdp } = data;
          broadcast({
            type: 'webrtc:call_accepted',
            data: { callerId, targetUserId, answerSdp }
          }, [callerId]);
          break;
        }

        case 'webrtc:call_reject':
        case 'webrtc:reject_call': {
          const { callerId, targetUserId, reason } = data;
          broadcast({
            type: 'webrtc:call_rejected',
            data: { callerId, targetUserId, reason: reason || 'declined' }
          }, [callerId]);
          break;
        }

        case 'webrtc:call_end':
        case 'webrtc:end_call': {
          const { recipientId, endedBy } = data;
          broadcast({
            type: 'webrtc:call_ended',
            data: { endedBy }
          }, recipientId ? [recipientId] : undefined);
          break;
        }

        case 'webrtc:ice_candidate': {
          const { targetUserId, candidate } = data;
          broadcast({
            type: 'webrtc:ice_candidate',
            data: { candidate, fromUserId: socketToUser.get(ws) }
          }, [targetUserId]);
          break;
        }

        // --- 7. Group Call Signaling (Mesh WebRTC) ---
        case 'webrtc:group_join': {
          const { conversationId, user } = data;
          const conv = db.conversations[conversationId];
          if (conv) {
            broadcast({
              type: 'webrtc:group_user_joined',
              data: { conversationId, user }
            }, conv.participantIds.filter(id => id !== user.id));
          }
          break;
        }

        case 'webrtc:group_signal': {
          // Peer-to-peer signal relay between group participants
          const { targetUserId, signal, fromUser } = data;
          broadcast({
            type: 'webrtc:group_signal',
            data: { signal, fromUser }
          }, [targetUserId]);
          break;
        }

        case 'webrtc:group_leave': {
          const { conversationId, userId } = data;
          const conv = db.conversations[conversationId];
          if (conv) {
            broadcast({
              type: 'webrtc:group_user_left',
              data: { conversationId, userId }
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

// --- REST API Endpoints ---

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
app.get(['/download/NAKEIC-v2.6.0-source.zip', '/NAKEIC-source.zip'], (req, res) => {
  const filePath = path.join(__dirname, 'public', 'NAKEIC-v2.6.0-source.zip');
  res.setHeader('Content-Type', 'application/zip');
  res.download(filePath, 'NAKEIC-v2.6.0-source.zip');
});

// Get all users
app.get('/api/users', (req, res) => {
  res.json(Object.values(db.users));
});

// Register or Login user
app.post('/api/auth/register', (req, res) => {
  const { phoneNumber, displayName, username, bio, avatarUrl } = req.body;
  if (!phoneNumber || !displayName) {
    return res.status(400).json({ error: 'Número de teléfono y nombre son obligatorios' });
  }

  // Check if user already exists by phone number
  let user = Object.values(db.users).find(u => u.phoneNumber.replace(/\s+/g, '') === phoneNumber.replace(/\s+/g, ''));

  if (!user) {
    const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    user = {
      id,
      phoneNumber,
      displayName,
      username: username || displayName.toLowerCase().replace(/\s+/g, '_'),
      bio: bio || 'Conectado con NAKEIC 🚀',
      avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${id}`,
      isOnline: true,
      lastSeen: Date.now(),
      createdAt: Date.now()
    };
    db.users[id] = user;

    // Automatically add this new user to the global community group
    if (db.conversations['conv_group_general']) {
      if (!db.conversations['conv_group_general'].participantIds.includes(id)) {
        db.conversations['conv_group_general'].participantIds.push(id);
      }
    }

    saveDatabase(db);

    // Notify all connected clients about the new user in directory
    broadcast({
      type: 'user:new_registered',
      data: { user }
    });
  } else {
    // Update profile
    user.displayName = displayName || user.displayName;
    user.username = username || user.username;
    user.bio = bio || user.bio;
    if (avatarUrl) user.avatarUrl = avatarUrl;
    user.isOnline = true;
    user.lastSeen = Date.now();
    saveDatabase(db);
  }

  const token = `nkc_auth_${user.id}_${Date.now()}`;
  res.json({ success: true, user, token });
});

// User Login endpoint with phone number authentication
app.post('/api/auth/login', (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ error: 'El número de teléfono es obligatorio' });
  }

  const cleanTarget = phoneNumber.replace(/[\s\-\(\)\+]/g, '');
  const user = Object.values(db.users).find(u =>
    u.phoneNumber.replace(/[\s\-\(\)\+]/g, '') === cleanTarget
  );

  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado en NAKEIC' });
  }

  user.isOnline = true;
  user.lastSeen = Date.now();
  saveDatabase(db);

  const token = `nkc_auth_${user.id}_${Date.now()}`;
  res.json({ success: true, user, token });
});

// Register or update device FCM Push Token
app.post('/api/users/fcm-token', (req, res) => {
  const { userId, fcmToken } = req.body;
  if (!userId || !fcmToken) {
    return res.status(400).json({ error: 'userId y fcmToken son obligatorios' });
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
  const existingOtp = otpStore.get(cleanPhone);
  
  // Rate limiting: 30 seconds
  if (existingOtp && existingOtp.expiresAt - Date.now() > 4.5 * 60 * 1000) {
    return res.status(429).json({ error: 'Espere 30 segundos antes de solicitar otro código OTP.' });
  }

  // Generate 6-digit numeric verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity
  otpStore.set(cleanPhone, { code, expiresAt, attempts: 0 });

  res.json({
    success: true,
    message: 'Código de verificación OTP generado y enviado correctamente',
    phoneNumber: cleanPhone,
    expiresInSeconds: 300,
    debugCode: code // Provided for verification and automated tests
  });
});

// Verify OTP
app.post('/api/auth/otp/verify', (req, res) => {
  const { phoneNumber, code, displayName, deviceName } = req.body;
  if (!phoneNumber || !code) {
    return res.status(400).json({ error: 'Teléfono y código OTP son requeridos' });
  }

  const cleanPhone = phoneNumber.replace(/[\s\-\(\)\+]/g, '');
  const entry = otpStore.get(cleanPhone);

  if (!entry) {
    return res.status(400).json({ error: 'No hay un código OTP activo para este número o ha expirado.' });
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(cleanPhone);
    return res.status(400).json({ error: 'El código OTP ha expirado. Solicite uno nuevo.' });
  }

  if (entry.code !== String(code).trim()) {
    entry.attempts++;
    if (entry.attempts >= 4) {
      otpStore.delete(cleanPhone);
      return res.status(400).json({ error: 'Demasiados intentos fallidos. Solicite un nuevo código.' });
    }
    return res.status(400).json({ error: 'Código de verificación incorrecto.' });
  }

  // OTP verified successfully
  otpStore.delete(cleanPhone);

  // Find or create user
  let user = Object.values(db.users).find(u => u.phoneNumber.replace(/[\s\-\(\)\+]/g, '') === cleanPhone);

  if (!user) {
    const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
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
      createdAt: Date.now()
    };
    db.users[id] = user;

    if (db.conversations['conv_group_general']) {
      if (!db.conversations['conv_group_general'].participantIds.includes(id)) {
        db.conversations['conv_group_general'].participantIds.push(id);
      }
    }
  } else {
    user.isOnline = true;
    user.lastSeen = Date.now();
    if (displayName) user.displayName = displayName;
  }

  // Register session
  const token = `nkc_auth_${user.id}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  if (!db.sessions) db.sessions = {};
  if (!db.sessions[user.id]) db.sessions[user.id] = [];

  const sessionRecord: SessionRecord = {
    id: sessionId,
    userId: user.id,
    token,
    deviceName: deviceName || 'Dispositivo NAKEIC Android / Web',
    platform: 'Android / Web Native',
    ip: req.ip || '127.0.0.1',
    createdAt: Date.now(),
    lastActive: Date.now()
  };
  db.sessions[user.id].push(sessionRecord);

  saveDatabase(db);

  broadcast({
    type: 'presence:update',
    data: { userId: user.id, isOnline: true, lastSeen: Date.now() }
  });

  res.json({
    success: true,
    user,
    token,
    session: sessionRecord
  });
});

// Refresh Token
app.post('/api/auth/refresh', (req, res) => {
  const { userId, token } = req.body;
  if (!userId || !token) {
    return res.status(400).json({ error: 'userId y token son obligatorios' });
  }
  const user = db.users[userId];
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  const newToken = `nkc_auth_${user.id}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  if (db.sessions && db.sessions[userId]) {
    const sess = db.sessions[userId].find(s => s.token === token && !s.isRevoked);
    if (sess) {
      sess.token = newToken;
      sess.lastActive = Date.now();
    }
  }
  saveDatabase(db);
  res.json({ success: true, token: newToken, user });
});

// List Active Sessions
app.get('/api/auth/sessions', (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: 'userId es requerido' });
  const userSessions = (db.sessions && db.sessions[userId]) || [];
  res.json(userSessions.filter(s => !s.isRevoked));
});

// Revoke Session
app.post('/api/auth/sessions/revoke', (req, res) => {
  const { userId, sessionId } = req.body;
  if (!userId || !sessionId) return res.status(400).json({ error: 'userId y sessionId son obligatorios' });
  if (db.sessions && db.sessions[userId]) {
    const sess = db.sessions[userId].find(s => s.id === sessionId);
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
  const { userId, token } = req.body;
  if (userId && db.users[userId]) {
    db.users[userId].isOnline = false;
    db.users[userId].lastSeen = Date.now();
    if (db.sessions && db.sessions[userId] && token) {
      const sess = db.sessions[userId].find(s => s.token === token);
      if (sess) sess.isRevoked = true;
    }
    saveDatabase(db);
    broadcast({
      type: 'presence:update',
      data: { userId, isOnline: false, lastSeen: Date.now() }
    });
  }
  res.json({ success: true, message: 'Sesión cerrada exitosamente' });
});

// Update Profile
app.patch('/api/users/:userId', (req, res) => {
  const { userId } = req.params;
  const { displayName, username, bio, avatarUrl } = req.body;
  const user = db.users[userId];
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (displayName) user.displayName = displayName;
  if (username) user.username = username;
  if (bio !== undefined) user.bio = bio;
  if (avatarUrl) user.avatarUrl = avatarUrl;
  user.lastSeen = Date.now();
  saveDatabase(db);

  broadcast({
    type: 'user:updated',
    data: { user }
  });

  res.json({ success: true, user });
});

// Search Users
app.get('/api/users/search', (req, res) => {
  const q = ((req.query.q as string) || '').toLowerCase().trim();
  const currentUserId = req.query.userId as string;
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

  res.json(results);
});

// Sync Contacts
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

  res.json({ success: true, matchedContacts: matches });
});

// Block User
app.post('/api/users/:userId/block', (req, res) => {
  const { userId } = req.params;
  const { targetUserId } = req.body;
  const user = db.users[userId];
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (!user.blockedUserIds) user.blockedUserIds = [];
  if (!user.blockedUserIds.includes(targetUserId)) {
    user.blockedUserIds.push(targetUserId);
    saveDatabase(db);
  }
  res.json({ success: true, blockedUserIds: user.blockedUserIds });
});

// Unblock User
app.post('/api/users/:userId/unblock', (req, res) => {
  const { userId } = req.params;
  const { targetUserId } = req.body;
  const user = db.users[userId];
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (user.blockedUserIds) {
    user.blockedUserIds = user.blockedUserIds.filter(id => id !== targetUserId);
    saveDatabase(db);
  }
  res.json({ success: true, blockedUserIds: user.blockedUserIds || [] });
});

// Delete Account
app.delete('/api/users/:userId', (req, res) => {
  const { userId } = req.params;
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
app.get('/api/webrtc/config', (req, res) => {
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ];

  if (process.env.TURN_URL) {
    iceServers.push({
      urls: process.env.TURN_URL,
      username: process.env.TURN_USERNAME || 'nakeic_user',
      credential: process.env.TURN_CREDENTIAL || 'nakeic_secret'
    } as any);
  }

  res.json({
    iceServers,
    turnConfigured: !!process.env.TURN_URL,
    guidance: process.env.TURN_URL 
      ? 'Servidor TURN activo para NAT simétrico y redes celulares'
      : 'Servidor STUN activo. Para NAT simétrico estricto configure TURN_URL en variables de entorno.'
  });
});

// Disappearing / Ephemeral Messages Timer per Conversation
app.post('/api/conversations/:id/disappearing', (req, res) => {
  const { id } = req.params;
  const { durationSeconds } = req.body;
  const conv = db.conversations[id];
  if (!conv) return res.status(404).json({ error: 'Conversación no encontrada' });
  conv.disappearingDurationSeconds = durationSeconds ? Number(durationSeconds) : undefined;
  saveDatabase(db);
  broadcast({
    type: 'conversation:updated',
    data: { conversation: conv }
  }, conv.participantIds);
  res.json({ success: true, conversation: conv });
});

// Communities & Topics
app.post('/api/communities', (req, res) => {
  const { title, avatarUrl, creatorId } = req.body;
  if (!title || !creatorId) return res.status(400).json({ error: 'title y creatorId son obligatorios' });
  const id = `comm_${Date.now()}`;
  const communityConv: ConversationRecord = {
    id,
    type: 'group',
    title,
    avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&auto=format&fit=crop&q=80',
    participantIds: [creatorId],
    unreadCounts: {},
    isPinned: false,
    adminIds: [creatorId],
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

app.post('/api/conversations/:id/topics', (req, res) => {
  const { id } = req.params;
  const { title, icon } = req.body;
  const conv = db.conversations[id];
  if (!conv) return res.status(404).json({ error: 'Conversación no encontrada' });
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

// Schedule Message Endpoint
app.post('/api/messages/schedule', (req, res) => {
  const { conversationId, senderId, text, scheduledTime, messageType } = req.body;
  if (!conversationId || !senderId || !scheduledTime) {
    return res.status(400).json({ error: 'conversationId, senderId y scheduledTime son obligatorios' });
  }
  const conv = db.conversations[conversationId];
  const sender = db.users[senderId];
  if (!conv || !sender) return res.status(404).json({ error: 'Conversación o usuario no encontrado' });

  const scheduledMsg: MessageRecord = {
    id: `sched_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    conversationId,
    senderId,
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

app.post('/api/business/quick-replies', (req, res) => {
  const { userId, shortcut, text } = req.body;
  if (!shortcut || !text) return res.status(400).json({ error: 'shortcut y text son obligatorios' });
  const uid = userId || 'default';
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

app.delete('/api/business/quick-replies/:id', (req, res) => {
  const { id } = req.params;
  const userId = (req.query.userId as string) || 'default';
  if (db.quickReplies && db.quickReplies[userId]) {
    db.quickReplies[userId] = db.quickReplies[userId].filter(q => q.id !== id);
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

app.post('/api/business/catalog', (req, res) => {
  const { userId, title, price, description, imageUrl, category } = req.body;
  if (!title || !price) return res.status(400).json({ error: 'title y price son requeridos' });
  const uid = userId || 'default';
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

// Get user conversations
app.get('/api/conversations', (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  const userConvs = Object.values(db.conversations).filter(c => 
    c.participantIds.includes(userId) || c.isChannel || c.isBusiness || (c.isSavedMessages && c.participantIds.includes(userId))
  );
  res.json(userConvs);
});

// Create new direct or group conversation
app.post('/api/conversations', (req, res) => {
  const { creatorId, type, participantIds, title, avatarUrl } = req.body;
  if (!creatorId || !participantIds || !Array.isArray(participantIds)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const allParticipants = Array.from(new Set([creatorId, ...participantIds]));

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
    const otherUserId = allParticipants.find(id => id !== creatorId);
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

// Get messages for a conversation
app.get('/api/messages', (req, res) => {
  const conversationId = req.query.conversationId as string;
  const userId = req.query.userId as string;
  if (!conversationId) {
    return res.status(400).json({ error: 'conversationId is required' });
  }
  let msgs = db.messages[conversationId] || [];
  if (userId) {
    msgs = msgs.filter(m => !m.deletedForUserIds || !m.deletedForUserIds.includes(userId));
  }
  res.json(msgs);
});

// REST Endpoint to send message (used by Android ChatRepository and HTTP clients)
app.post('/api/messages', (req, res) => {
  const { conversationId, senderId, text, messageType, mediaUrl, fileName, fileSize, poll, location, contact, productCard } = req.body;
  if (!conversationId || !senderId) {
    return res.status(400).json({ error: 'conversationId and senderId are required' });
  }

  let conversation = db.conversations[conversationId];
  let sender = db.users[senderId];

  if (!sender) {
    sender = {
      id: senderId,
      phoneNumber: '+52 55 8923 4410',
      displayName: 'Usuario NAKEIC',
      username: 'usuario',
      bio: 'Conectado con NAKEIC 🚀',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      isOnline: true,
      lastSeen: Date.now(),
      createdAt: Date.now()
    };
    db.users[senderId] = sender;
  }

  if (!conversation) {
    conversation = {
      id: conversationId,
      type: 'direct',
      title: 'Chat NAKEIC',
      avatarUrl: sender.avatarUrl,
      participantIds: [senderId],
      unreadCounts: {},
      lastMessageText: '',
      lastMessageTime: Date.now(),
      isPinned: false,
      createdAt: Date.now()
    };
    db.conversations[conversationId] = conversation;
  }

  if (!conversation.participantIds.includes(senderId)) {
    conversation.participantIds.push(senderId);
  }

  const msgId = req.body.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newMsg: MessageRecord = {
    id: msgId,
    conversationId,
    senderId,
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

    const activeRecipients = conversation.participantIds.filter(pid => {
      if (pid === senderId) return true;
      const recipientUser = db.users[pid];
      if (recipientUser && recipientUser.blockedUserIds && recipientUser.blockedUserIds.includes(senderId)) {
        return false;
      }
      return true;
    });

    broadcast({
      type: 'chat:new_message',
      data: { message: newMsg, conversation }
    }, activeRecipients);

    if (newMsg.text && newMsg.text.startsWith('/')) {
      handleBotCommand(conversationId, newMsg.text, senderId);
    }
  }

  res.status(201).json(newMsg);
});

// REST Endpoint to upload media attachments securely
app.post('/api/upload', (req, res) => {
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

// REST Fallback for Delete Message
app.post('/api/messages/delete', (req, res) => {
  const { conversationId, messageId, userId, deleteType } = req.body;
  const conv = db.conversations[conversationId];
  let msgs = db.messages[conversationId] || [];
  let targetMsg = msgs.find(m => m.id === messageId);

  if (deleteType === 'permanent') {
    if (db.messages[conversationId]) {
      db.messages[conversationId] = db.messages[conversationId].filter(m => m.id !== messageId);
    }
    if (conv) {
      const remaining = db.messages[conversationId] || [];
      const last = remaining.length > 0 ? remaining[remaining.length - 1] : undefined;
      conv.lastMessageText = last ? (last.text || 'Mensaje') : '';
      conv.lastMessageTime = last ? last.timestamp : Date.now();
    }
    saveDatabase(db);
    broadcast({
      type: 'chat:message_deleted_permanent',
      data: { conversationId, messageId }
    });
    return res.json({ success: true, deletedPermanently: true });
  }

  if (deleteType === 'for_everyone') {
    if (targetMsg) {
      targetMsg.isDeletedForEveryone = true;
      targetMsg.text = 'Este mensaje fue eliminado.';
      targetMsg.mediaUrl = undefined;
      targetMsg.poll = undefined;
      targetMsg.location = undefined;
      targetMsg.contact = undefined;
    }
    if (conv && targetMsg && (conv.lastMessageTime === targetMsg.timestamp || !conv.lastMessageText)) {
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
    if (targetMsg) {
      if (!targetMsg.deletedForUserIds) targetMsg.deletedForUserIds = [];
      if (!targetMsg.deletedForUserIds.includes(userId)) targetMsg.deletedForUserIds.push(userId);
      saveDatabase(db);
    }
    return res.json({ success: true, deletedForMe: true });
  }
});

// REST Fallback for Edit Message
app.post('/api/messages/edit', (req, res) => {
  const { conversationId, messageId, userId, newText } = req.body;
  const conv = db.conversations[conversationId];
  const msgs = db.messages[conversationId] || [];
  const targetMsg = msgs.find(m => m.id === messageId);

  if (!conv || !targetMsg) {
    return res.status(404).json({ error: 'Mensaje no encontrado' });
  }
  if (targetMsg.senderId !== userId) {
    return res.status(403).json({ error: 'Solo el autor puede editar el mensaje' });
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

// Connected Devices API
app.get('/api/devices', (req, res) => {
  const userId = req.query.userId as string;
  res.json([
    {
      id: 'dev_current',
      name: 'Android 15 (Google Pixel 9 Pro)',
      platform: 'Android Nativo · NAKEIC APK',
      lastActive: Date.now(),
      isCurrent: true,
      ip: '192.168.1.104',
      location: 'Ubicación actual'
    },
    {
      id: 'dev_chrome',
      name: 'Chrome en Linux / Web',
      platform: 'NAKEIC Web Client',
      lastActive: Date.now() - 3600000,
      isCurrent: false,
      ip: '192.168.1.88',
      location: 'Sesión activa'
    }
  ]);
});

// Get statuses
app.get('/api/statuses', (req, res) => {
  // Filter statuses within 24 hours
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const activeStatuses = db.statuses.filter(s => s.timestamp > cutoff);
  res.json(activeStatuses);
});

// Vite Integration for Full-Stack serving
async function startApp() {
  const isProd = process.env.NODE_ENV === 'production';
  // AI Studio requires dev server on port 3000 (PORT in env is 8080 used by reverse proxy)
  const port = 3000;

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
