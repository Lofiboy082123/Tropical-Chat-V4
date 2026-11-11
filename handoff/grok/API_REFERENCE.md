# API Reference Documentation — TCC

**Tropical Servers · Secure. Reliable. Tropical.**
**Base URL:** `http://localhost:4000/api/v1`
**Authentication:** `Authorization: Bearer <JWT_TOKEN>` or Agent Token

---

## 1. Authentication (`/auth`)

### `POST /auth/login`
Authenticates an administrator or operator.
- **Request Body:** `{ "username": "admin", "password": "..." }`
- **Response (200):**
  ```json
  {
    "token": "eyJhbGciOi...",
    "user": {
      "id": "user-admin-default",
      "username": "admin",
      "email": "admin@tropicalservers.com",
      "roleName": "Executive Operations Overseer",
      "permissions": ["DASHBOARD_VIEW", "INFRA_MANAGE", ...]
    },
    "expiresAt": "2026-11-11T05:00:00.000Z"
  }
  ```

### `POST /auth/logout`
Logs out active session and writes immutable audit entry.

### `GET /auth/me`
Retrieves currently authenticated session user.

---

## 2. Executive Dashboard (`/dashboard`)

### `GET /dashboard/metrics`
Retrieves aggregated operational KPIs, genuine infrastructure utilization averages, and business financial figures.
- **Permission Required:** `DASHBOARD_VIEW`
- **Response (200):**
  ```json
  {
    "totalManagedServers": 14,
    "onlineServers": 12,
    "offlineServers": 2,
    "unknownServers": 0,
    "totalRegisteredAgents": 14,
    "onlineAgents": 12,
    "offlineAgents": 2,
    "unknownAgents": 0,
    "activeCustomers": 8,
    "activeDeployments": 14,
    "activeProvisioningJobs": 0,
    "failedProvisioningJobs": 0,
    "openIncidentsCount": 0,
    "recentActivityCount": 42,
    "systemHealth": "OPTIMAL",
    "utilization": {
      "averageCpuPercent": 18.4,
      "averageMemoryPercent": 42.1,
      "averageStoragePercent": 28.5,
      "totalBandwidthRxBytesSec": 154200,
      "totalBandwidthTxBytesSec": 89200,
      "reportingAgentsCount": 12
    },
    "financials": {
      "monthlyRecurringRevenueUsd": 38500,
      "totalInfrastructureExpenditureUsd": 14200,
      "estimatedMonthlyGrossMarginUsd": 24300,
      "grossMarginPercent": 63.1,
      "activeContractsCount": 11,
      "expiringContractsCount": 1
    },
    "timestamp": "2026-11-10T21:00:00.000Z"
  }
  ```

---

## 3. Infrastructure Inventory (`/infrastructure`)

### `GET /infrastructure/servers`
Lists all managed servers.
- **Query Params:** `includeArchived=true|false`, `customerId=<ID>`
- **Permission Required:** `INFRA_VIEW`

### `POST /infrastructure/servers`
Manually registers a managed dedicated server.
- **Permission Required:** `INFRA_MANAGE`

### `PATCH /infrastructure/servers/:id`
Updates server configuration, customer assignment, or lifecycle status.

### `DELETE /infrastructure/servers/:id`
Archives server record.

---

## 4. Provisioning Engine (`/provisioning`)

### `GET /provisioning/providers`
Lists active provider adapters (Equinix Metal, Hetzner, AWS, OVHcloud) and available hardware plans.

### `GET /provisioning/jobs`
Lists asynchronous provisioning jobs.

### `POST /provisioning/jobs`
Queues a new dedicated server provisioning job with customer validation, active contract checks, and duplicate-request safeguards.
- **Permission Required:** `INFRA_PROVISION`
- **Request Body:**
  ```json
  {
    "customerId": "cust-01",
    "provider": "ovhcloud",
    "targetHostname": "node-db-ovh.tropical.internal",
    "targetOs": "Ubuntu 22.04 LTS",
    "planId": "scale-a1",
    "location": "bhs"
  }
  ```

---

## 5. Tropical Monitoring Agent (`/agent`)

### `POST /agent/enroll`
One-time agent enrollment from deployed customer node.

### `POST /agent/heartbeat`
Authenticated agent telemetry push (CPU, RAM, storage, network bytes/sec, uptime).

### `POST /agent/agents/:id/revoke`
Revokes compromised agent credentials.

---

## 6. Customers, Contracts & Enforcement (`/management`)

- `GET /management/customers` / `POST /management/customers`
- `GET /management/contracts` / `POST /management/contracts`
- `GET /management/contracts/defaults` (Identifies defaulted/expired contracts)
- `POST /management/contracts/enforce` (Executes default warnings, grace period notices, graceful suspensions, or reinstatements)

---

## 7. Controlled Remote Operations (`/remote`)

### `POST /remote/operations`
Dispatches authorized operations to managed customer agents (whitelisted commands only: `GET_DIAGNOSTICS`, `GET_SERVICE_STATUS`, `RESTART_SERVICE`, `SCHEDULE_MAINTENANCE`, `UPGRADE_AGENT`).

---

## 8. Immutable Audit Trail & Incidents (`/admin`)

- `GET /admin/audit-logs`
- `GET /admin/incidents`
- `POST /admin/incidents`
- `PATCH /admin/incidents/:id/status`
