import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { AuthService } from './AuthService.js';

export class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private desktopClients = new Set<WebSocket>();
  private agentClients = new Map<string, WebSocket>();

  constructor(private authService: AuthService) {}

  initialize(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
      const token = url.searchParams.get('token');
      const clientType = url.searchParams.get('type') || 'desktop';
      const agentId = url.searchParams.get('agentId');

      if (clientType === 'desktop') {
        if (!token) {
          ws.close(4001, 'Unauthorized: Desktop token required');
          return;
        }
        const decoded = this.authService.verifyToken(token);
        if (!decoded) {
          ws.close(4001, 'Unauthorized: Invalid token');
          return;
        }
        this.desktopClients.add(ws);

        ws.on('close', () => {
          this.desktopClients.delete(ws);
        });
      } else if (clientType === 'agent') {
        if (!agentId) {
          ws.close(4002, 'Agent ID required');
          return;
        }
        this.agentClients.set(agentId, ws);

        ws.on('close', () => {
          this.agentClients.delete(agentId);
        });
      }
    });
  }

  broadcastToDesktop(event: string, payload: any): void {
    const message = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
    for (const ws of this.desktopClients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }

  sendToAgent(agentId: string, message: any): boolean {
    const ws = this.agentClients.get(agentId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }
}
