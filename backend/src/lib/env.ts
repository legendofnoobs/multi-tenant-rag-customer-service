const REQUIRED_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'REDIS_URL',
] as const;

const OPTIONAL_VARS = [
  'PORT',
  'REDIS_HOST',
  'REDIS_PORT',
  'OLLAMA_BASE_URL',
  'LOG_LEVEL',
  'ALLOWED_ORIGINS',
  'NODE_ENV',
] as const;

export function validateEnv() {
  const missing: string[] = [];

  for (const v of REQUIRED_VARS) {
    if (!process.env[v]) {
      missing.push(v);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export const env = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET!,
  REDIS_URL: process.env.REDIS_URL!,
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001').split(','),
  NODE_ENV: process.env.NODE_ENV || 'development',
};
