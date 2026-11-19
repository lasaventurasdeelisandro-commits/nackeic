import { Request, Response, NextFunction } from "express";

interface RequestRecord {
  count: number;
  firstRequestTime: number;
}

const ipRequestMap = new Map<string, RequestRecord>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipRequestMap.entries()) {
    if (now - record.firstRequestTime > 600000) {
      ipRequestMap.delete(ip);
    }
  }
}, 300000);

export function rateLimiter({ maxRequests = 60, windowMs = 60000 }: { maxRequests?: number; windowMs?: number } = {}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Express req.ip honors trust proxy configuration; never trust raw user-supplied X-Forwarded-For.
    const clientIp = req.ip || req.socket.remoteAddress || "unknown_ip";
    const now = Date.now();

    const record = ipRequestMap.get(clientIp);

    if (!record) {
      ipRequestMap.set(clientIp, { count: 1, firstRequestTime: now });
      next();
      return;
    }

    if (now - record.firstRequestTime > windowMs) {
      // Reset window
      record.count = 1;
      record.firstRequestTime = now;
      next();
      return;
    }

    record.count++;
    if (record.count > maxRequests) {
      res.status(429).json({
        error: "Límite de solicitudes excedido. Por seguridad, espera un momento antes de reintentar.",
        retryAfterMs: windowMs - (now - record.firstRequestTime)
      });
      return;
    }

    next();
  };
}
