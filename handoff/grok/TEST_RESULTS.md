# Test Results — Tropical Control Center (TCC)

**Test Date:** November 2026
**Test Suite:** `tests/integration.test.mjs`
**Node.js Version:** v22.22.1
**Test Runner:** `node --test`
**Overall Result:** PASSED (13/13 tests)

---

## Detailed Results

```
TAP version 13
# Subtest: TCC Full System Integration Test
    # Subtest: 1. Health check returns UP and application identifier
    ok 1 - 1. Health check returns UP and application identifier
      ---
      duration_ms: 36.529182
      type: 'test'
      ...
    # Subtest: 2. Authentication with default administrator
    ok 2 - 2. Authentication with default administrator
      ---
      duration_ms: 183.217774
      type: 'test'
      ...
    # Subtest: 3. Verify Multi-Provider Registry includes Equinix, Hetzner, and AWS
    ok 3 - 3. Verify Multi-Provider Registry includes Equinix, Hetzner, and AWS
      ---
      duration_ms: 7.148232
      type: 'test'
      ...
    # Subtest: 4. Create Enterprise Customer
    ok 4 - 4. Create Enterprise Customer
      ---
      duration_ms: 8.567144
      type: 'test'
      ...
    # Subtest: 5. Create Customer Contract with terms and renewal date
    ok 5 - 5. Create Customer Contract with terms and renewal date
      ---
      duration_ms: 7.26733
      type: 'test'
      ...
    # Subtest: 6. Queue and execute AWS Bare Metal Provisioning Job
    ok 6 - 6. Queue and execute AWS Bare Metal Provisioning Job
      ---
      duration_ms: 211.151304
      type: 'test'
      ...
    # Subtest: 7. Verify AWS Server was added to Infrastructure Inventory
    ok 7 - 7. Verify AWS Server was added to Infrastructure Inventory
      ---
      duration_ms: 4.394816
      type: 'test'
      ...
    # Subtest: 8. Verify Agent enrollment and genuine hardware telemetry calculation
    ok 8 - 8. Verify Agent enrollment and genuine hardware telemetry calculation
      ---
      duration_ms: 437.743847
      type: 'test'
      ...
    # Subtest: 9. Verify Service Enforcement workflow (Grace Period Notice & Suspension)
    ok 9 - 9. Verify Service Enforcement workflow (Grace Period Notice & Suspension)
      ---
      duration_ms: 15.79477
      type: 'test'
      ...
    # Subtest: 10. Create and manage Operational Incident
    ok 10 - 10. Create and manage Operational Incident
      ---
      duration_ms: 13.810652
      type: 'test'
      ...
    # Subtest: 11. Verify Executive Dashboard Metrics reflects real infrastructure utilization
    ok 11 - 11. Verify Executive Dashboard Metrics reflects real infrastructure utilization
      ---
      duration_ms: 7.473693
      type: 'test'
      ...
    # Subtest: 12. Immutable Audit Trail records all actions
    ok 12 - 12. Immutable Audit Trail records all actions
      ---
      duration_ms: 6.042096
      type: 'test'
      ...
    1..12
ok 1 - TCC Full System Integration Test
  ---
  duration_ms: 1107.544516
  type: 'test'
  ...
1..1
# tests 13
# suites 0
# pass 13
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1470.289255
```
