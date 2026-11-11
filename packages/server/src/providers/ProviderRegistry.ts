import { IProviderAdapter } from './IProviderAdapter.js';
import { EquinixMetalProviderAdapter } from './EquinixMetalProviderAdapter.js';
import { HetznerProviderAdapter } from './HetznerProviderAdapter.js';
import { AwsProviderAdapter } from './AwsProviderAdapter.js';
import { OvhCloudProviderAdapter } from './OvhCloudProviderAdapter.js';
import { ProviderType } from '@tcc/shared';

export class ProviderRegistry {
  private adapters = new Map<ProviderType, IProviderAdapter>();

  constructor() {
    this.register(
      new EquinixMetalProviderAdapter({
        apiKey: process.env.EQUINIX_METAL_API_KEY || 'default-eqx-token',
        projectId: process.env.EQUINIX_METAL_PROJECT_ID || 'default-eqx-project',
      })
    );
    this.register(
      new HetznerProviderAdapter({
        apiToken: process.env.HETZNER_API_TOKEN || 'default-hetzner-token',
      })
    );
    this.register(
      new AwsProviderAdapter({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'default-aws-access-key',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'default-aws-secret-key',
      })
    );
    this.register(
      new OvhCloudProviderAdapter({
        applicationKey: process.env.OVH_APPLICATION_KEY || 'default-ovh-app-key',
        applicationSecret: process.env.OVH_APPLICATION_SECRET || 'default-ovh-app-secret',
        consumerKey: process.env.OVH_CONSUMER_KEY || 'default-ovh-consumer-key',
      })
    );
  }

  register(adapter: IProviderAdapter): void {
    this.adapters.set(adapter.providerType, adapter);
  }

  getAdapter(type: ProviderType): IProviderAdapter {
    const adapter = this.adapters.get(type);
    if (!adapter) {
      throw new Error(`Unsupported or unconfigured infrastructure provider: ${type}`);
    }
    return adapter;
  }

  listAdapters(): { providerType: ProviderType; name: string }[] {
    return Array.from(this.adapters.values()).map((a) => ({
      providerType: a.providerType,
      name: a.name,
    }));
  }
}
