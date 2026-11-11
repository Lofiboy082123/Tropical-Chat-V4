import { Router, Request, Response } from 'express';
import { AuditService } from '../services/AuditService.js';
import { IncidentService } from '../services/IncidentService.js';
import { AuthService } from '../services/AuthService.js';
import { IDatabaseDriver } from '../db/driver.js';
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
  authService: AuthService,
  db: IDatabaseDriver
): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(authService);

  // Immutable Audit Logs view
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

  // Incidents
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

  // User Management
  router.get('/users', authMiddleware, requirePermission('USER_MANAGE'), (_req: Request, res: Response) => {
    try {
      const rows = db.query(`SELECT id, username, email, role_id, is_active, created_at, last_login_at FROM users`);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Role Management
  router.get('/roles', authMiddleware, requirePermission('USER_MANAGE'), (_req: Request, res: Response) => {
    try {
      const roles = db.query(`SELECT * FROM roles`);
      const permissions = db.query(`SELECT * FROM role_permissions`);
      const mapped = roles.map((r: any) => ({
        ...r,
        permissions: permissions.filter((p: any) => p.role_id === r.id).map((p: any) => p.permission),
      }));
      res.json(mapped);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // System Settings
  router.get('/settings', authMiddleware, requirePermission('SETTINGS_MANAGE'), (_req: Request, res: Response) => {
    try {
      const rows = db.query(`SELECT key, value FROM system_settings`);
      const settingsObj: Record<string, string> = {};
      for (const r of rows) {
        settingsObj[r.key] = r.value;
      }
      res.json(settingsObj);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
