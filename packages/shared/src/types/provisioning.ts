export type ProvisioningJobState =
  | 'QUEUED'
  | 'VALIDATING_CREDENTIALS'
  | 'IDENTIFYING_RESOURCES'
  | 'CREATING_RESOURCE'
  | 'CONFIGURING_OS'
  | 'INSTALLING_COMPONENTS'
  | 'DEPLOYING_AGENT'
  | 'REGISTERING_TCC'
  | 'VERIFYING_HEALTH'
  | 'COMPLETED'
  | 'FAILED'
  | 'ROLLED_BACK';

export interface ProvisioningJobLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  stage: ProvisioningJobState;
  message: string;
}

export interface ProvisioningJob {
  id: string;
  serverId?: string;
  customerId: string;
  provider: string;
  targetHostname: string;
  targetOs: string;
  planId: string;
  location: string;
  state: ProvisioningJobState;
  progressPercent: number;
  retries: number;
  maxRetries: number;
  errorMessage?: string;
  logs: ProvisioningJobLog[];
  initiatedByUserId: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
