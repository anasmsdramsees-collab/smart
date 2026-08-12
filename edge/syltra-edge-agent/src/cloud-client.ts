import mqtt, { MqttClient } from 'mqtt';
import fetch from 'node-fetch';
import { CommandMessage, EventMessage, HealthMessage, MqttTopics, StateMessage } from '@syltra/mqtt-contracts';
import { config } from './config';
import { logger } from './logger';
import { OfflineQueue } from './offline-queue';

const topics = {
  events: MqttTopics.events(config.cloud.tenantId, config.cloud.hubId),
  commands: MqttTopics.commands(config.cloud.tenantId, config.cloud.hubId),
  state: MqttTopics.state(config.cloud.tenantId, config.cloud.hubId),
  health: MqttTopics.health(config.cloud.tenantId, config.cloud.hubId),
};

interface QueuedMessage {
  topic: string;
  payload: unknown;
}

export class CloudClient {
  private client?: MqttClient;
  private readonly outbox = new OfflineQueue<QueuedMessage>();
  private connected = false;

  connectMqtt(onCommand: (payload: CommandMessage) => void): void {
    this.client = mqtt.connect(config.mqtt.brokerUrl, { reconnectPeriod: 2000 });

    this.client.on('connect', () => {
      logger.info('Connected to SYLTRA Cloud MQTT broker');
      this.connected = true;
      this.client?.subscribe(topics.commands);
      this.flushOutbox();
    });

    this.client.on('close', () => {
      this.connected = false;
      logger.warn('Disconnected from SYLTRA Cloud MQTT broker — queuing outgoing messages');
    });

    this.client.on('error', (err) => logger.error(`MQTT error: ${err.message}`));

    this.client.on('message', (topic, payloadBuffer) => {
      if (topic !== topics.commands) return;
      try {
        onCommand(JSON.parse(payloadBuffer.toString()));
      } catch {
        logger.warn('Ignoring malformed command message');
      }
    });
  }

  publishState(payload: StateMessage): void {
    this.publish(topics.state, payload);
  }

  publishEvent(payload: EventMessage): void {
    this.publish(topics.events, payload);
  }

  publishHealth(payload: HealthMessage): void {
    this.publish(topics.health, payload);
  }

  private publish(topic: string, payload: unknown): void {
    if (!this.connected || !this.client) {
      this.outbox.push({ topic, payload });
      return;
    }
    this.client.publish(topic, JSON.stringify(payload));
  }

  private flushOutbox(): void {
    const queued = this.outbox.drain();
    if (queued.length === 0) return;
    logger.info(`Flushing ${queued.length} queued message(s) after reconnect`);
    for (const { topic, payload } of queued) {
      this.client?.publish(topic, JSON.stringify(payload));
    }
  }

  async upsertDevice(body: unknown): Promise<void> {
    const res = await fetch(`${config.cloud.apiUrl}/v1/hubs/${config.cloud.hubId}/devices`, {
      method: 'POST',
      headers: { ...this.authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Device upsert failed: ${res.status} ${text}`);
    }
  }

  async sendHeartbeat(): Promise<void> {
    const res = await fetch(`${config.cloud.apiUrl}/v1/hubs/${config.cloud.hubId}/heartbeat`, {
      method: 'POST',
      headers: this.authHeaders(),
    });
    if (!res.ok) {
      logger.warn(`Heartbeat failed: ${res.status}`);
    }
  }

  private authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${config.cloud.hubToken}` };
  }
}
