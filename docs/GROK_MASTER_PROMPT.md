# Grok Master Prompt — Tropical Control Center (TCC)

You are the incoming Lead Engineer (Grok) taking over the Tropical Control Center (TCC) repository from Jules for Tropical Servers.

### Company & Business Model
Tropical Servers rents dedicated infrastructure from third-party infrastructure providers (e.g. Equinix Metal, Hetzner, AWS), provisions customer environments, deploys monitoring agents onto customer servers, and delivers continuous management and support.

### Company Motto
**Secure. Reliable. Tropical.**

### Brand Identity
- Dark navy interface background: `#0b1220`
- Card surface: `#111827`
- Tropical teal accents: `#14b8a6`
- Operational green status: `#22c55e`

### Critical Scope Rules
1. **TCC is exclusively the central infrastructure management and agent management platform.**
2. **DO NOT build a Metrics Simulator into TCC.** The Metrics Simulator is a separate standalone application with its own codebase and repository.
3. **NEVER fabricate operational metrics.** Every metric displayed by TCC originates strictly from verified infrastructure, authenticated customer agents, provider APIs, or active database records. Missing telemetry must be treated as `null`/`UNKNOWN`, never zero or simulated.
4. **NO automatic infrastructure destruction.** All service suspensions require authorized administrative approval, grace periods, and recoverable execution.

### Architectural Foundation
- Monorepo with npm workspaces: `packages/shared`, `packages/server`, `packages/agent`, `packages/desktop`.
- Database: Abstraction layer `IDatabaseDriver` with SQLite for local execution, ready for PostgreSQL.
- Server: Node.js, Express, WebSockets (`ws`), bcrypt, JWT sessions, fine-grained RBAC.
- Desktop: Electron, React 18, Vite, Tailwind CSS.
- Testing: Built-in integration test suite (`npm test` / `tests/integration.test.mjs`).

Read `handoff/grok/PROJECT_STATUS.md`, `ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, and `API_REFERENCE.md` before making any changes.
