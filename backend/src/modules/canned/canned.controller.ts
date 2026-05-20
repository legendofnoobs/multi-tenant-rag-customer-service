import { Response } from 'express';
import prisma from '../../db/prisma';
import { TenantRequest } from '../../middleware/tenant.middleware';
import { asyncHandler, AppError } from '../../lib/errors';

export class CannedController {
  list = asyncHandler(async (req: TenantRequest, res: Response) => {
    const responses = await prisma.cannedResponse.findMany({
      where: { workspaceId: req.workspaceId! },
      orderBy: { title: 'asc' },
    });
    res.json(responses);
  });

  create = asyncHandler(async (req: TenantRequest, res: Response) => {
    const { title, content, shortcut } = req.body;
    const response = await prisma.cannedResponse.create({
      data: { title, content, shortcut, workspaceId: req.workspaceId! },
    });
    res.status(201).json(response);
  });

  update = asyncHandler(async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    const { title, content, shortcut } = req.body;

    const existing = await prisma.cannedResponse.findUnique({ where: { id } });
    if (!existing || existing.workspaceId !== req.workspaceId) {
      throw new AppError(404, 'NOT_FOUND', 'Canned response not found');
    }

    const response = await prisma.cannedResponse.update({
      where: { id },
      data: { title, content, shortcut },
    });
    res.json(response);
  });

  delete = asyncHandler(async (req: TenantRequest, res: Response) => {
    const { id } = req.params;

    const existing = await prisma.cannedResponse.findUnique({ where: { id } });
    if (!existing || existing.workspaceId !== req.workspaceId) {
      throw new AppError(404, 'NOT_FOUND', 'Canned response not found');
    }

    await prisma.cannedResponse.delete({ where: { id } });
    res.status(204).send();
  });
}
