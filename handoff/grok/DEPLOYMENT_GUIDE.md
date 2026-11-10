# Deployment & Operations Guide — TCC

**Tropical Servers · Secure. Reliable. Tropical.**

---

## 1. Prerequisites
- Node.js >= 20.0.0 (v22 recommended)
- npm >= 10.0.0
- SQLite3 or better-sqlite3 native build dependencies (standard C/C++ compiler)
- No Docker container requirement for initial setup.

## 2. Installation & Build

```bash
# Clone the repository
git clone <repo-url>
cd Tropical-Chat-V4

# Install all workspace dependencies
npm install

# Compile all workspace packages (shared, server, agent, desktop)
npx tsc -b packages/shared packages/server packages/agent
cd packages/desktop && npx vite build && npx tsc -p tsconfig.electron.json && cd ../..
```

## 3. Configuration

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Review and configure:
- `JWT_SECRET`: Generate a strong 32+ character random secret.
- `PORT`: Server listen port (default `4000`).
- `EQUINIX_METAL_API_KEY`: Equinix Metal API credentials.
- `HETZNER_API_TOKEN`: Hetzner Robot API token.

## 4. Running TCC Services

### Backend Server
```bash
npm run server
# or in production:
node packages/server/dist/index.js
```

### Desktop Application
```bash
# In development:
npm run desktop

# Or to launch built Electron desktop client:
npx electron packages/desktop/dist/electron/main.js
```

### Deploying the Tropical Agent on Customer Node
```bash
# On the customer server:
export TCC_SERVER_URL="https://tcc.tropicalservers.com"
export TCC_ENROLLMENT_TOKEN="<ONE_TIME_ENROLLMENT_TOKEN>"
node packages/agent/dist/index.js
```

## 5. Backup & Recovery

- **SQLite Database:** The database is located at `./data/tcc.sqlite` (or the path defined in `DB_STORAGE`).
- **Backup Procedure:**
  ```bash
  sqlite3 ./data/tcc.sqlite ".backup './data/tcc_backup_$(date +%Y%m%d_%H%M%S).sqlite'"
  ```
- **Recovery Procedure:**
  1. Stop TCC Backend: `pkill -f 'packages/server/dist/index.js'`.
  2. Restore file: `cp /path/to/backup.sqlite ./data/tcc.sqlite`.
  3. Start TCC Backend. Migrations will verify schema integrity automatically on startup.
