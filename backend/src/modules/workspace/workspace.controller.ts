import { Request, Response } from 'express';
import { WorkspaceService } from './workspace.service';
import { TenantRequest } from '../../middleware/tenant.middleware';
import { emitEvent, AppEvent } from '../../lib/events';
import { asyncHandler, AppError } from '../../lib/errors';
import prisma from '../../db/prisma';

const workspaceService = new WorkspaceService();

export class WorkspaceController {
  create = asyncHandler(async (req: TenantRequest, res: Response) => {
    const { name } = req.body;
    const workspace = await workspaceService.createWorkspace(req.userId!, name);
    res.status(201).json(workspace);
  });

  update = asyncHandler(async (req: TenantRequest, res: Response) => {
    const { name } = req.body;
    const workspace = await workspaceService.updateWorkspace(req.workspaceId!, name);
    res.json(workspace);
  });

  getMembers = asyncHandler(async (req: TenantRequest, res: Response) => {
    const workspace = await prisma.workspace.findUnique({
      where: { id: req.workspaceId },
      include: {
        users: { select: { id: true, name: true, email: true, role: true, createdAt: true } },
      },
    });

    if (!workspace) {
      throw new AppError(404, 'NOT_FOUND', 'Workspace not found');
    }

    const members = workspace.users.map(u => ({
      ...u,
      role: u.id === workspace.ownerId ? 'WORKSPACE_OWNER' : u.role,
    }));

    res.json(members);
  });

  updateMemberRole = asyncHandler(async (req: TenantRequest, res: Response) => {
    const { userId } = req.params;
    const { role } = req.body;

    const workspace = await prisma.workspace.findUnique({ where: { id: req.workspaceId } });
    if (!workspace || workspace.ownerId !== req.userId) {
      throw new AppError(403, 'FORBIDDEN', 'Only the Workspace Owner can manage team roles');
    }

    if (userId === req.userId) {
      throw new AppError(400, 'SELF_ROLE', 'Cannot change your own role');
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { workspaces: { where: { id: req.workspaceId } } },
    });

    if (!targetUser || targetUser.workspaces.length === 0) {
      throw new AppError(404, 'NOT_FOUND', 'User is not a member of this workspace');
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    res.json(user);
  });

  removeMember = asyncHandler(async (req: TenantRequest, res: Response) => {
    const { userId } = req.params;

    if (userId === req.userId) {
      throw new AppError(400, 'SELF_REMOVE', 'Cannot remove yourself from the workspace');
    }

    const workspace = await prisma.workspace.findUnique({ where: { id: req.workspaceId } });
    if (!workspace || workspace.ownerId !== req.userId) {
      throw new AppError(403, 'FORBIDDEN', 'Only the Workspace Owner can remove members');
    }

    if (workspace.ownerId === userId) {
      throw new AppError(400, 'OWNER_REMOVE', 'Cannot remove the workspace owner');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { workspaces: { disconnect: [{ id: req.workspaceId }] } },
    });

    res.status(204).send();
  });

  getBranding = asyncHandler(async (req: TenantRequest, res: Response) => {
    const workspace = await prisma.workspace.findUnique({
      where: { id: req.workspaceId },
      select: { widgetName: true, widgetColor: true, welcomeMessage: true, name: true },
    });

    if (!workspace) {
      throw new AppError(404, 'NOT_FOUND', 'Workspace not found');
    }

    res.json(workspace);
  });

  updateBranding = asyncHandler(async (req: TenantRequest, res: Response) => {
    const { widgetName, widgetColor, welcomeMessage } = req.body;
    const workspace = await prisma.workspace.update({
      where: { id: req.workspaceId },
      data: { widgetName, widgetColor, welcomeMessage },
    });

    await emitEvent({
      workspaceId: req.workspaceId!,
      type: AppEvent.BRANDING_UPDATED,
      data: { branding: { widgetName, widgetColor, welcomeMessage } },
    });

    res.json(workspace);
  });

  getBrandingPublic = asyncHandler(async (req: Request, res: Response) => {
    const workspaceId = (req.query.workspaceId || req.headers['x-workspace-id']) as string;
    if (!workspaceId) {
      throw new AppError(400, 'WORKSPACE_REQUIRED', 'Workspace ID is required');
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { widgetName: true, widgetColor: true, welcomeMessage: true, name: true },
    });

    if (!workspace) {
      throw new AppError(404, 'NOT_FOUND', 'Workspace not found');
    }

    res.json(workspace);
  });
}
