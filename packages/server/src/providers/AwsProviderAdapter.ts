import { IProviderAdapter, ProviderResourcePlan, ProvisionServerRequest, ProvisionServerResponse } from './IProviderAdapter.js';
import { ProviderType } from '@tcc/shared';

export class AwsProviderAdapter implements IProviderAdapter {
  readonly providerType: ProviderType = 'aws';
  readonly name = 'Amazon Web Services (EC2 Dedicated & Metal)';

  private accessKeyId: string;
  private secretAccessKey: string;

  constructor(config: { accessKeyId: string; secretAccessKey: string }) {
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
  }

  async validateCredentials(credentials: Record<string, any>): Promise<{ valid: boolean; message?: string }> {
    const key = credentials.accessKeyId || credentials.apiKey || this.accessKeyId;
    if (!key || key.length < 5) {
      return { valid: false, message: 'Invalid AWS Access Key' };
    }
    return { valid: true };
  }

  async listAvailablePlans(): Promise<ProviderResourcePlan[]> {
    return [
      {
        id: 'c5.metal',
        name: 'AWS EC2 c5.metal Dedicated Compute Instance',
        specs: {
          cpu: 'Intel Xeon Platinum 8275CL 96-vCPU',
          cpuCores: 96,
          ramGb: 192,
          storageGb: 1000,
          storageType: 'NVMe',
          networkSpeedGbps: 25,
        },
        locations: ['us-east-1', 'us-west-2', 'eu-west-1'],
        hourlyCostUsd: 4.08,
        monthlyCostUsd: 2937,
      },
      {
        id: 'g5.12xlarge',
        name: 'AWS EC2 g5.12xlarge AI / GPU Acceleration Node',
        specs: {
          cpu: 'AMD EPYC 7R32 48-vCPU + 4x NVIDIA A10G (96GB VRAM)',
          cpuCores: 48,
          ramGb: 192,
          storageGb: 3840,
          storageType: 'NVMe',
          networkSpeedGbps: 50,
        },
        locations: ['us-east-1', 'us-west-2'],
        hourlyCostUsd: 5.67,
        monthlyCostUsd: 4082,
      },
    ];
  }

  async provisionServer(req: ProvisionServerRequest): Promise<ProvisionServerResponse> {
    const plans = await this.listAvailablePlans();
    const selectedPlan = plans.find((p) => p.id === req.planId) || plans[0];
    const providerResourceId = `i-0${Math.random().toString(36).substring(2, 10)}`;
    const ipLastOctet = Math.floor(Math.random() * 200) + 10;
    const ipAddress = `54.210.14.${ipLastOctet}`;

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
