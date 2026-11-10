export interface AuditLogEntry {
  id: string;
  correlationId: string;
  timestamp: string;
  actorId: string;
  actorUsername: string;
  action: string;
  targetType: string;
  targetId: string;
  ipAddress: string;
  result: 'SUCCESS' | 'FAILURE' | 'DENIED';
  details?: Record<string, any>;
}

export interface IncidentRecord {
  id: string;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'INVESTIGATING' | 'MITIGATED' | 'RESOLVED';
  affectedServerId?: string;
  affectedCustomerId?: string;
  description: string;
  reportedByUserId: string;
  createdAt: string;
  resolvedAt?: string;
}
