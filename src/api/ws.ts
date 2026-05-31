import { getAccessToken } from './http';
import type { WsEvent } from './types';

type EventHandler = (event: WsEvent) => void;

export type WsStatus =
  | 'idle'
  | 'connecting'
  | 'open'
  | 'reconnecting'
  | 'offline';
type StatusHandler = (status: WsStatus) => void;

const BASE_WS =
  import.meta.env.VITE_WS_URL ??
  `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}`;

class WsClient {
  private ws: WebSocket | null = null;
  private handlers: EventHandler[] = [];
  private statusHandlers: StatusHandler[] = [];
  private status: WsStatus = 'idle';
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
    this.setStatus('idle');
  }

  // subscribeStatus registers a connection-status listener and immediately
  // delivers the current status. Returns an unsubscribe function.
  subscribeStatus(handler: StatusHandler) {
    this.statusHandlers.push(handler);
    handler(this.status);
    return () => {
      this.statusHandlers = this.statusHandlers.filter((h) => h !== handler);
    };
  }

  private setStatus(status: WsStatus) {
    if (this.status === status) return;
    this.status = status;
    for (const handler of this.statusHandlers) handler(status);
  }

  // Reconnect using the freshest access token. Called after an HTTP token
  // refresh so a long-lived socket doesn't keep using an expired token.
  reconnectWithLatestToken() {
    if (!this.shouldConnect) return;
    this.ws?.close();
    this.ws = null;
    this.doConnect();
  }

  subscribe(handler: EventHandler) {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  // Returns true if the event was handed to the underlying socket right
  // away, false if it was queued because the socket is not open.
  send(type: string, payload: unknown): boolean {
    const msg = JSON.stringify({ type, payload });
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(msg);
      return true;
    }
    this.queue.push(msg);
    return false;
  }

  isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private doConnect() {
    const token = getAccessToken();
    if (!token || !this.shouldConnect) return;
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.CONNECTING ||
        this.ws.readyState === WebSocket.OPEN)
    ) {
      return;
    }

    // 'connecting' on the first attempt; during a reconnect loop the status is
    // already 'reconnecting' (set in onclose) and should stay that way.
    if (this.status === 'idle' || this.status === 'open') {
      this.setStatus('connecting');
    }

    // The access token rides in the WebSocket subprotocol rather than the URL
    // query string, so it never lands in server logs or browser history.
    this.ws = new WebSocket(`${BASE_WS}/api/ws`, [`apten-chat.jwt.${token}`]);

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
      this.setStatus('open');
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
      if (!this.shouldConnect) {
        this.setStatus('idle');
        return;
      }
      // navigator.onLine distinguishes "the network is down" (offline) from
      // "the server dropped us but we have connectivity" (reconnecting).
      this.setStatus(navigator.onLine ? 'reconnecting' : 'offline');
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
