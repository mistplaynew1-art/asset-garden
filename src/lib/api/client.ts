/**
 * NexBet API Client — typed HTTP + WebSocket client.
 */

const BASE_URL = typeof window !== 'undefined'
  ? (import.meta.env.VITE_API_URL ?? 'http://localhost:3000')
  : 'http://localhost:3000';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: { idempotencyKey?: string },
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  if (options?.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) return request(method, path, body, options);
    throw new ApiError(401, 'Unauthorized');
  }

  const data = await res.json();
  if (!res.ok) throw new ApiError(res.status, data.error ?? data.message ?? 'Request failed');
  return data as T;
}

async function refreshToken(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return false;
    const data = await res.json();
    accessToken = data.accessToken;
    return true;
  } catch {
    return false;
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown, opts?: { idempotencyKey?: string }) =>
    request<T>('POST', path, body, opts),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

// WebSocket Manager
type WsHandler = (data: unknown) => void;

class NexBetSocket {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<WsHandler>>();
  private reconnectAttempts = 0;
  private maxReconnect = 10;

  connect() {
    if (typeof window === 'undefined') return;
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const wsUrl = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3000/ws';
    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        if (accessToken) this.send({ type: 'auth', token: accessToken });
        this.send({ type: 'subscribe', channel: 'odds' });
        this.send({ type: 'subscribe', channel: 'jackpots' });
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);
          const handlers = this.handlers.get(msg.type);
          if (handlers) handlers.forEach(h => h(msg.data));
        } catch { /* malformed message */ }
      };

      this.ws.onclose = () => {
        if (this.reconnectAttempts < this.maxReconnect) {
          const delay = Math.min(100 * Math.pow(2, this.reconnectAttempts), 30000) + Math.random() * 100;
          setTimeout(() => { this.reconnectAttempts++; this.connect(); }, delay);
        }
      };
    } catch { /* connection failed */ }
  }

  send(msg: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  on(type: string, handler: WsHandler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
    return () => { this.handlers.get(type)?.delete(handler); };
  }

  disconnect() {
    this.maxReconnect = 0;
    this.ws?.close();
  }
}

export const socket = new NexBetSocket();
