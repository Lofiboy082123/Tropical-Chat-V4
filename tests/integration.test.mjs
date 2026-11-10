import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../packages/server/dist/index.js';
import { TropicalAgentDaemon } from '../packages/agent/dist/daemon.js';

test('TCC Full System Integration Test', async (t) => {
  // Ensure fresh database for integration test
  try {
    const fs = await import('fs');
    if (fs.existsSync('./data/tcc.sqlite')) {
      fs.unlinkSync('./data/tcc.sqlite');
    }
  } catch (e) {}

  const { app, server, db } = await createServer();
  const port = 4999;

  await new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve());
  });

  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  t.after(async () => {
    await new Promise((resolve) => server.close(() => resolve()));
    await db.close();
  });

  let authToken = '';
  let customerId = '';
  let serverId = '';
  let agentId = '';

  await t.test('1. Health check returns UP and application identifier', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'UP');
    assert.equal(data.application, 'Tropical Control Center');
  });

  await t.test('2. Authentication with default administrator', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'Tropical2026!' }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.token);
    assert.equal(data.user.username, 'admin');
    assert.equal(data.user.roleName, 'Executive Operations Overseer');
    authToken = data.token;
  });

  await t.test('3. Create Enterprise Customer', async () => {
    const res = await fetch(`${baseUrl}/management/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        companyName: 'Biscayne AI Labs',
        contact: {
          primaryName: 'Elena Rostova',
          email: 'elena@biscayne-ai.internal',
          phone: '+1-305-555-0199',
        },
        serviceTier: 'AI High-Performance',
        activeServices: ['Dedicated GPU Compute', 'Managed Agent Telemetry'],
      }),
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.id);
    assert.equal(data.companyName, 'Biscayne AI Labs');
    customerId = data.id;
  });

  await t.test('4. Create Customer Contract with terms and renewal date', async () => {
    const res = await fetch(`${baseUrl}/management/contracts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        customerId,
        title: 'Mission Critical Bare Metal Cluster 2026',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        renewalDate: '2026-11-30',
        monthlyValueUsd: 4500,
        assignedServiceKeys: ['GPU-CLUSTER-01'],
      }),
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.id);
    assert.equal(data.status, 'ACTIVE');
  });

  await t.test('5. Queue and execute Provisioning Job', async () => {
    const res = await fetch(`${baseUrl}/provisioning/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        customerId,
        provider: 'equinix_metal',
        targetHostname: 'node-ai-prod-01.tropical.internal',
        targetOs: 'Ubuntu 22.04 LTS',
        planId: 'c3.medium.x86',
        location: 'da',
      }),
    });
    assert.equal(res.status, 202);
    const job = await res.json();
    assert.ok(job.id);

    // Wait briefly for asynchronous provisioning engine state machine to complete
    let completedJob = null;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 200));
      const pollRes = await fetch(`${baseUrl}/provisioning/jobs/${job.id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const current = await pollRes.json();
      if (current.state === 'COMPLETED' || current.state === 'FAILED') {
        completedJob = current;
        break;
      }
    }

    assert.ok(completedJob, 'Job did not finish in time');
    assert.equal(completedJob.state, 'COMPLETED');
    assert.ok(completedJob.serverId);
    serverId = completedJob.serverId;
  });

  await t.test('6. Verify Server was added to Infrastructure Inventory', async () => {
    const res = await fetch(`${baseUrl}/infrastructure/servers/${serverId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.equal(res.status, 200);
    const serverRecord = await res.json();
    assert.equal(serverRecord.hostname, 'node-ai-prod-01.tropical.internal');
    assert.equal(serverRecord.assignedCustomerId, customerId);
    assert.ok(serverRecord.agentId);
    agentId = serverRecord.agentId;
  });

  await t.test('7. Verify Agent initially UNKNOWN, then ONLINE upon genuine heartbeat', async () => {
    // Read agent record
    const agentRes = await fetch(`${baseUrl}/agent/agents`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const agents = await agentRes.json();
    const agt = agents.find((a) => a.id === agentId);
    assert.ok(agt);
    assert.equal(agt.status, 'UNKNOWN');
    assert.ok(agt.enrollmentToken);

    // Run agent daemon enrollment & heartbeat
    const daemon = new TropicalAgentDaemon({
      serverUrl: `http://127.0.0.1:${port}`,
      enrollmentToken: agt.enrollmentToken,
    });

    await daemon.start();
    const heartbeatOk = await daemon.sendHeartbeat();
    assert.equal(heartbeatOk, true);

    // Check agent is now ONLINE
    const agentOnlineRes = await fetch(`${baseUrl}/agent/agents`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const updatedAgents = await agentOnlineRes.json();
    const updatedAgt = updatedAgents.find((a) => a.id === agentId);
    assert.equal(updatedAgt.status, 'ONLINE');
    assert.ok(updatedAgt.latestTelemetry);
    assert.ok(updatedAgt.latestTelemetry.cpuUsagePercent >= 0);

    daemon.stop();
  });

  await t.test('8. Execute Controlled Remote Operations', async () => {
    const res = await fetch(`${baseUrl}/remote/operations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        agentId,
        commandType: 'GET_DIAGNOSTICS',
      }),
    });
    assert.equal(res.status, 200);
    const op = await res.json();
    assert.equal(op.status, 'SUCCESS');
    assert.ok(op.output.includes('Diagnostic Analysis'));
  });

  await t.test('9. Verify Executive Dashboard Metrics reflects real database records', async () => {
    const res = await fetch(`${baseUrl}/dashboard/metrics`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.equal(res.status, 200);
    const metrics = await res.json();
    assert.equal(metrics.totalManagedServers, 1);
    assert.equal(metrics.onlineServers, 1);
    assert.equal(metrics.totalRegisteredAgents, 1);
    assert.equal(metrics.onlineAgents, 1);
    assert.equal(metrics.activeCustomers, 1);
    assert.equal(metrics.activeDeployments, 1);
    assert.equal(metrics.systemHealth, 'OPTIMAL');
  });

  await t.test('10. Immutable Audit Trail records all actions', async () => {
    const res = await fetch(`${baseUrl}/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.equal(res.status, 200);
    const logs = await res.json();
    assert.ok(logs.length > 5);
    const actions = logs.map((l) => l.action);
    assert.ok(actions.includes('USER_LOGIN'));
    assert.ok(actions.includes('CUSTOMER_CREATE'));
    assert.ok(actions.includes('CONTRACT_CREATE'));
    assert.ok(actions.includes('PROVISIONING_JOB_QUEUED'));
    assert.ok(actions.includes('REMOTE_OPERATION_GET_DIAGNOSTICS'));
  });
});
