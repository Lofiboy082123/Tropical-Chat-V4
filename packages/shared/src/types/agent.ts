export type AgentStatus = 'ONLINE' | 'OFFLINE' | 'UNKNOWN';

export interface AgentHardwareTelemetry {
  cpuUsagePercent: number;
  memoryUsedMb: number;
  memoryTotalMb: number;
  storageUsedGb: number;
  storageTotalGb: number;
  networkRxBytesPerSec: number;
  networkTxBytesPerSec: number;
  uptimeSeconds: number;
}

export interface AgentHeartbeatPayload {
  agentId: string;
  version: string;
  timestamp: string;
  osInfo: {
    platform: string;
    release: string;
    arch: string;
    hostname: string;
  };
  telemetry: AgentHardwareTelemetry;
}

export interface AgentRegistrationPayload {
  enrollmentToken: string;
  hostname: string;
  osInfo: {
    platform: string;
    release: string;
    arch: string;
  };
  agentVersion: string;
}

export interface AgentRegistrationResponse {
  agentId: string;
  authToken: string;
  heartbeatIntervalSeconds: number;
  heartbeatTimeoutSeconds: number;
}

export interface AgentRecord {
  id: string;
  serverId: string;
  customerId: string;
  version: string;
  status: AgentStatus;
  osPlatform: string;
  osRelease: string;
  hostname: string;
  lastHeartbeatAt: string | null;
  heartbeatDeadlineSeconds: number;
  latestTelemetry?: AgentHardwareTelemetry | null;
  isRevoked: boolean;
  enrollmentToken?: string | null;
  createdAt: string;
  updatedAt: string;
}
