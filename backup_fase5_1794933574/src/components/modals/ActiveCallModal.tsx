import React, { useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Video,
  VideoOff,
  RefreshCw,
  PhoneOff,
  Phone,
  ShieldCheck,
  Users
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ActiveCallModal: React.FC = () => {
  const {
    activeCall,
    localStream,
    remoteStream,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleSpeaker,
    toggleCamera,
    switchCamera
  } = useApp();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Attach local stream to self-view video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, activeCall.isVideo]);

  // Attach remote stream to remote video & audio elements
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream && activeCall.isVideo) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, activeCall.isVideo]);

  if (!activeCall.isActive) return null;

  const formatCallTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // --- INCOMING CALL SCREEN ---
  if (activeCall.isIncoming && activeCall.status === 'ringing') {
    return (
      <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col justify-between p-6 animate-in fade-in duration-200 text-white overflow-hidden">
        {/* Top Header */}
        <div className="relative z-10 flex flex-col items-center gap-1 pt-4 text-center">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[11px] text-emerald-400 border border-emerald-400/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Llamada Entrante Cifrada E2EE</span>
          </div>

          <h3 className="text-2xl font-bold mt-4">{activeCall.contactName}</h3>
          <p className="text-xs text-slate-400">
            {activeCall.isVideo ? 'Videollamada WebRTC Entrante...' : 'Llamada de Voz WebRTC Entrante...'}
          </p>
        </div>

        {/* Centerpiece with pulsing rings */}
        <div className="relative z-10 flex flex-col items-center justify-center my-auto">
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-cyan-500/30 animate-ping duration-1000" />
            <div className="absolute -inset-8 rounded-full bg-cyan-500/10 animate-pulse" />
            <img
              src={activeCall.contactAvatar}
              alt={activeCall.contactName}
              className="relative w-32 h-32 rounded-full object-cover ring-4 ring-white/20 shadow-2xl"
            />
          </div>
        </div>

        {/* Incoming Actions: Accept or Decline */}
        <div className="relative z-10 pb-8 flex items-center justify-around w-full max-w-xs mx-auto">
          {/* Reject */}
          <button
            onClick={rejectCall}
            className="flex flex-col items-center gap-2 cursor-pointer transition-transform hover:scale-110 active:scale-95"
          >
            <div className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-xl">
              <PhoneOff className="w-7 h-7" />
            </div>
            <span className="text-xs font-semibold text-slate-300">Rechazar</span>
          </button>

          {/* Accept */}
          <button
            onClick={acceptCall}
            className="flex flex-col items-center gap-2 cursor-pointer transition-transform hover:scale-110 active:scale-95 animate-bounce duration-700"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-xl">
              <Phone className="w-7 h-7" />
            </div>
            <span className="text-xs font-semibold text-emerald-400">Responder</span>
          </button>
        </div>
      </div>
    );
  }

  // --- OUTGOING & ACTIVE CALL SCREEN ---
  return (
    <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col justify-between p-6 animate-in fade-in duration-200 text-white overflow-hidden">
      {/* Hidden Audio element for remote audio stream playback */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Real Video WebRTC Feed Background */}
      {activeCall.isVideo ? (
        <div className="absolute inset-0 z-0 bg-black">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center relative">
              <img
                src={activeCall.contactAvatar}
                alt="Video Feed"
                className="w-full h-full object-cover opacity-60 filter blur-xs"
              />
              <div className="absolute inset-0 bg-black/40" />
            </div>
          )}

          {/* Self View Floating Camera Preview */}
          <div className="absolute right-4 top-16 w-28 h-40 rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl bg-slate-900 z-20">
            {!activeCall.isCameraOff && localStream ? (
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-800 text-[10px] text-slate-400">
                Cámara apagada
              </div>
            )}
            <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-emerald-400" />
          </div>
        </div>
      ) : (
        /* Dark Gradient for Voice Call */
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#1e293b,transparent)] opacity-80" />
      )}

      {/* Top Bar: E2EE info, Contact info & Call Duration */}
      <div className="relative z-10 flex flex-col items-center gap-1 pt-4 text-center">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[11px] text-emerald-400 border border-emerald-400/20 backdrop-blur-md">
          {activeCall.isGroupCall ? <Users className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          <span>{activeCall.isGroupCall ? 'Llamada Grupal NAKEIC' : 'Llamada Cifrada E2EE'}</span>
        </div>

        <h3 className="text-xl font-bold mt-3 drop-shadow-md">
          {activeCall.contactName}
        </h3>

        <p className="text-xs font-mono font-medium text-cyan-300 drop-shadow">
          {activeCall.status === 'connecting'
            ? 'Conectando señal WebRTC...'
            : activeCall.status === 'ringing'
            ? 'Llamando...'
            : formatCallTimer(activeCall.durationSeconds)}
        </p>
      </div>

      {/* Middle Centerpiece: Contact Avatar or Audio Visualizer if Voice Call */}
      {!activeCall.isVideo && (
        <div className="relative z-10 flex flex-col items-center justify-center my-auto">
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-cyan-500/20 animate-ping duration-1000" />
            <div className="absolute -inset-8 rounded-full bg-cyan-500/10 animate-pulse" />
            <img
              src={activeCall.contactAvatar}
              alt={activeCall.contactName}
              className="relative w-28 h-28 rounded-full object-cover ring-4 ring-white/20 shadow-2xl"
            />
          </div>

          {/* Audio Waveform Visualizer */}
          <div className="flex items-center gap-1 mt-6 h-6">
            {[20, 45, 80, 55, 95, 40, 70, 85, 30, 60, 90, 40, 75, 50, 30].map((h, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-cyan-400 animate-pulse"
                style={{
                  height: `${h}%`,
                  animationDelay: `${i * 80}ms`
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div className="relative z-10 pb-6 flex flex-col items-center gap-6">
        <div className="flex items-center justify-center gap-4 bg-black/40 backdrop-blur-md p-3 rounded-full border border-white/10">
          {/* Mute Toggle */}
          <button
            onClick={toggleMute}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              activeCall.isMuted ? 'bg-rose-500 text-white' : 'bg-white/15 text-white hover:bg-white/25'
            }`}
          >
            {activeCall.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Speaker Toggle */}
          <button
            onClick={toggleSpeaker}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              activeCall.isSpeaker ? 'bg-white text-slate-900' : 'bg-white/15 text-white hover:bg-white/25'
            }`}
          >
            {activeCall.isSpeaker ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* Video Toggle */}
          {activeCall.isVideo && (
            <>
              <button
                onClick={toggleCamera}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                  activeCall.isCameraOff ? 'bg-rose-500 text-white' : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                {activeCall.isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>

              <button
                onClick={switchCamera}
                className="w-12 h-12 rounded-full bg-white/15 text-white hover:bg-white/25 flex items-center justify-center cursor-pointer"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Hang Up Button */}
          <button
            onClick={endCall}
            className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-2xl transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
