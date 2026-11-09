import React, { useState } from 'react';
import { X, Check, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const NewGroupModal: React.FC = () => {
  const {
    isNewGroupModalOpen,
    setIsNewGroupModalOpen,
    contacts,
    createGroup,
    theme
  } = useApp();

  const [groupTitle, setGroupTitle] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const isDark = theme.mode === 'dark' || (theme.mode === 'system' && true);

  if (!isNewGroupModalOpen) return null;

  const toggleSelect = (id: string) => {
    setSelectedContactIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCreate = () => {
    if (!groupTitle.trim()) return;
    createGroup(groupTitle.trim(), selectedContactIds);
    setGroupTitle('');
    setSelectedContactIds([]);
    setIsNewGroupModalOpen(false);
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-xs flex flex-col justify-end p-2 animate-in fade-in duration-150">
      <div
        className="w-full h-[85%] rounded-3xl flex flex-col overflow-hidden border shadow-2xl"
        style={{
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
          color: isDark ? '#F8FAFC' : '#0F172A'
        }}
      >
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-white/5 shrink-0">
          <div>
            <h3 className="text-sm font-bold">Crear Grupo NAKEIC</h3>
            <p className="text-[10px] text-slate-400">
              {selectedContactIds.length} participantes seleccionados
            </p>
          </div>
          <button
            onClick={() => setIsNewGroupModalOpen(false)}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Group Name Input */}
        <div className="p-3 shrink-0">
          <input
            type="text"
            placeholder="Asunto del grupo..."
            value={groupTitle}
            onChange={e => setGroupTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs outline-none"
          />
        </div>

        {/* Member Checkboxes */}
        <div className="flex-1 overflow-y-auto px-3 space-y-1 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 mb-1">
            Añadir Participantes
          </span>
          {contacts.filter(c => c.isRegistered).map(c => {
            const isSelected = selectedContactIds.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleSelect(c.id)}
                className="w-full flex items-center justify-between p-2 rounded-2xl hover:bg-white/5 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={c.avatarUrl}
                    alt={c.name}
                    className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-xs truncate">{c.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{c.bio}</p>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                    isSelected
                      ? 'bg-cyan-500 border-cyan-500 text-white'
                      : 'border-slate-500 bg-white/5'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Create */}
        <div className="p-3 border-t border-white/5 flex justify-end shrink-0">
          <button
            onClick={handleCreate}
            disabled={!groupTitle.trim()}
            className="px-5 py-2 rounded-2xl font-semibold text-xs text-white disabled:opacity-40 transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
            style={{ backgroundColor: theme.primaryColor }}
          >
            Crear Grupo
          </button>
        </div>
      </div>
    </div>
  );
};
