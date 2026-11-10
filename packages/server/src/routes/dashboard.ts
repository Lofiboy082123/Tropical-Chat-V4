import { Router, Request, Response } from 'express';
import { DashboardService } from '../services/DashboardService.js';
import { createAuthMiddleware, requirePermission } from '../middleware/auth.js';
import { AuthService } from '../services/AuthService.js';

export function createDashboardRouter(dashboardService: DashboardService, authService: AuthService): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(authService);

  router.get('/metrics', authMiddleware, requirePermission('DASHBOARD_VIEW'), (req: Request, res: Response) => {
    try {
      const metrics = dashboardService.getMetrics();
      res.json(metrics);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to retrieve dashboard metrics' });
    }
  });

  return router;
}
