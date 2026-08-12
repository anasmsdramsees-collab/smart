import fetch from 'node-fetch';
import WebSocket from 'ws';
import { config } from './config';
import { logger } from './logger';

export interface HaState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
}

export interface HaStateChangedEvent {
  entity_id: string;
  new_state: HaState | null;
  old_state: HaState | null;
}

type StateChangeHandler = (event: HaStateChangedEvent) => void;

export class HaClient {
  private ws?: WebSocket;
  private wsMessageId = 1;
  private stateChangeHandlers: StateChangeHandler[] = [];
  private reconnectTimer?: NodeJS.Timeout;

  async getStates(): Promise<HaState[]> {
    const res = await fetch(`${config.homeAssistant.url}/api/states`, {
      headers: this.authHeaders(),
    });
    if (!res.ok) {
      throw new Error(`HA GET /api/states failed: ${res.status}`);
    }
    return (await res.json()) as HaState[];
  }

  async callService(domain: string, service: string, serviceData: Record<string, unknown>): Promise<void> {
    const res = await fetch(`${config.homeAssistant.url}/api/services/${domain}/${service}`, {
      method: 'POST',
      headers: { ...this.authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(serviceData),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HA service call ${domain}.${service} failed: ${res.status} ${body}`);
    }
  }

  onStateChange(handler: StateChangeHandler): void {
    this.stateChangeHandlers.push(handler);
  }

  connectWebSocket(): void {
    const wsUrl = config.homeAssistant.url.replace(/^http/, 'ws') + '/api/websocket';
    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => logger.info('Connected to Home Assistant WebSocket'));

    this.ws.on('message', (raw) => {
      const message = JSON.parse(raw.toString());
      if (message.type === 'auth_required') {
        this.ws?.send(JSON.stringify({ type: 'auth', access_token: config.homeAssistant.token }));
      } else if (message.type === 'auth_ok') {
        logger.info('Home Assistant WebSocket authenticated');
        this.subscribeToStateChanges();
      } else if (message.type === 'auth_invalid') {
        logger.error('Home Assistant WebSocket authentication failed');
      } else if (message.type === 'event' && message.event?.event_type === 'state_changed') {
        const data = message.event.data as HaStateChangedEvent;
        for (const handler of this.stateChangeHandlers) {
          handler(data);
        }
      }
    });

    this.ws.on('close', () => {
      logger.warn('Home Assistant WebSocket closed, reconnecting in 5s');
      this.reconnectTimer = setTimeout(() => this.connectWebSocket(), 5000);
    });

    this.ws.on('error', (err) => logger.error(`Home Assistant WebSocket error: ${err.message}`));
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }

  private subscribeToStateChanges(): void {
    this.ws?.send(JSON.stringify({ id: this.wsMessageId++, type: 'subscribe_events', event_type: 'state_changed' }));
  }

  private authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${config.homeAssistant.token}` };
  }
}
