export interface SyltraConfig {
  nodeEnv: string;
  api: {
    port: number;
  };
  postgres: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
  redis: {
    host: string;
    port: number;
  };
  mqtt: {
    brokerUrl: string;
  };
  auth: {
    accessTokenSecret: string;
    accessTokenTtl: string;
    refreshTokenSecret: string;
    refreshTokenTtl: string;
  };
}

export default (): SyltraConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  api: {
    port: parseInt(process.env.API_PORT ?? '3000', 10),
  },
  postgres: {
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
    user: process.env.POSTGRES_USER ?? 'syltra',
    password: process.env.POSTGRES_PASSWORD ?? 'syltra_dev_password',
    database: process.env.POSTGRES_DB ?? 'syltra',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
  mqtt: {
    brokerUrl: process.env.MQTT_BROKER_URL ?? 'mqtt://localhost:1883',
  },
  auth: {
    accessTokenSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me',
    accessTokenTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
    refreshTokenTtl: process.env.JWT_REFRESH_TTL ?? '30d',
  },
});
