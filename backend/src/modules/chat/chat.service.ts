import prisma from '../../db/prisma';
import { RAGService } from '../../services/rag/rag.service';
import { emitEvent, AppEvent } from '../../lib/events';
import { AppError } from '../../lib/errors';
import { logger } from '../../lib/logger';

const ragService = new RAGService();

export class ChatService {
  async processCustomerMessage(workspaceId: string, content: string, conversationId?: string, isPreview: boolean = false) {
    if (isPreview) {
      const { response, sources } = await ragService.generateResponse(workspaceId, content, []);
      return { response, sources, conversationId: 'preview' };
    }

    let conversation;
    let isNew = false;

    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });

      if (conversation) {
        if (conversation.workspaceId !== workspaceId) {
          throw new AppError(403, 'FORBIDDEN', 'Conversation does not belong to this workspace');
        }
        if (conversation.status === 'CLOSED') {
          throw new AppError(400, 'CONVERSATION_CLOSED', 'Conversation is already resolved. Please start a new one.');
        }
      }
    }

    if (!conversation) {
      isNew = true;
      conversation = await prisma.conversation.create({
        data: { workspaceId, status: 'AI_ACTIVE' },
        include: { messages: true },
      });
    }

    const lowerContent = content.toLowerCase().trim();
    const resolutionKeywords = [
      'no', 'no thanks', 'thanks', 'thank you', 'shukran', 'done', 'bye', 'goodbye',
      'شكرا', 'شكراً', 'تمام', 'خلاص', 'لا شكرا', 'تسلم', 'شكرا جزيلا',
    ];

    if (conversation.status === 'AI_ACTIVE' && conversation.messages.length >= 2 && resolutionKeywords.some(k => lowerContent.includes(k))) {
      await this.resolveConversation(conversation.id, workspaceId);
      const isArabicResponse = /[\u0600-\u06FF]/.test(content);
      const responseText = isArabicResponse
        ? "عفواً! يسعدني دائماً مساعدتك. أتمنى لك يوماً سعيداً!"
        : "You're very welcome! Feel free to reach out if you have any other questions. Have a great day!";
      return { response: responseText, conversationId: conversation.id };
    }

    const message = await prisma.message.create({
      data: { content, role: 'user', conversationId: conversation.id },
    });

    if (isNew) {
      const fullConv = await prisma.conversation.findUnique({
        where: { id: conversation.id },
        include: {
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          assignedTo: true,
        },
      });
      emitEvent({ workspaceId, type: AppEvent.NEW_CHAT, data: { conversation: fullConv } });
    }

    emitEvent({ workspaceId, type: AppEvent.MESSAGE_SENT, data: { message, conversationId: conversation.id } });

    if (conversation.status === 'ESCALATED') {
      const isArabicResponse = /[\u0600-\u06FF]/.test(content);
      return {
        response: isArabicResponse ? "سيكون معك أحد موظفينا قريباً لمساعدتك." : "A human agent will be with you shortly.",
        conversationId: conversation.id,
      };
    }

    const history = (conversation.messages || []).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const ragResult = await ragService.generateResponse(workspaceId, content, history);
    let aiResponse = ragResult.response;
    const sources = ragResult.sources;

    const aiAdmitsDefeat = aiResponse.toLowerCase().includes("i don't have") ||
      aiResponse.toLowerCase().includes("i apologize") ||
      aiResponse.toLowerCase().includes("i am sorry") ||
      aiResponse.includes("أعتذر") ||
      aiResponse.includes("ليس لدي") ||
      aiResponse.includes("آسف");

    const userWantsHuman = content.toLowerCase().includes('human') ||
      content.toLowerCase().includes('agent') ||
      content.toLowerCase().includes('person') ||
      content.toLowerCase().includes('representative') ||
      content.includes('بشري') ||
      content.includes('انسان') ||
      content.includes('عميل') ||
      content.includes('موظف') ||
      content.includes('كلم');

    const aiSuggestsHuman = aiResponse.toLowerCase().includes('human agent') ||
      aiResponse.toLowerCase().includes('representative') ||
      aiResponse.toLowerCase().includes('contact us') ||
      aiResponse.includes('بشري') ||
      aiResponse.includes('وكيل') ||
      aiResponse.includes('موظف');

    const triggerEscalation = (aiAdmitsDefeat && aiSuggestsHuman) || userWantsHuman;

    if (triggerEscalation) {
      const isArabicResponse = /[\u0600-\u06FF]/.test(aiResponse);
      aiResponse = isArabicResponse
        ? "لقد قمت بتحويل هذه المحادثة إلى أحد موظفينا لمساعدتك. سيكون معك قريباً."
        : "I've escalated this conversation to a human agent for you. They will be with you shortly.";
      await this.escalateConversation(conversation.id, workspaceId);
    }

    const aiMessage = await prisma.message.create({
      data: { content: aiResponse, role: 'assistant', conversationId: conversation.id, sources: sources || [] },
    });

    emitEvent({ workspaceId, type: AppEvent.MESSAGE_SENT, data: { message: aiMessage, conversationId: conversation.id, sources } });

    return { response: aiResponse, sources, conversationId: conversation.id };
  }

  async listConversations(workspaceId: string) {
    return prisma.conversation.findMany({
      where: { workspaceId },
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        assignedTo: { select: { name: true, email: true } },
        lockedBy: { select: { name: true, email: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getConversationMessages(conversationId: string, workspaceId: string) {
    const chat = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: 'asc' } }, assignedTo: true, lockedBy: true },
    });

    if (!chat) {
      throw new AppError(404, 'NOT_FOUND', 'Conversation not found');
    }

    if (chat.workspaceId !== workspaceId) {
      throw new AppError(403, 'FORBIDDEN', 'Conversation does not belong to this workspace');
    }

    return chat;
  }

  async lockConversation(conversationId: string, userId: string, workspaceId: string) {
    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { lockedById: true, workspaceId: true },
    });

    if (!conv || conv.workspaceId !== workspaceId) {
      throw new AppError(404, 'NOT_FOUND', 'Conversation not found');
    }

    if (conv.lockedById && conv.lockedById !== userId) {
      throw new AppError(409, 'ALREADY_LOCKED', 'Conversation is already being handled by another agent');
    }

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: { lockedById: userId, lockedAt: new Date() },
      include: { lockedBy: { select: { name: true, email: true } } },
    });

    emitEvent({ workspaceId, type: AppEvent.CHAT_UPDATED, data: { conversation: updated } });
    return updated;
  }

  async unlockConversation(conversationId: string, workspaceId: string) {
    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: { lockedById: null, lockedAt: null },
    });

    emitEvent({ workspaceId, type: AppEvent.CHAT_UPDATED, data: { conversation: updated } });
    return updated;
  }

  async agentReply(conversationId: string, content: string, userId: string, workspaceId: string) {
    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { workspaceId: true, status: true, lockedById: true },
    });

    if (!conv || conv.workspaceId !== workspaceId) {
      throw new AppError(404, 'NOT_FOUND', 'Conversation not found in this workspace');
    }

    if (conv.status === 'CLOSED') {
      throw new AppError(400, 'CONVERSATION_CLOSED', 'Cannot reply to a resolved conversation');
    }

    if (conv.lockedById && conv.lockedById !== userId) {
      throw new AppError(409, 'ALREADY_LOCKED', 'This conversation is locked by another agent');
    }

    const message = await prisma.message.create({
      data: { content, role: 'assistant', conversationId, userId },
    });

    emitEvent({ workspaceId, type: AppEvent.MESSAGE_SENT, data: { message, conversationId } });

    return message;
  }

  async escalateConversation(conversationId: string, workspaceId: string) {
    let agents = await prisma.user.findMany({
      where: { workspaces: { some: { id: workspaceId } }, role: { in: ['AGENT', 'ADMIN'] }, isOnline: true },
      include: { assignedConversations: { where: { status: 'ESCALATED' } } },
    });

    if (agents.length === 0) {
      agents = await prisma.user.findMany({
        where: { workspaces: { some: { id: workspaceId } }, role: { in: ['AGENT', 'ADMIN'] } },
        include: { assignedConversations: { where: { status: 'ESCALATED' } } },
      });
    }

    const sortedAgents = agents.sort((a, b) => a.assignedConversations.length - b.assignedConversations.length);
    const bestAgent = sortedAgents[0];

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: 'ESCALATED',
        assignedToId: bestAgent?.id,
        lockedById: bestAgent?.id,
        lockedAt: bestAgent ? new Date() : undefined,
      },
      include: { assignedTo: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    emitEvent({ workspaceId, type: AppEvent.CHAT_ESCALATED, data: { conversation: updated } });

    return updated;
  }

  async resolveConversation(conversationId: string, workspaceId: string) {
    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'CLOSED', lockedById: null, lockedAt: null },
    });

    emitEvent({ workspaceId, type: AppEvent.CHAT_RESOLVED, data: { conversation: updated } });

    return updated;
  }
}
