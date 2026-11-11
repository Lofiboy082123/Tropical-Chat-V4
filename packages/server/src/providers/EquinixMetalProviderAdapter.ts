import { IProviderAdapter, ProviderResourcePlan, ProvisionServerRequest, ProvisionServerResponse } from './IProviderAdapter.js';
import { ProviderType } from '@tcc/shared';

export class EquinixMetalProviderAdapter implements IProviderAdapter {
  readonly providerType: ProviderType = 'equinix_metal';
  readonly name = 'Equinix Metal Bare Metal Cloud';

  private apiKey: string;
  private projectId: string;

  constructor(config: { apiKey: string; projectId: string }) {
    this.apiKey = config.apiKey;
    this.projectId = config.projectId;
  }

  async validateCredentials(credentials: Record<string, any>): Promise<{ valid: boolean; message?: string }> {
    if (!credentials.apiKey || credentials.apiKey.length < 10) {
      return { valid: false, message: 'Invalid Equinix Metal API token' };
    }
    return { valid: true };
  }

  async listAvailablePlans(): Promise<ProviderResourcePlan[]> {
    return [
      {
        id: 'c3.medium.x86',
        name: 'Equinix Metal c3.medium.x86 Compute Server',
        specs: {
          cpu: 'AMD EPYC 7443P 24-Core Processor',
          cpuCores: 24,
          ramGb: 64,
          storageGb: 960,
          storageType: 'NVMe',
          networkSpeedGbps: 20,
        },
        locations: ['da', 'ny', 'sv', 'fr', 'ty'],
        hourlyCostUsd: 1.25,
        monthlyCostUsd: 750,
      },
      {
        id: 'm3.large.x86',
        name: 'Equinix Metal m3.large.x86 High-Memory Server',
        specs: {
          cpu: 'AMD EPYC 7513 32-Core Processor',
          cpuCores: 32,
          ramGb: 256,
          storageGb: 3840,
          storageType: 'NVMe',
          networkSpeedGbps: 25,
        },
        locations: ['da', 'ny', 'sv', 'am'],
        hourlyCostUsd: 2.50,
        monthlyCostUsd: 1500,
      },
    ];
  }

  async provisionServer(req: ProvisionServerRequest): Promise<ProvisionServerResponse> {
    const plans = await this.listAvailablePlans();
    const selectedPlan = plans.find((p) => p.id === req.planId) || plans[0];
    const providerResourceId = `eqx-${Math.random().toString(36).substring(2, 9)}`;
    const ipLastOctet = Math.floor(Math.random() * 200) + 10;
    const ipAddress = `147.75.105.${ipLastOctet}`;

    return {
      providerResourceId,
      hostname: req.hostname,
      ipAddress,
      operatingSystem: req.operatingSystem,
      specs: selectedPlan.specs,
      location: req.location,
      rentalCostMonthly: selectedPlan.monthlyCostUsd,
      status: 'active',
    };
  }

  async getServerStatus(providerResourceId: string): Promise<{ status: string; ipAddress?: string }> {
    return { status: 'active' };
  }

  async terminateServer(providerResourceId: string): Promise<boolean> {
    return true;
  }
}
