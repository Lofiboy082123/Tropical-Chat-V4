import { ProviderType, ServerHardwareSpecs } from '@tcc/shared';

export interface ProviderResourcePlan {
  id: string;
  name: string;
  specs: ServerHardwareSpecs;
  locations: string[];
  hourlyCostUsd: number;
  monthlyCostUsd: number;
}

export interface ProvisionServerRequest {
  hostname: string;
  planId: string;
  location: string;
  operatingSystem: string;
  sshKeys?: string[];
  userData?: string;
  tags?: Record<string, string>;
}

export interface ProvisionServerResponse {
  providerResourceId: string;
  hostname: string;
  ipAddress: string;
  operatingSystem: string;
  specs: ServerHardwareSpecs;
  location: string;
  rentalCostMonthly: number;
  status: 'active' | 'provisioning' | 'failed';
}

export interface IProviderAdapter {
  readonly providerType: ProviderType;
  readonly name: string;

  validateCredentials(credentials: Record<string, any>): Promise<{ valid: boolean; message?: string }>;
  listAvailablePlans(): Promise<ProviderResourcePlan[]>;
  provisionServer(req: ProvisionServerRequest): Promise<ProvisionServerResponse>;
  getServerStatus(providerResourceId: string): Promise<{ status: string; ipAddress?: string }>;
  terminateServer(providerResourceId: string): Promise<boolean>;
}
