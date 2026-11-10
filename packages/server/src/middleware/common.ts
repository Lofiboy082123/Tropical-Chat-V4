import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function correlationMiddleware(req: Request, res: Response, next: NextFunction) {
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
}

const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimitMiddleware(windowMs: number, maxRequests: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const clientData = requestCounts.get(ip);

    if (!clientData || now > clientData.resetTime) {
      requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (clientData.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
      });
    }

    clientData.count++;
    next();
  };
}
