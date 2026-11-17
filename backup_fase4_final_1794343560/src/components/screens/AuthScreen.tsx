import React, { useState } from 'react';
import { Shield, ArrowRight, Check, Phone, User, Camera, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NakeicLogo } from '../common/NakeicLogo';

interface AuthScreenProps {
  onComplete: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onComplete }) => {
  const { theme, updateCurrentUser } = useApp();
  const [step, setStep] = useState<'welcome' | 'phone' | 'otp' | 'profile'>('welcome');
  const [countryCode, setCountryCode] = useState('+52');
  const [phoneNumber, setPhoneNumber] = useState('55 8923 4410');
  const [otpCode, setOtpCode] = useState(['8', '4', '2', '9', '1', '0']);
  const [displayName, setDisplayName] = useState('Alex Valenzuela');
  const [username, setUsername] = useState('alexv_nakeic');
  const [bio, setBio] = useState('Explorando arquitectura nativa Android & seguridad 🔐');

  const countries = [
    { name: 'México', code: '+52', flag: '🇲🇽' },
    { name: 'España', code: '+34', flag: '🇪🇸' },
    { name: 'Estados Unidos', code: '+1', flag: '🇺🇸' },
    { name: 'Argentina', code: '+54', flag: '🇦🇷' },
    { name: 'Colombia', code: '+57', flag: '🇨🇴' },
    { name: 'Chile', code: '+56', flag: '🇨🇱' },
    { name: 'Perú', code: '+51', flag: '🇵🇪' }
  ];

  const handleFinishProfile = () => {
    updateCurrentUser({
      phoneNumber: `${countryCode} ${phoneNumber}`,
      displayName,
      username,
      bio
    });
    onComplete();
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 text-slate-100 overflow-y-auto">
      {/* 1. Welcome Screen */}
      {step === 'welcome' && (
        <div className="flex-1 flex flex-col justify-between items-center text-center my-auto animate-in fade-in duration-200">
          <div className="my-auto flex flex-col items-center gap-5">
            {/* Official NAKEIC Logo - Extra Large & Prominent */}
            <NakeicLogo size="xl" variant="full" />

            <div className="space-y-1 mt-3">
              <h1 className="text-base font-black tracking-widest uppercase leading-none text-slate-200">NAKEIC</h1>
              <p className="text-[11px] font-bold text-cyan-400 tracking-widest uppercase">
                CONECTA SIN LÍMITES
              </p>
            </div>

            <p className="text-sm text-slate-300 max-w-xs leading-relaxed font-normal">
              Comunicación privada nativa para Android. Cifrado de extremo a extremo, llamadas WebRTC y personalización total.
            </p>

            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-emerald-400 font-semibold">
              <Shield className="w-4 h-4" />
              <span>Privacidad garantizada sin rastreadores</span>
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

      {/* 2. Phone Verification Input */}
      {step === 'phone' && (
        <div className="flex-1 flex flex-col justify-between my-auto animate-in fade-in duration-200">
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Introduce tu número</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              NAKEIC enviará un código de verificación SMS para confirmar tu número telefónico.
            </p>

            <div className="space-y-2 pt-2">
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
          </div>

          <button
            onClick={() => setStep('otp')}
            className="w-full py-3.5 rounded-2xl font-bold text-xs text-white shadow-xl transition-transform hover:scale-[1.02] active:scale-95 cursor-pointer mt-6"
            style={{ backgroundColor: theme.primaryColor }}
          >
            Siguiente
          </button>
        </div>
      )}

      {/* 3. OTP Code Verification */}
      {step === 'otp' && (
        <div className="flex-1 flex flex-col justify-between my-auto animate-in fade-in duration-200">
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Verificar Número</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Hemos enviado un SMS con un código de 6 dígitos a{' '}
              <strong className="text-cyan-400">{countryCode} {phoneNumber}</strong>.
            </p>

            {/* 6 Digit Input Boxes */}
            <div className="flex justify-between gap-1.5 pt-4">
              {otpCode.map((digit, idx) => (
                <input
                  key={idx}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={e => {
                    const val = e.target.value;
                    const next = [...otpCode];
                    next[idx] = val;
                    setOtpCode(next);
                  }}
                  className="w-11 h-12 rounded-xl bg-white/5 border border-white/20 text-center font-mono text-lg font-bold text-cyan-400 outline-none focus:border-cyan-400"
                />
              ))}
            </div>

            <p className="text-[11px] text-slate-500 text-center pt-2">
              ¿No recibiste el código? <span className="text-cyan-400 cursor-pointer font-semibold">Reenviar SMS</span>
            </p>
          </div>

          <button
            onClick={() => setStep('profile')}
            className="w-full py-3.5 rounded-2xl font-bold text-xs text-white shadow-xl transition-transform hover:scale-[1.02] active:scale-95 cursor-pointer mt-6"
            style={{ backgroundColor: theme.primaryColor }}
          >
            Verificar Código
          </button>
        </div>
      )}

      {/* 4. Profile Creation */}
      {step === 'profile' && (
        <div className="flex-1 flex flex-col justify-between my-auto animate-in fade-in duration-200">
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Crear tu Perfil</h2>
            <p className="text-xs text-slate-400">
              Personaliza tu identidad en NAKEIC. Podrás cambiarla cuando desees.
            </p>

            {/* Avatar picker */}
            <div className="flex flex-col items-center gap-2 pt-2">
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"
                  alt="Avatar"
                  className="w-20 h-20 rounded-full object-cover ring-2 ring-cyan-400"
                />
                <button className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-cyan-500 text-white flex items-center justify-center border-2 border-slate-900 shadow cursor-pointer">
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Nombre Completo</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Nombre de Usuario (@)</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
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
            </div>
          </div>

          <button
            onClick={handleFinishProfile}
            className="w-full py-3.5 rounded-2xl font-bold text-xs text-white shadow-xl transition-transform hover:scale-[1.02] active:scale-95 cursor-pointer mt-6"
            style={{ backgroundColor: theme.primaryColor }}
          >
            Comenzar a Chatear
          </button>
        </div>
      )}
    </div>
  );
};
