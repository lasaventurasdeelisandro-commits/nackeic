import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  QrCode,
  CheckCircle2,
  Copy,
  ExternalLink,
  X,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Share2,
  MessageCircle,
  HelpCircle,
  Info
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface DownloadApkModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'qr' | 'install' | 'direct_apk' | 'builder';
}

export const DownloadApkModal: React.FC<DownloadApkModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'qr'
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'qr' | 'install' | 'direct_apk' | 'builder'>(initialTab);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedApkUrl, setCopiedApkUrl] = useState(false);

  // The official public HTTPS URL for mobile access
  const publicAppUrl = 'https://ais-pre-t4xogzbojhck4edijlzegi-151378173853.us-east1.run.app';
  const apkDownloadUrl = `${publicAppUrl}/NAKEIC.apk`;

  if (!isOpen) return null;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(publicAppUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleCopyApkUrl = () => {
    navigator.clipboard.writeText(apkDownloadUrl);
    setCopiedApkUrl(true);
    setTimeout(() => setCopiedApkUrl(false), 2500);
  };

  const shareText = `¡Únete a NAKEIC! Mensajería y llamadas seguras. Ábrelo o instálalo aquí: ${publicAppUrl}`;
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(publicAppUrl)}&text=${encodeURIComponent('Instala NAKEIC en tu teléfono Android')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[94vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-950/40 via-cyan-950/30 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-2xl overflow-hidden ring-2 ring-emerald-400/50 shadow-xl shrink-0 bg-slate-950">
              <img
                src="/nakeic_logo.jpg"
                alt="Logo NAKEIC"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                Compartir e Instalar NAKEIC
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Android
                </span>
              </h3>
              <p className="text-xs text-slate-400">Envía el enlace o APK a tus compañeros para que lo instalen</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 pt-3 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('qr')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'qr'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Share2 className="w-4 h-4" />
            Compartir / QR
          </button>
          <button
            onClick={() => setActiveTab('install')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'install'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Instalar WebAPK (Fácil)
          </button>
          <button
            onClick={() => setActiveTab('direct_apk')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'direct_apk'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            Descargar .APK Directo
          </button>
          <button
            onClick={() => setActiveTab('builder')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'builder'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Compilar APK Nativo
          </button>
        </div>

        {/* Content body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* TAB 1: SHARE / QR CODE */}
          {activeTab === 'qr' && (
            <div className="flex flex-col items-center text-center space-y-3.5">
              {/* Static High-Contrast QR Code */}
              <div className="p-3 bg-white rounded-2xl shadow-2xl ring-4 ring-emerald-500/30 flex items-center justify-center">
                <img
                  src="/qr-nakeic.svg"
                  alt="Código QR de NAKEIC para Teléfonos Android"
                  className="w-44 h-44 sm:w-52 sm:h-52 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/qr-nakeic.png';
                  }}
                />
              </div>

              <div className="space-y-1 max-w-sm">
                <h4 className="font-bold text-slate-100 text-sm sm:text-base">
                  Muestra este QR a tus compañeros
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Pueden escanearlo con la <strong>Cámara</strong> o <strong>Google Lens</strong> de su móvil Android para entrar e instalar la app de inmediato.
                </p>
              </div>

              {/* Quick Share buttons */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Send via WhatsApp */}
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Compartir por WhatsApp</span>
                </a>

                {/* Send via Telegram */}
                <a
                  href={telegramShareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer shadow-md shadow-sky-600/20"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Compartir por Telegram</span>
                </a>
              </div>

              {/* Copy URL */}
              <div className="w-full flex items-center gap-2">
                <div className="flex-1 p-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 truncate text-left">
                  {publicAppUrl}
                </div>
                <button
                  onClick={handleCopyUrl}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium flex items-center gap-1.5 text-xs transition-colors cursor-pointer shrink-0"
                >
                  {copiedUrl ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300 font-semibold">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Copiar Enlace</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: HOW NATIVE WEBAPK WORKS */}
          {activeTab === 'install' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-800 to-slate-900 border border-emerald-500/30 space-y-2.5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>La forma más fácil y recomendada para tus compañeros</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  No necesitan configurar permisos raros ni habilitar fuentes desconocidas. Con <strong>WebAPK oficial de Android</strong>, Google Play genera e instala la app automáticamente con icono nativo y pantalla completa.
                </p>
              </div>

              {/* 3 Step Guide */}
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold shrink-0 text-xs">
                    1
                  </div>
                  <div>
                    <strong className="text-white block">Pásales el enlace</strong>
                    <span className="text-slate-400">
                      Diles que lo abran en <strong>Google Chrome</strong> en su teléfono Android: <code className="text-cyan-300">{publicAppUrl}</code>
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold shrink-0 text-xs">
                    2
                  </div>
                  <div>
                    <strong className="text-white block">Tocar "Instalar aplicación"</strong>
                    <span className="text-slate-400">
                      En el menú de Chrome (los 3 puntos ⋮ arriba a la derecha), tocar <strong>"Instalar aplicación"</strong> o en el botón que sale abajo en la pantalla.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0 text-xs">
                    3
                  </div>
                  <div>
                    <strong className="text-emerald-300 block">¡Listo! La app aparece en su móvil</strong>
                    <span className="text-slate-400">
                      Tienen el icono de NAKEIC en el menú de aplicaciones de Android, con videollamadas WebRTC, cámara, mensajes en tiempo real y notificaciones.
                    </span>
                  </div>
                </div>
              </div>

              {/* If on Android browser right now */}
              {isInstallable && (
                <button
                  onClick={install}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>PULSA AQUÍ PARA INSTALAR AHORA EN ESTE NAVEGADOR</span>
                </button>
              )}
            </div>
          )}

          {/* TAB 3: DIRECT APK FILE DOWNLOAD */}
          {activeTab === 'direct_apk' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700 space-y-3">
                <div className="flex items-center gap-2.5 text-white font-bold text-sm">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-white">Instalador Directo NAKEIC (.APK)</span>
                    <span className="text-[11px] text-emerald-400 font-semibold">Compilado con DEX y firmado con firma oficial Android</span>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Este archivo APK ya está 100% empaquetado con bytecode Dalvik DEX, recursos binarios AXML y el icono oficial de NAKEIC para instalarse directamente en cualquier teléfono Android sin errores de análisis.
                </p>

                <div className="pt-1 flex flex-col sm:flex-row gap-2">
                  <a
                    href="/download/NAKEIC.apk"
                    download="NAKEIC-v2.5.0.apk"
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/30 transition-all active:scale-95 cursor-pointer"
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span className="uppercase tracking-wider">Descargar e Instalar NAKEIC.apk</span>
                  </a>

                  <button
                    onClick={handleCopyApkUrl}
                    className="py-2.5 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedApkUrl ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>¡Enlace copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Copiar link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Step by step install guide */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                <span className="text-xs font-bold text-slate-300 block">¿Cómo se instala en tu teléfono?</span>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                    <p className="text-slate-300">Toca el botón <strong>"Descargar e Instalar NAKEIC.apk"</strong> arriba.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                    <p className="text-slate-300">Cuando termine de bajar, toca la notificación de descarga o abre el archivo en tu carpeta <strong>Descargas</strong>.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                    <p className="text-slate-300">El instalador de Android te mostrará el <strong>icono oficial de NAKEIC</strong>. Toca <strong>"Instalar"</strong> y ¡listo! Ya estará en tu pantalla de inicio.</p>
                  </div>
                </div>
              </div>

              {/* Warning and instructions for installing direct APKs in Android */}
              <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Aviso para tus compañeros al instalar el archivo .APK:</span>
                </div>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside pl-1">
                  <li>
                    En Android deben tener habilitada la opción <strong>"Instalar aplicaciones desconocidas"</strong> o <strong>"Permitir orígenes desconocidos"</strong> para su navegador o gestor de archivos.
                  </li>
                  <li>
                    Si el teléfono de algún compañero muestra <em>"Error al analizar el paquete"</em>, es debido a la versión de Android o firma: en ese caso indícales usar la <strong>Pestaña "Instalar WebAPK"</strong>, la cual funciona al 100% en todos los Android sin restricciones.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 4: COMPILATION & PWABUILDER */}
          {activeTab === 'builder' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-700/50 space-y-2">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>Compilar APK Nativo con Android Studio o PWABuilder</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Si deseas generar un APK nativo 100% firmado con Keystore para distribución o entrega académica:
                </p>
              </div>

              <div className="space-y-2 text-xs">
                {/* Method 1: Android Studio */}
                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5">
                  <span className="font-bold text-emerald-400 block">Opción A: Desde Android Studio (Código Nativo Jetpack Compose)</span>
                  <p className="text-slate-300">
                    1. Abre el proyecto en tu PC y entra a la carpeta <code className="text-cyan-300">android/</code>.<br/>
                    2. En Android Studio ve a: <strong>Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong>.<br/>
                    3. Generará <code className="text-cyan-300">app-debug.apk</code> en <code className="text-cyan-300">android/app/build/outputs/apk/debug/</code> listo para pasar a tus compañeros.
                  </p>
                </div>

                {/* Method 2: PWABuilder */}
                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-white block">Opción B: Generador en la Nube PWABuilder</span>
                    <span className="text-[11px] text-slate-400">Genera APK firmado con certificado Android listo para instalar</span>
                  </div>
                  <a
                    href={`https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(publicAppUrl)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 cursor-pointer shrink-0"
                  >
                    <span>Abrir Builder</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>NAKEIC Móvil · Android 15 Ready</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
