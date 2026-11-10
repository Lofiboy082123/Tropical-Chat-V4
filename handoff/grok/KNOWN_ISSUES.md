# Known Issues — Tropical Control Center (TCC)

**Tropical Servers · Secure. Reliable. Tropical.**
**Release:** v1.0.0

---

1. **Development Rate Limiter Persistence**
   - *Current State:* Rate limiting tracking is held in-memory via `requestCounts`.
   - *Production Recommendation:* For multi-node backend clusters, integrate Redis or Memcached as the shared rate-limiting store.

2. **Provider Live API Keys in Demo Profile**
   - *Current State:* In the default sandbox environment, Equinix Metal and Hetzner adapters run with active deterministic provider credentials and standard synthetic response confirmation.
   - *Production Recommendation:* Supply production API keys via environment variables `EQUINIX_METAL_API_KEY` and `HETZNER_API_TOKEN` before launching real commercial provisioning.

3. **In-Memory WebSocket Client Tracking**
   - *Current State:* WebSocket desktop and agent client maps are local to the running Node process.
   - *Production Recommendation:* Add a Redis Pub/Sub backplane when scaling backend instances horizontally.
