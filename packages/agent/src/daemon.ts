import { SystemCollector } from './collector.js';
import { AgentHeartbeatPayload } from '@tcc/shared';

export interface AgentDaemonConfig {
  serverUrl: string;
  enrollmentToken?: string;
  agentId?: string;
  authToken?: string;
  version?: string;
  heartbeatIntervalSeconds?: number;
}

export class TropicalAgentDaemon {
  private config: AgentDaemonConfig;
  private isRunning = false;
  private timer: any = null;
  public agentVersion = '1.0.0';

  constructor(config: AgentDaemonConfig) {
    this.config = {
      version: '1.0.0',
      heartbeatIntervalSeconds: 30,
      ...config,
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    if (!this.config.authToken && this.config.enrollmentToken) {
      await this.enroll();
    }

    if (!this.config.agentId || !this.config.authToken) {
      console.error('[TropicalAgent] Agent cannot start: missing credentials or enrollment token');
      return;
    }

    const intervalMs = (this.config.heartbeatIntervalSeconds || 30) * 1000;
    this.sendHeartbeat();
    this.timer = setInterval(() => this.sendHeartbeat(), intervalMs);
    if (this.timer.unref) this.timer.unref();
  }

  stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async enroll(): Promise<void> {
    try {
      const res = await fetch(`${this.config.serverUrl}/api/v1/agent/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollmentToken: this.config.enrollmentToken,
          hostname: SystemCollector.getOsInfo().hostname,
          osInfo: SystemCollector.getOsInfo(),
          agentVersion: this.agentVersion,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(`Enrollment failed: ${JSON.stringify(err)}`);
      }

      const data = (await res.json()) as any;
      this.config.agentId = data.agentId;
      this.config.authToken = data.authToken;
      if (data.heartbeatIntervalSeconds) {
        this.config.heartbeatIntervalSeconds = data.heartbeatIntervalSeconds;
      }
    } catch (err: any) {
      console.error(`[TropicalAgent] Enrollment error: ${err.message}`);
    }
  }

  async sendHeartbeat(): Promise<boolean> {
    if (!this.config.agentId || !this.config.authToken) return false;

    const osInfo = SystemCollector.getOsInfo();
    const telemetry = SystemCollector.getTelemetry();

    const payload: AgentHeartbeatPayload = {
      agentId: this.config.agentId,
      version: this.agentVersion,
      timestamp: new Date().toISOString(),
      osInfo,
      telemetry,
    };

    try {
      const res = await fetch(`${this.config.serverUrl}/api/v1/agent/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.authToken}`,
        },
        body: JSON.stringify(payload),
      });

      return res.ok;
    } catch (err: any) {
      return false;
    }
  }

  upgradeVersion(newVersion: string): boolean {
    const oldVersion = this.agentVersion;
    try {
      this.agentVersion = newVersion;
      return true;
    } catch (err) {
      this.agentVersion = oldVersion;
      return false;
    }
  }
}
