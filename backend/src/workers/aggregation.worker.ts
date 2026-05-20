import { Worker } from 'bullmq';
import { redisConnection } from '../lib/queue';
import { logger } from '../lib/logger';
import prisma from '../db/prisma';

async function aggregateDailyStats() {
  const workspaces = await prisma.workspace.findMany();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const ws of workspaces) {
    const workspaceId = ws.id;

    const chats = await prisma.conversation.count({
      where: { workspaceId, createdAt: { gte: today } },
    });

    const messages = await prisma.message.count({
      where: { conversation: { workspaceId }, createdAt: { gte: today } },
    });

    const escalations = await prisma.conversation.count({
      where: { workspaceId, status: 'ESCALATED', updatedAt: { gte: today } },
    });

    await prisma.analyticsDaily.upsert({
      where: { date_workspaceId: { date: today, workspaceId } },
      update: { totalChats: chats, totalMessages: messages, escalations },
      create: { date: today, workspaceId, totalChats: chats, totalMessages: messages, escalations },
    });
  }
}

const processor = async () => {
  logger.info('Running daily stats aggregation');
  await aggregateDailyStats();
};

export const aggregationWorker = new Worker('aggregation', processor, {
  connection: redisConnection,
  removeOnComplete: { count: 0 },
  removeOnFail: { count: 10 },
});

aggregationWorker.on('completed', () => {
  logger.info('Daily stats aggregation completed');
});

aggregationWorker.on('failed', (job, err) => {
  logger.error({ err }, 'Aggregation failed');
});
