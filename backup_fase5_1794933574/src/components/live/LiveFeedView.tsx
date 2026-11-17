import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Radio,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Heart,
  MessageCircle,
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
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LiveComment, LiveGift, LiveStreamRoom } from '../../types';
import { liveService, startLiveAudioCapture, LiveAudioPlayer } from '../../services/liveService';

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
}

const LIVE_CATEGORIES = ['General', 'Charla', 'Música', 'Gaming', 'Negocios', 'Tecnología', 'Educación'];

const LIVE_GIFTS: LiveGift[] = [
  { id: 'gift_rose', name: 'Rosa', emoji: '🌹', coins: 1 },
  { id: 'gift_fire', name: 'Fuego', emoji: '🔥', coins: 5 },
  { id: 'gift_star', name: 'Estrella', emoji: '⭐', coins: 10 },
  { id: 'gift_diamond', name: 'Diamante', emoji: '💎', coins: 50 },
  { id: 'gift_crown', name: 'Corona', emoji: '👑', coins: 100 }
];

interface LiveFeedViewProps {
  onCountChange?: (count: number) => void;
  onExitToChats?: () => void;
}

export const LiveFeedView: React.FC<LiveFeedViewProps> = ({ onCountChange, onExitToChats }) => {
  const { currentUser, conversations, sendMessage, theme } = useApp();

  // Room discovery & selection state
  const [rooms, setRooms] = useState<LiveStreamRoom[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'feed' | 'explore' | 'setup' | 'broadcast' | 'ended'>('feed');
  const [exploreCategory, setExploreCategory] = useState<string>('Todas');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);

  // Active viewed stream real-time state
  const [activeRoomSnapshot, setActiveRoomSnapshot] = useState<LiveStreamRoom | null>(null);
  const [liveFrameUrl, setLiveFrameUrl] = useState<string | null>(null);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [commentInput, setCommentInput] = useState<string>('');
  const [isFollowingHost, setIsFollowingHost] = useState<boolean>(false);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [activeGiftBanner, setActiveGiftBanner] = useState<GiftAnimationBanner | null>(null);
  const [showGiftSheet, setShowGiftSheet] = useState<boolean>(false);
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
    wasHost: boolean;
  } | null>(null);

  // Broadcaster Setup & Active Broadcast state
  const [streamTitle, setStreamTitle] = useState<string>('En vivo desde NAKEIC');
  const [streamCategory, setStreamCategory] = useState<string>('Charla');
  const [sourceMode, setSourceMode] = useState<'camera' | 'screen' | 'studio'>('camera');
  const [isFrontCamera, setIsFrontCamera] = useState<boolean>(true);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [isVideoPaused, setIsVideoPaused] = useState<boolean>(false);
  const [hardwareError, setHardwareError] = useState<string | null>(null);
  const [hostingRoom, setHostingRoom] = useState<LiveStreamRoom | null>(null);
  const [broadcastElapsed, setBroadcastElapsed] = useState<number>(0);
  const [studioBannerText, setStudioBannerText] = useState<string>('Transmitiendo En Vivo por NAKEIC');
  const [studioAccent, setStudioAccent] = useState<string>('#06B6D4');

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
  const activeRoomSnapshotRef = useRef<LiveStreamRoom | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const commentsEndRef = useRef<HTMLDivElement | null>(null);

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

  // Auto-scroll live comments smoothly
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  const spawnFloatingReaction = useCallback((emoji: string, customX?: number, customY?: number) => {
    const id = `react_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const x = customX ?? 72 + Math.random() * 20;
    const y = customY ?? 55 + Math.random() * 20;
    setFloatingReactions(prev => [...prev.slice(-18), { id, emoji, x, y }]);
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== id));
    }, 1400);
  }, []);

  // Connect to /ws/live and subscribe to all live stream events
  useEffect(() => {
    liveService.connect();
    audioPlayerRef.current = new LiveAudioPlayer();

    // Initial REST fetch as fast fallback before WS snapshot
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
      const nextRooms: LiveStreamRoom[] = d?.rooms || [];
      setRooms(nextRooms);
      onCountChange?.(nextRooms.length);
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
        setHostingRoom(d.room);
        setComments(d.room.comments || []);
        setBroadcastElapsed(0);
        setViewMode('broadcast');
      }
    });

    const unsubSnapshot = liveService.on('live:room_snapshot', (d) => {
      if (!d?.room) return;
      setActiveRoomSnapshot(d.room);
      setLiveFrameUrl(d.room.lastFrame || null);
      setComments(d.room.comments || []);
      setIsFollowingHost(!!d.isFollowing);
    });

    const unsubFrame = liveService.on('live:media_frame', (d) => {
      if (d?.roomId && d.roomId === joinedRoomIdRef.current && d.frameData) {
        setLiveFrameUrl(d.frameData);
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
          giftEmoji: d.giftEmoji || '🎁'
        });
        setTimeout(() => setActiveGiftBanner(null), 2600);

        if (d.roomId === joinedRoomIdRef.current) {
          setActiveRoomSnapshot(prev =>
            prev ? { ...prev, giftsCount: d.giftsCount, likesCount: d.likesCount } : prev
          );
        }
        if (d.roomId === hostingRoomIdRef.current) {
          setHostingRoom(prev =>
            prev ? { ...prev, giftsCount: d.giftsCount, likesCount: d.likesCount } : prev
          );
        }
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
      if (d.roomId === joinedRoomIdRef.current) {
        setActiveRoomSnapshot(prev =>
          prev
            ? {
                ...prev,
                isAudioMuted: d.isAudioMuted ?? prev.isAudioMuted,
                isVideoPaused: d.isVideoPaused ?? prev.isVideoPaused,
                title: d.title ?? prev.title,
                pinnedComment: d.pinnedComment !== undefined ? d.pinnedComment : prev.pinnedComment
              }
            : prev
        );
      }
      if (d.roomId === hostingRoomIdRef.current) {
        setHostingRoom(prev =>
          prev
            ? {
                ...prev,
                pinnedComment: d.pinnedComment !== undefined ? d.pinnedComment : prev.pinnedComment
              }
            : prev
        );
      }
    });

    const unsubEnded = liveService.on('live:ended', (d) => {
      if (!d?.roomId) return;
      if (d.roomId === joinedRoomIdRef.current) {
        joinedRoomIdRef.current = null;
        const latestRoom = activeRoomSnapshotRef.current;
        setEndedSummary(prev => ({
          hostName: latestRoom?.hostName || prev?.hostName || 'Anfitrión',
          title: latestRoom?.title || prev?.title || 'Transmisión En Vivo',
          durationSeconds: d.summary?.durationSeconds || 0,
          peakViewers: d.summary?.peakViewers || 0,
          likesCount: d.summary?.likesCount || 0,
          giftsCount: d.summary?.giftsCount || 0,
          wasHost: false
        }));
        setActiveRoomSnapshot(null);
        setLiveFrameUrl(null);
        setViewMode('ended');
      }
    });

    return () => {
      unsubConn();
      unsubList();
      unsubStats();
      unsubStarted();
      unsubSnapshot();
      unsubFrame();
      unsubAudio();
      unsubViewer();
      unsubComment();
      unsubReaction();
      unsubGift();
      unsubFollow();
      unsubStateUpdate();
      unsubEnded();
      if (joinedRoomIdRef.current) {
        liveService.send('live:leave', { roomId: joinedRoomIdRef.current });
        joinedRoomIdRef.current = null;
      }
      audioPlayerRef.current?.dispose();
    };
  }, [currentUser.id, onCountChange, spawnFloatingReaction]);

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
    }

    if (targetRoomId) {
      joinedRoomIdRef.current = targetRoomId;
      setLiveFrameUrl(currentFeedRoom?.lastFrame || null);
      setActiveRoomSnapshot(currentFeedRoom);
      setComments([]);
      liveService.send('live:join', {
        roomId: targetRoomId,
        viewerId: currentUser.id,
        viewerName: currentUser.displayName,
        viewerAvatar: currentUser.avatarUrl
      });
    } else {
      setActiveRoomSnapshot(null);
      setLiveFrameUrl(null);
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

  // Cleanup broadcast media on unmount
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
      // Optionally try audio-only mic so host can speak over studio visual canvas
      try {
        if (navigator.mediaDevices?.getUserMedia) {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          broadcastStreamRef.current = micStream;
        }
      } catch {
        // Silent studio mode allowed if no mic hardware exists
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
      } catch (err: any) {
        setHardwareError('No se pudo capturar pantalla. Cambia a Cámara o Estudio Visual.');
        setSourceMode('studio');
      }
      return;
    }

    // Default: Camera + Mic
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

  // Attach active MediaStream to <video> whenever switching between setup and broadcast
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

      // Clean geometric acoustic waves reacting softly in real time
      ctx.strokeStyle = studioAccent + '66';
      ctx.lineWidth = 2;
      for (let ring = 0; ring < 3; ring++) {
        const radius = 78 + ring * 26 + Math.sin(tick * 2 + ring) * 6;
        ctx.beginPath();
        ctx.arc(w / 2, h * 0.42, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Host monogram center badge
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

      // Live banner headline
      ctx.fillStyle = '#F8FAFC';
      ctx.font = 'bold 22px sans-serif';
      const titleText = studioBannerText.slice(0, 36);
      ctx.fillText(titleText, w / 2, h * 0.57);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '15px sans-serif';
      ctx.fillText(`@${currentUser.username} · NAKEIC Live`, w / 2, h * 0.62);

      // Equalizer bars at bottom-center
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

  // Broadcaster frame & audio streaming pump while live
  useEffect(() => {
    if (viewMode !== 'broadcast' || !hostingRoom?.id) return;

    const roomId = hostingRoom.id;
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = 450;
    captureCanvas.height = 800;
    const captureCtx = captureCanvas.getContext('2d');

    // Elapsed clock
    const secTimer = setInterval(() => {
      setBroadcastElapsed(prev => prev + 1);
    }, 1000);

    // Start microphone PCM capture if stream has audio
    if (broadcastStreamRef.current) {
      audioCleanupRef.current = startLiveAudioCapture(
        broadcastStreamRef.current,
        isMicMutedRef,
        (pcmBase64, sampleRate) => {
          liveService.send('live:media_audio', { roomId, pcmBase64, sampleRate });
        }
      );
    }

    // Adaptive 12-14 FPS video frame pump
    frameTimerRef.current = setInterval(() => {
      if (isVideoPausedRef.current) return;
      if (liveService.getBufferedAmount() > 350 * 1024) return;
      if (!captureCtx) return;

      if (sourceMode === 'studio' && studioCanvasRef.current) {
        captureCtx.drawImage(studioCanvasRef.current, 0, 0, captureCanvas.width, captureCanvas.height);
        const frameData = captureCanvas.toDataURL('image/jpeg', 0.65);
        liveService.send('live:media_frame', { roomId, frameData, timestamp: Date.now() });
      } else if (previewVideoRef.current && previewVideoRef.current.readyState >= 2) {
        const vid = previewVideoRef.current;
        const vw = vid.videoWidth || 450;
        const vh = vid.videoHeight || 800;
        // Center-crop / cover fit into 450x800 vertical frame
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
        const frameData = captureCanvas.toDataURL('image/jpeg', 0.62);
        liveService.send('live:media_frame', { roomId, frameData, timestamp: Date.now() });
      }
    }, 75);

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
  }, [viewMode, hostingRoom?.id, sourceMode, isFrontCamera]);

  // Actions
  const handleStartBroadcast = () => {
    liveService.connect();
    const token = localStorage.getItem('nakeic_auth_token') || undefined;
    liveService.send('live:start', {
      title: streamTitle.trim() || 'Transmisión en vivo por NAKEIC',
      category: streamCategory,
      sourceMode,
      hostId: currentUser.id,
      hostName: currentUser.displayName,
      hostUsername: currentUser.username,
      hostAvatar: currentUser.avatarUrl,
      token
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
        wasHost: true
      });
    }
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
    liveService.send('live:gift', {
      roomId: targetRoomId,
      userId: currentUser.id,
      userName: currentUser.displayName,
      userAvatar: currentUser.avatarUrl,
      giftId: gift.id,
      giftName: gift.name,
      giftEmoji: gift.emoji,
      coins: gift.coins
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

  // Vertical swipe navigation between streams (TikTok-style)
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

  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden'
    : 'flex-1 flex flex-col relative overflow-hidden bg-slate-950';

  const displayRoom = activeRoomSnapshot || currentFeedRoom;
  const filteredExploreRooms = rooms.filter(r => exploreCategory === 'Todas' || r.category === exploreCategory);

  return (
    <div className={containerClass}>
      {/* ============================================================
          VIEW 1: SETUP / GO LIVE STUDIO PREPARATION
         ============================================================ */}
      {viewMode === 'setup' && (
        <div className="flex-1 flex flex-col relative bg-slate-950 overflow-hidden">
          {/* Background Live Hardware / Studio Preview */}
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

          {/* Scrim for legible UI */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/35 to-black/90 pointer-events-none" />

          {/* Header Controls */}
          <div className="relative z-10 px-4 pt-3 pb-2 flex items-center justify-between">
            <button
              onClick={() => {
                stopLocalBroadcastMedia();
                setViewMode('feed');
              }}
              className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-black/50 hover:bg-black/70 text-white flex items-center gap-1.5 text-xs font-semibold cursor-pointer backdrop-blur-md"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </button>

            <span className="text-sm font-bold text-white tracking-tight">Configurar En Vivo</span>

            <div className="flex items-center gap-1.5">
              {sourceMode === 'camera' && (
                <button
                  onClick={() => setIsFrontCamera(!isFrontCamera)}
                  title="Cambiar cámara frontal/trasera"
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-black/50 hover:bg-black/70 text-white flex items-center justify-center cursor-pointer backdrop-blur-md"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                className="min-h-[44px] min-w-[44px] rounded-xl bg-black/50 hover:bg-black/70 text-white flex items-center justify-center cursor-pointer backdrop-blur-md"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Setup Form Overlay */}
          <div className="relative z-10 flex-1 flex flex-col justify-end p-4 gap-3 overflow-y-auto">
            {hardwareError && (
              <div className="px-3.5 py-2.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-medium backdrop-blur-md">
                {hardwareError}
              </div>
            )}

            {/* Source Switcher */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSourceMode('camera')}
                className={`min-h-[44px] px-2 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
                  sourceMode === 'camera'
                    ? 'bg-rose-600 border-rose-500 text-white'
                    : 'bg-black/55 border-white/15 text-slate-200 hover:bg-black/75'
                }`}
              >
                <Video className="w-4 h-4 shrink-0" />
                <span className="truncate">Cámara</span>
              </button>
              <button
                onClick={() => setSourceMode('screen')}
                className={`min-h-[44px] px-2 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
                  sourceMode === 'screen'
                    ? 'bg-rose-600 border-rose-500 text-white'
                    : 'bg-black/55 border-white/15 text-slate-200 hover:bg-black/75'
                }`}
              >
                <Monitor className="w-4 h-4 shrink-0" />
                <span className="truncate">Pantalla</span>
              </button>
              <button
                onClick={() => setSourceMode('studio')}
                className={`min-h-[44px] px-2 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
                  sourceMode === 'studio'
                    ? 'bg-rose-600 border-rose-500 text-white'
                    : 'bg-black/55 border-white/15 text-slate-200 hover:bg-black/75'
                }`}
              >
                <Palette className="w-4 h-4 shrink-0" />
                <span className="truncate">Estudio</span>
              </button>
            </div>

            {/* Stream Details Card */}
            <div className="p-3.5 rounded-2xl bg-black/65 border border-white/15 backdrop-blur-md space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Título de tu transmisión
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={streamTitle}
                  onChange={e => setStreamTitle(e.target.value)}
                  placeholder="Ej: Charlando en vivo, música, noticias..."
                  className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/15 text-sm text-white placeholder:text-slate-400 outline-none focus:border-cyan-400"
                />
              </div>

              {sourceMode === 'studio' && (
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-300">
                    Texto en pantalla (Estudio Visual)
                  </label>
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
                          className={`w-7 h-7 rounded-lg cursor-pointer border-2 ${
                            studioAccent === c ? 'border-white scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                  Categoría
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  {LIVE_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setStreamCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                        streamCategory === cat
                          ? 'bg-cyan-500 text-slate-950'
                          : 'bg-white/10 text-slate-200 hover:bg-white/15'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Primary Go Live Action */}
            <button
              onClick={handleStartBroadcast}
              disabled={!isWsConnected}
              className="w-full min-h-[48px] py-3.5 px-5 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-rose-600/30 active:scale-[0.98] transition-all cursor-pointer"
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

          {/* Scrims */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-transparent to-black/90 pointer-events-none z-10" />

          {/* Floating Hearts */}
          <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
            {floatingReactions.map(r => (
              <div
                key={r.id}
                className="absolute text-2xl animate-bounce"
                style={{ left: `${r.x}%`, top: `${r.y}%` }}
              >
                {r.emoji}
              </div>
            ))}
          </div>

          {/* Gift Banner */}
          {activeGiftBanner && (
            <div className="absolute top-20 left-4 right-4 z-30 flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/90 to-rose-600/90 text-white shadow-xl backdrop-blur-md">
              <span className="text-2xl">{activeGiftBanner.giftEmoji}</span>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">{activeGiftBanner.userName}</p>
                <p className="text-[11px] opacity-90">Envió {activeGiftBanner.giftName}</p>
              </div>
            </div>
          )}

          {/* Top Broadcaster HUD */}
          <div className="relative z-20 px-3 pt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold shrink-0">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>EN VIVO</span>
                <span className="font-mono tabular-nums ml-1">{formatDuration(broadcastElapsed)}</span>
              </div>

              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-black/55 text-white text-xs font-semibold tabular-nums backdrop-blur-md shrink-0">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>{hostingRoom.viewerCount}</span>
              </div>

              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-black/55 text-white text-xs font-semibold tabular-nums backdrop-blur-md shrink-0">
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                <span>{hostingRoom.likesCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="min-h-[40px] min-w-[40px] rounded-xl bg-black/55 text-white flex items-center justify-center cursor-pointer"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={handleStopBroadcast}
                className="min-h-[40px] px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                Finalizar
              </button>
            </div>
          </div>

          {/* Bottom Comments & Controls */}
          <div className="relative z-20 mt-auto p-3 space-y-2.5">
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

            {/* Real-time Viewer Comments */}
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-2">
              {comments.map(c => (
                <button
                  key={c.id}
                  onClick={() => c.type === 'chat' && handlePinComment(c)}
                  title={c.type === 'chat' ? 'Toca para fijar comentario' : undefined}
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

            {/* Host Reply & Hardware Control Bar */}
            <div className="flex items-center gap-2">
              <form onSubmit={handleSendComment} className="flex-1 flex items-center gap-1.5">
                <input
                  type="text"
                  value={commentInput}
                  onChange={e => setCommentInput(e.target.value)}
                  placeholder="Responder al chat en vivo..."
                  className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-black/60 border border-white/20 text-xs text-white placeholder:text-slate-300 outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-cyan-500 text-slate-950 flex items-center justify-center cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              <button
                onClick={handleToggleMic}
                title={isMicMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
                className={`min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center cursor-pointer ${
                  isMicMuted ? 'bg-rose-600 text-white' : 'bg-black/60 border border-white/20 text-white'
                }`}
              >
                {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button
                onClick={handleToggleVideoPause}
                title={isVideoPaused ? 'Reanudar video' : 'Pausar video'}
                className={`min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center cursor-pointer ${
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
                  title="Voltear cámara"
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-black/60 border border-white/20 text-white flex items-center justify-center cursor-pointer"
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
                <p className="text-[11px] text-slate-400">Regalos</p>
                <p className="text-lg font-bold tabular-nums text-amber-400">{endedSummary.giftsCount}</p>
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
          VIEW 4: EXPLORE ALL ACTIVE LIVE ROOMS GRID
         ============================================================ */}
      {viewMode === 'explore' && (
        <div className="flex-1 flex flex-col bg-slate-950 text-white overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('feed')}
                className="min-h-[40px] min-w-[40px] rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-sm font-bold leading-tight">Salas En Vivo ({rooms.length})</h2>
                <p className="text-[11px] text-slate-400">Sin límite de transmisiones ni espectadores</p>
              </div>
            </div>

            <button
              onClick={() => setViewMode('setup')}
              className="min-h-[40px] px-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Transmitir</span>
            </button>
          </div>

          {/* Categories */}
          <div className="px-4 py-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-white/5 shrink-0">
            {['Todas', ...LIVE_CATEGORIES].map(cat => (
              <button
                key={cat}
                onClick={() => setExploreCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                  exploreCategory === cat
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {filteredExploreRooms.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <p className="text-sm text-slate-400">No hay transmisiones activas en esta categoría.</p>
                <button
                  onClick={() => setViewMode('setup')}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
                >
                  Ser el primero en transmitir
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredExploreRooms.map((room) => {
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
                      {room.lastFrame ? (
                        <img
                          src={room.lastFrame}
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
          VIEW 5: TIKTOK-STYLE VERTICAL LIVE STREAM FEED (VIEWER)
         ============================================================ */}
      {viewMode === 'feed' && (
        <div
          className="flex-1 flex flex-col relative bg-black overflow-hidden select-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Empty State when 0 broadcasters are live */}
          {rooms.length === 0 || !displayRoom ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white">
              <div className="w-20 h-20 rounded-3xl bg-rose-600/15 border border-rose-500/30 flex items-center justify-center mb-4">
                <Radio className="w-10 h-10 text-rose-500" />
              </div>
              <h2 className="text-lg font-bold tracking-tight mb-1.5">
                NAKEIC Video En Vivo
              </h2>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-6">
                Transmite video y audio en tiempo real o mira cualquier transmisión activa en formato vertical, sin límite de creadores ni espectadores.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-xs">
                <button
                  onClick={() => setViewMode('setup')}
                  className="w-full min-h-[48px] px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-600/25 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                  <span>Transmitir En Vivo</span>
                </button>
                {onExitToChats && (
                  <button
                    onClick={onExitToChats}
                    className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Volver a Chats
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Live Stream Video Canvas */}
              <div
                onClick={handleVideoSurfaceTap}
                className="absolute inset-0 w-full h-full flex items-center justify-center bg-slate-950 cursor-pointer"
              >
                {displayRoom.isVideoPaused ? (
                  <div className="flex flex-col items-center justify-center text-white gap-2">
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
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-6 gap-3">
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

              {/* Contrast Scrims (WCAG 4.5:1) */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-transparent to-black/90 pointer-events-none" />

              {/* Floating Hearts */}
              <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
                {floatingReactions.map(r => (
                  <div
                    key={r.id}
                    className="absolute text-3xl animate-bounce"
                    style={{ left: `${r.x}%`, top: `${r.y}%` }}
                  >
                    {r.emoji}
                  </div>
                ))}
              </div>

              {/* Gift Arrival Banner */}
              {activeGiftBanner && (
                <div className="absolute top-20 left-3 right-16 z-30 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-amber-500/95 to-rose-600/95 text-white shadow-xl">
                  <span className="text-2xl">{activeGiftBanner.giftEmoji}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{activeGiftBanner.userName}</p>
                    <p className="text-[11px] opacity-95">Envió {activeGiftBanner.giftName}</p>
                  </div>
                </div>
              )}

              {/* TOP BAR: Broadcaster Info + Live Viewers + Explore + Go Live */}
              <div className="relative z-20 px-3 pt-3 flex items-center justify-between gap-2">
                {/* Broadcaster Pill */}
                <div className="flex items-center gap-2 min-w-0 bg-black/50 backdrop-blur-md p-1 pr-2.5 rounded-full border border-white/10">
                  <img
                    src={displayRoom.hostAvatar}
                    alt={displayRoom.hostName}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate max-w-[105px]">
                      {displayRoom.hostName}
                    </p>
                    <p className="text-[10px] text-slate-300 tabular-nums">
                      {displayRoom.followersCount} seguidores
                    </p>
                  </div>
                  {displayRoom.hostId !== currentUser.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFollow();
                      }}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer shrink-0 transition-colors ${
                        isFollowingHost
                          ? 'bg-white/20 text-white'
                          : 'bg-rose-600 hover:bg-rose-500 text-white'
                      }`}
                    >
                      {isFollowingHost ? 'Siguiendo' : 'Seguir'}
                    </button>
                  )}
                </div>

                {/* Live Viewer Count & Quick Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-black/55 backdrop-blur-md text-white text-xs font-bold tabular-nums border border-white/10">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <Eye className="w-3.5 h-3.5 text-slate-200" />
                    <span>{displayRoom.viewerCount}</span>
                  </div>

                  <button
                    onClick={() => setViewMode('explore')}
                    title="Ver todas las salas en vivo"
                    className="min-h-[38px] px-2.5 rounded-xl bg-black/55 hover:bg-black/75 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1 border border-white/10 cursor-pointer tabular-nums"
                  >
                    <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{rooms.length}</span>
                  </button>

                  <button
                    onClick={() => setViewMode('setup')}
                    title="Transmitir En Vivo"
                    className="min-h-[38px] px-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Transmitir</span>
                  </button>

                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    title={isFullscreen ? 'Minimizar' : 'Pantalla completa'}
                    className="min-h-[38px] min-w-[38px] rounded-xl bg-black/55 hover:bg-black/75 text-white flex items-center justify-center border border-white/10 cursor-pointer"
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Audio Unlock Prompt if Autoplay Suspended */}
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

              {/* RIGHT-SIDE TIKTOK VERTICAL ACTION RAIL */}
              <div className="absolute right-2.5 bottom-20 z-20 flex flex-col items-center gap-3">
                {rooms.length > 1 && (
                  <div className="flex flex-col items-center gap-1 mb-1">
                    <button
                      onClick={goToPrevStream}
                      title="Transmisión anterior"
                      className="min-h-[40px] min-w-[40px] rounded-full bg-black/55 hover:bg-black/80 text-white flex items-center justify-center border border-white/15 cursor-pointer"
                    >
                      <ChevronUp className="w-5 h-5" />
                    </button>
                    <span className="text-[10px] font-bold text-white/80 tabular-nums">
                      {activeIndex + 1}/{rooms.length}
                    </span>
                    <button
                      onClick={goToNextStream}
                      title="Siguiente transmisión"
                      className="min-h-[40px] min-w-[40px] rounded-full bg-black/55 hover:bg-black/80 text-white flex items-center justify-center border border-white/15 cursor-pointer"
                    >
                      <ChevronDown className="w-5 h-5" />
                    </button>
                  </div>
                )}

                <button
                  onClick={() => handleSendReaction('❤️')}
                  className="flex flex-col items-center gap-0.5 text-white cursor-pointer group"
                >
                  <span className="min-h-[44px] min-w-[44px] rounded-full bg-black/55 group-hover:bg-rose-600/80 border border-white/15 flex items-center justify-center transition-colors">
                    <Heart className="w-5 h-5 text-rose-400 group-hover:text-white fill-rose-500" />
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums">{displayRoom.likesCount}</span>
                </button>

                <button
                  onClick={() => setShowGiftSheet(true)}
                  className="flex flex-col items-center gap-0.5 text-white cursor-pointer group"
                >
                  <span className="min-h-[44px] min-w-[44px] rounded-full bg-black/55 group-hover:bg-amber-500/80 border border-white/15 flex items-center justify-center transition-colors">
                    <Gift className="w-5 h-5 text-amber-400 group-hover:text-white" />
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums">{displayRoom.giftsCount}</span>
                </button>

                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex flex-col items-center gap-0.5 text-white cursor-pointer group"
                >
                  <span className="min-h-[44px] min-w-[44px] rounded-full bg-black/55 group-hover:bg-cyan-500/80 border border-white/15 flex items-center justify-center transition-colors">
                    <Share2 className="w-5 h-5 text-white" />
                  </span>
                  <span className="text-[11px] font-semibold">Compartir</span>
                </button>

                <button
                  onClick={handleToggleViewerMute}
                  title={isViewerMuted ? 'Activar audio' : 'Silenciar audio'}
                  className="flex flex-col items-center gap-0.5 text-white cursor-pointer"
                >
                  <span className="min-h-[44px] min-w-[44px] rounded-full bg-black/55 hover:bg-black/80 border border-white/15 flex items-center justify-center">
                    {isViewerMuted ? <VolumeX className="w-5 h-5 text-slate-300" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
                  </span>
                </button>
              </div>

              {/* BOTTOM-LEFT: TITLE + PINNED + REAL-TIME CHAT + INPUT */}
              <div className="relative z-20 mt-auto p-3 pr-16 space-y-2">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-white leading-snug line-clamp-2">
                    {displayRoom.title}
                  </p>
                  <p className="text-[11px] text-slate-300">
                    @{displayRoom.hostUsername} · {displayRoom.category}
                  </p>
                </div>

                {displayRoom.pinnedComment && (
                  <div className="px-2.5 py-1.5 rounded-xl bg-amber-500/25 border border-amber-400/40 text-xs text-white flex items-center gap-1.5 backdrop-blur-md">
                    <Pin className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span className="font-bold shrink-0">{displayRoom.pinnedComment.userName}:</span>
                    <span className="truncate">{displayRoom.pinnedComment.text}</span>
                  </div>
                )}

                {/* Scrolling Real-time Comments */}
                <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                  {comments.map(c => (
                    <div
                      key={c.id}
                      className={`inline-block max-w-full px-2.5 py-1 rounded-xl text-xs mr-1 ${
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

                {/* Comment Input Bar */}
                <form onSubmit={handleSendComment} className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    value={commentInput}
                    onChange={e => setCommentInput(e.target.value)}
                    placeholder="Añadir comentario en vivo..."
                    className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-black/60 border border-white/20 text-xs text-white placeholder:text-slate-300 outline-none focus:border-cyan-400 backdrop-blur-md"
                  />
                  <button
                    type="submit"
                    className="min-h-[44px] min-w-[44px] rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center cursor-pointer"
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
          MODAL: SEND VIRTUAL GIFT
         ============================================================ */}
      {showGiftSheet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-white/15 p-4 space-y-4 text-white">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Enviar regalo en vivo</h3>
              <button
                onClick={() => setShowGiftSheet(false)}
                className="min-h-[40px] min-w-[40px] rounded-xl hover:bg-white/10 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {LIVE_GIFTS.map(gift => (
                <button
                  key={gift.id}
                  onClick={() => handleSendGift(gift)}
                  className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 flex flex-col items-center gap-1 cursor-pointer transition-colors"
                >
                  <span className="text-2xl">{gift.emoji}</span>
                  <span className="text-[11px] font-semibold truncate w-full text-center">{gift.name}</span>
                  <span className="text-[10px] text-amber-400 font-bold tabular-nums">{gift.coins}</span>
                </button>
              ))}
            </div>
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
                className="min-h-[40px] min-w-[40px] rounded-xl hover:bg-white/10 flex items-center justify-center cursor-pointer"
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
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-between text-xs font-semibold cursor-pointer shrink-0"
            >
              <span>{copiedLink ? 'Enlace copiado al portapapeles' : 'Copiar enlace de NAKEIC Live'}</span>
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
            </button>

            <p className="text-[11px] font-semibold text-slate-400 pt-1 shrink-0">
              Enviar a un chat de NAKEIC
            </p>
            <div className="flex-1 overflow-y-auto space-y-1.5">
              {conversations.slice(0, 12).map(conv => {
                const isSent = sharedConvIds.includes(conv.id);
                return (
                  <div
                    key={conv.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={conv.avatarUrl}
                        alt={conv.title}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-full object-cover shrink-0"
                      />
                      <span className="text-xs font-semibold truncate">{conv.title}</span>
                    </div>
                    <button
                      onClick={() => !isSent && handleShareToConversation(conv.id)}
                      disabled={isSent}
                      className={`min-h-[36px] px-3 rounded-lg text-xs font-bold cursor-pointer shrink-0 ${
                        isSent
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
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
