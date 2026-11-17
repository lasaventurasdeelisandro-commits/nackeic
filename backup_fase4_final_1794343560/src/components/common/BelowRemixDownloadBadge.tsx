import React, { useState } from 'react';
import { Smartphone, QrCode, Download, Sparkles, CheckCircle2, ChevronDown, Copy } from 'lucide-react';

interface BelowRemixDownloadBadgeProps {
  onOpenModal: (tab?: 'qr' | 'install' | 'direct_apk' | 'builder') => void;
}

export const BelowRemixDownloadBadge: React.FC<BelowRemixDownloadBadgeProps> = ({ onOpenModal }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  const publicAppUrl = 'https://ais-pre-t4xogzbojhck4edijlzegi-151378173853.us-east1.run.app';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(publicAppUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative inline-flex items-center">
      {/* Primary Split Button - Anchored right below Remix */}
      <div className="flex items-center bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-[1.5px] rounded-2xl shadow-xl shadow-emerald-500/20 ring-2 ring-emerald-400/40">
        {/* Main Action: Opens the guaranteed QR and Install Assistant */}
        <button
          onClick={() => onOpenModal('qr')}
          title="Instalar NAKEIC en tu teléfono Android o ver Código QR"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-l-2xl bg-slate-950/90 hover:bg-slate-900 text-white font-bold text-xs transition-colors cursor-pointer"
        >
          <div className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <QrCode className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-left leading-tight">
            <span className="block font-black text-[11px] text-emerald-300 tracking-wider uppercase">
              DESCARGAR / QR
            </span>
            <span className="text-[9px] text-slate-400 block -mt-0.5">
              Instalar en Android
            </span>
          </div>
        </button>

        {/* Separator line */}
        <div className="w-[1px] h-7 bg-white/20" />

        {/* Dropdown Menu Trigger with Mini QR Code */}
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          title="Ver Código QR rápido"
          className="px-2 py-2 rounded-r-2xl bg-slate-950/90 hover:bg-slate-900 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown with Instant QR Display right below Remix */}
      {showDropdown && (
        <div className="absolute top-full right-0 mt-2 w-72 rounded-2xl bg-slate-900 border border-slate-700/90 shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 text-slate-100">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              Escanea con tu Móvil
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
              Android
            </span>
          </div>

          {/* Quick QR Code visible directly under Remix */}
          <div className="my-2 p-2 bg-white rounded-xl shadow-md flex items-center justify-center">
            <img
              src="/qr-nakeic.svg"
              alt="Código QR NAKEIC"
              className="w-40 h-40 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/qr-nakeic.png';
              }}
            />
          </div>

          <p className="text-[10px] text-slate-400 text-center mb-2">
            Apunta la cámara de tu móvil al código para abrir e instalar NAKEIC sin errores.
          </p>

          <div className="space-y-1.5 pt-1 border-t border-slate-800">
            {/* Open Full Assistant */}
            <button
              onClick={() => {
                setShowDropdown(false);
                onOpenModal('qr');
              }}
              className="w-full py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Ver Guía de Instalación</span>
            </button>

            {/* Copy Link */}
            <button
              onClick={handleCopy}
              className="w-full py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-300">¡Enlace Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-cyan-400" />
                  <span>Copiar enlace para el móvil</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
