import React, { useState } from 'react';
import { X, CornerUpRight, Search, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Message } from '../../types';

interface ForwardMessageModalProps {
  isOpen: boolean;
  message: Message | null;
  onClose: () => void;
}

export const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({
  isOpen,
  message,
  onClose
}) => {
  const { conversations, forwardMessage, theme } = useApp();
  const isDark = theme.mode === 'dark' || (theme.mode === 'system' && true);
  const [search, setSearch] = useState('');
  const [selectedConvIds, setSelectedConvIds] = useState<string[]>([]);

  if (!isOpen || !message) return null;

  const filtered = conversations.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    if (selectedConvIds.includes(id)) {
      setSelectedConvIds(selectedConvIds.filter(i => i !== id));
    } else {
      setSelectedConvIds([...selectedConvIds, id]);
    }
  };

  const handleSendForward = async () => {
    for (const convId of selectedConvIds) {
      await forwardMessage(convId, message);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        style={{
          backgroundColor: isDark ? theme.surfaceDark : theme.surfaceLight,
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
          color: isDark ? '#FFFFFF' : '#0F172A'
        }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <CornerUpRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Reenviar mensaje</h3>
              <p className="text-xs text-slate-400">Selecciona uno o varios chats</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-white/10">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar chat..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-full text-white placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Chat list */}
        <div className="p-2 overflow-y-auto divide-y divide-white/5 flex-1 max-h-64">
          {filtered.map(conv => {
            const isSelected = selectedConvIds.includes(conv.id);
            return (
              <div
                key={conv.id}
                onClick={() => toggleSelect(conv.id)}
                className="p-2.5 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={conv.avatarUrl}
                    alt={conv.title}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{conv.title}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {conv.isGroup ? 'Grupo' : 'Chat privado'}
                    </p>
                  </div>
                </div>

                <div
                  className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-cyan-500 border-cyan-500 text-white'
                      : 'border-slate-500 text-transparent'
                  }`}
                >
                  <Check className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {selectedConvIds.length} {selectedConvIds.length === 1 ? 'chat seleccionado' : 'chats seleccionados'}
          </span>
          <button
            onClick={handleSendForward}
            disabled={selectedConvIds.length === 0}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            style={{ backgroundColor: theme.primaryColor }}
          >
            Reenviar ahora
          </button>
        </div>
      </div>
    </div>
  );
};
