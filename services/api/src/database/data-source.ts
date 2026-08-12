import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { entities } from './entities';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
  username: process.env.POSTGRES_USER ?? 'syltra',
  password: process.env.POSTGRES_PASSWORD ?? 'syltra_dev_password',
  database: process.env.POSTGRES_DB ?? 'syltra',
  entities,
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
});
