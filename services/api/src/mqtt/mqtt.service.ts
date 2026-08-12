import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mqtt, { MqttClient } from 'mqtt';
import { SyltraConfig } from '../config/configuration';

type MessageHandler = (topic: string, payload: unknown) => void;

interface Subscription {
  topicPattern: string;
  pattern: RegExp;
  handler: MessageHandler;
}

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client?: MqttClient;
  private readonly subscriptions: Subscription[] = [];

  constructor(private readonly configService: ConfigService<SyltraConfig, true>) {}

  onModuleInit(): void {
    const { brokerUrl } = this.configService.get('mqtt', { infer: true });
    this.client = mqtt.connect(brokerUrl, { reconnectPeriod: 2000 });

    this.client.on('connect', () => {
      this.logger.log(`Connected to MQTT broker at ${brokerUrl}`);
      for (const { topicPattern } of this.subscriptions) {
        this.client?.subscribe(topicPattern);
      }
    });
    this.client.on('error', (err) => this.logger.error(`MQTT error: ${err.message}`));
    this.client.on('message', (topic, payloadBuffer) => this.dispatch(topic, payloadBuffer));
  }

  onModuleDestroy(): void {
    this.client?.end(true);
  }

  publish(topic: string, payload: unknown): void {
    if (!this.client) {
      this.logger.warn(`Dropped publish to ${topic}: MQTT client not initialized`);
      return;
    }
    this.client.publish(topic, JSON.stringify(payload));
  }

  // Registers a handler for a topic pattern (supports MQTT + and # wildcards) and
  // subscribes to it on the broker.
  on(topicPattern: string, handler: MessageHandler): void {
    this.subscriptions.push({ topicPattern, pattern: this.toRegExp(topicPattern), handler });
    this.client?.subscribe(topicPattern, (err) => {
      if (err) {
        this.logger.error(`Failed to subscribe to ${topicPattern}: ${err.message}`);
      }
    });
  }

  private dispatch(topic: string, payloadBuffer: Buffer): void {
    let payload: unknown;
    try {
      payload = JSON.parse(payloadBuffer.toString());
    } catch {
      this.logger.warn(`Ignoring non-JSON message on ${topic}`);
      return;
    }

    for (const { pattern, handler } of this.subscriptions) {
      if (pattern.test(topic)) {
        try {
          handler(topic, payload);
        } catch (err) {
          this.logger.error(`Handler for ${topic} threw: ${(err as Error).message}`);
        }
      }
    }
  }

  private toRegExp(pattern: string): RegExp {
    const escaped = pattern
      .split('/')
      .map((segment) => {
        if (segment === '#') return '.*';
        if (segment === '+') return '[^/]+';
        return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('/');
    return new RegExp(`^${escaped}$`);
  }
}
