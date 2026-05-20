import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate, registerSchema, loginSchema, inviteSchema, acceptInviteSchema, updateStatusSchema } from '../../lib/validation';

const router = Router();
const controller = new AuthController();

router.post('/register', validate(registerSchema), controller.register);
router.post('/login', validate(loginSchema), controller.login);
router.get('/me', authMiddleware, controller.me);
router.post('/invite', authMiddleware, validate(inviteSchema), controller.invite);
router.get('/invite/:token', controller.verifyInvite);
router.post('/invite/accept', validate(acceptInviteSchema), controller.acceptInvite);
router.patch('/status', authMiddleware, validate(updateStatusSchema), controller.updateStatus);

export default router;
