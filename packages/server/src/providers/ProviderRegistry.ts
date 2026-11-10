import { IProviderAdapter } from './IProviderAdapter.js';
import { EquinixMetalProviderAdapter } from './EquinixMetalProviderAdapter.js';
import { HetznerProviderAdapter } from './HetznerProviderAdapter.js';
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
