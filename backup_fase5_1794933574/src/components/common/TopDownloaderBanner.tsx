import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  QrCode,
  Share2,
  Copy,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  ExternalLink,
  MessageCircle
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface TopDownloaderBannerProps {
  onOpenModal: (tab?: 'qr' | 'install' | 'direct_apk' | 'builder') => void;
}

export const TopDownloaderBanner: React.FC<TopDownloaderBannerProps> = ({ onOpenModal }) => {
  const { isInstallable, install } = usePWAInstall();
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [showQuickQr, setShowQuickQr] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const publicAppUrl = 'https://ais-pre-t4xogzbojhck4edijlzegi-151378173853.us-east1.run.app';
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `¡Descarga e instala NAKEIC en tu teléfono! Mensajería y llamadas seguras: ${publicAppUrl}`
  )}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicAppUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 pt-2 pb-1 transition-all">
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-emerald-500/40 shadow-xl shadow-emerald-950/20 p-2.5 sm:p-3">
        {/* Top bar with Title and Main Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Label indicating this is the official installer right under Android Simulator */}
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-2xl overflow-hidden shadow-xl ring-2 ring-emerald-400/80 shrink-0 bg-slate-950">
              <img
                src="/nakeic_logo.jpg"
                alt="NAKEIC Logo Icon"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 right-0 w-4 h-4 rounded-tl-lg bg-emerald-500 text-slate-950 flex items-center justify-center shadow">
                <Download className="w-2.5 h-2.5 stroke-[3]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white uppercase tracking-wider">
                  Instalador NAKEIC Android
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-500/40">
                  APK Firmado Oficial
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium">
                Listo para instalar en tu teléfono con icono oficial, cámara y chats
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Direct APK Download Button */}
            <a
              href="/download/NAKEIC.apk"
              download="NAKEIC-v2.5.0.apk"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/30 transition-all active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span className="text-[12px] uppercase tracking-wide">Descargar Instalador (.APK)</span>
            </a>

            {/* Quick QR Viewer Button */}
            <button
              onClick={() => setShowQuickQr(!showQuickQr)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{showQuickQr ? 'Ocultar QR' : 'Escanear QR'}</span>
            </button>

            {/* Share via WhatsApp */}
            <a
              href={whatsappShareUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-800/60 hover:bg-emerald-700 text-emerald-200 border border-emerald-600/40 text-xs font-semibold transition-all cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>

            {/* Copy Link */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all cursor-pointer"
            >
              {copiedUrl ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300 font-bold">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copiar Link</span>
                </>
              )}
            </button>

            {/* If on mobile browser right now -> Install WebAPK */}
            {isInstallable && (
              <button
                onClick={install}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-md shadow-cyan-500/30 transition-all cursor-pointer animate-pulse"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Instalar en este Móvil</span>
              </button>
            )}
          </div>
        </div>

        {/* Inline QR Popup / Dropdown */}
        {showQuickQr && (
          <div className="mt-3 pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-4 bg-slate-950/70 p-3 rounded-xl">
            <div className="p-2.5 bg-white rounded-xl shadow-lg ring-2 ring-emerald-400/40 shrink-0">
              <img
                src="/qr-nakeic.svg"
                alt="QR NAKEIC"
                className="w-36 h-36 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/qr-nakeic.png';
                }}
              />
            </div>
            <div className="text-center sm:text-left space-y-1.5 max-w-sm">
              <h4 className="font-bold text-white text-xs sm:text-sm flex items-center justify-center sm:justify-start gap-1.5 text-emerald-400">
                <QrCode className="w-4 h-4" />
                Apunta con la cámara del teléfono de tu compañero
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Al escanearlo se abrirá de inmediato la app en su teléfono Android y podrán instalarla con 1 solo toque.
              </p>
              <div className="pt-1 flex items-center gap-2 justify-center sm:justify-start">
                <button
                  onClick={() => onOpenModal('install')}
                  className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                >
                  Ver guía paso a paso de instalación &rarr;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Troubleshooting Accordion: ¿Por qué no se instala en el teléfono? */}
        <div className="mt-2 pt-2 border-t border-slate-800/80">
          <button
            onClick={() => setShowTroubleshooting(!showTroubleshooting)}
            className="w-full flex items-center justify-between text-[11px] text-amber-300/90 hover:text-amber-200 transition-colors py-0.5 cursor-pointer font-medium"
          >
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                ¿Por qué a tus compañeros no les instala en el teléfono? Toca aquí para ver la solución en 1 paso
              </span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-amber-400 transition-transform ${
                showTroubleshooting ? 'rotate-180' : ''
              }`}
            />
          </button>

          {showTroubleshooting && (
            <div className="mt-2 p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-slate-200 space-y-2.5 animate-in fade-in duration-150">
              <p className="font-semibold text-amber-300 text-xs">
                Hay 2 razones muy comunes por las que Android bloquea la instalación y cómo solucionarlo fácilmente:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-300">
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-700/80 space-y-1">
                  <strong className="text-white block font-bold text-xs flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px]">
                      1
                    </span>
                    La forma 100% garantizada (Sin tocar permisos):
                  </strong>
                  <p className="text-slate-400">
                    No les pases el archivo suelto. Diles que abran el enlace en <strong>Google Chrome</strong> en su Android y toquen los 3 puntos (⋮) &gt; <strong>"Instalar aplicación"</strong>. Android la instala automáticamente en su teléfono como app nativa.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-700/80 space-y-1">
                  <strong className="text-white block font-bold text-xs flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px]">
                      2
                    </span>
                    Si instalas el archivo .APK descargado:
                  </strong>
                  <p className="text-slate-400">
                    Android avisa <em>"Por tu seguridad, tu teléfono no tiene permitido instalar apps desconocidas"</em>. Solo deben tocar <strong>Ajustes &gt; Permitir desde esta fuente</strong> y luego pulsar <strong>Instalar</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
