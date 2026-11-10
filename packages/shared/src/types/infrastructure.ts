export type ProviderType = 'equinix_metal' | 'aws' | 'hetzner' | 'custom_api';

export type ServerDeploymentStatus = 'unassigned' | 'assigned' | 'maintenance' | 'decommissioned';
export type ServerProvisioningStatus = 'unprovisioned' | 'provisioning' | 'provisioned' | 'failed';
export type ServerMonitoringStatus = 'online' | 'offline' | 'unknown';

export interface ServerHardwareSpecs {
  cpu: string;
  cpuCores: number;
  ramGb: number;
  storageGb: number;
  storageType: 'NVMe' | 'SSD' | 'HDD' | 'SAN';
  networkSpeedGbps: number;
}

export interface ServerRecord {
  id: string;
  provider: ProviderType;
  providerResourceId: string;
  hostname: string;
  ipAddress: string;
  operatingSystem: string;
  specs: ServerHardwareSpecs;
  location: string;
  rentalCostMonthly: number;
  assignedCustomerId: string | null;
  deploymentStatus: ServerDeploymentStatus;
  provisioningStatus: ServerProvisioningStatus;
  monitoringStatus: ServerMonitoringStatus;
  agentId: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderAccount {
  id: string;
  provider: ProviderType;
  name: string;
  apiUrl: string;
  apiKeyMasked: string;
  isActive: boolean;
  createdAt: string;
}
