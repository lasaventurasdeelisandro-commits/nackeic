import crypto from 'crypto';

export interface IceServerEntry {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface LiveRtcSessionConfig {
  roomId: string;
  participantId: string;
  role: 'host' | 'cohost' | 'viewer';
  transportMode: 'sfu_livekit' | 'webrtc_p2p_mesh' | 'ws_media_relay';
  sfuConfigured: boolean;
  turnConfigured: boolean;
  livekitUrl?: string;
  livekitToken?: string;
  iceServers: IceServerEntry[];
  adaptiveBitrateProfiles: {
    preset: 'auto' | '720p' | '480p' | '360p';
    maxBitrateKbps: number;
    fps: number;
    width: number;
    height: number;
  }[];
  guidance: string;
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf-8') : input;
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Real LiveKit-compatible HS256 JWT token generator.
 * Uses LIVEKIT_API_KEY and LIVEKIT_API_SECRET from environment variables only.
 */
export function createLiveKitParticipantToken(params: {
  roomId: string;
  participantId: string;
  participantName: string;
  canPublish: boolean;
  canSubscribe: boolean;
  ttlSeconds?: number;
}): { token: string; url: string } | null {
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!url || !apiKey || !apiSecret) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + (params.ttlSeconds || 4 * 3600);

  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: apiKey,
      sub: params.participantId,
      name: params.participantName,
      nbf: now - 5,
      exp,
      jti: params.participantId,
      video: {
        roomJoin: true,
        room: params.roomId,
        canPublish: params.canPublish,
        canSubscribe: params.canSubscribe,
        canPublishData: true
      }
    })
  );

  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(`${header}.${payload}`)
    .digest();

  return {
    token: `${header}.${payload}.${base64UrlEncode(signature)}`,
    url
  };
}

export function buildIceServers(): { iceServers: IceServerEntry[]; turnConfigured: boolean } {
  const iceServers: IceServerEntry[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ];

  const turnConfigured = Boolean(process.env.TURN_URL);
  if (process.env.TURN_URL) {
    iceServers.push({
      urls: process.env.TURN_URL,
      username: process.env.TURN_USERNAME || 'nakeic_turn',
      credential: process.env.TURN_CREDENTIAL || ''
    });
  }

  return { iceServers, turnConfigured };
}

export function buildLiveRtcConfig(params: {
  roomId: string;
  participantId: string;
  participantName: string;
  role: 'host' | 'cohost' | 'viewer';
}): LiveRtcSessionConfig {
  const { iceServers, turnConfigured } = buildIceServers();
  const canPublish = params.role === 'host' || params.role === 'cohost';

  const livekit = createLiveKitParticipantToken({
    roomId: params.roomId,
    participantId: params.participantId,
    participantName: params.participantName,
    canPublish,
    canSubscribe: true
  });

  const adaptiveBitrateProfiles: LiveRtcSessionConfig['adaptiveBitrateProfiles'] = [
    { preset: '720p', maxBitrateKbps: 1800, fps: 30, width: 1280, height: 720 },
    { preset: '480p', maxBitrateKbps: 900, fps: 24, width: 854, height: 480 },
    { preset: '360p', maxBitrateKbps: 450, fps: 20, width: 640, height: 360 }
  ];

  if (livekit) {
    return {
      roomId: params.roomId,
      participantId: params.participantId,
      role: params.role,
      transportMode: 'sfu_livekit',
      sfuConfigured: true,
      turnConfigured,
      livekitUrl: livekit.url,
      livekitToken: livekit.token,
      iceServers,
      adaptiveBitrateProfiles,
      guidance: 'SFU LiveKit activo para ingesta RTMP/WebRTC y distribución masiva de baja latencia.'
    };
  }

  return {
    roomId: params.roomId,
    participantId: params.participantId,
    role: params.role,
    transportMode: params.role === 'cohost' || params.role === 'host' ? 'webrtc_p2p_mesh' : 'ws_media_relay',
    sfuConfigured: false,
    turnConfigured,
    iceServers,
    adaptiveBitrateProfiles,
    guidance: turnConfigured
      ? 'WebRTC P2P con servidor TURN activo y respaldo WS media relay. Para >500 espectadores simultáneos configure LIVEKIT_URL, LIVEKIT_API_KEY y LIVEKIT_API_SECRET.'
      : 'Modo híbrido WebRTC STUN + WS Media Relay activo. Configure TURN_URL y LIVEKIT_URL en producción comercial.'
  };
}
