import { IDatabaseDriver } from '../db/driver.js';
import { IncidentRecord } from '@tcc/shared';
import { v4 as uuidv4 } from 'uuid';
import { AuditService } from './AuditService.js';
import { WebSocketManager } from './WebSocketManager.js';

export interface CreateIncidentInput {
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedServerId?: string;
  affectedCustomerId?: string;
  description: string;
}

export class IncidentService {
  constructor(
    private db: IDatabaseDriver,
    private audit: AuditService,
    private wsManager: WebSocketManager
  ) {}

  getAllIncidents(): IncidentRecord[] {
    const rows = this.db.query(`SELECT * FROM incidents ORDER BY created_at DESC`);
    return rows.map(this.mapIncidentRow);
  }

  getIncidentById(id: string): IncidentRecord | null {
    const row = this.db.get(`SELECT * FROM incidents WHERE id = ?`, [id]);
    if (!row) return null;
    return this.mapIncidentRow(row);
  }

  createIncident(input: CreateIncidentInput, actor: { id: string; username: string; ip: string }): IncidentRecord {
    const id = `inc-${uuidv4().substring(0, 8)}`;
    this.db.run(
      `INSERT INTO incidents (id, title, severity, status, affected_server_id, affected_customer_id, description, reported_by_user_id)
       VALUES (?, ?, ?, 'OPEN', ?, ?, ?, ?)`,
      [
        id,
        input.title,
        input.severity,
        input.affectedServerId || null,
        input.affectedCustomerId || null,
        input.description,
        actor.id,
      ]
    );

    this.audit.log({
      actorId: actor.id,
      actorUsername: actor.username,
      action: 'INCIDENT_CREATE',
      targetType: 'INCIDENT',
      targetId: id,
      ipAddress: actor.ip,
      result: 'SUCCESS',
      details: { title: input.title, severity: input.severity },
    });

    this.wsManager.broadcastToDesktop('incident:created', { id, title: input.title, severity: input.severity });

    return this.getIncidentById(id)!;
  }

  updateIncidentStatus(
    id: string,
    status: 'OPEN' | 'INVESTIGATING' | 'MITIGATED' | 'RESOLVED',
    actor: { id: string; username: string; ip: string }
  ): IncidentRecord {
    const existing = this.getIncidentById(id);
    if (!existing) throw new Error('Incident not found');

    const resolvedAt = status === 'RESOLVED' ? new Date().toISOString() : null;

    this.db.run(
      `UPDATE incidents SET status = ?, resolved_at = ? WHERE id = ?`,
      [status, resolvedAt, id]
    );

    this.audit.log({
      actorId: actor.id,
      actorUsername: actor.username,
      action: 'INCIDENT_STATUS_UPDATE',
      targetType: 'INCIDENT',
      targetId: id,
      ipAddress: actor.ip,
      result: 'SUCCESS',
      details: { previousStatus: existing.status, newStatus: status },
    });

    return this.getIncidentById(id)!;
  }

  private mapIncidentRow(row: any): IncidentRecord {
    return {
      id: row.id,
      title: row.title,
      severity: row.severity,
      status: row.status,
      affectedServerId: row.affected_server_id,
      affectedCustomerId: row.affected_customer_id,
      description: row.description,
      reportedByUserId: row.reported_by_user_id,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at,
    };
  }
}
