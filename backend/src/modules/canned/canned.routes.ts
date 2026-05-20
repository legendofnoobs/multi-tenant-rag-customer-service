import { Router } from 'express';
import { CannedController } from './canned.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { validate, cannedResponseSchema } from '../../lib/validation';

const router = Router();
const controller = new CannedController();

router.get('/', authMiddleware, tenantMiddleware, controller.list);
router.post('/', authMiddleware, tenantMiddleware, validate(cannedResponseSchema), controller.create);
router.put('/:id', authMiddleware, tenantMiddleware, validate(cannedResponseSchema), controller.update);
router.delete('/:id', authMiddleware, tenantMiddleware, controller.delete);

export default router;
