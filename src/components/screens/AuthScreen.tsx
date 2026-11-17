import React, { useState, useEffect, useRef } from 'react';
import { Shield, ArrowRight, KeyRound, Lock, RefreshCw, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NakeicLogo } from '../common/NakeicLogo';

interface AuthScreenProps {
  onComplete: () => void;
}

type AuthMode = 'otp' | 'password' | 'recover';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onComplete }) => {
  const { theme, applyAuthenticatedSession } = useApp();
  const [step, setStep] = useState<'welcome' | 'phone' | 'otp' | 'profile'>('welcome');
  const [authMode, setAuthMode] = useState<AuthMode>('otp');
  const [countryCode, setCountryCode] = useState('+52');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [verifiedOtpCode, setVerifiedOtpCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('Conectado con NAKEIC');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => {
      setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const countries = [
    { name: 'México', code: '+52', flag: '🇲🇽' },
    { name: 'España', code: '+34', flag: '🇪🇸' },
    { name: 'Estados Unidos', code: '+1', flag: '🇺🇸' },
    { name: 'Argentina', code: '+54', flag: '🇦🇷' },
    { name: 'Colombia', code: '+57', flag: '🇨🇴' },
    { name: 'Chile', code: '+56', flag: '🇨🇱' },
    { name: 'Perú', code: '+51', flag: '🇵🇪' }
  ];

  const fullPhone = `${countryCode} ${phoneNumber.trim()}`.trim();

  const handleSendOtp = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    if (!phoneNumber.trim() || phoneNumber.replace(/\D/g, '').length < 6) {
      setErrorMsg('Introduce un número telefónico válido.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: fullPhone,
          purpose: authMode === 'recover' ? 'recover' : 'auth'
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'No se pudo enviar el código SMS.');
        return;
      }
      setResendCooldown(data.resendAfterSeconds || 30);
      setOtpCode(['', '', '', '', '', '']);
      setInfoMsg(`Código enviado a ${fullPhone}. Expira en ${Math.round((data.expiresInSeconds || 300) / 60)} min.`);
      setStep('otp');
    } catch (e: any) {
      setErrorMsg(e?.message || 'Error de conexión con el servidor NAKEIC.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    if (!phoneNumber.trim() || !password) {
      setErrorMsg('Ingresa tu número y contraseña.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: fullPhone, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Credenciales inválidas.');
        return;
      }
      applyAuthenticatedSession(data.user, data.token);
      onComplete();
    } catch (e: any) {
      setErrorMsg(e?.message || 'Error al iniciar sesión.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtpStep = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    const code = otpCode.join('').trim();
    if (code.length !== 6) {
      setErrorMsg('Ingresa los 6 dígitos del código SMS.');
      return;
    }

    setIsLoading(true);
    try {
      if (authMode === 'recover') {
        if (!newPassword || newPassword.length < 8) {
          setErrorMsg('La nueva contraseña debe tener al menos 8 caracteres.');
          setIsLoading(false);
          return;
        }
        const res = await fetch('/api/auth/password/recover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: fullPhone, otpCode: code, newPassword })
        });
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || 'No se pudo recuperar la cuenta.');
          return;
        }
        applyAuthenticatedSession(data.user, data.token);
        onComplete();
        return;
      }

      // First attempt login if account already exists
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: fullPhone, otpCode: code })
      });
      const loginData = await loginRes.json();

      if (loginRes.ok && loginData.token && loginData.user) {
        applyAuthenticatedSession(loginData.user, loginData.token);
        onComplete();
        return;
      }

      if (loginRes.status === 404) {
        // New user — move to profile creation while holding verified OTP
        setVerifiedOtpCode(code);
        setStep('profile');
        return;
      }

      setErrorMsg(loginData.error || 'Código OTP incorrecto o expirado.');
    } catch (e: any) {
      setErrorMsg(e?.message || 'Error al verificar código.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteRegistration = async () => {
    setErrorMsg(null);
    if (!displayName.trim()) {
      setErrorMsg('Ingresa tu nombre visible para continuar.');
      return;
    }
    if (password && password.length < 8) {
      setErrorMsg('Si configuras contraseña, debe tener mínimo 8 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: fullPhone,
          otpCode: verifiedOtpCode || otpCode.join(''),
          displayName: displayName.trim(),
          username: username.trim() || undefined,
          bio: bio.trim() || undefined,
          password: password || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'No se pudo completar el registro.');
        return;
      }
      applyAuthenticatedSession(data.user, data.token);
      onComplete();
    } catch (e: any) {
      setErrorMsg(e?.message || 'Error en el registro.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderFeedback = () => (
    <>
      {errorMsg && (
        <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {infoMsg && (
        <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{infoMsg}</span>
        </div>
      )}
    </>
  );

  return (
    <div className="flex-1 flex flex-col justify-between p-6 text-slate-100 overflow-y-auto">
      {/* 1. Welcome Screen */}
      {step === 'welcome' && (
        <div className="flex-1 flex flex-col justify-between items-center text-center my-auto animate-in fade-in duration-200">
          <div className="my-auto flex flex-col items-center gap-5">
            <NakeicLogo size="xl" variant="full" />

            <div className="space-y-1 mt-3">
              <h1 className="text-base font-black tracking-widest uppercase leading-none text-slate-200">NAKEIC</h1>
              <p className="text-[11px] font-bold text-cyan-400 tracking-widest uppercase">
                CONECTA SIN LÍMITES
              </p>
            </div>

            <p className="text-sm text-slate-300 max-w-xs leading-relaxed font-normal">
              Mensajería cifrada E2EE, llamadas WebRTC y transmisiones NAKEIC LIVE en una sola plataforma segura.
            </p>

            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-emerald-400 font-semibold">
              <Shield className="w-4 h-4" />
              <span>Sesiones firmadas y verificación SMS real</span>
            </div>
          </div>

          <button
            onClick={() => setStep('phone')}
            className="w-full py-4 rounded-2xl font-bold text-sm text-white shadow-2xl transition-transform hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            style={{ backgroundColor: theme.primaryColor }}
          >
            <span>Aceptar y Continuar</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 2. Phone / Password / Recover Selector */}
      {step === 'phone' && (
        <div className="flex-1 flex flex-col justify-between my-auto animate-in fade-in duration-200">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-white/5 border border-white/10">
              {[
                { id: 'otp', label: 'Código OTP' },
                { id: 'password', label: 'Contraseña' },
                { id: 'recover', label: 'Recuperar' }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    setAuthMode(m.id as AuthMode);
                    setErrorMsg(null);
                    setInfoMsg(null);
                  }}
                  className={`py-2 rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
                    authMode === m.id ? 'bg-cyan-500 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <h2 className="text-lg font-bold">
              {authMode === 'otp'
                ? 'Accede o regístrate con SMS'
                : authMode === 'password'
                ? 'Iniciar sesión con contraseña'
                : 'Recuperar acceso por SMS'}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {authMode === 'password'
                ? 'Ingresa tu número registrado y tu contraseña segura scrypt.'
                : authMode === 'recover'
                ? 'Te enviaremos un código OTP para restablecer tu contraseña y revocar sesiones previas.'
                : 'NAKEIC enviará un código de verificación real de 6 dígitos para confirmar tu identidad.'}
            </p>

            {renderFeedback()}

            <div className="space-y-2 pt-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">País / Región</label>
              <select
                value={countryCode}
                onChange={e => setCountryCode(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-white outline-none cursor-pointer"
              >
                {countries.map(c => (
                  <option key={c.code} value={c.code} className="bg-slate-900 text-white">
                    {c.flag} {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Número Telefónico</label>
              <div className="flex items-center gap-2">
                <span className="px-3 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs font-mono font-bold text-cyan-400">
                  {countryCode}
                </span>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="55 1234 5678"
                  className="flex-1 px-3 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs font-mono text-white outline-none"
                />
              </div>
            </div>

            {authMode === 'password' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-3 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-white outline-none"
                />
              </div>
            )}
          </div>

          <button
            onClick={authMode === 'password' ? handlePasswordLogin : handleSendOtp}
            disabled={isLoading}
            className="w-full py-3.5 rounded-2xl font-bold text-xs text-white shadow-xl transition-transform hover:scale-[1.02] active:scale-95 cursor-pointer mt-6 disabled:opacity-50"
            style={{ backgroundColor: theme.primaryColor }}
          >
            {isLoading
              ? 'Procesando...'
              : authMode === 'password'
              ? 'Iniciar Sesión'
              : 'Enviar Código OTP'}
          </button>
        </div>
      )}

      {/* 3. OTP Code Verification (+ New Password if recovering) */}
      {step === 'otp' && (
        <div className="flex-1 flex flex-col justify-between my-auto animate-in fade-in duration-200">
          <div className="space-y-4">
            <button
              onClick={() => setStep('phone')}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Cambiar número
            </button>

            <h2 className="text-lg font-bold">Verificar Número</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ingresa el código de 6 dígitos enviado a{' '}
              <strong className="text-cyan-400">{fullPhone}</strong>.
            </p>

            {renderFeedback()}

            <div className="flex justify-between gap-1.5 pt-2">
              {otpCode.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => { otpInputRefs.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(-1);
                    const next = [...otpCode];
                    next[idx] = val;
                    setOtpCode(next);
                    if (val && idx < 5) {
                      otpInputRefs.current[idx + 1]?.focus();
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Backspace' && !otpCode[idx] && idx > 0) {
                      otpInputRefs.current[idx - 1]?.focus();
                    }
                  }}
                  className="w-11 h-12 rounded-xl bg-white/5 border border-white/20 text-center font-mono text-lg font-bold text-cyan-400 outline-none focus:border-cyan-400"
                />
              ))}
            </div>

            {authMode === 'recover' && (
              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <KeyRound className="w-3 h-3" /> Nueva Contraseña (mínimo 8 caracteres)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Nueva contraseña segura"
                  className="w-full px-3 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-white outline-none"
                />
              </div>
            )}

            <div className="text-center pt-2">
              <button
                onClick={handleSendOtp}
                disabled={resendCooldown > 0 || isLoading}
                className="text-[11px] font-semibold text-cyan-400 disabled:text-slate-500 cursor-pointer inline-flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                {resendCooldown > 0 ? `Reenviar código en ${resendCooldown}s` : 'Reenviar código SMS'}
              </button>
            </div>
          </div>

          <button
            onClick={handleVerifyOtpStep}
            disabled={isLoading}
            className="w-full py-3.5 rounded-2xl font-bold text-xs text-white shadow-xl transition-transform hover:scale-[1.02] active:scale-95 cursor-pointer mt-6 disabled:opacity-50"
            style={{ backgroundColor: theme.primaryColor }}
          >
            {isLoading
              ? 'Verificando...'
              : authMode === 'recover'
              ? 'Restablecer Contraseña'
              : 'Verificar Código'}
          </button>
        </div>
      )}

      {/* 4. Profile Creation for New Accounts */}
      {step === 'profile' && (
        <div className="flex-1 flex flex-col justify-between my-auto animate-in fade-in duration-200">
          <div className="space-y-3.5">
            <h2 className="text-lg font-bold">Completa tu Perfil NAKEIC</h2>
            <p className="text-xs text-slate-400">
              Número verificado: <strong className="text-emerald-400">{fullPhone}</strong>
            </p>

            {renderFeedback()}

            <div className="space-y-3 pt-1">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Nombre Completo</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Tu nombre visible"
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Nombre de Usuario (@)</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="ej. usuario_nakeic"
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Estado / Bio</label>
                <input
                  type="text"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Contraseña de respaldo (opcional, mín. 8 caracteres)</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Para iniciar sesión sin esperar SMS"
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs outline-none"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleCompleteRegistration}
            disabled={isLoading}
            className="w-full py-3.5 rounded-2xl font-bold text-xs text-white shadow-xl transition-transform hover:scale-[1.02] active:scale-95 cursor-pointer mt-6 disabled:opacity-50"
            style={{ backgroundColor: theme.primaryColor }}
          >
            {isLoading ? 'Creando cuenta...' : 'Crear Cuenta y Entrar'}
          </button>
        </div>
      )}
    </div>
  );
};
