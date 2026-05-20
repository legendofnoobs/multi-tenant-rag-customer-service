import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`;

export const redisConnection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const ingestionQueue = new Queue('document-ingestion', {
  connection: redisConnection,
});

export const eventQueue = new Queue('app-events', {
  connection: redisConnection,
});
