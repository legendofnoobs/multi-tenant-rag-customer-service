import { Router } from 'express';
import { ChatController } from './chat.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { validate, sendMessageSchema, agentReplySchema, typingStatusSchema } from '../../lib/validation';

const router = Router();
const controller = new ChatController();

router.post('/start', tenantMiddleware, controller.startChat);
router.post('/message', tenantMiddleware, validate(sendMessageSchema), controller.customerMessage);
router.get('/history/:id', tenantMiddleware, controller.getChatHistory);

router.get('/', authMiddleware, controller.listChats);
router.get('/:id', authMiddleware, controller.getChat);
router.post('/:id/reply', authMiddleware, validate(agentReplySchema), controller.agentReply);
router.post('/:id/resolve', authMiddleware, controller.resolveChat);
router.post('/:id/lock', authMiddleware, controller.lockChat);
router.post('/:id/unlock', authMiddleware, controller.unlockChat);
router.post('/:id/typing', tenantMiddleware, validate(typingStatusSchema), controller.setTypingStatus);

export default router;
