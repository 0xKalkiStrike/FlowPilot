import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

interface WebSocketMessage {
  type: string;
  payload: any;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private executionSubscribers: Map<string, Set<WebSocket>> = new Map();
  private recordingSubscribers: Map<string, Set<WebSocket>> = new Map();

  public init(server: Server) {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : '';
      if (pathname === '/ws' || pathname === '/ws/' || pathname.startsWith('/ws')) {
        this.wss?.handleUpgrade(request, socket, head, (ws) => {
          this.wss?.emit('connection', ws, request);
        });
      }
    });

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);

      ws.on('message', (data: string) => {
        try {
          const msg = JSON.parse(data.toString()) as WebSocketMessage;
          this.handleClientMessage(ws, msg);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        this.unsubscribeFromAll(ws);
      });

      ws.on('error', (err) => {
        this.clients.delete(ws);
        this.unsubscribeFromAll(ws);
      });

      // Send greeting
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'SYSTEM_STATUS',
          payload: { connected: true, timestamp: new Date().toISOString() }
        }));
      }
    });

    console.log('✓ WebSocket server initialized on /ws');
  }

  private handleClientMessage(ws: WebSocket, msg: WebSocketMessage) {
    switch (msg.type) {
      case 'SUBSCRIBE_EXECUTION': {
        const executionId = msg.payload?.executionId;
        if (executionId) {
          if (!this.executionSubscribers.has(executionId)) {
            this.executionSubscribers.set(executionId, new Set());
          }
          this.executionSubscribers.get(executionId)!.add(ws);
        }
        break;
      }
      case 'UNSUBSCRIBE_EXECUTION': {
        const executionId = msg.payload?.executionId;
        if (executionId && this.executionSubscribers.has(executionId)) {
          this.executionSubscribers.get(executionId)!.delete(ws);
        }
        break;
      }
      case 'SUBSCRIBE_RECORDING': {
        const recordingId = msg.payload?.recordingId;
        if (recordingId) {
          if (!this.recordingSubscribers.has(recordingId)) {
            this.recordingSubscribers.set(recordingId, new Set());
          }
          this.recordingSubscribers.get(recordingId)!.add(ws);
        }
        break;
      }
      case 'PING': {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'PONG', payload: { time: Date.now() } }));
        }
        break;
      }
    }
  }

  private unsubscribeFromAll(ws: WebSocket) {
    for (const subs of this.executionSubscribers.values()) {
      subs.delete(ws);
    }
    for (const subs of this.recordingSubscribers.values()) {
      subs.delete(ws);
    }
  }

  public broadcast(type: string, payload: any) {
    const message = JSON.stringify({ type, payload });
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch {}
      }
    }
  }

  public broadcastToExecution(executionId: string, type: string, payload: any) {
    const message = JSON.stringify({ type, payload: { ...payload, executionId } });
    const subs = this.executionSubscribers.get(executionId);
    if (subs) {
      for (const client of subs) {
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.send(message);
          } catch {}
        }
      }
    }
    this.broadcast(type, { ...payload, executionId });
  }

  public broadcastToRecording(recordingId: string, type: string, payload: any) {
    const message = JSON.stringify({ type, payload: { ...payload, recordingId } });
    const subs = this.recordingSubscribers.get(recordingId);
    if (subs) {
      for (const client of subs) {
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.send(message);
          } catch {}
        }
      }
    }
    this.broadcast(type, { ...payload, recordingId });
  }
}

export const wsManager = new WebSocketManager();
