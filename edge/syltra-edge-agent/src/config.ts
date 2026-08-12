import { config as loadEnv } from 'dotenv';

loadEnv();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  cloud: {
    apiUrl: process.env.SYLTRA_CLOUD_API_URL ?? 'http://localhost:3000',
    tenantId: required('SYLTRA_TENANT_ID'),
    hubId: required('SYLTRA_HUB_ID'),
    hubToken: required('SYLTRA_HUB_TOKEN'),
  },
  homeAssistant: {
    url: process.env.HA_URL ?? 'http://localhost:8123',
    token: required('HA_TOKEN'),
  },
  mqtt: {
    brokerUrl: process.env.MQTT_BROKER_URL ?? 'mqtt://localhost:1883',
  },
  heartbeatIntervalMs: parseInt(process.env.HEARTBEAT_INTERVAL_MS ?? '30000', 10),
  discoveryIntervalMs: parseInt(process.env.DISCOVERY_INTERVAL_MS ?? '300000', 10),
};
