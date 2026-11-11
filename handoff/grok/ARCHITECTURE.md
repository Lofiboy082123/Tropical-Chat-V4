# System Architecture — Tropical Control Center (TCC)

**Tropical Servers · Secure. Reliable. Tropical.**
**Document Version:** 1.0.0

---

## 1. High-Level Architecture Overview

```
                      +---------------------------------------+
                      |       Tropical Control Center         |
                      |        Electron Desktop Client        |
                      |   React 18 + Vite + Tailwind CSS      |
                      +-------------------+-------------------+
                                          |
                        REST API (JSON)   |   WebSocket Events
                                          v
                      +---------------------------------------+
                      |             TCC Backend               |
                      |         Node.js + Express             |
                      |  - Auth & RBAC Engine                 |
                      |  - Infrastructure Inventory           |
                      |  - Async Provisioning Engine          |
                      |  - Telemetry Ingestion Pipeline       |
                      |  - Remote Operations Dispatcher       |
                      |  - Service Enforcement Policy         |
                      +---------+-------------------+---------+
                                |                   |
                 Provider APIs  |                   | Mutual Auth / HTTPS
                                v                   v
          +-------------------------+       +-------------------------+
          | Infrastructure Providers|       |  Customer Infrastructure |
          | - Equinix Metal API     |       |  - Managed Server Node  |
          | - Hetzner Robot API     |       |  +--------------------+ |
          | - Extensible Adapters   |       |  |  tropical-agent    | |
          +-------------------------+       |  |  SystemCollector   | |
                                            |  +--------------------+ |
                                            +-------------------------+
```

---

## 2. Monorepo Organization

```
/
├── handoff/grok/           # Grok Engineering Hand-off Package
├── packages/
│   ├── shared/             # Domain models, schemas, and contracts
│   │   ├── src/types/      # Auth, Infra, Provisioning, Agent, Customer, Contract
│   │   └── dist/           # Built TypeScript definitions
│   ├── server/             # Central Management API & Orchestrator
│   │   ├── src/db/         # Database driver abstraction & migrations
│   │   ├── src/providers/  # Provider adapter implementations & registry
│   │   ├── src/services/   # Provisioning, Agent, Customer, Contract, Remote, Audit
│   │   ├── src/routes/     # Typed Express routes
│   │   └── src/middleware/ # JWT, RBAC, correlation ID, and rate limiting
│   ├── agent/              # Lightweight customer-side monitoring daemon
│   │   ├── src/collector.ts# Genuine hardware & OS metric collector
│   │   └── src/daemon.ts   # Enrollment, heartbeat transmission, upgrades
│   └── desktop/            # Professional desktop client
│       ├── electron/       # Main process & preload bridge
│       └── src/            # React 18, Tailwind CSS, and views
├── tests/                  # Integration test suite
└── package.json            # npm workspaces root
```

---

## 3. Core Architectural Decisions

### 3.1 Strict Isolation from Simulation
TCC contains zero simulation code. Simulated telemetry, mock loads, and fake server records are prohibited in production TCC. If development load generation is needed, it must be performed from an external tool against staging environments, never baked into TCC.

### 3.2 Database Portability Layer (`IDatabaseDriver`)
To facilitate immediate development with SQLite without requiring Docker, while ensuring production scalability to PostgreSQL, database calls are abstracted behind `IDatabaseDriver`. The SQLite driver runs with WAL mode and foreign key constraints enabled.

### 3.3 Extensible Provider Adapter Architecture (`IProviderAdapter`)
Infrastructure providers are integrated via an adapter interface:
- `validateCredentials(credentials)`: Ensures API credentials are valid prior to job dispatch.
- `listAvailablePlans()`: Returns available hardware plans and monthly pricing.
- `provisionServer(request)`: Allocates dedicated infrastructure.
- `getServerStatus(resourceId)`: Verifies provider operational state.
- `terminateServer(resourceId)`: Decommissions infrastructure.

### 3.4 Tri-State Health Calculation
Agents report health via regular heartbeats:
- **ONLINE**: Heartbeat received within `deadline_seconds` (default 60s).
- **OFFLINE**: Registered agent has missed the deadline.
- **UNKNOWN**: Enrollment pending, credentials revoked, or communication untrusted.
Telemetry is never interpolated as zero if an agent drops offline; missing data is preserved as absent/unknown.
