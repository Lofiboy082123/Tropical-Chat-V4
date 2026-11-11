import { IProviderAdapter, ProviderResourcePlan, ProvisionServerRequest, ProvisionServerResponse } from './IProviderAdapter.js';
import { ProviderType } from '@tcc/shared';

export class HetznerProviderAdapter implements IProviderAdapter {
  readonly providerType: ProviderType = 'hetzner';
  readonly name = 'Hetzner Dedicated Root Server';

  private apiToken: string;

  constructor(config: { apiToken: string }) {
    this.apiToken = config.apiToken;
  }

  async validateCredentials(credentials: Record<string, any>): Promise<{ valid: boolean; message?: string }> {
    if (!credentials.apiToken || credentials.apiToken.length < 10) {
      return { valid: false, message: 'Invalid Hetzner Robot / Cloud API token' };
    }
    return { valid: true };
  }

  async listAvailablePlans(): Promise<ProviderResourcePlan[]> {
    return [
      {
        id: 'ax102',
        name: 'Hetzner AX102 AMD Ryzen 9 7950X3D',
        specs: {
          cpu: 'AMD Ryzen 9 7950X3D 16-Core Processor',
          cpuCores: 16,
          ramGb: 128,
          storageGb: 3840,
          storageType: 'NVMe',
          networkSpeedGbps: 1,
        },
        locations: ['nbg1', 'fsn1', 'hel1'],
        hourlyCostUsd: 0.18,
        monthlyCostUsd: 120,
      },
    ];
  }

  async provisionServer(req: ProvisionServerRequest): Promise<ProvisionServerResponse> {
    const plans = await this.listAvailablePlans();
    const selectedPlan = plans.find((p) => p.id === req.planId) || plans[0];
    const providerResourceId = `hetzner-${Math.random().toString(36).substring(2, 9)}`;
    const ipLastOctet = Math.floor(Math.random() * 200) + 10;
    const ipAddress = `136.243.88.${ipLastOctet}`;

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
