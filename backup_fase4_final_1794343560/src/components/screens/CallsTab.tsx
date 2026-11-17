import React, { useState } from 'react';
import {
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  ArrowUpRight,
  ArrowDownLeft,
  Link2,
  Copy,
  Check,
  X,
  Share2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CallRecord } from '../../types';

export const CallsTab: React.FC = () => {
  const { calls, theme, startCall } = useApp();
  const isDark = theme.mode === 'dark' || (theme.mode === 'system' && true);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const callLink = 'https://nakeic.chat/call/room-e2ee-' + Math.random().toString(36).substring(7);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(callLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCallDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderDirectionIcon = (direction: CallRecord['direction']) => {
    if (direction === 'missed') {
      return <PhoneMissed className="w-4 h-4 text-rose-500" />;
    }
    if (direction === 'incoming') {
      return <ArrowDownLeft className="w-4 h-4 text-emerald-500" />;
    }
    return <ArrowUpRight className="w-4 h-4 text-cyan-400" />;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden px-4 py-3 relative">
      {/* WhatsApp Feature: Create Call Link */}
      <button
        onClick={() => setShowLinkModal(true)}
        className="w-full mb-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center gap-3.5 text-left transition-colors cursor-pointer group"
      >
        <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <Link2 className="w-6 h-6 -rotate-45" />
        </div>
        <div className="min-w-0 flex-1">
          <h4
            className="text-[16px] font-bold truncate leading-tight group-hover:text-cyan-400 transition-colors"
            style={{ color: isDark ? '#FFFFFF' : '#0F172A' }}
          >
            Crear enlace de llamada
          </h4>
          <p className="text-[13px] text-slate-400 truncate mt-0.5">
            Comparte un enlace para tu llamada de NAKEIC
          </p>
        </div>
      </button>

      {/* Recent Calls Header */}
      <div className="flex items-center justify-between px-1 py-1 mb-1">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Recientes
        </h3>
      </div>

      {/* Call list */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {calls.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs">
            Sin llamadas recientes
          </div>
        ) : (
          calls.map(call => (
            <div
              key={call.id}
              className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <img
                  src={call.contactAvatar}
                  alt={call.contactName}
                  className="w-12 h-12 rounded-full object-cover ring-1 ring-white/10"
                />

                <div className="min-w-0">
                  <h4
                    className="text-[16px] font-bold truncate leading-tight"
                    style={{
                      color: call.direction === 'missed' ? '#F43F5E' : isDark ? '#FFFFFF' : '#0F172A'
                    }}
                  >
                    {call.contactName}
                  </h4>

                  <div className="flex items-center gap-1.5 text-[13px] text-slate-400 mt-0.5">
                    {renderDirectionIcon(call.direction)}
                    <span>{formatCallDate(call.timestamp)}</span>
                    {call.durationSeconds > 0 && (
                      <span className="font-mono text-[12px] opacity-75">
                        · {Math.floor(call.durationSeconds / 60)}m {call.durationSeconds % 60}s
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Call Back Button */}
              <button
                onClick={() => startCall(call.contactName, call.contactAvatar, call.isVideo)}
                title={call.isVideo ? 'Iniciar videollamada' : 'Iniciar llamada de voz'}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
                style={{ color: theme.primaryColor }}
              >
                {call.isVideo ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Create Call Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border shadow-2xl overflow-hidden flex flex-col p-5 space-y-4"
            style={{
              backgroundColor: isDark ? theme.surfaceDark : theme.surfaceLight,
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
              color: isDark ? '#FFFFFF' : '#0F172A'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Link2 className="w-5 h-5 -rotate-45" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Enlace de llamada</h3>
                  <p className="text-xs text-slate-400">Cualquier persona con este enlace puede unirse</p>
                </div>
              </div>
              <button
                onClick={() => setShowLinkModal(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Generated Link Box */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-cyan-300 truncate">
                {callLink}
              </span>
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-xl bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  startCall('Llamada por enlace', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200', true);
                  setShowLinkModal(false);
                }}
                className="w-full py-3 rounded-2xl text-white font-bold text-xs shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                style={{ backgroundColor: theme.primaryColor }}
              >
                Iniciar llamada ahora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
