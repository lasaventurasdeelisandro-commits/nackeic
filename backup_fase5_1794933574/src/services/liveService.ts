/**
 * NAKEIC Live Real-Time Streaming Service
 * Dedicated WebSocket client (/ws/live) & Web Audio PCM streamer/player
 * supporting unlimited simultaneous broadcasters and unlimited concurrent viewers.
 */

export type LiveEventHandler = (data: any) => void;

class LiveService {
  private ws: WebSocket | null = null;
  private eventHandlers: Map<string, Set<LiveEventHandler>> = new Map();
  private reconnectTimeout: any = null;
  private shouldReconnect: boolean = false;
  private connected: boolean = false;

  public connect() {
    this.shouldReconnect = true;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/live`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.connected = true;
        this.emit('live:connection', { isConnected: true });
        this.send('live:register_client', {});
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload && payload.type) {
            this.emit(payload.type, payload.data);
          }
        } catch (err) {
          console.error('[NAKEIC Live] Error parsing WS payload:', err);
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.emit('live:connection', { isConnected: false });
        if (this.shouldReconnect) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = setTimeout(() => {
            this.connect();
          }, 2500);
        }
      };

      this.ws.onerror = () => {
        // Handled cleanly by onclose reconnect
      };
    } catch (err) {
      console.error('[NAKEIC Live] Failed to open WebSocket:', err);
    }
  }

  public disconnect() {
    this.shouldReconnect = false;
    clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  public isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  public getBufferedAmount(): number {
    return this.ws?.bufferedAmount || 0;
  }

  public send(type: string, data: any): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
      return true;
    }
    return false;
  }

  public on(event: string, handler: LiveEventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  public off(event: string, handler: LiveEventHandler) {
    const set = this.eventHandlers.get(event);
    if (set) {
      set.delete(handler);
    }
  }

  private emit(event: string, data: any) {
    const set = this.eventHandlers.get(event);
    if (set) {
      set.forEach(fn => fn(data));
    }
  }
}

export const liveService = new LiveService();

/**
 * Downsample Float32 audio buffer to 16kHz Int16 PCM base64 for ultra-low-latency streaming
 */
function downsampleTo16kPcmBase64(input: Float32Array, inputSampleRate: number): string {
  const targetRate = 16000;
  const ratio = inputSampleRate / targetRate;
  const outputLength = Math.max(1, Math.floor(input.length / ratio));
  const int16 = new Int16Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIdx = Math.min(input.length - 1, Math.floor(i * ratio));
    const sample = Math.max(-1, Math.min(1, input[srcIdx]));
    int16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Capture real microphone audio tracks from MediaStream and emit 16kHz PCM chunks
 */
export function startLiveAudioCapture(
  stream: MediaStream,
  isMutedRef: { current: boolean },
  onChunk: (pcmBase64: string, sampleRate: number) => void
): () => void {
  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length === 0) {
    return () => {};
  }

  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  const audioOnlyStream = new MediaStream(audioTracks);
  const source = ctx.createMediaStreamSource(audioOnlyStream);
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  const silentGain = ctx.createGain();
  silentGain.gain.value = 0;

  processor.onaudioprocess = (event) => {
    if (isMutedRef.current) return;
    const channelData = event.inputBuffer.getChannelData(0);
    // Skip pure silence frames to conserve bandwidth
    let maxAmp = 0;
    for (let i = 0; i < channelData.length; i += 16) {
      const a = Math.abs(channelData[i]);
      if (a > maxAmp) maxAmp = a;
    }
    if (maxAmp < 0.002) return;

    const pcmBase64 = downsampleTo16kPcmBase64(channelData, ctx.sampleRate);
    onChunk(pcmBase64, 16000);
  };

  source.connect(processor);
  processor.connect(silentGain);
  silentGain.connect(ctx.destination);

  return () => {
    try {
      processor.disconnect();
      source.disconnect();
      silentGain.disconnect();
      ctx.close().catch(() => {});
    } catch {
      // ignore cleanup errors
    }
  };
}

/**
 * Low-latency viewer PCM audio playback engine
 */
export class LiveAudioPlayer {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private nextStartTime: number = 0;
  private muted: boolean = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = this.muted ? 0 : 1;
      this.gainNode.connect(this.ctx.destination);
      this.nextStartTime = this.ctx.currentTime;
    }
    return this.ctx;
  }

  public async resume(): Promise<boolean> {
    const ctx = this.ensureContext();
    if (!ctx) return false;
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        return false;
      }
    }
    return ctx.state === 'running';
  }

  public isSuspended(): boolean {
    return !this.ctx || this.ctx.state === 'suspended';
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(muted ? 0 : 1, this.ctx.currentTime);
    }
  }

  public enqueuePcm(pcmBase64: string, sampleRate: number = 16000) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.gainNode || ctx.state !== 'running') return;

    try {
      const binary = atob(pcmBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const int16 = new Int16Array(bytes.buffer);
      if (int16.length === 0) return;

      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768;
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, sampleRate);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.gainNode);

      const now = ctx.currentTime;
      if (this.nextStartTime < now || this.nextStartTime > now + 0.6) {
        this.nextStartTime = now + 0.04;
      }
      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
    } catch {
      // ignore malformed audio frame
    }
  }

  public dispose() {
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
      this.gainNode = null;
    }
  }
}
