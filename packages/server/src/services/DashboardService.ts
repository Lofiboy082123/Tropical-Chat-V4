import { IDatabaseDriver } from '../db/driver.js';
import { DashboardMetrics, InfrastructureUtilization, BusinessFinancialMetrics } from '@tcc/shared';

export class DashboardService {
  constructor(private db: IDatabaseDriver) {}

  getMetrics(): DashboardMetrics {
    const totalServersRow = this.db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM servers WHERE is_archived = 0`
    );
    const onlineServersRow = this.db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM servers WHERE is_archived = 0 AND monitoring_status = 'online'`
    );
    const offlineServersRow = this.db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM servers WHERE is_archived = 0 AND monitoring_status = 'offline'`
    );
    const unknownServersRow = this.db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM servers WHERE is_archived = 0 AND monitoring_status = 'unknown'`
    );

    const totalAgentsRow = this.db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM agents WHERE is_revoked = 0`
    );
    const onlineAgentsRow = this.db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM agents WHERE is_revoked = 0 AND status = 'ONLINE'`
    );
    const offlineAgentsRow = this.db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM agents WHERE is_revoked = 0 AND status = 'OFFLINE'`
    );
    const unknownAgentsRow = this.db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM agents WHERE is_revoked = 0 AND status = 'UNKNOWN'`
    );

    const activeCustomersRow = this.db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM customers WHERE status = 'active'`
    );

    const activeDeploymentsRow = this.db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM servers WHERE is_archived = 0 AND deployment_status = 'assigned' AND assigned_customer_id IS NOT NULL`
    );

    const activeProvisioningRow = this.db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM provisioning_jobs WHERE state NOT IN ('COMPLETED', 'FAILED', 'ROLLED_BACK')`
    );

    const failedProvisioningRow = this.db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM provisioning_jobs WHERE state = 'FAILED'`
    );

    const openIncidentsRow = this.db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM incidents WHERE status IN ('OPEN', 'INVESTIGATING')`
    );

    const recentActivityRow = this.db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM audit_logs WHERE timestamp >= datetime('now', '-1 day')`
    );

    // Business Financial Metrics (Strictly computed from actual active contracts and server rental costs)
    const activeContracts = this.db.query<{ monthly_value_usd: number; renewal_date: string }>(
      `SELECT monthly_value_usd, renewal_date FROM contracts WHERE status = 'ACTIVE'`
    );

    const activeServers = this.db.query<{ rental_cost_monthly: number }>(
      `SELECT rental_cost_monthly FROM servers WHERE is_archived = 0`
    );

    const mrr = activeContracts.reduce((sum, c) => sum + (Number(c.monthly_value_usd) || 0), 0);
    const totalInfraCost = activeServers.reduce((sum, s) => sum + (Number(s.rental_cost_monthly) || 0), 0);
    const grossMarginUsd = mrr - totalInfraCost;
    const grossMarginPercent = mrr > 0 ? Math.round(((mrr - totalInfraCost) / mrr) * 1000) / 10 : null;

    // Expiring within 30 days
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    const in30DaysIso = in30Days.toISOString().split('T')[0];
    const expiringContractsCount = activeContracts.filter((c) => c.renewal_date && c.renewal_date <= in30DaysIso).length;

    const financials: BusinessFinancialMetrics = {
      monthlyRecurringRevenueUsd: mrr,
      totalInfrastructureExpenditureUsd: totalInfraCost,
      estimatedMonthlyGrossMarginUsd: grossMarginUsd,
      grossMarginPercent,
      activeContractsCount: activeContracts.length,
      expiringContractsCount,
    };

    // Infrastructure Utilization (computed across reporting online agents)
    const reportingAgents = this.db.query<{ latest_telemetry_json: string }>(
      `SELECT latest_telemetry_json FROM agents WHERE is_revoked = 0 AND status = 'ONLINE' AND latest_telemetry_json IS NOT NULL`
    );

    let sumCpu = 0;
    let sumMemPercent = 0;
    let sumStoragePercent = 0;
    let totalRx = 0;
    let totalTx = 0;
    const count = reportingAgents.length;

    for (const r of reportingAgents) {
      try {
        const t = JSON.parse(r.latest_telemetry_json);
        sumCpu += t.cpuUsagePercent || 0;
        if (t.memoryTotalMb > 0) {
          sumMemPercent += (t.memoryUsedMb / t.memoryTotalMb) * 100;
        }
        if (t.storageTotalGb > 0) {
          sumStoragePercent += (t.storageUsedGb / t.storageTotalGb) * 100;
        }
        totalRx += t.networkRxBytesPerSec || 0;
        totalTx += t.networkTxBytesPerSec || 0;
      } catch (e) {}
    }

    const utilization: InfrastructureUtilization = {
      averageCpuPercent: count > 0 ? Math.round((sumCpu / count) * 10) / 10 : null,
      averageMemoryPercent: count > 0 ? Math.round((sumMemPercent / count) * 10) / 10 : null,
      averageStoragePercent: count > 0 ? Math.round((sumStoragePercent / count) * 10) / 10 : null,
      totalBandwidthRxBytesSec: totalRx,
      totalBandwidthTxBytesSec: totalTx,
      reportingAgentsCount: count,
    };

    let systemHealth: 'OPTIMAL' | 'DEGRADED' | 'CRITICAL' = 'OPTIMAL';
    if ((openIncidentsRow?.count || 0) > 0 || (offlineServersRow?.count || 0) > 0) {
      systemHealth = 'DEGRADED';
    }
    const criticalIncidents = this.db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM incidents WHERE status IN ('OPEN', 'INVESTIGATING') AND severity = 'CRITICAL'`
    );
    if ((criticalIncidents?.count || 0) > 0) {
      systemHealth = 'CRITICAL';
    }

    return {
      totalManagedServers: totalServersRow?.count || 0,
      onlineServers: onlineServersRow?.count || 0,
      offlineServers: offlineServersRow?.count || 0,
      unknownServers: unknownServersRow?.count || 0,

      totalRegisteredAgents: totalAgentsRow?.count || 0,
      onlineAgents: onlineAgentsRow?.count || 0,
      offlineAgents: offlineAgentsRow?.count || 0,
      unknownAgents: unknownAgentsRow?.count || 0,

      activeCustomers: activeCustomersRow?.count || 0,
      activeDeployments: activeDeploymentsRow?.count || 0,
      activeProvisioningJobs: activeProvisioningRow?.count || 0,
      failedProvisioningJobs: failedProvisioningRow?.count || 0,

      openIncidentsCount: openIncidentsRow?.count || 0,
      recentActivityCount: recentActivityRow?.count || 0,
      systemHealth,
      utilization,
      financials,
      timestamp: new Date().toISOString(),
    };
  }
}
