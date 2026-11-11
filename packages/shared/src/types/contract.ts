export type ContractStatus = 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'SUSPENDED';

export interface ContractRecord {
  id: string;
  customerId: string;
  title: string;
  status: ContractStatus;
  startDate: string;
  endDate: string;
  renewalDate: string;
  monthlyRecurringRevenueUsd: number;
  monthlyValueUsd?: number; // Backward compatibility alias
  setupChargeUsd: number;
  durationMonths: number;
  slaTier: 'Standard 99.9%' | 'Enterprise 99.99%' | 'Mission-Critical 99.999%';
  assignedServerIds: string[];
  assignedServiceKeys: string[];
  termsSummary: string;
  isAutoRenew: boolean;
  gracePeriodDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceEnforcementAction {
  id: string;
  contractId: string;
  customerId: string;
  actionType: 'DEFAULT_WARNING' | 'GRACE_PERIOD_NOTICE' | 'SUSPENSION' | 'REINSTATEMENT';
  authorizedByUserId: string;
  reason: string;
  gracePeriodEndsAt?: string;
  isExecuted: boolean;
  executedAt?: string;
  recoveredAt?: string;
  createdAt: string;
}
