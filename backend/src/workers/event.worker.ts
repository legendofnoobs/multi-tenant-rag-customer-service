import { Worker, Job } from 'bullmq';
import { getIO } from '../lib/socket';
import { AppEvent, EventPayload } from '../lib/events';
import { redisConnection } from '../lib/queue';
import { logger } from '../lib/logger';
import prisma from '../db/prisma';

const processor = async (job: Job<EventPayload>) => {
  const { workspaceId, type, data } = job.data;
  const io = getIO();

  logger.info({ eventType: type, workspaceId }, 'Processing event');

  switch (type) {
    case AppEvent.MESSAGE_SENT:
      io.to(`conversation_${data.conversationId}`).emit('new_message', data.message);
      io.to(`workspace_${workspaceId}`).emit('chat_updated', {
        conversationId: data.conversationId,
        lastMessage: data.message.content,
      });
      break;

    case AppEvent.NEW_CHAT:
      io.to(`workspace_${workspaceId}`).emit('new_chat', data.conversation);
      break;

    case AppEvent.CHAT_ESCALATED:
      io.to(`workspace_${workspaceId}`).emit('chat_escalated', data.conversation);
      break;

    case AppEvent.CHAT_RESOLVED:
      io.to(`conversation_${data.conversation.id}`).emit('chat_resolved', data.conversation);
      break;

    case AppEvent.BRANDING_UPDATED:
      io.to(`workspace_${workspaceId}`).emit('branding_updated', data.branding);
      break;

    case AppEvent.DOCUMENT_PROCESSED:
      io.to(`workspace_${workspaceId}`).emit('document_processed', data);
      break;

    default:
      logger.warn({ eventType: type }, 'Unhandled event type');
  }

  try {
    await prisma.event.create({ data: { type, workspaceId } });
  } catch (e) {
    logger.error({ err: e }, 'Failed to log event to DB');
  }
};

export const eventWorker = new Worker('app-events', processor, {
  connection: redisConnection,
});
