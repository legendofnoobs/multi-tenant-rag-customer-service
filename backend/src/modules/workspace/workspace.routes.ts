import { Router } from 'express';
import { WorkspaceController } from './workspace.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { validate, createWorkspaceSchema, updateWorkspaceSchema, brandingSchema, updateRoleSchema } from '../../lib/validation';

const router = Router();
const controller = new WorkspaceController();

router.post('/', authMiddleware, validate(createWorkspaceSchema), controller.create);
router.patch('/', authMiddleware, tenantMiddleware, validate(updateWorkspaceSchema), controller.update);
router.get('/members', authMiddleware, tenantMiddleware, controller.getMembers);
router.patch('/members/:userId', authMiddleware, tenantMiddleware, validate(updateRoleSchema), controller.updateMemberRole);
router.delete('/members/:userId', authMiddleware, tenantMiddleware, controller.removeMember);

router.get('/branding/public', controller.getBrandingPublic);
router.get('/branding', tenantMiddleware, controller.getBranding);
router.patch('/branding', authMiddleware, tenantMiddleware, validate(brandingSchema), controller.updateBranding);

export default router;
