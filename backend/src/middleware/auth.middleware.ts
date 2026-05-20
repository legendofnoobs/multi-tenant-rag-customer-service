import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { TenantRequest } from './tenant.middleware';
import { env } from '../lib/env';
import { AppError } from '../lib/errors';

export const authMiddleware = (req: TenantRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(401, 'NO_TOKEN', 'No token provided');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    req.userId = decoded.userId;
    req.workspaceId = (req.headers['x-workspace-id'] as string) || decoded.workspaceId;
    next();
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'Invalid or expired token');
  }
};
