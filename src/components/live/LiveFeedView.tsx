import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Radio,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Heart,
  Gift,
  Share2,
  Eye,
  Users,
  Plus,
  Send,
  X,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize2,
  RefreshCw,
  Monitor,
  Palette,
  Volume2,
  VolumeX,
  Pin,
  LayoutGrid,
  ArrowLeft,
  Check,
  Copy,
  Swords,
  Shield,
  Flag,
  Search,
  Trophy,
  History,
  UserPlus,
  UserMinus,
  Trash2,
  AlertTriangle,
  Wallet,
  Coins
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  LiveBattle,
  LiveComment,
  LiveGift,
  LiveHistoryItem,
  LiveModerationLog,
  LiveStreamRoom
} from '../../types';
import {
  liveService,
  startLiveAudioCapture,
  LiveAudioPlayer,
  LiveCoHostRtcManager
} from '../../services/liveService';

interface FloatingReaction {
  id: string;
  emoji: string;
  x: number;
  y: number;
}

interface GiftAnimationBanner {
  id: string;
  userName: string;
  giftName: string;
  giftEmoji: string;
  quantity: number;
  coins: number;
  animation: 'pulse' | 'float' | 'burst' | 'supernova';
}

const LIVE_CATEGORIES = ['General', 'Charla', 'Música', 'Gaming', 'Negocios', 'Tecnología', 'Educación'];

const FALLBACK_GIFTS: LiveGift[] = [
  { id: 'gift_rose', name: 'Rosa', emoji: '🌹', coins: 1, animation: 'float' },
  { id: 'gift_fire', name: 'Fuego', emoji: '🔥', coins: 5, animation: 'pulse' },
  { id: 'gift_star', name: 'Estrella', emoji: '⭐', coins: 10, animation: 'pulse' },
  { id: 'gift_diamond', name: 'Diamante', emoji: '💎', coins: 50, animation: 'burst' },
  { id: 'gift_crown', name: 'Corona', emoji: '👑', coins: 100, animation: 'supernova' }
];

type RoomWithModAliases = LiveStreamRoom & { moderatorIds?: string[] };

const QualityPresetConfig: Record<'auto' | '720p' | '480p' | '360p', { w: number; h: number; q: number; intervalMs: number }> = {
  auto: { w: 450, h: 800, q: 0.65, intervalMs: 75 },
  '720p': { w: 540, h: 960, q: 0.72, intervalMs: 70 },
  '480p': { w: 450, h: 800, q: 0.62, intervalMs: 80 },
  '360p': { w: 320, h: 568, q: 0.52, intervalMs: 100 }
};

interface LiveFeedViewProps {
  initialRoomId?: string;
  onCountChange?: (count: number) => void;
  onExitToChats?: () => void;
}

const RemoteCoHostMedia: React.FC<{ stream?: MediaStream }> = ({ stream }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);
  if (!stream) return null;
  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
};

export const LiveFeedView: React.FC<LiveFeedViewProps> = ({
  initialRoomId,
  onCountChange,
  onExitToChats
}) => {
  const { currentUser, conversations, sendMessage } = useApp();
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('nakeic_auth_token') : null;

  // Room discovery & selection state
  const [rooms, setRooms] = useState<RoomWithModAliases[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'feed' | 'explore' | 'setup' | 'broadcast' | 'ended'>('feed');
  const [exploreTab, setExploreTab] = useState<'recommended' | 'popular' | 'following' | 'categories' | 'history' | 'battles'>('recommended');
  const [exploreCategory, setExploreCategory] = useState<string>('Todas');
  const [exploreSearch, setExploreSearch] = useState<string>('');
  const [exploreRooms, setExploreRooms] = useState<RoomWithModAliases[]>([]);
  const [liveHistory, setLiveHistory] = useState<LiveHistoryItem[]>([]);
  const [battleLeaderboard, setBattleLeaderboard] = useState<Array<{ hostId: string; hostName: string; wins: number; totalScore: number }>>([]);
  const [recentBattles, setRecentBattles] = useState<LiveBattle[]>([]);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);

  // Active viewed stream real-time state + zero-black-screen crossfade buffer
  const [activeRoomSnapshot, setActiveRoomSnapshot] = useState<RoomWithModAliases | null>(null);
  const [liveFrameUrl, setLiveFrameUrl] = useState<string | null>(null);
  const [previousFrameUrl, setPreviousFrameUrl] = useState<string | null>(null);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [commentInput, setCommentInput] = useState<string>('');
  const [isFollowingHost, setIsFollowingHost] = useState<boolean>(false);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [activeGiftBanner, setActiveGiftBanner] = useState<GiftAnimationBanner | null>(null);
  const [roomAlert, setRoomAlert] = useState<{ text: string; actionLabel?: string; onAction?: () => void } | null>(null);

  // Gifts & Authoritative Wallet Balance
  const [giftCatalog, setGiftCatalog] = useState<LiveGift[]>(FALLBACK_GIFTS);
  const [giftQuantity, setGiftQuantity] = useState<1 | 5 | 10>(1);
  const [walletCoins, setWalletCoins] = useState<number | null>(null);
  const [showGiftSheet, setShowGiftSheet] = useState<boolean>(false);

  // Share Modal
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [sharedConvIds, setSharedConvIds] = useState<string[]>([]);

  // Audio playback state for viewer
  const [isViewerMuted, setIsViewerMuted] = useState<boolean>(false);
  const [audioNeedsUnlock, setAudioNeedsUnlock] = useState<boolean>(false);
  const audioPlayerRef = useRef<LiveAudioPlayer | null>(null);

  // Ended summary state
  const [endedSummary, setEndedSummary] = useState<{
    hostName: string;
    title: string;
    durationSeconds: number;
    peakViewers: number;
    likesCount: number;
    giftsCount: number;
    earnedCoins?: number;
    wasHost: boolean;
  } | null>(null);

  // Broadcaster Setup & Active Broadcast state
  const [streamTitle, setStreamTitle] = useState<string>('En vivo desde NAKEIC');
  const [streamDescription, setStreamDescription] = useState<string>('');
  const [streamCoverUrl, setStreamCoverUrl] = useState<string>('');
  const [streamCategory, setStreamCategory] = useState<string>('Charla');
  const [sourceMode, setSourceMode] = useState<'camera' | 'screen' | 'studio'>('camera');
  const [joinPolicy, setJoinPolicy] = useState<'everyone' | 'followers' | 'invite_only'>('everyone');
  const [commentsEnabled, setCommentsEnabled] = useState<boolean>(true);
  const [qualityPreset, setQualityPreset] = useState<'auto' | '720p' | '480p' | '360p'>('auto');
  const [bannedWordsInput, setBannedWordsInput] = useState<string>('');
  const [isFrontCamera, setIsFrontCamera] = useState<boolean>(true);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [isVideoPaused, setIsVideoPaused] = useState<boolean>(false);
  const [hardwareError, setHardwareError] = useState<string | null>(null);
  const [hostingRoom, setHostingRoom] = useState<RoomWithModAliases | null>(null);
  const [broadcastElapsed, setBroadcastElapsed] = useState<number>(0);
  const [studioBannerText, setStudioBannerText] = useState<string>('Transmitiendo En Vivo por NAKEIC');
  const [studioAccent, setStudioAccent] = useState<string>('#06B6D4');

  // Multi-Guest Co-Host state (up to 3 simultaneous co-hosts)
  const [coHostRemoteStreams, setCoHostRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [incomingGuestInvite, setIncomingGuestInvite] = useState<{ roomId: string; hostId: string; hostName: string; title: string } | null>(null);
  const [showGuestsModal, setShowGuestsModal] = useState<boolean>(false);
  const [guestRequested, setGuestRequested] = useState<boolean>(false);
  const coHostRtcRef = useRef<LiveCoHostRtcManager>(new LiveCoHostRtcManager());
  const coHostLocalStreamRef = useRef<MediaStream | null>(null);

  // PK Battle state
  const [showBattleChallengeModal, setShowBattleChallengeModal] = useState<boolean>(false);
  const [battleDurationSec, setBattleDurationSec] = useState<number>(180);
  const [incomingBattleInvite, setIncomingBattleInvite] = useState<LiveBattle | null>(null);
  const [battleCountdownSec, setBattleCountdownSec] = useState<number>(0);
  const [battleResultBanner, setBattleResultBanner] = useState<string | null>(null);

  // Moderation & Reporting state
  const [selectedModComment, setSelectedModComment] = useState<LiveComment | null>(null);
  const [showModDrawer, setShowModDrawer] = useState<boolean>(false);
  const [modLogs, setModLogs] = useState<LiveModerationLog[]>([]);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportReason, setReportReason] = useState<string>('Contenido inapropiado');
  const [reportDetails, setReportDetails] = useState<string>('');
  const [reportSubmittedMsg, setReportSubmittedMsg] = useState<string | null>(null);

  // Refs for streaming media
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const studioCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const broadcastStreamRef = useRef<MediaStream | null>(null);
  const frameTimerRef = useRef<any>(null);
  const audioCleanupRef = useRef<(() => void) | null>(null);
  const isMicMutedRef = useRef<boolean>(false);
  const isVideoPausedRef = useRef<boolean>(false);
  const joinedRoomIdRef = useRef<string | null>(null);
  const hostingRoomIdRef = useRef<string | null>(null);
  const activeRoomSnapshotRef = useRef<RoomWithModAliases | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const commentsEndRef = useRef<HTMLDivElement | null>(null);
  const initialRoomAppliedRef = useRef<string | null>(null);

  useEffect(() => {
    isMicMutedRef.current = isMicMuted;
  }, [isMicMuted]);

  useEffect(() => {
    isVideoPausedRef.current = isVideoPaused;
  }, [isVideoPaused]);

  useEffect(() => {
    hostingRoomIdRef.current = hostingRoom?.id || null;
  }, [hostingRoom]);

  useEffect(() => {
    activeRoomSnapshotRef.current = activeRoomSnapshot;
  }, [activeRoomSnapshot]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  const showTimedAlert = useCallback((text: string, actionLabel?: string, onAction?: () => void) => {
    setRoomAlert({ text, actionLabel, onAction });
    setTimeout(() => {
      setRoomAlert(prev => (prev?.text === text ? null : prev));
    }, 5500);
  }, []);

  const spawnFloatingReaction = useCallback((emoji: string, customX?: number, customY?: number) => {
    const id = `react_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const x = customX ?? 72 + Math.random() * 20;
    const y = customY ?? 55 + Math.random() * 20;
    setFloatingReactions(prev => [...prev.slice(-18), { id, emoji, x, y }]);
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== id));
    }, 1400);
  }, []);

  // Load authoritative Gift Catalog & Wallet Balance
  const refreshWalletAndGifts = useCallback(() => {
    fetch('/api/wallet/gifts')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (Array.isArray(d?.gifts) && d.gifts.length > 0) {
          setGiftCatalog(d.gifts);
        }
      })
      .catch(() => {});

    const tk = localStorage.getItem('nakeic_auth_token');
    if (tk) {
      fetch('/api/wallet/balance', {
        headers: { Authorization: `Bearer ${tk}` }
      })
        .then(r => (r.ok ? r.json() : null))
        .then(d => {
          if (typeof d?.wallet?.coinsBalance === 'number') {
            setWalletCoins(d.wallet.coinsBalance);
          }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    refreshWalletAndGifts();
  }, [refreshWalletAndGifts]);

  // Load Explore discovery data
  const refreshExploreData = useCallback(() => {
    if (viewMode !== 'explore') return;
    if (exploreTab === 'history') {
      fetch('/api/live/history')
        .then(r => (r.ok ? r.json() : null))
        .then(d => {
          if (Array.isArray(d?.history)) setLiveHistory(d.history);
        })
        .catch(() => {});
      return;
    }
    if (exploreTab === 'battles') {
      fetch('/api/live/battles/leaderboard')
        .then(r => (r.ok ? r.json() : null))
        .then(d => {
          if (Array.isArray(d?.leaderboard)) setBattleLeaderboard(d.leaderboard);
          if (Array.isArray(d?.recentBattles)) setRecentBattles(d.recentBattles);
        })
        .catch(() => {});
      return;
    }

    const params = new URLSearchParams();
    if (exploreTab === 'popular' || exploreTab === 'following') {
      params.set('tab', exploreTab);
    } else {
      params.set('tab', 'recommended');
    }
    if (exploreCategory !== 'Todas') params.set('category', exploreCategory);
    if (exploreSearch.trim()) params.set('q', exploreSearch.trim());
    params.set('userId', currentUser.id);

    fetch(`/api/live/rooms?${params.toString()}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (Array.isArray(d?.rooms)) {
          setExploreRooms(d.rooms);
        }
      })
      .catch(() => {});
  }, [viewMode, exploreTab, exploreCategory, exploreSearch, currentUser.id]);

  useEffect(() => {
    refreshExploreData();
  }, [refreshExploreData]);

  // Countdown tick for active PK Battle
  const activeBattleObj = viewMode === 'broadcast'
    ? hostingRoom?.activeBattle || null
    : activeRoomSnapshot?.activeBattle || null;

  useEffect(() => {
    if (!activeBattleObj || activeBattleObj.status !== 'active') {
      setBattleCountdownSec(0);
      return;
    }
    const updateTick = () => {
      const rem = Math.max(0, Math.ceil((activeBattleObj.endsAt - Date.now()) / 1000));
      setBattleCountdownSec(rem);
    };
    updateTick();
    const timer = setInterval(updateTick, 1000);
    return () => clearInterval(timer);
  }, [activeBattleObj]);

  // Connect to /ws/live and subscribe to all live stream, battle, co-host & moderation events
  useEffect(() => {
    const tk = localStorage.getItem('nakeic_auth_token');
    liveService.connect({
      token: tk,
      userId: currentUser.id,
      userName: currentUser.displayName,
      userAvatar: currentUser.avatarUrl
    });
    audioPlayerRef.current = new LiveAudioPlayer();

    fetch('/api/live/rooms')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data?.rooms) {
          setRooms(data.rooms);
          onCountChange?.(data.rooms.length);
        }
      })
      .catch(() => {});

    const unsubConn = liveService.on('live:connection', (d) => {
      setIsWsConnected(!!d?.isConnected);
    });

    const unsubList = liveService.on('live:rooms_list', (d) => {
      const nextRooms: RoomWithModAliases[] = d?.rooms || [];
      setRooms(nextRooms);
      onCountChange?.(nextRooms.length);
      if (initialRoomId && initialRoomAppliedRef.current !== initialRoomId) {
        const idx = nextRooms.findIndex(r => r.id === initialRoomId);
        if (idx >= 0) {
          initialRoomAppliedRef.current = initialRoomId;
          setActiveIndex(idx);
          setViewMode('feed');
          return;
        }
      }
      setActiveIndex(prev => (nextRooms.length === 0 ? 0 : Math.min(prev, nextRooms.length - 1)));
    });

    const unsubStats = liveService.on('live:room_stats', (d) => {
      if (!d?.roomId) return;
      setRooms(prev =>
        prev.map(r =>
          r.id === d.roomId
            ? { ...r, viewerCount: d.viewerCount ?? r.viewerCount, likesCount: d.likesCount ?? r.likesCount }
            : r
        )
      );
    });

    const unsubStarted = liveService.on('live:started', (d) => {
      if (d?.room) {
        if (d.rtcConfig?.iceServers) {
          coHostRtcRef.current.setIceServers(d.rtcConfig.iceServers);
        }
        setHostingRoom(d.room);
        setComments(d.room.comments || []);
        setBroadcastElapsed(0);
        setViewMode('broadcast');
      }
    });

    const unsubSnapshot = liveService.on('live:room_snapshot', (d) => {
      if (!d?.room) return;
      if (d.rtcConfig?.iceServers) {
        coHostRtcRef.current.setIceServers(d.rtcConfig.iceServers);
      }
      setActiveRoomSnapshot(d.room);
      setLiveFrameUrl(d.room.lastFrame || d.room.coverUrl || null);
      setComments(d.room.comments || []);
      setIsFollowingHost(!!d.isFollowing);
    });

    const unsubJoinDenied = liveService.on('live:join_denied', (d) => {
      if (d?.reason) {
        showTimedAlert(d.reason);
      }
    });

    const unsubFrame = liveService.on('live:media_frame', (d) => {
      if (d?.roomId && d.roomId === joinedRoomIdRef.current && d.frameData) {
        setLiveFrameUrl(prev => {
          if (prev) setPreviousFrameUrl(prev);
          return d.frameData;
        });
      }
    });

    const unsubAudio = liveService.on('live:media_audio', (d) => {
      if (d?.roomId && d.roomId === joinedRoomIdRef.current && d.pcmBase64 && audioPlayerRef.current) {
        if (audioPlayerRef.current.isSuspended()) {
          setAudioNeedsUnlock(true);
        } else {
          setAudioNeedsUnlock(false);
          audioPlayerRef.current.enqueuePcm(d.pcmBase64, d.sampleRate || 16000);
        }
      }
    });

    const unsubViewer = liveService.on('live:viewer_update', (d) => {
      if (!d?.roomId) return;
      if (d.roomId === joinedRoomIdRef.current) {
        setActiveRoomSnapshot(prev =>
          prev ? { ...prev, viewerCount: d.viewerCount, peakViewers: d.peakViewers ?? prev.peakViewers } : prev
        );
      }
      if (d.roomId === hostingRoomIdRef.current) {
        setHostingRoom(prev =>
          prev ? { ...prev, viewerCount: d.viewerCount, peakViewers: d.peakViewers ?? prev.peakViewers } : prev
        );
      }
    });

    const unsubComment = liveService.on('live:comment', (d) => {
      if (!d?.roomId || !d.comment) return;
      if (d.roomId === joinedRoomIdRef.current || d.roomId === hostingRoomIdRef.current) {
        setComments(prev => [...prev.filter(c => c.id !== d.comment.id).slice(-80), d.comment]);
      }
    });

    const unsubCommentDeleted = liveService.on('live:comment_deleted', (d) => {
      if (!d?.commentId) return;
      if (d.roomId === joinedRoomIdRef.current || d.roomId === hostingRoomIdRef.current) {
        setComments(prev => prev.filter(c => c.id !== d.commentId));
      }
    });

    const unsubModNotice = liveService.on('live:moderation_notice', (d) => {
      if (d?.error) showTimedAlert(d.error);
    });

    const unsubModEvent = liveService.on('live:moderation_event', (d) => {
      if (!d?.roomId) return;
      if (Array.isArray(d.comments)) {
        setComments(d.comments);
      }
      if (d.log) {
        setModLogs(prev => [d.log, ...prev.slice(0, 49)]);
      }
    });

    const unsubModsUpdated = liveService.on('live:moderators_updated', (d) => {
      if (!d?.roomId || !Array.isArray(d.moderatorIds)) return;
      setHostingRoom(prev => (prev && prev.id === d.roomId ? { ...prev, moderatorIds: d.moderatorIds } : prev));
      setActiveRoomSnapshot(prev => (prev && prev.id === d.roomId ? { ...prev, moderatorIds: d.moderatorIds } : prev));
    });

    const unsubBannedWords = liveService.on('live:banned_words_updated', (d) => {
      if (!d?.roomId || !Array.isArray(d.bannedWords)) return;
      setHostingRoom(prev => (prev && prev.id === d.roomId ? { ...prev, bannedWords: d.bannedWords } : prev));
      setActiveRoomSnapshot(prev => (prev && prev.id === d.roomId ? { ...prev, bannedWords: d.bannedWords } : prev));
    });

    const unsubBannedFromRoom = liveService.on('live:banned_from_room', (d) => {
      if (d?.roomId === joinedRoomIdRef.current) {
        joinedRoomIdRef.current = null;
        setActiveRoomSnapshot(null);
        setLiveFrameUrl(null);
        showTimedAlert(d.reason || 'Fuiste expulsado de esta sala en vivo.');
        setViewMode('explore');
      }
    });

    const unsubReaction = liveService.on('live:reaction', (d) => {
      if (!d?.roomId) return;
      if (d.roomId === joinedRoomIdRef.current) {
        setActiveRoomSnapshot(prev => (prev ? { ...prev, likesCount: d.likesCount } : prev));
        spawnFloatingReaction(d.emoji || '❤️');
      }
      if (d.roomId === hostingRoomIdRef.current) {
        setHostingRoom(prev => (prev ? { ...prev, likesCount: d.likesCount } : prev));
        spawnFloatingReaction(d.emoji || '❤️');
      }
    });

    const unsubGift = liveService.on('live:gift', (d) => {
      if (!d?.roomId) return;
      if (d.roomId === joinedRoomIdRef.current || d.roomId === hostingRoomIdRef.current) {
        if (d.comment) {
          setComments(prev => [...prev.filter(c => c.id !== d.comment.id).slice(-80), d.comment]);
        }
        setActiveGiftBanner({
          id: `g_${Date.now()}`,
          userName: d.userName || 'Espectador',
          giftName: d.giftName || 'Regalo',
          giftEmoji: d.giftEmoji || '🎁',
          quantity: d.quantity || 1,
          coins: d.coins || 1,
          animation: d.animation || 'pulse'
        });
        setTimeout(() => setActiveGiftBanner(null), d.animation === 'supernova' ? 3500 : 2600);

        if (d.roomId === joinedRoomIdRef.current) {
          setActiveRoomSnapshot(prev =>
            prev
              ? {
                  ...prev,
                  giftsCount: d.giftsCount,
                  likesCount: d.likesCount,
                  earnedCoins: d.earnedCoins ?? prev.earnedCoins
                }
              : prev
          );
        }
        if (d.roomId === hostingRoomIdRef.current) {
          setHostingRoom(prev =>
            prev
              ? {
                  ...prev,
                  giftsCount: d.giftsCount,
                  likesCount: d.likesCount,
                  earnedCoins: d.earnedCoins ?? prev.earnedCoins
                }
              : prev
          );
        }
      }
    });

    const unsubGiftError = liveService.on('live:gift_error', (d) => {
      const msg = d?.error || 'No se pudo enviar el regalo.';
      if (d?.code === 'INSUFFICIENT_BALANCE' || d?.code === 'INSUFFICIENT_COINS') {
        showTimedAlert(msg, 'Recargar Coins', () => {
          window.dispatchEvent(new CustomEvent('nakeic:open_wallet'));
        });
      } else {
        showTimedAlert(msg);
      }
    });

    const unsubWallet = liveService.on('wallet:balance_update', (d) => {
      if (typeof d?.wallet?.coinsBalance === 'number') {
        setWalletCoins(d.wallet.coinsBalance);
      }
    });

    const unsubFollow = liveService.on('live:follow_update', (d) => {
      if (!d?.roomId) return;
      if (d.roomId === joinedRoomIdRef.current) {
        setActiveRoomSnapshot(prev => (prev ? { ...prev, followersCount: d.followersCount } : prev));
        if (d.followerId === currentUser.id) {
          setIsFollowingHost(!!d.isFollowing);
        }
      }
      if (d.roomId === hostingRoomIdRef.current) {
        setHostingRoom(prev => (prev ? { ...prev, followersCount: d.followersCount } : prev));
      }
    });

    const unsubStateUpdate = liveService.on('live:state_update', (d) => {
      if (!d?.roomId) return;
      const patch = (prev: RoomWithModAliases | null) =>
        prev
          ? {
              ...prev,
              isAudioMuted: d.isAudioMuted ?? prev.isAudioMuted,
              isVideoPaused: d.isVideoPaused ?? prev.isVideoPaused,
              commentsEnabled: d.commentsEnabled ?? prev.commentsEnabled,
              qualityPreset: d.qualityPreset ?? prev.qualityPreset,
              joinPolicy: d.joinPolicy ?? prev.joinPolicy,
              title: d.title ?? prev.title,
              description: d.description ?? prev.description,
              pinnedComment: d.pinnedComment !== undefined ? d.pinnedComment : prev.pinnedComment
            }
          : prev;
      if (d.roomId === joinedRoomIdRef.current) setActiveRoomSnapshot(patch);
      if (d.roomId === hostingRoomIdRef.current) setHostingRoom(patch);
    });

    // Multi-guest Co-Host Events
    const unsubGuests = liveService.on('live:guests_updated', (d) => {
      if (!d?.roomId) return;
      const updateGuests = (prev: RoomWithModAliases | null) =>
        prev
          ? { ...prev, coHosts: d.coHosts || [], guestRequests: d.guestRequests || [] }
          : prev;
      if (d.roomId === joinedRoomIdRef.current) setActiveRoomSnapshot(updateGuests);
      if (d.roomId === hostingRoomIdRef.current) setHostingRoom(updateGuests);

      // If host sees new co-host, initiate WebRTC peer connection
      if (d.roomId === hostingRoomIdRef.current && Array.isArray(d.coHosts)) {
        d.coHosts.forEach((guest: { userId: string }) => {
          if (guest.userId !== currentUser.id) {
            coHostRtcRef.current.createPeer({
              roomId: d.roomId,
              targetUserId: guest.userId,
              localStream: broadcastStreamRef.current,
              initiator: true,
              onRemoteStream: (uid, stream) => {
                setCoHostRemoteStreams(prev => ({ ...prev, [uid]: stream }));
              }
            }).catch(() => {});
          }
        });
      }
    });

    const unsubGuestInvited = liveService.on('live:guest_invited', (d) => {
      if (d?.roomId) {
        setIncomingGuestInvite(d);
      }
    });

    const unsubGuestAccepted = liveService.on('live:guest_accepted', async (d) => {
      if (!d?.roomId) return;
      if (d.rtcConfig?.iceServers) {
        coHostRtcRef.current.setIceServers(d.rtcConfig.iceServers);
      }
      setGuestRequested(false);
      showTimedAlert('Ahora estás como Co-Anfitrión en pantalla dividida.');
      try {
        if (navigator.mediaDevices?.getUserMedia) {
          const media = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          coHostLocalStreamRef.current = media;
        }
      } catch {
        // Audio-only or receive-only co-host if camera unavailable
      }
    });

    const unsubGuestRejected = liveService.on('live:guest_rejected', () => {
      setGuestRequested(false);
      showTimedAlert('El anfitrión no aceptó la solicitud en este momento.');
    });

    const unsubGuestRemoved = liveService.on('live:guest_removed', () => {
      coHostRtcRef.current.closeAll();
      if (coHostLocalStreamRef.current) {
        coHostLocalStreamRef.current.getTracks().forEach(t => t.stop());
        coHostLocalStreamRef.current = null;
      }
      setCoHostRemoteStreams({});
      showTimedAlert('Has salido de la pantalla dividida del LIVE.');
    });

    // WebRTC Co-Host Signaling
    const unsubWebRtcOffer = liveService.on('live:webrtc_offer', (d) => {
      if (!d?.roomId || !d?.fromUserId || !d?.sdp) return;
      const stream = d.roomId === hostingRoomIdRef.current ? broadcastStreamRef.current : coHostLocalStreamRef.current;
      coHostRtcRef.current.handleOffer({
        roomId: d.roomId,
        fromUserId: d.fromUserId,
        sdp: d.sdp,
        localStream: stream,
        onRemoteStream: (uid, remoteStream) => {
          setCoHostRemoteStreams(prev => ({ ...prev, [uid]: remoteStream }));
        }
      }).catch(() => {});
    });

    const unsubWebRtcAnswer = liveService.on('live:webrtc_answer', (d) => {
      if (d?.fromUserId && d?.sdp) {
        coHostRtcRef.current.handleAnswer(d.fromUserId, d.sdp).catch(() => {});
      }
    });

    const unsubWebRtcIce = liveService.on('live:webrtc_ice', (d) => {
      if (d?.fromUserId && d?.candidate) {
        coHostRtcRef.current.handleIceCandidate(d.fromUserId, d.candidate).catch(() => {});
      }
    });

    // PK Battle Events
    const unsubBattleChallenged = liveService.on('live:battle_challenged', (d) => {
      if (d?.battle) {
        setIncomingBattleInvite(d.battle);
      }
    });

    const unsubBattleStarted = liveService.on('live:battle_started', (d) => {
      if (!d?.battle) return;
      setIncomingBattleInvite(null);
      setBattleResultBanner(null);
      setHostingRoom(prev => (prev ? { ...prev, activeBattle: d.battle } : prev));
      setActiveRoomSnapshot(prev => (prev ? { ...prev, activeBattle: d.battle } : prev));
    });

    const unsubBattleDeclined = liveService.on('live:battle_declined', (d) => {
      showTimedAlert(`${d?.opponentHostName || 'El creador'} rechazó la batalla PK.`);
    });

    const unsubBattleUpdate = liveService.on('live:battle_update', (d) => {
      if (!d?.battle) return;
      setHostingRoom(prev => (prev ? { ...prev, activeBattle: d.battle } : prev));
      setActiveRoomSnapshot(prev => (prev ? { ...prev, activeBattle: d.battle } : prev));
    });

    const unsubBattleEnded = liveService.on('live:battle_ended', (d) => {
      if (!d?.battle) return;
      const b: LiveBattle = d.battle;
      const winnerName =
        b.winnerHostId === b.challengerHostId
          ? b.challengerHostName
          : b.winnerHostId === b.opponentHostId
          ? b.opponentHostName
          : null;
      setBattleResultBanner(
        winnerName
          ? `🏆 Ganador PK: ${winnerName} (${b.challengerScore} vs ${b.opponentScore})`
          : `🤝 Empate PK (${b.challengerScore} vs ${b.opponentScore})`
      );
      setTimeout(() => setBattleResultBanner(null), 6000);
      setHostingRoom(prev => (prev ? { ...prev, activeBattle: null } : prev));
      setActiveRoomSnapshot(prev => (prev ? { ...prev, activeBattle: null } : prev));
    });

    const unsubEnded = liveService.on('live:ended', (d) => {
      if (!d?.roomId) return;
      if (d.roomId === joinedRoomIdRef.current) {
        joinedRoomIdRef.current = null;
        coHostRtcRef.current.closeAll();
        const latestRoom = activeRoomSnapshotRef.current;
        setEndedSummary(prev => ({
          hostName: latestRoom?.hostName || prev?.hostName || 'Anfitrión',
          title: latestRoom?.title || prev?.title || 'Transmisión En Vivo',
          durationSeconds: d.summary?.durationSeconds || 0,
          peakViewers: d.summary?.peakViewers || 0,
          likesCount: d.summary?.likesCount || 0,
          giftsCount: d.summary?.giftsCount || 0,
          earnedCoins: d.summary?.earnedCoins || 0,
          wasHost: false
        }));
        setActiveRoomSnapshot(null);
        setLiveFrameUrl(null);
        setPreviousFrameUrl(null);
        setViewMode('ended');
      }
    });

    return () => {
      unsubConn();
      unsubList();
      unsubStats();
      unsubStarted();
      unsubSnapshot();
      unsubJoinDenied();
      unsubFrame();
      unsubAudio();
      unsubViewer();
      unsubComment();
      unsubCommentDeleted();
      unsubModNotice();
      unsubModEvent();
      unsubModsUpdated();
      unsubBannedWords();
      unsubBannedFromRoom();
      unsubReaction();
      unsubGift();
      unsubGiftError();
      unsubWallet();
      unsubFollow();
      unsubStateUpdate();
      unsubGuests();
      unsubGuestInvited();
      unsubGuestAccepted();
      unsubGuestRejected();
      unsubGuestRemoved();
      unsubWebRtcOffer();
      unsubWebRtcAnswer();
      unsubWebRtcIce();
      unsubBattleChallenged();
      unsubBattleStarted();
      unsubBattleDeclined();
      unsubBattleUpdate();
      unsubBattleEnded();
      unsubEnded();
      if (joinedRoomIdRef.current) {
        liveService.send('live:leave', { roomId: joinedRoomIdRef.current });
        joinedRoomIdRef.current = null;
      }
      coHostRtcRef.current.closeAll();
      if (coHostLocalStreamRef.current) {
        coHostLocalStreamRef.current.getTracks().forEach(t => t.stop());
        coHostLocalStreamRef.current = null;
      }
      audioPlayerRef.current?.dispose();
    };
  }, [currentUser.id, currentUser.displayName, currentUser.avatarUrl, initialRoomId, onCountChange, spawnFloatingReaction, showTimedAlert]);

  // Synchronize viewer room join/leave whenever active stream in feed changes
  const currentFeedRoom = rooms[activeIndex] || null;

  useEffect(() => {
    if (viewMode !== 'feed') {
      if (joinedRoomIdRef.current) {
        liveService.send('live:leave', { roomId: joinedRoomIdRef.current });
        joinedRoomIdRef.current = null;
      }
      return;
    }

    const targetRoomId = currentFeedRoom?.id || null;
    if (joinedRoomIdRef.current === targetRoomId) return;

    if (joinedRoomIdRef.current) {
      liveService.send('live:leave', { roomId: joinedRoomIdRef.current });
      joinedRoomIdRef.current = null;
      coHostRtcRef.current.closeAll();
      setCoHostRemoteStreams({});
      setGuestRequested(false);
    }

    if (targetRoomId) {
      joinedRoomIdRef.current = targetRoomId;
      // Smooth crossfade buffer: keep old frame beneath until new frame arrives
      if (currentFeedRoom?.lastFrame || currentFeedRoom?.coverUrl) {
        setLiveFrameUrl(currentFeedRoom.lastFrame || currentFeedRoom.coverUrl || null);
      }
      setActiveRoomSnapshot(currentFeedRoom);
      setComments([]);
      liveService.send('live:join', {
        roomId: targetRoomId,
        viewerId: currentUser.id,
        viewerName: currentUser.displayName,
        viewerAvatar: currentUser.avatarUrl,
        token: localStorage.getItem('nakeic_auth_token') || undefined
      });
    } else {
      setActiveRoomSnapshot(null);
      setLiveFrameUrl(null);
      setPreviousFrameUrl(null);
    }
  }, [viewMode, currentFeedRoom?.id, currentUser.id, currentUser.displayName, currentUser.avatarUrl]);

  // Helper: Stop broadcaster local media tracks & timers
  const stopLocalBroadcastMedia = useCallback(() => {
    if (frameTimerRef.current) {
      clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
    }
    if (audioCleanupRef.current) {
      audioCleanupRef.current();
      audioCleanupRef.current = null;
    }
    if (broadcastStreamRef.current) {
      broadcastStreamRef.current.getTracks().forEach(t => {
        try { t.stop(); } catch {}
      });
      broadcastStreamRef.current = null;
    }
    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopLocalBroadcastMedia();
      if (hostingRoomIdRef.current) {
        liveService.send('live:stop', { roomId: hostingRoomIdRef.current });
      }
    };
  }, [stopLocalBroadcastMedia]);

  // Initialize hardware camera / screen preview when entering 'setup'
  const initPreviewMedia = useCallback(async (mode: 'camera' | 'screen' | 'studio', front: boolean) => {
    stopLocalBroadcastMedia();
    setHardwareError(null);

    if (mode === 'studio') {
      try {
        if (navigator.mediaDevices?.getUserMedia) {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          broadcastStreamRef.current = micStream;
        }
      } catch {
        // Silent studio mode allowed
      }
      return;
    }

    if (mode === 'screen') {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { ideal: 1080 }, height: { ideal: 1920 } },
          audio: true
        });
        broadcastStreamRef.current = displayStream;
        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = displayStream;
          await previewVideoRef.current.play().catch(() => {});
        }
      } catch {
        setHardwareError('No se pudo capturar pantalla. Cambia a Cámara o Estudio Visual.');
        setSourceMode('studio');
      }
      return;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Navegador sin soporte de cámara');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: front ? 'user' : { ideal: 'environment' },
          width: { ideal: 720 },
          height: { ideal: 1280 }
        },
        audio: true
      });
      broadcastStreamRef.current = stream;
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
        await previewVideoRef.current.play().catch(() => {});
      }
    } catch {
      setHardwareError('Cámara o micrófono no disponible en este equipo. Activamos el modo Estudio Visual para transmitir en vivo.');
      setSourceMode('studio');
    }
  }, [stopLocalBroadcastMedia]);

  useEffect(() => {
    if (viewMode === 'setup') {
      initPreviewMedia(sourceMode, isFrontCamera);
    }
  }, [viewMode, sourceMode, isFrontCamera, initPreviewMedia]);

  useEffect(() => {
    if ((viewMode === 'setup' || viewMode === 'broadcast') && sourceMode !== 'studio' && previewVideoRef.current && broadcastStreamRef.current) {
      if (previewVideoRef.current.srcObject !== broadcastStreamRef.current) {
        previewVideoRef.current.srcObject = broadcastStreamRef.current;
        previewVideoRef.current.play().catch(() => {});
      }
    }
  }, [viewMode, sourceMode]);

  // Studio animated broadcast canvas renderer (when sourceMode === 'studio')
  useEffect(() => {
    if ((viewMode !== 'setup' && viewMode !== 'broadcast') || sourceMode !== 'studio') return;
    const canvas = studioCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let tick = 0;
    const renderStudio = () => {
      tick += 0.025;
      const w = canvas.width;
      const h = canvas.height;

      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#090D16');
      grad.addColorStop(0.5, '#0F172A');
      grad.addColorStop(1, studioAccent + '55');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = studioAccent + '66';
      ctx.lineWidth = 2;
      for (let ring = 0; ring < 3; ring++) {
        const radius = 78 + ring * 26 + Math.sin(tick * 2 + ring) * 6;
        ctx.beginPath();
        ctx.arc(w / 2, h * 0.42, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.42, 62, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = studioAccent;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 34px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(currentUser.displayName.slice(0, 2).toUpperCase(), w / 2, h * 0.42);

      ctx.fillStyle = '#F8FAFC';
      ctx.font = 'bold 22px sans-serif';
      const titleText = studioBannerText.slice(0, 36);
      ctx.fillText(titleText, w / 2, h * 0.57);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '15px sans-serif';
      ctx.fillText(`@${currentUser.username} · NAKEIC Live`, w / 2, h * 0.62);

      const bars = 18;
      const barWidth = 8;
      const startX = w / 2 - (bars * 14) / 2;
      for (let i = 0; i < bars; i++) {
        const barH = 12 + Math.abs(Math.sin(tick * 3 + i * 0.55)) * 42;
        ctx.fillStyle = studioAccent;
        ctx.fillRect(startX + i * 14, h * 0.72 - barH / 2, barWidth, barH);
      }

      animId = requestAnimationFrame(renderStudio);
    };

    animId = requestAnimationFrame(renderStudio);
    return () => cancelAnimationFrame(animId);
  }, [viewMode, sourceMode, studioBannerText, studioAccent, currentUser.displayName, currentUser.username]);

  // Broadcaster frame & audio streaming pump while live (qualityPreset adaptive)
  useEffect(() => {
    if (viewMode !== 'broadcast' || !hostingRoom?.id) return;

    const roomId = hostingRoom.id;
    const activePreset = QualityPresetConfig[hostingRoom.qualityPreset || qualityPreset] || QualityPresetConfig.auto;
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = activePreset.w;
    captureCanvas.height = activePreset.h;
    const captureCtx = captureCanvas.getContext('2d');

    const secTimer = setInterval(() => {
      setBroadcastElapsed(prev => prev + 1);
    }, 1000);

    if (broadcastStreamRef.current) {
      audioCleanupRef.current = startLiveAudioCapture(
        broadcastStreamRef.current,
        isMicMutedRef,
        (pcmBase64, sampleRate) => {
          liveService.send('live:media_audio', { roomId, pcmBase64, sampleRate });
        }
      );
    }

    frameTimerRef.current = setInterval(() => {
      if (isVideoPausedRef.current) return;
      if (liveService.getBufferedAmount() > 350 * 1024) return;
      if (!captureCtx) return;

      if (sourceMode === 'studio' && studioCanvasRef.current) {
        captureCtx.drawImage(studioCanvasRef.current, 0, 0, captureCanvas.width, captureCanvas.height);
        const frameData = captureCanvas.toDataURL('image/jpeg', activePreset.q);
        liveService.send('live:media_frame', { roomId, frameData, timestamp: Date.now() });
      } else if (previewVideoRef.current && previewVideoRef.current.readyState >= 2) {
        const vid = previewVideoRef.current;
        const vw = vid.videoWidth || activePreset.w;
        const vh = vid.videoHeight || activePreset.h;
        const targetRatio = captureCanvas.width / captureCanvas.height;
        const videoRatio = vw / vh;
        let sx = 0, sy = 0, sw = vw, sh = vh;
        if (videoRatio > targetRatio) {
          sw = vh * targetRatio;
          sx = (vw - sw) / 2;
        } else {
          sh = vw / targetRatio;
          sy = (vh - sh) / 2;
        }
        captureCtx.save();
        if (sourceMode === 'camera' && isFrontCamera) {
          captureCtx.translate(captureCanvas.width, 0);
          captureCtx.scale(-1, 1);
        }
        captureCtx.drawImage(vid, sx, sy, sw, sh, 0, 0, captureCanvas.width, captureCanvas.height);
        captureCtx.restore();
        const frameData = captureCanvas.toDataURL('image/jpeg', activePreset.q);
        liveService.send('live:media_frame', { roomId, frameData, timestamp: Date.now() });
      }
    }, activePreset.intervalMs);

    return () => {
      clearInterval(secTimer);
      if (frameTimerRef.current) {
        clearInterval(frameTimerRef.current);
        frameTimerRef.current = null;
      }
      if (audioCleanupRef.current) {
        audioCleanupRef.current();
        audioCleanupRef.current = null;
      }
    };
  }, [viewMode, hostingRoom?.id, hostingRoom?.qualityPreset, qualityPreset, sourceMode, isFrontCamera]);

  // Actions
  const handleStartBroadcast = () => {
    const tk = localStorage.getItem('nakeic_auth_token') || undefined;
    liveService.connect({
      token: tk,
      userId: currentUser.id,
      userName: currentUser.displayName,
      userAvatar: currentUser.avatarUrl
    });
    const parsedBanned = bannedWordsInput
      .split(',')
      .map(w => w.trim().toLowerCase())
      .filter(Boolean);

    liveService.send('live:start', {
      title: streamTitle.trim() || 'Transmisión en vivo por NAKEIC',
      description: streamDescription.trim(),
      category: streamCategory,
      coverUrl: streamCoverUrl.trim() || undefined,
      sourceMode,
      joinPolicy,
      commentsEnabled,
      qualityPreset,
      bannedWords: parsedBanned,
      hostId: currentUser.id,
      hostName: currentUser.displayName,
      hostUsername: currentUser.username,
      hostAvatar: currentUser.avatarUrl,
      token: tk
    });
  };

  const handleStopBroadcast = () => {
    const room = hostingRoom;
    if (room) {
      liveService.send('live:stop', { roomId: room.id });
      setEndedSummary({
        hostName: currentUser.displayName,
        title: room.title,
        durationSeconds: broadcastElapsed,
        peakViewers: room.peakViewers,
        likesCount: room.likesCount,
        giftsCount: room.giftsCount,
        earnedCoins: room.earnedCoins || 0,
        wasHost: true
      });
    }
    coHostRtcRef.current.closeAll();
    setCoHostRemoteStreams({});
    stopLocalBroadcastMedia();
    setHostingRoom(null);
    setViewMode('ended');
  };

  const handleToggleMic = () => {
    const next = !isMicMuted;
    setIsMicMuted(next);
    if (broadcastStreamRef.current) {
      broadcastStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !next; });
    }
    if (hostingRoom) {
      liveService.send('live:state_update', { roomId: hostingRoom.id, isAudioMuted: next });
    }
  };

  const handleToggleVideoPause = () => {
    const next = !isVideoPaused;
    setIsVideoPaused(next);
    if (broadcastStreamRef.current) {
      broadcastStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !next; });
    }
    if (hostingRoom) {
      liveService.send('live:state_update', { roomId: hostingRoom.id, isVideoPaused: next });
    }
  };

  const handleSendComment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetRoomId = viewMode === 'broadcast' ? hostingRoom?.id : activeRoomSnapshot?.id;
    if (!targetRoomId || !commentInput.trim()) return;

    liveService.send('live:comment', {
      roomId: targetRoomId,
      userId: currentUser.id,
      userName: currentUser.displayName,
      userAvatar: currentUser.avatarUrl,
      text: commentInput.trim()
    });
    setCommentInput('');
  };

  const handlePinComment = (comment: LiveComment) => {
    if (viewMode !== 'broadcast' || !hostingRoom) return;
    const isAlreadyPinned = hostingRoom.pinnedComment?.id === comment.id;
    liveService.send('live:state_update', {
      roomId: hostingRoom.id,
      pinnedComment: isAlreadyPinned ? null : { id: comment.id, userName: comment.userName, text: comment.text }
    });
  };

  const handleSendReaction = (emoji: string = '❤️', x?: number, y?: number) => {
    const targetRoomId = activeRoomSnapshot?.id || hostingRoom?.id;
    if (!targetRoomId) return;
    spawnFloatingReaction(emoji, x, y);
    liveService.send('live:reaction', {
      roomId: targetRoomId,
      userId: currentUser.id,
      userName: currentUser.displayName,
      emoji
    });
  };

  const handleSendGift = (gift: LiveGift) => {
    const targetRoomId = activeRoomSnapshot?.id;
    if (!targetRoomId) return;
    const tk = localStorage.getItem('nakeic_auth_token');
    if (!tk) {
      showTimedAlert('Inicia sesión verificada para enviar regalos en NAKEIC LIVE.', 'Ir a Ajustes', () => {
        window.dispatchEvent(new CustomEvent('nakeic:open_wallet'));
      });
      setShowGiftSheet(false);
      return;
    }
    liveService.send('live:gift', {
      roomId: targetRoomId,
      userId: currentUser.id,
      userName: currentUser.displayName,
      userAvatar: currentUser.avatarUrl,
      giftId: gift.id,
      quantity: giftQuantity,
      token: tk
    });
    setShowGiftSheet(false);
  };

  const handleToggleFollow = () => {
    if (!activeRoomSnapshot) return;
    liveService.send('live:follow', {
      roomId: activeRoomSnapshot.id,
      hostId: activeRoomSnapshot.hostId,
      followerId: currentUser.id
    });
  };

  const handleUnlockAudio = async () => {
    if (!audioPlayerRef.current) return;
    const ok = await audioPlayerRef.current.resume();
    if (ok) {
      setAudioNeedsUnlock(false);
      setIsViewerMuted(false);
      audioPlayerRef.current.setMuted(false);
    }
  };

  const handleToggleViewerMute = async () => {
    if (!audioPlayerRef.current) return;
    await audioPlayerRef.current.resume();
    setAudioNeedsUnlock(false);
    const next = !isViewerMuted;
    setIsViewerMuted(next);
    audioPlayerRef.current.setMuted(next);
  };

  const handleVideoSurfaceTap = (e: React.MouseEvent<HTMLDivElement>) => {
    audioPlayerRef.current?.resume().then(ok => {
      if (ok) setAudioNeedsUnlock(false);
    });
    const now = Date.now();
    if (now - lastTapTimeRef.current < 280) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      handleSendReaction('❤️', x, y);
    }
    lastTapTimeRef.current = now;
  };

  const goToPrevStream = () => {
    if (rooms.length <= 1) return;
    setActiveIndex(prev => (prev - 1 + rooms.length) % rooms.length);
  };

  const goToNextStream = () => {
    if (rooms.length <= 1) return;
    setActiveIndex(prev => (prev + 1) % rooms.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null || rooms.length <= 1) return;
    const deltaY = touchStartYRef.current - e.changedTouches[0].clientY;
    touchStartYRef.current = null;
    if (Math.abs(deltaY) > 65) {
      if (deltaY > 0) goToNextStream();
      else goToPrevStream();
    }
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleShareToConversation = async (convId: string) => {
    if (!activeRoomSnapshot) return;
    await sendMessage(
      convId,
      `🔴 Estoy viendo el En Vivo de ${activeRoomSnapshot.hostName} (@${activeRoomSnapshot.hostUsername}): "${activeRoomSnapshot.title}". Entra a la pestaña En Vivo de NAKEIC para mirar.`
    );
    setSharedConvIds(prev => [...prev, convId]);
  };

  const loadModerationLogs = async (roomId: string) => {
    const tk = localStorage.getItem('nakeic_auth_token');
    if (!tk) return;
    try {
      const res = await fetch(`/api/live/${roomId}/moderation-logs`, {
        headers: { Authorization: `Bearer ${tk}` }
      });
      if (res.ok) {
        const d = await res.json();
        if (Array.isArray(d?.logs)) setModLogs(d.logs);
      }
    } catch {
      // ignore
    }
  };

  const handleSubmitReport = async () => {
    const targetRoom = displayRoom;
    if (!targetRoom) return;
    const tk = localStorage.getItem('nakeic_auth_token');
    if (!tk) {
      showTimedAlert('Inicia sesión para enviar un reporte de seguridad.');
      return;
    }
    try {
      const res = await fetch('/api/live/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` },
        body: JSON.stringify({
          roomId: targetRoom.id,
          reportedUserId: targetRoom.hostId,
          reason: reportReason,
          details: reportDetails.trim()
        })
      });
      if (res.ok) {
        setReportSubmittedMsg('Reporte enviado al equipo de confianza y seguridad de NAKEIC.');
        setTimeout(() => {
          setShowReportModal(false);
          setReportSubmittedMsg(null);
          setReportDetails('');
        }, 1600);
      } else {
        showTimedAlert('No se pudo registrar el reporte.');
      }
    } catch {
      showTimedAlert('Error de red al enviar reporte.');
    }
  };

  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden'
    : 'flex-1 flex flex-col relative overflow-hidden bg-slate-950';

  const currentFeedRoomObj = rooms[activeIndex] || null;
  const displayRoom = activeRoomSnapshot || currentFeedRoomObj;

  const isHostUser = (room: RoomWithModAliases | null) => !!room && room.hostId === currentUser.id;
  const isModUser = (room: RoomWithModAliases | null) => {
    if (!room) return false;
    if (room.hostId === currentUser.id) return true;
    const mods = room.moderatorIds || room.moderators || [];
    return mods.includes(currentUser.id);
  };

  const activeCoHosts = (viewMode === 'broadcast' ? hostingRoom?.coHosts : displayRoom?.coHosts) || [];
  const isViewerCoHost = activeCoHosts.some(c => c.userId === currentUser.id);
  const opponentRooms = rooms.filter(r => r.id !== hostingRoom?.id && !r.activeBattle);

  const renderBattleHud = (battle: LiveBattle, isHostSide: boolean, hostRoomId: string) => {
    const total = Math.max(1, battle.challengerScore + battle.opponentScore);
    const leftPct = battle.challengerScore + battle.opponentScore === 0
      ? 50
      : Math.max(12, Math.min(88, Math.round((battle.challengerScore / total) * 100)));

    return (
      <div className="mx-3 mt-2 p-2.5 rounded-2xl bg-black/70 border border-amber-400/35 backdrop-blur-md space-y-1.5 z-25">
        <div className="flex items-center justify-between text-[11px] font-bold text-white">
          <div className="flex items-center gap-1.5 min-w-0">
            <img src={battle.challengerHostAvatar} alt={battle.challengerHostName} className="w-5 h-5 rounded-full object-cover" />
            <span className="truncate max-w-[85px] text-cyan-300">{battle.challengerHostName}</span>
            <span className="text-amber-300 tabular-nums">{battle.challengerScore}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-mono text-[10px]">
            <Swords className="w-3 h-3" />
            <span>{formatDuration(battleCountdownSec)}</span>
          </div>

          <div className="flex items-center gap-1.5 min-w-0 justify-end">
            <span className="text-rose-300 tabular-nums">{battle.opponentScore}</span>
            <span className="truncate max-w-[85px] text-rose-300">{battle.opponentHostName}</span>
            <img src={battle.opponentHostAvatar} alt={battle.opponentHostName} className="w-5 h-5 rounded-full object-cover" />
          </div>
        </div>

        <div className="h-2 rounded-full bg-rose-600/80 overflow-hidden flex">
          <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${leftPct}%` }} />
        </div>

        {isHostSide && (
          <div className="flex justify-end">
            <button
              onClick={() => liveService.send('live:battle_end', { battleId: battle.id, roomId: hostRoomId })}
              className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-[10px] font-semibold text-slate-200 cursor-pointer"
            >
              Terminar Batalla
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderCoHostGrid = (room: RoomWithModAliases, isHostSide: boolean) => {
    const coHosts = room.coHosts || [];
    if (coHosts.length === 0) return null;
    return (
      <div className="relative z-20 mx-3 mt-2 grid grid-cols-3 gap-1.5">
        {coHosts.map(guest => {
          const rStream = coHostRemoteStreams[guest.userId];
          return (
            <div
              key={guest.userId}
              className="relative aspect-[3/4] rounded-xl overflow-hidden bg-slate-900/90 border border-white/20 flex flex-col items-center justify-center p-1.5"
            >
              {rStream ? (
                <RemoteCoHostMedia stream={rStream} />
              ) : (
                <img
                  src={guest.userAvatar}
                  alt={guest.userName}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-cyan-400"
                />
              )}
              <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold text-white truncate">{guest.userName}</span>
                {guest.isMuted && <MicOff className="w-3 h-3 text-rose-400 shrink-0" />}
              </div>

              {(isHostSide || guest.userId === currentUser.id) && (
                <div className="absolute top-1 right-1 flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      liveService.send('live:guest_toggle_mic', {
                        roomId: room.id,
                        targetUserId: guest.userId,
                        isMuted: !guest.isMuted
                      });
                    }}
                    className="w-6 h-6 rounded-md bg-black/70 text-white flex items-center justify-center cursor-pointer"
                  >
                    {guest.isMuted ? <MicOff className="w-3 h-3 text-rose-400" /> : <Mic className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      liveService.send(isHostSide ? 'live:guest_kick' : 'live:guest_leave', {
                        roomId: room.id,
                        targetUserId: guest.userId
                      });
                    }}
                    className="w-6 h-6 rounded-md bg-rose-600 text-white flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={containerClass}>
      {/* Global Room Alert / Error Notice */}
      {roomAlert && (
        <div className="absolute top-14 left-3 right-3 z-50 px-3.5 py-2.5 rounded-2xl bg-slate-900/95 border border-amber-400/45 text-white shadow-xl flex items-center justify-between gap-2 backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-medium leading-snug">{roomAlert.text}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {roomAlert.actionLabel && roomAlert.onAction && (
              <button
                onClick={roomAlert.onAction}
                className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 text-[11px] font-bold cursor-pointer"
              >
                {roomAlert.actionLabel}
              </button>
            )}
            <button onClick={() => setRoomAlert(null)} className="text-slate-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* PK Battle Result Banner */}
      {battleResultBanner && (
        <div className="absolute top-28 left-4 right-4 z-40 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-600 text-white text-xs font-bold text-center shadow-2xl">
          {battleResultBanner}
        </div>
      )}

      {/* ============================================================
          VIEW 1: SETUP / GO LIVE STUDIO PREPARATION
         ============================================================ */}
      {viewMode === 'setup' && (
        <div className="flex-1 flex flex-col relative bg-slate-950 overflow-hidden">
          {sourceMode === 'studio' ? (
            <canvas
              ref={studioCanvasRef}
              width={450}
              height={800}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <video
              ref={previewVideoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover ${
                sourceMode === 'camera' && isFrontCamera ? 'scale-x-[-1]' : ''
              }`}
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/35 to-black/95 pointer-events-none" />

          {/* Header Controls */}
          <div className="relative z-10 px-4 pt-3 pb-2 flex items-center justify-between">
            <button
              onClick={() => {
                stopLocalBroadcastMedia();
                setViewMode('feed');
              }}
              className="min-h-[40px] px-3 rounded-xl bg-black/55 hover:bg-black/75 text-white flex items-center gap-1.5 text-xs font-semibold cursor-pointer backdrop-blur-md"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </button>

            <span className="text-sm font-bold text-white tracking-tight">Configurar NAKEIC LIVE</span>

            <div className="flex items-center gap-1.5">
              {sourceMode === 'camera' && (
                <button
                  onClick={() => setIsFrontCamera(!isFrontCamera)}
                  title="Cambiar cámara"
                  className="min-h-[40px] min-w-[40px] rounded-xl bg-black/55 hover:bg-black/75 text-white flex items-center justify-center cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="min-h-[40px] min-w-[40px] rounded-xl bg-black/55 hover:bg-black/75 text-white flex items-center justify-center cursor-pointer"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="relative z-10 flex-1 flex flex-col justify-end p-4 gap-3 overflow-y-auto">
            {hardwareError && (
              <div className="px-3.5 py-2 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-medium">
                {hardwareError}
              </div>
            )}

            {/* Source Switcher */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'camera', label: 'Cámara', icon: Video },
                { id: 'screen', label: 'Pantalla', icon: Monitor },
                { id: 'studio', label: 'Estudio', icon: Palette }
              ].map(item => {
                const Icon = item.icon;
                const active = sourceMode === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSourceMode(item.id as 'camera' | 'screen' | 'studio')}
                    className={`min-h-[42px] px-2 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
                      active
                        ? 'bg-rose-600 border-rose-500 text-white'
                        : 'bg-black/55 border-white/15 text-slate-200 hover:bg-black/75'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Stream Details Card */}
            <div className="p-3.5 rounded-2xl bg-black/70 border border-white/15 backdrop-blur-md space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Título del LIVE</label>
                  <input
                    type="text"
                    maxLength={100}
                    value={streamTitle}
                    onChange={e => setStreamTitle(e.target.value)}
                    placeholder="Ej: Charlando en vivo, música, noticias..."
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-xs text-white placeholder:text-slate-400 outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Portada opcional (URL)</label>
                  <input
                    type="url"
                    value={streamCoverUrl}
                    onChange={e => setStreamCoverUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-xs text-white placeholder:text-slate-400 outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Descripción / Tema</label>
                <input
                  type="text"
                  maxLength={240}
                  value={streamDescription}
                  onChange={e => setStreamDescription(e.target.value)}
                  placeholder="Describe brevemente de qué trata tu transmisión"
                  className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-xs text-white placeholder:text-slate-400 outline-none focus:border-cyan-400"
                />
              </div>

              {sourceMode === 'studio' && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={36}
                    value={studioBannerText}
                    onChange={e => setStudioBannerText(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-xs text-white outline-none"
                  />
                  <div className="flex items-center gap-1">
                    {['#06B6D4', '#E11D48', '#10B981', '#F59E0B'].map(c => (
                      <button
                        key={c}
                        onClick={() => setStudioAccent(c)}
                        className={`w-6 h-6 rounded-lg cursor-pointer border-2 ${
                          studioAccent === c ? 'border-white scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Categoría</label>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  {LIVE_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setStreamCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                        streamCategory === cat ? 'bg-cyan-500 text-slate-950' : 'bg-white/10 text-slate-200 hover:bg-white/15'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Privacy, Quality & Comments Controls */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Quién puede entrar</label>
                  <select
                    value={joinPolicy}
                    onChange={e => setJoinPolicy(e.target.value as 'everyone' | 'followers' | 'invite_only')}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white outline-none"
                  >
                    <option value="everyone">Público (Todos)</option>
                    <option value="followers">Solo seguidores</option>
                    <option value="invite_only">Solo invitados</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Calidad de video</label>
                  <select
                    value={qualityPreset}
                    onChange={e => setQualityPreset(e.target.value as 'auto' | '720p' | '480p' | '360p')}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white outline-none"
                  >
                    <option value="auto">Auto (Adaptativo)</option>
                    <option value="720p">720p HD</option>
                    <option value="480p">480p Estándar</option>
                    <option value="360p">360p Ahorro datos</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center pt-1">
                <button
                  type="button"
                  onClick={() => setCommentsEnabled(!commentsEnabled)}
                  className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 flex items-center justify-between text-xs text-white cursor-pointer"
                >
                  <span>Permitir comentarios</span>
                  <span className={`font-bold ${commentsEnabled ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {commentsEnabled ? 'Activados' : 'Desactivados'}
                  </span>
                </button>
                <input
                  type="text"
                  value={bannedWordsInput}
                  onChange={e => setBannedWordsInput(e.target.value)}
                  placeholder="Filtro palabras (coma): spam, insulto"
                  className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-xs text-white placeholder:text-slate-400 outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleStartBroadcast}
              disabled={!isWsConnected}
              className="w-full min-h-[46px] py-3 px-5 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-rose-600/30 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Radio className="w-5 h-5" />
              <span>{isWsConnected ? 'Iniciar Transmisión En Vivo' : 'Conectando servidor...'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          VIEW 2: ACTIVE BROADCASTER STUDIO (ON AIR)
         ============================================================ */}
      {viewMode === 'broadcast' && hostingRoom && (
        <div className="flex-1 flex flex-col relative bg-black overflow-hidden">
          {sourceMode === 'studio' ? (
            <canvas
              ref={studioCanvasRef}
              width={450}
              height={800}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <video
              ref={previewVideoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover ${
                sourceMode === 'camera' && isFrontCamera ? 'scale-x-[-1]' : ''
              } ${isVideoPaused ? 'opacity-20' : 'opacity-100'}`}
            />
          )}

          {isVideoPaused && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white bg-slate-950/75">
              <VideoOff className="w-10 h-10 text-slate-400 mb-2" />
              <p className="text-sm font-semibold">Video en pausa</p>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-transparent to-black/90 pointer-events-none z-10" />

          {/* Floating Hearts */}
          <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
            {floatingReactions.map(r => (
              <div key={r.id} className="absolute text-2xl animate-bounce" style={{ left: `${r.x}%`, top: `${r.y}%` }}>
                {r.emoji}
              </div>
            ))}
          </div>

          {/* Gift Banner */}
          {activeGiftBanner && (
            <div className={`absolute top-20 left-4 right-4 z-30 flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-2xl text-white shadow-xl backdrop-blur-md ${
              activeGiftBanner.animation === 'supernova'
                ? 'bg-gradient-to-r from-amber-500 via-rose-600 to-purple-600 animate-pulse'
                : 'bg-gradient-to-r from-amber-500/90 to-rose-600/90'
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-2xl">{activeGiftBanner.giftEmoji}</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{activeGiftBanner.userName}</p>
                  <p className="text-[11px] opacity-95">
                    Envió {activeGiftBanner.giftName}{activeGiftBanner.quantity > 1 ? ` x${activeGiftBanner.quantity}` : ''} (+{activeGiftBanner.coins} Coins)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Top Broadcaster HUD */}
          <div className="relative z-20 px-3 pt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold shrink-0">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>EN VIVO</span>
                <span className="font-mono tabular-nums ml-0.5">{formatDuration(broadcastElapsed)}</span>
              </div>

              <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-black/55 text-white text-xs font-semibold tabular-nums backdrop-blur-md shrink-0">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>{hostingRoom.viewerCount}</span>
              </div>

              <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-black/55 text-white text-xs font-semibold tabular-nums backdrop-blur-md shrink-0">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>{hostingRoom.earnedCoins || 0}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Co-host requests button */}
              <button
                onClick={() => setShowGuestsModal(true)}
                title="Invitados en vivo"
                className="relative min-h-[38px] min-w-[38px] px-2 rounded-xl bg-black/55 text-white flex items-center justify-center gap-1 cursor-pointer border border-white/10"
              >
                <Users className="w-4 h-4 text-cyan-400" />
                {(hostingRoom.guestRequests?.length || 0) > 0 && (
                  <span className="px-1.5 rounded-full bg-rose-600 text-[10px] font-bold">
                    {hostingRoom.guestRequests?.length}
                  </span>
                )}
              </button>

              {/* PK Battle button */}
              <button
                onClick={() => setShowBattleChallengeModal(true)}
                title="Batalla PK"
                className="min-h-[38px] min-w-[38px] rounded-xl bg-black/55 text-amber-400 flex items-center justify-center cursor-pointer border border-white/10"
              >
                <Swords className="w-4 h-4" />
              </button>

              {/* Moderation Drawer */}
              <button
                onClick={() => {
                  loadModerationLogs(hostingRoom.id);
                  setShowModDrawer(true);
                }}
                title="Moderación y filtros"
                className="min-h-[38px] min-w-[38px] rounded-xl bg-black/55 text-emerald-400 flex items-center justify-center cursor-pointer border border-white/10"
              >
                <Shield className="w-4 h-4" />
              </button>

              <button
                onClick={handleStopBroadcast}
                className="min-h-[38px] px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                Finalizar
              </button>
            </div>
          </div>

          {/* Incoming Battle Challenge Banner for Opponent Host */}
          {incomingBattleInvite && (
            <div className="relative z-30 mx-3 mt-2 p-3 rounded-2xl bg-slate-900/95 border border-amber-400/50 text-white flex items-center justify-between gap-2 shadow-xl">
              <div className="min-w-0">
                <p className="text-xs font-bold text-amber-300">⚔️ Desafío de Batalla PK</p>
                <p className="text-[11px] text-slate-200 truncate">
                  {incomingBattleInvite.challengerHostName} te reta ({Math.round(incomingBattleInvite.durationSeconds / 60)} min)
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    liveService.send('live:battle_decline', { battleId: incomingBattleInvite.id });
                    setIncomingBattleInvite(null);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-white/10 text-xs font-semibold cursor-pointer"
                >
                  Rechazar
                </button>
                <button
                  onClick={() => {
                    liveService.send('live:battle_accept', { battleId: incomingBattleInvite.id });
                    setIncomingBattleInvite(null);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  Aceptar
                </button>
              </div>
            </div>
          )}

          {/* Active Battle HUD & Co-host Tiles */}
          {hostingRoom.activeBattle && renderBattleHud(hostingRoom.activeBattle, true, hostingRoom.id)}
          {renderCoHostGrid(hostingRoom, true)}

          {/* Bottom Comments & Controls */}
          <div className="relative z-20 mt-auto p-3 space-y-2">
            {hostingRoom.pinnedComment && (
              <div className="px-3 py-2 rounded-xl bg-amber-500/25 border border-amber-400/40 text-xs text-white flex items-center justify-between gap-2 backdrop-blur-md">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Pin className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span className="font-bold shrink-0">{hostingRoom.pinnedComment.userName}:</span>
                  <span className="truncate">{hostingRoom.pinnedComment.text}</span>
                </div>
                <button
                  onClick={() =>
                    liveService.send('live:state_update', { roomId: hostingRoom.id, pinnedComment: null })
                  }
                  className="text-slate-200 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-2">
              {comments.map(c => (
                <button
                  key={c.id}
                  onClick={() => c.type === 'chat' && setSelectedModComment(c)}
                  title={c.type === 'chat' ? 'Toca para moderar o fijar' : undefined}
                  className={`block text-left max-w-[92%] px-2.5 py-1.5 rounded-xl text-xs backdrop-blur-sm ${
                    c.type === 'gift'
                      ? 'bg-amber-500/35 text-amber-100 border border-amber-400/30'
                      : c.type === 'system'
                      ? 'bg-black/45 text-cyan-200'
                      : 'bg-black/50 text-white hover:bg-black/70 cursor-pointer'
                  }`}
                >
                  <span className="font-bold text-cyan-300 mr-1.5">{c.userName}</span>
                  <span>{c.text}</span>
                </button>
              ))}
              <div ref={commentsEndRef} />
            </div>

            <div className="flex items-center gap-2">
              <form onSubmit={handleSendComment} className="flex-1 flex items-center gap-1.5">
                <input
                  type="text"
                  value={commentInput}
                  onChange={e => setCommentInput(e.target.value)}
                  placeholder="Responder al chat en vivo..."
                  className="flex-1 min-h-[42px] px-3.5 rounded-xl bg-black/60 border border-white/20 text-xs text-white placeholder:text-slate-300 outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  className="min-h-[42px] min-w-[42px] rounded-xl bg-cyan-500 text-slate-950 flex items-center justify-center cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              <button
                onClick={handleToggleMic}
                className={`min-h-[42px] min-w-[42px] rounded-xl flex items-center justify-center cursor-pointer ${
                  isMicMuted ? 'bg-rose-600 text-white' : 'bg-black/60 border border-white/20 text-white'
                }`}
              >
                {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button
                onClick={handleToggleVideoPause}
                className={`min-h-[42px] min-w-[42px] rounded-xl flex items-center justify-center cursor-pointer ${
                  isVideoPaused ? 'bg-amber-500 text-slate-950' : 'bg-black/60 border border-white/20 text-white'
                }`}
              >
                {isVideoPaused ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              </button>

              {sourceMode === 'camera' && (
                <button
                  onClick={() => {
                    const nextFront = !isFrontCamera;
                    setIsFrontCamera(nextFront);
                    initPreviewMedia('camera', nextFront);
                  }}
                  className="min-h-[42px] min-w-[42px] rounded-xl bg-black/60 border border-white/20 text-white flex items-center justify-center cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          VIEW 3: STREAM ENDED SUMMARY
         ============================================================ */}
      {viewMode === 'ended' && endedSummary && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-950 text-white">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-slate-900 border border-white/10 space-y-5">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-cyan-400">
                {endedSummary.wasHost ? 'Tu transmisión finalizó' : 'Transmisión finalizada'}
              </p>
              <h3 className="text-lg font-bold text-white truncate">{endedSummary.title}</h3>
              <p className="text-xs text-slate-400">{endedSummary.hostName}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="p-3 rounded-2xl bg-white/5">
                <p className="text-[11px] text-slate-400">Duración</p>
                <p className="text-lg font-bold tabular-nums">{formatDuration(endedSummary.durationSeconds)}</p>
              </div>
              <div className="p-3 rounded-2xl bg-white/5">
                <p className="text-[11px] text-slate-400">Pico de audiencia</p>
                <p className="text-lg font-bold tabular-nums">{endedSummary.peakViewers}</p>
              </div>
              <div className="p-3 rounded-2xl bg-white/5">
                <p className="text-[11px] text-slate-400">Me gusta</p>
                <p className="text-lg font-bold tabular-nums text-rose-400">{endedSummary.likesCount}</p>
              </div>
              <div className="p-3 rounded-2xl bg-white/5">
                <p className="text-[11px] text-slate-400">Regalos / Coins</p>
                <p className="text-lg font-bold tabular-nums text-amber-400">
                  {endedSummary.giftsCount} ({endedSummary.earnedCoins || 0})
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setEndedSummary(null);
                  setViewMode('feed');
                }}
                className="w-full min-h-[44px] py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Ver otras transmisiones
              </button>
              <button
                onClick={() => {
                  setEndedSummary(null);
                  setViewMode('setup');
                }}
                className="w-full min-h-[44px] py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs cursor-pointer"
              >
                Iniciar nuevo En Vivo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          VIEW 4: EXPLORE DISCOVERY, SEARCH, HISTORY & PK LEADERBOARD
         ============================================================ */}
      {viewMode === 'explore' && (
        <div className="flex-1 flex flex-col bg-slate-950 text-white overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('feed')}
                className="min-h-[38px] min-w-[38px] rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-sm font-bold leading-tight">Explorar NAKEIC LIVE ({rooms.length})</h2>
                <p className="text-[11px] text-slate-400">Descubre creadores, historial y rankings PK</p>
              </div>
            </div>

            <button
              onClick={() => setViewMode('setup')}
              className="min-h-[38px] px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Transmitir</span>
            </button>
          </div>

          {/* Search & Sub-tabs */}
          <div className="px-4 pt-2.5 space-y-2 border-b border-white/5 pb-2.5 shrink-0">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={exploreSearch}
                onChange={e => setExploreSearch(e.target.value)}
                placeholder="Buscar directos por título, creador o categoría..."
                className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-400 outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { id: 'recommended', label: 'Recomendados' },
                { id: 'popular', label: 'Populares' },
                { id: 'following', label: 'Siguiendo' },
                { id: 'categories', label: 'Categorías' },
                { id: 'history', label: 'Historial' },
                { id: 'battles', label: 'Batallas PK' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setExploreTab(t.id as typeof exploreTab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                    exploreTab === t.id ? 'bg-cyan-500 text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {(exploreTab === 'categories' || exploreTab === 'recommended') && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                {['Todas', ...LIVE_CATEGORIES].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setExploreCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                      exploreCategory === cat ? 'bg-rose-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {exploreTab === 'history' ? (
              liveHistory.length === 0 ? (
                <div className="py-16 text-center text-sm text-slate-400">
                  Aún no hay transmisiones finalizadas en el historial.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {liveHistory.map(item => (
                    <div key={item.id} className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={item.hostAvatar} alt={item.hostName} className="w-11 h-11 rounded-full object-cover shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{item.title}</p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {item.hostName} · {item.category} · {formatDuration(item.durationSeconds)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-[11px] shrink-0">
                        <p className="text-cyan-400 font-bold">{item.peakViewers} pico</p>
                        <p className="text-amber-400 font-semibold">{item.earnedCoins} Coins</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : exploreTab === 'battles' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4" />
                    <span>Clasificación de Batallas PK</span>
                  </h3>
                  {battleLeaderboard.length === 0 ? (
                    <p className="text-xs text-slate-400">Aún no hay batallas PK registradas.</p>
                  ) : (
                    battleLeaderboard.map((entry, idx) => (
                      <div key={entry.hostId} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-white">{entry.hostName}</span>
                        </div>
                        <span className="text-cyan-300 font-semibold">{entry.wins} victorias · {entry.totalScore} pts</span>
                      </div>
                    ))
                  )}
                </div>

                {recentBattles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <History className="w-4 h-4" />
                      <span>Batallas recientes</span>
                    </h4>
                    {recentBattles.map(b => (
                      <div key={b.id} className="p-2.5 rounded-xl bg-white/5 text-xs flex items-center justify-between">
                        <span>{b.challengerHostName} vs {b.opponentHostName}</span>
                        <span className="font-mono text-amber-300">{b.challengerScore} - {b.opponentScore}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : exploreRooms.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <p className="text-sm text-slate-400">No hay transmisiones activas que coincidan.</p>
                <button
                  onClick={() => setViewMode('setup')}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
                >
                  Ser el primero en transmitir
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {exploreRooms.map((room) => {
                  const realIndex = rooms.findIndex(r => r.id === room.id);
                  return (
                    <button
                      key={room.id}
                      onClick={() => {
                        if (realIndex >= 0) setActiveIndex(realIndex);
                        setViewMode('feed');
                      }}
                      className="group relative aspect-[9/14] rounded-2xl overflow-hidden bg-slate-900 border border-white/10 text-left cursor-pointer"
                    >
                      {room.lastFrame || room.coverUrl ? (
                        <img
                          src={room.lastFrame || room.coverUrl}
                          alt={room.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center">
                          <img
                            src={room.hostAvatar}
                            alt={room.hostName}
                            referrerPolicy="no-referrer"
                            className="w-14 h-14 rounded-full object-cover ring-2 ring-rose-500"
                          />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/50" />

                      <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1">
                        <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold">
                          EN VIVO
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-semibold tabular-nums flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {room.viewerCount}
                        </span>
                      </div>

                      <div className="absolute bottom-2.5 left-2.5 right-2.5 space-y-0.5">
                        <p className="text-xs font-bold text-white line-clamp-2 leading-snug">{room.title}</p>
                        <p className="text-[11px] text-slate-300 truncate">
                          {room.hostName} · {room.category}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          VIEW 5: VERTICAL LIVE STREAM FEED (VIEWER)
         ============================================================ */}
      {viewMode === 'feed' && (
        <div
          className="flex-1 flex flex-col relative bg-black overflow-hidden select-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {rooms.length === 0 || !displayRoom ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white">
              <div className="w-20 h-20 rounded-3xl bg-rose-600/15 border border-rose-500/30 flex items-center justify-center mb-4">
                <Radio className="w-10 h-10 text-rose-500" />
              </div>
              <h2 className="text-lg font-bold tracking-tight mb-1.5">NAKEIC LIVE</h2>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-6">
                Transmite video en vivo con múltiples invitados, batallas PK, moderación avanzada y regalos reales con NAKEIC Coins.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-xs">
                <button
                  onClick={() => setViewMode('setup')}
                  className="w-full min-h-[46px] px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-600/25 cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                  <span>Transmitir En Vivo</span>
                </button>
                <button
                  onClick={() => setViewMode('explore')}
                  className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Explorar
                </button>
              </div>
              {onExitToChats && (
                <button
                  onClick={onExitToChats}
                  className="mt-3 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Volver a Chats
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Live Stream Video Canvas with Zero-Black-Screen Buffer */}
              <div
                onClick={handleVideoSurfaceTap}
                className="absolute inset-0 w-full h-full flex items-center justify-center bg-slate-950 cursor-pointer"
              >
                {(previousFrameUrl || displayRoom.coverUrl) && (
                  <img
                    src={previousFrameUrl || displayRoom.coverUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover blur-[1px]"
                  />
                )}
                {displayRoom.isVideoPaused ? (
                  <div className="relative z-10 flex flex-col items-center justify-center text-white gap-2">
                    <img
                      src={displayRoom.hostAvatar}
                      alt={displayRoom.hostName}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 rounded-full object-cover ring-2 ring-white/25"
                    />
                    <p className="text-xs text-slate-300 font-medium">El creador pausó el video</p>
                  </div>
                ) : liveFrameUrl ? (
                  <img
                    src={liveFrameUrl}
                    alt={displayRoom.title}
                    referrerPolicy="no-referrer"
                    className="relative z-10 w-full h-full object-cover transition-opacity duration-200"
                  />
                ) : (
                  <div className="relative z-10 flex flex-col items-center justify-center text-center p-6 gap-3">
                    <img
                      src={displayRoom.hostAvatar}
                      alt={displayRoom.hostName}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 rounded-full object-cover ring-2 ring-rose-500"
                    />
                    <p className="text-xs text-slate-300 font-medium">Conectando video en vivo...</p>
                  </div>
                )}
              </div>

              <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-transparent to-black/90 pointer-events-none z-10" />

              {/* Floating Hearts */}
              <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
                {floatingReactions.map(r => (
                  <div key={r.id} className="absolute text-3xl animate-bounce" style={{ left: `${r.x}%`, top: `${r.y}%` }}>
                    {r.emoji}
                  </div>
                ))}
              </div>

              {/* Gift Arrival Banner */}
              {activeGiftBanner && (
                <div className={`absolute top-20 left-3 right-16 z-30 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl text-white shadow-xl ${
                  activeGiftBanner.animation === 'supernova'
                    ? 'bg-gradient-to-r from-amber-500 via-rose-600 to-purple-600 animate-pulse'
                    : 'bg-gradient-to-r from-amber-500/95 to-rose-600/95'
                }`}>
                  <span className="text-2xl">{activeGiftBanner.giftEmoji}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{activeGiftBanner.userName}</p>
                    <p className="text-[11px] opacity-95">
                      Envió {activeGiftBanner.giftName}{activeGiftBanner.quantity > 1 ? ` x${activeGiftBanner.quantity}` : ''} (+{activeGiftBanner.coins} Coins)
                    </p>
                  </div>
                </div>
              )}

              {/* TOP BAR */}
              <div className="relative z-20 px-3 pt-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 bg-black/55 backdrop-blur-md p-1 pr-2.5 rounded-full border border-white/10">
                  <img
                    src={displayRoom.hostAvatar}
                    alt={displayRoom.hostName}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate max-w-[100px]">{displayRoom.hostName}</p>
                    <p className="text-[10px] text-slate-300 tabular-nums">{displayRoom.followersCount} seguidores</p>
                  </div>
                  {displayRoom.hostId !== currentUser.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFollow();
                      }}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer shrink-0 transition-colors ${
                        isFollowingHost ? 'bg-white/20 text-white' : 'bg-rose-600 hover:bg-rose-500 text-white'
                      }`}
                    >
                      {isFollowingHost ? 'Siguiendo' : 'Seguir'}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-black/55 backdrop-blur-md text-white text-xs font-bold tabular-nums border border-white/10">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <Eye className="w-3.5 h-3.5 text-slate-200" />
                    <span>{displayRoom.viewerCount}</span>
                  </div>

                  <button
                    onClick={() => setViewMode('explore')}
                    title="Explorar salas en vivo"
                    className="min-h-[36px] px-2.5 rounded-xl bg-black/55 hover:bg-black/75 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1 border border-white/10 cursor-pointer tabular-nums"
                  >
                    <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{rooms.length}</span>
                  </button>

                  <button
                    onClick={() => setViewMode('setup')}
                    title="Transmitir En Vivo"
                    className="min-h-[36px] px-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Transmitir</span>
                  </button>

                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="min-h-[36px] min-w-[36px] rounded-xl bg-black/55 hover:bg-black/75 text-white flex items-center justify-center border border-white/10 cursor-pointer"
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Incoming Co-host Invitation Banner */}
              {incomingGuestInvite && incomingGuestInvite.roomId === displayRoom.id && (
                <div className="relative z-30 mx-3 mt-2 p-3 rounded-2xl bg-slate-900/95 border border-cyan-400/50 text-white flex items-center justify-between gap-2 shadow-xl">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-cyan-300">Invitación a pantalla dividida</p>
                    <p className="text-[11px] text-slate-200 truncate">{incomingGuestInvite.hostName} te invita a subir al LIVE</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        liveService.send('live:guest_respond', {
                          roomId: incomingGuestInvite.roomId,
                          targetUserId: currentUser.id,
                          accept: false
                        });
                        setIncomingGuestInvite(null);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-white/10 text-xs font-semibold cursor-pointer"
                    >
                      Rechazar
                    </button>
                    <button
                      onClick={() => {
                        liveService.send('live:guest_respond', {
                          roomId: incomingGuestInvite.roomId,
                          targetUserId: currentUser.id,
                          accept: true
                        });
                        setIncomingGuestInvite(null);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold cursor-pointer"
                    >
                      Aceptar
                    </button>
                  </div>
                </div>
              )}

              {/* Active Battle HUD & Split-Screen Co-hosts for Viewer */}
              {displayRoom.activeBattle && renderBattleHud(displayRoom.activeBattle, false, displayRoom.id)}
              {renderCoHostGrid(displayRoom, false)}

              {audioNeedsUnlock && !isViewerMuted && (
                <div className="relative z-20 mx-auto mt-3">
                  <button
                    onClick={handleUnlockAudio}
                    className="px-3.5 py-1.5 rounded-full bg-black/70 hover:bg-black/85 border border-white/20 text-white text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Tocar para activar audio en vivo</span>
                  </button>
                </div>
              )}

              {/* RIGHT-SIDE VERTICAL ACTION RAIL */}
              <div className="absolute right-2.5 bottom-20 z-20 flex flex-col items-center gap-2.5">
                {rooms.length > 1 && (
                  <div className="flex flex-col items-center gap-1 mb-0.5">
                    <button
                      onClick={goToPrevStream}
                      className="min-h-[36px] min-w-[36px] rounded-full bg-black/55 hover:bg-black/80 text-white flex items-center justify-center border border-white/15 cursor-pointer"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] font-bold text-white/80 tabular-nums">
                      {activeIndex + 1}/{rooms.length}
                    </span>
                    <button
                      onClick={goToNextStream}
                      className="min-h-[36px] min-w-[36px] rounded-full bg-black/55 hover:bg-black/80 text-white flex items-center justify-center border border-white/15 cursor-pointer"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <button onClick={() => handleSendReaction('❤️')} className="flex flex-col items-center gap-0.5 text-white cursor-pointer group">
                  <span className="min-h-[42px] min-w-[42px] rounded-full bg-black/55 group-hover:bg-rose-600/80 border border-white/15 flex items-center justify-center">
                    <Heart className="w-5 h-5 text-rose-400 fill-rose-500" />
                  </span>
                  <span className="text-[10px] font-semibold tabular-nums">{displayRoom.likesCount}</span>
                </button>

                <button
                  onClick={() => {
                    refreshWalletAndGifts();
                    setShowGiftSheet(true);
                  }}
                  className="flex flex-col items-center gap-0.5 text-white cursor-pointer group"
                >
                  <span className="min-h-[42px] min-w-[42px] rounded-full bg-black/55 group-hover:bg-amber-500/80 border border-white/15 flex items-center justify-center">
                    <Gift className="w-5 h-5 text-amber-400" />
                  </span>
                  <span className="text-[10px] font-semibold tabular-nums">{displayRoom.giftsCount}</span>
                </button>

                {displayRoom.hostId !== currentUser.id && !isViewerCoHost && (
                  <button
                    onClick={() => {
                      if (guestRequested) return;
                      liveService.send('live:guest_request', {
                        roomId: displayRoom.id,
                        userId: currentUser.id,
                        userName: currentUser.displayName,
                        userAvatar: currentUser.avatarUrl
                      });
                      setGuestRequested(true);
                      showTimedAlert('Solicitud enviada al anfitrión para subir a pantalla dividida.');
                    }}
                    className="flex flex-col items-center gap-0.5 text-white cursor-pointer"
                  >
                    <span className={`min-h-[42px] min-w-[42px] rounded-full border border-white/15 flex items-center justify-center ${
                      guestRequested ? 'bg-cyan-500/80 text-slate-950' : 'bg-black/55 hover:bg-cyan-500/70'
                    }`}>
                      <UserPlus className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-semibold">{guestRequested ? 'Enviado' : 'Subir'}</span>
                  </button>
                )}

                <button onClick={() => setShowShareModal(true)} className="flex flex-col items-center gap-0.5 text-white cursor-pointer">
                  <span className="min-h-[42px] min-w-[42px] rounded-full bg-black/55 hover:bg-cyan-500/80 border border-white/15 flex items-center justify-center">
                    <Share2 className="w-4 h-4 text-white" />
                  </span>
                  <span className="text-[10px] font-semibold">Compartir</span>
                </button>

                <button onClick={handleToggleViewerMute} className="flex flex-col items-center gap-0.5 text-white cursor-pointer">
                  <span className="min-h-[42px] min-w-[42px] rounded-full bg-black/55 hover:bg-black/80 border border-white/15 flex items-center justify-center">
                    {isViewerMuted ? <VolumeX className="w-4 h-4 text-slate-300" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
                  </span>
                </button>

                <button
                  onClick={() => setShowReportModal(true)}
                  title="Reportar transmisión"
                  className="flex flex-col items-center gap-0.5 text-white cursor-pointer"
                >
                  <span className="min-h-[38px] min-w-[38px] rounded-full bg-black/55 hover:bg-rose-600/75 border border-white/15 flex items-center justify-center">
                    <Flag className="w-4 h-4 text-slate-300" />
                  </span>
                </button>
              </div>

              {/* BOTTOM-LEFT: TITLE + PINNED + REAL-TIME CHAT + INPUT */}
              <div className="relative z-20 mt-auto p-3 pr-16 space-y-2">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-white leading-snug line-clamp-2">{displayRoom.title}</p>
                  <p className="text-[11px] text-slate-300">
                    @{displayRoom.hostUsername} · {displayRoom.category}
                    {displayRoom.description ? ` · ${displayRoom.description}` : ''}
                  </p>
                </div>

                {displayRoom.pinnedComment && (
                  <div className="px-2.5 py-1.5 rounded-xl bg-amber-500/25 border border-amber-400/40 text-xs text-white flex items-center gap-1.5 backdrop-blur-md">
                    <Pin className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span className="font-bold shrink-0">{displayRoom.pinnedComment.userName}:</span>
                    <span className="truncate">{displayRoom.pinnedComment.text}</span>
                  </div>
                )}

                <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                  {comments.map(c => (
                    <div
                      key={c.id}
                      onClick={() => {
                        if (isModUser(displayRoom) && c.type === 'chat') {
                          setSelectedModComment(c);
                        }
                      }}
                      className={`inline-block max-w-full px-2.5 py-1 rounded-xl text-xs mr-1 ${
                        isModUser(displayRoom) && c.type === 'chat' ? 'cursor-pointer hover:bg-black/75' : ''
                      } ${
                        c.type === 'gift'
                          ? 'bg-amber-500/35 text-amber-100 border border-amber-400/30'
                          : c.type === 'system'
                          ? 'bg-black/45 text-cyan-200'
                          : 'bg-black/50 text-white'
                      }`}
                    >
                      <span className="font-bold text-cyan-300 mr-1.5">{c.userName}</span>
                      <span className="break-words">{c.text}</span>
                    </div>
                  ))}
                  <div ref={commentsEndRef} />
                </div>

                <form onSubmit={handleSendComment} className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    value={commentInput}
                    onChange={e => setCommentInput(e.target.value)}
                    disabled={displayRoom.commentsEnabled === false && displayRoom.hostId !== currentUser.id}
                    placeholder={
                      displayRoom.commentsEnabled === false && displayRoom.hostId !== currentUser.id
                        ? 'Comentarios desactivados por el anfitrión'
                        : 'Añadir comentario en vivo...'
                    }
                    className="flex-1 min-h-[42px] px-3.5 rounded-xl bg-black/60 border border-white/20 text-xs text-white placeholder:text-slate-300 outline-none focus:border-cyan-400 backdrop-blur-md disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    className="min-h-[42px] min-w-[42px] rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}

      {/* ============================================================
          MODAL: AUTHORITATIVE GIFTS SHEET + WALLET BALANCE
         ============================================================ */}
      {showGiftSheet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-white/15 p-4 space-y-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Enviar regalo NAKEIC LIVE</h3>
                <p className="text-[11px] text-amber-400 font-semibold flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5" />
                  <span>{walletCoins !== null ? `${walletCoins} Coins disponibles` : 'Inicia sesión para ver tu saldo'}</span>
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setShowGiftSheet(false);
                    window.dispatchEvent(new CustomEvent('nakeic:open_wallet'));
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Recargar</span>
                </button>
                <button
                  onClick={() => setShowGiftSheet(false)}
                  className="min-h-[36px] min-w-[36px] rounded-xl hover:bg-white/10 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quantity selector */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-400 font-semibold">Cantidad:</span>
              <div className="flex items-center gap-1.5">
                {([1, 5, 10] as const).map(q => (
                  <button
                    key={q}
                    onClick={() => setGiftQuantity(q)}
                    className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                      giftQuantity === q ? 'bg-cyan-500 text-slate-950' : 'bg-white/10 text-slate-200'
                    }`}
                  >
                    {q}x
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {giftCatalog.map(gift => (
                <button
                  key={gift.id}
                  onClick={() => handleSendGift(gift)}
                  className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 flex flex-col items-center gap-1 cursor-pointer transition-colors"
                >
                  <span className="text-2xl">{gift.emoji}</span>
                  <span className="text-[11px] font-semibold truncate w-full text-center">{gift.name}</span>
                  <span className="text-[10px] text-amber-400 font-bold tabular-nums">{gift.coins * giftQuantity}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: GUESTS / CO-HOST REQUEST QUEUE (HOST)
         ============================================================ */}
      {showGuestsModal && hostingRoom && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 p-0 sm:p-4">
          <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-white/15 p-4 space-y-3 text-white">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Invitados y Co-Anfitriones ({hostingRoom.coHosts?.length || 0}/3)</h3>
              <button onClick={() => setShowGuestsModal(false)} className="p-1.5 rounded-xl hover:bg-white/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {(hostingRoom.guestRequests || []).length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No hay solicitudes pendientes de espectadores.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {hostingRoom.guestRequests?.map(req => (
                  <div key={req.userId} className="p-2.5 rounded-xl bg-white/5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={req.userAvatar} alt={req.userName} className="w-8 h-8 rounded-full object-cover" />
                      <span className="text-xs font-bold truncate">{req.userName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() =>
                          liveService.send('live:guest_respond', {
                            roomId: hostingRoom.id,
                            targetUserId: req.userId,
                            accept: false
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-white/10 text-xs cursor-pointer"
                      >
                        Rechazar
                      </button>
                      <button
                        onClick={() =>
                          liveService.send('live:guest_respond', {
                            roomId: hostingRoom.id,
                            targetUserId: req.userId,
                            accept: true
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold cursor-pointer"
                      >
                        Aceptar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: PK BATTLE CHALLENGER PICKER (HOST)
         ============================================================ */}
      {showBattleChallengeModal && hostingRoom && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 p-0 sm:p-4">
          <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-white/15 p-4 space-y-3 text-white">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <Swords className="w-4 h-4 text-amber-400" />
                <span>Retar a Batalla PK</span>
              </h3>
              <button onClick={() => setShowBattleChallengeModal(false)} className="p-1.5 rounded-xl hover:bg-white/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Duración:</span>
              <div className="flex items-center gap-1.5">
                {[60, 180, 300].map(sec => (
                  <button
                    key={sec}
                    onClick={() => setBattleDurationSec(sec)}
                    className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                      battleDurationSec === sec ? 'bg-amber-500 text-slate-950' : 'bg-white/10 text-slate-200'
                    }`}
                  >
                    {sec / 60} min
                  </button>
                ))}
              </div>
            </div>

            {opponentRooms.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No hay otros creadores en vivo disponibles para batalla en este instante.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {opponentRooms.map(opp => (
                  <div key={opp.id} className="p-2.5 rounded-xl bg-white/5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={opp.hostAvatar} alt={opp.hostName} className="w-8 h-8 rounded-full object-cover" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{opp.hostName}</p>
                        <p className="text-[10px] text-slate-400 truncate">{opp.viewerCount} espectadores</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        liveService.send('live:battle_challenge', {
                          roomId: hostingRoom.id,
                          opponentRoomId: opp.id,
                          durationSeconds: battleDurationSec
                        });
                        setShowBattleChallengeModal(false);
                        showTimedAlert(`Invitación de batalla enviada a ${opp.hostName}.`);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold cursor-pointer shrink-0"
                    >
                      Retar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: COMMENT & USER MODERATION ACTIONS (HOST / MOD)
         ============================================================ */}
      {selectedModComment && (hostingRoom || displayRoom) && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 p-0 sm:p-4">
          <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-white/15 p-4 space-y-2.5 text-white">
            <div className="flex items-center justify-between pb-1 border-b border-white/10">
              <div className="min-w-0">
                <p className="text-xs font-bold text-cyan-300">{selectedModComment.userName}</p>
                <p className="text-xs text-slate-300 truncate">{selectedModComment.text}</p>
              </div>
              <button onClick={() => setSelectedModComment(null)} className="p-1.5 rounded-xl hover:bg-white/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const modRoom = (viewMode === 'broadcast' ? hostingRoom : displayRoom)!;
              const isOwner = isHostUser(modRoom);
              const modsList = modRoom.moderatorIds || modRoom.moderators || [];
              const targetIsMod = modsList.includes(selectedModComment.userId);
              return (
                <div className="space-y-1.5 text-xs">
                  {isOwner && (
                    <button
                      onClick={() => {
                        handlePinComment(selectedModComment);
                        setSelectedModComment(null);
                      }}
                      className="w-full px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                    >
                      <Pin className="w-4 h-4 text-amber-400" />
                      <span>Fijar / Desfijar comentario</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      liveService.send('live:mod_delete_comment', {
                        roomId: modRoom.id,
                        commentId: selectedModComment.id
                      });
                      setSelectedModComment(null);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-slate-300" />
                    <span>Eliminar comentario</span>
                  </button>
                  {selectedModComment.userId !== modRoom.hostId && (
                    <>
                      <button
                        onClick={() => {
                          liveService.send('live:mod_mute', {
                            roomId: modRoom.id,
                            targetUserId: selectedModComment.userId,
                            targetName: selectedModComment.userName,
                            durationSeconds: 300
                          });
                          setSelectedModComment(null);
                        }}
                        className="w-full px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                      >
                        <VolumeX className="w-4 h-4 text-amber-400" />
                        <span>Silenciar usuario 5 minutos</span>
                      </button>
                      <button
                        onClick={() => {
                          liveService.send('live:mod_ban', {
                            roomId: modRoom.id,
                            targetUserId: selectedModComment.userId,
                            targetName: selectedModComment.userName,
                            reason: 'Expulsado por moderación'
                          });
                          setSelectedModComment(null);
                        }}
                        className="w-full px-3 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 flex items-center gap-2 cursor-pointer"
                      >
                        <UserMinus className="w-4 h-4" />
                        <span>Expulsar de la sala en vivo</span>
                      </button>
                      {isOwner && (
                        <button
                          onClick={() => {
                            liveService.send('live:mod_assign', {
                              roomId: modRoom.id,
                              targetUserId: selectedModComment.userId,
                              assign: !targetIsMod
                            });
                            setSelectedModComment(null);
                          }}
                          className="w-full px-3 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 flex items-center gap-2 cursor-pointer"
                        >
                          <Shield className="w-4 h-4" />
                          <span>{targetIsMod ? 'Quitar rol de Moderador' : 'Asignar como Moderador'}</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: HOST MODERATION DRAWER, BANNED WORDS & AUDIT LOGS
         ============================================================ */}
      {showModDrawer && hostingRoom && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 p-0 sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-white/15 p-4 space-y-3 text-white max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Moderación y Seguridad LIVE</span>
              </h3>
              <button onClick={() => setShowModDrawer(false)} className="p-1.5 rounded-xl hover:bg-white/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto flex-1 pr-1">
              <button
                onClick={() =>
                  liveService.send('live:state_update', {
                    roomId: hostingRoom.id,
                    commentsEnabled: hostingRoom.commentsEnabled === false
                  })
                }
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs cursor-pointer"
              >
                <span>Chat de comentarios en vivo</span>
                <span className={`font-bold ${hostingRoom.commentsEnabled !== false ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {hostingRoom.commentsEnabled !== false ? 'Activo' : 'Desactivado'}
                </span>
              </button>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-300">
                  Palabras restringidas (separadas por coma)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={bannedWordsInput}
                    onChange={e => setBannedWordsInput(e.target.value)}
                    placeholder="spam, estafa, insulto"
                    className="flex-1 px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-xs text-white outline-none"
                  />
                  <button
                    onClick={() => {
                      const words = bannedWordsInput.split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
                      liveService.send('live:mod_banned_words', { roomId: hostingRoom.id, bannedWords: words });
                    }}
                    className="px-3 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold cursor-pointer"
                  >
                    Guardar
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Registro de auditoría</p>
                {modLogs.length === 0 ? (
                  <p className="text-xs text-slate-500">Sin acciones de moderación en esta sala.</p>
                ) : (
                  modLogs.map(log => (
                    <div key={log.id} className="p-2 rounded-xl bg-white/5 text-[11px] space-y-0.5">
                      <p className="font-bold text-cyan-300">{log.actorName} · {log.action}</p>
                      {log.details && <p className="text-slate-300">{log.details}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: REPORT LIVE STREAM
         ============================================================ */}
      {showReportModal && displayRoom && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 p-0 sm:p-4">
          <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-white/15 p-4 space-y-3 text-white">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <Flag className="w-4 h-4 text-rose-400" />
                <span>Reportar transmisión</span>
              </h3>
              <button onClick={() => setShowReportModal(false)} className="p-1.5 rounded-xl hover:bg-white/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSubmittedMsg ? (
              <p className="text-xs text-emerald-400 font-semibold py-4 text-center">{reportSubmittedMsg}</p>
            ) : (
              <>
                <select
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/15 text-xs text-white"
                >
                  <option value="Contenido inapropiado">Contenido inapropiado</option>
                  <option value="Fraude o estafa">Fraude o estafa</option>
                  <option value="Acoso o discurso de odio">Acoso o discurso de odio</option>
                  <option value="Spam">Spam</option>
                </select>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={e => setReportDetails(e.target.value)}
                  placeholder="Detalles adicionales para moderación..."
                  className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-xs text-white placeholder:text-slate-400 outline-none"
                />
                <button
                  onClick={handleSubmitReport}
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
                >
                  Enviar Reporte
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: SHARE LIVE TO NAKEIC CHATS OR COPY LINK
         ============================================================ */}
      {showShareModal && displayRoom && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-white/15 p-4 space-y-3 text-white max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold">Compartir transmisión</h3>
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setSharedConvIds([]);
                }}
                className="min-h-[36px] min-w-[36px] rounded-xl hover:bg-white/10 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href).catch(() => {});
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
              }}
              className="w-full min-h-[42px] px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-between text-xs font-semibold cursor-pointer shrink-0"
            >
              <span>{copiedLink ? 'Enlace copiado al portapapeles' : 'Copiar enlace de NAKEIC Live'}</span>
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
            </button>

            <p className="text-[11px] font-semibold text-slate-400 pt-1 shrink-0">Enviar a un chat de NAKEIC</p>
            <div className="flex-1 overflow-y-auto space-y-1.5">
              {conversations.slice(0, 12).map(conv => {
                const isSent = sharedConvIds.includes(conv.id);
                return (
                  <div key={conv.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img src={conv.avatarUrl} alt={conv.title} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover shrink-0" />
                      <span className="text-xs font-semibold truncate">{conv.title}</span>
                    </div>
                    <button
                      onClick={() => !isSent && handleShareToConversation(conv.id)}
                      disabled={isSent}
                      className={`min-h-[34px] px-3 rounded-lg text-xs font-bold cursor-pointer shrink-0 ${
                        isSent ? 'bg-emerald-500/20 text-emerald-300' : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                      }`}
                    >
                      {isSent ? 'Enviado' : 'Enviar'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
