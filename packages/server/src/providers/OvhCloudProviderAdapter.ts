import { IProviderAdapter, ProviderResourcePlan, ProvisionServerRequest, ProvisionServerResponse } from './IProviderAdapter.js';
import { ProviderType } from '@tcc/shared';

export class OvhCloudProviderAdapter implements IProviderAdapter {
  readonly providerType: ProviderType = 'ovhcloud';
  readonly name = 'OVHcloud Dedicated Bare Metal Infrastructure';

  private applicationKey: string;
  private applicationSecret: string;
  private consumerKey: string;

  constructor(config: { applicationKey: string; applicationSecret: string; consumerKey: string }) {
    this.applicationKey = config.applicationKey;
    this.applicationSecret = config.applicationSecret;
    this.consumerKey = config.consumerKey;
  }

  async validateCredentials(credentials: Record<string, any>): Promise<{ valid: boolean; message?: string }> {
    const appKey = credentials.applicationKey || credentials.apiKey || this.applicationKey;
    if (!appKey || appKey.length < 5) {
      return { valid: false, message: 'Invalid OVHcloud API Application Key' };
    }
    return { valid: true };
  }

  async listAvailablePlans(): Promise<ProviderResourcePlan[]> {
    return [
      {
        id: 'scale-a1',
        name: 'OVHcloud Scale-A1 AMD EPYC 7763 Dedicated Server',
        specs: {
          cpuManufacturer: 'AMD',
          cpuModel: 'AMD EPYC 7763 64-Core Processor',
          cpuCores: 64,
          ramGb: 256,
          storageGb: 3840,
          storageType: 'NVMe',
          networkSpeedGbps: 10,
        },
        locations: ['bhs', 'gra', 'sbg', 'rbx', 'fra'],
        hourlyCostUsd: 2.10,
        monthlyCostUsd: 1260,
      },
      {
        id: 'advance-3',
        name: 'OVHcloud Advance-3 Intel Xeon-E 2388G',
        specs: {
          cpuManufacturer: 'Intel',
          cpuModel: 'Intel Xeon-E 2388G 8-Core Processor',
          cpuCores: 8,
          ramGb: 64,
          storageGb: 1920,
          storageType: 'NVMe',
          networkSpeedGbps: 1,
        },
        locations: ['bhs', 'gra', 'rbx'],
        hourlyCostUsd: 0.45,
        monthlyCostUsd: 270,
      },
    ];
  }

  async provisionServer(req: ProvisionServerRequest): Promise<ProvisionServerResponse> {
    const plans = await this.listAvailablePlans();
    const selectedPlan = plans.find((p) => p.id === req.planId) || plans[0];
    const providerResourceId = `ns${Math.floor(Math.random() * 900000 + 100000)}.ovh.net`;
    const ipLastOctet = Math.floor(Math.random() * 200) + 10;
    const ipAddress = `198.245.52.${ipLastOctet}`;

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
