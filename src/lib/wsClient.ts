type MessageHandler = (msg: { type: string; payload: any }) => void;

class FlowPilotWebSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Set<MessageHandler> = new Set();
  private reconnectTimer: any = null;
  private failureCount = 0;
  private fallbackPollingTimer: any = null;
  private activeExecutionId: string | null = null;
  private lastLogCount = 0;
  private isExplicitlyClosed = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.failureCount = 0;
        this.stopPollingFallback();
        this.send({ type: 'PING', payload: { clientTime: Date.now() } });
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          this.emit(parsed);
        } catch {}
      };

      this.ws.onclose = () => {
        this.failureCount++;
        if (this.failureCount >= 2) {
          // Switch to HTTP polling fallback for tunnels (e.g. localtunnel) that block WebSockets
          this.startPollingFallback();
        }
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        // Handled by onclose
      };
    } catch (err) {
      this.failureCount++;
      this.startPollingFallback();
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(10000, 3000 * Math.max(1, this.failureCount));
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private startPollingFallback() {
    if (this.fallbackPollingTimer) return;
    this.fallbackPollingTimer = setInterval(async () => {
      if (!this.activeExecutionId) return;

      try {
        const res = await fetch(`/api/executions/${this.activeExecutionId}/poll`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.data) {
          const exec = data.data;

          // Emit active node
          if (exec.current_node_id) {
            this.emit({
              type: 'EXECUTION_NODE_START',
              payload: { nodeId: exec.current_node_id, executionId: this.activeExecutionId }
            });
          }

          // Emit new logs
          if (Array.isArray(exec.logs) && exec.logs.length > this.lastLogCount) {
            const newLogs = exec.logs.slice(this.lastLogCount);
            newLogs.forEach((l: any) => {
              this.emit({ type: 'EXECUTION_LOG', payload: l });
            });
            this.lastLogCount = exec.logs.length;
          }

          // Emit screenshots
          if (Array.isArray(exec.screenshots)) {
            exec.screenshots.forEach((s: string) => {
              this.emit({ type: 'EXECUTION_SCREENSHOT', payload: { filename: s } });
            });
          }

          // Status changes
          if (exec.status === 'SUCCESS' || exec.status === 'FAILED' || exec.status === 'CANCELLED') {
            this.emit({
              type: 'EXECUTION_COMPLETED',
              payload: { executionId: this.activeExecutionId, status: exec.status }
            });
          } else if (exec.status === 'PAUSED') {
            this.emit({
              type: 'EXECUTION_PAUSED',
              payload: { executionId: this.activeExecutionId, reason: 'Human verification required' }
            });
          }
        }
      } catch {}
    }, 1500);
  }

  private stopPollingFallback() {
    if (this.fallbackPollingTimer) {
      clearInterval(this.fallbackPollingTimer);
      this.fallbackPollingTimer = null;
    }
  }

  public setActiveExecution(id: string | null) {
    this.activeExecutionId = id;
    this.lastLogCount = 0;
  }

  public emit(parsed: { type: string; payload: any }) {
    for (const listener of this.listeners) {
      try {
        listener(parsed);
      } catch (err) {
        console.error('Error in listener:', err);
      }
    }
  }

  public subscribe(handler: MessageHandler): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  public send(data: any) {
    if (data.type === 'SUBSCRIBE_EXECUTION' && data.payload?.executionId) {
      this.setActiveExecution(data.payload.executionId);
    }

    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
    } else if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
      this.ws.addEventListener('open', () => {
        try {
          this.ws?.send(payload);
        } catch {}
      }, { once: true });
    }
  }
}

export const wsClient = new FlowPilotWebSocketClient();
