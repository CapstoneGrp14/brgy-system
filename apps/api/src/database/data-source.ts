import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';

loadEnv(); // cwd (apps/api/.env if present)
loadEnv({ path: resolve(__dirname, '../../../../.env') }); // repo root .env

/** CLI-only DataSource (migrations). The app configures TypeORM in AppModule. */
export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER ?? 'brgy',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'brgy591',
  entities: ['src/modules/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: ['error', 'warn', 'migration'],
});
