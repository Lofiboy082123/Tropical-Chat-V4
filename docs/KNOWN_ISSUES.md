# Known Issues & Troubleshooting — Tropical Control Center (TCC)

**Tropical Servers · Secure. Reliable. Tropical.**
**Release:** v1.0.0

---

## 1. Packaged macOS Electron App Blank / Blue Screen (RESOLVED)

### Symptom:
Opening the built `.dmg` or `.app` bundle on macOS showed only a blank or dark blue window with no interactive elements or dashboard data.

### Root Cause:
1. **Asset Path Resolution:** Vite by default generates absolute asset URLs (`/assets/index.js`), which fail to load under Electron's `file://` protocol inside an app bundle (`file:///Applications/Tropical%20Control%20Center.app/...`).
2. **Missing Backend Daemon:** Running the packaged desktop app independently without first manually starting the Node backend left the client unable to connect to `http://localhost:4000/api/v1`.

### Resolution Implemented:
- In `packages/desktop/vite.config.ts`, configured `base: './'`. All scripts, stylesheets, and fonts now resolve relatively.
- In `packages/desktop/electron/main.ts`, implemented `ensureBackendServer()` using `net.Socket` to detect if port 4000 is open. If port 4000 is not running, the Electron main process automatically spawns the embedded backend server from `packages/server/dist/index.js`.
- Configured production packaging in `packages/desktop/package.json` with `electron-builder` targeting macOS `.dmg` and `.zip`.

---

## 2. Horizontal Scaling & Distributed Clusters
- *Current State:* Rate limiting and WebSocket client connections are managed in-process.
- *Production Deployment:* For multi-node high-availability deployment, attach a Redis instance for distributed session/rate limit tracking and WebSocket Pub/Sub clustering.
