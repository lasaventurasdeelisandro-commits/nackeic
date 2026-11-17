import React, { useState, useEffect } from 'react';
import {
  Palette,
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
  Smartphone,
  Download,
  Cloud,
  Trash2,
  RotateCcw,
  LogOut,
  UserX,
  Fingerprint,
  Coins,
  Gem,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Wallet
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DownloadApkModal } from '../modals/DownloadApkModal';
import { CoinPackage, WalletAccount, WalletTransaction, PayoutRequest } from '../../types';

const formatBytes = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const SettingsTab: React.FC = () => {
  const {
    theme,
    setTheme,
    updateThemeColors,
    presetThemes,
    currentUser,
    updateCurrentUser,
    logoutSession
  } = useApp();

  const [activeSubpage, setActiveSubpage] = useState<
    'main' | 'wallet' | 'appearance' | 'account' | 'privacy' | 'devices' | 'backup' | 'storage' | 'notifications' | 'help'
  >('main');
  const [showDownloadModal, setShowDownloadModal] = useState<boolean>(false);

  useEffect(() => {
    const onSubpage = (e: Event) => {
      const sub = (e as CustomEvent<string>).detail;
      if (sub === 'wallet') setActiveSubpage('wallet');
    };
    window.addEventListener('nakeic:settings_subpage', onSubpage);
    return () => window.removeEventListener('nakeic:settings_subpage', onSubpage);
  }, []);

  const authToken = typeof window !== 'undefined' ? localStorage.getItem('nakeic_auth_token') : null;
  const authHeaders: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {};

  // Profile & Password state
  const [profileSaveMsg, setProfileSaveMsg] = useState<string | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [passwordSaveMsg, setPasswordSaveMsg] = useState<string | null>(null);

  // Privacy states synced with backend
  const [lastSeenPrivacy, setLastSeenPrivacy] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');
  const [profilePhotoPrivacy, setProfilePhotoPrivacy] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');
  const [readReceipts, setReadReceipts] = useState<boolean>(true);
  const [silenceUnknownCalls, setSilenceUnknownCalls] = useState<boolean>(false);
  const [biometricLock, setBiometricLock] = useState<boolean>(true);
  const [blockedUsers, setBlockedUsers] = useState<Array<{ id: string; displayName: string; phoneNumber: string }>>([]);
  const [privacyError, setPrivacyError] = useState<string | null>(null);

  // Notifications states
  const [messageSound, setMessageSound] = useState<boolean>(true);
  const [reactionNotifications, setReactionNotifications] = useState<boolean>(true);
  const [groupSound, setGroupSound] = useState<boolean>(true);
  const [callVibrate, setCallVibrate] = useState<boolean>(true);

  // Backup states
  const [backupFrequency, setBackupFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'never'>('daily');
  const [includeVideosInBackup, setIncludeVideosInBackup] = useState<boolean>(false);
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [lastBackupTime, setLastBackupTime] = useState<string>('Sin exportaciones en esta sesión');
  const [backupSuccessMsg, setBackupSuccessMsg] = useState<string>('');
  const [backupErrorMsg, setBackupErrorMsg] = useState<string>('');

  // Real Connected Devices from /api/devices
  const [connectedDevices, setConnectedDevices] = useState<Array<{
    id: string;
    name: string;
    platform: string;
    lastActive: number;
    isCurrent: boolean;
    location?: string;
  }>>([]);
  const [devicesError, setDevicesError] = useState<string | null>(null);

  // Real Storage stats from /api/storage/stats
  const [storageStats, setStorageStats] = useState<{
    totalBytes: number;
    photos: { count: number; bytes: number };
    audios: { count: number; bytes: number };
    videos: { count: number; bytes: number };
    docs: { count: number; bytes: number };
    cacheBytes: number;
  } | null>(null);
  const [cacheCleared, setCacheCleared] = useState<boolean>(false);

  // Real Wallet, Coins, Diamonds, KYC & Payouts state
  const [wallet, setWallet] = useState<WalletAccount | null>(null);
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [walletNotice, setWalletNotice] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [kycFullName, setKycFullName] = useState('');
  const [kycCountry, setKycCountry] = useState('MX');
  const [kycDocNumber, setKycDocNumber] = useState('');
  const [withdrawDiamonds, setWithdrawDiamonds] = useState('1000');
  const [withdrawMethod, setWithdrawMethod] = useState<'bank_transfer' | 'stripe_connect' | 'paypal'>('bank_transfer');
  const [withdrawDest, setWithdrawDest] = useState('');

  const loadDevices = async () => {
    setDevicesError(null);
    if (!authToken) {
      setConnectedDevices([]);
      setDevicesError('Inicia sesión con OTP o contraseña para ver tus sesiones activas.');
      return;
    }
    try {
      const res = await fetch('/api/devices', { headers: authHeaders });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setDevicesError(d.error || 'No se pudieron cargar los dispositivos.');
        return;
      }
      const list = await res.json();
      setConnectedDevices(Array.isArray(list) ? list : []);
    } catch {
      setDevicesError('Error de red al consultar dispositivos.');
    }
  };

  const loadPrivacyAndBlocked = async () => {
    setPrivacyError(null);
    if (!authToken) {
      setBlockedUsers([]);
      setPrivacyError('Inicia sesión verificada para sincronizar privacidad y bloqueos en servidor.');
      return;
    }
    try {
      const [privRes, blkRes] = await Promise.all([
        fetch(`/api/users/${currentUser.id}/privacy`, { headers: authHeaders }),
        fetch(`/api/users/${currentUser.id}/blocked`, { headers: authHeaders })
      ]);
      if (privRes.ok) {
        const pData = await privRes.json();
        if (pData.privacy) {
          setLastSeenPrivacy(pData.privacy.lastSeenVisibility || 'everyone');
          setProfilePhotoPrivacy(pData.privacy.profilePhotoVisibility || 'everyone');
          setReadReceipts(pData.privacy.readReceiptsEnabled ?? true);
        }
      }
      if (blkRes.ok) {
        const bData = await blkRes.json();
        setBlockedUsers(bData.blockedUsers || []);
      }
    } catch {
      setPrivacyError('No se pudo cargar la privacidad desde el servidor.');
    }
  };

  const loadStorageStats = async () => {
    try {
      const res = await fetch('/api/storage/stats');
      if (res.ok) {
        const data = await res.json();
        setStorageStats(data);
      }
    } catch {}
  };

  const loadWalletData = async () => {
    setWalletError(null);
    try {
      const pkgRes = await fetch('/api/wallet/packages');
      if (pkgRes.ok) {
        const pData = await pkgRes.json();
        setPackages(pData.packages || []);
      }
      if (!authToken) {
        setWallet(null);
        setWalletError('Inicia sesión autenticada para consultar tu saldo real, recargar o retirar ingresos.');
        return;
      }
      const [balRes, txRes, payRes] = await Promise.all([
        fetch('/api/wallet/balance', { headers: authHeaders }),
        fetch('/api/wallet/transactions?limit=25', { headers: authHeaders }),
        fetch('/api/wallet/payouts', { headers: authHeaders })
      ]);
      if (balRes.ok) {
        const bData = await balRes.json();
        setWallet(bData.wallet || null);
      }
      if (txRes.ok) {
        const tData = await txRes.json();
        setTransactions(tData.transactions || []);
      }
      if (payRes.ok) {
        const pData = await payRes.json();
        setPayouts(pData.payouts || []);
      }
    } catch {
      setWalletError('Error cargando información de billetera.');
    }
  };

  useEffect(() => {
    if (activeSubpage === 'devices') loadDevices();
    if (activeSubpage === 'privacy') loadPrivacyAndBlocked();
    if (activeSubpage === 'storage') loadStorageStats();
    if (activeSubpage === 'wallet') loadWalletData();
  }, [activeSubpage, currentUser.id]);

  useEffect(() => {
    if (authToken) {
      loadDevices();
      loadWalletData();
    }
  }, [authToken]);

  const handleSaveProfile = async () => {
    setProfileSaveMsg(null);
    if (!authToken) {
      setProfileSaveMsg('Perfil actualizado localmente (inicia sesión verificada para persistir en servidor).');
      return;
    }
    try {
      const res = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          displayName: currentUser.displayName,
          username: currentUser.username,
          bio: currentUser.bio
        })
      });
      if (res.ok) {
        setProfileSaveMsg('Perfil guardado en servidor NAKEIC.');
      } else {
        const d = await res.json().catch(() => ({}));
        setProfileSaveMsg(d.error || 'Error guardando perfil.');
      }
    } catch {
      setProfileSaveMsg('Error de red al guardar perfil.');
    }
  };

  const handleSetPassword = async () => {
    setPasswordSaveMsg(null);
    if (!authToken) {
      setPasswordSaveMsg('Inicia sesión autenticada primero.');
      return;
    }
    if (newPasswordInput.length < 8) {
      setPasswordSaveMsg('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    try {
      const res = await fetch('/api/auth/password/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ password: newPasswordInput })
      });
      const d = await res.json();
      if (res.ok) {
        setNewPasswordInput('');
        setPasswordSaveMsg('Contraseña cifrada con scrypt guardada correctamente.');
      } else {
        setPasswordSaveMsg(d.error || 'No se pudo guardar la contraseña.');
      }
    } catch {
      setPasswordSaveMsg('Error de conexión.');
    }
  };

  const updateServerPrivacy = async (patch: Record<string, any>) => {
    if (!authToken) return;
    try {
      await fetch(`/api/users/${currentUser.id}/privacy`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(patch)
      });
    } catch {}
  };

  const handleUnblockUser = async (targetUserId: string) => {
    if (!authToken) return;
    try {
      const res = await fetch(`/api/users/${currentUser.id}/unblock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ targetUserId })
      });
      if (res.ok) {
        setBlockedUsers(prev => prev.filter(u => u.id !== targetUserId));
      }
    } catch {}
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/auth/sessions/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ sessionId })
      });
      if (res.ok) {
        setConnectedDevices(prev => prev.filter(d => d.id !== sessionId));
      }
    } catch {}
  };

  const handleRevokeAllOtherSessions = async () => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/auth/sessions/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ revokeAllOthers: true })
      });
      if (res.ok) {
        setConnectedDevices(prev => prev.filter(d => d.isCurrent));
      }
    } catch {}
  };

  const handleExportBackup = async () => {
    setIsBackingUp(true);
    setBackupSuccessMsg('');
    setBackupErrorMsg('');
    try {
      if (!authToken) {
        setBackupErrorMsg('Necesitas iniciar sesión autenticada para exportar tus datos del servidor.');
        return;
      }
      const res = await fetch('/api/backup/export', { headers: authHeaders });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setBackupErrorMsg(d.error || 'No se pudo exportar la copia.');
        return;
      }
      const payload = await res.json();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nakeic-backup-${currentUser.id}.json`;
      a.click();
      URL.revokeObjectURL(url);

      const now = new Date();
      setLastBackupTime(`Exportado hoy a las ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      setBackupSuccessMsg(`Archivo JSON descargado (${Object.keys(payload.messagesByConversation || {}).length} chats incluidos).`);
    } catch {
      setBackupErrorMsg('Error descargando respaldo.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleClearCache = () => {
    const keysToClear = Object.keys(localStorage).filter(
      k => k.startsWith('nakeic_cache_') || k.startsWith('nakeic_tmp_')
    );
    keysToClear.forEach(k => localStorage.removeItem(k));
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 3000);
  };

  const handleCreatePurchaseIntent = async (packageId: string) => {
    setWalletNotice(null);
    setWalletError(null);
    if (!authToken) {
      setWalletError('Inicia sesión autenticada para comprar paquetes de NAKEIC Coins.');
      return;
    }
    try {
      const res = await fetch('/api/wallet/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ packageId, provider: 'stripe' })
      });
      const data = await res.json();
      if (!res.ok) {
        setWalletError(data.error || 'No se pudo iniciar la compra.');
        return;
      }
      setWalletNotice(
        `Orden pendiente (${data.intent?.id || 'N/A'}). Tu saldo se acreditará únicamente al recibir confirmación HMAC del webhook de pago.`
      );
      loadWalletData();
    } catch {
      setWalletError('Error de red creando intención de pago.');
    }
  };

  const handleSubmitKyc = async () => {
    setWalletNotice(null);
    setWalletError(null);
    try {
      const res = await fetch('/api/wallet/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          fullName: kycFullName,
          country: kycCountry,
          documentNumber: kycDocNumber
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setWalletError(data.error || 'Error enviando documentación KYC.');
        return;
      }
      setWalletNotice('Documentación KYC enviada. El retiro real se habilitará al verificarse tu identidad.');
      loadWalletData();
    } catch {
      setWalletError('Error enviando KYC.');
    }
  };

  const handleRequestWithdraw = async () => {
    setWalletNotice(null);
    setWalletError(null);
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          diamonds: Number(withdrawDiamonds),
          method: withdrawMethod,
          destinationAccount: withdrawDest
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setWalletError(data.error || 'Retiro rechazado.');
        return;
      }
      setWalletNotice(`Solicitud de retiro creada: $${((data.payout?.netCents || 0) / 100).toFixed(2)} USD.`);
      setWithdrawDest('');
      loadWalletData();
    } catch {
      setWalletError('Error enviando solicitud de retiro.');
    }
  };

  // --- Billetera NAKEIC Coins y Monetización ---
  if (activeSubpage === 'wallet') {
    const diamonds = wallet?.creatorDiamonds || 0;
    const estUsd = ((diamonds * 0.5) / 100).toFixed(2);
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-white/5 shrink-0">
          <button
            onClick={() => setActiveSubpage('main')}
            className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-semibold">Billetera NAKEIC Coins y Monetización</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 text-xs">
          {walletError && (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{walletError}</span>
            </div>
          )}
          {walletNotice && (
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{walletNotice}</span>
            </div>
          )}

          {/* Balance cards */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
              <span className="text-[10px] font-bold text-amber-300 uppercase flex items-center gap-1">
                <Coins className="w-3.5 h-3.5" /> NAKEIC Coins
              </span>
              <p className="text-xl font-black text-white tabular-nums">
                {(wallet?.coinsBalance || 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400">Para regalos en NAKEIC LIVE</p>
            </div>

            <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-1">
              <span className="text-[10px] font-bold text-cyan-300 uppercase flex items-center gap-1">
                <Gem className="w-3.5 h-3.5" /> Diamantes Creador
              </span>
              <p className="text-xl font-black text-white tabular-nums">
                {diamonds.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400">≈ ${estUsd} USD (70% creador)</p>
            </div>
          </div>

          {/* Coin packages */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Paquetes de Monedas (Pago vía pasarela HMAC)
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {packages.map(pkg => (
                <button
                  key={pkg.id}
                  onClick={() => handleCreatePurchaseIntent(pkg.id)}
                  className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-left space-y-1 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300">{pkg.coins} Coins</span>
                    {pkg.bonusCoins > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold">
                        +{pkg.bonusCoins}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 font-semibold">{pkg.name}</p>
                  <p className="text-xs font-black text-white">${(pkg.priceCents / 100).toFixed(2)} USD</p>
                </button>
              ))}
            </div>
          </div>

          {/* KYC Verification */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Verificación KYC para Retiros
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                wallet?.kycStatus === 'verified'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : wallet?.kycStatus === 'pending'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-slate-700 text-slate-300'
              }`}>
                {wallet?.kycStatus || 'unverified'}
              </span>
            </div>

            {wallet?.kycStatus !== 'verified' && (
              <div className="space-y-2 pt-1">
                <input
                  type="text"
                  placeholder="Nombre legal completo"
                  value={kycFullName}
                  onChange={e => setKycFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/25 border border-white/10 text-xs outline-none"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="País (MX)"
                    value={kycCountry}
                    onChange={e => setKycCountry(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-black/25 border border-white/10 text-xs outline-none uppercase"
                  />
                  <input
                    type="text"
                    placeholder="Número de documento / ID"
                    value={kycDocNumber}
                    onChange={e => setKycDocNumber(e.target.value)}
                    className="col-span-2 px-3 py-2 rounded-xl bg-black/25 border border-white/10 text-xs outline-none"
                  />
                </div>
                <button
                  onClick={handleSubmitKyc}
                  className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer"
                >
                  Enviar Documentación KYC
                </button>
              </div>
            )}
          </div>

          {/* Payout request form */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <h3 className="font-bold flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-cyan-400" />
              Solicitar Retiro (mín. 1,000 diamantes)
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={withdrawDiamonds}
                onChange={e => setWithdrawDiamonds(e.target.value)}
                placeholder="Diamantes"
                className="px-3 py-2 rounded-xl bg-black/25 border border-white/10 text-xs outline-none"
              />
              <select
                value={withdrawMethod}
                onChange={e => setWithdrawMethod(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs outline-none"
              >
                <option value="bank_transfer">Transferencia Bancaria</option>
                <option value="stripe_connect">Stripe Connect</option>
                <option value="paypal">PayPal</option>
              </select>
            </div>
            <input
              type="text"
              value={withdrawDest}
              onChange={e => setWithdrawDest(e.target.value)}
              placeholder="CLABE / Cuenta destino"
              className="w-full px-3 py-2 rounded-xl bg-black/25 border border-white/10 text-xs outline-none"
            />
            <button
              onClick={handleRequestWithdraw}
              className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
            >
              Solicitar Retiro
            </button>

            {payouts.length > 0 && (
              <div className="pt-2 space-y-1 border-t border-white/10">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Historial de retiros</p>
                {payouts.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-[11px]">
                    <span>{p.amountDiamonds} 💎 ({p.payoutMethod})</span>
                    <span className="font-bold text-emerald-300">${(p.netCents / 100).toFixed(2)} · {p.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ledger */}
          <div className="space-y-1.5">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Movimientos de Billetera ({transactions.length})
            </h3>
            {transactions.length === 0 ? (
              <p className="text-slate-400 italic">Sin movimientos registrados aún.</p>
            ) : (
              transactions.map(tx => (
                <div key={tx.id} className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">{tx.description}</p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(tx.createdAt).toLocaleString()} · {tx.status}
                    </p>
                  </div>
                  <div className="text-right font-mono font-bold">
                    {tx.amountCoins !== 0 && (
                      <span className={tx.type === 'coin_purchase' || tx.type === 'bonus' || tx.type === 'refund' ? 'text-emerald-400' : 'text-amber-300'}>
                        {tx.type === 'gift_sent' ? `-${Math.abs(tx.amountCoins)}` : `+${Math.abs(tx.amountCoins)}`} 🪙
                      </span>
                    )}
                    {tx.amountDiamonds !== 0 && (
                      <span className={`block ${tx.type === 'gift_received' ? 'text-cyan-400' : 'text-rose-400'}`}>
                        {tx.type === 'gift_received' ? `+${Math.abs(tx.amountDiamonds)}` : `-${Math.abs(tx.amountDiamonds)}`} 💎
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // Appearance subpage
  if (activeSubpage === 'appearance') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
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

          <div className="space-y-3 pt-2 border-t border-white/5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Paleta Granular Personalizada
            </label>

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

            <button
              onClick={handleSaveProfile}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer"
            >
              Guardar Perfil en Servidor
            </button>
            {profileSaveMsg && <p className="text-[11px] text-emerald-400">{profileSaveMsg}</p>}

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Número Telefónico</label>
              <div className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-slate-400">
                {currentUser.phoneNumber}
              </div>
            </div>

            {/* Password setup */}
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <span className="text-[10px] font-bold text-cyan-400 uppercase flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> Configurar / Cambiar Contraseña
              </span>
              <input
                type="password"
                value={newPasswordInput}
                onChange={e => setNewPasswordInput(e.target.value)}
                placeholder="Nueva contraseña (mín. 8 caracteres)"
                className="w-full px-3 py-2 rounded-xl bg-black/25 border border-white/10 text-xs outline-none"
              />
              <button
                onClick={handleSetPassword}
                className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 font-bold cursor-pointer"
              >
                Actualizar Contraseña
              </button>
              {passwordSaveMsg && <p className="text-[11px] text-cyan-300">{passwordSaveMsg}</p>}
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5" />
                Huella Digital Criptográfica
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

  // Privacy Subpage (Real Server Privacy + Blocked List)
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
          <h2 className="text-sm font-semibold">Privacidad y Seguridad</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-xs">
          {privacyError && (
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px]">
              {privacyError}
            </div>
          )}

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
                  onClick={() => {
                    setLastSeenPrivacy(opt.id as any);
                    updateServerPrivacy({ lastSeenVisibility: opt.id });
                  }}
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
                  onClick={() => {
                    setProfilePhotoPrivacy(opt.id as any);
                    updateServerPrivacy({ profilePhotoVisibility: opt.id });
                  }}
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

          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
            <div>
              <p className="font-semibold text-xs">Confirmaciones de lectura</p>
              <p className="text-[10px] text-slate-400">Sincronizado con tu perfil en servidor</p>
            </div>
            <input
              type="checkbox"
              checked={readReceipts}
              onChange={e => {
                setReadReceipts(e.target.checked);
                updateServerPrivacy({ readReceiptsEnabled: e.target.checked });
              }}
              className="w-4 h-4 accent-cyan-400 cursor-pointer"
            />
          </div>

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

          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
            <div>
              <p className="font-semibold text-xs flex items-center gap-1.5">
                <Fingerprint className="w-4 h-4 text-emerald-400" />
                Bloqueo Biométrico Android
              </p>
              <p className="text-[10px] text-slate-400">Protege NAKEIC en la app nativa Kotlin</p>
            </div>
            <input
              type="checkbox"
              checked={biometricLock}
              onChange={e => setBiometricLock(e.target.checked)}
              className="w-4 h-4 accent-cyan-400 cursor-pointer"
            />
          </div>

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
                      <p className="font-bold text-xs">{user.displayName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{user.phoneNumber}</p>
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

  // Real Connected Devices Subpage
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
          <h2 className="text-sm font-semibold">Dispositivos Vinculados (Sesiones Reales)</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-xs">
          <div className="text-center space-y-2 py-2">
            <div className="w-16 h-16 rounded-full bg-cyan-500/20 text-cyan-400 mx-auto flex items-center justify-center border border-cyan-500/30 shadow-lg">
              <Laptop className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-sm">Sesiones autenticadas activas</h3>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Cada sesión utiliza un token criptográfico con expiración y revocación inmediata en el servidor.
            </p>
          </div>

          {devicesError && (
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs">
              {devicesError}
            </div>
          )}

          <div className="space-y-2">
            {connectedDevices.map(dev => (
              <div
                key={dev.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-cyan-400">
                    {dev.platform.toLowerCase().includes('android') ? (
                      <Smartphone className="w-5 h-5" />
                    ) : (
                      <Laptop className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-xs">{dev.name}</p>
                    <p className="text-[10px] text-slate-400">{dev.platform}</p>
                    <p className="text-[9px] text-emerald-400 font-medium">
                      {dev.isCurrent ? 'Sesión actual' : `Activo: ${new Date(dev.lastActive).toLocaleString()}`}
                    </p>
                  </div>
                </div>

                {!dev.isCurrent && (
                  <button
                    onClick={() => handleRevokeSession(dev.id)}
                    className="px-2.5 py-1 rounded-xl text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 text-[11px] font-bold cursor-pointer"
                  >
                    Revocar
                  </button>
                )}
              </div>
            ))}
          </div>

          {connectedDevices.some(d => !d.isCurrent) && (
            <button
              onClick={handleRevokeAllOtherSessions}
              className="w-full py-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 font-bold text-xs hover:bg-rose-500/20 cursor-pointer transition-colors"
            >
              Cerrar sesión en todos los demás dispositivos
            </button>
          )}
        </div>
      </div>
    );
  }

  // Backup Subpage (Real JSON Export)
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
          <h2 className="text-sm font-semibold">Copia de Seguridad y Exportación</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
            <div className="flex items-center gap-2.5">
              <Cloud className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="font-bold text-xs">Exportación real de cuenta y chats</p>
                <p className="text-[11px] text-slate-400">{lastBackupTime}</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400">
              Descarga un archivo JSON completo desde <code>/api/backup/export</code> con tu perfil, billetera, chats y estados.
            </p>

            {backupErrorMsg && (
              <p className="text-xs font-bold text-rose-400 pt-1">{backupErrorMsg}</p>
            )}
            {backupSuccessMsg && (
              <p className="text-xs font-bold text-emerald-400 pt-1 flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                {backupSuccessMsg}
              </p>
            )}

            <button
              onClick={handleExportBackup}
              disabled={isBackingUp}
              className="w-full mt-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all disabled:opacity-50"
            >
              <RotateCcw className={`w-4 h-4 ${isBackingUp ? 'animate-spin' : ''}`} />
              <span>{isBackingUp ? 'Generando archivo JSON...' : 'Descargar Copia Real JSON'}</span>
            </button>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-2">
              <p className="font-semibold text-xs">Preferencia de respaldo automático local</p>
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
                <p className="font-semibold text-xs">Incluir metadatos multimedia</p>
                <p className="text-[10px] text-slate-400">Adjunta referencias de videos e imágenes</p>
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

  // Real Storage Subpage
  if (activeSubpage === 'storage') {
    const total = storageStats?.totalBytes || 0;
    const pPct = total > 0 ? Math.round(((storageStats?.photos.bytes || 0) / total) * 100) : 0;
    const vPct = total > 0 ? Math.round(((storageStats?.videos.bytes || 0) / total) * 100) : 0;
    const aPct = total > 0 ? Math.round(((storageStats?.audios.bytes || 0) / total) * 100) : 0;
    const dPct = total > 0 ? Math.round(((storageStats?.docs.bytes || 0) / total) * 100) : 0;

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
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs">Uso medido por el servidor NAKEIC</span>
              <span className="font-bold text-sm text-cyan-400">
                {formatBytes(total)}
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex">
              <div className="h-full bg-cyan-400" style={{ width: `${pPct}%` }} title="Fotos" />
              <div className="h-full bg-purple-500" style={{ width: `${vPct}%` }} title="Vídeos" />
              <div className="h-full bg-emerald-400" style={{ width: `${aPct}%` }} title="Audios" />
              <div className="h-full bg-amber-400" style={{ width: `${dPct}%` }} title="Documentos" />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span className="text-slate-300">
                  Fotos ({storageStats?.photos.count || 0}): {formatBytes(storageStats?.photos.bytes || 0)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span className="text-slate-300">
                  Vídeos ({storageStats?.videos.count || 0}): {formatBytes(storageStats?.videos.bytes || 0)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-slate-300">
                  Audios ({storageStats?.audios.count || 0}): {formatBytes(storageStats?.audios.bytes || 0)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-slate-300">
                  Docs ({storageStats?.docs.count || 0}): {formatBytes(storageStats?.docs.bytes || 0)}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleClearCache}
            className="w-full py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>{cacheCleared ? '¡Caché temporal limpiada!' : 'Limpiar caché temporal local'}</span>
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
          {[
            { title: 'Tonos de conversación', desc: 'Reproducir sonidos para mensajes entrantes', val: messageSound, set: setMessageSound },
            { title: 'Notificaciones de reacciones', desc: 'Mostrar alertas cuando reaccionen a tus mensajes', val: reactionNotifications, set: setReactionNotifications },
            { title: 'Sonido en grupos', desc: 'Notificar mensajes enviados en grupos', val: groupSound, set: setGroupSound },
            { title: 'Vibración en llamadas', desc: 'Vibrar al recibir llamadas WebRTC de voz o video', val: callVibrate, set: setCallVibrate }
          ].map(row => (
            <div key={row.title} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
              <div>
                <p className="font-semibold text-xs">{row.title}</p>
                <p className="text-[10px] text-slate-400">{row.desc}</p>
              </div>
              <input
                type="checkbox"
                checked={row.val}
                onChange={e => row.set(e.target.checked)}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </div>
          ))}
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
        {/* NAKEIC Wallet & Monetization */}
        <button
          onClick={() => setActiveSubpage('wallet')}
          className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 hover:border-amber-400 text-left transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-300">Billetera NAKEIC Coins y Monetización</p>
              <p className="text-[10px] text-slate-400">
                {wallet
                  ? `${wallet.coinsBalance.toLocaleString()} Coins · ${wallet.creatorDiamonds.toLocaleString()} Diamantes`
                  : 'Saldo, paquetes, verificación KYC y retiros'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-400" />
        </button>

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
              <p className="text-[10px] text-slate-400">E2EE, última conexión, bloqueados</p>
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
              <p className="text-[10px] text-slate-400">
                {authToken ? `${connectedDevices.length} sesiones activas · Revocación real` : 'Inicia sesión para gestionar sesiones'}
              </p>
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
              <p className="text-[10px] text-slate-400">Exportar respaldo JSON real desde el servidor</p>
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
              <p className="text-[10px] text-slate-400">Métricas reales de medios y caché</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        {/* Logout */}
        {authToken && (
          <button
            onClick={logoutSession}
            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-rose-500/10 text-rose-400 text-left transition-colors cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center">
              <LogOut className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold">Cerrar Sesión Actual</p>
              <p className="text-[10px] text-slate-400">Revocar token en servidor</p>
            </div>
          </button>
        )}

        {/* Help & About Item */}
        <div className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 text-left transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-500/20 text-slate-400 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold">Acerca de NAKEIC</p>
              <p className="text-[10px] text-slate-400">Versión 2.6.0 (Android 15 / SDK 35 + NAKEIC LIVE)</p>
            </div>
          </div>
        </div>
      </div>

      <DownloadApkModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
      />
    </div>
  );
};
