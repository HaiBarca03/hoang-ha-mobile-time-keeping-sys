import 'dotenv/config';
import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';

const isSsl = process.env.DATABASE_SSL_ENABLED === 'true';
const trustServerCertificate =
  process.env.DATABASE_TRUST_SERVER_CERTIFICATE === 'true';
const hasUrl = !!process.env.DATABASE_URL?.trim();

const baseOptions: DataSourceOptions = {
  type: 'mssql',
  synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
  dropSchema: false,
  logging: process.env.NODE_ENV !== 'production',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
  options: {
    encrypt: isSsl,
    trustServerCertificate,
  },
  extra: {
    max: process.env.DATABASE_MAX_CONNECTIONS
      ? parseInt(process.env.DATABASE_MAX_CONNECTIONS, 10)
      : 100,
  },
};

export const AppDataSource = new DataSource(
  hasUrl
    ? {
      ...baseOptions,
      url: process.env.DATABASE_URL,
    }
    : {
      ...baseOptions,
      host: process.env.DATABASE_HOST,
      port: process.env.DATABASE_PORT
        ? parseInt(process.env.DATABASE_PORT, 10)
        : 1433,
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
    },
);