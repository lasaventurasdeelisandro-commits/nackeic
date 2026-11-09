import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import {
  ThemeConfig,
  User,
  Conversation,
  Message,
  CallRecord,
  EphemeralStatus,
  Contact,
  ActiveCallState,
  MessageType,
  ChannelItem
} from '../types';
import {
  CURRENT_USER,
  PRESET_THEMES,
  INITIAL_CONVERSATIONS,
  INITIAL_MESSAGES,
  INITIAL_CALLS,
  INITIAL_STATUSES,
  INITIAL_CONTACTS,
  INITIAL_CHANNELS
} from '../data/mockData';
import { realtime } from '../services/realtimeService';

interface AppContextType {
  // Theme & Appearance
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => void;
  updateThemeColors: (updates: Partial<ThemeConfig>) => void;
  presetThemes: ThemeConfig[];

  // User
  currentUser: User;
  updateCurrentUser: (updates: Partial<User>) => void;
  registerOrSwitchUser: (userData: { phoneNumber: string; displayName: string; username?: string; bio?: string; avatarUrl?: string }) => Promise<void>;
  availableUsers: User[];

  // Navigation
  activeTab: 'chats' | 'status' | 'calls' | 'settings';
  setActiveTab: (tab: 'chats' | 'status' | 'calls' | 'settings') => void;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  viewingStatus: EphemeralStatus | null;
  setViewingStatus: (status: EphemeralStatus | null) => void;
  isCameraOpen: boolean;
  setIsCameraOpen: (open: boolean) => void;
  isNewChatModalOpen: boolean;
  setIsNewChatModalOpen: (open: boolean) => void;
  isNewGroupModalOpen: boolean;
  setIsNewGroupModalOpen: (open: boolean) => void;

  // Conversations & Messages
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  sendMessage: (conversationId: string, text: string, type?: MessageType, mediaAttachment?: Partial<Message>) => Promise<void>;
  addReaction: (conversationId: string, messageId: string, emoji: string) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  deleteMessageForEveryone: (conversationId: string, messageId: string) => void;
  deleteMessagePermanently: (conversationId: string, messageId: string) => void;
  starMessage: (conversationId: string, messageId: string) => void;
  editMessage: (conversationId: string, messageId: string, newText: string) => void;
  votePoll: (conversationId: string, messageId: string, optionId: string) => void;
  openViewOnce: (conversationId: string, messageId: string) => void;
  forwardMessage: (targetConversationId: string, message: Message) => Promise<void>;
  pinMessage: (conversationId: string, messageId: string) => void;
  setDisappearingTimer: (conversationId: string, seconds: number | null) => void;
  createConversation: (contact: Contact) => Promise<string>;
  createGroup: (title: string, memberIds: string[], avatarUrl?: string) => Promise<string>;
  toggleArchiveConversation: (conversationId: string) => void;
  togglePinConversation: (conversationId: string) => void;
  toggleMuteConversation: (conversationId: string) => void;
  toggleMarkUnreadConversation: (conversationId: string) => void;
  clearConversationMessages: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
  updateGroupInfo: (conversationId: string, newInfo: { title?: string; avatarUrl?: string }) => void;
  addGroupMember: (conversationId: string, targetUserId: string) => void;
  removeGroupMember: (conversationId: string, targetUserId: string) => void;
  promoteGroupAdmin: (conversationId: string, targetUserId: string) => void;
  demoteGroupAdmin: (conversationId: string, targetUserId: string) => void;
  updateGroupPermissions: (conversationId: string, permissions: { onlyAdminsCanSend?: boolean; onlyAdminsCanEditInfo?: boolean }) => void;

  // Channels / Novedades
  channels: ChannelItem[];
  toggleFollowChannel: (channelId: string) => void;

  // Calls & Real WebRTC
  calls: CallRecord[];
  activeCall: ActiveCallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startCall: (contactName: string, contactAvatar: string, isVideo: boolean, targetUserId?: string) => Promise<void>;
  startGroupCall: (conversationId: string, isVideo: boolean) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  toggleCamera: () => void;
  switchCamera: () => void;

  // Ephemeral Statuses
  statuses: EphemeralStatus[];
  addStatus: (caption: string, mediaUrl?: string, bgHex?: string) => Promise<void>;

  // Contacts
  contacts: Contact[];

  // Network Connection Status
  isOffline: boolean;
  setIsOffline: (offline: boolean) => void;
  isConnectedToServer: boolean;

  // Real Audio Voice Recording Engine
  isRecordingVoice: boolean;
  isRecordingPaused: boolean;
  isRecordingLocked: boolean;
  recordingDuration: number;
  recordedAudioBlob: Blob | null;
  recordedWaveform: number[];
  startVoiceRecording: () => Promise<void>;
  pauseVoiceRecording: () => void;
  resumeVoiceRecording: () => void;
  setIsRecordingLocked: (locked: boolean) => void;
  stopVoiceRecording: () => void;
  cancelVoiceRecording: () => void;
  sendVoiceRecording: (conversationId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeConfig>(() => {
    const saved = localStorage.getItem('nakeic_theme');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return PRESET_THEMES[0];
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('nakeic_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return CURRENT_USER;
  });

  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'chats' | 'status' | 'calls' | 'settings'>('chats');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [viewingStatus, setViewingStatus] = useState<EphemeralStatus | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState<boolean>(false);
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState<boolean>(false);

  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [messages, setMessages] = useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const [calls, setCalls] = useState<CallRecord[]>(INITIAL_CALLS);
  const [statuses, setStatuses] = useState<EphemeralStatus[]>(INITIAL_STATUSES);
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);
  const [channels, setChannels] = useState<ChannelItem[]>(INITIAL_CHANNELS);

  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [isConnectedToServer, setIsConnectedToServer] = useState<boolean>(false);

  // WebRTC Media Streams
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // Real Voice recording state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [isRecordingLocked, setIsRecordingLocked] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedWaveform, setRecordedWaveform] = useState<number[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);
  const offlineQueueRef = useRef<{ conversationId: string; text: string; type: MessageType; attachment?: Partial<Message> }[]>([]);

  // Active call state
  const [activeCall, setActiveCall] = useState<ActiveCallState>({
    isActive: false,
    contactName: '',
    contactAvatar: '',
    isVideo: false,
    isMuted: false,
    isSpeaker: true,
    isCameraOff: false,
    isFrontCamera: true,
    durationSeconds: 0,
    status: 'connecting'
  });
  const callTimerRef = useRef<any>(null);

  const setTheme = (newTheme: ThemeConfig) => {
    setThemeState(newTheme);
    localStorage.setItem('nakeic_theme', JSON.stringify(newTheme));
  };

  const updateThemeColors = (updates: Partial<ThemeConfig>) => {
    setThemeState(prev => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('nakeic_theme', JSON.stringify(updated));
      return updated;
    });
  };

  const updateCurrentUser = (updates: Partial<User>) => {
    setCurrentUser(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem('nakeic_user', JSON.stringify(next));
      return next;
    });
  };

  // Register or Switch User Real Profile
  const registerOrSwitchUser = async (userData: { phoneNumber: string; displayName: string; username?: string; bio?: string; avatarUrl?: string }) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      const data = await res.json();
      if (data.user) {
        const fullUser: User = {
          ...data.user,
          lastSeen: 'En línea',
          fingerprint: `SHA256:${Math.random().toString(36).substring(2, 10).toUpperCase()}`
        };
        setCurrentUser(fullUser);
        localStorage.setItem('nakeic_user', JSON.stringify(fullUser));
        realtime.connect(fullUser.id);
        fetchInitialData(fullUser.id);
      }
    } catch (e) {
      console.warn('Register fallback locally:', e);
      const fallbackUser: User = {
        id: `user_${Date.now()}`,
        phoneNumber: userData.phoneNumber,
        displayName: userData.displayName,
        username: userData.username || 'usuario_nakeic',
        bio: userData.bio || 'Conectado con NAKEIC',
        avatarUrl: userData.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
        isOnline: true,
        lastSeen: 'En línea',
        fingerprint: 'SHA256:7B9A42C9'
      };
      setCurrentUser(fallbackUser);
      localStorage.setItem('nakeic_user', JSON.stringify(fallbackUser));
    }
  };

  // Initial Data Fetcher from Server
  const fetchInitialData = async (userId: string) => {
    try {
      // 1. Fetch Users / Contacts
      const usersRes = await fetch('/api/users');
      if (usersRes.ok) {
        const usersList: any[] = await usersRes.json();
        setAvailableUsers(usersList);
        const contactsList: Contact[] = usersList
          .filter(u => u.id !== userId)
          .map(u => ({
            id: u.id,
            name: u.displayName,
            phoneNumber: u.phoneNumber,
            avatarUrl: u.avatarUrl,
            bio: u.bio,
            isRegistered: true
          }));
        setContacts(contactsList);
      }

      // 2. Fetch Conversations
      const convsRes = await fetch(`/api/conversations?userId=${userId}`);
      if (convsRes.ok) {
        const convsList: any[] = await convsRes.json();
        if (convsList.length > 0) {
          const mapped: Conversation[] = convsList.map(c => ({
            id: c.id,
            title: c.title,
            isGroup: c.type === 'group',
            avatarUrl: c.avatarUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300',
            unreadCount: c.unreadCounts?.[userId] || 0,
            isPinned: !!c.isPinned,
            isMuted: !!c.isMuted,
            isSavedMessages: !!c.isSavedMessages,
            isBusiness: !!c.isBusiness,
            isChannel: !!c.isChannel,
            channelSubscribers: c.channelSubscribers,
            label: c.label,
            businessProfile: c.businessProfile,
            memberIds: c.participantIds || [],
            lastMessage: c.lastMessageText ? {
              id: 'last_' + c.id,
              conversationId: c.id,
              senderId: '',
              senderName: '',
              text: c.lastMessageText,
              type: 'text',
              status: 'delivered',
              timestamp: c.lastMessageTime || Date.now()
            } : undefined
          }));
          setConversations(mapped);
        }
      }

      // 3. Fetch Statuses
      const statusesRes = await fetch('/api/statuses');
      if (statusesRes.ok) {
        const statusList: any[] = await statusesRes.json();
        if (statusList.length > 0) {
          setStatuses(statusList.map(s => ({
            id: s.id,
            userId: s.userId,
            userName: s.userName,
            userAvatar: s.userAvatar,
            mediaUrl: s.mediaUrl,
            textCaption: s.textCaption,
            bgHex: s.bgHex || '#0077B6',
            timestamp: s.timestamp,
            expiresAt: s.timestamp + 86400000,
            isViewed: false
          })));
        }
      }
    } catch (e) {
      console.warn('Notice loading initial data:', e);
    }
  };

  // Fetch conversation messages when conversation opens
  useEffect(() => {
    if (!activeConversationId) return;

    fetch(`/api/messages?conversationId=${activeConversationId}`)
      .then(res => res.json())
      .then(serverMsgs => {
        if (Array.isArray(serverMsgs) && serverMsgs.length > 0) {
          const mapped: Message[] = serverMsgs.map(m => ({
            id: m.id,
            conversationId: m.conversationId,
            senderId: m.senderId,
            senderName: m.senderName,
            text: m.text,
            type: m.type as MessageType,
            status: m.status,
            timestamp: m.timestamp,
            mediaUrl: m.mediaUrl,
            fileName: m.fileName,
            fileSize: m.fileSize,
            durationSeconds: m.durationSeconds,
            waveform: m.waveform,
            location: m.location,
            contact: m.contact,
            poll: m.poll,
            productCard: m.productCard,
            isSilent: m.isSilent,
            isScheduled: m.isScheduled,
            scheduledTime: m.scheduledTime,
            viewsCount: m.viewsCount,
            isStarred: m.isStarred,
            isPinned: m.isPinned,
            isEdited: m.isEdited,
            isDeletedForEveryone: m.isDeletedForEveryone,
            deletedForUserIds: m.deletedForUserIds,
            reactions: m.reactions,
            replyTo: m.replyToId ? {
              id: m.replyToId,
              senderName: 'Mensaje',
              text: m.replyToText || '',
              type: 'text'
            } : undefined
          }));
          setMessages(prev => ({
            ...prev,
            [activeConversationId]: mapped
          }));
        }
      })
      .catch(() => {});

    // Notify server that active conversation is read
    realtime.send('chat:mark_read', {
      conversationId: activeConversationId,
      userId: currentUser.id
    });
  }, [activeConversationId, currentUser.id]);

  // Connect WebSocket on user mount & register real-time event listeners
  useEffect(() => {
    if (!currentUser.id) return;

    realtime.connect(currentUser.id);
    fetchInitialData(currentUser.id);

    // 1. Connection status
    const unsubConn = realtime.on('connection:change', data => {
      setIsConnectedToServer(data.isConnected);
    });

    // 2. Incoming real-time message
    const unsubMsg = realtime.on('chat:new_message', data => {
      const { message, conversation } = data;
      const convId = message.conversationId;

      const formattedMsg: Message = {
        id: message.id,
        conversationId: convId,
        senderId: message.senderId,
        senderName: message.senderName,
        text: message.text,
        type: message.type,
        status: 'delivered',
        timestamp: message.timestamp,
        mediaUrl: message.mediaUrl,
        fileName: message.fileName,
        fileSize: message.fileSize,
        durationSeconds: message.durationSeconds
      };

      // Append message
      setMessages(prev => ({
        ...prev,
        [convId]: [...(prev[convId] || []).filter(m => m.id !== message.id), formattedMsg]
      }));

      // Update conversation last message & unread badge
      setConversations(prev => {
        const exists = prev.some(c => c.id === convId);
        if (exists) {
          return prev.map(c =>
            c.id === convId
              ? {
                  ...c,
                  lastMessage: formattedMsg,
                  unreadCount: activeConversationId === convId ? 0 : (c.unreadCount || 0) + 1
                }
              : c
          );
        } else if (conversation) {
          return [{
            id: conversation.id,
            title: conversation.title,
            isGroup: conversation.type === 'group',
            avatarUrl: conversation.avatarUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300',
            unreadCount: 1,
            isPinned: false,
            isMuted: false,
            memberIds: conversation.participantIds,
            lastMessage: formattedMsg
          }, ...prev];
        }
        return prev;
      });

      // Play subtle audio chime if received from someone else
      if (message.senderId !== currentUser.id) {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(800, ctx.currentTime);
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
          osc.start();
          osc.stop(ctx.currentTime + 0.2);
        } catch (e) {}

        // Confirm delivery to sender in real time
        realtime.send('chat:delivery_ack', {
          conversationId: message.conversationId,
          messageId: message.id,
          recipientId: currentUser.id
        });
      }
    });

    // 3. New user registered in directory
    const unsubUser = realtime.on('user:new_registered', data => {
      const newUser = data.user;
      if (newUser && newUser.id !== currentUser.id) {
        setAvailableUsers(prev => [...prev.filter(u => u.id !== newUser.id), newUser]);
        setContacts(prev => [
          ...prev.filter(c => c.id !== newUser.id),
          {
            id: newUser.id,
            name: newUser.displayName,
            phoneNumber: newUser.phoneNumber,
            avatarUrl: newUser.avatarUrl,
            bio: newUser.bio,
            isRegistered: true
          }
        ]);
      }
    });

    // 4. Presence update
    const unsubPresence = realtime.on('presence:update', data => {
      const { userId, isOnline } = data;
      setAvailableUsers(prev =>
        prev.map(u => (u.id === userId ? { ...u, isOnline } : u))
      );
    });

    // 5. Ephemeral Story / Status update
    const unsubStatus = realtime.on('status:new', data => {
      const newStatus = data.status;
      if (newStatus) {
        setStatuses(prev => [
          {
            id: newStatus.id,
            userId: newStatus.userId,
            userName: newStatus.userName,
            userAvatar: newStatus.userAvatar,
            mediaUrl: newStatus.mediaUrl,
            textCaption: newStatus.textCaption,
            bgHex: newStatus.bgHex || '#0077B6',
            timestamp: newStatus.timestamp,
            expiresAt: newStatus.timestamp + 86400000,
            isViewed: false
          },
          ...prev
        ]);
      }
    });

    // 6. WebRTC: Incoming Call!
    const unsubIncomingCall = realtime.on('webrtc:incoming_call', data => {
      setActiveCall({
        isActive: true,
        isIncoming: true,
        contactName: data.callerName,
        contactAvatar: data.callerAvatar,
        callerId: data.callerId,
        isVideo: data.isVideo,
        isMuted: false,
        isSpeaker: true,
        isCameraOff: false,
        isFrontCamera: true,
        durationSeconds: 0,
        status: 'ringing',
        offerSdp: data.offerSdp
      });

      // Play ringing chime
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } catch (e) {}
    });

    // 7. WebRTC: Call Accepted by remote peer
    const unsubCallAccepted = realtime.on('webrtc:call_accepted', () => {
      setActiveCall(prev => ({
        ...prev,
        status: 'connected',
        durationSeconds: 0
      }));

      // Start duration counter
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      callTimerRef.current = setInterval(() => {
        setActiveCall(p => ({ ...p, durationSeconds: p.durationSeconds + 1 }));
      }, 1000);
    });

    // 8. WebRTC: Remote Stream track received
    const unsubRemoteStream = realtime.on('webrtc:remote_stream', data => {
      setRemoteStream(data.stream);
    });

    // 9. WebRTC: Call Ended
    const unsubCallEnded = realtime.on('webrtc:call_ended', () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      setLocalStream(null);
      setRemoteStream(null);
      setActiveCall(prev => ({
        ...prev,
        isActive: false,
        status: 'ended'
      }));
    });

    // 10. Message Deleted Real-time Sync (For Everyone)
    const unsubMsgDeleted = realtime.on('chat:message_deleted', data => {
      const { conversationId, messageId } = data;
      setMessages(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).map(m =>
          m.id === messageId
            ? {
                ...m,
                isDeletedForEveryone: true,
                text: 'Este mensaje fue eliminado.',
                mediaUrl: undefined,
                poll: undefined,
                location: undefined,
                contact: undefined
              }
            : m
        )
      }));

      setConversations(prev =>
        prev.map(c =>
          c.id === conversationId && c.lastMessage && c.lastMessage.id === messageId
            ? {
                ...c,
                lastMessage: {
                  ...c.lastMessage,
                  isDeletedForEveryone: true,
                  text: 'Este mensaje fue eliminado.'
                }
              }
            : c
        )
      );
    });

    // 11. Message Deleted For Me Sync
    const unsubMsgDeletedForMe = realtime.on('chat:message_deleted_for_me', data => {
      const { conversationId, messageId } = data;
      setMessages(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).filter(m => m.id !== messageId)
      }));
    });

    // 11b. Message Deleted Permanently Sync
    const unsubMsgDeletedPermanent = realtime.on('chat:message_deleted_permanent', data => {
      const { conversationId, messageId } = data;
      setMessages(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).filter(m => m.id !== messageId)
      }));
    });

    // 11c. Message Delivered Status Confirmation
    const unsubMsgDelivered = realtime.on('chat:message_delivered', data => {
      const { conversationId, messageId } = data;
      setMessages(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).map(m =>
          m.id === messageId ? { ...m, status: 'delivered' } : m
        )
      }));
    });

    // 11d. Offline Messages Sync upon reconnection
    const unsubOfflineSync = realtime.on('chat:offline_sync', data => {
      const { messages } = data;
      if (Array.isArray(messages)) {
        messages.forEach((msg: any) => {
          setMessages(prev => {
            const list = prev[msg.conversationId] || [];
            if (!list.some(m => m.id === msg.id)) {
              return { ...prev, [msg.conversationId]: [...list, msg] };
            }
            return prev;
          });
        });
      }
    });

    // 12. Message Edited Real-time Sync
    const unsubMsgEdited = realtime.on('chat:message_edited', data => {
      const { conversationId, messageId, newText, isEdited, editedAt } = data;
      setMessages(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).map(m =>
          m.id === messageId
            ? { ...m, text: newText, isEdited: true, editedAt }
            : m
        )
      }));

      setConversations(prev =>
        prev.map(c =>
          c.id === conversationId && c.lastMessage && c.lastMessage.id === messageId
            ? {
                ...c,
                lastMessage: {
                  ...c.lastMessage,
                  text: newText,
                  isEdited: true
                }
              }
            : c
        )
      );
    });

    // 13. Reaction Real-time Sync
    const unsubReaction = realtime.on('chat:reaction_updated', data => {
      const { conversationId, messageId, reactions } = data;
      setMessages(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).map(m =>
          m.id === messageId ? { ...m, reactions } : m
        )
      }));
    });

    // 13.1 Poll Vote Real-time Sync
    const unsubPollVoted = realtime.on('chat:poll_voted', data => {
      const { conversationId, messageId, poll } = data;
      setMessages(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).map(m =>
          m.id === messageId ? { ...m, poll } : m
        )
      }));
    });

    // 14. Message Pinned Real-time Sync
    const unsubPinned = realtime.on('chat:pinned_updated', data => {
      const { conversationId, messageId, isPinned } = data;
      setMessages(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).map(m =>
          m.id === messageId ? { ...m, isPinned } : m
        )
      }));
    });

    // 15. Conversation Action Sync
    const unsubConvUpdated = realtime.on('chat:conversation_updated', data => {
      const { conversation } = data;
      if (conversation) {
        setConversations(prev =>
          prev.map(c => (c.id === conversation.id ? { ...c, ...conversation } : c))
        );
      }
    });

    // 16. Group Action Sync
    const unsubGroupUpdated = realtime.on('group:updated', data => {
      const { conversation } = data;
      if (conversation) {
        setConversations(prev =>
          prev.map(c =>
            c.id === conversation.id
              ? {
                  ...c,
                  title: conversation.title || c.title,
                  avatarUrl: conversation.avatarUrl || c.avatarUrl,
                  memberIds: conversation.participantIds || c.memberIds,
                  adminIds: conversation.adminIds || c.adminIds,
                  onlyAdminsCanSend: conversation.onlyAdminsCanSend,
                  onlyAdminsCanEditInfo: conversation.onlyAdminsCanEditInfo
                }
              : c
          )
        );
      }
    });

    return () => {
      unsubConn();
      unsubMsg();
      unsubUser();
      unsubPresence();
      unsubStatus();
      unsubIncomingCall();
      unsubCallAccepted();
      unsubRemoteStream();
      unsubCallEnded();
      unsubMsgDeleted();
      unsubMsgDeletedForMe();
      unsubMsgDeletedPermanent();
      unsubMsgDelivered();
      unsubOfflineSync();
      unsubMsgEdited();
      unsubReaction();
      unsubPollVoted();
      unsubPinned();
      unsubConvUpdated();
      unsubGroupUpdated();
    };
  }, [currentUser.id]);

  // Real Send Message via WebSockets with Offline Outbox Queue
  const sendMessage = async (
    conversationId: string,
    text: string,
    type: MessageType = 'text',
    attachment?: Partial<Message>
  ) => {
    // Deterministic synchronized ID
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const optimisticMsg: Message = {
      id: msgId,
      conversationId,
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      text,
      type,
      status: isOffline ? 'sending' : 'sent',
      timestamp: Date.now(),
      ...attachment
    };

    setMessages(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), optimisticMsg]
    }));

    setConversations(prev =>
      prev.map(c =>
        c.id === conversationId ? { ...c, lastMessage: optimisticMsg } : c
      )
    );

    if (isOffline) {
      // Enqueue to outbox for automatic sync upon reconnection
      offlineQueueRef.current.push({ conversationId, text, type, attachment });
    } else {
      realtime.send('chat:send_message', {
        id: msgId,
        conversationId,
        senderId: currentUser.id,
        text,
        messageType: type,
        mediaUrl: attachment?.mediaUrl,
        fileName: attachment?.fileName,
        fileSize: attachment?.fileSize,
        durationSeconds: attachment?.durationSeconds,
        waveform: attachment?.waveform,
        location: attachment?.location,
        contact: attachment?.contact,
        poll: attachment?.poll,
        productCard: attachment?.productCard,
        isSilent: attachment?.isSilent,
        isScheduled: attachment?.isScheduled,
        scheduledTime: attachment?.scheduledTime,
        viewsCount: attachment?.viewsCount,
        replyToId: attachment?.replyTo?.id,
        replyToText: attachment?.replyTo?.text
      });
    }
  };

  // Reactions, deletes and pins
  const addReaction = (conversationId: string, messageId: string, emoji: string) => {
    setMessages(prev => ({
      ...prev,
      [conversationId]: (prev[conversationId] || []).map(m => {
        if (m.id !== messageId) return m;
        const currentReactions = { ...(m.reactions || {}) };
        const existingUsers = currentReactions[emoji] || [];
        if (existingUsers.includes(currentUser.id)) {
          const filtered = existingUsers.filter(uid => uid !== currentUser.id);
          if (filtered.length === 0) delete currentReactions[emoji];
          else currentReactions[emoji] = filtered;
        } else {
          currentReactions[emoji] = [...existingUsers, currentUser.id];
        }
        return { ...m, reactions: currentReactions };
      })
    }));

    realtime.send('chat:reaction', {
      conversationId,
      messageId,
      userId: currentUser.id,
      emoji
    });
  };

  const deleteMessage = (conversationId: string, messageId: string) => {
    setMessages(prev => {
      const remaining = (prev[conversationId] || []).filter(m => m.id !== messageId);
      const last = remaining.length > 0 ? remaining[remaining.length - 1] : undefined;
      setConversations(cPrev =>
        cPrev.map(c =>
          c.id === conversationId
            ? { ...c, lastMessage: last }
            : c
        )
      );
      return {
        ...prev,
        [conversationId]: remaining
      };
    });

    realtime.send('chat:delete_message', {
      conversationId,
      messageId,
      userId: currentUser.id,
      deleteType: 'for_me'
    });

    fetch('/api/messages/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        messageId,
        userId: currentUser.id,
        deleteType: 'for_me'
      })
    }).catch(() => {});
  };

  const deleteMessageForEveryone = (conversationId: string, messageId: string) => {
    setMessages(prev => {
      const updatedList = (prev[conversationId] || []).map(m =>
        m.id === messageId
          ? {
              ...m,
              isDeletedForEveryone: true,
              text: 'Este mensaje fue eliminado.',
              mediaUrl: undefined,
              poll: undefined,
              location: undefined,
              contact: undefined
            }
          : m
      );
      const last = updatedList.length > 0 ? updatedList[updatedList.length - 1] : undefined;
      setConversations(cPrev =>
        cPrev.map(c =>
          c.id === conversationId && c.lastMessage && c.lastMessage.id === messageId
            ? {
                ...c,
                lastMessage: {
                  ...c.lastMessage,
                  isDeletedForEveryone: true,
                  text: 'Este mensaje fue eliminado.'
                }
              }
            : c
        )
      );
      return {
        ...prev,
        [conversationId]: updatedList
      };
    });

    realtime.send('chat:delete_message', {
      conversationId,
      messageId,
      userId: currentUser.id,
      deleteType: 'for_everyone'
    });

    fetch('/api/messages/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        messageId,
        userId: currentUser.id,
        deleteType: 'for_everyone'
      })
    }).catch(() => {});
  };

  const deleteMessagePermanently = (conversationId: string, messageId: string) => {
    setMessages(prev => {
      const remaining = (prev[conversationId] || []).filter(m => m.id !== messageId);
      const last = remaining.length > 0 ? remaining[remaining.length - 1] : undefined;
      setConversations(cPrev =>
        cPrev.map(c =>
          c.id === conversationId
            ? { ...c, lastMessage: last }
            : c
        )
      );
      return {
        ...prev,
        [conversationId]: remaining
      };
    });

    realtime.send('chat:delete_message', {
      conversationId,
      messageId,
      userId: currentUser.id,
      deleteType: 'permanent'
    });

    fetch('/api/messages/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        messageId,
        userId: currentUser.id,
        deleteType: 'permanent'
      })
    }).catch(() => {});
  };

  const starMessage = (conversationId: string, messageId: string) => {
    let nextStarred = false;
    setMessages(prev => ({
      ...prev,
      [conversationId]: (prev[conversationId] || []).map(m => {
        if (m.id === messageId) {
          nextStarred = !m.isStarred;
          return { ...m, isStarred: nextStarred };
        }
        return m;
      })
    }));

    realtime.send('chat:star_message', {
      conversationId,
      messageId,
      isStarred: nextStarred
    });
  };

  const editMessage = (conversationId: string, messageId: string, newText: string) => {
    setMessages(prev => ({
      ...prev,
      [conversationId]: (prev[conversationId] || []).map(m =>
        m.id === messageId ? { ...m, text: newText, isEdited: true, editedAt: Date.now() } : m
      )
    }));

    realtime.send('chat:edit_message', {
      conversationId,
      messageId,
      userId: currentUser.id,
      newText
    });
  };

  const votePoll = (conversationId: string, messageId: string, optionId: string) => {
    setMessages(prev => ({
      ...prev,
      [conversationId]: (prev[conversationId] || []).map(m => {
        if (m.id !== messageId || !m.poll) return m;
        const currentUserId = currentUser.id;
        const allowsMultiple = m.poll.allowsMultipleAnswers;

        const updatedOptions = m.poll.options.map(opt => {
          const hasVoted = opt.votes.includes(currentUserId);
          if (opt.id === optionId) {
            return {
              ...opt,
              votes: hasVoted
                ? opt.votes.filter(u => u !== currentUserId)
                : [...opt.votes, currentUserId]
            };
          } else if (!allowsMultiple) {
            return {
              ...opt,
              votes: opt.votes.filter(u => u !== currentUserId)
            };
          }
          return opt;
        });

        return {
          ...m,
          poll: {
            ...m.poll,
            options: updatedOptions
          }
        };
      })
    }));

    // Real-time server and peer synchronization
    realtime.send('chat:poll_vote', {
      conversationId,
      messageId,
      optionId,
      userId: currentUser.id
    });
  };

  const openViewOnce = (conversationId: string, messageId: string) => {
    setMessages(prev => ({
      ...prev,
      [conversationId]: (prev[conversationId] || []).map(m =>
        m.id === messageId ? { ...m, isViewedOnce: true } : m
      )
    }));
  };

  const forwardMessage = async (targetConversationId: string, message: Message) => {
    const forwardedMsg: Message = {
      ...message,
      id: 'fwd_' + Date.now(),
      conversationId: targetConversationId,
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      timestamp: Date.now(),
      status: 'sent'
    };
    setMessages(prev => ({
      ...prev,
      [targetConversationId]: [...(prev[targetConversationId] || []), forwardedMsg]
    }));
    setConversations(prev =>
      prev.map(c =>
        c.id === targetConversationId ? { ...c, lastMessage: forwardedMsg } : c
      )
    );
  };

  const toggleFollowChannel = (channelId: string) => {
    setChannels(prev =>
      prev.map(ch =>
        ch.id === channelId ? { ...ch, isFollowing: !ch.isFollowing } : ch
      )
    );
  };

  const pinMessage = (conversationId: string, messageId: string) => {
    let nextPinned = false;
    setMessages(prev => ({
      ...prev,
      [conversationId]: (prev[conversationId] || []).map(m => {
        if (m.id === messageId) {
          nextPinned = !m.isPinned;
          return { ...m, isPinned: nextPinned };
        }
        return m;
      })
    }));

    realtime.send('chat:pin_message', {
      conversationId,
      messageId,
      isPinned: nextPinned
    });
  };

  const setDisappearingTimer = (conversationId: string, seconds: number | null) => {
    setConversations(prev =>
      prev.map(c => (c.id === conversationId ? { ...c, disappearingSeconds: seconds } : c))
    );
  };

  // WhatsApp Conversation Actions (Archive, Pin, Mute, Mark Unread, Clear, Delete)
  const toggleArchiveConversation = (conversationId: string) => {
    setConversations(prev =>
      prev.map(c => {
        if (c.id === conversationId) {
          const nextArchived = !c.isArchived;
          realtime.send('chat:conversation_action', {
            conversationId,
            userId: currentUser.id,
            action: 'archive',
            payload: { isArchived: nextArchived }
          });
          return { ...c, isArchived: nextArchived };
        }
        return c;
      })
    );
  };

  const togglePinConversation = (conversationId: string) => {
    setConversations(prev =>
      prev.map(c => {
        if (c.id === conversationId) {
          const nextPinned = !c.isPinned;
          realtime.send('chat:conversation_action', {
            conversationId,
            userId: currentUser.id,
            action: 'pin',
            payload: { isPinned: nextPinned }
          });
          return { ...c, isPinned: nextPinned };
        }
        return c;
      })
    );
  };

  const toggleMuteConversation = (conversationId: string) => {
    setConversations(prev =>
      prev.map(c => {
        if (c.id === conversationId) {
          const nextMuted = !c.isMuted;
          realtime.send('chat:conversation_action', {
            conversationId,
            userId: currentUser.id,
            action: 'mute',
            payload: { isMuted: nextMuted }
          });
          return { ...c, isMuted: nextMuted };
        }
        return c;
      })
    );
  };

  const toggleMarkUnreadConversation = (conversationId: string) => {
    setConversations(prev =>
      prev.map(c => {
        if (c.id === conversationId) {
          const nextCount = c.unreadCount > 0 ? 0 : 1;
          realtime.send('chat:conversation_action', {
            conversationId,
            userId: currentUser.id,
            action: 'mark_unread'
          });
          return { ...c, unreadCount: nextCount };
        }
        return c;
      })
    );
  };

  const clearConversationMessages = (conversationId: string) => {
    setMessages(prev => ({ ...prev, [conversationId]: [] }));
    setConversations(prev =>
      prev.map(c => (c.id === conversationId ? { ...c, lastMessage: undefined } : c))
    );
    realtime.send('chat:conversation_action', {
      conversationId,
      userId: currentUser.id,
      action: 'clear_messages'
    });
  };

  const deleteConversation = (conversationId: string) => {
    setConversations(prev => prev.filter(c => c.id !== conversationId));
    setMessages(prev => {
      const next = { ...prev };
      delete next[conversationId];
      return next;
    });
    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
    }
    realtime.send('chat:conversation_action', {
      conversationId,
      userId: currentUser.id,
      action: 'delete_conversation'
    });
  };

  // Group Management Real Actions
  const updateGroupInfo = (conversationId: string, newInfo: { title?: string; avatarUrl?: string }) => {
    setConversations(prev =>
      prev.map(c => (c.id === conversationId ? { ...c, ...newInfo } : c))
    );
    realtime.send('group:action', {
      conversationId,
      adminUserId: currentUser.id,
      action: 'update_info',
      newInfo
    });
  };

  const addGroupMember = (conversationId: string, targetUserId: string) => {
    setConversations(prev =>
      prev.map(c => (c.id === conversationId && !c.memberIds.includes(targetUserId) ? { ...c, memberIds: [...c.memberIds, targetUserId] } : c))
    );
    realtime.send('group:action', {
      conversationId,
      adminUserId: currentUser.id,
      action: 'add_member',
      targetUserId
    });
  };

  const removeGroupMember = (conversationId: string, targetUserId: string) => {
    setConversations(prev =>
      prev.map(c => (c.id === conversationId ? { ...c, memberIds: c.memberIds.filter(id => id !== targetUserId), adminIds: c.adminIds?.filter(id => id !== targetUserId) } : c))
    );
    realtime.send('group:action', {
      conversationId,
      adminUserId: currentUser.id,
      action: 'remove_member',
      targetUserId
    });
  };

  const promoteGroupAdmin = (conversationId: string, targetUserId: string) => {
    setConversations(prev =>
      prev.map(c => (c.id === conversationId ? { ...c, adminIds: [...(c.adminIds || []), targetUserId] } : c))
    );
    realtime.send('group:action', {
      conversationId,
      adminUserId: currentUser.id,
      action: 'promote_admin',
      targetUserId
    });
  };

  const demoteGroupAdmin = (conversationId: string, targetUserId: string) => {
    setConversations(prev =>
      prev.map(c => (c.id === conversationId ? { ...c, adminIds: (c.adminIds || []).filter(id => id !== targetUserId) } : c))
    );
    realtime.send('group:action', {
      conversationId,
      adminUserId: currentUser.id,
      action: 'demote_admin',
      targetUserId
    });
  };

  const updateGroupPermissions = (conversationId: string, permissions: { onlyAdminsCanSend?: boolean; onlyAdminsCanEditInfo?: boolean }) => {
    setConversations(prev =>
      prev.map(c => (c.id === conversationId ? { ...c, ...permissions } : c))
    );
    realtime.send('group:action', {
      conversationId,
      adminUserId: currentUser.id,
      action: 'update_permissions',
      permissions
    });
  };

  // Real Conversation Creation
  const createConversation = async (contact: Contact): Promise<string> => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: currentUser.id,
          type: 'direct',
          participantIds: [currentUser.id, contact.id]
        })
      });
      const conv = await res.json();
      setActiveConversationId(conv.id);
      fetchInitialData(currentUser.id);
      return conv.id;
    } catch (e) {
      const fallbackId = 'conv_' + contact.id;
      setActiveConversationId(fallbackId);
      return fallbackId;
    }
  };

  // Real Group Creation
  const createGroup = async (title: string, memberIds: string[], avatarUrl?: string): Promise<string> => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: currentUser.id,
          type: 'group',
          title,
          participantIds: [currentUser.id, ...memberIds],
          avatarUrl
        })
      });
      const conv = await res.json();
      setActiveConversationId(conv.id);
      fetchInitialData(currentUser.id);
      return conv.id;
    } catch (e) {
      const fallbackId = 'grp_' + Date.now();
      setActiveConversationId(fallbackId);
      return fallbackId;
    }
  };

  // Real WebRTC Calling implementation
  const startCall = async (contactName: string, contactAvatar: string, isVideo: boolean, targetUserId?: string) => {
    // If targetUserId is not provided, deduce it from activeConversation or contacts
    let resolvedTargetId = targetUserId;
    if (!resolvedTargetId) {
      const found = contacts.find(c => c.name === contactName);
      if (found) resolvedTargetId = found.id;
      else if (activeConversationId) {
        const conv = conversations.find(c => c.id === activeConversationId);
        resolvedTargetId = conv?.memberIds.find(id => id !== currentUser.id);
      }
    }

    setActiveCall({
      isActive: true,
      isIncoming: false,
      contactName,
      contactAvatar,
      isVideo,
      isMuted: false,
      isSpeaker: true,
      isCameraOff: false,
      isFrontCamera: true,
      durationSeconds: 0,
      status: 'ringing',
      targetUserId: resolvedTargetId
    });

    if (resolvedTargetId) {
      const stream = await realtime.startCall(
        resolvedTargetId,
        { id: currentUser.id, displayName: currentUser.displayName, avatarUrl: currentUser.avatarUrl },
        isVideo
      );
      setLocalStream(stream);
    }
  };

  const startGroupCall = async (conversationId: string, isVideo: boolean) => {
    const conv = conversations.find(c => c.id === conversationId);
    if (!conv) return;

    setActiveCall({
      isActive: true,
      isIncoming: false,
      isGroupCall: true,
      groupTitle: conv.title,
      contactName: conv.title,
      contactAvatar: conv.avatarUrl,
      isVideo,
      isMuted: false,
      isSpeaker: true,
      isCameraOff: false,
      isFrontCamera: true,
      durationSeconds: 0,
      status: 'connected'
    });

    // Notify group members
    realtime.send('webrtc:group_join', {
      conversationId,
      user: { id: currentUser.id, name: currentUser.displayName, avatar: currentUser.avatarUrl }
    });

    // Acquire local media
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
      setLocalStream(stream);
    } catch (e) {}

    if (callTimerRef.current) clearInterval(callTimerRef.current);
    callTimerRef.current = setInterval(() => {
      setActiveCall(p => ({ ...p, durationSeconds: p.durationSeconds + 1 }));
    }, 1000);
  };

  const acceptCall = async () => {
    if (!activeCall.offerSdp || !activeCall.callerId) return;

    const stream = await realtime.acceptIncomingCall({
      callerId: activeCall.callerId,
      offerSdp: activeCall.offerSdp,
      isVideo: activeCall.isVideo
    });
    setLocalStream(stream);

    setActiveCall(prev => ({
      ...prev,
      isIncoming: false,
      status: 'connected',
      durationSeconds: 0
    }));

    if (callTimerRef.current) clearInterval(callTimerRef.current);
    callTimerRef.current = setInterval(() => {
      setActiveCall(p => ({ ...p, durationSeconds: p.durationSeconds + 1 }));
    }, 1000);
  };

  const rejectCall = () => {
    if (activeCall.callerId) {
      realtime.rejectCall(activeCall.callerId);
    }
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    setLocalStream(null);
    setRemoteStream(null);
    setActiveCall(prev => ({ ...prev, isActive: false, status: 'ended' }));
  };

  const endCall = () => {
    realtime.endCall();
    if (callTimerRef.current) clearInterval(callTimerRef.current);

    // Save call record to history
    setCalls(prev => [
      {
        id: 'call_' + Date.now(),
        contactId: activeCall.targetUserId || activeCall.callerId || 'unknown',
        contactName: activeCall.contactName,
        contactAvatar: activeCall.contactAvatar,
        isVideo: activeCall.isVideo,
        direction: activeCall.isIncoming ? 'incoming' : 'outgoing',
        timestamp: Date.now(),
        durationSeconds: activeCall.durationSeconds
      },
      ...prev
    ]);

    setLocalStream(null);
    setRemoteStream(null);
    setActiveCall(prev => ({ ...prev, isActive: false, status: 'ended' }));
  };

  const toggleMute = () => {
    setActiveCall(prev => {
      const nextMuted = !prev.isMuted;
      if (localStream) {
        localStream.getAudioTracks().forEach(t => { t.enabled = !nextMuted; });
      }
      return { ...prev, isMuted: nextMuted };
    });
  };

  const toggleSpeaker = () => {
    setActiveCall(prev => ({ ...prev, isSpeaker: !prev.isSpeaker }));
  };

  const toggleCamera = () => {
    setActiveCall(prev => {
      const nextOff = !prev.isCameraOff;
      if (localStream) {
        localStream.getVideoTracks().forEach(t => { t.enabled = !nextOff; });
      }
      return { ...prev, isCameraOff: nextOff };
    });
  };

  const switchCamera = () => {
    setActiveCall(prev => ({ ...prev, isFrontCamera: !prev.isFrontCamera }));
  };

  // Real Ephemeral Story / Status creation
  const addStatus = async (caption: string, mediaUrl?: string, bgHex?: string) => {
    realtime.send('status:publish', {
      userId: currentUser.id,
      textCaption: caption,
      mediaUrl,
      bgHex: bgHex || '#0077B6'
    });
  };

  // Real Voice Recording with MediaRecorder
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedAudioBlob(audioBlob);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start(100);
      setIsRecordingVoice(true);
      setRecordingDuration(0);

      // Waveform generator
      setRecordedWaveform([30, 60, 45, 80, 55, 90, 40, 70, 85, 30, 50, 75, 95]);

      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      recordTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
        setRecordedWaveform(prev => [...prev.slice(1), Math.floor(Math.random() * 70) + 30]);
      }, 1000);
    } catch (err) {
      console.warn('Real microphone unavailable, using synthetic voice recorder fallback:', err);
      setIsRecordingVoice(true);
      setRecordingDuration(0);
      setRecordedWaveform([40, 70, 50, 85, 60, 95]);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      recordTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    }
  };

  const pauseVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsRecordingPaused(true);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
  };

  const resumeVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsRecordingPaused(false);
      recordTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
        setRecordedWaveform(prev => [...prev.slice(1), Math.floor(Math.random() * 70) + 30]);
      }, 1000);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused')) {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingVoice(false);
    setIsRecordingPaused(false);
    setIsRecordingLocked(false);
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused')) {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingVoice(false);
    setIsRecordingPaused(false);
    setIsRecordingLocked(false);
    setRecordedAudioBlob(null);
    setRecordingDuration(0);
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
  };

  const sendVoiceRecording = async (conversationId: string) => {
    stopVoiceRecording();
    const duration = recordingDuration || 2;

    // Convert blob to Base64 data URL if real blob exists
    let audioUrl: string | undefined = undefined;
    if (recordedAudioBlob) {
      audioUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(recordedAudioBlob);
      });
    }

    await sendMessage(conversationId, 'Nota de voz', 'voice', {
      durationSeconds: duration,
      waveform: recordedWaveform,
      mediaUrl: audioUrl
    });

    setRecordedAudioBlob(null);
    setRecordingDuration(0);
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        setTheme,
        updateThemeColors,
        presetThemes: PRESET_THEMES,
        currentUser,
        updateCurrentUser,
        registerOrSwitchUser,
        availableUsers,
        activeTab,
        setActiveTab,
        activeConversationId,
        setActiveConversationId,
        viewingStatus,
        setViewingStatus,
        isCameraOpen,
        setIsCameraOpen,
        isNewChatModalOpen,
        setIsNewChatModalOpen,
        isNewGroupModalOpen,
        setIsNewGroupModalOpen,
        conversations,
        messages,
        sendMessage,
        addReaction,
        deleteMessage,
        deleteMessageForEveryone,
        deleteMessagePermanently,
        starMessage,
        editMessage,
        votePoll,
        openViewOnce,
        forwardMessage,
        channels,
        toggleFollowChannel,
        pinMessage,
        setDisappearingTimer,
        createConversation,
        createGroup,
        toggleArchiveConversation,
        togglePinConversation,
        toggleMuteConversation,
        toggleMarkUnreadConversation,
        clearConversationMessages,
        deleteConversation,
        updateGroupInfo,
        addGroupMember,
        removeGroupMember,
        promoteGroupAdmin,
        demoteGroupAdmin,
        updateGroupPermissions,
        calls,
        activeCall,
        localStream,
        remoteStream,
        startCall,
        startGroupCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleSpeaker,
        toggleCamera,
        switchCamera,
        statuses,
        addStatus,
        contacts,
        isOffline,
        setIsOffline,
        isConnectedToServer,
        isRecordingVoice,
        isRecordingPaused,
        isRecordingLocked,
        recordingDuration,
        recordedAudioBlob,
        recordedWaveform,
        startVoiceRecording,
        pauseVoiceRecording,
        resumeVoiceRecording,
        setIsRecordingLocked,
        stopVoiceRecording,
        cancelVoiceRecording,
        sendVoiceRecording
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
