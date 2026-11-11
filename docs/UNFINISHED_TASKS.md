# Unfinished Tasks & Roadmap — TCC

**Tropical Servers · Secure. Reliable. Tropical.**
**Status for Grok Engineering Team**

---

### Important Scope Boundary Reminder
**The Metrics Simulator is NOT an unfinished task for TCC.** Management has explicitly ruled that the Metrics Simulator is a separate standalone application with its own repository and lifecycle. Grok must NOT build simulator code into TCC.

---

### Recommended Future Roadmap Tasks for Grok

1. **PostgreSQL Migration Driver**
   - *What was requested:* Database abstraction supporting future PostgreSQL migration.
   - *What has been implemented:* `IDatabaseDriver` cleanly abstracts query, get, run, exec, and transaction APIs. `SQLiteDatabaseDriver` implemented.
   - *What remains:* Implement `PostgreSQLDatabaseDriver` utilizing `pg` or `pg-promise` implementing `IDatabaseDriver`.
   - *Files involved:* `packages/server/src/db/driver.ts`, `packages/server/src/db/index.ts`.
   - *Testing:* Run `tests/integration.test.mjs` against a live PostgreSQL connection string.

2. **Additional Infrastructure Providers**
   - *What was requested:* Multi-provider support.
   - *What has been implemented:* Extensible `IProviderAdapter` with Equinix Metal and Hetzner adapters.
   - *What remains:* Implement AWS EC2 Bare Metal and Custom On-Premises API adapters.
   - *Files involved:* `packages/server/src/providers/`.

3. **Production SSL / Certificate Rotation Automation**
   - *What was requested:* Agent certificate / token rotation.
   - *What has been implemented:* Bearer secret rotation on enrollment and credential revocation via `/agent/agents/:id/revoke`.
   - *What remains:* Automated mTLS client certificate issuance via ACME or internal HashiCorp Vault CA.
   - *Files involved:* `packages/server/src/services/AgentService.ts`, `packages/agent/src/daemon.ts`.
