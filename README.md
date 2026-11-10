# Tropical Control Center (TCC)

**Tropical Servers · Secure. Reliable. Tropical.**

Tropical Control Center (TCC) is the central enterprise infrastructure management, customer orchestration, and agent telemetry platform for **Tropical Servers**.

Tropical Servers rents dedicated enterprise infrastructure from third-party infrastructure providers, provisions and delivers customer environments, deploys monitoring agents onto customer infrastructure, and provides ongoing technical management.

---

## Architecture Overview

TCC is organized as a modular TypeScript monorepo without mandatory container dependencies:

- **`packages/shared`**: Strongly typed domain models, schemas, and contracts.
- **`packages/server`**: Central API, WebSocket events, database abstraction, provisioning engine, agent telemetry receiver, and RBAC service.
- **`packages/agent`**: Standalone customer-side monitoring daemon reporting genuine hardware telemetry (CPU, RAM, disk, network, uptime).
- **`packages/desktop`**: Electron + React 18 + Vite + Tailwind CSS enterprise dashboard.
- **`handoff/grok`**: Complete engineering handoff package for the incoming Grok engineering team.

---

## Quick Start

```bash
# Install dependencies
npm install

# Compile all workspace packages
npx tsc -b packages/shared packages/server packages/agent
cd packages/desktop && npx vite build && npx tsc -p tsconfig.electron.json && cd ../..

# Run complete integration test suite
npm test

# Start Backend Server (port 4000)
npm run server

# Start Desktop Application
npm run desktop
```

Default administrator credentials: `admin` / `Tropical2026!`

For deployment, backup, and architecture details, refer to `handoff/grok/`.
