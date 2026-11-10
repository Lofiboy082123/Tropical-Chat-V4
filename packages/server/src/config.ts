import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  host: process.env.HOST || '0.0.0.0',
  db: {
    dialect: process.env.DB_DIALECT || 'sqlite',
    storage: process.env.DB_STORAGE || path.resolve(process.cwd(), 'data/tcc.sqlite'),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'tropical-control-center-enterprise-secure-jwt-secret-key-32chars',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
  },
  agent: {
    heartbeatInterval: parseInt(process.env.AGENT_HEARTBEAT_INTERVAL || '30', 10),
    heartbeatTimeout: parseInt(process.env.AGENT_HEARTBEAT_TIMEOUT || '60', 10),
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10),
  },
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
