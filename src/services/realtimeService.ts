/**
 * NAKEIC Real-Time WebSocket & WebRTC Engine
 * Full-duplex real-time synchronization, messaging, and P2P WebRTC calls.
 */

export type RealtimeEventHandler = (data: any) => void;

class RealtimeService {
  private ws: WebSocket | null = null;
  private currentUserId: string | null = null;
  private currentToken: string | null = null;
  private eventHandlers: Map<string, Set<RealtimeEventHandler>> = new Map();
  private reconnectTimeout: any = null;
  private reconnectAttempts: number = 0;
  private pendingQueue: Array<{ type: string; data: any }> = [];

  // WebRTC state
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private currentCallTargetUserId: string | null = null;
  private iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ];

  constructor() {
    // initialize
  }

  public async refreshIceServers(): Promise<RTCIceServer[]> {
    try {
      const res = await fetch('/api/webrtc/config');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.iceServers) && data.iceServers.length > 0) {
          this.iceServers = data.iceServers;
        }
        this.emit('webrtc:ice_config_status', {
          turnConfigured: Boolean(data.turnConfigured),
          guidance: data.guidance
        });
      }
    } catch {
      // Keep default STUN list if endpoint unreachable
    }
    return this.iceServers;
  }

  public connect(userId: string, token?: string) {
    this.currentUserId = userId;
    if (token) {
      this.currentToken = token;
      try { localStorage.setItem('nakeic_auth_token', token); } catch (e) { /* ignore */ }
    } else {
      try {
        this.currentToken = localStorage.getItem('nakeic_auth_token') || '';
      } catch (e) {
        this.currentToken = '';
      }
    }

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'auth:connect', data: { userId, token: this.currentToken } }));
      }
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.ws?.send(JSON.stringify({
          type: 'auth:connect',
          data: { userId: this.currentUserId, token: this.currentToken }
        }));
        this.emit('connection:change', { isConnected: true });
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const { type, data } = payload;

          if (type === 'auth:ack') {
            // Flush queued messages only after server confirms authenticated WebSocket session
            while (this.pendingQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
              const queued = this.pendingQueue.shift();
              if (queued) {
                this.ws.send(JSON.stringify(queued));
              }
            }
          }

          this.emit(type, data);
          this.handleInternalWebRTCSignal(type, data);
        } catch (e) {
          console.error('[NAKEIC WS] Error parsing message:', e);
        }
      };

      this.ws.onclose = () => {
        this.emit('connection:change', { isConnected: false });
        clearTimeout(this.reconnectTimeout);
        const delayMs = Math.min(15000, 1500 * Math.pow(1.5, this.reconnectAttempts));
        this.reconnectAttempts++;
        this.reconnectTimeout = setTimeout(() => {
          if (this.currentUserId) {
            this.connect(this.currentUserId, this.currentToken || undefined);
          }
        }, delayMs);
      };

      this.ws.onerror = (err) => {
        console.warn('[NAKEIC WS] Connection notice:', err);
      };
    } catch (e) {
      console.error('[NAKEIC WS] Failed to initialize WebSocket:', e);
    }
  }

  public send(type: string, data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    } else if (type !== 'auth:connect') {
      this.pendingQueue.push({ type, data });
      if (this.pendingQueue.length > 100) {
        this.pendingQueue.shift();
      }
    }
  }

  public on(event: string, handler: RealtimeEventHandler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  public off(event: string, handler: RealtimeEventHandler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private emit(event: string, data: any) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(h => h(data));
    }
  }

  public disconnect() {
    this.currentUserId = null;
    clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.endCall();
  }

  private attachPeerConnectionObservers(targetUserId: string) {
    if (!this.peerConnection) return;

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.send('webrtc:ice_candidate', {
          targetUserId,
          candidate: event.candidate
        });
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState || 'new';
      this.emit('webrtc:ice_state', { state });
      if (state === 'failed') {
        this.emit('webrtc:call_error', {
          error: 'No se pudo establecer la ruta de audio/video WebRTC (verifique servidor TURN en redes con NAT simétrico).'
        });
      }
    };

    this.remoteStream = new MediaStream();
    this.peerConnection.ontrack = (event) => {
      const incoming = event.streams?.[0];
      if (incoming) {
        incoming.getTracks().forEach(track => this.remoteStream?.addTrack(track));
      } else if (event.track) {
        this.remoteStream?.addTrack(event.track);
      }
      this.emit('webrtc:remote_stream', { stream: this.remoteStream });
    };
  }

  // --- Real WebRTC Implementation (No synthetic media faking) ---

  public async startCall(targetUserId: string, caller: { id: string; displayName: string; avatarUrl: string }, isVideo: boolean): Promise<MediaStream> {
    this.currentCallTargetUserId = targetUserId;
    await this.refreshIceServers();

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Este navegador o dispositivo no soporta captura WebRTC de micrófono/cámara.');
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false
      });
    } catch (err: any) {
      this.currentCallTargetUserId = null;
      throw new Error(
        isVideo
          ? 'Permiso de cámara o micrófono denegado/no disponible para videollamada.'
          : 'Permiso de micrófono denegado o no disponible para llamada de voz.'
      );
    }

    this.peerConnection = new RTCPeerConnection({ iceServers: this.iceServers });
    this.localStream.getTracks().forEach(track => {
      this.peerConnection?.addTrack(track, this.localStream!);
    });
    this.attachPeerConnectionObservers(targetUserId);

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    this.send('webrtc:call_user', {
      callerId: caller.id,
      callerName: caller.displayName,
      callerAvatar: caller.avatarUrl,
      targetUserId,
      isVideo,
      offerSdp: offer
    });

    return this.localStream;
  }

  public async acceptIncomingCall(callData: { callerId: string; offerSdp: any; isVideo: boolean }): Promise<MediaStream> {
    this.currentCallTargetUserId = callData.callerId;
    await this.refreshIceServers();

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Este dispositivo no soporta captura WebRTC.');
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callData.isVideo ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false
      });
    } catch {
      this.currentCallTargetUserId = null;
      throw new Error('Debes autorizar el micrófono/cámara para contestar la llamada.');
    }

    this.peerConnection = new RTCPeerConnection({ iceServers: this.iceServers });
    this.localStream.getTracks().forEach(track => {
      this.peerConnection?.addTrack(track, this.localStream!);
    });
    this.attachPeerConnectionObservers(callData.callerId);

    if (callData.offerSdp) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(callData.offerSdp));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      this.send('webrtc:call_accept', {
        callerId: callData.callerId,
        targetUserId: this.currentUserId,
        answerSdp: answer
      });
    }

    return this.localStream;
  }

  public rejectCall(callerId: string) {
    this.send('webrtc:call_reject', {
      callerId,
      targetUserId: this.currentUserId
    });
    this.endCall();
  }

  public endCall() {
    if (this.currentCallTargetUserId) {
      this.send('webrtc:call_end', {
        recipientId: this.currentCallTargetUserId,
        endedBy: this.currentUserId
      });
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.currentCallTargetUserId = null;
    this.emit('webrtc:call_ended', {});
  }

  private async handleInternalWebRTCSignal(type: string, data: any) {
    if (type === 'webrtc:call_accepted' && this.peerConnection && data.answerSdp) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answerSdp));
    } else if (type === 'webrtc:ice_candidate' && this.peerConnection && data.candidate) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) {
        console.error('[NAKEIC WebRTC] Error adding ICE candidate:', e);
      }
    } else if (type === 'webrtc:call_ended') {
      this.endCall();
    }
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }
}

export const realtime = new RealtimeService();
