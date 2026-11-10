import { Router, Request, Response } from 'express';
import { AuditService } from '../services/AuditService.js';
import { IncidentService } from '../services/IncidentService.js';
import { AuthService } from '../services/AuthService.js';
import { createAuthMiddleware, requirePermission } from '../middleware/auth.js';
import { z } from 'zod';

const createIncidentSchema = z.object({
  title: z.string().min(1),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  affectedServerId: z.string().optional(),
  affectedCustomerId: z.string().optional(),
  description: z.string().min(1),
});

export function createAdminAuditRouter(
  auditService: AuditService,
  incidentService: IncidentService,
  authService: AuthService
): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(authService);

  router.get('/audit-logs', authMiddleware, requirePermission('AUDIT_VIEW'), (req: Request, res: Response) => {
    try {
      const limit = parseInt((req.query.limit as string) || '100', 10);
      const offset = parseInt((req.query.offset as string) || '0', 10);
      const logs = auditService.getRecentLogs(limit, offset);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/incidents', authMiddleware, requirePermission('DASHBOARD_VIEW'), (_req: Request, res: Response) => {
    try {
      const incidents = incidentService.getAllIncidents();
      res.json(incidents);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/incidents', authMiddleware, requirePermission('INCIDENT_MANAGE'), (req: Request, res: Response) => {
    const parse = createIncidentSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid incident payload', details: parse.error.format() });
    }
    try {
      const inc = incidentService.createIncident(parse.data, {
        id: req.user!.id,
        username: req.user!.username,
        ip: req.ip || req.socket.remoteAddress || 'unknown',
      });
      res.status(201).json(inc);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.patch('/incidents/:id/status', authMiddleware, requirePermission('INCIDENT_MANAGE'), (req: Request, res: Response) => {
    const { status } = req.body;
    if (!['OPEN', 'INVESTIGATING', 'MITIGATED', 'RESOLVED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    try {
      const updated = incidentService.updateIncidentStatus(req.params.id, status, {
        id: req.user!.id,
        username: req.user!.username,
        ip: req.ip || req.socket.remoteAddress || 'unknown',
      });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
