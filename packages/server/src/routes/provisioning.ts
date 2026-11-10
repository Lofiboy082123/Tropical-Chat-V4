import { Router, Request, Response } from 'express';
import { ProvisioningEngine } from '../services/ProvisioningEngine.js';
import { ProviderRegistry } from '../providers/ProviderRegistry.js';
import { createAuthMiddleware, requirePermission } from '../middleware/auth.js';
import { AuthService } from '../services/AuthService.js';
import { z } from 'zod';
import { ProviderType } from '@tcc/shared';

const queueProvisioningSchema = z.object({
  customerId: z.string().min(1),
  provider: z.enum(['equinix_metal', 'aws', 'hetzner', 'custom_api']),
  targetHostname: z.string().min(1),
  targetOs: z.string().min(1),
  planId: z.string().min(1),
  location: z.string().min(1),
});

export function createProvisioningRouter(
  provisioningEngine: ProvisioningEngine,
  providerRegistry: ProviderRegistry,
  authService: AuthService
): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(authService);

  router.get('/providers', authMiddleware, requirePermission('INFRA_VIEW'), async (_req: Request, res: Response) => {
    try {
      const adapters = providerRegistry.listAdapters();
      const detailed = await Promise.all(
        adapters.map(async (a) => {
          const adapter = providerRegistry.getAdapter(a.providerType);
          const plans = await adapter.listAvailablePlans();
          return {
            providerType: a.providerType,
            name: a.name,
            plans,
          };
        })
      );
      res.json(detailed);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/jobs', authMiddleware, requirePermission('INFRA_VIEW'), (req: Request, res: Response) => {
    try {
      const jobs = provisioningEngine.getAllJobs();
      res.json(jobs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/jobs/:id', authMiddleware, requirePermission('INFRA_VIEW'), (req: Request, res: Response) => {
    try {
      const job = provisioningEngine.getJobById(req.params.id);
      if (!job) return res.status(404).json({ error: 'Provisioning job not found' });
      res.json(job);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/jobs', authMiddleware, requirePermission('INFRA_PROVISION'), (req: Request, res: Response) => {
    const parse = queueProvisioningSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid provisioning request', details: parse.error.format() });
    }

    try {
      const job = provisioningEngine.queueJob({
        ...parse.data,
        provider: parse.data.provider as ProviderType,
        initiatedByUserId: req.user!.id,
      });
      res.status(202).json(job);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
