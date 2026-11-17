import net from 'net';
import tls from 'tls';

export interface CoordinatorStatus {
  configured: boolean;
  connected: boolean;
  mode: 'redis' | 'single_node_fallback';
  urlMasked?: string;
  lastError?: string;
}

/**
 * Coordinates ephemeral state (presence, rate limits, live viewer counters, pub/sub)
 * via Redis RESP protocol when REDIS_URL is provisioned, and safely falls back to
 * single-node in-memory coordination when no external Redis cluster is attached.
 */
export class RedisCoordinator {
  private redisUrl: string | undefined;
  private isConnected: boolean = false;
  private lastError: string | undefined;
  private localStore = new Map<string, { value: string; expiresAt?: number }>();
  private subscribers = new Map<string, Set<(channel: string, message: string) => void>>();

  constructor(redisUrl?: string) {
    this.redisUrl = redisUrl || process.env.REDIS_URL;
  }

  async initialize(): Promise<CoordinatorStatus> {
    if (!this.redisUrl) {
      this.isConnected = false;
      return this.getStatus();
    }

    try {
      const parsed = new URL(this.redisUrl);
      const isTls = parsed.protocol === 'rediss:';
      const host = parsed.hostname;
      const port = parseInt(parsed.port || '6379', 10);

      await new Promise<void>((resolve, reject) => {
        const socket = isTls
          ? tls.connect({ host, port, timeout: 3000 })
          : net.createConnection({ host, port });

        socket.setTimeout(3000);
        const commands: string[] = [];
        if (parsed.password) {
          if (parsed.username) {
            commands.push(this.encodeResp(['AUTH', decodeURIComponent(parsed.username), decodeURIComponent(parsed.password)]));
          } else {
            commands.push(this.encodeResp(['AUTH', decodeURIComponent(parsed.password)]));
          }
        }
        commands.push(this.encodeResp(['PING']));

        socket.on('connect', () => {
          socket.write(commands.join(''));
        });

        socket.on('data', (chunk) => {
          const text = chunk.toString('utf-8');
          if (text.includes('+PONG')) {
            this.isConnected = true;
            this.lastError = undefined;
            socket.end();
            resolve();
          } else if (text.startsWith('-')) {
            const err = new Error(text.trim());
            socket.destroy();
            reject(err);
          }
        });

        socket.on('timeout', () => {
          socket.destroy();
          reject(new Error('Redis connection timeout (3000ms)'));
        });

        socket.on('error', (err) => {
          socket.destroy();
          reject(err);
        });
      });
    } catch (err: any) {
      this.isConnected = false;
      this.lastError = err?.message || 'Redis connection failed';
    }

    return this.getStatus();
  }

  private encodeResp(args: string[]): string {
    let out = `*${args.length}\r\n`;
    for (const a of args) {
      const buf = Buffer.from(a, 'utf-8');
      out += `$${buf.length}\r\n${a}\r\n`;
    }
    return out;
  }

  private async execCommand(args: string[]): Promise<string | null> {
    if (!this.redisUrl || !this.isConnected) return null;
    try {
      const parsed = new URL(this.redisUrl);
      const isTls = parsed.protocol === 'rediss:';
      const host = parsed.hostname;
      const port = parseInt(parsed.port || '6379', 10);

      return await new Promise<string | null>((resolve) => {
        const socket = isTls
          ? tls.connect({ host, port, timeout: 1500 })
          : net.createConnection({ host, port });

        socket.setTimeout(1500);
        const cmds: string[] = [];
        if (parsed.password) {
          cmds.push(parsed.username
            ? this.encodeResp(['AUTH', decodeURIComponent(parsed.username), decodeURIComponent(parsed.password)])
            : this.encodeResp(['AUTH', decodeURIComponent(parsed.password)]));
        }
        cmds.push(this.encodeResp(args));

        let buffer = '';
        socket.on('connect', () => socket.write(cmds.join('')));
        socket.on('data', (chunk) => {
          buffer += chunk.toString('utf-8');
          socket.end();
          resolve(buffer);
        });
        socket.on('timeout', () => {
          socket.destroy();
          resolve(null);
        });
        socket.on('error', () => {
          socket.destroy();
          resolve(null);
        });
      });
    } catch {
      return null;
    }
  }

  async setEphemeral(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.localStore.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined
    });
    if (this.isConnected) {
      const args = ttlSeconds ? ['SET', key, value, 'EX', String(ttlSeconds)] : ['SET', key, value];
      await this.execCommand(args);
    }
  }

  async getEphemeral(key: string): Promise<string | null> {
    const local = this.localStore.get(key);
    if (local) {
      if (local.expiresAt && local.expiresAt < Date.now()) {
        this.localStore.delete(key);
      } else {
        return local.value;
      }
    }
    return null;
  }

  async publish(channel: string, payload: unknown): Promise<void> {
    const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const localSubs = this.subscribers.get(channel);
    if (localSubs) {
      localSubs.forEach((cb) => {
        try {
          cb(channel, serialized);
        } catch {
          // non-fatal subscriber error
        }
      });
    }
    if (this.isConnected) {
      await this.execCommand(['PUBLISH', channel, serialized]);
    }
  }

  subscribeLocal(channel: string, handler: (channel: string, message: string) => void): () => void {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    this.subscribers.get(channel)!.add(handler);
    return () => {
      this.subscribers.get(channel)?.delete(handler);
    };
  }

  getStatus(): CoordinatorStatus {
    let urlMasked: string | undefined;
    if (this.redisUrl) {
      try {
        const u = new URL(this.redisUrl);
        urlMasked = `${u.protocol}//${u.hostname}:${u.port || '6379'}`;
      } catch {
        urlMasked = 'configured';
      }
    }
    return {
      configured: Boolean(this.redisUrl),
      connected: this.isConnected,
      mode: this.isConnected ? 'redis' : 'single_node_fallback',
      urlMasked,
      lastError: this.lastError
    };
  }
}

export const redisCoordinator = new RedisCoordinator();
