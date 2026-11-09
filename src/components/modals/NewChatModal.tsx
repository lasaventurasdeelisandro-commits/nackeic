import React, { useState } from 'react';
import { X, Search, UserPlus, ShieldCheck, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Contact } from '../../types';

export const NewChatModal: React.FC = () => {
  const {
    isNewChatModalOpen,
    setIsNewChatModalOpen,
    contacts,
    createConversation,
    theme
  } = useApp();

  const [query, setQuery] = useState('');
  const [copiedContactId, setCopiedContactId] = useState<string | null>(null);
  const isDark = theme.mode === 'dark' || (theme.mode === 'system' && true);

  if (!isNewChatModalOpen) return null;

  const handleCopyInvite = (contact: Contact) => {
    navigator.clipboard?.writeText?.(`https://nakeic.chat/invite/alex?to=${contact.phoneNumber}`);
    setCopiedContactId(contact.id);
    setTimeout(() => setCopiedContactId(null), 2000);
  };

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.phoneNumber.includes(query)
  );

  const registeredContacts = filtered.filter(c => c.isRegistered);
  const nonRegisteredContacts = filtered.filter(c => !c.isRegistered);

  const handleSelectContact = (contact: Contact) => {
    createConversation(contact);
    setIsNewChatModalOpen(false);
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
            <h3 className="text-sm font-bold">Nuevo Mensaje</h3>
            <p className="text-[10px] text-slate-400">Selecciona un contacto cifrado</p>
          </div>
          <button
            onClick={() => setIsNewChatModalOpen(false)}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Buscar por nombre o teléfono..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full bg-transparent border-none outline-none"
            />
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto px-3 space-y-3 pb-4 text-xs">
          {/* Active on Nakeic */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 mb-1">
              Contactos en NAKEIC ({registeredContacts.length})
            </span>
            <div className="space-y-1">
              {registeredContacts.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleSelectContact(c)}
                  className="w-full flex items-center justify-between p-2 rounded-2xl hover:bg-white/5 text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={c.avatarUrl}
                      alt={c.name}
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-xs truncate">{c.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{c.bio}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Not on Nakeic */}
          {nonRegisteredContacts.length > 0 && (
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 mb-1">
                Invitar a NAKEIC
              </span>
              <div className="space-y-1">
                {nonRegisteredContacts.map(c => (
                  <div
                    key={c.id}
                    className="w-full flex items-center justify-between p-2 rounded-2xl opacity-75"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={c.avatarUrl}
                        alt={c.name}
                        className="w-10 h-10 rounded-full object-cover grayscale"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-xs truncate">{c.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{c.phoneNumber}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopyInvite(c)}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-semibold text-cyan-400 bg-cyan-400/10 hover:bg-cyan-400/20 cursor-pointer transition-colors"
                    >
                      {copiedContactId === c.id ? '¡Copiado!' : 'Invitar'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
