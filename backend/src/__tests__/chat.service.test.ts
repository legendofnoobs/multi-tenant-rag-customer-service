import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db/prisma', () => ({
  default: {
    conversation: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    message: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../lib/env', () => ({
  env: { OLLAMA_BASE_URL: 'http://localhost:11434' },
}));

vi.mock('../services/rag/rag.service', () => ({
  RAGService: class {
    generateResponse = vi.fn().mockResolvedValue({ response: 'AI response', sources: [] });
  },
}));

vi.mock('../lib/events', () => ({
  emitEvent: vi.fn(),
  AppEvent: {
    NEW_CHAT: 'NEW_CHAT',
    MESSAGE_SENT: 'MESSAGE_SENT',
    CHAT_ESCALATED: 'CHAT_ESCALATED',
    CHAT_RESOLVED: 'CHAT_RESOLVED',
    CHAT_UPDATED: 'CHAT_UPDATED',
  },
}));

vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { ChatService } from '../modules/chat/chat.service';

describe('ChatService', () => {
  let chatService: ChatService;

  beforeEach(() => {
    chatService = new ChatService();
    vi.clearAllMocks();
  });

  describe('processCustomerMessage', () => {
    it('should return preview response without saving', async () => {
      const result = await chatService.processCustomerMessage('ws-1', 'test', undefined, true);
      expect(result.response).toBe('AI response');
      expect(result.conversationId).toBe('preview');
    });
  });

  describe('lockConversation', () => {
    it('should throw if conversation not found', async () => {
      const prisma = (await import('../db/prisma')).default;
      vi.mocked(prisma.conversation.findUnique).mockResolvedValueOnce(null);

      await expect(chatService.lockConversation('bad-id', 'user-1', 'ws-1')).rejects.toThrow('Conversation not found');
    });
  });

  describe('resolveConversation', () => {
    it('should resolve and return updated conversation', async () => {
      const prisma = (await import('../db/prisma')).default;
      vi.mocked(prisma.conversation.update).mockResolvedValueOnce({
        id: 'conv-1',
        status: 'CLOSED',
        lockedById: null,
        lockedAt: null,
      } as any);

      const result = await chatService.resolveConversation('conv-1', 'ws-1');
      expect(result.status).toBe('CLOSED');
    });
  });
});
