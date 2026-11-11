export interface InfrastructureUtilization {
  averageCpuPercent: number | null;
  averageMemoryPercent: number | null;
  averageStoragePercent: number | null;
  totalBandwidthRxBytesSec: number;
  totalBandwidthTxBytesSec: number;
  reportingAgentsCount: number;
}

export interface BusinessFinancialMetrics {
  monthlyRecurringRevenueUsd: number; // Sum of active customer contracts
  totalInfrastructureExpenditureUsd: number; // Sum of active server rental costs
  estimatedMonthlyGrossMarginUsd: number; // MRR - Infra Expenditure
  grossMarginPercent: number | null; // ((MRR - Costs) / MRR) * 100
  activeContractsCount: number;
  expiringContractsCount: number; // Expiring within 30 days
}

export interface DashboardMetrics {
  totalManagedServers: number;
  onlineServers: number;
  offlineServers: number;
  unknownServers: number;

  totalRegisteredAgents: number;
  onlineAgents: number;
  offlineAgents: number;
  unknownAgents: number;

  activeCustomers: number;
  activeDeployments: number;
  activeProvisioningJobs: number;
  failedProvisioningJobs: number;

  openIncidentsCount: number;
  recentActivityCount: number;
  systemHealth: 'OPTIMAL' | 'DEGRADED' | 'CRITICAL';
  utilization: InfrastructureUtilization;
  financials: BusinessFinancialMetrics;
  timestamp: string;
}
