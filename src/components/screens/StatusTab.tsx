import React, { useState, useEffect } from 'react';
import { Camera, Eye, X, ChevronRight, Send, Trash2, Lock, Users, Globe } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const StatusTab: React.FC = () => {
  const {
    statuses,
    channels,
    toggleFollowChannel,
    theme,
    currentUser,
    viewingStatus,
    setViewingStatus,
    addStatus,
    viewStatus,
    reactToStatus,
    deleteStatus,
    sendMessage,
    createConversation,
    contacts,
    setActiveConversationId,
    setIsCameraOpen
  } = useApp();

  const [isCreatingTextStatus, setIsCreatingTextStatus] = useState(false);
  const [newStatusText, setNewStatusText] = useState('');
  const [selectedBgHex, setSelectedBgHex] = useState('#0077B6');
  const [statusPrivacy, setStatusPrivacy] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');
  const [replyText, setReplyText] = useState('');
  const [showViewersModal, setShowViewersModal] = useState(false);

  const isDark = theme.mode === 'dark' || (theme.mode === 'system' && true);
  const myStatus = statuses.find(s => s.userId === currentUser.id);
  const otherStatuses = statuses.filter(s => s.userId !== currentUser.id);
  const liveViewingStatus = viewingStatus ? statuses.find(s => s.id === viewingStatus.id) || viewingStatus : null;

  const bgPresets = ['#0077B6', '#7C3AED', '#047857', '#BE123C', '#B45309', '#0F172A'];
  const reactionEmojis = ['🔥', '❤️', '👏', '😂', '😮'];

  useEffect(() => {
    if (liveViewingStatus && liveViewingStatus.userId !== currentUser.id) {
      viewStatus(liveViewingStatus.id);
    }
  }, [liveViewingStatus?.id]);

  const handlePostTextStatus = async () => {
    if (!newStatusText.trim()) return;
    await addStatus(newStatusText.trim(), undefined, selectedBgHex, statusPrivacy);
    setNewStatusText('');
    setIsCreatingTextStatus(false);
  };

  const handleReplyToStatus = async () => {
    if (!liveViewingStatus || !replyText.trim()) return;
    const contact = contacts.find(c => c.id === liveViewingStatus.userId);
    if (contact) {
      const convId = await createConversation(contact);
      await sendMessage(convId, `Respuesta a tu estado "${liveViewingStatus.textCaption || 'Historia'}": ${replyText.trim()}`);
      setActiveConversationId(convId);
    }
    setReplyText('');
    setViewingStatus(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Scrollable Status Updates List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* My Status Section */}
        <div>
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Mi Estado
          </h4>

          <div className="flex items-center justify-between p-2 rounded-2xl bg-white/5 border border-white/5">
            <button
              onClick={() => {
                if (myStatus) setViewingStatus(myStatus);
                else setIsCreatingTextStatus(true);
              }}
              className="flex items-center gap-3 min-w-0 text-left cursor-pointer"
            >
              <div className="relative">
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.displayName}
                  className={`w-12 h-12 rounded-full object-cover p-0.5 ${
                    myStatus ? 'ring-2 ring-cyan-400' : 'opacity-90'
                  }`}
                />
                {!myStatus && (
                  <span
                    className="absolute bottom-0 right-0 w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    +
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <p
                  className="text-[16px] font-bold truncate leading-tight"
                  style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
                >
                  Mi estado
                </p>
                <p className="text-[13px] text-slate-400 truncate mt-0.5">
                  {myStatus
                    ? `${myStatus.views?.length || 0} vistas · Toca para ver`
                    : 'Añadir a mi estado'}
                </p>
              </div>
            </button>

            {/* Quick Actions to add or delete status */}
            <div className="flex items-center gap-1">
              {myStatus && (
                <button
                  onClick={() => deleteStatus(myStatus.id)}
                  title="Eliminar mi estado"
                  className="w-9 h-9 rounded-full bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center text-rose-400 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsCreatingTextStatus(true)}
                title="Crear estado de texto"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 cursor-pointer"
              >
                ✏️
              </button>
              <button
                onClick={() => setIsCameraOpen(true)}
                title="Capturar foto para estado"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 cursor-pointer"
              >
                <Camera className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Recent Statuses Section */}
        <div>
          <h4 className="text-[12px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
            Actualizaciones recientes ({otherStatuses.length})
          </h4>

          <div className="space-y-1">
            {otherStatuses.map(status => (
              <button
                key={status.id}
                onClick={() => setViewingStatus(status)}
                className="w-full flex items-center gap-3.5 p-2.5 rounded-2xl hover:bg-white/5 text-left transition-colors cursor-pointer"
              >
                <div className="relative shrink-0">
                  <div className={`p-0.5 rounded-full ring-2 ${status.isViewed ? 'ring-slate-500' : 'ring-cyan-400'}`}>
                    <img
                      src={status.userAvatar}
                      alt={status.userName}
                      className="w-13 h-13 rounded-full object-cover"
                    />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3
                    className="text-[16px] font-bold truncate leading-tight"
                    style={{ color: isDark ? '#FFFFFF' : '#0F172A' }}
                  >
                    {status.userName}
                  </h3>
                  <p className="text-[13px] text-slate-400 truncate mt-0.5">
                    {new Date(status.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {status.reactions && Object.keys(status.reactions).length > 0
                      ? ` · ${Object.values(status.reactions)[0]} ${Object.keys(status.reactions).length}`
                      : ''}
                  </p>
                </div>

                <ChevronRight className="w-5 h-5 text-slate-500" />
              </button>
            ))}
          </div>
        </div>

        {/* Channels Section */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-[12px] font-extrabold text-slate-400 uppercase tracking-wider">
                Canales NAKEIC
              </h4>
              <p className="text-[11px] text-slate-400">
                Mantente al día sobre los temas que te interesan
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {channels.map(channel => (
              <div
                key={channel.id}
                className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="relative shrink-0 mt-0.5">
                    <img
                      src={channel.avatarUrl}
                      alt={channel.name}
                      className="w-11 h-11 rounded-full object-cover ring-1 ring-white/10"
                    />
                    {channel.isVerified && (
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-[15px] font-bold truncate text-white">
                        {channel.name}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {channel.followersCount}
                    </p>
                    <p className="text-[12px] text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                      {channel.lastUpdate.text}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => toggleFollowChannel(channel.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    channel.isFollowing
                      ? 'bg-white/10 text-slate-300 hover:bg-white/15'
                      : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md'
                  }`}
                >
                  {channel.isFollowing ? 'Siguiendo' : 'Seguir'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Text Status Creation Modal */}
      {isCreatingTextStatus && (
        <div
          className="absolute inset-0 z-50 flex flex-col p-4 justify-between animate-in fade-in duration-200"
          style={{ backgroundColor: selectedBgHex }}
        >
          <div className="flex items-center justify-between text-white">
            <button
              onClick={() => setIsCreatingTextStatus(false)}
              className="p-2 rounded-full bg-black/20 hover:bg-black/40 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              {bgPresets.map(hex => (
                <button
                  key={hex}
                  onClick={() => setSelectedBgHex(hex)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    selectedBgHex === hex ? 'scale-125 border-white' : 'border-transparent opacity-80'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center px-4">
            <textarea
              autoFocus
              placeholder="Escribe un estado..."
              value={newStatusText}
              onChange={e => setNewStatusText(e.target.value)}
              className="w-full text-center text-xl sm:text-2xl font-semibold text-white bg-transparent border-none outline-none resize-none placeholder:text-white/50"
              rows={4}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            {/* Privacy selector */}
            <div className="flex items-center gap-1 bg-black/30 rounded-full p-1 text-[10px] font-bold text-white">
              {[
                { id: 'everyone', label: 'Todos', Icon: Globe },
                { id: 'contacts', label: 'Contactos', Icon: Users },
                { id: 'nobody', label: 'Solo yo', Icon: Lock }
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setStatusPrivacy(id as any)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full cursor-pointer transition-colors ${
                    statusPrivacy === id ? 'bg-white text-slate-900' : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={handlePostTextStatus}
              className="w-12 h-12 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              <Send className="w-5 h-5 ml-0.5" />
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen Ephemeral Story Viewer Modal */}
      {liveViewingStatus && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col justify-between p-3 animate-in fade-in duration-150">
          <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-white animate-[progress_5s_linear_forwards]" />
          </div>

          <div className="flex items-center justify-between text-white shrink-0 z-20">
            <div className="flex items-center gap-2">
              <img
                src={liveViewingStatus.userAvatar}
                alt={liveViewingStatus.userName}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-white/30"
              />
              <div>
                <p className="text-xs font-semibold">{liveViewingStatus.userName}</p>
                <p className="text-[10px] text-white/70">
                  {new Date(liveViewingStatus.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                  {liveViewingStatus.privacy ? ` · ${liveViewingStatus.privacy === 'contacts' ? 'Solo contactos' : liveViewingStatus.privacy === 'nobody' ? 'Privado' : 'Público'}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {liveViewingStatus.userId === currentUser.id && (
                <>
                  <button
                    onClick={() => setShowViewersModal(!showViewersModal)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-xs font-bold cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{liveViewingStatus.views?.length || 0}</span>
                  </button>
                  <button
                    onClick={async () => {
                      await deleteStatus(liveViewingStatus.id);
                      setViewingStatus(null);
                    }}
                    className="p-1.5 rounded-full bg-rose-600/80 hover:bg-rose-600 text-white cursor-pointer"
                    title="Eliminar estado"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setShowViewersModal(false);
                  setViewingStatus(null);
                }}
                className="p-1 rounded-full bg-black/40 text-white hover:bg-black/60 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center relative my-2 overflow-hidden rounded-2xl">
            {liveViewingStatus.mediaUrl ? (
              <img
                src={liveViewingStatus.mediaUrl}
                alt="Story"
                className="max-h-full max-w-full object-contain rounded-2xl"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center p-6 text-center text-white text-xl font-medium rounded-2xl shadow-inner"
                style={{ backgroundColor: liveViewingStatus.bgHex || '#0077B6' }}
              >
                {liveViewingStatus.textCaption}
              </div>
            )}

            {liveViewingStatus.mediaUrl && liveViewingStatus.textCaption && (
              <div className="absolute bottom-4 left-4 right-4 p-2 rounded-xl bg-black/60 text-white text-xs text-center backdrop-blur-sm">
                {liveViewingStatus.textCaption}
              </div>
            )}

            {showViewersModal && (
              <div className="absolute inset-x-3 bottom-3 max-h-48 overflow-y-auto rounded-2xl bg-slate-900/95 border border-white/15 p-3 text-white space-y-2 z-30">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Visto por ({liveViewingStatus.views?.length || 0})</span>
                  <button onClick={() => setShowViewersModal(false)} className="text-slate-400 cursor-pointer">Cerrar</button>
                </div>
                {(!liveViewingStatus.views || liveViewingStatus.views.length === 0) ? (
                  <p className="text-[11px] text-slate-400">Nadie ha visto este estado aún.</p>
                ) : (
                  liveViewingStatus.views.map(v => (
                    <div key={v.viewerId} className="flex items-center justify-between text-xs">
                      <span className="font-semibold">{v.viewerName}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(v.viewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Reactions & Reply Footer */}
          <div className="space-y-2 shrink-0">
            <div className="flex items-center justify-center gap-2">
              {reactionEmojis.map(emoji => {
                const count = liveViewingStatus.reactions
                  ? Object.values(liveViewingStatus.reactions).filter(e => e === emoji).length
                  : 0;
                return (
                  <button
                    key={emoji}
                    onClick={() => reactToStatus(liveViewingStatus.id, emoji)}
                    className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs flex items-center gap-1 cursor-pointer transition-transform active:scale-95"
                  >
                    <span>{emoji}</span>
                    {count > 0 && <span className="text-[10px] text-white font-bold">{count}</span>}
                  </button>
                );
              })}
            </div>

            {liveViewingStatus.userId !== currentUser.id && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleReplyToStatus(); }}
                  placeholder="Responder a este estado..."
                  className="flex-1 px-3 py-2 rounded-2xl text-xs bg-white/10 text-white placeholder:text-white/60 border border-white/20 outline-none"
                />
                <button
                  onClick={handleReplyToStatus}
                  className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center cursor-pointer"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
