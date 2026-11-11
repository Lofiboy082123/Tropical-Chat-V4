import { IDatabaseDriver } from '../db/driver.js';
import { CustomerRecord, CustomerContact, ServiceTier, CustomerStatus } from '@tcc/shared';
import { v4 as uuidv4 } from 'uuid';
import { AuditService } from './AuditService.js';

export interface CreateCustomerInput {
  companyName: string;
  contact: CustomerContact;
  serviceTier: ServiceTier;
  activeServices?: string[];
  internalNotes?: string;
}

export class CustomerService {
  constructor(private db: IDatabaseDriver, private audit: AuditService) {}

  getAllCustomers(): CustomerRecord[] {
    const rows = this.db.query(`SELECT * FROM customers ORDER BY created_at DESC`);
    return rows.map((r) => this.mapCustomerRow(r));
  }

  getCustomerById(id: string): CustomerRecord | null {
    const row = this.db.get(`SELECT * FROM customers WHERE id = ?`, [id]);
    if (!row) return null;
    return this.mapCustomerRow(row);
  }

  createCustomer(input: CreateCustomerInput, actor: { id: string; username: string; ip: string }): CustomerRecord {
    const id = `cust-${uuidv4().substring(0, 8)}`;
    this.db.run(
      `INSERT INTO customers (id, company_name, contact_json, service_tier, status, active_services_json, internal_notes)
       VALUES (?, ?, ?, ?, 'active', ?, ?)`,
      [
        id,
        input.companyName,
        JSON.stringify(input.contact),
        input.serviceTier,
        JSON.stringify(input.activeServices || []),
        input.internalNotes || '',
      ]
    );

    this.audit.log({
      actorId: actor.id,
      actorUsername: actor.username,
      action: 'CUSTOMER_CREATE',
      targetType: 'CUSTOMER',
      targetId: id,
      ipAddress: actor.ip,
      result: 'SUCCESS',
      details: { companyName: input.companyName, tier: input.serviceTier },
    });

    return this.getCustomerById(id)!;
  }

  updateCustomer(
    id: string,
    updates: Partial<CreateCustomerInput> & { status?: CustomerStatus },
    actor: { id: string; username: string; ip: string }
  ): CustomerRecord {
    const existing = this.getCustomerById(id);
    if (!existing) throw new Error('Customer not found');

    const fields: string[] = ['updated_at = datetime(\'now\')'];
    const params: any[] = [];

    if (updates.companyName !== undefined) {
      fields.push('company_name = ?');
      params.push(updates.companyName);
    }
    if (updates.contact !== undefined) {
      fields.push('contact_json = ?');
      params.push(JSON.stringify(updates.contact));
    }
    if (updates.serviceTier !== undefined) {
      fields.push('service_tier = ?');
      params.push(updates.serviceTier);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      params.push(updates.status);
    }
    if (updates.activeServices !== undefined) {
      fields.push('active_services_json = ?');
      params.push(JSON.stringify(updates.activeServices));
    }
    if (updates.internalNotes !== undefined) {
      fields.push('internal_notes = ?');
      params.push(updates.internalNotes);
    }

    params.push(id);
    this.db.run(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`, params);

    this.audit.log({
      actorId: actor.id,
      actorUsername: actor.username,
      action: 'CUSTOMER_UPDATE',
      targetType: 'CUSTOMER',
      targetId: id,
      ipAddress: actor.ip,
      result: 'SUCCESS',
      details: updates,
    });

    return this.getCustomerById(id)!;
  }

  private mapCustomerRow(row: any): CustomerRecord {
    const serverRows = this.db.query<{ id: string }>(
      `SELECT id FROM servers WHERE assigned_customer_id = ? AND is_archived = 0`,
      [row.id]
    );

    return {
      id: row.id,
      companyName: row.company_name,
      contact: JSON.parse(row.contact_json),
      serviceTier: row.service_tier as ServiceTier,
      status: row.status as CustomerStatus,
      activeServices: JSON.parse(row.active_services_json || '[]'),
      assignedServerIds: serverRows.map((s) => s.id),
      internalNotes: row.internal_notes || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
