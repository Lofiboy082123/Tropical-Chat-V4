# Project Status — Tropical Control Center (TCC)

**Tropical Servers · Secure. Reliable. Tropical.**
**Status Date:** November 2026
**Lead Engineer:** Jules
**Release Target:** Enterprise Production Release 1.0.0

---

## 1. Executive Summary

Tropical Control Center (TCC) is the central infrastructure orchestration, agent telemetry, and operational management platform for **Tropical Servers**.

### Business Model
Tropical Servers rents dedicated infrastructure from established third-party providers (Equinix Metal, Hetzner, AWS, OVHcloud), provisions customer environments, configures security baselines, deploys monitoring agents onto customer infrastructure, and provides continuous technical management.

### Scope Distinction
- **TCC is exclusively the central infrastructure management and agent management platform.**
- **The Metrics Simulator is NOT part of TCC.** It has been completely excluded from TCC.
- **Zero simulated telemetry:** Every operational metric displayed by TCC originates from authentic infrastructure, authenticated customer agents, provider APIs, or active database records. Missing telemetry is reported as `UNKNOWN`, never fabricated.

---

## 2. Completed Functionality

| Module | Status | Highlights |
| :--- | :--- | :--- |
| **Monorepo Architecture** | **Complete** | Modular packages: `@tcc/shared`, `@tcc/server`, `@tcc/agent`, `@tcc/desktop`. Clean dependency isolation. |
| **Database & Migrations** | **Complete** | SQLite abstraction layer (`IDatabaseDriver` / `better-sqlite3`, WAL mode, foreign keys) ready for PostgreSQL migration. Versioned automated migrations. |
| **Authentication & RBAC** | **Complete** | bcrypt password hashing, JWT sessions, 8 configurable roles, brute-force lockout safeguards, login history audit. |
| **Executive Dashboard** | **Complete** | Real-time SQL aggregations for server states, active deployments, provisioning jobs, genuine utilization averages, and business financial metrics (MRR, Infrastructure Expenditure, Gross Margin). |
| **Infrastructure Inventory** | **Complete** | Detailed server records (public IP, private IP, CPU model, RAM, storage, network speed, rental cost, customer assignment, contract binding, search/filter). |
| **Provider Framework** | **Complete** | Pluggable `IProviderAdapter` architecture with Equinix Metal, Hetzner, AWS EC2, and OVHcloud adapters. |
| **Provisioning Engine** | **Complete** | 11-stage asynchronous state machine with customer validation, active contract checks, duplicate-request protection, retry logs, and provider health verification. |
| **Tropical Agent Daemon** | **Complete** | Standalone lightweight daemon with OS detection, genuine hardware telemetry collector (CPU, RAM, storage, network RX/TX from `/proc/net/dev`, uptime), token enrollment, authenticated heartbeat loop, and safe rollback support. |
| **Customer & Contract Management** | **Complete** | Multi-server customer assignment, contract tracking, default policy detection, and recoverable service enforcement with administrative grace periods. |
| **Controlled Remote Operations** | **Complete** | Whitelisted diagnostic requests, service inspections, graceful restarts, maintenance windows, and agent upgrades with disruptive confirmation safeguards and audit trails. |
| **Immutable Audit Logging** | **Complete** | Append-only audit trail with correlation IDs, actor records, and incident tracking. |
| **Desktop Application & macOS DMG** | **Complete** | Electron + React 18 + Vite + Tailwind CSS styled in Dark Navy (`#0b1220`), Tropical Teal (`#14b8a6`), and Green (`#22c55e`). Fixed `.dmg` blank/blue screen via relative asset paths (`base: './'`) and auto-spawning embedded backend server. Packaged with `electron-builder`. |

---

## 3. Test Suite Verification

- 13/13 passing automated integration tests (`tests/integration.test.mjs`).
- Tests cover health checks, admin auth, 4-way provider discovery (Equinix Metal, Hetzner, AWS, OVHcloud), customer creation, contract creation, asynchronous provisioning, inventory management, agent enrollment & genuine telemetry, service enforcement (notice & suspension), incident management, real utilization metrics calculation, and immutable audit logs.
