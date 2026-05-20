import { Request, Response } from 'express';
import { ChatService } from './chat.service';
import { TenantRequest } from '../../middleware/tenant.middleware';
import { emitEvent, AppEvent } from '../../lib/events';
import { asyncHandler } from '../../lib/errors';

const chatService = new ChatService();

export class ChatController {
  startChat = asyncHandler(async (req: TenantRequest, res: Response) => {
    res.status(200).json({ status: 'ready' });
  });

  customerMessage = asyncHandler(async (req: TenantRequest, res: Response) => {
    const { message, conversationId, isPreview } = req.body;
    const workspaceId = req.workspaceId!;
    const result = await chatService.processCustomerMessage(workspaceId, message, conversationId, isPreview);
    res.json(result);
  });

  listChats = asyncHandler(async (req: TenantRequest, res: Response) => {
    const chats = await chatService.listConversations(req.workspaceId!);
    res.json(chats);
  });

  getChat = asyncHandler(async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    const chat = await chatService.getConversationMessages(id, req.workspaceId!);
    res.json(chat);
  });

  agentReply = asyncHandler(async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    const { content } = req.body;
    const msg = await chatService.agentReply(id, content, req.userId!, req.workspaceId!);
    res.status(201).json(msg);
  });

  resolveChat = asyncHandler(async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    const chat = await chatService.resolveConversation(id, req.workspaceId!);
    res.json(chat);
  });

  getChatHistory = asyncHandler(async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    const chat = await chatService.getConversationMessages(id, req.workspaceId!);
    res.json(chat);
  });

  lockChat = asyncHandler(async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    const chat = await chatService.lockConversation(id, req.userId!, req.workspaceId!);
    res.json(chat);
  });

  unlockChat = asyncHandler(async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    const chat = await chatService.unlockConversation(id, req.workspaceId!);
    res.json(chat);
  });

  setTypingStatus = asyncHandler(async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    const { isTyping } = req.body;

    emitEvent({
      workspaceId: req.workspaceId!,
      type: AppEvent.TYPING_STATUS,
      data: { conversationId: id, userId: req.userId, isTyping },
    });

    res.json({ success: true });
  });
}
