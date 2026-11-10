import { IDatabaseDriver } from './driver.js';
import bcrypt from 'bcryptjs';

export interface Migration {
  id: number;
  name: string;
  up: (db: IDatabaseDriver) => void;
}

export const migrations: Migration[] = [
  {
    id: 1,
    name: '001_initial_schema',
    up: (db: IDatabaseDriver) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS _migrations (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS roles (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          description TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS role_permissions (
          role_id TEXT NOT NULL,
          permission TEXT NOT NULL,
          PRIMARY KEY (role_id, permission),
          FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role_id TEXT NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          failed_login_attempts INTEGER NOT NULL DEFAULT 0,
          locked_until TEXT,
          last_login_at TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (role_id) REFERENCES roles(id)
        );
        CREATE TABLE IF NOT EXISTS login_history (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          username TEXT NOT NULL,
          ip_address TEXT NOT NULL,
          user_agent TEXT NOT NULL,
          success INTEGER NOT NULL,
          failure_reason TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS providers (
          id TEXT PRIMARY KEY,
          provider_type TEXT NOT NULL,
          name TEXT NOT NULL,
          api_url TEXT NOT NULL,
          api_key_encrypted TEXT NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS servers (
          id TEXT PRIMARY KEY,
          provider TEXT NOT NULL,
          provider_resource_id TEXT NOT NULL,
          hostname TEXT NOT NULL,
          ip_address TEXT NOT NULL,
          operating_system TEXT NOT NULL,
          specs_json TEXT NOT NULL,
          location TEXT NOT NULL,
          rental_cost_monthly REAL NOT NULL DEFAULT 0.0,
          assigned_customer_id TEXT,
          deployment_status TEXT NOT NULL DEFAULT 'unassigned',
          provisioning_status TEXT NOT NULL DEFAULT 'unprovisioned',
          monitoring_status TEXT NOT NULL DEFAULT 'unknown',
          agent_id TEXT,
          is_archived INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS customers (
          id TEXT PRIMARY KEY,
          company_name TEXT NOT NULL,
          contact_json TEXT NOT NULL,
          service_tier TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active',
          active_services_json TEXT NOT NULL DEFAULT '[]',
          internal_notes TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS contracts (
          id TEXT PRIMARY KEY,
          customer_id TEXT NOT NULL,
          title TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'ACTIVE',
          start_date TEXT NOT NULL,
          end_date TEXT NOT NULL,
          renewal_date TEXT NOT NULL,
          monthly_value_usd REAL NOT NULL DEFAULT 0.0,
          assigned_services_json TEXT NOT NULL DEFAULT '[]',
          terms_summary TEXT NOT NULL DEFAULT '',
          is_auto_renew INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS enforcement_actions (
          id TEXT PRIMARY KEY,
          contract_id TEXT NOT NULL,
          customer_id TEXT NOT NULL,
          action_type TEXT NOT NULL,
          authorized_by_user_id TEXT NOT NULL,
          reason TEXT NOT NULL,
          grace_period_ends_at TEXT,
          is_executed INTEGER NOT NULL DEFAULT 0,
          executed_at TEXT,
          recovered_at TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (contract_id) REFERENCES contracts(id),
          FOREIGN KEY (customer_id) REFERENCES customers(id)
        );
        CREATE TABLE IF NOT EXISTS agents (
          id TEXT PRIMARY KEY,
          server_id TEXT NOT NULL,
          customer_id TEXT NOT NULL,
          auth_token_hash TEXT NOT NULL,
          enrollment_token TEXT,
          version TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'UNKNOWN',
          os_platform TEXT NOT NULL,
          os_release TEXT NOT NULL,
          hostname TEXT NOT NULL,
          last_heartbeat_at TEXT,
          heartbeat_deadline_seconds INTEGER NOT NULL DEFAULT 60,
          latest_telemetry_json TEXT,
          is_revoked INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (server_id) REFERENCES servers(id)
        );
        CREATE TABLE IF NOT EXISTS agent_telemetry (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          cpu_usage_percent REAL NOT NULL,
          memory_used_mb REAL NOT NULL,
          memory_total_mb REAL NOT NULL,
          storage_used_gb REAL NOT NULL,
          storage_total_gb REAL NOT NULL,
          network_rx_bytes_sec REAL NOT NULL,
          network_tx_bytes_sec REAL NOT NULL,
          uptime_seconds REAL NOT NULL,
          FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_agent_telemetry_agent_time ON agent_telemetry(agent_id, timestamp);
        CREATE TABLE IF NOT EXISTS provisioning_jobs (
          id TEXT PRIMARY KEY,
          server_id TEXT,
          customer_id TEXT NOT NULL,
          provider TEXT NOT NULL,
          target_hostname TEXT NOT NULL,
          target_os TEXT NOT NULL,
          plan_id TEXT NOT NULL,
          location TEXT NOT NULL,
          state TEXT NOT NULL DEFAULT 'QUEUED',
          progress_percent INTEGER NOT NULL DEFAULT 0,
          retries INTEGER NOT NULL DEFAULT 0,
          max_retries INTEGER NOT NULL DEFAULT 3,
          error_message TEXT,
          logs_json TEXT NOT NULL DEFAULT '[]',
          initiated_by_user_id TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          completed_at TEXT
        );
        CREATE TABLE IF NOT EXISTS remote_operations (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          server_id TEXT NOT NULL,
          command_type TEXT NOT NULL,
          parameters_json TEXT NOT NULL DEFAULT '{}',
          authorized_by_user_id TEXT NOT NULL,
          is_disruptive INTEGER NOT NULL DEFAULT 0,
          confirmation_acknowledged INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'PENDING',
          output TEXT,
          error TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          completed_at TEXT
        );
        CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY,
          correlation_id TEXT NOT NULL,
          timestamp TEXT NOT NULL DEFAULT (datetime('now')),
          actor_id TEXT NOT NULL,
          actor_username TEXT NOT NULL,
          action TEXT NOT NULL,
          target_type TEXT NOT NULL,
          target_id TEXT NOT NULL,
          ip_address TEXT NOT NULL,
          result TEXT NOT NULL,
          details_json TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
        CREATE TABLE IF NOT EXISTS incidents (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          severity TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'OPEN',
          affected_server_id TEXT,
          affected_customer_id TEXT,
          description TEXT NOT NULL,
          reported_by_user_id TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          resolved_at TEXT
        );
      `);
    },
  },
  {
    id: 2,
    name: '002_seed_default_roles_and_admin',
    up: (db: IDatabaseDriver) => {
      const defaultRoles = [
        {
          id: 'role-exec-ops',
          name: 'Executive Operations Overseer',
          description: 'Full strategic visibility and top-level executive controls',
          permissions: [
            'DASHBOARD_VIEW', 'INFRA_VIEW', 'INFRA_MANAGE', 'INFRA_PROVISION',
            'AGENT_VIEW', 'AGENT_MANAGE', 'AGENT_ENROLL', 'CUSTOMER_VIEW',
            'CUSTOMER_MANAGE', 'CONTRACT_VIEW', 'CONTRACT_MANAGE', 'CONTRACT_ENFORCE',
            'REMOTE_DIAGNOSTICS', 'REMOTE_EXECUTE', 'AUDIT_VIEW', 'INCIDENT_MANAGE',
            'USER_MANAGE', 'SETTINGS_MANAGE'
          ],
        },
        {
          id: 'role-ceo',
          name: 'Chief Executive Officer',
          description: 'High level business oversight and audited visibility',
          permissions: ['DASHBOARD_VIEW', 'INFRA_VIEW', 'CUSTOMER_VIEW', 'CONTRACT_VIEW', 'AUDIT_VIEW'],
        },
        {
          id: 'role-infra-admin',
          name: 'Infrastructure Administrator',
          description: 'Manages physical and cloud servers, provisioning, and agents',
          permissions: [
            'DASHBOARD_VIEW', 'INFRA_VIEW', 'INFRA_MANAGE', 'INFRA_PROVISION',
            'AGENT_VIEW', 'AGENT_MANAGE', 'AGENT_ENROLL', 'REMOTE_DIAGNOSTICS',
            'REMOTE_EXECUTE', 'AUDIT_VIEW', 'INCIDENT_MANAGE'
          ],
        },
        {
          id: 'role-tech-support',
          name: 'Technical Support',
          description: 'Tier 2/3 operations support with diagnostic and incident capabilities',
          permissions: [
            'DASHBOARD_VIEW', 'INFRA_VIEW', 'AGENT_VIEW', 'REMOTE_DIAGNOSTICS',
            'CUSTOMER_VIEW', 'AUDIT_VIEW', 'INCIDENT_MANAGE'
          ],
        },
        {
          id: 'role-auditor',
          name: 'Read-only Auditor',
          description: 'Strictly read-only access for compliance and audit',
          permissions: ['DASHBOARD_VIEW', 'INFRA_VIEW', 'AGENT_VIEW', 'CUSTOMER_VIEW', 'CONTRACT_VIEW', 'AUDIT_VIEW'],
        },
      ];

      for (const r of defaultRoles) {
        db.run('INSERT OR IGNORE INTO roles (id, name, description) VALUES (?, ?, ?)', [r.id, r.name, r.description]);
        for (const p of r.permissions) {
          db.run('INSERT OR IGNORE INTO role_permissions (role_id, permission) VALUES (?, ?)', [r.id, p]);
        }
      }

      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync('Tropical2026!', salt);

      db.run(
        `INSERT OR IGNORE INTO users (id, username, email, password_hash, role_id, is_active)
         VALUES (?, ?, ?, ?, ?, 1)`,
        ['user-admin-default', 'admin', 'admin@tropicalservers.com', hash, 'role-exec-ops']
      );
    },
  },
];

export function runMigrations(db: IDatabaseDriver): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const appliedRows = db.query<{ id: number }>('SELECT id FROM _migrations ORDER BY id ASC');
  const appliedIds = new Set(appliedRows.map((r) => r.id));

  for (const migration of migrations) {
    if (!appliedIds.has(migration.id)) {
      db.transaction(() => {
        migration.up(db);
        db.run('INSERT INTO _migrations (id, name) VALUES (?, ?)', [migration.id, migration.name]);
      });
    }
  }
}
