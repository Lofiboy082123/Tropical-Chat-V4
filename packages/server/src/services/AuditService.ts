import { IDatabaseDriver } from '../db/driver.js';
import { v4 as uuidv4 } from 'uuid';

export class AuditService {
  constructor(private db: IDatabaseDriver) {}

  log(entry: {
    correlationId?: string;
    actorId: string;
    actorUsername: string;
    action: string;
    targetType: string;
    targetId: string;
    ipAddress: string;
    result: 'SUCCESS' | 'FAILURE' | 'DENIED';
    details?: Record<string, any>;
  }): void {
    const id = uuidv4();
    const correlationId = entry.correlationId || uuidv4();
    const detailsJson = entry.details ? JSON.stringify(entry.details) : null;

    this.db.run(
      `INSERT INTO audit_logs (id, correlation_id, actor_id, actor_username, action, target_type, target_id, ip_address, result, details_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        correlationId,
        entry.actorId,
        entry.actorUsername,
        entry.action,
        entry.targetType,
        entry.targetId,
        entry.ipAddress,
        entry.result,
        detailsJson,
      ]
    );
  }

  getRecentLogs(limit = 100, offset = 0): any[] {
    const rows = this.db.query(
      `SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return rows.map((r) => ({
      ...r,
      details: r.details_json ? JSON.parse(r.details_json) : null,
    }));
  }
}
