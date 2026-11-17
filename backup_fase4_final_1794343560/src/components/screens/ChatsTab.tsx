import React, { useState } from 'react';
import {
  Search,
  Plus,
  Check,
  CheckCheck,
  Clock,
  ShieldCheck,
  Pin,
  VolumeX,
  Volume2,
  MessageSquarePlus,
  Archive,
  ArchiveRestore,
  Trash2,
  Eraser,
  Mail,
  MailCheck,
  MoreVertical,
  X,
  Briefcase,
  Store,
  Bookmark,
  Radio,
  Tag,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Conversation, ChatLabelType } from '../../types';
import { BUSINESS_LABELS } from '../../data/mockData';
import { BusinessHubModal } from '../modals/BusinessHubModal';

type ChatFolder = 'all' | 'unread' | 'business' | 'groups' | 'channels' | 'saved' | 'vip' | 'archived';

export const ChatsTab: React.FC = () => {
  const {
    conversations,
    theme,
    setActiveConversationId,
    setIsNewChatModalOpen,
    setIsNewGroupModalOpen,
    toggleArchiveConversation,
    togglePinConversation,
    toggleMuteConversation,
    toggleMarkUnreadConversation,
    clearConversationMessages,
    deleteConversation
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ChatFolder>('all');
  const [selectedConvMenu, setSelectedConvMenu] = useState<Conversation | null>(null);
  const [confirmDeleteConv, setConfirmDeleteConv] = useState<Conversation | null>(null);
  const [confirmClearConv, setConfirmClearConv] = useState<Conversation | null>(null);
  const [isBusinessModalOpen, setIsBusinessModalOpen] = useState(false);
  const isDark = theme.mode === 'dark' || (theme.mode === 'system' && true);

  const archivedCount = conversations.filter(c => c.isArchived).length;
  const unreadCount = conversations.filter(c => (c.unreadCount || 0) > 0).length;
  const businessCount = conversations.filter(c => c.isBusiness || c.isVerifiedBusiness).length;

  const filteredConversations = conversations.filter(c => {
    // If viewing archived, only show archived
    if (activeFilter === 'archived') {
      if (!c.isArchived) return false;
    } else {
      // In all other views, hide archived unless explicitly searching
      if (c.isArchived && !searchQuery.trim()) return false;
    }

    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.lastMessage && c.lastMessage.text?.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeFilter === 'unread') return (c.unreadCount || 0) > 0;
    if (activeFilter === 'business') return c.isBusiness || c.isVerifiedBusiness;
    if (activeFilter === 'groups') return c.isGroup;
    if (activeFilter === 'channels') return c.isChannel;
    if (activeFilter === 'saved') return c.isSavedMessages;
    if (activeFilter === 'vip') return c.label === 'vip' || c.isPinned;
    return true;
  });

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderStatusTicks = (status?: string) => {
    if (!status) return null;
    if (status === 'sending') {
      return <Clock className="w-4 h-4 text-slate-400" />;
    }
    if (status === 'sent') {
      return <Check className="w-4 h-4 text-slate-400" />;
    }
    if (status === 'delivered') {
      return <CheckCheck className="w-4 h-4 text-slate-400" />;
    }
    if (status === 'read') {
      return <CheckCheck className="w-4 h-4 text-cyan-400" />;
    }
    return null;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Search Input Bar with WhatsApp Business Hub Button */}
      <div className="px-4 py-2.5 flex items-center gap-2">
        <div
          className="flex-1 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl text-sm transition-colors border shadow-inner"
          style={{
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
            color: isDark ? '#F8FAFC' : '#0F172A'
          }}
        >
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Buscar chats, canales y productos..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-xs placeholder:text-slate-500 font-medium"
          />
        </div>

        {/* WhatsApp Business Hub & Catalog Trigger Button */}
        <button
          onClick={() => setIsBusinessModalOpen(true)}
          title="Herramientas de Empresa & Catálogo (WhatsApp Business)"
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-400 border border-emerald-500/40 text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
        >
          <Briefcase className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">Empresa</span>
        </button>
      </div>

      {/* Telegram-style Chat Folders (Todos, No leídos, Empresas, Grupos, Canales, Guardados, VIP) */}
      <div className="px-3 pb-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {[
          { id: 'all', label: 'Todos' },
          { id: 'unread', label: 'No leídos', count: unreadCount },
          { id: 'business', label: 'Empresas 💼', count: businessCount },
          { id: 'groups', label: 'Grupos' },
          { id: 'channels', label: 'Canales 📢' },
          { id: 'saved', label: 'Guardados 🔖' },
          { id: 'vip', label: 'Clientes VIP ⭐' },
          ...(archivedCount > 0 ? [{ id: 'archived', label: `Archivados (${archivedCount})` }] : [])
        ].map(folder => {
          const isActive = activeFilter === folder.id;
          return (
            <button
              key={folder.id}
              onClick={() => setActiveFilter(folder.id as any)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                  : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <span>{folder.label}</span>
              {typeof folder.count === 'number' && folder.count > 0 && (
                <span
                  className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-white/25 text-white' : 'bg-cyan-500/20 text-cyan-400'
                  }`}
                >
                  {folder.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* WhatsApp Archived banner row if any archived and not currently in archived filter */}
      {archivedCount > 0 && activeFilter !== 'archived' && (
        <button
          onClick={() => setActiveFilter('archived')}
          className="mx-3 my-1 px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold hover:bg-white/5 cursor-pointer transition-colors border border-white/5"
          style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC' }}
        >
          <div className="flex items-center gap-3">
            <Archive className="w-4 h-4 text-slate-400" />
            <span style={{ color: isDark ? '#FFFFFF' : '#0F172A' }}>Archivados</span>
          </div>
          <span className="text-cyan-400 text-xs font-black">{archivedCount}</span>
        </button>
      )}

      {/* Conversations List with WhatsApp Business & Telegram tags */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/5 px-2">
        {filteredConversations.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm font-medium">
            {activeFilter === 'archived' ? 'No hay chats archivados' : 'No se encontraron conversaciones en esta carpeta'}
          </div>
        ) : (
          filteredConversations.map((conv: Conversation) => {
            const isUserSender = conv.lastMessage?.senderId === 'user_me';
            const labelObj = conv.label ? BUSINESS_LABELS[conv.label] : null;

            return (
              <div
                key={conv.id}
                className="relative group/item flex items-center"
              >
                <button
                  onClick={() => setActiveConversationId(conv.id)}
                  className="flex-1 py-3 px-3 flex items-center gap-3 rounded-2xl transition-colors hover:bg-white/5 text-left cursor-pointer min-w-0"
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {conv.isSavedMessages ? (
                      <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md">
                        <Bookmark className="w-6 h-6 fill-white/20" />
                      </div>
                    ) : (
                      <>
                        <img
                          src={conv.avatarUrl}
                          alt={conv.title}
                          className={`w-13 h-13 object-cover shadow-md ${
                            conv.isChannel ? 'rounded-2xl ring-2 ring-blue-500/30' : 'rounded-full ring-2 ring-white/10'
                          }`}
                        />
                        {conv.isVerifiedBusiness && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white border-2 border-slate-900 shadow">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                        {!conv.isGroup && !conv.isSavedMessages && !conv.isChannel && (
                          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-sm" />
                        )}
                      </>
                    )}
                  </div>

                  {/* Conversation Body */}
                  <div className="flex-1 min-w-0">
                    {/* Name, Badges & Time */}
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3
                          className="text-[15.5px] font-bold truncate tracking-tight"
                          style={{ color: isDark ? '#FFFFFF' : '#0F172A' }}
                        >
                          {conv.title}
                        </h3>
                        {conv.isVerifiedBusiness && (
                          <span title="Empresa Verificada">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 fill-emerald-500/20" />
                          </span>
                        )}
                        {conv.isChannel && (
                          <span className="px-1.5 py-0.2 rounded-md bg-blue-500/20 text-blue-400 text-[10px] font-extrabold uppercase shrink-0">
                            Canal
                          </span>
                        )}
                        {conv.isSavedMessages && (
                          <span className="px-1.5 py-0.2 rounded-md bg-cyan-500/20 text-cyan-400 text-[10px] font-extrabold shrink-0">
                            Nube
                          </span>
                        )}
                      </div>
                      <span className="text-[11.5px] text-slate-400 shrink-0 font-medium">
                        {formatTimestamp(conv.lastMessage?.timestamp)}
                      </span>
                    </div>

                    {/* Category or Business Label Pill */}
                    <div className="flex items-center gap-1.5 mb-1">
                      {labelObj && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0"
                          style={{
                            backgroundColor: labelObj.bgHex,
                            color: labelObj.color,
                            borderColor: labelObj.color + '40'
                          }}
                        >
                          {labelObj.name}
                        </span>
                      )}
                      {conv.businessCategory && (
                        <span className="text-[11px] text-slate-400 truncate">
                          {conv.businessCategory}
                        </span>
                      )}
                      {conv.isChannel && conv.channelSubscribers && (
                        <span className="text-[11px] text-blue-400 font-medium truncate">
                          {conv.channelSubscribers} suscriptores
                        </span>
                      )}
                    </div>

                    {/* Message preview and badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 text-[13.5px] text-slate-300 truncate">
                        {isUserSender && renderStatusTicks(conv.lastMessage?.status)}
                        {conv.isTyping ? (
                          <span className="font-semibold text-emerald-400 animate-pulse">
                            escribiendo...
                          </span>
                        ) : (
                          <span className="truncate leading-tight text-slate-400">
                            {conv.lastMessage?.productCard
                              ? `🛍️ Catálogo: ${conv.lastMessage.productCard.title}`
                              : conv.lastMessage?.type === 'voice'
                              ? '🎤 Mensaje de voz'
                              : conv.lastMessage?.type === 'image'
                              ? '📷 Foto'
                              : conv.lastMessage?.type === 'file'
                              ? '📎 ' + (conv.lastMessage.fileName || 'Archivo')
                              : conv.lastMessage?.text || 'Nueva conversación'}
                          </span>
                        )}
                      </div>

                      {/* Unread badge, muted, pinned icons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {conv.isMuted && (
                          <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        {conv.isPinned && (
                          <Pin className="w-3.5 h-3.5 text-cyan-400 rotate-45" />
                        )}
                        {(conv.unreadCount || 0) > 0 && (
                          <span
                            className="min-w-5 h-5 px-1.5 rounded-full text-[11px] font-black text-white flex items-center justify-center shadow-md"
                            style={{ backgroundColor: theme.primaryColor }}
                          >
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Quick 3-dots Conversation Context Menu Button */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedConvMenu(selectedConvMenu?.id === conv.id ? null : conv);
                  }}
                  title="Opciones de chat"
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 opacity-70 group-hover/item:opacity-100 transition-opacity cursor-pointer mr-1"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Conversation Context Menu Modal (WhatsApp style) */}
      {selectedConvMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="w-full max-w-xs rounded-3xl border shadow-2xl p-3 space-y-1 animate-in fade-in zoom-in-95 duration-150"
            style={{
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
              color: isDark ? '#FFFFFF' : '#0F172A'
            }}
          >
            <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
              <span className="font-bold text-xs truncate max-w-[200px]">
                {selectedConvMenu.title}
              </span>
              <button
                onClick={() => setSelectedConvMenu(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pin / Unpin */}
            <button
              onClick={() => {
                togglePinConversation(selectedConvMenu.id);
                setSelectedConvMenu(null);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-xs font-semibold cursor-pointer text-left"
            >
              <Pin className="w-4 h-4 text-cyan-400" />
              <span>{selectedConvMenu.isPinned ? 'Desfijar chat' : 'Fijar chat'}</span>
            </button>

            {/* Archive / Unarchive */}
            <button
              onClick={() => {
                toggleArchiveConversation(selectedConvMenu.id);
                setSelectedConvMenu(null);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-xs font-semibold cursor-pointer text-left"
            >
              {selectedConvMenu.isArchived ? (
                <>
                  <ArchiveRestore className="w-4 h-4 text-emerald-400" />
                  <span>Desarchivar chat</span>
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4 text-slate-400" />
                  <span>Archivar chat</span>
                </>
              )}
            </button>

            {/* Mute / Unmute */}
            <button
              onClick={() => {
                toggleMuteConversation(selectedConvMenu.id);
                setSelectedConvMenu(null);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-xs font-semibold cursor-pointer text-left"
            >
              {selectedConvMenu.isMuted ? (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span>Desactivar silencio</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-slate-400" />
                  <span>Silenciar notificaciones</span>
                </>
              )}
            </button>

            {/* Mark as read / unread */}
            <button
              onClick={() => {
                toggleMarkUnreadConversation(selectedConvMenu.id);
                setSelectedConvMenu(null);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-xs font-semibold cursor-pointer text-left"
            >
              {selectedConvMenu.unreadCount > 0 ? (
                <>
                  <MailCheck className="w-4 h-4 text-cyan-400" />
                  <span>Marcar como leído</span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 text-cyan-400" />
                  <span>Marcar como no leído</span>
                </>
              )}
            </button>

            {/* Clear conversation messages */}
            <button
              onClick={() => {
                setConfirmClearConv(selectedConvMenu);
                setSelectedConvMenu(null);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-xs font-semibold cursor-pointer text-left text-amber-400"
            >
              <Eraser className="w-4 h-4" />
              <span>Vaciar chat</span>
            </button>

            {/* Delete conversation */}
            <button
              onClick={() => {
                setConfirmDeleteConv(selectedConvMenu);
                setSelectedConvMenu(null);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-rose-500/10 text-xs font-semibold cursor-pointer text-left text-rose-400"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar conversación</span>
            </button>
          </div>
        </div>
      )}

      {/* Clear Chat Confirmation Modal */}
      {confirmClearConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div
            className="w-full max-w-sm rounded-3xl border shadow-2xl p-5 space-y-3"
            style={{
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
              color: isDark ? '#FFFFFF' : '#0F172A'
            }}
          >
            <h3 className="font-bold text-base">¿Vaciar este chat?</h3>
            <p className="text-xs text-slate-400">
              Se eliminarán todos los mensajes de la conversación con "{confirmClearConv.title}".
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmClearConv(null)}
                className="flex-1 py-2 rounded-xl bg-white/5 text-xs font-semibold cursor-pointer hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  clearConversationMessages(confirmClearConv.id);
                  setConfirmClearConv(null);
                }}
                className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold cursor-pointer"
              >
                Vaciar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Conversation Confirmation Modal */}
      {confirmDeleteConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div
            className="w-full max-w-sm rounded-3xl border shadow-2xl p-5 space-y-3"
            style={{
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
              color: isDark ? '#FFFFFF' : '#0F172A'
            }}
          >
            <h3 className="font-bold text-base">¿Eliminar conversación?</h3>
            <p className="text-xs text-slate-400">
              Esta conversación será eliminada por completo de tu lista de chats.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmDeleteConv(null)}
                className="flex-1 py-2 rounded-xl bg-white/5 text-xs font-semibold cursor-pointer hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  deleteConversation(confirmDeleteConv.id);
                  setConfirmDeleteConv(null);
                }}
                className="flex-1 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Buttons (New Chat & New Group) */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2.5 z-10">
        <button
          onClick={() => setIsNewGroupModalOpen(true)}
          title="Crear Nuevo Grupo"
          className="w-11 h-11 rounded-2xl bg-slate-800/90 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer backdrop-blur-sm"
        >
          <Plus className="w-5 h-5" />
        </button>

        <button
          onClick={() => setIsNewChatModalOpen(true)}
          title="Iniciar Nuevo Chat Privado"
          className="w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all cursor-pointer ring-2 ring-white/20"
          style={{ backgroundColor: theme.primaryColor }}
        >
          <MessageSquarePlus className="w-7 h-7" />
        </button>
      </div>

      {/* Business Hub Modal (Catalog, Profile, Quick Replies, Labels, Analytics) */}
      <BusinessHubModal
        isOpen={isBusinessModalOpen}
        onClose={() => setIsBusinessModalOpen(false)}
        onSendProductToChat={(product) => {
          setIsBusinessModalOpen(false);
          setActiveConversationId('conv_business_store');
        }}
      />
    </div>
  );
};
