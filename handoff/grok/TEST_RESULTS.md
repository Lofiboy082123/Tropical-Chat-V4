# Test Results — Tropical Control Center (TCC)

**Test Date:** November 2026
**Test Suite:** `tests/integration.test.mjs`
**Node.js Version:** v22.22.1
**Test Runner:** `node --test`
**Overall Result:** PASSED (11/11 tests)

---

## Detailed Results

```
TAP version 13
# Subtest: TCC Full System Integration Test
    # Subtest: 1. Health check returns UP and application identifier
    ok 1 - 1. Health check returns UP and application identifier
      ---
      duration_ms: 40.387838
      type: 'test'
      ...
    # Subtest: 2. Authentication with default administrator
    ok 2 - 2. Authentication with default administrator
      ---
      duration_ms: 180.717714
      type: 'test'
      ...
    # Subtest: 3. Create Enterprise Customer
    ok 3 - 3. Create Enterprise Customer
      ---
      duration_ms: 10.266202
      type: 'test'
      ...
    # Subtest: 4. Create Customer Contract with terms and renewal date
    ok 4 - 4. Create Customer Contract with terms and renewal date
      ---
      duration_ms: 7.384555
      type: 'test'
      ...
    # Subtest: 5. Queue and execute Provisioning Job
    ok 5 - 5. Queue and execute Provisioning Job
      ---
      duration_ms: 213.288153
      type: 'test'
      ...
    # Subtest: 6. Verify Server was added to Infrastructure Inventory
    ok 6 - 6. Verify Server was added to Infrastructure Inventory
      ---
      duration_ms: 4.830397
      type: 'test'
      ...
    # Subtest: 7. Verify Agent initially UNKNOWN, then ONLINE upon genuine heartbeat
    ok 7 - 7. Verify Agent initially UNKNOWN, then ONLINE upon genuine heartbeat
      ---
      duration_ms: 423.061872
      type: 'test'
      ...
    # Subtest: 8. Execute Controlled Remote Operations
    ok 8 - 8. Execute Controlled Remote Operations
      ---
      duration_ms: 7.022758
      type: 'test'
      ...
    # Subtest: 9. Verify Executive Dashboard Metrics reflects real database records
    ok 9 - 9. Verify Executive Dashboard Metrics reflects real database records
      ---
      duration_ms: 5.258489
      type: 'test'
      ...
    # Subtest: 10. Immutable Audit Trail records all actions
    ok 10 - 10. Immutable Audit Trail records all actions
      ---
      duration_ms: 4.040575
      type: 'test'
      ...
    1..10
ok 1 - TCC Full System Integration Test
  ---
  duration_ms: 1065.157074
  type: 'test'
  ...
1..1
# tests 11
# suites 0
# pass 11
# fail 0
# cancelled 0
# skipped 0
# todo 0
```
