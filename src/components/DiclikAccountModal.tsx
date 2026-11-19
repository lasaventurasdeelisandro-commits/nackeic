import React, { useEffect, useState } from "react";
import {
  X,
  User,
  Lock,
  LogOut,
  Wallet,
  Bell,
  FileCheck,
  Star,
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  ShieldCheck
} from "lucide-react";
import { api } from "../services/api.ts";

export interface AuthUserSummary {
  id: string;
  email: string;
  role: "cliente" | "tecnico" | "profesional" | "admin";
  fullName: string;
  phone?: string;
}

interface DiclikAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUserSummary | null;
  initialRole: Exclude<AuthUserSummary["role"], "admin">;
  onAuthChanged: (user: AuthUserSummary | null) => void;
  onSpeak: (text: string) => void;
}

export const DiclikAccountModal: React.FC<DiclikAccountModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialRole,
  onAuthChanged,
  onSpeak
}) => {
  const [authTab, setAuthTab] = useState<"login" | "register" | "recover">("login");
  const [panelTab, setPanelTab] = useState<"perfil" | "billetera" | "contratos" | "alertas">("perfil");

  // Auth form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"cliente" | "tecnico" | "profesional">(initialRole);
  const [trade, setTrade] = useState("plomeria");
  const [address, setAddress] = useState("Santo Domingo, República Dominicana");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [recoveryTokenPreview, setRecoveryTokenPreview] = useState<string | null>(null);

  useEffect(() => {
    setRole(initialRole);
  }, [initialRole]);

  // Account data states
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editBio, setEditBio] = useState("");

  // Action modal feedback states
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [reviewingContractId, setReviewingContractId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [disputingContractId, setDisputingContractId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawBank, setWithdrawBank] = useState("Banco Popular Dominicano");
  const [withdrawAccount, setWithdrawAccount] = useState("");

  const loadAccountData = async () => {
    if (!currentUser) return;
    try {
      const [meData, ledgerData, txData, contractsData, notifData] = await Promise.all([
        api.auth.getMe(),
        api.wallet.getLedger().catch(() => null),
        api.wallet.getTransactions().catch(() => []),
        api.services.listContracts().catch(() => []),
        api.services.getNotifications().catch(() => [])
      ]);
      if (meData) {
        const u = meData.user || meData;
        setEditName(u.full_name || currentUser.fullName || "");
        setEditPhone(u.phone || "");
        setEditAddress(meData.profile?.default_address || "");
        setEditBio(meData.profile?.bio || "");
      }
      if (ledgerData) setWallet(ledgerData);
      setTransactions(Array.isArray(txData) ? txData : []);
      setContracts(Array.isArray(contractsData) ? contractsData : []);
      setNotifications(Array.isArray(notifData) ? notifData : []);
    } catch {
      // Handled per-request
    }
  };

  useEffect(() => {
    if (isOpen && currentUser) {
      loadAccountData();
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.auth.login(email.trim(), password);
      onAuthChanged(res.user);
      setFeedback({ type: "ok", msg: `Bienvenido a Diclik.com, ${res.user.fullName}.` });
      onSpeak(`Sesión iniciada en Diclik.com como ${res.user.fullName}`);
    } catch (err: any) {
      setFeedback({ type: "err", msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.auth.register({
        email: email.trim(),
        password,
        role,
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        trade: role !== "cliente" ? trade : undefined,
        address: address.trim()
      });
      onAuthChanged(res.user);
      setFeedback({ type: "ok", msg: "¡Cuenta creada en Diclik.com!" });
      onSpeak(`Cuenta creada exitosamente en Diclik.com`);
    } catch (err: any) {
      setFeedback({ type: "err", msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.auth.forgotPassword(email.trim());
      if (res.devResetToken) {
        setRecoveryTokenPreview(res.devResetToken);
        setResetToken(res.devResetToken);
      }
      setFeedback({ type: "ok", msg: res.message });
    } catch (err: any) {
      setFeedback({ type: "err", msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.auth.resetPassword(resetToken.trim(), newPassword);
      setFeedback({ type: "ok", msg: res.message });
      setAuthTab("login");
    } catch (err: any) {
      setFeedback({ type: "err", msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      await api.auth.updateProfile({
        fullName: editName.trim(),
        phone: editPhone.trim(),
        address: editAddress.trim(),
        bio: editBio.trim()
      });
      if (currentUser) {
        onAuthChanged({ ...currentUser, fullName: editName.trim(), phone: editPhone.trim() });
      }
      setFeedback({ type: "ok", msg: "Perfil actualizado en PostgreSQL." });
    } catch (err: any) {
      setFeedback({ type: "err", msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    await api.auth.logout();
    onAuthChanged(null);
    setLoading(false);
    setFeedback({ type: "ok", msg: "Sesión cerrada y token revocado." });
  };

  const handleCancelContract = async (contractId: string) => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.services.cancelContract(
        contractId,
        "client_before_arrival",
        "Cancelación solicitada por usuario desde panel Diclik.com"
      );
      setFeedback({
        type: "ok",
        msg: `Contrato cancelado. Reembolso: RD$ ${Number(res.clientRefundAmount || 0).toLocaleString()}`
      });
      await loadAccountData();
    } catch (err: any) {
      setFeedback({ type: "err", msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputingContractId) return;
    setLoading(true);
    setFeedback(null);
    try {
      await api.services.openDispute(disputingContractId, disputeReason.trim());
      setDisputingContractId(null);
      setDisputeReason("");
      setFeedback({ type: "ok", msg: "Disputa registrada y fondos congelados para arbitraje." });
      await loadAccountData();
    } catch (err: any) {
      setFeedback({ type: "err", msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingContractId) return;
    setLoading(true);
    setFeedback(null);
    try {
      await api.services.submitReview(reviewingContractId, reviewRating, reviewComment.trim());
      setReviewingContractId(null);
      setReviewComment("");
      setFeedback({ type: "ok", msg: "¡Calificación publicada en el historial del especialista!" });
      await loadAccountData();
    } catch (err: any) {
      setFeedback({ type: "err", msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkNotifRead = async (id: string) => {
    await api.services.markNotificationRead(id).catch(() => {});
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleRequestWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(withdrawAmount);
    if (!num || num <= 0) return;
    setLoading(true);
    setFeedback(null);
    try {
      const idemKey = `wd_${currentUser?.id || "u"}_${Date.now()}`;
      const res = await api.wallet.withdraw(num, withdrawAccount.trim(), withdrawBank.trim(), idemKey);
      setWithdrawAmount("");
      setWithdrawAccount("");
      setFeedback({ type: "ok", msg: res.message || `Retiro solicitado por RD$ ${num.toLocaleString()}` });
      await loadAccountData();
    } catch (err: any) {
      setFeedback({ type: "err", msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-fadeIn">
      <div className="bg-slate-900 border-2 border-blue-500/40 rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-3.5 bg-gradient-to-r from-[#00103d] via-slate-900 to-[#00103d] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <img
              src="/assets/brand/diclik-icon-simple.png"
              alt="Diclik.com"
              className="w-8 h-8 rounded-lg object-cover border border-amber-400/50"
            />
            <div>
              <h3 className="text-xs font-black text-white">
                {currentUser ? currentUser.fullName : "Acceso Seguro Diclik.com"}
              </h3>
              <p className="text-[10px] text-amber-400 font-bold">
                {currentUser ? `${currentUser.role.toUpperCase()} • ${currentUser.email}` : "Un clic, miles de soluciones"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar cuenta"
            className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`mx-3.5 mt-3 p-2.5 rounded-xl text-[11px] font-bold flex items-center space-x-2 ${
              feedback.type === "ok"
                ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-300"
                : "bg-rose-500/15 border border-rose-500/40 text-rose-300"
            }`}
          >
            {feedback.type === "ok" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.msg}</span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          {!currentUser ? (
            <>
              {/* Auth Tabs */}
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-extrabold">
                <button
                  onClick={() => setAuthTab("login")}
                  className={`py-1.5 rounded-lg cursor-pointer ${
                    authTab === "login" ? "bg-amber-400 text-slate-950" : "text-slate-400"
                  }`}
                >
                  Iniciar Sesión
                </button>
                <button
                  onClick={() => setAuthTab("register")}
                  className={`py-1.5 rounded-lg cursor-pointer ${
                    authTab === "register" ? "bg-amber-400 text-slate-950" : "text-slate-400"
                  }`}
                >
                  Registrarse
                </button>
                <button
                  onClick={() => setAuthTab("recover")}
                  className={`py-1.5 rounded-lg cursor-pointer ${
                    authTab === "recover" ? "bg-amber-400 text-slate-950" : "text-slate-400"
                  }`}
                >
                  Recuperar
                </button>
              </div>

              {authTab === "login" && (
                <form onSubmit={handleLogin} className="space-y-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 block mb-1">Correo electrónico</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="cliente@diclik.com"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 block mb-1">Contraseña</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{loading ? "Verificando..." : "ENTRAR A DICLIK.COM"}</span>
                  </button>
                </form>
              )}

              {authTab === "register" && (
                <form onSubmit={handleRegister} className="space-y-2">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nombre completo"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Correo electrónico"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña segura (mín. 8 caracteres)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white"
                    >
                      <option value="cliente">Cliente</option>
                      <option value="tecnico">Técnico</option>
                      <option value="profesional">Profesional</option>
                    </select>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Teléfono"
                      className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white"
                    />
                  </div>
                  {role !== "cliente" && (
                    <input
                      type="text"
                      value={trade}
                      onChange={(e) => setTrade(e.target.value)}
                      placeholder="Especialidad (ej: plomeria, electricidad, legal)"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  )}
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Dirección o sector"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs rounded-xl cursor-pointer"
                  >
                    {loading ? "Creando cuenta..." : "CREAR CUENTA EN DICLIK.COM"}
                  </button>
                </form>
              )}

              {authTab === "recover" && (
                <div className="space-y-3">
                  <form onSubmit={handleForgotPassword} className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-300 block">
                      1. Solicitar token temporal de recuperación:
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Tu correo registrado"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Generar Código de Recuperación
                    </button>
                  </form>

                  {recoveryTokenPreview && (
                    <div className="p-2 bg-slate-950 border border-amber-400/40 rounded-xl text-[10px] text-amber-300 font-mono break-all">
                      Token desarrollo: {recoveryTokenPreview}
                    </div>
                  )}

                  <form onSubmit={handleResetPassword} className="space-y-2 pt-2 border-t border-slate-800">
                    <label className="text-[10px] font-bold text-slate-300 block">
                      2. Restablecer contraseña con tu token:
                    </label>
                    <input
                      type="text"
                      required
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder="Token de recuperación"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nueva contraseña (mín. 8 caracteres)"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2 bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Confirmar Cambio de Contraseña</span>
                    </button>
                  </form>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Logged In Panel Tabs */}
              <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px] font-extrabold">
                <button
                  onClick={() => setPanelTab("perfil")}
                  className={`py-1.5 rounded-lg flex items-center justify-center space-x-1 cursor-pointer ${
                    panelTab === "perfil" ? "bg-amber-400 text-slate-950" : "text-slate-400"
                  }`}
                >
                  <User className="w-3 h-3" />
                  <span>Perfil</span>
                </button>
                <button
                  onClick={() => setPanelTab("billetera")}
                  className={`py-1.5 rounded-lg flex items-center justify-center space-x-1 cursor-pointer ${
                    panelTab === "billetera" ? "bg-amber-400 text-slate-950" : "text-slate-400"
                  }`}
                >
                  <Wallet className="w-3 h-3" />
                  <span>Wallet</span>
                </button>
                <button
                  onClick={() => setPanelTab("contratos")}
                  className={`py-1.5 rounded-lg flex items-center justify-center space-x-1 cursor-pointer ${
                    panelTab === "contratos" ? "bg-amber-400 text-slate-950" : "text-slate-400"
                  }`}
                >
                  <FileCheck className="w-3 h-3" />
                  <span>Historial</span>
                </button>
                <button
                  onClick={() => setPanelTab("alertas")}
                  className={`py-1.5 rounded-lg flex items-center justify-center space-x-1 cursor-pointer ${
                    panelTab === "alertas" ? "bg-amber-400 text-slate-950" : "text-slate-400"
                  }`}
                >
                  <Bell className="w-3 h-3" />
                  <span>Alertas</span>
                </button>
              </div>

              {panelTab === "perfil" && (
                <form onSubmit={handleSaveProfile} className="space-y-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400">Nombre completo</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400">Teléfono</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white mt-0.5"
                    />
                  </div>
                  {currentUser.role === "cliente" ? (
                    <div>
                      <label className="text-[10px] font-bold text-slate-400">Dirección predeterminada</label>
                      <input
                        type="text"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white mt-0.5"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-[10px] font-bold text-slate-400">Biografía profesional</label>
                      <textarea
                        rows={2}
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white mt-0.5"
                      />
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl cursor-pointer"
                  >
                    Guardar Cambios en PostgreSQL
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full py-2 bg-slate-800 hover:bg-rose-900/60 text-rose-300 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Cerrar Sesión y Revocar Token</span>
                  </button>
                </form>
              )}

              {panelTab === "billetera" && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Disponible</span>
                      <span className="text-sm font-black text-emerald-400">
                        RD$ {Number(wallet?.balance_available || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Custodia Escrow</span>
                      <span className="text-sm font-black text-amber-400">
                        RD$ {Number(wallet?.balance_locked_escrow || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5 bg-blue-950/40 border border-blue-500/30 rounded-xl text-[10px] text-blue-200 flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Acreditaciones reales vía pasarela autorizada y webhook HMAC-SHA256.</span>
                  </div>
                  <form onSubmit={handleRequestWithdraw} className="p-2.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                    <div className="text-[10px] font-bold text-slate-300 uppercase">Solicitar Retiro Bancario</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="number"
                        min={100}
                        step="0.01"
                        required
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="Monto (RD$)"
                        className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                      />
                      <input
                        type="text"
                        required
                        minLength={3}
                        value={withdrawBank}
                        onChange={(e) => setWithdrawBank(e.target.value)}
                        placeholder="Banco"
                        className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        required
                        minLength={4}
                        value={withdrawAccount}
                        onChange={(e) => setWithdrawAccount(e.target.value)}
                        placeholder="Número de cuenta destino"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                      />
                      <button
                        type="submit"
                        disabled={loading || Number(wallet?.balance_available || 0) <= 0}
                        className="px-3 py-1.5 bg-emerald-500 disabled:opacity-40 text-slate-950 font-black text-[11px] rounded-xl cursor-pointer shrink-0"
                      >
                        Retirar
                      </button>
                    </div>
                  </form>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto">
                    {transactions.length === 0 ? (
                      <p className="text-[11px] text-slate-400 text-center py-4">Sin movimientos financieros aún.</p>
                    ) : (
                      transactions.map((tx) => (
                        <div key={tx.id} className="p-2 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-[10px]">
                          <div>
                            <div className="font-bold text-white">{tx.description}</div>
                            <div className="text-slate-400">{tx.type} • {tx.status}</div>
                          </div>
                          <div className="font-black text-amber-300">RD$ {Number(tx.amount).toLocaleString()}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {panelTab === "contratos" && (
                <div className="space-y-2.5">
                  {contracts.length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center py-6">No tienes contratos registrados.</p>
                  ) : (
                    contracts.map((c) => (
                      <div key={c.id} className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-[11px]">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-black text-white">{c.request_title}</div>
                            <div className="text-[10px] text-slate-400">
                              {c.client_name} ↔ {c.pro_name}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 text-[9px] font-bold uppercase">
                            {c.status}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-emerald-400 font-bold">RD$ {Number(c.agreed_price).toLocaleString()}</span>
                          {c.otp_code && (
                            <span className="text-sky-300 font-mono font-bold">OTP: {c.otp_code}</span>
                          )}
                        </div>

                        {["held_in_escrow", "active_in_transit", "in_progress"].includes(c.status) && (
                          <div className="flex gap-1.5 pt-1">
                            {(currentUser.role === "cliente" || currentUser.role === "admin") && <button
                              onClick={() => handleCancelContract(c.id)}
                              className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-bold cursor-pointer"
                            >
                              Cancelar
                            </button>}
                            <button
                              onClick={() => setDisputingContractId(c.id)}
                              className="flex-1 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-500/40 rounded-lg text-[10px] font-bold cursor-pointer"
                            >
                              Abrir Disputa
                            </button>
                          </div>
                        )}

                        {c.status === "completed" && (
                          <button
                            onClick={() => setReviewingContractId(c.id)}
                            className="w-full py-1.5 bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 rounded-lg text-[10px] font-bold flex items-center justify-center space-x-1 cursor-pointer"
                          >
                            <Star className="w-3 h-3" />
                            <span>Calificar Servicio</span>
                          </button>
                        )}
                      </div>
                    ))
                  )}

                  {disputingContractId && (
                    <form onSubmit={handleOpenDispute} className="p-3 bg-slate-950 border border-rose-500/50 rounded-2xl space-y-2">
                      <div className="text-[11px] font-bold text-rose-300">Reclamación sobre contrato {disputingContractId}</div>
                      <textarea
                        required
                        minLength={5}
                        rows={2}
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        placeholder="Describe el inconveniente ocurrido..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white"
                      />
                      <div className="flex gap-2">
                        <button type="submit" className="flex-1 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-xl cursor-pointer">
                          Enviar Disputa
                        </button>
                        <button
                          type="button"
                          onClick={() => setDisputingContractId(null)}
                          className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-xl cursor-pointer"
                        >
                          Cerrar
                        </button>
                      </div>
                    </form>
                  )}

                  {reviewingContractId && (
                    <form onSubmit={handleSubmitReview} className="p-3 bg-slate-950 border border-amber-400/50 rounded-2xl space-y-2">
                      <div className="text-[11px] font-bold text-amber-300">Calificar contrato {reviewingContractId}</div>
                      <select
                        value={reviewRating}
                        onChange={(e) => setReviewRating(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-white"
                      >
                        <option value={5}>5 estrellas — Excelente</option>
                        <option value={4}>4 estrellas — Muy bueno</option>
                        <option value={3}>3 estrellas — Regular</option>
                        <option value={2}>2 estrellas — Deficiente</option>
                        <option value={1}>1 estrella — Malo</option>
                      </select>
                      <textarea
                        rows={2}
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Comentario opcional sobre puntualidad y calidad..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white"
                      />
                      <div className="flex gap-2">
                        <button type="submit" className="flex-1 py-1.5 bg-amber-400 text-slate-950 text-xs font-black rounded-xl cursor-pointer">
                          Publicar Reseña
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewingContractId(null)}
                          className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-xl cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {panelTab === "alertas" && (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center py-6">Sin notificaciones pendientes.</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleMarkNotifRead(n.id)}
                        className={`p-2.5 rounded-xl border text-[11px] cursor-pointer ${
                          n.read
                            ? "bg-slate-950 border-slate-800 text-slate-400"
                            : "bg-blue-950/40 border-blue-500/40 text-white"
                        }`}
                      >
                        <div className="font-bold">{n.title}</div>
                        <div className="text-[10px] opacity-80">{n.body}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
