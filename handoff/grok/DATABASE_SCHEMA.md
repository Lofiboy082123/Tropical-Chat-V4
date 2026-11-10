# Database Schema Documentation — TCC

**Tropical Servers · Secure. Reliable. Tropical.**
**Engine:** SQLite (Initial) / PostgreSQL Compatible
**Driver Abstraction:** `packages/server/src/db/driver.ts`

---

## Tables and Entity Relationships

### 1. `users`
Administrative and staff accounts.
- `id` (TEXT, PK): Unique user identifier (`user-admin-default`).
- `username` (TEXT, UNIQUE): Login username.
- `email` (TEXT, UNIQUE): Corporate email.
- `password_hash` (TEXT): bcrypt password hash (rounds: 10).
- `role_id` (TEXT, FK -> roles.id): Assigned administrative role.
- `is_active` (INTEGER): Account active flag (0 or 1).
- `failed_login_attempts` (INTEGER): Counter for brute-force prevention.
- `locked_until` (TEXT, NULLABLE): Temporary lockout timestamp (15 min after 5 failures).
- `last_login_at` (TEXT, NULLABLE): Last successful authentication timestamp.
- `created_at`, `updated_at` (TEXT): ISO timestamps.

### 2. `roles` & `role_permissions`
Configurable Role-Based Access Control matrix.
- `roles.id` (TEXT, PK), `roles.name` (TEXT, UNIQUE), `roles.description` (TEXT).
- `role_permissions.role_id` (TEXT, FK), `role_permissions.permission` (TEXT). PK: `(role_id, permission)`.

### 3. `login_history`
Authentication audit trail.
- `id` (TEXT, PK), `user_id` (TEXT, NULLABLE), `username` (TEXT), `ip_address` (TEXT), `user_agent` (TEXT), `success` (INTEGER), `failure_reason` (TEXT, NULLABLE), `created_at` (TEXT).

### 4. `providers`
Configured third-party infrastructure providers.
- `id` (TEXT, PK), `provider_type` (TEXT: `equinix_metal`, `hetzner`, `aws`), `name` (TEXT), `api_url` (TEXT), `api_key_encrypted` (TEXT), `is_active` (INTEGER), `created_at` (TEXT).

### 5. `servers`
Managed dedicated server inventory.
- `id` (TEXT, PK): Internal server ID.
- `provider` (TEXT): Provider identifier.
- `provider_resource_id` (TEXT): Provider-side resource ID.
- `hostname` (TEXT), `ip_address` (TEXT), `operating_system` (TEXT).
- `specs_json` (TEXT): CPU cores, RAM GB, storage size/type, network speed Gbps.
- `location` (TEXT): Facility / metro code.
- `rental_cost_monthly` (REAL): Monthly rental cost in USD.
- `assigned_customer_id` (TEXT, NULLABLE).
- `deployment_status` (TEXT: `unassigned`, `assigned`, `maintenance`, `decommissioned`).
- `provisioning_status` (TEXT: `unprovisioned`, `provisioning`, `provisioned`, `failed`).
- `monitoring_status` (TEXT: `online`, `offline`, `unknown`).
- `agent_id` (TEXT, NULLABLE: FK -> agents.id).
- `is_archived` (INTEGER: 0 or 1).
- `created_at`, `updated_at` (TEXT).

### 6. `customers`
Enterprise customer profiles.
- `id` (TEXT, PK): Customer ID (`cust-XXXX`).
- `company_name` (TEXT), `contact_json` (TEXT: name, email, phone, emergency), `service_tier` (TEXT), `status` (TEXT: `active`, `suspended`, `archived`), `active_services_json` (TEXT), `internal_notes` (TEXT).

### 7. `contracts`
Customer service contracts and terms.
- `id` (TEXT, PK), `customer_id` (TEXT, FK -> customers.id), `title` (TEXT), `status` (TEXT: `ACTIVE`, `PENDING`, `EXPIRED`, `SUSPENDED`), `start_date` (TEXT), `end_date` (TEXT), `renewal_date` (TEXT), `monthly_value_usd` (REAL), `assigned_services_json` (TEXT), `terms_summary` (TEXT), `is_auto_renew` (INTEGER).

### 8. `enforcement_actions`
Administrative service enforcement history.
- `id` (TEXT, PK), `contract_id` (TEXT, FK), `customer_id` (TEXT, FK), `action_type` (TEXT), `authorized_by_user_id` (TEXT), `reason` (TEXT), `grace_period_ends_at` (TEXT, NULLABLE), `is_executed` (INTEGER), `executed_at` (TEXT, NULLABLE).

### 9. `agents`
Registered Tropical Monitoring Agents.
- `id` (TEXT, PK), `server_id` (TEXT, FK -> servers.id), `customer_id` (TEXT), `auth_token_hash` (TEXT), `enrollment_token` (TEXT, NULLABLE), `version` (TEXT), `status` (TEXT: `ONLINE`, `OFFLINE`, `UNKNOWN`), `os_platform` (TEXT), `os_release` (TEXT), `hostname` (TEXT), `last_heartbeat_at` (TEXT, NULLABLE), `heartbeat_deadline_seconds` (INTEGER: default 60), `latest_telemetry_json` (TEXT, NULLABLE), `is_revoked` (INTEGER: 0 or 1).

### 10. `agent_telemetry`
Time-series hardware telemetry from authenticated agents.
- `id` (TEXT, PK), `agent_id` (TEXT, FK -> agents.id), `timestamp` (TEXT), `cpu_usage_percent` (REAL), `memory_used_mb` (REAL), `memory_total_mb` (REAL), `storage_used_gb` (REAL), `storage_total_gb` (REAL), `network_rx_bytes_sec` (REAL), `network_tx_bytes_sec` (REAL), `uptime_seconds` (REAL).
- **Index:** `idx_agent_telemetry_agent_time (agent_id, timestamp)`.

### 11. `provisioning_jobs`
Asynchronous server provisioning state machine.
- `id` (TEXT, PK), `server_id` (TEXT, NULLABLE), `customer_id` (TEXT), `provider` (TEXT), `target_hostname` (TEXT), `target_os` (TEXT), `plan_id` (TEXT), `location` (TEXT), `state` (TEXT: `QUEUED`, `VALIDATING_CREDENTIALS`, `CREATING_RESOURCE`, `COMPLETED`, `FAILED`), `progress_percent` (INTEGER), `retries` (INTEGER), `logs_json` (TEXT), `initiated_by_user_id` (TEXT), `completed_at` (TEXT, NULLABLE).

### 12. `remote_operations`
Authorized remote commands dispatched to managed agents.
- `id` (TEXT, PK), `agent_id` (TEXT), `server_id` (TEXT), `command_type` (TEXT), `parameters_json` (TEXT), `authorized_by_user_id` (TEXT), `is_disruptive` (INTEGER), `confirmation_acknowledged` (INTEGER), `status` (TEXT: `PENDING`, `DISPATCHED`, `SUCCESS`, `FAILED`), `output` (TEXT, NULLABLE), `error` (TEXT, NULLABLE).

### 13. `audit_logs`
Immutable administrative audit log.
- `id` (TEXT, PK), `correlation_id` (TEXT), `timestamp` (TEXT), `actor_id` (TEXT), `actor_username` (TEXT), `action` (TEXT), `target_type` (TEXT), `target_id` (TEXT), `ip_address` (TEXT), `result` (TEXT: `SUCCESS`, `FAILURE`, `DENIED`), `details_json` (TEXT, NULLABLE).
- **Indexes:** `idx_audit_logs_timestamp`, `idx_audit_logs_actor`, `idx_audit_logs_correlation`.

### 14. `incidents`
Operational incidents and infrastructure alerts.
- `id` (TEXT, PK), `title` (TEXT), `severity` (TEXT: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), `status` (TEXT: `OPEN`, `INVESTIGATING`, `MITIGATED`, `RESOLVED`), `affected_server_id` (TEXT, NULLABLE), `affected_customer_id` (TEXT, NULLABLE), `description` (TEXT), `reported_by_user_id` (TEXT), `created_at` (TEXT), `resolved_at` (TEXT, NULLABLE).
