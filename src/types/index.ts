export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeConfig {
  id: string;
  name: string;
  mode: ThemeMode;
  primaryColor: string;
  secondaryColor: string;
  bubbleSent: string;
  bubbleReceivedDark: string;
  bubbleReceivedLight: string;
  bgDark: string;
  bgLight: string;
  surfaceDark: string;
  surfaceLight: string;
  oledBlack: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

export interface UserPrivacySettings {
  lastSeenVisibility: 'everyone' | 'contacts' | 'nobody';
  profilePhotoVisibility: 'everyone' | 'contacts' | 'nobody';
  readReceiptsEnabled: boolean;
  statusVisibility: 'everyone' | 'contacts' | 'nobody';
  disappearingDefaultSeconds: number;
}

export interface User {
  id: string;
  phoneNumber: string;
  displayName: string;
  username: string;
  bio: string;
  avatarUrl: string;
  isOnline: boolean;
  lastSeen: string;
  fingerprint: string;
  hasPassword?: boolean;
  hasPin?: boolean;
  blockedUserIds?: string[];
  privacy?: UserPrivacySettings;
}

export type MessageType = 'text' | 'image' | 'video' | 'voice' | 'file' | 'location' | 'contact' | 'poll';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // user IDs who voted
}

export interface PollData {
  question: string;
  options: PollOption[];
  allowsMultipleAnswers?: boolean;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface ReplyToInfo {
  id: string;
  senderName: string;
  text: string;
  type: MessageType;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  type: MessageType;
  status: MessageStatus;
  timestamp: number;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string;
  durationSeconds?: number;
  waveform?: number[];
  location?: { lat: number; lng: number; label: string; address?: string };
  contact?: { name: string; phone: string; organization?: string };
  poll?: PollData;
  replyTo?: ReplyToInfo;
  isPinned?: boolean;
  isEdited?: boolean;
  editedAt?: number;
  isStarred?: boolean;
  isViewOnce?: boolean;
  isViewedOnce?: boolean;
  isDeletedForEveryone?: boolean;
  deletedForUserIds?: string[];
  reactions?: Record<string, string[]>; // emoji -> [userIds]
  disappearingSeconds?: number | null;
  // WhatsApp Business & Telegram features
  productCard?: {
    id: string;
    title: string;
    price: string;
    description: string;
    imageUrl: string;
  };
  isSilent?: boolean; // Telegram Send Without Sound
  isScheduled?: boolean; // Telegram Scheduled Message
  scheduledTime?: number;
  viewsCount?: number; // Telegram Views Count
  translatedText?: string; // Telegram Inline Translation
}

export type ChatLabelType = 'new_customer' | 'pending_payment' | 'paid' | 'completed' | 'vip' | 'lead';

export interface ChatLabel {
  id: ChatLabelType;
  name: string;
  color: string;
  bgHex: string;
}

export interface BusinessProduct {
  id: string;
  title: string;
  price: string;
  description: string;
  imageUrl: string;
  category: string;
  inStock: boolean;
}

export interface BusinessProfile {
  name: string;
  category: string;
  description: string;
  hours: string;
  email: string;
  website: string;
  address: string;
  isVerified: boolean;
  catalog: BusinessProduct[];
}

export interface QuickReply {
  shortcut: string;
  title: string;
  text: string;
}

export interface ChannelItem {
  id: string;
  name: string;
  avatarUrl: string;
  description: string;
  followersCount: string;
  isVerified: boolean;
  isFollowing: boolean;
  lastUpdate: {
    text: string;
    mediaUrl?: string;
    timestamp: number;
  };
}

export interface Conversation {
  id: string;
  title: string;
  isGroup: boolean;
  avatarUrl: string;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  isArchived?: boolean;
  disappearingSeconds?: number | null; // 86400 (24h), 604800 (7d), 2592000 (30d)
  memberIds: string[];
  lastMessage?: Message;
  isTyping?: boolean;
  description?: string;
  adminIds?: string[];
  onlyAdminsCanSend?: boolean;
  onlyAdminsCanEditInfo?: boolean;
  inviteCode?: string;
  // WhatsApp Business & Telegram features
  isBusiness?: boolean;
  isVerifiedBusiness?: boolean;
  businessCategory?: string;
  businessProfile?: BusinessProfile;
  label?: ChatLabelType;
  isSavedMessages?: boolean; // Telegram Saved Messages
  isChannel?: boolean; // Telegram Broadcast Channel
  channelSubscribers?: string;
  viewsCount?: number;
}

export interface CallRecord {
  id: string;
  contactId: string;
  contactName: string;
  contactAvatar: string;
  isVideo: boolean;
  direction: 'incoming' | 'outgoing' | 'missed';
  timestamp: number;
  durationSeconds: number;
}

export interface StatusView {
  viewerId: string;
  viewerName: string;
  viewerAvatar?: string;
  viewedAt: number;
}

export interface EphemeralStatus {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  mediaUrl?: string;
  textCaption?: string;
  bgHex?: string;
  privacy?: 'everyone' | 'contacts' | 'nobody';
  views?: StatusView[];
  reactions?: Record<string, string>;
  timestamp: number;
  expiresAt: number;
  isViewed: boolean;
}

export interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  avatarUrl: string;
  bio: string;
  isRegistered: boolean;
}

export interface ActiveCallState {
  isActive: boolean;
  contactName: string;
  contactAvatar: string;
  isVideo: boolean;
  isMuted: boolean;
  isSpeaker: boolean;
  isCameraOff: boolean;
  isFrontCamera: boolean;
  durationSeconds: number;
  status: 'connecting' | 'ringing' | 'connected' | 'ended';
  iceState?: 'new' | 'checking' | 'connected' | 'completed' | 'failed' | 'disconnected' | 'closed' | string;
  isIncoming?: boolean;
  callerId?: string;
  targetUserId?: string;
  offerSdp?: any;
  isGroupCall?: boolean;
  groupTitle?: string;
  groupMembers?: { id: string; name: string; avatar: string }[];
  errorMessage?: string;
}

export interface LiveComment {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  type: 'chat' | 'system' | 'gift';
  timestamp: number;
}

export interface LiveGift {
  id: string;
  name: string;
  emoji: string;
  coins: number;
  animation?: 'pulse' | 'float' | 'burst' | 'supernova';
}

export interface LiveCoHost {
  userId: string;
  userName: string;
  userAvatar: string;
  isMuted: boolean;
  isVideoPaused: boolean;
  joinedAt: number;
}

export interface LiveGuestRequest {
  userId: string;
  userName: string;
  userAvatar: string;
  requestedAt: number;
}

export interface LiveBattle {
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
}

export interface LiveModerationLog {
  id: string;
  roomId: string;
  actorId: string;
  actorName: string;
  action: 'assign_mod' | 'remove_mod' | 'mute_viewer' | 'ban_viewer' | 'delete_comment' | 'update_banned_words' | 'kick_cohost';
  targetId?: string;
  details?: string;
  createdAt: number;
}

export interface LiveHistoryItem {
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
}

export interface LiveRtcConfig {
  mode: 'livekit_sfu' | 'webrtc_mesh_relay';
  livekitConfigured: boolean;
  livekitUrl?: string;
  livekitToken?: string;
  iceServers: RTCIceServer[];
  turnConfigured: boolean;
}

export interface LiveStreamRoom {
  id: string;
  hostId: string;
  hostName: string;
  hostUsername: string;
  hostAvatar: string;
  title: string;
  description?: string;
  category: string;
  coverUrl?: string;
  sourceMode: 'camera' | 'screen' | 'studio';
  joinPolicy?: 'everyone' | 'followers' | 'invite_only';
  commentsEnabled?: boolean;
  qualityPreset?: 'auto' | '720p' | '480p' | '360p';
  bannedWords?: string[];
  startedAt: number;
  viewerCount: number;
  peakViewers: number;
  likesCount: number;
  giftsCount: number;
  earnedCoins?: number;
  followersCount: number;
  isAudioMuted: boolean;
  isVideoPaused: boolean;
  pinnedComment?: { id: string; userName: string; text: string } | null;
  lastFrame?: string;
  comments?: LiveComment[];
  coHosts?: LiveCoHost[];
  guestRequests?: LiveGuestRequest[];
  moderators?: string[];
  activeBattle?: LiveBattle | null;
}

export interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  bonusCoins: number;
  priceCents: number;
  currency: 'USD';
  badge?: string;
}

export interface WalletAccount {
  userId: string;
  coinsBalance: number;
  creatorDiamonds: number;
  pendingPayoutCents: number;
  kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  kycFullName?: string;
  kycCountry?: string;
  kycSubmittedAt?: number;
  updatedAt: number;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'coin_purchase' | 'gift_sent' | 'gift_received' | 'payout_requested' | 'payout_completed' | 'bonus' | 'refund';
  amountCoins: number;
  amountDiamonds: number;
  amountCents: number;
  feeCents: number;
  currency: string;
  balanceAfterCoins: number;
  referenceId?: string;
  status: 'pending' | 'completed' | 'failed' | 'rejected';
  description: string;
  signatureVerified: boolean;
  createdAt: number;
}

export interface PayoutRequest {
  id: string;
  userId: string;
  amountDiamonds: number;
  grossCents: number;
  platformFeeCents: number;
  netCents: number;
  payoutMethod: 'bank_transfer' | 'stripe_connect' | 'paypal';
  destinationMasked: string;
  status: 'pending_kyc' | 'queued_compliance' | 'approved' | 'paid' | 'rejected';
  kycVerified: boolean;
  createdAt: number;
}


