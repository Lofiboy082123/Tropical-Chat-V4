# Tropical Control Center (TCC) — Operations & Incident Runbook

**Tropical Servers · Secure. Reliable. Tropical.**
**Authority:** Senior Executive Chairman
**Version:** 1.0.0 Production

---

## 1. System Overview
Tropical Control Center is the internal management plane for Tropical Servers. It provisions and manages dedicated enterprise infrastructure rented from Equinix Metal, Hetzner, AWS, and OVHcloud, monitors customer nodes via the Tropical Agent daemon, and enforces customer service SLAs.

## 2. Emergency Operational Procedures

### 2.1 Agent Connectivity Loss (OFFLINE State)
1. Navigate to **Tropical Agents** in TCC.
2. Check last heartbeat timestamp.
3. If an agent has missed its deadline (60s), verify upstream provider status in **Infrastructure Inventory**.
4. Use **Remote Operations** to dispatch `GET_SERVICE_STATUS` or `GET_DIAGNOSTICS`.
5. If hardware/node is unresponsive, escalate via provider console or dispatch reboot request.

### 2.2 Contract Defaults & Graceful Suspension
1. Check **Contracts & Enforcement** default alerts.
2. Click **Enforcement Workflow**.
3. Issue a mandatory **Grace Period Notice** (default 7 days).
4. If uncured upon grace period expiration, execute **Graceful Suspension**.
5. **CRITICAL:** Infrastructure is marked suspended and isolated; never execute automated data deletion. Reinstatement is fully recoverable upon administrative settlement.

### 2.3 Standalone Desktop Application (.DMG) on macOS
- If running as a standalone `.dmg` bundle, the Electron main process automatically detects if port 4000 is open.
- If not running, it auto-spawns the local backend service.
- All web assets resolve relatively (`base: './'`), preventing blank or blue screen issues.

## 3. Disaster Recovery & Backups
- Perform periodic SQLite WAL snapshots:
  ```bash
  sqlite3 data/tcc.sqlite ".backup 'data/tcc_backup_$(date +%Y%m%d_%H%M%S).sqlite'"
  ```
- To migrate to PostgreSQL, configure `DB_DIALECT=postgres` and supply standard PostgreSQL connection credentials in `.env`.
