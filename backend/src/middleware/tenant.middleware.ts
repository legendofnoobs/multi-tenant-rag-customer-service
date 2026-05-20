import { Response, NextFunction } from 'express';
import { Request } from 'express';
import { AppError } from '../lib/errors';

export interface TenantRequest extends Request {
  workspaceId?: string;
  userId?: string;
}

export const tenantMiddleware = (req: TenantRequest, _res: Response, next: NextFunction) => {
  const workspaceId = req.headers['x-workspace-id'] as string;

  if (!workspaceId) {
    throw new AppError(400, 'WORKSPACE_REQUIRED', 'Workspace ID is required');
  }

  req.workspaceId = workspaceId;
  next();
};
