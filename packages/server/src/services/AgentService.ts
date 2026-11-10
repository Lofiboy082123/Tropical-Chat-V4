import { IDatabaseDriver } from '../db/driver.js';
import {
  AgentRecord,
  AgentStatus,
  AgentHeartbeatPayload,
  AgentRegistrationPayload,
  AgentRegistrationResponse,
} from '@tcc/shared';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { AuditService } from './AuditService.js';
import { WebSocketManager } from './WebSocketManager.js';

export class AgentService {
  private timer: any = null;

  constructor(
    private db: IDatabaseDriver,
    private audit: AuditService,
    private wsManager: WebSocketManager
  ) {
    this.timer = setInterval(() => this.recalculateAgentStatuses(), 15000);
    if (this.timer.unref) this.timer.unref();
  }

  getAllAgents(): AgentRecord[] {
    const rows = this.db.query(`SELECT * FROM agents ORDER BY created_at DESC`);
    return rows.map(this.mapAgentRow);
  }

  getAgentById(id: string): AgentRecord | null {
    const row = this.db.get(`SELECT * FROM agents WHERE id = ?`, [id]);
    if (!row) return null;
    return this.mapAgentRow(row);
  }

  registerAgent(payload: AgentRegistrationPayload): AgentRegistrationResponse {
    const row = this.db.get<any>(
      `SELECT * FROM agents WHERE enrollment_token = ? AND is_revoked = 0`,
      [payload.enrollmentToken]
    );

    if (!row) {
      throw new Error('Invalid or expired enrollment token');
    }

    const authToken = `agt-sec-${uuidv4()}-${uuidv4()}`;
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(authToken, salt);

    this.db.run(
      `UPDATE agents SET
        auth_token_hash = ?,
        enrollment_token = NULL,
        version = ?,
        os_platform = ?,
        os_release = ?,
        hostname = ?,
        status = 'UNKNOWN',
        updated_at = datetime('now')
       WHERE id = ?`,
      [
        hash,
        payload.agentVersion,
        payload.osInfo.platform,
        payload.osInfo.release,
        payload.hostname,
        row.id,
      ]
    );

    this.audit.log({
      actorId: row.id,
      actorUsername: `AGENT/${payload.hostname}`,
      action: 'AGENT_REGISTERED',
      targetType: 'AGENT',
      targetId: row.id,
      ipAddress: '127.0.0.1',
      result: 'SUCCESS',
      details: { version: payload.agentVersion, os: payload.osInfo },
    });

    return {
      agentId: row.id,
      authToken,
      heartbeatIntervalSeconds: 30,
      heartbeatTimeoutSeconds: row.heartbeat_deadline_seconds || 60,
    };
  }

  processHeartbeat(agentId: string, authToken: string, payload: AgentHeartbeatPayload): boolean {
    const agent = this.db.get<any>(`SELECT * FROM agents WHERE id = ?`, [agentId]);
    if (!agent || agent.is_revoked) {
      return false;
    }

    const valid = bcrypt.compareSync(authToken, agent.auth_token_hash);
    if (!valid) {
      return false;
    }

    const telemetryId = uuidv4();
    const t = payload.telemetry;

    this.db.run(
      `INSERT INTO agent_telemetry (
        id, agent_id, timestamp, cpu_usage_percent, memory_used_mb, memory_total_mb,
        storage_used_gb, storage_total_gb, network_rx_bytes_sec, network_tx_bytes_sec, uptime_seconds
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        telemetryId,
        agentId,
        payload.timestamp,
        t.cpuUsagePercent,
        t.memoryUsedMb,
        t.memoryTotalMb,
        t.storageUsedGb,
        t.storageTotalGb,
        t.networkRxBytesPerSec,
        t.networkTxBytesPerSec,
        t.uptimeSeconds,
      ]
    );

    this.db.run(
      `UPDATE agents SET
        status = 'ONLINE',
        last_heartbeat_at = ?,
        version = ?,
        latest_telemetry_json = ?,
        updated_at = datetime('now')
       WHERE id = ?`,
      [payload.timestamp, payload.version, JSON.stringify(t), agentId]
    );

    this.db.run(
      `UPDATE servers SET monitoring_status = 'online', updated_at = datetime('now') WHERE agent_id = ?`,
      [agentId]
    );

    this.wsManager.broadcastToDesktop('agent:telemetry', {
      agentId,
      timestamp: payload.timestamp,
      telemetry: t,
    });

    return true;
  }

  revokeAgent(agentId: string, actor: { id: string; username: string; ip: string }): void {
    const agent = this.getAgentById(agentId);
    if (!agent) throw new Error('Agent not found');

    this.db.run(
      `UPDATE agents SET is_revoked = 1, status = 'UNKNOWN', updated_at = datetime('now') WHERE id = ?`,
      [agentId]
    );

    this.db.run(
      `UPDATE servers SET monitoring_status = 'unknown', updated_at = datetime('now') WHERE agent_id = ?`,
      [agentId]
    );

    this.audit.log({
      actorId: actor.id,
      actorUsername: actor.username,
      action: 'AGENT_CREDENTIALS_REVOKED',
      targetType: 'AGENT',
      targetId: agentId,
      ipAddress: actor.ip,
      result: 'SUCCESS',
    });

    this.wsManager.broadcastToDesktop('agent:revoked', { agentId });
  }

  recalculateAgentStatuses(): void {
    const rows = this.db.query<any>(
      `SELECT id, status, last_heartbeat_at, heartbeat_deadline_seconds, is_revoked FROM agents WHERE is_revoked = 0`
    );

    const now = Date.now();

    for (const row of rows) {
      if (!row.last_heartbeat_at) {
        if (row.status !== 'UNKNOWN') {
          this.db.run(`UPDATE agents SET status = 'UNKNOWN' WHERE id = ?`, [row.id]);
          this.db.run(`UPDATE servers SET monitoring_status = 'unknown' WHERE agent_id = ?`, [row.id]);
        }
        continue;
      }

      const lastHb = new Date(row.last_heartbeat_at).getTime();
      const diffSec = (now - lastHb) / 1000;
      const deadline = row.heartbeat_deadline_seconds || 60;

      if (diffSec > deadline && row.status === 'ONLINE') {
        this.db.run(`UPDATE agents SET status = 'OFFLINE', updated_at = datetime('now') WHERE id = ?`, [row.id]);
        this.db.run(`UPDATE servers SET monitoring_status = 'offline', updated_at = datetime('now') WHERE agent_id = ?`, [row.id]);
        this.wsManager.broadcastToDesktop('agent:status_changed', { agentId: row.id, status: 'OFFLINE' });
      }
    }
  }

  private mapAgentRow(row: any): AgentRecord {
    return {
      id: row.id,
      serverId: row.server_id,
      customerId: row.customer_id,
      version: row.version,
      status: row.status as AgentStatus,
      osPlatform: row.os_platform,
      osRelease: row.os_release,
      hostname: row.hostname,
      lastHeartbeatAt: row.last_heartbeat_at,
      heartbeatDeadlineSeconds: row.heartbeat_deadline_seconds,
      latestTelemetry: row.latest_telemetry_json ? JSON.parse(row.latest_telemetry_json) : null,
      isRevoked: Boolean(row.is_revoked),
      enrollmentToken: row.enrollment_token,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
