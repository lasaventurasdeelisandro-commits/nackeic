import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  Mic,
  Send,
  Check,
  CheckCheck,
  Clock,
  Pin,
  Play,
  Pause,
  Reply,
  Trash2,
  Image as ImageIcon,
  FileText,
  MapPin,
  User as UserIcon,
  X,
  Lock,
  Camera,
  Star,
  CornerUpRight,
  Info,
  Edit2,
  BarChart2,
  Music,
  Eye,
  CheckCircle2,
  Copy,
  Search,
  LockKeyhole,
  ChevronDown,
  Briefcase,
  Store,
  Bookmark,
  Radio,
  BellOff,
  Calendar,
  Globe,
  ShoppingBag,
  Zap,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Message, MessageType, BusinessProduct } from '../../types';
import { CreatePollModal } from '../modals/CreatePollModal';
import { ShareLocationModal } from '../modals/ShareLocationModal';
import { ShareContactModal } from '../modals/ShareContactModal';
import { ForwardMessageModal } from '../modals/ForwardMessageModal';
import { MessageInfoModal } from '../modals/MessageInfoModal';
import { ViewOnceMediaModal } from '../modals/ViewOnceMediaModal';
import { BusinessHubModal } from '../modals/BusinessHubModal';
import { QUICK_REPLIES } from '../../data/mockData';

export const ChatDetailScreen: React.FC = () => {
  const {
    activeConversationId,
    setActiveConversationId,
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
    pinMessage,
    setDisappearingTimer,
    startCall,
    startGroupCall,
    setIsCameraOpen,
    theme,
    currentUser,
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
  } = useApp();

  const conversation = conversations.find(c => c.id === activeConversationId);
  const chatMessages = activeConversationId ? messages[activeConversationId] || [] : [];

  const [inputText, setInputText] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  // In-chat message search state
  const [isSearchingInChat, setIsSearchingInChat] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [copiedToast, setCopiedToast] = useState(false);
  const [deletedToast, setDeletedToast] = useState(false);
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Message selection & action state (WhatsApp style)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [deleteConfirmMsg, setDeleteConfirmMsg] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [editText, setEditText] = useState('');

  // Modals state
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [forwardingMsg, setForwardingMsg] = useState<Message | null>(null);
  const [infoMsg, setInfoMsg] = useState<Message | null>(null);
  const [viewOnceMsg, setViewOnceMsg] = useState<Message | null>(null);

  // WhatsApp Business & Telegram combined features state
  const [isBusinessModalOpen, setIsBusinessModalOpen] = useState(false);
  const [showTelegramSendMenu, setShowTelegramSendMenu] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduledToast, setScheduledToast] = useState<string | null>(null);
  const [silentToast, setSilentToast] = useState<string | null>(null);
  const [productSentToast, setProductSentToast] = useState<string | null>(null);
  const [translatedMsgIds, setTranslatedMsgIds] = useState<Record<string, string>>({});

  // Audio Playback speeds (1x, 1.5x, 2x)
  const [audioSpeeds, setAudioSpeeds] = useState<Record<string, number>>({});
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // WhatsApp Long-Press detector (350ms duration + haptic vibration)
  const longPressTimerRef = useRef<any>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressActiveRef = useRef(false);

  const startLongPress = (msg: Message) => {
    isLongPressActiveRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(50);
        } catch (_) {}
      }
      setSelectedMessage(msg);
    }, 350);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // File input ref for images and documents
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingFileType, setPendingFileType] = useState<'image' | 'file' | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isDark = theme.mode === 'dark' || (theme.mode === 'system' && true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages.length]);

  if (!conversation) return null;

  const handleToggleVoicePreview = () => {
    if (isPreviewingVoice) {
      previewAudioRef.current?.pause();
      setIsPreviewingVoice(false);
    } else if (recordedAudioBlob) {
      const audioUrl = URL.createObjectURL(recordedAudioBlob);
      const audio = new Audio(audioUrl);
      previewAudioRef.current = audio;
      audio.onended = () => setIsPreviewingVoice(false);
      audio.play().catch(e => console.warn('Preview audio error:', e));
      setIsPreviewingVoice(true);
    }
  };

  const handleSend = () => {
    if (!inputText.trim() || !activeConversationId) return;

    if (editingMsg) {
      editMessage(activeConversationId, editingMsg.id, inputText.trim());
      setEditingMsg(null);
      setInputText('');
      return;
    }

    sendMessage(activeConversationId, inputText.trim(), 'text', {
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            senderName: replyingTo.senderName,
            text: replyingTo.text,
            type: replyingTo.type
          }
        : undefined
    });
    setInputText('');
    setReplyingTo(null);
    setShowEmojiPicker(false);
    setShowTelegramSendMenu(false);
  };

  // Telegram Feature: Silent Message Send (🔕 Enviar sin sonido)
  const handleSendSilent = () => {
    if (!inputText.trim() || !activeConversationId) return;
    sendMessage(activeConversationId, inputText.trim(), 'text', {
      isSilent: true,
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            senderName: replyingTo.senderName,
            text: replyingTo.text,
            type: replyingTo.type
          }
        : undefined
    });
    setInputText('');
    setReplyingTo(null);
    setShowTelegramSendMenu(false);
    setSilentToast('Mensaje enviado sin sonido (Telegram 🔕)');
    setTimeout(() => setSilentToast(null), 3000);
  };

  // Telegram Feature: Scheduled Message Send (⏰ Programar mensaje)
  const handleSendScheduled = (minutes: number = 60) => {
    if (!inputText.trim() || !activeConversationId) return;
    const scheduledTime = Date.now() + minutes * 60 * 1000;
    sendMessage(activeConversationId, inputText.trim(), 'text', {
      isScheduled: true,
      scheduledTime,
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            senderName: replyingTo.senderName,
            text: replyingTo.text,
            type: replyingTo.type
          }
        : undefined
    });
    setInputText('');
    setReplyingTo(null);
    setShowTelegramSendMenu(false);
    setIsScheduleModalOpen(false);
    setScheduledToast(`Mensaje programado para dentro de ${minutes >= 60 ? `${minutes / 60}h` : `${minutes} min`} ⏰`);
    setTimeout(() => setScheduledToast(null), 3500);
  };

  // WhatsApp Business Feature: Send Product from Catalog to Chat
  const handleSendProductCard = (product: BusinessProduct) => {
    if (!activeConversationId) return;
    sendMessage(activeConversationId, `🛍️ Producto del Catálogo: ${product.title}`, 'text', {
      productCard: {
        id: product.id,
        title: product.title,
        price: product.price,
        description: product.description,
        imageUrl: product.imageUrl
      }
    });
    setIsBusinessModalOpen(false);
    setProductSentToast(`Producto "${product.title}" compartido al chat`);
    setTimeout(() => setProductSentToast(null), 3000);
  };

  // Telegram Feature: Inline Instant Translate
  const handleTranslateMessage = (msg: Message) => {
    if (translatedMsgIds[msg.id]) {
      setTranslatedMsgIds(prev => {
        const copy = { ...prev };
        delete copy[msg.id];
        return copy;
      });
    } else {
      let translation = '';
      if (msg.text.includes('Welcome') || msg.text.includes('Titan')) {
        translation = msg.text.replace('Welcome', 'Bienvenido').replace('Security Phone', 'Teléfono de Máxima Seguridad');
      } else if (msg.text.includes('chip de seguridad')) {
        translation = 'Security chip dedicated with zero tracking OS and quantum-resistant encryption.';
      } else {
        translation = `Traducción instantánea: "${msg.text}"`;
      }
      setTranslatedMsgIds(prev => ({
        ...prev,
        [msg.id]: translation
      }));
    }
  };

  const handleToggleAudio = (msg: Message) => {
    if (playingAudioId === msg.id) {
      activeAudioRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
      const speed = audioSpeeds[msg.id] || 1;
      if (msg.mediaUrl) {
        const audio = new Audio(msg.mediaUrl);
        audio.playbackRate = speed;
        activeAudioRef.current = audio;
        audio.onended = () => setPlayingAudioId(null);
        audio.play().catch(e => console.warn('Audio play error:', e));
        setPlayingAudioId(msg.id);
      } else {
        setPlayingAudioId(msg.id);
        setTimeout(() => setPlayingAudioId(null), ((msg.durationSeconds || 3) / speed) * 1000);
      }
    }
  };

  const cycleAudioSpeed = (msgId: string) => {
    const current = audioSpeeds[msgId] || 1;
    const next = current === 1 ? 1.5 : current === 1.5 ? 2 : 1;
    setAudioSpeeds(prev => ({ ...prev, [msgId]: next }));
    if (activeAudioRef.current && playingAudioId === msgId) {
      activeAudioRef.current.playbackRate = next;
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversationId) return;

    if (pendingFileType === 'image') {
      const reader = new FileReader();
      reader.onload = () => {
        sendMessage(activeConversationId, 'Foto enviada', 'image', {
          mediaUrl: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    } else {
      sendMessage(activeConversationId, file.name, 'file', {
        fileName: file.name,
        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      });
    }

    setShowAttachMenu(false);
    setPendingFileType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const pinnedMsg = chatMessages.find(m => m.isPinned);

  const formatMsgTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept={pendingFileType === 'image' ? 'image/*' : '*/*'}
      />

      {/* Top Header - Transforms into WhatsApp selection bar when a message is selected */}
      {selectedMessage ? (
        <div
          className="px-3 py-2.5 flex items-center justify-between border-b shrink-0 z-30 animate-in fade-in duration-150"
          style={{
            backgroundColor: isDark ? '#1E293B' : '#0F172A',
            color: '#FFFFFF'
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedMessage(null)}
              className="p-1.5 rounded-full hover:bg-white/10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold">1 seleccionado</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Quick Star / Unstar */}
            <button
              onClick={() => {
                if (activeConversationId) starMessage(activeConversationId, selectedMessage.id);
                setSelectedMessage(null);
              }}
              title={selectedMessage.isStarred ? 'Quitar estrella' : 'Destacar'}
              className="p-2 rounded-xl hover:bg-white/10 text-white cursor-pointer"
            >
              <Star
                className={`w-5 h-5 ${selectedMessage.isStarred ? 'fill-amber-400 text-amber-400' : ''}`}
              />
            </button>

            {/* Copy message text */}
            <button
              onClick={() => {
                if (selectedMessage.text) {
                  navigator.clipboard?.writeText(selectedMessage.text);
                  setCopiedToast(true);
                  setTimeout(() => setCopiedToast(false), 2000);
                }
                setSelectedMessage(null);
              }}
              title="Copiar texto"
              className="p-2 rounded-xl hover:bg-white/10 text-white cursor-pointer"
            >
              <Copy className="w-5 h-5" />
            </button>

            {/* Reply */}
            <button
              onClick={() => {
                setReplyingTo(selectedMessage);
                setSelectedMessage(null);
              }}
              title="Responder"
              className="p-2 rounded-xl hover:bg-white/10 text-white cursor-pointer"
            >
              <Reply className="w-5 h-5" />
            </button>

            {/* Forward */}
            <button
              onClick={() => {
                setForwardingMsg(selectedMessage);
                setSelectedMessage(null);
              }}
              title="Reenviar"
              className="p-2 rounded-xl hover:bg-white/10 text-white cursor-pointer"
            >
              <CornerUpRight className="w-5 h-5" />
            </button>

            {/* Message Info */}
            <button
              onClick={() => {
                setInfoMsg(selectedMessage);
                setSelectedMessage(null);
              }}
              title="Info del mensaje"
              className="p-2 rounded-xl hover:bg-white/10 text-white cursor-pointer"
            >
              <Info className="w-5 h-5" />
            </button>

            {/* Edit (if own text message) */}
            {selectedMessage.senderId === currentUser.id && selectedMessage.type === 'text' && (
              <button
                onClick={() => {
                  setEditingMsg(selectedMessage);
                  setInputText(selectedMessage.text);
                  setSelectedMessage(null);
                }}
                title="Editar mensaje"
                className="p-2 rounded-xl hover:bg-white/10 text-cyan-300 cursor-pointer"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            )}

            {/* Delete button (WhatsApp style prominent red action) */}
            <button
              onClick={() => {
                setDeleteConfirmMsg(selectedMessage);
              }}
              title="Eliminar mensaje"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-950/40 cursor-pointer active:scale-95 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar</span>
            </button>
          </div>
        </div>
      ) : (
        /* Standard WhatsApp Conversation Header */
        <div
          className="px-3 py-2 flex items-center justify-between border-b shrink-0 z-20"
          style={{
            backgroundColor: isDark ? theme.surfaceDark : theme.surfaceLight,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setActiveConversationId(null)}
              className="p-1.5 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <img
              src={conversation.avatarUrl}
              alt={conversation.title}
              className="w-11 h-11 rounded-full object-cover ring-2 ring-white/10 shadow-sm shrink-0"
            />

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2
                  className="text-[17px] font-bold truncate leading-tight tracking-tight"
                  style={{ color: isDark ? '#FFFFFF' : '#0F172A' }}
                >
                  {conversation.title}
                </h2>
                {conversation.isBusiness && (
                  <span title="Cuenta Comercial Verificada (WhatsApp Business)">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  </span>
                )}
                {conversation.isSavedMessages && (
                  <span title="Mensajes Guardados (Telegram Cloud)">
                    <Bookmark className="w-4 h-4 text-cyan-400 shrink-0" />
                  </span>
                )}
                {conversation.isChannel && (
                  <span title="Canal Oficial (Telegram)">
                    <Radio className="w-4 h-4 text-sky-400 shrink-0" />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-slate-400 font-medium truncate">
                {conversation.isTyping ? (
                  <span className="font-semibold text-emerald-400 animate-pulse">
                    escribiendo...
                  </span>
                ) : conversation.isBusiness ? (
                  <button
                    onClick={() => setIsBusinessModalOpen(true)}
                    className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>Catálogo & Perfil Comercial</span>
                  </button>
                ) : conversation.isSavedMessages ? (
                  <span className="text-cyan-400">Nube personal de Telegram</span>
                ) : conversation.isChannel ? (
                  <span className="text-sky-300">{(conversation.channelSubscribers || 14820).toLocaleString()} suscriptores</span>
                ) : conversation.isGroup ? (
                  <span>{conversation.memberIds.length} miembros</span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block ring-2 ring-emerald-400/20" />
                    <span>En línea</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons: In-chat Search, Voice Call, Video Call, More Options */}
          <div className="flex items-center gap-0.5 text-slate-400">
            <button
              onClick={() => setIsSearchingInChat(!isSearchingInChat)}
              title="Buscar en la conversación"
              className="p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                if (conversation.isGroup) {
                  startGroupCall(conversation.id, false);
                } else {
                  startCall(conversation.title, conversation.avatarUrl, false);
                }
              }}
              title="Llamada de voz WebRTC"
              className="p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            >
              <Phone className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                if (conversation.isGroup) {
                  startGroupCall(conversation.id, true);
                } else {
                  startCall(conversation.title, conversation.avatarUrl, true);
                }
              }}
              title="Videollamada WebRTC"
              className="p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            >
              <Video className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              title="Más opciones"
              className="p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer relative"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* In-chat search bar */}
      {isSearchingInChat && (
        <div
          className="px-3 py-2 border-b flex items-center gap-2 z-20 animate-in fade-in slide-in-from-top duration-150"
          style={{
            backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
          }}
        >
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Buscar mensajes en este chat..."
            value={chatSearchQuery}
            onChange={e => setChatSearchQuery(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-xs outline-none font-medium placeholder:text-slate-400"
            style={{ color: isDark ? '#FFFFFF' : '#0F172A' }}
          />
          {chatSearchQuery && (
            <button
              onClick={() => setChatSearchQuery('')}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => {
              setIsSearchingInChat(false);
              setChatSearchQuery('');
            }}
            className="text-xs text-cyan-400 font-bold px-2 py-1 rounded-lg hover:bg-white/5 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Copied toast notification */}
      {copiedToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-slate-900/90 text-white text-xs font-bold shadow-2xl border border-white/10 flex items-center gap-2 animate-in fade-in zoom-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Mensaje copiado al portapapeles</span>
        </div>
      )}

      {/* Deleted toast notification */}
      {deletedToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-rose-950/95 text-rose-200 text-xs font-bold shadow-2xl border border-rose-500/30 flex items-center gap-2 animate-in fade-in zoom-in duration-150">
          <Trash2 className="w-4 h-4 text-rose-400" />
          <span>Mensaje eliminado</span>
        </div>
      )}

      {/* Options Dropdown Menu */}
      {showOptionsMenu && (
        <div
          className="absolute right-3 top-14 w-60 rounded-2xl shadow-2xl border p-1.5 z-40 text-xs flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150"
          style={{
            backgroundColor: isDark ? '#182032' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
            color: isDark ? '#F1F5F9' : '#1E293B'
          }}
        >
          <button
            onClick={() => {
              const current = conversation.disappearingSeconds;
              const next = current === null ? 86400 : current === 86400 ? 604800 : current === 604800 ? 2592000 : null;
              if (activeConversationId) setDisappearingTimer(activeConversationId, next);
              setShowOptionsMenu(false);
            }}
            className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/5 text-left cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Mensajes temporales</span>
            </span>
            <span className="text-[11px] font-bold text-cyan-400">
              {conversation.disappearingSeconds === 86400
                ? '24h'
                : conversation.disappearingSeconds === 604800
                ? '7d'
                : conversation.disappearingSeconds === 2592000
                ? '30d'
                : 'Desactivado'}
            </span>
          </button>

          <button
            onClick={() => {
              setIsCameraOpen(true);
              setShowOptionsMenu(false);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 text-left cursor-pointer"
          >
            <Camera className="w-4 h-4 text-slate-400" />
            <span>Abrir Cámara NAKEIC</span>
          </button>

          <button
            onClick={() => {
              if (chatMessages.length > 0 && activeConversationId) {
                pinMessage(activeConversationId, chatMessages[chatMessages.length - 1].id);
              }
              setShowOptionsMenu(false);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 text-left cursor-pointer"
          >
            <Pin className="w-4 h-4 text-slate-400" />
            <span>Fijar último mensaje</span>
          </button>
        </div>
      )}

      {/* Pinned Message Banner */}
      {pinnedMsg && (
        <div
          className="px-4 py-1.5 flex items-center justify-between border-b text-xs z-10 shrink-0"
          style={{
            backgroundColor: isDark ? 'rgba(0,180,216,0.08)' : 'rgba(0,180,216,0.1)',
            borderColor: isDark ? 'rgba(0,180,216,0.2)' : 'rgba(0,180,216,0.3)',
            color: isDark ? '#E2E8F0' : '#0F172A'
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Pin className="w-4 h-4 shrink-0 rotate-45" style={{ color: theme.primaryColor }} />
            <div className="truncate text-[12px]">
              <span className="font-bold">{pinnedMsg.senderName}: </span>
              <span className="text-slate-400">{pinnedMsg.text}</span>
            </div>
          </div>
          {activeConversationId && (
            <button
              onClick={() => pinMessage(activeConversationId, pinnedMsg.id)}
              className="text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Disappearing Messages Notice */}
      {conversation.disappearingSeconds && (
        <div className="px-4 py-1 flex items-center justify-center gap-1.5 text-[11px] text-amber-400 bg-amber-500/10 shrink-0 border-b border-amber-500/20 font-medium">
          <Clock className="w-3.5 h-3.5" />
          <span>
            Mensajes temporales activos (
            {conversation.disappearingSeconds === 86400
              ? '24 horas'
              : conversation.disappearingSeconds === 604800
              ? '7 días'
              : '30 días'}
            )
          </span>
        </div>
      )}

      {/* Messages Scroll Area with WhatsApp-style subtle background doodle */}
      <div
        className="flex-1 overflow-y-auto p-3 space-y-2.5 relative"
        style={{
          backgroundImage: isDark
            ? 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)'
            : 'radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      >
        {/* End-to-end security badge notice */}
        <div className="flex justify-center my-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] text-slate-400 bg-white/5 border border-white/5 max-w-[88%] text-center font-medium">
            <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Los mensajes y llamadas están cifrados de extremo a extremo. Nadie fuera de este chat puede verlos.</span>
          </div>
        </div>

        {chatMessages.map(msg => {
          if (chatSearchQuery.trim() && !msg.text?.toLowerCase().includes(chatSearchQuery.toLowerCase())) {
            return null;
          }
          const isMe = msg.senderId === currentUser.id;
          const bubbleBg = isMe
            ? theme.bubbleSent
            : isDark
            ? theme.bubbleReceivedDark
            : theme.bubbleReceivedLight;

          const textColor = isMe ? '#FFFFFF' : isDark ? '#F1F5F9' : '#0F172A';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
            >
              {/* Message Bubble */}
              <div
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
                  startLongPress(msg);
                }}
                onTouchMove={(e) => {
                  if (!touchStartPosRef.current) return;
                  const touch = e.touches[0];
                  const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
                  const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
                  if (dx > 10 || dy > 10) {
                    cancelLongPress();
                  }
                }}
                onTouchEnd={cancelLongPress}
                onTouchCancel={cancelLongPress}
                onMouseDown={() => startLongPress(msg)}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedMessage(msg);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isLongPressActiveRef.current) {
                    isLongPressActiveRef.current = false;
                    return;
                  }
                  setSelectedMessage(selectedMessage?.id === msg.id ? null : msg);
                }}
                className={`relative max-w-[85%] px-3.5 py-2.5 rounded-2xl shadow-sm text-[15px] cursor-pointer transition-all select-none ${
                  isMe ? 'rounded-br-xs' : 'rounded-bl-xs'
                } ${
                  selectedMessage?.id === msg.id
                    ? 'ring-3 ring-cyan-400 shadow-xl bg-cyan-950/60 scale-[1.01]'
                    : 'hover:scale-[1.005]'
                }`}
                style={{
                  backgroundColor: selectedMessage?.id === msg.id
                    ? (isDark ? 'rgba(8, 145, 178, 0.35)' : 'rgba(6, 182, 212, 0.25)')
                    : bubbleBg,
                  color: textColor
                }}
              >
                {/* WhatsApp Dropdown Chevron Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMessage(selectedMessage?.id === msg.id ? null : msg);
                  }}
                  title="Opciones de mensaje"
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/40 hover:bg-black/60 text-white/90 hover:text-white flex items-center justify-center cursor-pointer z-10"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {/* Quick direct delete trigger button on hover / active */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmMsg(msg);
                    setSelectedMessage(null);
                  }}
                  title="Eliminar mensaje"
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity absolute -top-2.5 -right-2 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-500 border border-white/20 shadow-md text-white flex items-center justify-center hover:scale-110 active:scale-95 cursor-pointer z-10"
                >
                  <Trash2 className="w-3 h-3" />
                </button>

                {/* Reply preview banner if present */}
                {msg.replyTo && (
                  <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-black/20 border-l-3 border-cyan-400 text-[12px]">
                    <span className="font-bold text-white/95 block">{msg.replyTo.senderName}</span>
                    <p className="truncate opacity-85">{msg.replyTo.text}</p>
                  </div>
                )}

                {/* Sender Name in Group */}
                {conversation.isGroup && !isMe && (
                  <div
                    className="text-[13px] font-bold mb-1"
                    style={{ color: theme.primaryColor }}
                  >
                    {msg.senderName}
                  </div>
                )}

                {/* Deleted for Everyone */}
                {msg.isDeletedForEveryone ? (
                  <div className="flex items-center gap-1.5 text-slate-400 italic text-[14px] py-0.5">
                    <span className="text-xs">🚫</span>
                    <span>Este mensaje fue eliminado</span>
                  </div>
                ) : (
                  <>
                    {/* Content: Text */}
                    {msg.type === 'text' && (
                      <p className="leading-relaxed whitespace-pre-wrap select-text font-normal">{msg.text}</p>
                    )}

                    {/* Content: View Once Image */}
                    {msg.type === 'image' && msg.isViewOnce && (
                      <div className="py-1">
                        {msg.isViewedOnce ? (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/25 text-slate-400 text-xs font-semibold">
                            <span className="w-6 h-6 rounded-full border border-slate-500 flex items-center justify-center text-xs font-bold">
                              ①
                            </span>
                            <span>Foto abierta · No disponible</span>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewOnceMsg(msg);
                            }}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-black/25 hover:bg-black/35 border border-amber-400/50 text-amber-300 font-bold text-xs cursor-pointer shadow-md transition-all active:scale-95"
                          >
                            <span className="w-6 h-6 rounded-full border-2 border-amber-400 flex items-center justify-center text-xs font-black">
                              ①
                            </span>
                            <span>Foto (Toca para ver 1 sola vez)</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Content: Standard Image */}
                    {msg.type === 'image' && !msg.isViewOnce && (
                      <div className="space-y-1.5">
                        {msg.mediaUrl && (
                          <img
                            src={msg.mediaUrl}
                            alt="Foto adjunta"
                            className="rounded-xl max-h-64 w-full object-cover shadow-sm"
                          />
                        )}
                        {msg.text && <p className="leading-relaxed">{msg.text}</p>}
                      </div>
                    )}

                    {/* Content: Poll / Encuesta */}
                    {msg.type === 'poll' && msg.poll && (
                      <div className="space-y-2 py-1 min-w-[240px]">
                        <div className="flex items-center gap-2">
                          <BarChart2 className="w-4 h-4 text-emerald-400" />
                          <h4 className="font-bold text-[15px] leading-snug">{msg.poll.question}</h4>
                        </div>

                        <div className="space-y-1.5 mt-2">
                          {msg.poll.options.map(opt => {
                            const hasVoted = opt.votes.includes(currentUser.id);
                            const totalVotes = msg.poll?.options.reduce((a, b) => a + b.votes.length, 0) || 0;
                            const percent = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;

                            return (
                              <div
                                key={opt.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (activeConversationId) votePoll(activeConversationId, msg.id, opt.id);
                                }}
                                className={`p-2 rounded-xl border relative overflow-hidden cursor-pointer transition-colors ${
                                  hasVoted ? 'border-cyan-400 bg-cyan-500/15' : 'border-white/10 bg-black/15'
                                }`}
                              >
                                <div
                                  className="absolute inset-y-0 left-0 bg-cyan-400/20 transition-all duration-300"
                                  style={{ width: `${percent}%` }}
                                />
                                <div className="relative z-10 flex items-center justify-between gap-2 text-xs">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                      hasVoted ? 'border-cyan-400 bg-cyan-400 text-slate-900' : 'border-slate-400'
                                    }`}>
                                      {hasVoted && <Check className="w-3 h-3 stroke-[3]" />}
                                    </div>
                                    <span className="font-medium truncate">{opt.text}</span>
                                  </div>
                                  <span className="text-[11px] font-bold opacity-80 shrink-0">{opt.votes.length} ({percent}%)</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-between text-[11px] opacity-75 pt-1">
                          <span>{msg.poll.options.reduce((a, b) => a + b.votes.length, 0)} votos</span>
                          <span>{msg.poll.allowsMultipleAnswers ? 'Varias respuestas' : '1 respuesta'}</span>
                        </div>
                      </div>
                    )}

                    {/* Content: Voice note with waveform and speed controls (1x, 1.5x, 2x) */}
                    {msg.type === 'voice' && (
                      <div className="flex items-center gap-2.5 py-1 min-w-[200px]">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleToggleAudio(msg);
                          }}
                          className="w-9 h-9 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 text-white shrink-0 cursor-pointer shadow-sm transition-transform active:scale-95"
                        >
                          {playingAudioId === msg.id ? (
                            <Pause className="w-4 h-4 fill-white" />
                          ) : (
                            <Play className="w-4 h-4 fill-white ml-0.5" />
                          )}
                        </button>

                        {/* Audio waveform */}
                        <div className="flex-1 flex items-center gap-0.5 h-6">
                          {(msg.waveform || [20, 50, 80, 40, 70, 90, 30, 60, 85, 45, 65, 35, 75, 55]).map(
                            (h, idx) => (
                              <div
                                key={idx}
                                className={`w-1 rounded-full transition-all ${
                                  playingAudioId === msg.id && idx % 3 === 0
                                    ? 'bg-amber-300 scale-y-125'
                                    : 'bg-white/80'
                                }`}
                                style={{ height: `${Math.max(20, h)}%` }}
                              />
                            )
                          )}
                        </div>

                        {/* WhatsApp speed toggle (1x / 1.5x / 2x) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            cycleAudioSpeed(msg.id);
                          }}
                          className="px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-[11px] font-black font-mono text-white transition-colors cursor-pointer shrink-0"
                          title="Cambiar velocidad de audio"
                        >
                          {audioSpeeds[msg.id] || 1}x
                        </button>

                        <span className="text-[11px] font-mono opacity-80 shrink-0">
                          0:{msg.durationSeconds ? msg.durationSeconds.toString().padStart(2, '0') : '15'}
                        </span>
                      </div>
                    )}

                    {/* Content: File */}
                    {msg.type === 'file' && (
                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-black/20">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/30 text-indigo-300 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold truncate text-[13px]">{msg.fileName || 'Documento'}</p>
                          <p className="text-[11px] opacity-75">{msg.fileSize || '1.5 MB'}</p>
                        </div>
                      </div>
                    )}

                    {/* Content: Location */}
                    {msg.type === 'location' && (
                      <div className="space-y-1.5">
                        <div className="h-32 w-56 rounded-xl bg-slate-800 flex flex-col items-center justify-center relative overflow-hidden border border-white/10">
                          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:10px_10px]" />
                          <MapPin className="w-8 h-8 text-rose-500 z-10 animate-bounce" />
                          <span className="text-[11px] text-slate-200 z-10 font-bold mt-1">Ubicación NAKEIC</span>
                        </div>
                        <p className="text-[12px] opacity-90 font-semibold">{msg.location?.label}</p>
                        {msg.location?.address && (
                          <p className="text-[11px] opacity-75">{msg.location.address}</p>
                        )}
                      </div>
                    )}

                    {/* Content: Contact */}
                    {msg.type === 'contact' && (
                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-black/20 min-w-[180px]">
                        <div className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0">
                          <UserIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-[13px] truncate">{msg.contact?.name}</p>
                          <p className="text-[11px] opacity-80">{msg.contact?.phone}</p>
                        </div>
                      </div>
                    )}

                    {/* Content: Product Card (WhatsApp Business) */}
                    {msg.productCard && (
                      <div className="my-2 rounded-2xl overflow-hidden border border-emerald-500/30 bg-black/35 shadow-lg">
                        {msg.productCard.imageUrl && (
                          <img
                            src={msg.productCard.imageUrl}
                            alt={msg.productCard.title}
                            className="w-full h-36 object-cover"
                          />
                        )}
                        <div className="p-3 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-extrabold text-[14px] text-white leading-tight">
                              {msg.productCard.title}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-xs shrink-0 border border-emerald-500/30">
                              {msg.productCard.price}
                            </span>
                          </div>
                          {msg.productCard.description && (
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {msg.productCard.description}
                            </p>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setInputText(`Hola, me interesa ordenar: ${msg.productCard?.title} (${msg.productCard?.price}). ¿Tienen disponibilidad inmediata?`);
                            }}
                            className="w-full mt-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                          >
                            <ShoppingBag className="w-4 h-4" />
                            <span>Consultar / Pedir este producto</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Telegram Instant Translate Display */}
                    {translatedMsgIds[msg.id] && (
                      <div className="mt-2 p-2.5 rounded-xl bg-sky-950/60 border border-sky-500/30 text-xs space-y-1 text-sky-200 animate-in fade-in">
                        <div className="flex items-center gap-1 font-bold text-sky-400 text-[11px]">
                          <Globe className="w-3.5 h-3.5" />
                          <span>Traducción instantánea (Telegram)</span>
                        </div>
                        <p className="italic text-slate-100 leading-relaxed">{translatedMsgIds[msg.id]}</p>
                      </div>
                    )}
                  </>
                )}

                {/* Metadata Footer: Views, Silent, Scheduled, Star ⭐, Edited, Time & Sent/Read ticks */}
                <div className="flex items-center justify-end gap-1.5 mt-1 text-[11px] opacity-85 font-medium">
                  {/* Telegram Channel Views */}
                  {(msg.viewsCount || conversation.isChannel) && (
                    <span className="flex items-center gap-0.5 text-cyan-300 mr-1" title="Vistas del canal">
                      <Eye className="w-3 h-3" />
                      <span>{msg.viewsCount ? (msg.viewsCount >= 1000 ? `${(msg.viewsCount / 1000).toFixed(1)}K` : msg.viewsCount) : '14.8K'}</span>
                    </span>
                  )}

                  {/* Telegram Silent Send indicator */}
                  {msg.isSilent && (
                    <span className="text-amber-300 inline-flex items-center mr-0.5" title="Enviado sin sonido (Telegram)">
                      <BellOff className="w-3 h-3" />
                    </span>
                  )}

                  {/* Telegram Scheduled indicator */}
                  {msg.isScheduled && (
                    <span className="text-purple-300 inline-flex items-center mr-0.5" title="Mensaje programado (Telegram)">
                      <Calendar className="w-3 h-3" />
                    </span>
                  )}

                  {msg.isStarred && (
                    <span className="text-amber-300 text-[12px] mr-0.5" title="Mensaje destacado">
                      ★
                    </span>
                  )}
                  {msg.isEdited && (
                    <span className="text-[10px] opacity-75 italic mr-0.5">Editado</span>
                  )}
                  <span>{formatMsgTime(msg.timestamp)}</span>

                  {isMe && (
                    <span className="inline-flex items-center ml-0.5">
                      {msg.status === 'sending' && <Clock className="w-3 h-3 text-slate-300" />}
                      {msg.status === 'sent' && <Check className="w-3.5 h-3.5 text-slate-300" />}
                      {msg.status === 'delivered' && <CheckCheck className="w-3.5 h-3.5 text-slate-300" />}
                      {msg.status === 'read' && (
                        <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                      )}
                    </span>
                  )}
                </div>

                {/* Reactions list pill */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="absolute -bottom-2.5 right-2 flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-slate-900 border border-white/10 shadow-md text-xs">
                    {Object.entries(msg.reactions).map(([emoji, uids]) => (
                      <span key={emoji} className="flex items-center">
                        {emoji}
                        {uids.length > 1 && (
                          <span className="text-[9px] text-slate-400 ml-0.5 font-bold">
                            {uids.length}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick reactions & actions bar on long-press / click */}
              {selectedMessage?.id === msg.id && (
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5 px-2.5 py-1.5 rounded-2xl bg-slate-900 border border-white/20 shadow-2xl text-xs z-20 animate-in fade-in zoom-in-95 duration-100">
                  {/* Reaction Emojis */}
                  <div className="flex items-center gap-0.5">
                    {['❤️', '😂', '👍', '😮', '😢', '🙏'].map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => {
                          if (activeConversationId) addReaction(activeConversationId, msg.id, emoji);
                          setSelectedMessage(null);
                        }}
                        className="p-1 hover:scale-125 transition-transform text-base cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  <div className="w-[1px] h-5 bg-white/20 mx-0.5" />

                  {/* Telegram Translate button */}
                  {msg.text && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTranslateMessage(msg);
                        setSelectedMessage(null);
                      }}
                      title="Traducir mensaje (Telegram)"
                      className="flex items-center gap-1 px-2 py-1 rounded-xl bg-sky-950/60 hover:bg-sky-900 text-sky-300 border border-sky-500/30 font-bold text-[11px] cursor-pointer transition-colors active:scale-95"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>{translatedMsgIds[msg.id] ? 'Revertir' : 'Traducir'}</span>
                    </button>
                  )}

                  {/* Direct Delete button right on the message */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmMsg(msg);
                    }}
                    title="Eliminar mensaje"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-[11px] transition-colors cursor-pointer active:scale-95 shadow-md shadow-rose-950/40"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                    <span>Eliminar</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Editing Message Banner */}
      {editingMsg && (
        <div
          className="px-4 py-2 border-t flex items-center justify-between text-xs shrink-0"
          style={{
            backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#CBD5E1'
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Edit2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="truncate">
              <span className="font-bold text-cyan-400">Editando mensaje: </span>
              <span className="text-slate-400">{editingMsg.text}</span>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingMsg(null);
              setInputText('');
            }}
            className="p-1 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Reply Quote Banner */}
      {replyingTo && (
        <div
          className="px-4 py-2 border-t flex items-center justify-between text-xs shrink-0"
          style={{
            backgroundColor: isDark ? theme.surfaceDark : theme.surfaceLight,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
          }}
        >
          <div className="border-l-3 pl-2.5 border-cyan-400 min-w-0">
            <span className="font-bold block text-cyan-400 text-[12px]">{replyingTo.senderName}</span>
            <p className="text-slate-400 truncate text-[11px]">{replyingTo.text}</p>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* WhatsApp Attachment Tray (Grid with colored circles) */}
      {showAttachMenu && (
        <div
          className="p-4 border-t grid grid-cols-4 gap-4 text-center text-xs shrink-0 animate-in fade-in duration-150"
          style={{
            backgroundColor: isDark ? '#141C2E' : '#F1F5F9',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
          }}
        >
          {/* 1. Documento */}
          <button
            onClick={() => {
              setPendingFileType('file');
              fileInputRef.current?.click();
            }}
            className="flex flex-col items-center gap-1.5 p-1 rounded-2xl hover:bg-white/5 cursor-pointer group"
          >
            <div className="w-13 h-13 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-[12px] font-bold text-slate-300">Documento</span>
          </button>

          {/* 2. Cámara */}
          <button
            onClick={() => {
              setIsCameraOpen(true);
              setShowAttachMenu(false);
            }}
            className="flex flex-col items-center gap-1.5 p-1 rounded-2xl hover:bg-white/5 cursor-pointer group"
          >
            <div className="w-13 h-13 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Camera className="w-6 h-6" />
            </div>
            <span className="text-[12px] font-bold text-slate-300">Cámara</span>
          </button>

          {/* 3. Galería */}
          <button
            onClick={() => {
              setPendingFileType('image');
              fileInputRef.current?.click();
            }}
            className="flex flex-col items-center gap-1.5 p-1 rounded-2xl hover:bg-white/5 cursor-pointer group"
          >
            <div className="w-13 h-13 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <ImageIcon className="w-6 h-6" />
            </div>
            <span className="text-[12px] font-bold text-slate-300">Galería</span>
          </button>

          {/* 4. Audio */}
          <button
            onClick={() => {
              if (activeConversationId) {
                sendMessage(activeConversationId, 'Canción compartida', 'voice', {
                  durationSeconds: 32,
                  waveform: [20, 60, 90, 40, 80, 100, 70, 50, 80, 40, 60, 90]
                });
              }
              setShowAttachMenu(false);
            }}
            className="flex flex-col items-center gap-1.5 p-1 rounded-2xl hover:bg-white/5 cursor-pointer group"
          >
            <div className="w-13 h-13 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Music className="w-6 h-6" />
            </div>
            <span className="text-[12px] font-bold text-slate-300">Audio</span>
          </button>

          {/* 5. Ubicación */}
          <button
            onClick={() => {
              setIsLocationModalOpen(true);
              setShowAttachMenu(false);
            }}
            className="flex flex-col items-center gap-1.5 p-1 rounded-2xl hover:bg-white/5 cursor-pointer group"
          >
            <div className="w-13 h-13 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <MapPin className="w-6 h-6" />
            </div>
            <span className="text-[12px] font-bold text-slate-300">Ubicación</span>
          </button>

          {/* 6. Contacto */}
          <button
            onClick={() => {
              setIsContactModalOpen(true);
              setShowAttachMenu(false);
            }}
            className="flex flex-col items-center gap-1.5 p-1 rounded-2xl hover:bg-white/5 cursor-pointer group"
          >
            <div className="w-13 h-13 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <UserIcon className="w-6 h-6" />
            </div>
            <span className="text-[12px] font-bold text-slate-300">Contacto</span>
          </button>

          {/* 7. Encuesta */}
          <button
            onClick={() => {
              setIsPollModalOpen(true);
              setShowAttachMenu(false);
            }}
            className="flex flex-col items-center gap-1.5 p-1 rounded-2xl hover:bg-white/5 cursor-pointer group"
          >
            <div className="w-13 h-13 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <BarChart2 className="w-6 h-6" />
            </div>
            <span className="text-[12px] font-bold text-slate-300">Encuesta</span>
          </button>

          {/* 8. Catálogo (WhatsApp Business) */}
          <button
            onClick={() => {
              setIsBusinessModalOpen(true);
              setShowAttachMenu(false);
            }}
            className="flex flex-col items-center gap-1.5 p-1 rounded-2xl hover:bg-white/5 cursor-pointer group"
          >
            <div className="w-13 h-13 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Store className="w-6 h-6" />
            </div>
            <span className="text-[12px] font-bold text-slate-300">Catálogo</span>
          </button>
        </div>
      )}

      {/* Emoji Picker Tray */}
      {showEmojiPicker && (
        <div
          className="p-3 border-t grid grid-cols-8 gap-2 text-xl shrink-0 overflow-y-auto max-h-40"
          style={{
            backgroundColor: isDark ? '#141C2E' : '#F1F5F9',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
          }}
        >
          {['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '😋', '😎', '🤩', '🥳', '😏', '🤔', '🤫', '🤐', '🤨', '😐', '😑', '😶', '😏', '🔥', '✨', '⚡️', '🚀', '❤️', '💜', '💙', '💚', '👍', '👎', '👏', '🙏'].map(
            emoji => (
              <button
                key={emoji}
                onClick={() => {
                  setInputText(prev => prev + emoji);
                }}
                className="hover:scale-125 transition-transform p-1 cursor-pointer"
              >
                {emoji}
              </button>
            )
          )}
        </div>
      )}

      {/* WhatsApp Business Quick Replies Tray (Triggered by typing '/') */}
      {inputText.startsWith('/') && (
        <div
          className="mx-4 mb-2 p-3 rounded-2xl border shadow-xl shrink-0 z-30 animate-in slide-in-from-bottom-2 duration-150"
          style={{
            backgroundColor: isDark ? '#141E33' : '#FFFFFF',
            borderColor: isDark ? 'rgba(16, 185, 129, 0.4)' : '#A7F3D0'
          }}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <Zap className="w-3.5 h-3.5" />
              <span>Respuestas Rápidas (WhatsApp Business)</span>
            </div>
            <span className="text-[10px] text-slate-400">Toca para autocompletar</span>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {QUICK_REPLIES.filter(r => r.shortcut.toLowerCase().startsWith(inputText.toLowerCase()) || r.title.toLowerCase().includes(inputText.slice(1).toLowerCase())).map(reply => (
              <button
                key={reply.shortcut}
                onClick={() => setInputText(reply.text)}
                className="w-full text-left p-2 rounded-xl hover:bg-white/5 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-emerald-400 group-hover:underline">{reply.shortcut}</span>
                    <span className="text-xs font-semibold text-slate-300">{reply.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{reply.text}</p>
                </div>
                <Send className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Voice Recording Active Bar with WhatsApp pause, lock, preview, cancel & send */}
      {isRecordingVoice ? (
        <div
          className="px-4 pb-4 pt-2 flex items-center gap-2.5 shrink-0 z-30"
          style={{
            backgroundColor: isDark ? theme.surfaceDark : theme.surfaceLight,
            borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E2E8F0'
          }}
        >
          {/* Active recording capsule */}
          <div
            className="flex-1 px-3.5 py-2 rounded-[24px] border flex items-center justify-between shadow-md min-w-0"
            style={{
              backgroundColor: isDark ? '#1C1929' : '#EDE9FE',
              borderColor: isDark ? 'rgba(139,92,246,0.3)' : '#DDD6FE'
            }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`w-3 h-3 rounded-full ${
                  isRecordingPaused ? 'bg-amber-500' : 'bg-rose-500 animate-ping'
                } shrink-0`}
              />
              <span className="text-sm font-mono font-bold text-rose-400 shrink-0">
                0:{recordingDuration.toString().padStart(2, '0')}
              </span>
              <div className="flex items-center gap-0.5 h-4 overflow-hidden">
                {recordedWaveform.slice(-12).map((w, idx) => (
                  <div
                    key={idx}
                    className={`w-1 rounded-full shrink-0 transition-all ${
                      isRecordingPaused ? 'bg-slate-400 opacity-50' : 'bg-rose-400'
                    }`}
                    style={{ height: `${Math.max(20, w)}%` }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Pause / Resume Button */}
              <button
                onClick={isRecordingPaused ? resumeVoiceRecording : pauseVoiceRecording}
                title={isRecordingPaused ? 'Reanudar grabación' : 'Pausar grabación'}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-transform active:scale-90"
              >
                {isRecordingPaused ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4" />}
              </button>

              {/* Lock / Unlock recording */}
              <button
                onClick={() => setIsRecordingLocked(!isRecordingLocked)}
                title={isRecordingLocked ? 'Grabación bloqueada' : 'Bloquear grabación'}
                className={`p-1.5 rounded-full cursor-pointer transition-colors ${
                  isRecordingLocked ? 'bg-cyan-500 text-white' : 'bg-white/10 hover:bg-white/20 text-slate-300'
                }`}
              >
                <LockKeyhole className="w-4 h-4" />
              </button>

              {/* Preview Audio before send if stopped/paused & blob exists */}
              {recordedAudioBlob && (
                <button
                  onClick={handleToggleVoicePreview}
                  title={isPreviewingVoice ? 'Detener preescucha' : 'Escuchar antes de enviar'}
                  className="p-1.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 cursor-pointer"
                >
                  {isPreviewingVoice ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-cyan-300" />}
                </button>
              )}

              {/* Cancel Button */}
              <button
                onClick={cancelVoiceRecording}
                className="px-2.5 py-1 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>

          {/* Send voice recording button with ample right padding */}
          <button
            onClick={() => {
              if (activeConversationId) sendVoiceRecording(activeConversationId);
            }}
            className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-xl cursor-pointer bg-emerald-500 hover:bg-emerald-600 shrink-0 transition-transform active:scale-95 mr-1 ring-2 ring-white/10"
            title="Enviar nota de voz"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </div>
      ) : (
        /* Standard Bottom Chat Input Bar with WhatsApp-style Pill & Floating Mic FAB */
        <div
          className="px-4 sm:px-5 pb-4 pt-2 flex items-end gap-2.5 sm:gap-3 shrink-0 z-20"
          style={{
            backgroundColor: isDark ? theme.surfaceDark : theme.surfaceLight,
            borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E2E8F0'
          }}
        >
          {/* Main Input Capsule (Pill) */}
          <div
            className="flex-1 flex items-center gap-1.5 px-3 py-1 rounded-[26px] border shadow-xs min-w-0"
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1'
            }}
          >
            {/* Emoji Picker Toggle */}
            <button
              onClick={() => {
                setShowEmojiPicker(!showEmojiPicker);
                setShowAttachMenu(false);
              }}
              className="p-1.5 text-slate-400 hover:text-cyan-400 rounded-full hover:bg-white/5 transition-colors cursor-pointer shrink-0"
              title="Emojis y stickers"
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Text Input */}
            <input
              type="text"
              placeholder={editingMsg ? 'Editar mensaje...' : 'Mensaje (escribe / para respuestas rápidas)'}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleSend();
                }
              }}
              className="flex-1 px-1 py-1.5 text-[15px] outline-none bg-transparent placeholder:text-slate-400 font-medium min-w-0"
              style={{
                color: isDark ? '#FFFFFF' : '#0F172A'
              }}
            />

            {/* Attachment Toggle */}
            <button
              onClick={() => {
                setShowAttachMenu(!showAttachMenu);
                setShowEmojiPicker(false);
              }}
              className="p-1.5 text-slate-400 hover:text-cyan-400 rounded-full hover:bg-white/5 transition-colors cursor-pointer shrink-0 -rotate-45"
              title="Adjuntar archivo o contenido"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Quick Camera Access inside input pill (WhatsApp style) */}
            {!inputText.trim() && (
              <button
                onClick={() => setIsCameraOpen(true)}
                className="p-1.5 text-slate-400 hover:text-cyan-400 rounded-full hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                title="Abrir cámara"
              >
                <Camera className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Floating Action Button (Mic or Send + Telegram Options) */}
          {inputText.trim() ? (
            <div className="relative flex items-center gap-1 shrink-0 mr-1">
              {/* Telegram Dropup Trigger Button */}
              <button
                onClick={() => setShowTelegramSendMenu(!showTelegramSendMenu)}
                title="Opciones Telegram: Enviar sin sonido o programar"
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 flex items-center justify-center cursor-pointer shadow-md transition-all active:scale-95"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTelegramSendMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Main Send Button */}
              <button
                onClick={handleSend}
                className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-xl transition-transform hover:scale-105 active:scale-95 cursor-pointer ring-2 ring-white/10"
                style={{ backgroundColor: theme.primaryColor }}
                title="Enviar mensaje"
              >
                <Send className="w-5 h-5 ml-0.5" />
              </button>

              {/* Telegram Send Options Menu Dropup */}
              {showTelegramSendMenu && (
                <div
                  className="absolute bottom-14 right-0 w-60 rounded-2xl border shadow-2xl p-1.5 space-y-1 z-40 animate-in fade-in slide-in-from-bottom-2 duration-150"
                  style={{
                    backgroundColor: isDark ? '#141E33' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(56, 189, 248, 0.3)' : '#BAE6FD',
                    color: isDark ? '#FFFFFF' : '#0F172A'
                  }}
                >
                  <div className="px-2.5 py-1 text-[11px] font-bold text-cyan-400 border-b border-white/10 flex items-center gap-1.5">
                    <span>Opciones de Envío Telegram</span>
                  </div>

                  {/* 1. Enviar normal */}
                  <button
                    onClick={handleSend}
                    className="w-full px-2.5 py-1.5 rounded-xl hover:bg-white/10 flex items-center gap-2.5 text-xs font-semibold cursor-pointer text-left transition-colors"
                  >
                    <Send className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-bold">Enviar con sonido</div>
                      <div className="text-[10px] text-slate-400">Notificación normal</div>
                    </div>
                  </button>

                  {/* 2. Enviar sin sonido */}
                  <button
                    onClick={handleSendSilent}
                    className="w-full px-2.5 py-1.5 rounded-xl hover:bg-white/10 flex items-center gap-2.5 text-xs font-semibold cursor-pointer text-left transition-colors"
                  >
                    <BellOff className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="font-bold">Enviar sin sonido</div>
                      <div className="text-[10px] text-slate-400">Silencioso para el contacto</div>
                    </div>
                  </button>

                  {/* 3. Programar mensaje */}
                  <button
                    onClick={() => {
                      setShowTelegramSendMenu(false);
                      setIsScheduleModalOpen(true);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-xl hover:bg-white/10 flex items-center gap-2.5 text-xs font-semibold cursor-pointer text-left transition-colors"
                  >
                    <Calendar className="w-4 h-4 text-purple-400" />
                    <div>
                      <div className="font-bold">Programar mensaje</div>
                      <div className="text-[10px] text-slate-400">Elegir hora de entrega</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => {
                startVoiceRecording();
              }}
              title="Grabar nota de voz"
              className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-xl transition-transform hover:scale-105 active:scale-95 cursor-pointer shrink-0 mr-1 ring-2 ring-white/10"
              style={{ backgroundColor: theme.primaryColor }}
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal (WhatsApp style: Delete for everyone vs Delete for me) */}
      {deleteConfirmMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-sm rounded-3xl border shadow-2xl p-5 space-y-4"
            style={{
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
              color: isDark ? '#FFFFFF' : '#0F172A'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">¿Deseas eliminar este mensaje?</h3>
                <p className="text-xs text-slate-400">
                  Elige cómo deseas borrarlo de la conversación
                </p>
              </div>
            </div>

            {/* Preview of message to be deleted */}
            <div className="p-3 rounded-2xl bg-black/20 border border-white/5 text-xs text-slate-300">
              <span className="font-semibold text-slate-400 block text-[11px] mb-0.5">Mensaje seleccionado:</span>
              <p className="truncate italic">"{deleteConfirmMsg.text || 'Archivo o multimedia'}"</p>
            </div>

            <div className="space-y-2 pt-1">
              {/* Option 1: Delete for Everyone */}
              <button
                onClick={() => {
                  if (activeConversationId) {
                    deleteMessageForEveryone(activeConversationId, deleteConfirmMsg.id);
                  }
                  setDeleteConfirmMsg(null);
                  setSelectedMessage(null);
                  setDeletedToast(true);
                  setTimeout(() => setDeletedToast(false), 2000);
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar para todos</span>
              </button>

              {/* Option 2: Delete for Me */}
              <button
                onClick={() => {
                  if (activeConversationId) {
                    deleteMessage(activeConversationId, deleteConfirmMsg.id);
                  }
                  setDeleteConfirmMsg(null);
                  setSelectedMessage(null);
                  setDeletedToast(true);
                  setTimeout(() => setDeletedToast(false), 2000);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 active:scale-95"
              >
                <Trash2 className="w-4 h-4 text-slate-400" />
                <span>Eliminar solo para mí (Quitar de mi pantalla)</span>
              </button>

              {/* Option 3: Delete Permanently */}
              <button
                onClick={() => {
                  if (activeConversationId) {
                    deleteMessagePermanently(activeConversationId, deleteConfirmMsg.id);
                  }
                  setDeleteConfirmMsg(null);
                  setSelectedMessage(null);
                  setDeletedToast(true);
                  setTimeout(() => setDeletedToast(false), 2000);
                }}
                className="w-full py-2 px-4 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Eliminar definitivamente sin rastro</span>
              </button>

              {/* Option 4: Cancel */}
              <button
                onClick={() => {
                  setDeleteConfirmMsg(null);
                  setSelectedMessage(null);
                }}
                className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {isPollModalOpen && activeConversationId && (
        <CreatePollModal
          isOpen={isPollModalOpen}
          onClose={() => setIsPollModalOpen(false)}
          conversationId={activeConversationId}
        />
      )}

      {isLocationModalOpen && activeConversationId && (
        <ShareLocationModal
          isOpen={isLocationModalOpen}
          onClose={() => setIsLocationModalOpen(false)}
          conversationId={activeConversationId}
        />
      )}

      {isContactModalOpen && activeConversationId && (
        <ShareContactModal
          isOpen={isContactModalOpen}
          onClose={() => setIsContactModalOpen(false)}
          conversationId={activeConversationId}
        />
      )}

      {forwardingMsg && (
        <ForwardMessageModal
          isOpen={!!forwardingMsg}
          message={forwardingMsg}
          onClose={() => setForwardingMsg(null)}
        />
      )}

      {infoMsg && (
        <MessageInfoModal
          isOpen={!!infoMsg}
          message={infoMsg}
          onClose={() => setInfoMsg(null)}
        />
      )}

      {viewOnceMsg && (
        <ViewOnceMediaModal
          message={viewOnceMsg}
          onClose={() => setViewOnceMsg(null)}
        />
      )}

      {/* WhatsApp Business Hub Modal (Catalog & Business Profile) */}
      <BusinessHubModal
        isOpen={isBusinessModalOpen}
        onClose={() => setIsBusinessModalOpen(false)}
        activeConversationId={activeConversationId}
        onSendProductToChat={handleSendProductCard}
      />

      {/* Telegram Scheduled Message Dialog (⏰) */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-xs rounded-3xl border shadow-2xl p-5 space-y-3"
            style={{
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? 'rgba(56, 189, 248, 0.3)' : '#CBD5E1',
              color: isDark ? '#FFFFFF' : '#0F172A'
            }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Programar mensaje</h3>
                <p className="text-[11px] text-slate-400">Telegram Cloud Delivery</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              ¿Cuándo deseas que se entregue este mensaje automáticamente?
            </p>

            <div className="space-y-1.5 pt-1">
              {[
                { label: 'En 15 minutos', minutes: 15 },
                { label: 'En 1 hora', minutes: 60 },
                { label: 'En 4 horas', minutes: 240 },
                { label: 'Mañana a las 9:00 AM', minutes: 720 }
              ].map(opt => (
                <button
                  key={opt.minutes}
                  onClick={() => handleSendScheduled(opt.minutes)}
                  className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span>{opt.label}</span>
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsScheduleModalOpen(false)}
              className="w-full mt-2 py-1.5 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Telegram Silent Send Toast Notification */}
      {silentToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-slate-900/90 text-amber-300 border border-amber-500/40 shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-3 backdrop-blur-md">
          <BellOff className="w-4 h-4 text-amber-400" />
          <span>{silentToast}</span>
        </div>
      )}

      {/* Telegram Scheduled Send Toast Notification */}
      {scheduledToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-slate-900/90 text-purple-300 border border-purple-500/40 shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-3 backdrop-blur-md">
          <Calendar className="w-4 h-4 text-purple-400" />
          <span>{scheduledToast}</span>
        </div>
      )}

      {/* WhatsApp Product Sent Toast */}
      {productSentToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-slate-900/90 text-emerald-300 border border-emerald-500/40 shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-3 backdrop-blur-md">
          <Store className="w-4 h-4 text-emerald-400" />
          <span>{productSentToast}</span>
        </div>
      )}
    </div>
  );
};
