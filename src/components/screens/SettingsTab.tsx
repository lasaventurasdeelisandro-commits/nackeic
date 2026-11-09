import React, { useState } from 'react';
import {
  Palette,
  User,
  Shield,
  Bell,
  HardDrive,
  HelpCircle,
  Moon,
  Sun,
  Laptop,
  Check,
  ChevronRight,
  ArrowLeft,
  KeyRound,
  Lock,
  Eye,
  Sliders,
  Sparkles,
  Smartphone,
  Download,
  QrCode,
  Cloud,
  Database,
  Trash2,
  Volume2,
  ShieldAlert,
  RotateCcw,
  FileText,
  Image,
  Video,
  Mic,
  FolderArchive,
  LogOut,
  Globe,
  UserX,
  Radio,
  Fingerprint
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DownloadApkModal } from '../modals/DownloadApkModal';

export const SettingsTab: React.FC = () => {
  const {
    theme,
    setTheme,
    updateThemeColors,
    presetThemes,
    currentUser,
    updateCurrentUser
  } = useApp();

  const [activeSubpage, setActiveSubpage] = useState<
    'main' | 'appearance' | 'account' | 'privacy' | 'devices' | 'backup' | 'storage' | 'notifications' | 'help'
  >('main');
  const [showDownloadModal, setShowDownloadModal] = useState<boolean>(false);
  const isDark = theme.mode === 'dark' || (theme.mode === 'system' && true);

  // Privacy states
  const [lastSeenPrivacy, setLastSeenPrivacy] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');
  const [profilePhotoPrivacy, setProfilePhotoPrivacy] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');
  const [readReceipts, setReadReceipts] = useState<boolean>(true);
  const [silenceUnknownCalls, setSilenceUnknownCalls] = useState<boolean>(false);
  const [biometricLock, setBiometricLock] = useState<boolean>(true);
  const [blockedUsers, setBlockedUsers] = useState<Array<{ id: string; name: string; phone: string }>>([
    { id: 'b1', name: 'Número Desconocido SPAM', phone: '+1 (555) 019-2834' }
  ]);

  // Notifications states
  const [messageSound, setMessageSound] = useState<boolean>(true);
  const [reactionNotifications, setReactionNotifications] = useState<boolean>(true);
  const [groupSound, setGroupSound] = useState<boolean>(true);
  const [callVibrate, setCallVibrate] = useState<boolean>(true);

  // Backup states
  const [backupFrequency, setBackupFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'never'>('daily');
  const [includeVideosInBackup, setIncludeVideosInBackup] = useState<boolean>(false);
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [lastBackupTime, setLastBackupTime] = useState<string>('Hoy a las 02:00 AM');
  const [backupSuccessMsg, setBackupSuccessMsg] = useState<string>('');

  // Connected Devices states
  const [connectedDevices, setConnectedDevices] = useState([
    {
      id: 'dev_1',
      name: 'Samsung Galaxy S24 Ultra',
      system: 'Android 15 (Este dispositivo)',
      lastActive: 'Activo ahora',
      isCurrent: true
    },
    {
      id: 'dev_2',
      name: 'NAKEIC Web · Google Chrome',
      system: 'Windows 11',
      lastActive: 'Hoy a las 18:45',
      isCurrent: false
    },
    {
      id: 'dev_3',
      name: 'NAKEIC Tablet · Samsung Tab S9',
      system: 'Android 14',
      lastActive: 'Ayer a las 11:20',
      isCurrent: false
    }
  ]);

  // Storage states
  const [cacheCleared, setCacheCleared] = useState<boolean>(false);

  const handleBackupNow = () => {
    setIsBackingUp(true);
    setBackupSuccessMsg('');
    setTimeout(() => {
      setIsBackingUp(false);
      const now = new Date();
      setLastBackupTime(`Hoy a las ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      setBackupSuccessMsg('Copia de seguridad cifrada completada con éxito.');
      setTimeout(() => setBackupSuccessMsg(''), 4000);
    }, 1500);
  };

  const handleClearCache = () => {
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 3000);
  };

  const handleUnblockUser = (id: string) => {
    setBlockedUsers(prev => prev.filter(u => u.id !== id));
  };

  const handleLogoutDevice = (id: string) => {
    setConnectedDevices(prev => prev.filter(d => d.id !== id));
  };

  // Appearance subpage
  if (activeSubpage === 'appearance') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 flex items-center gap-2 border-b border-white/5 shrink-0">
          <button
            onClick={() => setActiveSubpage('main')}
            className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-semibold">Personalización de Apariencia</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5 text-xs">
          {/* Mode (Light / Dark / System) */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Modo de Pantalla
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'dark', label: 'Oscuro', icon: Moon },
                { id: 'light', label: 'Claro', icon: Sun },
                { id: 'system', label: 'Sistema', icon: Laptop }
              ].map(item => {
                const Icon = item.icon;
                const isSelected = theme.mode === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => updateThemeColors({ mode: item.id as any })}
                    className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-400/10 text-cyan-400 font-semibold'
                        : 'border-white/5 bg-white/5 text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px]">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* OLED Pure Black Switch */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
            <div>
              <p className="font-semibold text-xs">Negro OLED Puro (Ahorro de batería)</p>
              <p className="text-[10px] text-slate-400">Fondos completamente negros #000000 para pantallas AMOLED</p>
            </div>
            <input
              type="checkbox"
              checked={theme.oledBlack}
              onChange={e => updateThemeColors({ oledBlack: e.target.checked })}
              className="w-4 h-4 accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Preset Themes */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Temas Predefinidos NAKEIC
            </label>
            <div className="grid grid-cols-2 gap-2">
              {presetThemes.map(t => {
                const isCurrent = theme.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTheme({ ...t, mode: theme.mode, oledBlack: theme.oledBlack })}
                    className={`flex items-center gap-2 p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isCurrent ? 'border-cyan-400 ring-1 ring-cyan-400/50 bg-white/5' : 'border-white/5 bg-white/5'
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-full border border-white/20 shrink-0"
                      style={{ backgroundColor: t.primaryColor }}
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-[11px] truncate">{t.name}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Granular Color Selectors */}
          <div className="space-y-3 pt-2 border-t border-white/5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Paleta Granular Personalizada
            </label>

            {/* Primary Color Picker */}
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5">
              <div>
                <p className="font-semibold text-[11px]">Color Principal</p>
                <p className="text-[9px] text-slate-400">Botones, FAB, acentos</p>
              </div>
              <input
                type="color"
                value={theme.primaryColor}
                onChange={e => updateThemeColors({ primaryColor: e.target.value })}
                className="w-8 h-8 rounded-xl bg-transparent border-0 cursor-pointer"
              />
            </div>

            {/* Sent Bubble Color */}
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5">
              <div>
                <p className="font-semibold text-[11px]">Burbuja de Mensaje Enviado</p>
                <p className="text-[9px] text-slate-400">Tus mensajes enviados</p>
              </div>
              <input
                type="color"
                value={theme.bubbleSent}
                onChange={e => updateThemeColors({ bubbleSent: e.target.value })}
                className="w-8 h-8 rounded-xl bg-transparent border-0 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Account / Profile subpage
  if (activeSubpage === 'account') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-white/5 shrink-0">
          <button
            onClick={() => setActiveSubpage('main')}
            className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-semibold">Perfil e Información</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-xs">
          <div className="flex flex-col items-center gap-2">
            <img
              src={currentUser.avatarUrl}
              alt="Avatar"
              className="w-20 h-20 rounded-full object-cover ring-2 ring-cyan-400 shadow-xl"
            />
            <p className="text-[11px] text-cyan-400 font-medium cursor-pointer hover:underline">
              Cambiar foto de perfil
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Nombre Completo</label>
              <input
                type="text"
                value={currentUser.displayName}
                onChange={e => updateCurrentUser({ displayName: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Nombre de Usuario (@)</label>
              <input
                type="text"
                value={currentUser.username}
                onChange={e => updateCurrentUser({ username: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Estado / Biografía</label>
              <input
                type="text"
                value={currentUser.bio}
                onChange={e => updateCurrentUser({ bio: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Número Telefónico</label>
              <div className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-slate-400">
                {currentUser.phoneNumber}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5" />
                Huella Digital Criptográfica E2EE
              </span>
              <p className="font-mono text-[10px] text-slate-300 break-all select-all">
                {currentUser.fingerprint}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Privacy Subpage
  if (activeSubpage === 'privacy') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-white/5 shrink-0">
          <button
            onClick={() => setActiveSubpage('main')}
            className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-semibold">Privacidad</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-xs">
          {/* Last Seen & Online */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-2">
            <p className="font-semibold text-xs">Hora de última vez y En línea</p>
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {[
                { id: 'everyone', label: 'Todos' },
                { id: 'contacts', label: 'Mis contactos' },
                { id: 'nobody', label: 'Nadie' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setLastSeenPrivacy(opt.id as any)}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border cursor-pointer ${
                    lastSeenPrivacy === opt.id
                      ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                      : 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Profile Photo Visibility */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-2">
            <p className="font-semibold text-xs">Foto de perfil</p>
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {[
                { id: 'everyone', label: 'Todos' },
                { id: 'contacts', label: 'Mis contactos' },
                { id: 'nobody', label: 'Nadie' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setProfilePhotoPrivacy(opt.id as any)}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border cursor-pointer ${
                    profilePhotoPrivacy === opt.id
                      ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                      : 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Read Receipts */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
            <div>
              <p className="font-semibold text-xs">Confirmaciones de lectura (Doble Tick azul)</p>
              <p className="text-[10px] text-slate-400">Si se desactiva, no verás ni enviarás confirmaciones</p>
            </div>
            <input
              type="checkbox"
              checked={readReceipts}
              onChange={e => setReadReceipts(e.target.checked)}
              className="w-4 h-4 accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Silence Unknown Calls */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
            <div>
              <p className="font-semibold text-xs">Silenciar llamadas de números desconocidos</p>
              <p className="text-[10px] text-slate-400">Llamadas de números no guardados no sonarán</p>
            </div>
            <input
              type="checkbox"
              checked={silenceUnknownCalls}
              onChange={e => setSilenceUnknownCalls(e.target.checked)}
              className="w-4 h-4 accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Biometric App Lock */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
            <div>
              <p className="font-semibold text-xs flex items-center gap-1.5">
                <Fingerprint className="w-4 h-4 text-emerald-400" />
                Bloqueo con Huella Digital / Biometría Android
              </p>
              <p className="text-[10px] text-slate-400">Protege NAKEIC al abrir con sensor biométrico</p>
            </div>
            <input
              type="checkbox"
              checked={biometricLock}
              onChange={e => setBiometricLock(e.target.checked)}
              className="w-4 h-4 accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Blocked Contacts Section */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-xs flex items-center gap-1.5">
                <UserX className="w-4 h-4 text-rose-400" />
                Contactos bloqueados ({blockedUsers.length})
              </p>
            </div>
            {blockedUsers.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">No tienes ningún contacto bloqueado</p>
            ) : (
              <div className="space-y-1.5 pt-1">
                {blockedUsers.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5"
                  >
                    <div>
                      <p className="font-bold text-xs">{user.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{user.phone}</p>
                    </div>
                    <button
                      onClick={() => handleUnblockUser(user.id)}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 text-xs font-bold cursor-pointer"
                    >
                      Desbloquear
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Connected Devices Subpage
  if (activeSubpage === 'devices') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-white/5 shrink-0">
          <button
            onClick={() => setActiveSubpage('main')}
            className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-semibold">Dispositivos Vinculados</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-xs">
          <div className="text-center space-y-2 py-2">
            <div className="w-16 h-16 rounded-full bg-cyan-500/20 text-cyan-400 mx-auto flex items-center justify-center border border-cyan-500/30 shadow-lg">
              <Laptop className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-sm">Usa NAKEIC en todos tus dispositivos</h3>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Tus chats, mensajes cifrados y llamadas están sincronizados en tiempo real mediante WebSocket seguro.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Estado de los dispositivos
            </label>
            {connectedDevices.map(dev => (
              <div
                key={dev.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-cyan-400">
                    {dev.system.includes('Windows') ? (
                      <Laptop className="w-5 h-5" />
                    ) : (
                      <Smartphone className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-xs">{dev.name}</p>
                    <p className="text-[10px] text-slate-400">{dev.system}</p>
                    <p className="text-[9px] text-emerald-400 font-medium">{dev.lastActive}</p>
                  </div>
                </div>

                {!dev.isCurrent && (
                  <button
                    onClick={() => handleLogoutDevice(dev.id)}
                    className="px-2.5 py-1 rounded-xl text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 text-[11px] font-bold cursor-pointer"
                  >
                    Cerrar sesión
                  </button>
                )}
              </div>
            ))}
          </div>

          {connectedDevices.length > 1 && (
            <button
              onClick={() => setConnectedDevices(prev => prev.filter(d => d.isCurrent))}
              className="w-full py-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 font-bold text-xs hover:bg-rose-500/20 cursor-pointer transition-colors"
            >
              Cerrar sesión en todos los demás dispositivos
            </button>
          )}
        </div>
      </div>
    );
  }

  // Backup Subpage
  if (activeSubpage === 'backup') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-white/5 shrink-0">
          <button
            onClick={() => setActiveSubpage('main')}
            className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-semibold">Copia de Seguridad</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
            <div className="flex items-center gap-2.5">
              <Cloud className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="font-bold text-xs">Última copia de seguridad</p>
                <p className="text-[11px] text-slate-400">{lastBackupTime}</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400">
              Tamaño estimado: 18.2 MB · Cifrada de extremo a extremo con clave de 256 bits.
            </p>

            {backupSuccessMsg && (
              <p className="text-xs font-bold text-emerald-400 pt-1 flex items-center gap-1.5 animate-in fade-in">
                <Check className="w-4 h-4" />
                {backupSuccessMsg}
              </p>
            )}

            <button
              onClick={handleBackupNow}
              disabled={isBackingUp}
              className="w-full mt-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all disabled:opacity-50"
            >
              <RotateCcw className={`w-4 h-4 ${isBackingUp ? 'animate-spin' : ''}`} />
              <span>{isBackingUp ? 'Creando copia segura...' : 'Hacer copia ahora'}</span>
            </button>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-2">
              <p className="font-semibold text-xs">Frecuencia de copia automática</p>
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[
                  { id: 'daily', label: 'Diario' },
                  { id: 'weekly', label: 'Semanal' },
                  { id: 'monthly', label: 'Mensual' },
                  { id: 'never', label: 'Nunca' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setBackupFrequency(opt.id as any)}
                    className={`py-1.5 rounded-xl text-[10px] font-semibold border cursor-pointer text-center ${
                      backupFrequency === opt.id
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                        : 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
              <div>
                <p className="font-semibold text-xs">Incluir vídeos en la copia</p>
                <p className="text-[10px] text-slate-400">Puede aumentar el tamaño de la copia en ~8.5 MB</p>
              </div>
              <input
                type="checkbox"
                checked={includeVideosInBackup}
                onChange={e => setIncludeVideosInBackup(e.target.checked)}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Storage Subpage
  if (activeSubpage === 'storage') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-white/5 shrink-0">
          <button
            onClick={() => setActiveSubpage('main')}
            className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-semibold">Almacenamiento y Datos</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-xs">
          {/* Storage Bar Overview */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs">Espacio usado por NAKEIC</span>
              <span className="font-bold text-sm text-cyan-400">
                {cacheCleared ? '16.4 MB' : '19.8 MB'}
              </span>
            </div>

            {/* Visual colored bar */}
            <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex">
              <div className="h-full bg-cyan-400" style={{ width: '22%' }} title="Fotos" />
              <div className="h-full bg-purple-500" style={{ width: '43%' }} title="Vídeos" />
              <div className="h-full bg-emerald-400" style={{ width: '12%' }} title="Audios" />
              <div className="h-full bg-amber-400" style={{ width: '9%' }} title="Documentos" />
              <div
                className="h-full bg-rose-400"
                style={{ width: cacheCleared ? '0%' : '14%' }}
                title="Caché"
              />
            </div>

            {/* Legend Breakdown */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span className="text-slate-300">Fotos: 4.2 MB</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span className="text-slate-300">Vídeos: 8.5 MB</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-slate-300">Audios: 2.1 MB</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-slate-300">Documentos: 1.6 MB</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span className="text-slate-300">
                  Caché: {cacheCleared ? '0 MB' : '3.4 MB'}
                </span>
              </div>
            </div>
          </div>

          {/* Action button */}
          <button
            onClick={handleClearCache}
            className="w-full py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>{cacheCleared ? '¡Caché liberada con éxito!' : 'Liberar espacio y limpiar caché'}</span>
          </button>
        </div>
      </div>
    );
  }

  // Notifications Subpage
  if (activeSubpage === 'notifications') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-white/5 shrink-0">
          <button
            onClick={() => setActiveSubpage('main')}
            className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-semibold">Notificaciones</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
            <div>
              <p className="font-semibold text-xs">Tonos de conversación</p>
              <p className="text-[10px] text-slate-400">Reproducir sonidos para mensajes entrantes</p>
            </div>
            <input
              type="checkbox"
              checked={messageSound}
              onChange={e => setMessageSound(e.target.checked)}
              className="w-4 h-4 accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
            <div>
              <p className="font-semibold text-xs">Notificaciones de reacciones</p>
              <p className="text-[10px] text-slate-400">Mostrar alertas cuando reaccionen a tus mensajes</p>
            </div>
            <input
              type="checkbox"
              checked={reactionNotifications}
              onChange={e => setReactionNotifications(e.target.checked)}
              className="w-4 h-4 accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
            <div>
              <p className="font-semibold text-xs">Sonido en grupos</p>
              <p className="text-[10px] text-slate-400">Notificar mensajes enviados en grupos</p>
            </div>
            <input
              type="checkbox"
              checked={groupSound}
              onChange={e => setGroupSound(e.target.checked)}
              className="w-4 h-4 accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
            <div>
              <p className="font-semibold text-xs">Vibración en llamadas</p>
              <p className="text-[10px] text-slate-400">Vibrar al recibir llamadas WebRTC de voz o video</p>
            </div>
            <input
              type="checkbox"
              checked={callVibrate}
              onChange={e => setCallVibrate(e.target.checked)}
              className="w-4 h-4 accent-cyan-400 cursor-pointer"
            />
          </div>
        </div>
      </div>
    );
  }

  // Main Settings Screen
  return (
    <div className="flex-1 flex flex-col overflow-hidden px-4 py-3 space-y-4">
      {/* Profile Card Header */}
      <button
        onClick={() => setActiveSubpage('account')}
        className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 text-left transition-colors hover:bg-white/10 cursor-pointer"
      >
        <img
          src={currentUser.avatarUrl}
          alt={currentUser.displayName}
          className="w-13 h-13 rounded-full object-cover ring-2 ring-cyan-400"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate">{currentUser.displayName}</h3>
          <p className="text-[11px] text-slate-400 truncate">{currentUser.bio}</p>
          <p className="text-[10px] text-cyan-400 font-mono mt-0.5">{currentUser.phoneNumber}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-500" />
      </button>

      {/* Settings Menu List */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {/* Install / Download APK Item */}
        <button
          onClick={() => setShowDownloadModal(true)}
          className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-cyan-900/20 to-transparent border border-cyan-500/30 hover:border-cyan-400 text-left transition-all cursor-pointer group shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-cyan-300">Descargar APK / Móvil</p>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Android Nativo
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Instala NAKEIC en tu teléfono o escanea QR</p>
            </div>
          </div>
          <Download className="w-4 h-4 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Appearance Item */}
        <button
          onClick={() => setActiveSubpage('appearance')}
          className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: theme.primaryColor }}
            >
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold">Apariencia y Colores</p>
              <p className="text-[10px] text-slate-400">Temas, colores de burbujas, modo claro/oscuro y OLED</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        {/* Privacy Item */}
        <button
          onClick={() => setActiveSubpage('privacy')}
          className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold">Privacidad y Seguridad</p>
              <p className="text-[10px] text-slate-400">Bloqueo biométrico, E2EE, última conexión, bloqueados</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        {/* Connected Devices */}
        <button
          onClick={() => setActiveSubpage('devices')}
          className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold">Dispositivos Vinculados</p>
              <p className="text-[10px] text-slate-400">{connectedDevices.length} sesiones activas · Cierre remoto</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        {/* Chat Backup Item */}
        <button
          onClick={() => setActiveSubpage('backup')}
          className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold">Copia de Seguridad de Chats</p>
              <p className="text-[10px] text-slate-400">Copia cifrada E2EE · Guardar en la nube</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        {/* Notifications Item */}
        <button
          onClick={() => setActiveSubpage('notifications')}
          className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold">Notificaciones</p>
              <p className="text-[10px] text-slate-400">Tonos de mensajes, grupos y llamadas</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        {/* Storage Item */}
        <button
          onClick={() => setActiveSubpage('storage')}
          className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold">Almacenamiento y Datos</p>
              <p className="text-[10px] text-slate-400">Administrar fotos, videos, audios y limpiar caché</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        {/* Help & About Item */}
        <div className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 text-left transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-500/20 text-slate-400 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold">Acerca de NAKEIC</p>
              <p className="text-[10px] text-slate-400">Versión 1.0.0 (Android 15 / SDK 35 Nativo)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Download APK / Mobile Install Modal */}
      <DownloadApkModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
      />
    </div>
  );
};
