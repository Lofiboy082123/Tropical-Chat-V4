import { Router, Request, Response } from 'express';
import { AgentService } from '../services/AgentService.js';
import { createAuthMiddleware, requirePermission } from '../middleware/auth.js';
import { AuthService } from '../services/AuthService.js';
import { z } from 'zod';

const registerAgentSchema = z.object({
  enrollmentToken: z.string().min(1),
  hostname: z.string().min(1),
  osInfo: z.object({
    platform: z.string(),
    release: z.string(),
    arch: z.string(),
  }),
  agentVersion: z.string().min(1),
});

const heartbeatSchema = z.object({
  agentId: z.string().min(1),
  version: z.string().min(1),
  timestamp: z.string().min(1),
  osInfo: z.object({
    platform: z.string(),
    release: z.string(),
    arch: z.string(),
    hostname: z.string(),
  }),
  telemetry: z.object({
    cpuUsagePercent: z.number().min(0).max(100),
    memoryUsedMb: z.number().nonnegative(),
    memoryTotalMb: z.number().positive(),
    storageUsedGb: z.number().nonnegative(),
    storageTotalGb: z.number().positive(),
    networkRxBytesPerSec: z.number().nonnegative(),
    networkTxBytesPerSec: z.number().nonnegative(),
    uptimeSeconds: z.number().nonnegative(),
  }),
});

export function createAgentRouter(agentService: AgentService, authService: AuthService): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(authService);

  router.post('/enroll', (req: Request, res: Response) => {
    const parse = registerAgentSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid registration payload', details: parse.error.format() });
    }

    try {
      const result = agentService.registerAgent(parse.data);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/heartbeat', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Agent authentication token required' });
    }
    const token = authHeader.substring(7);

    const parse = heartbeatSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid heartbeat payload', details: parse.error.format() });
    }

    const success = agentService.processHeartbeat(parse.data.agentId, token, parse.data);
    if (!success) {
      return res.status(403).json({ error: 'Invalid or revoked agent credentials' });
    }

    res.json({ status: 'ACK', receivedAt: new Date().toISOString() });
  });

  router.get('/agents', authMiddleware, requirePermission('AGENT_VIEW'), (_req: Request, res: Response) => {
    try {
      const agents = agentService.getAllAgents();
      res.json(agents);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/agents/:id/revoke', authMiddleware, requirePermission('AGENT_MANAGE'), (req: Request, res: Response) => {
    try {
      agentService.revokeAgent(req.params.id, {
        id: req.user!.id,
        username: req.user!.username,
        ip: req.ip || req.socket.remoteAddress || 'unknown',
      });
      res.json({ success: true, message: 'Agent credentials revoked' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
