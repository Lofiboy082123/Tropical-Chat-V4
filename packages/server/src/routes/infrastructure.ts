import { Router, Request, Response } from 'express';
import { InfrastructureService } from '../services/InfrastructureService.js';
import { createAuthMiddleware, requirePermission } from '../middleware/auth.js';
import { AuthService } from '../services/AuthService.js';
import { z } from 'zod';

const createServerSchema = z.object({
  provider: z.enum(['equinix_metal', 'aws', 'hetzner', 'custom_api']),
  providerResourceId: z.string().min(1),
  hostname: z.string().min(1),
  ipAddress: z.string().min(1),
  operatingSystem: z.string().min(1),
  specs: z.object({
    cpu: z.string(),
    cpuCores: z.number().int().positive(),
    ramGb: z.number().positive(),
    storageGb: z.number().positive(),
    storageType: z.enum(['NVMe', 'SSD', 'HDD', 'SAN']),
    networkSpeedGbps: z.number().positive(),
  }),
  location: z.string().min(1),
  rentalCostMonthly: z.number().nonnegative(),
  assignedCustomerId: z.string().nullable().optional(),
});

export function createInfrastructureRouter(
  infraService: InfrastructureService,
  authService: AuthService
): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(authService);

  router.get('/servers', authMiddleware, requirePermission('INFRA_VIEW'), (req: Request, res: Response) => {
    try {
      const includeArchived = req.query.includeArchived === 'true';
      const customerId = req.query.customerId as string | undefined;
      const servers = infraService.getAllServers({ includeArchived, customerId });
      res.json(servers);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/servers/:id', authMiddleware, requirePermission('INFRA_VIEW'), (req: Request, res: Response) => {
    try {
      const server = infraService.getServerById(req.params.id);
      if (!server) return res.status(404).json({ error: 'Server not found' });
      res.json(server);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/servers', authMiddleware, requirePermission('INFRA_MANAGE'), (req: Request, res: Response) => {
    const parse = createServerSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid server payload', details: parse.error.format() });
    }

    try {
      const server = infraService.createServer(parse.data as any, {
        id: req.user!.id,
        username: req.user!.username,
        ip: req.ip || req.socket.remoteAddress || 'unknown',
      });
      res.status(201).json(server);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.patch('/servers/:id', authMiddleware, requirePermission('INFRA_MANAGE'), (req: Request, res: Response) => {
    try {
      const server = infraService.updateServer(req.params.id, req.body, {
        id: req.user!.id,
        username: req.user!.username,
        ip: req.ip || req.socket.remoteAddress || 'unknown',
      });
      res.json(server);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/servers/:id', authMiddleware, requirePermission('INFRA_MANAGE'), (req: Request, res: Response) => {
    try {
      infraService.archiveServer(req.params.id, {
        id: req.user!.id,
        username: req.user!.username,
        ip: req.ip || req.socket.remoteAddress || 'unknown',
      });
      res.json({ success: true, message: 'Server archived' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
