import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { TenantRequest } from '../../middleware/tenant.middleware';
import { asyncHandler } from '../../lib/errors';

const authService = new AuthService();

export class AuthController {
  register = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, workspaceName, name } = req.body;
    const result = await authService.register(email, password, workspaceName, name);
    res.status(201).json(result);
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  });

  me = asyncHandler(async (req: TenantRequest, res: Response) => {
    const user = await authService.getUser(req.userId!);
    res.json(user);
  });

  invite = asyncHandler(async (req: TenantRequest, res: Response) => {
    const { email } = req.body;
    const invite = await authService.createInvitation(req.workspaceId!, email);
    res.status(201).json(invite);
  });

  verifyInvite = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;
    const invite = await authService.getInvitation(token);
    res.json(invite);
  });

  acceptInvite = asyncHandler(async (req: Request, res: Response) => {
    const { token, password, name } = req.body;
    const user = await authService.acceptInvitation(token, password, name);
    res.json(user);
  });

  updateStatus = asyncHandler(async (req: TenantRequest, res: Response) => {
    const { isOnline } = req.body;
    const result = await authService.updateStatus(req.userId!, isOnline);
    res.json(result);
  });
}
