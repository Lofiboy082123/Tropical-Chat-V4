import { Router, Request, Response } from 'express';
import { AuthService } from '../services/AuthService.js';
import { z } from 'zod';
import { createAuthMiddleware } from '../middleware/auth.js';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export function createAuthRouter(authService: AuthService): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(authService);

  router.post('/login', async (req: Request, res: Response) => {
    const parse = loginSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    try {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const session = await authService.authenticate(
        parse.data.username,
        parse.data.password,
        ip,
        userAgent
      );
      return res.json(session);
    } catch (err: any) {
      return res.status(401).json({ error: err.message || 'Authentication failed' });
    }
  });

  router.post('/logout', authMiddleware, (req: Request, res: Response) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    // Audit logout action
    (authService as any).audit?.log({
      actorId: req.user!.id,
      actorUsername: req.user!.username,
      action: 'USER_LOGOUT',
      targetType: 'USER',
      targetId: req.user!.id,
      ipAddress: ip,
      result: 'SUCCESS',
    });
    return res.json({ success: true, message: 'Logged out successfully' });
  });

  router.get('/me', authMiddleware, (req: Request, res: Response) => {
    return res.json({ user: req.user });
  });

  return router;
}
