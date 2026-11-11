export type ServiceTier = 'Standard' | 'Enterprise' | 'Mission-Critical Dedicated' | 'AI High-Performance';
export type CustomerStatus = 'active' | 'pending' | 'suspended' | 'archived';

export interface CustomerContact {
  primaryName: string;
  email: string;
  phone: string;
  emergencyContact?: string;
}

export interface CustomerRecord {
  id: string;
  companyName: string;
  contact: CustomerContact;
  serviceTier: ServiceTier;
  status: CustomerStatus;
  activeServices: string[];
  assignedServerIds: string[];
  internalNotes: string;
  createdAt: string;
  updatedAt: string;
}
