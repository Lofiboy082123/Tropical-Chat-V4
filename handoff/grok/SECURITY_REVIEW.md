# Security Review — Tropical Control Center (TCC)

**Tropical Servers · Secure. Reliable. Tropical.**
**Status:** Approved for Commercial Production Staging

---

## 1. Authentication and Credential Hardening
- **Password Storage:** bcrypt with 10 salt rounds. No plaintext passwords stored.
- **Session Tokens:** Stateless JWT tokens signed with SHA-256 HMAC (`JWT_SECRET`, min 32 chars).
- **Brute-Force Protection:** 5 consecutive failed login attempts trigger an automatic 15-minute lockout (`locked_until`). All login attempts (successful and failed) are recorded in `login_history`.
- **Agent Mutual Authentication:** Customer agents enroll via one-time tokens and are issued unique cryptographic bearer secrets. Hashes are verified using bcrypt during every heartbeat.

## 2. Authorization and RBAC
- **Configurable Permissions:** Permissions (`INFRA_VIEW`, `INFRA_PROVISION`, `REMOTE_EXECUTE`, `CONTRACT_ENFORCE`, etc.) are decoupled from job titles and bound via `role_permissions`.
- **Least Privilege:** Default roles range from `Read-only Auditor` to `Executive Operations Overseer`.

## 3. Remote Operations Safeguards
- **Arbitrary Code Execution Prevention:** The remote operations subsystem enforces strict command whitelisting (`GET_SERVICE_STATUS`, `GET_DIAGNOSTICS`, `RESTART_SERVICE`, `SCHEDULE_MAINTENANCE`, `UPGRADE_AGENT`). Unauthenticated or arbitrary shell strings are rejected.
- **Disruptive Actions:** Services restarts and maintenance windows require explicit confirmation acknowledgement (`confirmation_acknowledged: true`) and administrative audit logging.

## 4. Contract Enforcement Safeguards
- **Destruction Prevention:** The policy engine prevents automated data destruction or server wipeouts. Suspensions require explicit administrative decisions with mandatory notice and grace periods. Suspended infrastructure remains recoverable.

## 5. Network & API Protection
- **Rate Limiting:** In-memory sliding window rate limiter protects endpoints from DoS attacks (default 1000 requests per 15-minute window per IP).
- **Correlation Tracking:** `x-correlation-id` is attached to all inbound requests and logged in the immutable audit log for forensics.
