/**
 * NAKEIC Real-Time WebSocket & WebRTC Engine
 * Full-duplex real-time synchronization, messaging, and P2P WebRTC calls.
 */

export type RealtimeEventHandler = (data: any) => void;

class RealtimeService {
  private ws: WebSocket | null = null;
  private currentUserId: string | null = null;
  private eventHandlers: Map<string, Set<RealtimeEventHandler>> = new Map();
  private reconnectTimeout: any = null;
  private isConnected: boolean = false;

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

  public connect(userId: string) {
    this.currentUserId = userId;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.send('auth:connect', { userId });
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.send('auth:connect', { userId: this.currentUserId });
        this.emit('connection:change', { isConnected: true });
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const { type, data } = payload;
          this.emit(type, data);

          // Handle incoming WebRTC signaling automatically
          this.handleInternalWebRTCSignal(type, data);
        } catch (e) {
          console.error('[NAKEIC WS] Error parsing message:', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.emit('connection:change', { isConnected: false });
        // Attempt reconnect after 3 seconds
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => {
          if (this.currentUserId) {
            this.connect(this.currentUserId);
          }
        }, 3000);
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

  // --- Real WebRTC Implementation ---

  public async startCall(targetUserId: string, caller: { id: string; displayName: string; avatarUrl: string }, isVideo: boolean): Promise<MediaStream | null> {
    this.currentCallTargetUserId = targetUserId;

    try {
      // 1. Get real user media (mic & camera)
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false
      });
    } catch (err) {
      console.warn('[NAKEIC WebRTC] Could not acquire hardware media, proceeding in fallback mode:', err);
      // Create empty fallback audio stream so call can still proceed
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const dst = ctx.createMediaStreamDestination();
      osc.connect(dst);
      this.localStream = dst.stream;
    }

    // 2. Initialize PeerConnection
    this.peerConnection = new RTCPeerConnection({ iceServers: this.iceServers });

    // 3. Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });
    }

    // 4. Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.send('webrtc:ice_candidate', {
          targetUserId,
          candidate: event.candidate
        });
      }
    };

    // 5. Handle remote stream tracks
    this.remoteStream = new MediaStream();
    this.peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => {
        this.remoteStream?.addTrack(track);
      });
      this.emit('webrtc:remote_stream', { stream: this.remoteStream });
    };

    // 6. Create Offer & Send via WebSocket
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

  public async acceptIncomingCall(callData: { callerId: string; offerSdp: any; isVideo: boolean }): Promise<MediaStream | null> {
    this.currentCallTargetUserId = callData.callerId;

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callData.isVideo ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false
      });
    } catch (err) {
      console.warn('[NAKEIC WebRTC] Media acquisition notice:', err);
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const dst = ctx.createMediaStreamDestination();
      this.localStream = dst.stream;
    }

    this.peerConnection = new RTCPeerConnection({ iceServers: this.iceServers });

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });
    }

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.send('webrtc:ice_candidate', {
          targetUserId: callData.callerId,
          candidate: event.candidate
        });
      }
    };

    this.remoteStream = new MediaStream();
    this.peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => {
        this.remoteStream?.addTrack(track);
      });
      this.emit('webrtc:remote_stream', { stream: this.remoteStream });
    };

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
