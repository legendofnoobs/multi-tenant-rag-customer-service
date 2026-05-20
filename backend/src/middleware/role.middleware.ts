import { Response, NextFunction } from 'express';
import { TenantRequest } from './tenant.middleware';
import prisma from '../db/prisma';
import { AppError } from '../lib/errors';

function resolveWorkspaceRole(workspace: { ownerId: string }, userId: string, globalRole: string): string {
  if (globalRole === 'PLATFORM_OWNER') return 'PLATFORM_OWNER';
  if (workspace.ownerId === userId) return 'WORKSPACE_OWNER';
  return globalRole;
}

export const roleMiddleware = (allowedRoles: string[]) => {
  return async (req: TenantRequest, _res: Response, next: NextFunction) => {
    try {
      if (!req.userId || !req.workspaceId) {
        throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');
      }

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        include: { workspaces: { where: { id: req.workspaceId } } },
      });

      if (!user) {
        throw new AppError(401, 'USER_NOT_FOUND', 'User not found');
      }

      if (user.workspaces.length === 0 && user.role !== 'PLATFORM_OWNER') {
        throw new AppError(403, 'NOT_MEMBER', 'User is not a member of this workspace');
      }

      const workspace = user.workspaces[0];
      const userRole = resolveWorkspaceRole(workspace || { ownerId: '' }, user.id, user.role);

      if (allowedRoles.includes(userRole)) {
        return next();
      }

      throw new AppError(403, 'FORBIDDEN', 'Insufficient permissions');
    } catch (error) {
      next(error);
    }
  };
};
