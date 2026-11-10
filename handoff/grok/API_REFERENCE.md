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

### `GET /auth/me`
Retrieves currently authenticated session user.
- **Headers:** `Authorization: Bearer <token>`
- **Response (200):** `{ "user": { ... } }`

---

## 2. Executive Dashboard (`/dashboard`)

### `GET /dashboard/metrics`
Retrieves aggregated infrastructure KPIs originating from live database records.
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
    "openIncidentsCount": 0,
    "recentActivityCount": 42,
    "systemHealth": "OPTIMAL",
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
- **Request Body:**
  ```json
  {
    "provider": "equinix_metal",
    "providerResourceId": "eqx-94021",
    "hostname": "node-db-01.tropical.internal",
    "ipAddress": "147.75.105.42",
    "operatingSystem": "Ubuntu 22.04 LTS",
    "specs": {
      "cpu": "AMD EPYC 7443P",
      "cpuCores": 24,
      "ramGb": 64,
      "storageGb": 960,
      "storageType": "NVMe",
      "networkSpeedGbps": 20
    },
    "location": "da",
    "rentalCostMonthly": 750,
    "assignedCustomerId": "cust-01"
  }
  ```

### `PATCH /infrastructure/servers/:id`
Updates server configuration or status.

### `DELETE /infrastructure/servers/:id`
Archives server record.

---

## 4. Provisioning Engine (`/provisioning`)

### `GET /provisioning/providers`
Lists active provider adapters and available hardware plans.

### `GET /provisioning/jobs`
Lists asynchronous provisioning jobs.

### `POST /provisioning/jobs`
Queues a new dedicated server provisioning job.
- **Permission Required:** `INFRA_PROVISION`
- **Request Body:**
  ```json
  {
    "customerId": "cust-01",
    "provider": "equinix_metal",
    "targetHostname": "node-ai-gpu-01.tropical.internal",
    "targetOs": "Ubuntu 22.04 LTS",
    "planId": "c3.medium.x86",
    "location": "da"
  }
  ```

---

## 5. Tropical Monitoring Agent (`/agent`)

### `POST /agent/enroll`
One-time agent enrollment from deployed customer node.
- **Request Body:**
  ```json
  {
    "enrollmentToken": "enroll-uuid-...",
    "hostname": "customer-host",
    "osInfo": { "platform": "linux", "release": "5.15.0", "arch": "x64" },
    "agentVersion": "1.0.0"
  }
  ```
- **Response (200):**
  ```json
  {
    "agentId": "agent-XXXX",
    "authToken": "agt-sec-...",
    "heartbeatIntervalSeconds": 30,
    "heartbeatTimeoutSeconds": 60
  }
  ```

### `POST /agent/heartbeat`
Authenticated agent telemetry push.
- **Headers:** `Authorization: Bearer <agentAuthToken>`
- **Request Body:**
  ```json
  {
    "agentId": "agent-XXXX",
    "version": "1.0.0",
    "timestamp": "2026-11-10T21:05:00.000Z",
    "osInfo": { ... },
    "telemetry": {
      "cpuUsagePercent": 24.5,
      "memoryUsedMb": 16384,
      "memoryTotalMb": 65536,
      "storageUsedGb": 184,
      "storageTotalGb": 960,
      "networkRxBytesPerSec": 15240,
      "networkTxBytesPerSec": 8340,
      "uptimeSeconds": 86400
    }
  }
  ```

### `POST /agent/agents/:id/revoke`
Revokes compromised agent credentials.

---

## 6. Customers, Contracts & Enforcement (`/management`)

- `GET /management/customers` / `POST /management/customers`
- `GET /management/contracts` / `POST /management/contracts`
- `GET /management/contracts/defaults` (Identifies defaulted/expired contracts)
- `POST /management/contracts/enforce` (Executes warning notice, grace period, suspension, or reinstatement)

---

## 7. Controlled Remote Operations (`/remote`)

### `POST /remote/operations`
Dispatches authorized operations to managed customer agents.
- **Permission Required:** `REMOTE_EXECUTE`
- **Request Body:**
  ```json
  {
    "agentId": "agent-XXXX",
    "commandType": "GET_DIAGNOSTICS",
    "parameters": {},
    "isDisruptive": false,
    "confirmationAcknowledged": true
  }
  ```

---

## 8. Immutable Audit Trail & Incidents (`/admin`)

- `GET /admin/audit-logs`
- `GET /admin/incidents`
- `POST /admin/incidents`
- `PATCH /admin/incidents/:id/status`
