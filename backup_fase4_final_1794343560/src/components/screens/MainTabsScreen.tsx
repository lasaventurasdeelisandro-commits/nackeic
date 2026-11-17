import React, { useState } from 'react';
import { MessageSquare, Radio, Phone, Settings, Camera, Smartphone, QrCode } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NakeicLogo } from '../common/NakeicLogo';
import { ChatsTab } from './ChatsTab';
import { StatusTab } from './StatusTab';
import { CallsTab } from './CallsTab';
import { SettingsTab } from './SettingsTab';
import { DownloadApkModal } from '../modals/DownloadApkModal';

export const MainTabsScreen: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    conversations,
    calls,
    statuses,
    setIsCameraOpen,
    theme
  } = useApp();

  const [showDownloadModal, setShowDownloadModal] = useState<boolean>(false);
  const isDark = theme.mode === 'dark' || (theme.mode === 'system' && true);

  const totalUnreadChats = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const unreadStatuses = statuses.filter(s => !s.isViewed).length;
  const missedCalls = calls.filter(c => c.direction === 'missed').length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Top Application Bar with WhatsApp-style bold typography and larger logo */}
      <div
        className="px-4 py-3 flex items-center justify-between border-b shrink-0 z-20 shadow-sm"
        style={{
          backgroundColor: isDark ? theme.surfaceDark : theme.surfaceLight,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
        }}
      >
        {/* NAKEIC Brand Emblem (Enlarged Logo) & Refined Smaller Title */}
        <div className="flex items-center gap-3">
          <NakeicLogo size="sm" variant="icon" />
          <div className="flex flex-col justify-center">
            <h1
              className="text-[12px] font-extrabold tracking-widest leading-none uppercase opacity-90"
              style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}
            >
              NAKEIC
            </h1>
            <p className="text-[9px] text-cyan-400 font-bold tracking-wider uppercase mt-0.5">
              Conecta Sin Límites
            </p>
          </div>
        </div>

        {/* Quick Camera & Download APK / QR shortcut */}
        <div className="flex items-center gap-2 text-slate-300">
          <button
            onClick={() => setShowDownloadModal(true)}
            title="Instalar en Móvil / Ver QR"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] font-black uppercase tracking-wider">Móvil</span>
          </button>

          <button
            onClick={() => setIsCameraOpen(true)}
            title="Abrir Cámara NAKEIC"
            className="p-2 rounded-xl hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <Camera className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area based on selected Tab */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'chats' && <ChatsTab />}
        {activeTab === 'status' && <StatusTab />}
        {activeTab === 'calls' && <CallsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>

      {/* Bottom Material 3 Navigation Bar (WhatsApp Android sizing) */}
      <div
        className="px-3 py-2 flex items-center justify-around border-t shrink-0 z-20"
        style={{
          backgroundColor: isDark ? theme.surfaceDark : theme.surfaceLight,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
        }}
      >
        {/* Tab 1: Chats */}
        <button
          onClick={() => setActiveTab('chats')}
          className="flex flex-col items-center gap-1 py-1 px-3.5 rounded-2xl transition-all relative cursor-pointer"
          style={{
            color: activeTab === 'chats' ? theme.primaryColor : '#94A3B8'
          }}
        >
          <div className="relative">
            <MessageSquare className="w-6 h-6" />
            {totalUnreadChats > 0 && (
              <span
                className="absolute -top-1.5 -right-2.5 min-w-5 h-5 px-1.5 rounded-full text-[11px] font-extrabold text-white flex items-center justify-center shadow-md"
                style={{ backgroundColor: theme.primaryColor }}
              >
                {totalUnreadChats}
              </span>
            )}
          </div>
          <span className="text-[12px] font-bold">Chats</span>
        </button>

        {/* Tab 2: Estados */}
        <button
          onClick={() => setActiveTab('status')}
          className="flex flex-col items-center gap-1 py-1 px-3.5 rounded-2xl transition-all relative cursor-pointer"
          style={{
            color: activeTab === 'status' ? theme.primaryColor : '#94A3B8'
          }}
        >
          <div className="relative">
            <Radio className="w-6 h-6" />
            {unreadStatuses > 0 && (
              <span className="absolute -top-0.5 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 ring-2 ring-slate-900" />
            )}
          </div>
          <span className="text-[12px] font-bold">Estados</span>
        </button>

        {/* Tab 3: Llamadas */}
        <button
          onClick={() => setActiveTab('calls')}
          className="flex flex-col items-center gap-1 py-1 px-3.5 rounded-2xl transition-all relative cursor-pointer"
          style={{
            color: activeTab === 'calls' ? theme.primaryColor : '#94A3B8'
          }}
        >
          <div className="relative">
            <Phone className="w-6 h-6" />
            {missedCalls > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-5 h-5 px-1.5 rounded-full text-[11px] font-extrabold text-white bg-rose-500 flex items-center justify-center shadow-md">
                {missedCalls}
              </span>
            )}
          </div>
          <span className="text-[12px] font-bold">Llamadas</span>
        </button>

        {/* Tab 4: Ajustes */}
        <button
          onClick={() => setActiveTab('settings')}
          className="flex flex-col items-center gap-1 py-1 px-3.5 rounded-2xl transition-all relative cursor-pointer"
          style={{
            color: activeTab === 'settings' ? theme.primaryColor : '#94A3B8'
          }}
        >
          <Settings className="w-6 h-6" />
          <span className="text-[12px] font-bold">Ajustes</span>
        </button>
      </div>

      {/* Download APK / Mobile Testing Modal */}
      <DownloadApkModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
      />
    </div>
  );
};
