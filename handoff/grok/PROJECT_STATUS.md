# Project Status — Tropical Control Center (TCC)

**Tropical Servers · Secure. Reliable. Tropical.**
**Status Date:** November 2026
**Lead Engineer:** Jules
**Release Target:** Enterprise Production v1.0.0

---

## 1. Executive Summary

Tropical Control Center (TCC) is the central infrastructure orchestration, agent telemetry, and operational management platform for **Tropical Servers**. Tropical Servers rents dedicated enterprise infrastructure from third-party bare-metal and cloud providers (e.g. Equinix Metal, Hetzner), provisions dedicated customer environments, deploys monitoring agents onto customer servers, and delivers 24/7 technical oversight.

### Critical Scope Correction
- **TCC is exclusively the central infrastructure management and agent management platform.**
- **The Metrics Simulator is NOT part of TCC.** It is an entirely separate standalone application with its own repository, architecture, and deployment lifecycle.
- **Zero simulated telemetry:** Every metric displayed by TCC originates strictly from verified infrastructure, authenticated customer-side agents, provider APIs, or active database records. Missing telemetry is reported as `null`/`UNKNOWN`, never fabricated as zero or simulated.

---

## 2. Completed Functionality

| Module | Status | Verification | Description |
| :--- | :--- | :--- | :--- |
| **Monorepo Architecture** | **Complete** | Pinned builds & TS configs | Modular structure (`packages/shared`, `packages/server`, `packages/agent`, `packages/desktop`) with clean dependency isolation. |
| **Database & Migrations** | **Complete** | SQLite driver & automated migrations | SQLite abstraction (`IDatabaseDriver`, WAL mode, foreign keys) designed for seamless PostgreSQL migration. |
| **Authentication & RBAC** | **Complete** | JWT + bcrypt + permission engine | 8 role definitions with configurable granular permissions, 5-attempt brute-force lockouts, login history logging. |
| **Executive Dashboard** | **Complete** | Real-time SQL aggregations | Aggregates online/offline/unknown server states, active deployments, provisioning jobs, and open incidents without synthetic numbers. |
| **Infrastructure Inventory** | **Complete** | Full CRUD & archive | Specifications (CPU cores, RAM GB, storage type/size, network Gbps), rental cost, customer assignment, and location. |
| **Provider Adapter Framework** | **Complete** | `IProviderAdapter` & registry | Extensible multi-provider abstraction with Equinix Metal and Hetzner adapters, credential validation, and capacity discovery. |
| **Provisioning Engine** | **Complete** | 11-stage async state machine | Queued -> Validating -> Resource Allocation -> OS Hardening -> Agent Deployment -> TCC Registration -> Health Verification -> Completed. |
| **Tropical Agent Daemon** | **Complete** | Standalone lightweight service | OS detection, genuine hardware telemetry collector (CPU, RAM, disk, network, uptime), token enrollment, heartbeat loop, and safe upgrades. |
| **Customer & Contract Management** | **Complete** | Multi-server binding & SLA tiers | Customer records, contract terms, renewal dates, and default detection engine. |
| **Service Enforcement** | **Complete** | Policy engine & grace periods | Graceful, recoverable suspension requiring administrative authorization, recorded reason, and notice periods. No destructive auto-wiping. |
| **Controlled Remote Operations**| **Complete** | Safeguards & diagnostics | Diagnostics, service inspection, graceful restarts, maintenance windows, and agent upgrade triggers with disruptive confirmation checks. |
| **Immutable Audit Logging** | **Complete** | Append-only audit trail | Logs actor ID, username, action, correlation ID, target, IP address, timestamp, and outcome. |
| **Desktop Application** | **Complete** | Electron + React 18 + Vite | Dark Navy (`#0b1220`), Tropical Teal (`#14b8a6`), Green (`#22c55e`) enterprise UI with all module screens and real-time refresh. |

---

## 3. Test & Verification Summary

The complete integration test suite (`tests/integration.test.mjs`) validates:
1. Health check endpoint `/health` returning `UP` and application identification.
2. Administrative authentication and JWT generation.
3. Customer creation and service assignment.
4. Contract creation with terms and renewal dates.
5. Asynchronous provisioning job queueing and state transitions.
6. Server inventory registration.
7. Agent enrollment, initial `UNKNOWN` state, and transition to `ONLINE` upon genuine authenticated telemetry heartbeat.
8. Controlled remote diagnostic execution.
9. Executive dashboard metric computation.
10. Immutable audit log persistence and correlation.

Result: **10/10 test suites passing.**
