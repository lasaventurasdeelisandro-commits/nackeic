import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  Send,
  Sparkles,
  Edit3,
  Image as ImageIcon,
  Zap,
  ZapOff,
  AlertCircle,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const CameraCaptureModal: React.FC = () => {
  const {
    isCameraOpen,
    setIsCameraOpen,
    activeConversationId,
    sendMessage,
    addStatus
  } = useApp();

  const [caption, setCaption] = useState('');
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [drawingColor, setDrawingColor] = useState<string | null>(null);
  const [hasFlash, setHasFlash] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showShutterFlash, setShowShutterFlash] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  // Play realistic camera shutter sound via Web Audio API
  const playShutterSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch (_) {}
  };

  // Stop active media stream tracks
  const stopMediaStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (_) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Start live hardware camera stream via getUserMedia
  const startCameraStream = async (front: boolean = isFrontCamera) => {
    stopMediaStream();
    setCameraError(null);
    setIsInitializing(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Navegador no soporta acceso directo a cámara WebRTC');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: front ? 'user' : { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsInitializing(false);
    } catch (err: unknown) {
      console.warn('getUserMedia camera error:', err);
      const errName = (err as Error)?.name || '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setCameraError('Permiso denegado por el navegador. Usa la cámara nativa de Android abajo.');
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setCameraError('No se encontró hardware de cámara activo en el dispositivo.');
      } else {
        setCameraError('Acceso a cámara restringido por el visor. Puedes tomar foto con la cámara nativa o elegir una imagen.');
      }
      setIsInitializing(false);
    }
  };

  // Initialize camera when modal opens
  useEffect(() => {
    if (isCameraOpen && !capturedPhotoUrl) {
      startCameraStream(isFrontCamera);
    } else {
      stopMediaStream();
    }

    return () => {
      stopMediaStream();
    };
  }, [isCameraOpen, isFrontCamera, capturedPhotoUrl]);

  // Flip Front/Back Camera
  const handleToggleCamera = () => {
    const nextFront = !isFrontCamera;
    setIsFrontCamera(nextFront);
    startCameraStream(nextFront);
  };

  // Capture frame from live video element
  const handleCaptureFromVideo = () => {
    if (!videoRef.current || videoRef.current.videoWidth === 0) {
      // Fallback to native hardware capture if video isn't ready
      nativeCameraInputRef.current?.click();
      return;
    }

    playShutterSound();
    setShowShutterFlash(true);
    setTimeout(() => setShowShutterFlash(false), 200);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      if (isFrontCamera) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setCapturedPhotoUrl(dataUrl);
      stopMediaStream();
    }
  };

  // Native Android Hardware Camera Input handler
  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    playShutterSound();
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCapturedPhotoUrl(reader.result);
        stopMediaStream();
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Sample quick capture fallback
  const handleSampleCapture = () => {
    playShutterSound();
    const samplePhotos = [
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80'
    ];
    const picked = samplePhotos[Math.floor(Math.random() * samplePhotos.length)];
    setCapturedPhotoUrl(picked);
    stopMediaStream();
  };

  const handleClose = () => {
    stopMediaStream();
    setCapturedPhotoUrl(null);
    setCaption('');
    setCameraError(null);
    setIsCameraOpen(false);
  };

  const handleSendPhoto = (target: 'chat' | 'status') => {
    if (!capturedPhotoUrl) return;

    if (target === 'chat' && activeConversationId) {
      sendMessage(activeConversationId, caption, 'image', {
        mediaUrl: capturedPhotoUrl
      });
    } else {
      addStatus(caption || 'Foto capturada con Cámara NAKEIC', capturedPhotoUrl);
    }

    handleClose();
  };

  if (!isCameraOpen) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black flex flex-col justify-between p-3.5 sm:p-4 text-white animate-in fade-in duration-150 select-none overflow-hidden">
      {/* Hidden Native Hardware Camera Inputs */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={nativeCameraInputRef}
        onChange={handleFilePicked}
        className="hidden"
      />
      <input
        type="file"
        accept="image/*"
        ref={galleryInputRef}
        onChange={handleFilePicked}
        className="hidden"
      />

      {/* Shutter White Flash Effect */}
      {showShutterFlash && (
        <div className="absolute inset-0 z-50 bg-white pointer-events-none animate-out fade-out duration-200" />
      )}

      {/* Top Header Bar: Close, Flash, Tools, Flip */}
      <div className="flex items-center justify-between shrink-0 z-20">
        <button
          onClick={handleClose}
          title="Cerrar cámara"
          className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center cursor-pointer active:scale-90 transition-transform shadow-md"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {capturedPhotoUrl ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDrawingColor(drawingColor ? null : '#00E5FF')}
              title="Pincel"
              className={`p-2 rounded-full cursor-pointer transition-all ${
                drawingColor ? 'bg-cyan-500 text-white' : 'bg-black/60 text-slate-300'
              }`}
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCaption(prev => prev ? `${prev} ✨` : 'Foto de NAKEIC ✨')}
              title="Añadir destello"
              className="p-2 rounded-full bg-black/60 text-slate-300 hover:text-white cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* Flash Toggle */}
            <button
              onClick={() => setHasFlash(!hasFlash)}
              title={hasFlash ? 'Flash activado' : 'Flash desactivado'}
              className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                hasFlash ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-black/60 text-white'
              }`}
            >
              {hasFlash ? <Zap className="w-5 h-5 fill-slate-950" /> : <ZapOff className="w-5 h-5" />}
            </button>

            {/* Flip Camera */}
            <button
              onClick={handleToggleCamera}
              title="Girar cámara (Frontal / Trasera)"
              className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center cursor-pointer active:scale-90 transition-transform shadow-md"
            >
              <RefreshCw className="w-5 h-5 text-white" />
            </button>
          </div>
        )}
      </div>

      {/* Main Viewport: Live Stream or Captured Photo */}
      <div className="flex-1 flex items-center justify-center relative my-2 overflow-hidden rounded-3xl bg-slate-950 border border-white/10 shadow-inner">
        {capturedPhotoUrl ? (
          /* Captured Photo Preview */
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={capturedPhotoUrl}
              alt="Preview captura"
              className="w-full h-full object-cover rounded-3xl"
            />
            {drawingColor && (
              <div className="absolute inset-x-4 top-4 bg-black/70 backdrop-blur-md px-3 py-2 rounded-2xl text-center border border-white/10">
                <p className="text-xs font-bold" style={{ color: drawingColor }}>
                  Pincel NAKEIC activo · Listo para enviar
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Live Camera Video Stream or Friendly Fallback */
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            {/* Live WebRTC Video Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover rounded-3xl ${isFrontCamera ? 'scale-x-[-1]' : ''} ${
                cameraError ? 'hidden' : 'block'
              }`}
            />

            {/* Initializing / Loading Indicator */}
            {isInitializing && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 z-10">
                <div className="w-10 h-10 rounded-full border-3 border-cyan-400 border-t-transparent animate-spin" />
                <p className="text-xs font-bold text-cyan-300">Iniciando Cámara NAKEIC (CameraX)...</p>
              </div>
            )}

            {/* Fallback Banner if camera cannot access getUserMedia (Permissions or Iframe) */}
            {cameraError && (
              <div className="p-6 text-center space-y-4 max-w-xs z-20">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-lg">
                  <Camera className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Cámara de Dispositivo</h3>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    {cameraError}
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  {/* Button 1: Open Native Device Camera App */}
                  <button
                    onClick={() => nativeCameraInputRef.current?.click()}
                    className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Camera className="w-4 h-4 text-slate-950" />
                    <span>Tomar foto con Cámara Android</span>
                  </button>

                  {/* Button 2: Choose from Gallery */}
                  <button
                    onClick={() => galleryInputRef.current?.click()}
                    className="w-full py-2.5 px-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                  >
                    <ImageIcon className="w-4 h-4 text-cyan-400" />
                    <span>Seleccionar de Galería</span>
                  </button>

                  {/* Button 3: Instant Snapshot Simulation */}
                  <button
                    onClick={handleSampleCapture}
                    className="w-full py-2 text-[11px] text-slate-400 hover:text-white cursor-pointer"
                  >
                    Capturar toma de prueba rápida
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="shrink-0 pt-1">
        {capturedPhotoUrl ? (
          /* Post-Capture Confirmation Bar */
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Añadir una descripción..."
              value={caption}
              onChange={e => setCaption(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-white/15 border border-white/20 text-xs text-white placeholder:text-white/60 outline-none"
            />
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  setCapturedPhotoUrl(null);
                  startCameraStream(isFrontCamera);
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Repetir</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSendPhoto('status')}
                  className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white cursor-pointer shadow-md active:scale-95 transition-all"
                >
                  Subir a Estado
                </button>
                {activeConversationId && (
                  <button
                    onClick={() => handleSendPhoto('chat')}
                    className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-white cursor-pointer shadow-lg active:scale-95 transition-all"
                    title="Enviar foto al chat"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Live Shutter Controls (WhatsApp / Telegram camera style) */
          <div className="flex items-center justify-between px-6 py-2">
            {/* Gallery shortcut on left */}
            <button
              onClick={() => galleryInputRef.current?.click()}
              title="Abrir galería de fotos"
              className="w-11 h-11 rounded-2xl bg-black/60 hover:bg-black/80 border border-white/20 flex items-center justify-center text-white cursor-pointer active:scale-90 transition-transform"
            >
              <ImageIcon className="w-5 h-5 text-cyan-400" />
            </button>

            {/* Center Shutter Button (Tap to snap) */}
            <button
              onClick={handleCaptureFromVideo}
              title="Capturar foto"
              className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-90 transition-transform cursor-pointer shadow-2xl relative"
            >
              <div className="w-14 h-14 rounded-full bg-white hover:bg-slate-100 transition-colors" />
            </button>

            {/* Direct Hardware Camera App Trigger on right */}
            <button
              onClick={() => nativeCameraInputRef.current?.click()}
              title="Cámara Nativa del Móvil"
              className="w-11 h-11 rounded-2xl bg-black/60 hover:bg-black/80 border border-white/20 flex items-center justify-center text-white cursor-pointer active:scale-90 transition-transform"
            >
              <Camera className="w-5 h-5 text-emerald-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
