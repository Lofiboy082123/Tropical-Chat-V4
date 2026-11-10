import { IDatabaseDriver } from '../db/driver.js';
import { ContractRecord, ContractStatus, ServiceEnforcementAction } from '@tcc/shared';
import { v4 as uuidv4 } from 'uuid';
import { AuditService } from './AuditService.js';

export interface CreateContractInput {
  customerId: string;
  title: string;
  startDate: string;
  endDate: string;
  renewalDate: string;
  monthlyValueUsd: number;
  assignedServiceKeys?: string[];
  termsSummary?: string;
  isAutoRenew?: boolean;
}

export class ContractService {
  constructor(private db: IDatabaseDriver, private audit: AuditService) {}

  getAllContracts(options?: { customerId?: string; status?: ContractStatus }): ContractRecord[] {
    let sql = `SELECT * FROM contracts WHERE 1=1`;
    const params: any[] = [];
    if (options?.customerId) {
      sql += ` AND customer_id = ?`;
      params.push(options.customerId);
    }
    if (options?.status) {
      sql += ` AND status = ?`;
      params.push(options.status);
    }
    sql += ` ORDER BY created_at DESC`;

    const rows = this.db.query(sql, params);
    return rows.map(this.mapContractRow);
  }

  getContractById(id: string): ContractRecord | null {
    const row = this.db.get(`SELECT * FROM contracts WHERE id = ?`, [id]);
    if (!row) return null;
    return this.mapContractRow(row);
  }

  createContract(input: CreateContractInput, actor: { id: string; username: string; ip: string }): ContractRecord {
    const id = `cnt-${uuidv4().substring(0, 8)}`;
    this.db.run(
      `INSERT INTO contracts (
        id, customer_id, title, status, start_date, end_date, renewal_date,
        monthly_value_usd, assigned_services_json, terms_summary, is_auto_renew
      ) VALUES (?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.customerId,
        input.title,
        input.startDate,
        input.endDate,
        input.renewalDate,
        input.monthlyValueUsd,
        JSON.stringify(input.assignedServiceKeys || []),
        input.termsSummary || '',
        input.isAutoRenew !== false ? 1 : 0,
      ]
    );

    this.audit.log({
      actorId: actor.id,
      actorUsername: actor.username,
      action: 'CONTRACT_CREATE',
      targetType: 'CONTRACT',
      targetId: id,
      ipAddress: actor.ip,
      result: 'SUCCESS',
      details: { customerId: input.customerId, title: input.title, value: input.monthlyValueUsd },
    });

    return this.getContractById(id)!;
  }

  identifyContractDefaults(): { contract: ContractRecord; defaultReason: string }[] {
    const now = new Date().toISOString();
    const rows = this.db.query<any>(
      `SELECT * FROM contracts WHERE status = 'ACTIVE' AND end_date < ?`,
      [now]
    );

    return rows.map((r) => ({
      contract: this.mapContractRow(r),
      defaultReason: `Contract term expired on ${r.end_date} without renewal confirmation`,
    }));
  }

  initiateEnforcementAction(input: {
    contractId: string;
    actionType: 'DEFAULT_WARNING' | 'GRACE_PERIOD_NOTICE' | 'SUSPENSION' | 'REINSTATEMENT';
    reason: string;
    gracePeriodDays?: number;
    actor: { id: string; username: string; ip: string };
  }): ServiceEnforcementAction {
    const contract = this.getContractById(input.contractId);
    if (!contract) throw new Error('Contract not found');

    const id = uuidv4();
    let gracePeriodEndsAt: string | undefined;

    if (input.actionType === 'GRACE_PERIOD_NOTICE' || input.actionType === 'SUSPENSION') {
      const days = input.gracePeriodDays || 7;
      const d = new Date();
      d.setDate(d.getDate() + days);
      gracePeriodEndsAt = d.toISOString();
    }

    let isExecuted = false;
    let executedAt: string | undefined;
    let newStatus: ContractStatus = contract.status;

    if (input.actionType === 'SUSPENSION') {
      newStatus = 'SUSPENDED';
      isExecuted = true;
      executedAt = new Date().toISOString();
      this.db.run(`UPDATE contracts SET status = 'SUSPENDED', updated_at = datetime('now') WHERE id = ?`, [contract.id]);
      this.db.run(`UPDATE customers SET status = 'suspended', updated_at = datetime('now') WHERE id = ?`, [contract.customerId]);
    } else if (input.actionType === 'REINSTATEMENT') {
      newStatus = 'ACTIVE';
      isExecuted = true;
      executedAt = new Date().toISOString();
      this.db.run(`UPDATE contracts SET status = 'ACTIVE', updated_at = datetime('now') WHERE id = ?`, [contract.id]);
      this.db.run(`UPDATE customers SET status = 'active', updated_at = datetime('now') WHERE id = ?`, [contract.customerId]);
    }

    this.db.run(
      `INSERT INTO enforcement_actions (
        id, contract_id, customer_id, action_type, authorized_by_user_id,
        reason, grace_period_ends_at, is_executed, executed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        contract.id,
        contract.customerId,
        input.actionType,
        input.actor.id,
        input.reason,
        gracePeriodEndsAt || null,
        isExecuted ? 1 : 0,
        executedAt || null,
      ]
    );

    this.audit.log({
      actorId: input.actor.id,
      actorUsername: input.actor.username,
      action: `CONTRACT_ENFORCEMENT_${input.actionType}`,
      targetType: 'CONTRACT',
      targetId: contract.id,
      ipAddress: input.actor.ip,
      result: 'SUCCESS',
      details: {
        reason: input.reason,
        actionType: input.actionType,
        gracePeriodEndsAt,
        customerId: contract.customerId,
      },
    });

    return {
      id,
      contractId: contract.id,
      customerId: contract.customerId,
      actionType: input.actionType,
      authorizedByUserId: input.actor.id,
      reason: input.reason,
      gracePeriodEndsAt,
      isExecuted,
      executedAt,
      createdAt: new Date().toISOString(),
    };
  }

  private mapContractRow(row: any): ContractRecord {
    return {
      id: row.id,
      customerId: row.customer_id,
      title: row.title,
      status: row.status as ContractStatus,
      startDate: row.start_date,
      endDate: row.end_date,
      renewalDate: row.renewal_date,
      monthlyValueUsd: Number(row.monthly_value_usd),
      assignedServiceKeys: JSON.parse(row.assigned_services_json || '[]'),
      termsSummary: row.terms_summary || '',
      isAutoRenew: Boolean(row.is_auto_renew),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
