/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AndroidFrame } from './components/AndroidFrame';
import { MainTabsScreen } from './components/screens/MainTabsScreen';
import { ChatDetailScreen } from './components/screens/ChatDetailScreen';
import { AuthScreen } from './components/screens/AuthScreen';
import { ActiveCallModal } from './components/modals/ActiveCallModal';
import { CameraCaptureModal } from './components/modals/CameraCaptureModal';
import { NewChatModal } from './components/modals/NewChatModal';
import { NewGroupModal } from './components/modals/NewGroupModal';
import { DownloadApkModal } from './components/modals/DownloadApkModal';
import { ArchitectureExplorer } from './components/explorer/ArchitectureExplorer';
import { NakeicLogo } from './components/common/NakeicLogo';
import { Smartphone, Code2, Wifi, WifiOff, RefreshCw, Download, QrCode } from 'lucide-react';

const AppContent: React.FC = () => {
  const {
    activeConversationId,
    setActiveConversationId,
    isOffline,
    setIsOffline,
    theme
  } = useApp();

  const [activeView, setActiveView] = useState<'device' | 'architecture'>('device');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [showApkModal, setShowApkModal] = useState<boolean>(false);
  const [apkModalTab, setApkModalTab] = useState<'qr' | 'install' | 'direct_apk' | 'builder'>('qr');
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsMobileScreen(window.innerWidth < 640 || isStandalone);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const openApkModal = (tab: 'qr' | 'install' | 'direct_apk' | 'builder' = 'qr') => {
    setApkModalTab(tab);
    setShowApkModal(true);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col font-sans select-none relative">
      {/* Top Engineering & Mode Switching Bar (Desktop & Tablet) */}
      {!isMobileScreen && (
        <header className="w-full px-4 sm:px-6 py-2.5 border-b border-white/10 bg-slate-900/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0 z-40">
          {/* Left: Brand & Architecture Phase Flag */}
          <div className="flex items-center gap-3.5">
            <NakeicLogo size="sm" variant="icon" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-widest text-sm uppercase leading-none">NAKEIC</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  Android 15
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Conecta Sin Límites · Cifrado E2EE · WebRTC
              </p>
            </div>
          </div>

          {/* Center: Dual View Switcher (Device Simulator vs Source Code Architecture) */}
          <div className="flex items-center gap-1 p-1 bg-slate-800/80 rounded-2xl border border-white/10">
            <button
              onClick={() => setActiveView('device')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeView === 'device'
                  ? 'bg-cyan-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Simulador Android</span>
            </button>

            <button
              onClick={() => setActiveView('architecture')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeView === 'architecture'
                  ? 'bg-cyan-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Arquitectura & Código Kotlin</span>
            </button>
          </div>

          {/* Right Controls: Positioned directly under AI Studio's Remix button */}
          <div className="flex items-center gap-2.5">
            {/* Offline Mode Test Toggle */}
            <button
              onClick={() => setIsOffline(!isOffline)}
              title={isOffline ? 'Restablecer conexión de red' : 'Simular modo sin conexión (Offline-first)'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isOffline
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                  : 'bg-slate-800/80 border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              {isOffline ? <WifiOff className="w-3.5 h-3.5 text-amber-400" /> : <Wifi className="w-3.5 h-3.5 text-emerald-400" />}
              <span className="hidden md:inline">{isOffline ? 'Offline' : 'Online'}</span>
            </button>

            {/* Reset Onboarding / Auth Button */}
            <button
              onClick={() => setIsAuthenticated(!isAuthenticated)}
              title={isAuthenticated ? 'Reiniciar flujo de bienvenida y registro' : 'Acceder directamente'}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-white/10 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{isAuthenticated ? 'Onboarding' : 'Saltar Auth'}</span>
            </button>
          </div>
        </header>
      )}

      {/* Main Workspace */}
      <main className={`flex-1 flex overflow-hidden ${isMobileScreen ? 'p-0 m-0' : 'p-2 sm:p-4'}`}>
        {activeView === 'device' ? (
          <div className="w-full h-full flex items-center justify-center my-auto">
            <AndroidFrame
              onBack={() => {
                if (activeConversationId) setActiveConversationId(null);
              }}
              showBack={!!activeConversationId}
            >
              {/* If not logged in -> Show Authentication / Onboarding Flow */}
              {!isAuthenticated ? (
                <AuthScreen onComplete={() => setIsAuthenticated(true)} />
              ) : activeConversationId ? (
                <ChatDetailScreen />
              ) : (
                <MainTabsScreen />
              )}

              {/* Overlays / Modals */}
              <ActiveCallModal />
              <CameraCaptureModal />
              <NewChatModal />
              <NewGroupModal />
            </AndroidFrame>
          </div>
        ) : (
          <div className="w-full h-full max-w-7xl mx-auto flex flex-col">
            <ArchitectureExplorer />
          </div>
        )}
      </main>

      {/* Download APK / Mobile Testing Modal */}
      <DownloadApkModal
        isOpen={showApkModal}
        initialTab={apkModalTab}
        onClose={() => setShowApkModal(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
