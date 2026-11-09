import React from 'react';
import { X, UserCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface ShareContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
}

export const ShareContactModal: React.FC<ShareContactModalProps> = ({
  isOpen,
  onClose,
  conversationId
}) => {
  const { contacts, sendMessage, theme } = useApp();
  const isDark = theme.mode === 'dark' || (theme.mode === 'system' && true);

  if (!isOpen) return null;

  const handleSelectContact = (contact: typeof contacts[0]) => {
    sendMessage(conversationId, `👤 Contacto: ${contact.name}`, 'contact', {
      contact: {
        name: contact.name,
        phone: contact.phoneNumber,
        organization: contact.bio
      }
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        style={{
          backgroundColor: isDark ? theme.surfaceDark : theme.surfaceLight,
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
          color: isDark ? '#FFFFFF' : '#0F172A'
        }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Compartir Contacto</h3>
              <p className="text-xs text-slate-400">Selecciona un contacto para enviar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contacts List */}
        <div className="p-3 overflow-y-auto divide-y divide-white/5 flex-1">
          {contacts.map(c => (
            <button
              key={c.id}
              onClick={() => handleSelectContact(c)}
              className="w-full p-3 rounded-2xl hover:bg-white/5 flex items-center gap-3.5 text-left transition-colors cursor-pointer group"
            >
              <img
                src={c.avatarUrl}
                alt={c.name}
                className="w-11 h-11 rounded-full object-cover ring-2 ring-white/10"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold group-hover:text-cyan-400 transition-colors truncate">
                  {c.name}
                </h4>
                <p className="text-xs text-slate-400 truncate">{c.phoneNumber}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
