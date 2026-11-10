export type ContractStatus = 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'SUSPENDED';

export interface ContractRecord {
  id: string;
  customerId: string;
  title: string;
  status: ContractStatus;
  startDate: string;
  endDate: string;
  renewalDate: string;
  monthlyValueUsd: number;
  assignedServiceKeys: string[];
  termsSummary: string;
  isAutoRenew: boolean;
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
