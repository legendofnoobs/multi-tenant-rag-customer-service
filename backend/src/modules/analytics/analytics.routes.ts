import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { roleMiddleware } from '../../middleware/role.middleware';

const router = Router();
const controller = new AnalyticsController();

router.get('/overview', authMiddleware, tenantMiddleware, controller.getStats);
router.get('/insights', authMiddleware, tenantMiddleware, controller.getInsights);
router.get('/insights/history', authMiddleware, tenantMiddleware, roleMiddleware(['PLATFORM_OWNER', 'ADMIN', 'WORKSPACE_OWNER']), controller.getInsightHistory);
router.post('/insights', authMiddleware, tenantMiddleware, roleMiddleware(['PLATFORM_OWNER', 'ADMIN', 'WORKSPACE_OWNER']), controller.generateInsights);

export default router;
