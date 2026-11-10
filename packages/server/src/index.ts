import express from 'express';
import http from 'http';
import cors from 'cors';
import { config } from './config.js';
import { getDatabase } from './db/index.js';
import { correlationMiddleware, rateLimitMiddleware } from './middleware/common.js';
import { AuthService } from './services/AuthService.js';
import { AuditService } from './services/AuditService.js';
import { DashboardService } from './services/DashboardService.js';
import { InfrastructureService } from './services/InfrastructureService.js';
import { ProviderRegistry } from './providers/ProviderRegistry.js';
import { ProvisioningEngine } from './services/ProvisioningEngine.js';
import { WebSocketManager } from './services/WebSocketManager.js';
import { AgentService } from './services/AgentService.js';
import { CustomerService } from './services/CustomerService.js';
import { ContractService } from './services/ContractService.js';
import { IncidentService } from './services/IncidentService.js';
import { RemoteOperationsService } from './services/RemoteOperationsService.js';

import { createAuthRouter } from './routes/auth.js';
import { createDashboardRouter } from './routes/dashboard.js';
import { createInfrastructureRouter } from './routes/infrastructure.js';
import { createProvisioningRouter } from './routes/provisioning.js';
import { createAgentRouter } from './routes/agent.js';
import { createCustomerContractRouter } from './routes/customerContract.js';
import { createAdminAuditRouter } from './routes/adminAudit.js';
import { createRemoteOperationsRouter } from './routes/remoteOperations.js';

export async function createServer() {
  const app = express();
  const server = http.createServer(app);

  const db = await getDatabase();

  const auditService = new AuditService(db);
  const authService = new AuthService(db, auditService);
  const wsManager = new WebSocketManager(authService);
  const dashboardService = new DashboardService(db);
  const infraService = new InfrastructureService(db, auditService);
  const providerRegistry = new ProviderRegistry();
  const provisioningEngine = new ProvisioningEngine(db, providerRegistry, auditService, wsManager);
  const agentService = new AgentService(db, auditService, wsManager);
  const customerService = new CustomerService(db, auditService);
  const contractService = new ContractService(db, auditService);
  const incidentService = new IncidentService(db, auditService, wsManager);
  const remoteService = new RemoteOperationsService(db, agentService, auditService, wsManager);

  wsManager.initialize(server);

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(correlationMiddleware);
  app.use(rateLimitMiddleware(config.rateLimit.windowMs, config.rateLimit.maxRequests));

  app.get('/health', (_req, res) => {
    res.json({
      status: 'UP',
      application: 'Tropical Control Center',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/v1/auth', createAuthRouter(authService));
  app.use('/api/v1/dashboard', createDashboardRouter(dashboardService, authService));
  app.use('/api/v1/infrastructure', createInfrastructureRouter(infraService, authService));
  app.use('/api/v1/provisioning', createProvisioningRouter(provisioningEngine, providerRegistry, authService));
  app.use('/api/v1/agent', createAgentRouter(agentService, authService));
  app.use('/api/v1/management', createCustomerContractRouter(customerService, contractService, authService));
  app.use('/api/v1/admin', createAdminAuditRouter(auditService, incidentService, authService));
  app.use('/api/v1/remote', createRemoteOperationsRouter(remoteService, authService));

  return { app, server, db };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createServer().then(({ server }) => {
    server.listen(config.port, config.host, () => {
      console.log(`🌴 Tropical Control Center Backend running at http://${config.host}:${config.port}`);
      console.log(`🌴 Motto: Secure. Reliable. Tropical.`);
    });
  });
}
