export type RemoteCommandType =
  | 'GET_SERVICE_STATUS'
  | 'GET_DIAGNOSTICS'
  | 'RESTART_SERVICE'
  | 'SCHEDULE_MAINTENANCE'
  | 'UPGRADE_AGENT';

export type RemoteOperationStatus = 'PENDING' | 'DISPATCHED' | 'EXECUTING' | 'SUCCESS' | 'FAILED' | 'REJECTED';

export interface RemoteOperationRequest {
  id: string;
  agentId: string;
  serverId: string;
  commandType: RemoteCommandType;
  parameters: Record<string, any>;
  authorizedByUserId: string;
  isDisruptive: boolean;
  confirmationAcknowledged: boolean;
  status: RemoteOperationStatus;
  output?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}
