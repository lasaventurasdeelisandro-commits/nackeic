import React, { useState } from 'react';
import { X, MapPin, Navigation, Compass, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface ShareLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
}

export const ShareLocationModal: React.FC<ShareLocationModalProps> = ({
  isOpen,
  onClose,
  conversationId
}) => {
  const { sendMessage, theme } = useApp();
  const isDark = theme.mode === 'dark' || (theme.mode === 'system' && true);
  const [selectedDuration, setSelectedDuration] = useState<'15m' | '1h' | '8h'>('1h');

  if (!isOpen) return null;

  const places = [
    { label: 'Ubicación actual exacta', address: 'Paseo de la Reforma 222, CDMX', lat: 19.4326, lng: -99.1332 },
    { label: 'Oficina Central NAKEIC Tech', address: 'Av. Insurgentes Sur 1602, CDMX', lat: 19.3621, lng: -99.1805 },
    { label: 'Cafetería & Coworking Cripto', address: 'Calle Colima 180, Roma Norte', lat: 19.4189, lng: -99.1623 }
  ];

  const handleSendCurrent = (place: typeof places[0]) => {
    sendMessage(conversationId, `📍 ${place.label}`, 'location', {
      location: {
        lat: place.lat,
        lng: place.lng,
        label: place.label,
        address: place.address
      }
    });
    onClose();
  };

  const handleSendLive = () => {
    sendMessage(conversationId, `🟢 Ubicación en tiempo real (${selectedDuration})`, 'location', {
      location: {
        lat: 19.4326,
        lng: -99.1332,
        label: `Ubicación en tiempo real activa · ${selectedDuration}`,
        address: 'Paseo de la Reforma 222, CDMX'
      }
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{
          backgroundColor: isDark ? theme.surfaceDark : theme.surfaceLight,
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
          color: isDark ? '#FFFFFF' : '#0F172A'
        }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Enviar Ubicación</h3>
              <p className="text-xs text-slate-400">Cifrada de extremo a extremo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Mock / Visual Radar */}
        <div className="h-44 bg-slate-800 relative overflow-hidden flex items-center justify-center border-b border-white/10">
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:16px_16px]" />
          {/* Animated ping dot */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="relative">
              <span className="w-10 h-10 rounded-full bg-cyan-500/30 animate-ping absolute -top-1 -left-1" />
              <div className="w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center shadow-lg ring-4 ring-slate-900">
                <Navigation className="w-4 h-4 -rotate-45" />
              </div>
            </div>
            <span className="mt-2 px-3 py-1 rounded-full bg-slate-900/90 border border-white/10 text-[11px] font-bold text-cyan-300">
              Precisión de 5 metros
            </span>
          </div>
        </div>

        {/* Real-time Sharing Section */}
        <div className="p-4 border-b border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Compass className="w-4 h-4 animate-spin [animation-duration:8s]" />
              </div>
              <div>
                <p className="text-xs font-bold">Compartir ubicación en tiempo real</p>
                <p className="text-[11px] text-slate-400">Actualiza mientras te mueves</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {(['15m', '1h', '8h'] as const).map(dur => (
                <button
                  key={dur}
                  onClick={() => setSelectedDuration(dur)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    selectedDuration === dur
                      ? 'bg-cyan-500 text-white'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {dur}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSendLive}
            className="w-full py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Iniciar transmisión en tiempo real ({selectedDuration})</span>
          </button>
        </div>

        {/* Nearby Places */}
        <div className="p-3 overflow-y-auto max-h-56 divide-y divide-white/5">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
            Lugares cercanos o fijos
          </p>
          {places.map((place, idx) => (
            <button
              key={idx}
              onClick={() => handleSendCurrent(place)}
              className="w-full p-2.5 rounded-xl hover:bg-white/5 flex items-center gap-3 text-left transition-colors cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold truncate group-hover:text-cyan-400 transition-colors">
                  {place.label}
                </p>
                <p className="text-[11px] text-slate-400 truncate">{place.address}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
