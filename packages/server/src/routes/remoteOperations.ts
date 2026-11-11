import { Router, Request, Response } from 'express';
import { RemoteOperationsService } from '../services/RemoteOperationsService.js';
import { createAuthMiddleware, requirePermission } from '../middleware/auth.js';
import { AuthService } from '../services/AuthService.js';
import { z } from 'zod';

const executeOpSchema = z.object({
  agentId: z.string().min(1),
  commandType: z.enum([
    'GET_SERVICE_STATUS',
    'GET_DIAGNOSTICS',
    'RESTART_SERVICE',
    'SCHEDULE_MAINTENANCE',
    'UPGRADE_AGENT',
  ]),
  parameters: z.record(z.any()).optional(),
  isDisruptive: z.boolean().default(false),
  confirmationAcknowledged: z.boolean().default(false),
});

export function createRemoteOperationsRouter(
  remoteService: RemoteOperationsService,
  authService: AuthService
): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(authService);

  router.get('/operations', authMiddleware, requirePermission('REMOTE_DIAGNOSTICS'), (req: Request, res: Response) => {
    try {
      const ops = remoteService.getAllOperations();
      res.json(ops);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/operations', authMiddleware, requirePermission('REMOTE_EXECUTE'), async (req: Request, res: Response) => {
    const parse = executeOpSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid operation payload', details: parse.error.format() });
    }

    try {
      const op = await remoteService.executeOperation({
        ...parse.data,
        actor: {
          id: req.user!.id,
          username: req.user!.username,
          ip: req.ip || req.socket.remoteAddress || 'unknown',
        },
      });
      res.status(200).json(op);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
}
