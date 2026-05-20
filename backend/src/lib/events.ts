import { eventQueue } from './queue';
import { logger } from './logger';

export enum AppEvent {
  MESSAGE_SENT = 'MESSAGE_SENT',
  CHAT_ESCALATED = 'CHAT_ESCALATED',
  CHAT_RESOLVED = 'CHAT_RESOLVED',
  NEW_CHAT = 'NEW_CHAT',
  BRANDING_UPDATED = 'BRANDING_UPDATED',
  DOCUMENT_PROCESSED = 'DOCUMENT_PROCESSED',
  CHAT_UPDATED = 'CHAT_UPDATED',
  TYPING_STATUS = 'TYPING_STATUS',
}

export interface EventPayload {
  workspaceId: string;
  type: AppEvent;
  data: any;
}

export const emitEvent = async (payload: EventPayload) => {
  try {
    await eventQueue.add(payload.type, payload, {
      removeOnComplete: true,
      attempts: 2,
    });
  } catch (error) {
    logger.error({ err: error, eventType: payload.type }, 'Failed to emit event');
  }
};
