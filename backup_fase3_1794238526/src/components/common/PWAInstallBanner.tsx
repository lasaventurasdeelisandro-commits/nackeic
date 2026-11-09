import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, CheckCircle2, ChevronRight, Share } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, install, isIOS, isAndroid } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [showHelper, setShowHelper] = useState(false);

  useEffect(() => {
    const check = () => {
      const isMobile =
        /android|iphone|ipad|ipod/i.test(navigator.userAgent) ||
        window.innerWidth < 768;
      setIsMobileDevice(isMobile);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Do not render if already running as installed standalone APK/PWA or if dismissed
  if (isInstalled || dismissed) {
    return null;
  }

  // Only show the mobile install prompt if on a mobile device or if Chrome install prompt is ready
  if (!isMobileDevice && !isInstallable) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowHelper(true);
    }
  };

  return (
    <>
      <aside aria-label="Instalación de NAKEIC Móvil" className="fixed bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md rounded-2xl bg-slate-900/95 border border-emerald-500/40 p-3 shadow-2xl backdrop-blur-md text-white animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between gap-2.5">
          {/* Logo & Info */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20 text-slate-950 font-black">
              <Smartphone className="w-5 h-5 text-slate-950" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-black text-xs text-white truncate">NAKEIC Móvil</p>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {isIOS ? 'iOS WebApp' : 'Android App'}
                </span>
              </div>
              <p className="text-[10px] text-slate-300 truncate">
                {isInstallable
                  ? 'Instala con 1 toque en tu pantalla'
                  : 'Añadir a tu pantalla de inicio'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar</span>
            </button>
            <button
              onClick={() => setDismissed(true)}
              title="Cerrar aviso"
              className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Helper Modal if browser doesn't support automatic prompt trigger */}
      {showHelper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xs rounded-3xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                Cómo instalar en tu móvil
              </h4>
              <button
                onClick={() => setShowHelper(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <p>1. Toca el botón <strong>Compartir</strong> (icono de cuadrado con flecha hacia arriba) en Safari.</p>
                <p>2. Desliza hacia abajo y pulsa <strong>"Añadir a pantalla de inicio"</strong>.</p>
              </div>
            ) : (
              <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <p>1. Toca los <strong>tres puntos (⋮)</strong> en la esquina superior derecha de Google Chrome.</p>
                <p>2. Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Añadir a pantalla de inicio"</strong>.</p>
                <p>3. ¡Listo! Se instalará el icono en tu teléfono con pantalla completa.</p>
              </div>
            )}

            <button
              onClick={() => setShowHelper(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
