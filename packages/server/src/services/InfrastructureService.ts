import { IDatabaseDriver } from '../db/driver.js';
import { ServerRecord, ServerHardwareSpecs, ProviderType } from '@tcc/shared';
import { v4 as uuidv4 } from 'uuid';
import { AuditService } from './AuditService.js';

export interface CreateServerInput {
  provider: ProviderType;
  providerResourceId: string;
  hostname: string;
  ipAddress: string;
  operatingSystem: string;
  specs: ServerHardwareSpecs;
  location: string;
  rentalCostMonthly: number;
  assignedCustomerId?: string | null;
}

export class InfrastructureService {
  constructor(private db: IDatabaseDriver, private audit: AuditService) {}

  getAllServers(options?: { includeArchived?: boolean; customerId?: string }): ServerRecord[] {
    let sql = `SELECT * FROM servers WHERE 1=1`;
    const params: any[] = [];

    if (!options?.includeArchived) {
      sql += ` AND is_archived = 0`;
    }
    if (options?.customerId) {
      sql += ` AND assigned_customer_id = ?`;
      params.push(options.customerId);
    }

    sql += ` ORDER BY created_at DESC`;

    const rows = this.db.query(sql, params);
    return rows.map(this.mapServerRow);
  }

  getServerById(id: string): ServerRecord | null {
    const row = this.db.get(`SELECT * FROM servers WHERE id = ?`, [id]);
    if (!row) return null;
    return this.mapServerRow(row);
  }

  createServer(input: CreateServerInput, actor: { id: string; username: string; ip: string }): ServerRecord {
    const id = uuidv4();
    const specsJson = JSON.stringify(input.specs);
    const deploymentStatus = input.assignedCustomerId ? 'assigned' : 'unassigned';

    this.db.run(
      `INSERT INTO servers (
        id, provider, provider_resource_id, hostname, ip_address, operating_system,
        specs_json, location, rental_cost_monthly, assigned_customer_id,
        deployment_status, provisioning_status, monitoring_status, is_archived
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'provisioned', 'unknown', 0)`,
      [
        id,
        input.provider,
        input.providerResourceId,
        input.hostname,
        input.ipAddress,
        input.operatingSystem,
        specsJson,
        input.location,
        input.rentalCostMonthly,
        input.assignedCustomerId || null,
        deploymentStatus,
      ]
    );

    this.audit.log({
      actorId: actor.id,
      actorUsername: actor.username,
      action: 'SERVER_CREATE',
      targetType: 'SERVER',
      targetId: id,
      ipAddress: actor.ip,
      result: 'SUCCESS',
      details: { hostname: input.hostname, provider: input.provider },
    });

    return this.getServerById(id)!;
  }

  updateServer(
    id: string,
    updates: Partial<CreateServerInput> & {
      deploymentStatus?: string;
      monitoringStatus?: string;
      agentId?: string | null;
      isArchived?: boolean;
    },
    actor: { id: string; username: string; ip: string }
  ): ServerRecord {
    const existing = this.getServerById(id);
    if (!existing) throw new Error('Server not found');

    const fields: string[] = ['updated_at = datetime(\'now\')'];
    const params: any[] = [];

    if (updates.hostname !== undefined) {
      fields.push('hostname = ?');
      params.push(updates.hostname);
    }
    if (updates.ipAddress !== undefined) {
      fields.push('ip_address = ?');
      params.push(updates.ipAddress);
    }
    if (updates.operatingSystem !== undefined) {
      fields.push('operating_system = ?');
      params.push(updates.operatingSystem);
    }
    if (updates.specs !== undefined) {
      fields.push('specs_json = ?');
      params.push(JSON.stringify(updates.specs));
    }
    if (updates.location !== undefined) {
      fields.push('location = ?');
      params.push(updates.location);
    }
    if (updates.rentalCostMonthly !== undefined) {
      fields.push('rental_cost_monthly = ?');
      params.push(updates.rentalCostMonthly);
    }
    if (updates.assignedCustomerId !== undefined) {
      fields.push('assigned_customer_id = ?');
      params.push(updates.assignedCustomerId);
      fields.push('deployment_status = ?');
      params.push(updates.assignedCustomerId ? 'assigned' : 'unassigned');
    }
    if (updates.deploymentStatus !== undefined) {
      fields.push('deployment_status = ?');
      params.push(updates.deploymentStatus);
    }
    if (updates.monitoringStatus !== undefined) {
      fields.push('monitoring_status = ?');
      params.push(updates.monitoringStatus);
    }
    if (updates.agentId !== undefined) {
      fields.push('agent_id = ?');
      params.push(updates.agentId);
    }
    if (updates.isArchived !== undefined) {
      fields.push('is_archived = ?');
      params.push(updates.isArchived ? 1 : 0);
    }

    params.push(id);
    this.db.run(`UPDATE servers SET ${fields.join(', ')} WHERE id = ?`, params);

    this.audit.log({
      actorId: actor.id,
      actorUsername: actor.username,
      action: 'SERVER_UPDATE',
      targetType: 'SERVER',
      targetId: id,
      ipAddress: actor.ip,
      result: 'SUCCESS',
      details: updates,
    });

    return this.getServerById(id)!;
  }

  archiveServer(id: string, actor: { id: string; username: string; ip: string }): void {
    const existing = this.getServerById(id);
    if (!existing) throw new Error('Server not found');

    this.db.run(`UPDATE servers SET is_archived = 1, updated_at = datetime('now') WHERE id = ?`, [id]);

    this.audit.log({
      actorId: actor.id,
      actorUsername: actor.username,
      action: 'SERVER_ARCHIVE',
      targetType: 'SERVER',
      targetId: id,
      ipAddress: actor.ip,
      result: 'SUCCESS',
    });
  }

  private mapServerRow(row: any): ServerRecord {
    return {
      id: row.id,
      provider: row.provider,
      providerResourceId: row.provider_resource_id,
      hostname: row.hostname,
      ipAddress: row.ip_address,
      operatingSystem: row.operating_system,
      specs: JSON.parse(row.specs_json),
      location: row.location,
      rentalCostMonthly: Number(row.rental_cost_monthly),
      assignedCustomerId: row.assigned_customer_id,
      deploymentStatus: row.deployment_status,
      provisioningStatus: row.provisioning_status,
      monitoringStatus: row.monitoring_status,
      agentId: row.agent_id,
      isArchived: Boolean(row.is_archived),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
