export interface InfrastructureUtilization {
  averageCpuPercent: number | null;
  averageMemoryPercent: number | null;
  averageStoragePercent: number | null;
  totalBandwidthRxBytesSec: number;
  totalBandwidthTxBytesSec: number;
  reportingAgentsCount: number;
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

  openIncidentsCount: number;
  recentActivityCount: number;
  systemHealth: 'OPTIMAL' | 'DEGRADED' | 'CRITICAL';
  utilization: InfrastructureUtilization;
  timestamp: string;
}
