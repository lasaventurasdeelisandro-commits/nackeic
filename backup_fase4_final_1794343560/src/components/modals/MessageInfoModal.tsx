import React from 'react';
import { X, CheckCheck, Clock, ShieldCheck, FileText, Info } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Message } from '../../types';

interface MessageInfoModalProps {
  isOpen: boolean;
  message: Message | null;
  onClose: () => void;
}

export const MessageInfoModal: React.FC<MessageInfoModalProps> = ({
  isOpen,
  message,
  onClose
}) => {
  const { theme } = useApp();
  const isDark = theme.mode === 'dark' || (theme.mode === 'system' && true);

  if (!isOpen || !message) return null;

  const dateFormatted = new Date(message.timestamp).toLocaleString([], {
    dateStyle: 'long',
    timeStyle: 'short'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border shadow-2xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: isDark ? theme.surfaceDark : theme.surfaceLight,
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
          color: isDark ? '#FFFFFF' : '#0F172A'
        }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between border-white/10">
          <div className="flex items-center gap-2.5">
            <Info className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold">Info del mensaje</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Preview */}
        <div className="p-4 border-b border-white/10 bg-black/20">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
            Contenido del mensaje:
          </p>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-medium">
            {message.type === 'poll' ? (
              <span>📊 Encuesta: {message.poll?.question}</span>
            ) : message.type === 'location' ? (
              <span>📍 {message.location?.label || 'Ubicación'}</span>
            ) : message.type === 'contact' ? (
              <span>👤 {message.contact?.name}</span>
            ) : message.type === 'voice' ? (
              <span>🎤 Nota de voz ({message.durationSeconds || 0}s)</span>
            ) : message.type === 'file' ? (
              <span>📎 {message.fileName} ({message.fileSize})</span>
            ) : (
              <span>{message.text}</span>
            )}
          </div>
        </div>

        {/* Delivery & Read Timestamps */}
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
              <CheckCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold">Leído</h4>
              <p className="text-xs text-slate-400">{dateFormatted}</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-full bg-slate-500/20 text-slate-400 flex items-center justify-center shrink-0">
              <CheckCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold">Entregado</h4>
              <p className="text-xs text-slate-400">{dateFormatted}</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5 text-xs text-emerald-400">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Cifrado E2EE con algoritmo Double Ratchet y clave efímera autenticada.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
