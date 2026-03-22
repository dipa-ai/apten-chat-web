import { getAccessToken } from './http';
import type { WsEvent } from './types';

type EventHandler = (event: WsEvent) => void;

const BASE_WS =
  import.meta.env.VITE_WS_URL ??
  `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}`;

class WsClient {
  private ws: WebSocket | null = null;
  private handlers: EventHandler[] = [];
  private reconnectDelay = 1000;
  private maxDelay = 30000;
  private shouldConnect = false;
  private queue: string[] = [];

  connect() {
    this.shouldConnect = true;
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.CONNECTING ||
        this.ws.readyState === WebSocket.OPEN)
    ) {
      return;
    }
    this.doConnect();
  }

  disconnect() {
    this.shouldConnect = false;
    this.ws?.close();
    this.ws = null;
  }

  subscribe(handler: EventHandler) {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  send(type: string, payload: unknown) {
    const msg = JSON.stringify({ type, payload });
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(msg);
    } else {
      this.queue.push(msg);
    }
  }

  private doConnect() {
    const token = getAccessToken();
    if (!token || !this.shouldConnect) return;

    this.ws = new WebSocket(`${BASE_WS}/api/ws?token=${token}`);

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
      for (const msg of this.queue) {
        this.ws!.send(msg);
      }
      this.queue = [];
    };

    this.ws.onmessage = (ev) => {
      try {
        const event: WsEvent = JSON.parse(ev.data);
        for (const h of this.handlers) h(event);
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      if (!this.shouldConnect) return;
      setTimeout(() => this.doConnect(), this.reconnectDelay);
      this.reconnectDelay = Math.min(
        this.reconnectDelay * 2,
        this.maxDelay,
      );
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }
}

export const wsClient = new WsClient();
