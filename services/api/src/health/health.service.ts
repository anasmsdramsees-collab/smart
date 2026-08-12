import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as PgClient } from 'pg';
import Redis from 'ioredis';
import mqtt from 'mqtt';
import { SyltraConfig } from '../config/configuration';

export type DependencyStatus = 'ok' | 'unreachable';

export interface ReadinessReport {
  status: 'ok' | 'degraded';
  dependencies: {
    postgres: DependencyStatus;
    redis: DependencyStatus;
    mqtt: DependencyStatus;
  };
}

const CHECK_TIMEOUT_MS = 2000;

@Injectable()
export class HealthService {
  constructor(private readonly configService: ConfigService<SyltraConfig, true>) {}

  async checkReadiness(): Promise<ReadinessReport> {
    const [postgres, redis, mqttStatus] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
      this.checkMqtt(),
    ]);

    const dependencies = { postgres, redis, mqtt: mqttStatus };
    const status = Object.values(dependencies).every((s) => s === 'ok') ? 'ok' : 'degraded';

    return { status, dependencies };
  }

  private async checkPostgres(): Promise<DependencyStatus> {
    const config = this.configService.get('postgres', { infer: true });
    const client = new PgClient({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectionTimeoutMillis: CHECK_TIMEOUT_MS,
    });
    try {
      await client.connect();
      await client.query('SELECT 1');
      return 'ok';
    } catch {
      return 'unreachable';
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  private async checkRedis(): Promise<DependencyStatus> {
    const config = this.configService.get('redis', { infer: true });
    const client = new Redis({
      host: config.host,
      port: config.port,
      connectTimeout: CHECK_TIMEOUT_MS,
      lazyConnect: true,
      retryStrategy: () => null,
    });
    try {
      await client.connect();
      await client.ping();
      return 'ok';
    } catch {
      return 'unreachable';
    } finally {
      client.disconnect();
    }
  }

  private async checkMqtt(): Promise<DependencyStatus> {
    const config = this.configService.get('mqtt', { infer: true });
    return new Promise<DependencyStatus>((resolve) => {
      const client = mqtt.connect(config.brokerUrl, {
        connectTimeout: CHECK_TIMEOUT_MS,
        reconnectPeriod: 0,
      });

      const finish = (status: DependencyStatus) => {
        client.removeAllListeners();
        client.end(true);
        resolve(status);
      };

      const timer = setTimeout(() => finish('unreachable'), CHECK_TIMEOUT_MS);

      client.once('connect', () => {
        clearTimeout(timer);
        finish('ok');
      });
      client.once('error', () => {
        clearTimeout(timer);
        finish('unreachable');
      });
    });
  }
}
