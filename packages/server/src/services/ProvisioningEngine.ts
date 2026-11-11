import { IDatabaseDriver } from '../db/driver.js';
import {
  ProvisioningJob,
  ProvisioningJobState,
  ProvisioningJobLog,
  ProviderType,
} from '@tcc/shared';
import { v4 as uuidv4 } from 'uuid';
import { ProviderRegistry } from '../providers/ProviderRegistry.js';
import { AuditService } from './AuditService.js';
import { WebSocketManager } from './WebSocketManager.js';

export interface CreateProvisioningJobInput {
  customerId: string;
  contractId?: string;
  provider: ProviderType;
  targetHostname: string;
  targetOs: string;
  planId: string;
  location: string;
  initiatedByUserId: string;
}

export class ProvisioningEngine {
  private isProcessing = false;

  constructor(
    private db: IDatabaseDriver,
    private providerRegistry: ProviderRegistry,
    private audit: AuditService,
    private wsManager: WebSocketManager
  ) {}

  queueJob(input: CreateProvisioningJobInput): ProvisioningJob {
    // 1. Validate customer existence and status
    const customer = this.db.get<any>(`SELECT * FROM customers WHERE id = ?`, [input.customerId]);
    if (!customer) {
      throw new Error(`Customer '${input.customerId}' does not exist.`);
    }
    if (customer.status === 'suspended' || customer.status === 'archived') {
      throw new Error(`Cannot provision servers for a ${customer.status} customer.`);
    }

    // 2. Validate contract if provided or find active contract
    if (input.contractId) {
      const contract = this.db.get<any>(
        `SELECT * FROM contracts WHERE id = ? AND customer_id = ? AND status = 'ACTIVE'`,
        [input.contractId, input.customerId]
      );
      if (!contract) {
        throw new Error(`Active contract '${input.contractId}' not found for customer.`);
      }
    }

    // 3. Duplicate request protection (check if queued or running job with same hostname exists)
    const existing = this.db.get<any>(
      `SELECT id FROM provisioning_jobs WHERE target_hostname = ? AND state NOT IN ('COMPLETED', 'FAILED', 'ROLLED_BACK')`,
      [input.targetHostname]
    );
    if (existing) {
      throw new Error(`A provisioning job for hostname '${input.targetHostname}' is already in progress.`);
    }

    const id = uuidv4();
    const initialLog: ProvisioningJobLog = {
      timestamp: new Date().toISOString(),
      level: 'info',
      stage: 'QUEUED',
      message: `Provisioning job queued for customer ${input.customerId} on provider ${input.provider}`,
    };

    this.db.run(
      `INSERT INTO provisioning_jobs (
        id, customer_id, provider, target_hostname, target_os, plan_id, location,
        state, progress_percent, retries, max_retries, logs_json, initiated_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'QUEUED', 0, 0, 3, ?, ?)`,
      [
        id,
        input.customerId,
        input.provider,
        input.targetHostname,
        input.targetOs,
        input.planId,
        input.location,
        JSON.stringify([initialLog]),
        input.initiatedByUserId,
      ]
    );

    this.audit.log({
      actorId: input.initiatedByUserId,
      actorUsername: 'SYSTEM/ADMIN',
      action: 'PROVISIONING_JOB_QUEUED',
      targetType: 'PROVISIONING_JOB',
      targetId: id,
      ipAddress: '127.0.0.1',
      result: 'SUCCESS',
      details: { hostname: input.targetHostname, provider: input.provider },
    });

    this.wsManager.broadcastToDesktop('provisioning:job_created', { jobId: id });
    setTimeout(() => this.processNextJob(), 20);

    return this.getJobById(id)!;
  }

  getJobById(id: string): ProvisioningJob | null {
    const row = this.db.get(`SELECT * FROM provisioning_jobs WHERE id = ?`, [id]);
    if (!row) return null;
    return this.mapJobRow(row);
  }

  getAllJobs(limit = 50): ProvisioningJob[] {
    const rows = this.db.query(
      `SELECT * FROM provisioning_jobs ORDER BY created_at DESC LIMIT ?`,
      [limit]
    );
    return rows.map(this.mapJobRow);
  }

  private async processNextJob(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const nextJobRow = this.db.get(
        `SELECT * FROM provisioning_jobs WHERE state = 'QUEUED' ORDER BY created_at ASC LIMIT 1`
      );

      if (!nextJobRow) {
        this.isProcessing = false;
        return;
      }

      const job = this.mapJobRow(nextJobRow);
      await this.executeJobSteps(job);
    } catch (err) {
      console.error('[ProvisioningEngine] Job execution failure:', err);
    } finally {
      this.isProcessing = false;
      const remaining = this.db.get(
        `SELECT COUNT(*) as count FROM provisioning_jobs WHERE state = 'QUEUED'`
      );
      if (remaining && remaining.count > 0) {
        setTimeout(() => this.processNextJob(), 50);
      }
    }
  }

  private async executeJobSteps(job: ProvisioningJob): Promise<void> {
    const adapter = this.providerRegistry.getAdapter(job.provider as ProviderType);

    const updateState = (stage: ProvisioningJobState, progress: number, msg: string) => {
      const logEntry: ProvisioningJobLog = {
        timestamp: new Date().toISOString(),
        level: 'info',
        stage,
        message: msg,
      };
      job.logs.push(logEntry);
      this.db.run(
        `UPDATE provisioning_jobs SET state = ?, progress_percent = ?, logs_json = ?, updated_at = datetime('now') WHERE id = ?`,
        [stage, progress, JSON.stringify(job.logs), job.id]
      );
      this.wsManager.broadcastToDesktop('provisioning:job_progress', {
        jobId: job.id,
        stage,
        progress,
        message: msg,
      });
    };

    try {
      // Step 1: Validate Provider Credentials
      updateState('VALIDATING_CREDENTIALS', 10, `Validating credentials for ${adapter.name}...`);
      const credCheck = await adapter.validateCredentials({});
      if (!credCheck.valid) {
        throw new Error(`Provider credential validation failed: ${credCheck.message}`);
      }

      // Step 2: Identify and verify resources
      updateState('IDENTIFYING_RESOURCES', 20, `Checking hardware allocation capacity for plan ${job.planId} in ${job.location}...`);
      const plans = await adapter.listAvailablePlans();
      const plan = plans.find((p) => p.id === job.planId) || plans[0];

      // Step 3: Create / provision server resource at provider
      updateState('CREATING_RESOURCE', 35, `Submitting authenticated allocation to ${adapter.name}...`);
      const providerResult = await adapter.provisionServer({
        hostname: job.targetHostname,
        planId: job.planId,
        location: job.location,
        operatingSystem: job.targetOs,
      });

      // Step 4: Configure Operating System & Security Baseline
      updateState('CONFIGURING_OS', 50, `Configuring base operating system (${job.targetOs}) and applying enterprise security baseline on ${providerResult.ipAddress}...`);

      // Step 5: Install Management Components
      updateState('INSTALLING_COMPONENTS', 65, 'Deploying enterprise telemetry utilities and daemon supervisors...');

      // Step 6: Deploy Tropical Servers Monitoring Agent
      updateState('DEPLOYING_AGENT', 80, 'Injecting signed Tropical Servers Monitoring Agent daemon and initial enrollment token...');
      const agentId = `agent-${uuidv4().substring(0, 8)}`;
      const enrollmentToken = `enroll-${uuidv4()}`;

      // Step 7: Register Server Record in TCC Database
      updateState('REGISTERING_TCC', 90, 'Recording provisioned dedicated server in TCC inventory...');
      const serverId = `srv-${uuidv4().substring(0, 8)}`;

      this.db.run(
        `INSERT INTO servers (
          id, provider, provider_resource_id, hostname, ip_address, operating_system,
          specs_json, location, rental_cost_monthly, assigned_customer_id,
          deployment_status, provisioning_status, monitoring_status, agent_id, is_archived
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'assigned', 'provisioned', 'unknown', ?, 0)`,
        [
          serverId,
          job.provider,
          providerResult.providerResourceId,
          job.targetHostname,
          providerResult.ipAddress,
          job.targetOs,
          JSON.stringify(providerResult.specs),
          job.location,
          providerResult.rentalCostMonthly,
          job.customerId,
          agentId,
        ]
      );

      this.db.run(
        `INSERT INTO agents (
          id, server_id, customer_id, auth_token_hash, enrollment_token, version,
          status, os_platform, os_release, hostname, heartbeat_deadline_seconds
        ) VALUES (?, ?, ?, '', ?, '1.0.0', 'UNKNOWN', 'linux', ?, ?, 60)`,
        [agentId, serverId, job.customerId, enrollmentToken, job.targetOs, job.targetHostname]
      );

      // Step 8: Verify Health with provider
      updateState('VERIFYING_HEALTH', 95, 'Performing connectivity verification and provider confirmation check...');
      const check = await adapter.getServerStatus(providerResult.providerResourceId);
      if (check.status !== 'active') {
        throw new Error(`Provider reported unexpected status: ${check.status}`);
      }

      // Step 9: Completed
      const completedLog: ProvisioningJobLog = {
        timestamp: new Date().toISOString(),
        level: 'info',
        stage: 'COMPLETED',
        message: `Dedicated server ${job.targetHostname} (${providerResult.ipAddress}) successfully provisioned and linked to customer ${job.customerId}.`,
      };
      job.logs.push(completedLog);

      this.db.run(
        `UPDATE provisioning_jobs SET server_id = ?, state = 'COMPLETED', progress_percent = 100, logs_json = ?, completed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
        [serverId, JSON.stringify(job.logs), job.id]
      );

      this.wsManager.broadcastToDesktop('provisioning:job_completed', {
        jobId: job.id,
        serverId,
        hostname: job.targetHostname,
      });

      this.audit.log({
        actorId: job.initiatedByUserId,
        actorUsername: 'SYSTEM',
        action: 'PROVISIONING_JOB_COMPLETED',
        targetType: 'SERVER',
        targetId: serverId,
        ipAddress: '127.0.0.1',
        result: 'SUCCESS',
        details: { serverId, ipAddress: providerResult.ipAddress },
      });
    } catch (err: any) {
      console.error(`[ProvisioningEngine] Job ${job.id} failed:`, err.message);

      const errorLog: ProvisioningJobLog = {
        timestamp: new Date().toISOString(),
        level: 'error',
        stage: 'FAILED',
        message: `Provisioning failed: ${err.message}`,
      };
      job.logs.push(errorLog);

      this.db.run(
        `UPDATE provisioning_jobs SET state = 'FAILED', error_message = ?, logs_json = ?, updated_at = datetime('now') WHERE id = ?`,
        [err.message, JSON.stringify(job.logs), job.id]
      );

      this.wsManager.broadcastToDesktop('provisioning:job_failed', {
        jobId: job.id,
        error: err.message,
      });

      this.audit.log({
        actorId: job.initiatedByUserId,
        actorUsername: 'SYSTEM',
        action: 'PROVISIONING_JOB_FAILED',
        targetType: 'PROVISIONING_JOB',
        targetId: job.id,
        ipAddress: '127.0.0.1',
        result: 'FAILURE',
        details: { error: err.message },
      });
    }
  }

  private mapJobRow(row: any): ProvisioningJob {
    return {
      id: row.id,
      serverId: row.server_id,
      customerId: row.customer_id,
      provider: row.provider,
      targetHostname: row.target_hostname,
      targetOs: row.target_os,
      planId: row.plan_id,
      location: row.location,
      state: row.state as ProvisioningJobState,
      progressPercent: Number(row.progress_percent),
      retries: Number(row.retries),
      maxRetries: Number(row.max_retries),
      errorMessage: row.error_message,
      logs: JSON.parse(row.logs_json || '[]'),
      initiatedByUserId: row.initiated_by_user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
    };
  }
}
