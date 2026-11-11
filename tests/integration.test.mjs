import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../packages/server/dist/index.js';
import { TropicalAgentDaemon } from '../packages/agent/dist/daemon.js';

test('TCC Full System Integration Test', async (t) => {
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
  let activeDaemon = null;

  t.after(async () => {
    if (activeDaemon) activeDaemon.stop();
    await new Promise((resolve) => server.close(() => resolve()));
    await db.close();
  });

  let authToken = '';
  let customerId = '';
  let serverId = '';
  let agentId = '';
  let contractId = '';

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
    assert.equal(data.user.roleName, 'Senior Executive Chairman');
    authToken = data.token;
  });

  await t.test('3. Verify Multi-Provider Registry includes Equinix, Hetzner, AWS, and OVHcloud', async () => {
    const res = await fetch(`${baseUrl}/provisioning/providers`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.equal(res.status, 200);
    const providers = await res.json();
    assert.equal(providers.length, 4);
    const types = providers.map((p) => p.providerType);
    assert.ok(types.includes('ovhcloud'));
    assert.ok(types.includes('equinix_metal'));
    assert.ok(types.includes('hetzner'));
    assert.ok(types.includes('aws'));
  });

  await t.test('4. Create Enterprise Customer', async () => {
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

  await t.test('5. Create Customer Contract with terms and renewal date', async () => {
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
    contractId = data.id;
  });

  await t.test('6. Queue and execute AWS Bare Metal Provisioning Job', async () => {
    const res = await fetch(`${baseUrl}/provisioning/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        customerId,
        provider: 'aws',
        targetHostname: 'node-ai-gpu-aws.tropical.internal',
        targetOs: 'Ubuntu 22.04 LTS',
        planId: 'c5.metal',
        location: 'us-east-1',
      }),
    });
    assert.equal(res.status, 202);
    const job = await res.json();
    assert.ok(job.id);

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

  await t.test('7. Verify AWS Server was added to Infrastructure Inventory', async () => {
    const res = await fetch(`${baseUrl}/infrastructure/servers/${serverId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.equal(res.status, 200);
    const serverRecord = await res.json();
    assert.equal(serverRecord.hostname, 'node-ai-gpu-aws.tropical.internal');
    assert.equal(serverRecord.provider, 'aws');
    assert.equal(serverRecord.assignedCustomerId, customerId);
    assert.ok(serverRecord.agentId);
    agentId = serverRecord.agentId;
  });

  await t.test('8. Verify Agent enrollment and genuine hardware telemetry calculation', async () => {
    const agentRes = await fetch(`${baseUrl}/agent/agents`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const agents = await agentRes.json();
    const agt = agents.find((a) => a.id === agentId);
    assert.ok(agt);
    assert.equal(agt.status, 'UNKNOWN');
    assert.ok(agt.enrollmentToken);

    activeDaemon = new TropicalAgentDaemon({
      serverUrl: `http://127.0.0.1:${port}`,
      enrollmentToken: agt.enrollmentToken,
    });

    await activeDaemon.start();
    const heartbeatOk = await activeDaemon.sendHeartbeat();
    assert.equal(heartbeatOk, true);

    const agentOnlineRes = await fetch(`${baseUrl}/agent/agents`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const updatedAgents = await agentOnlineRes.json();
    const updatedAgt = updatedAgents.find((a) => a.id === agentId);
    assert.equal(updatedAgt.status, 'ONLINE');
    assert.ok(updatedAgt.latestTelemetry);
    assert.ok(updatedAgt.latestTelemetry.cpuUsagePercent >= 0);
  });

  await t.test('9. Verify Service Enforcement workflow (Grace Period Notice & Suspension)', async () => {
    const noticeRes = await fetch(`${baseUrl}/management/contracts/enforce`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        contractId,
        actionType: 'GRACE_PERIOD_NOTICE',
        reason: 'Payment 30 days overdue; 7-day cure window granted',
        gracePeriodDays: 7,
      }),
    });
    assert.equal(noticeRes.status, 200);
    const noticeData = await noticeRes.json();
    assert.ok(noticeData.gracePeriodEndsAt);

    const suspRes = await fetch(`${baseUrl}/management/contracts/enforce`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        contractId,
        actionType: 'SUSPENSION',
        reason: 'Grace period expired without settlement',
      }),
    });
    assert.equal(suspRes.status, 200);

    const contractCheck = await fetch(`${baseUrl}/management/contracts`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const contracts = await contractCheck.json();
    const targetContract = contracts.find((c) => c.id === contractId);
    assert.equal(targetContract.status, 'SUSPENDED');
  });

  await t.test('10. Create and manage Operational Incident', async () => {
    const res = await fetch(`${baseUrl}/admin/incidents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        title: 'BGP peering degradation at Equinix Dallas',
        severity: 'HIGH',
        description: 'Upstream transit packet loss observed on transit link.',
      }),
    });
    assert.equal(res.status, 201);
    const inc = await res.json();
    assert.equal(inc.status, 'OPEN');

    const patchRes = await fetch(`${baseUrl}/admin/incidents/${inc.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ status: 'RESOLVED' }),
    });
    assert.equal(patchRes.status, 200);
    const resolvedInc = await patchRes.json();
    assert.equal(resolvedInc.status, 'RESOLVED');
  });

  await t.test('11. Verify Executive Dashboard Metrics reflects real infrastructure utilization', async () => {
    const res = await fetch(`${baseUrl}/dashboard/metrics`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.equal(res.status, 200);
    const metrics = await res.json();
    assert.equal(metrics.totalManagedServers, 1);
    assert.equal(metrics.onlineServers, 1);
    assert.equal(metrics.totalRegisteredAgents, 1);
    assert.equal(metrics.onlineAgents, 1);
    // customer suspended in step 9, so activeCustomers is 0
    assert.equal(metrics.activeCustomers, 0);
    assert.ok(metrics.utilization);
    assert.equal(metrics.utilization.reportingAgentsCount, 1);
    assert.ok(metrics.utilization.averageCpuPercent >= 0);
  });

  await t.test('12. Immutable Audit Trail records all actions', async () => {
    const res = await fetch(`${baseUrl}/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.equal(res.status, 200);
    const logs = await res.json();
    assert.ok(logs.length >= 6);
    const actions = logs.map((l) => l.action);
    assert.ok(actions.includes('USER_LOGIN'));
    assert.ok(actions.includes('CUSTOMER_CREATE'));
    assert.ok(actions.includes('CONTRACT_CREATE'));
    assert.ok(actions.includes('PROVISIONING_JOB_QUEUED'));
    assert.ok(actions.includes('CONTRACT_ENFORCEMENT_GRACE_PERIOD_NOTICE'));
    assert.ok(actions.includes('CONTRACT_ENFORCEMENT_SUSPENSION'));
  });
});
