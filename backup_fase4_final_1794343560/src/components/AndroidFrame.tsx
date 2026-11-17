import React, { useState, useEffect } from 'react';
import { Wifi, Signal, Battery, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface AndroidFrameProps {
  children: React.ReactNode;
  title?: string;
  onBack?: () => void;
  showBack?: boolean;
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({ children, onBack, showBack }) => {
  const { theme, isOffline, activeConversationId, setActiveConversationId, viewingStatus, setViewingStatus } = useApp();
  const [time, setTime] = useState<string>('09:41');
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsMobileScreen(window.innerWidth < 640 || isStandalone);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const mins = now.getMinutes().toString().padStart(2, '0');
      setTime(`${hours}:${mins}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);

    return () => {
      window.removeEventListener('resize', checkMobile);
      clearInterval(interval);
    };
  }, []);

  const isDark = theme.mode === 'dark' || (theme.mode === 'system' && true);
  const bgColor = isDark ? (theme.oledBlack ? '#000000' : theme.bgDark) : theme.bgLight;

  // On real mobile devices or installed standalone PWA, fill the screen natively!
  if (isMobileScreen) {
    return (
      <div
        className="w-full h-[100dvh] flex flex-col overflow-hidden relative select-none"
        style={{ backgroundColor: bgColor }}
      >
        {/* Native Android Status Bar */}
        <div
          className="w-full h-8 px-4 flex items-center justify-between text-xs font-semibold z-30 shrink-0 pt-1"
          style={{
            color: isDark ? '#E2E8F0' : '#1E293B',
            backgroundColor: 'transparent'
          }}
        >
          <div className="flex items-center gap-1.5">
            <span>{time}</span>
            {isOffline && (
              <span className="text-[10px] text-amber-400 font-medium px-1 py-0.2 rounded bg-amber-950/60 border border-amber-500/30">
                Offline
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Signal className="w-3.5 h-3.5" />
            <Wifi className={`w-3.5 h-3.5 ${isOffline ? 'opacity-30' : ''}`} />
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-mono">98%</span>
              <Battery className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 w-full flex flex-col overflow-hidden relative">
          {children}
        </div>

        {/* Bottom Android Gesture Pill */}
        <div className="w-full h-4 flex items-center justify-center shrink-0 z-30 pb-1">
          <button
            onClick={() => {
              if (viewingStatus) setViewingStatus(null);
              else if (activeConversationId) setActiveConversationId(null);
              else if (onBack) onBack();
            }}
            className="w-28 h-1 rounded-full bg-slate-500/30"
          />
        </div>
      </div>
    );
  }

  // Desktop Simulator Frame
  return (
    <div className="relative mx-auto flex items-center justify-center p-2 sm:p-4 select-none">
      {/* Outer Phone Shell */}
      <div className="relative w-full max-w-[412px] h-[860px] max-h-[94vh] rounded-[48px] bg-slate-950 p-[10px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] border-[4px] border-slate-800 flex flex-col overflow-hidden ring-1 ring-white/10">
        {/* Hardware side button accents */}
        <div className="absolute -left-[6px] top-28 w-[3px] h-12 bg-slate-700 rounded-l-md" />
        <div className="absolute -left-[6px] top-44 w-[3px] h-12 bg-slate-700 rounded-l-md" />
        <div className="absolute -right-[6px] top-36 w-[3px] h-16 bg-slate-700 rounded-r-md" />

        {/* Screen Bezel & Content */}
        <div
          className="relative w-full h-full rounded-[40px] flex flex-col overflow-hidden transition-colors duration-300"
          style={{ backgroundColor: bgColor }}
        >
          {/* Top Status Bar (Android 15 style) */}
          <div
            className="w-full h-10 px-6 flex items-center justify-between text-xs font-semibold z-30 shrink-0 transition-colors"
            style={{
              color: isDark ? '#E2E8F0' : '#1E293B',
              backgroundColor: 'transparent'
            }}
          >
            {/* Clock & Offline indicator */}
            <div className="flex items-center gap-1.5">
              <span>{time}</span>
              {isOffline && (
                <span className="text-[10px] text-amber-400 font-medium px-1.5 py-0.2 rounded bg-amber-950/60 border border-amber-500/30">
                  Offline
                </span>
              )}
            </div>

            {/* Front Camera Punch-Hole */}
            <div className="absolute left-1/2 top-2.5 -translate-x-1/2 w-4 h-4 rounded-full bg-black border border-slate-800 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-900 ring-1 ring-blue-500/20" />
            </div>

            {/* System Icons (Wi-Fi, 5G, Battery) */}
            <div className="flex items-center gap-2">
              <Signal className="w-3.5 h-3.5" />
              <Wifi className={`w-3.5 h-3.5 ${isOffline ? 'opacity-30' : ''}`} />
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-mono">98%</span>
                <Battery className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Main App Container */}
          <div className="flex-1 w-full flex flex-col overflow-hidden relative">
            {children}
          </div>

          {/* Android Navigation Gesture Bar */}
          <div
            className="w-full h-5 flex items-center justify-center shrink-0 z-30 transition-colors"
            style={{ backgroundColor: 'transparent' }}
          >
            <button
              onClick={() => {
                if (viewingStatus) setViewingStatus(null);
                else if (activeConversationId) setActiveConversationId(null);
                else if (onBack) onBack();
              }}
              title="Volver a inicio (Gesto Android)"
              className="w-32 h-1 rounded-full bg-slate-500/40 hover:bg-slate-400 transition-colors cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
