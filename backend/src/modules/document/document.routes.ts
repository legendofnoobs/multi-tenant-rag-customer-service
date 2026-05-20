import { Router } from 'express';
import multer from 'multer';
import { DocumentController } from './document.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';

const router = Router();
const controller = new DocumentController();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', authMiddleware, tenantMiddleware, upload.single('file'), controller.upload);
router.get('/', authMiddleware, tenantMiddleware, controller.list);
router.delete('/:id', authMiddleware, tenantMiddleware, controller.delete);

export default router;
