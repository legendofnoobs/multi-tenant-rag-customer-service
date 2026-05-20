import prisma from '../../db/prisma';

export class WorkspaceService {
  async createWorkspace(userId: string, name: string) {
    const workspace = await prisma.workspace.create({
      data: { name, ownerId: userId, users: { connect: [{ id: userId }] } },
    });
    return workspace;
  }

  async updateWorkspace(id: string, name: string) {
    return prisma.workspace.update({ where: { id }, data: { name } });
  }
}
