export * from './collector.js';
export * from './daemon.js';

import { TropicalAgentDaemon } from './daemon.js';

if (import.meta.url === `file://${process.argv[1]}`) {
  const serverUrl = process.env.TCC_SERVER_URL || 'http://localhost:4000';
  const enrollmentToken = process.env.TCC_ENROLLMENT_TOKEN;
  const agentId = process.env.TCC_AGENT_ID;
  const authToken = process.env.TCC_AUTH_TOKEN;

  const daemon = new TropicalAgentDaemon({
    serverUrl,
    enrollmentToken,
    agentId,
    authToken,
  });

  daemon.start().catch((err) => {
    console.error('Fatal agent error:', err);
    process.exit(1);
  });

  process.on('SIGTERM', () => {
    daemon.stop();
    process.exit(0);
  });
  process.on('SIGINT', () => {
    daemon.stop();
    process.exit(0);
  });
}
