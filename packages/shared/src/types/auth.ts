export type RoleName =
  | 'Executive Operations Overseer'
  | 'Chief Executive Officer'
  | 'Global Operations Director'
  | 'Administrative Director'
  | 'Head of Correspondence'
  | 'Infrastructure Administrator'
  | 'Technical Support'
  | 'Read-only Auditor';

export type Permission =
  | 'DASHBOARD_VIEW'
  | 'INFRA_VIEW'
  | 'INFRA_MANAGE'
  | 'INFRA_PROVISION'
  | 'AGENT_VIEW'
  | 'AGENT_MANAGE'
  | 'AGENT_ENROLL'
  | 'CUSTOMER_VIEW'
  | 'CUSTOMER_MANAGE'
  | 'CONTRACT_VIEW'
  | 'CONTRACT_MANAGE'
  | 'CONTRACT_ENFORCE'
  | 'REMOTE_DIAGNOSTICS'
  | 'REMOTE_EXECUTE'
  | 'AUDIT_VIEW'
  | 'INCIDENT_MANAGE'
  | 'USER_MANAGE'
  | 'SETTINGS_MANAGE';

export interface User {
  id: string;
  username: string;
  email: string;
  roleId: string;
  roleName: RoleName;
  permissions: Permission[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface AuthSession {
  token: string;
  user: User;
  expiresAt: string;
}

export interface LoginHistoryRecord {
  id: string;
  userId?: string;
  username: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
  createdAt: string;
}
