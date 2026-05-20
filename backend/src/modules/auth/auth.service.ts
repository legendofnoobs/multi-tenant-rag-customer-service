import prisma from '../../db/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../lib/env';
import { AppError } from '../../lib/errors';

export class AuthService {
  async register(email: string, password: string, workspaceName: string, name?: string) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError(409, 'EMAIL_EXISTS', 'Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, password: hashedPassword, role: 'WORKSPACE_OWNER' },
      });

      const workspace = await tx.workspace.create({
        data: {
          name: workspaceName,
          ownerId: user.id,
          users: { connect: [{ id: user.id }] },
        },
      });

      const token = jwt.sign({ userId: user.id, workspaceId: workspace.id }, env.JWT_SECRET);
      return { user, workspace, token };
    });
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { workspaces: true },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const token = jwt.sign(
      { userId: user.id, workspaceId: user.workspaces[0]?.id },
      env.JWT_SECRET,
    );

    return { user, token };
  }

  async validateToken(token: string) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as any;
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { workspaces: true },
      });
      return { user, workspaceId: decoded.workspaceId };
    } catch {
      return null;
    }
  }

  async getUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { workspaces: { select: { id: true, name: true, ownerId: true } } },
    });
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    return user;
  }

  async createInvitation(workspaceId: string, email: string, role: 'ADMIN' | 'AGENT' = 'AGENT') {
    const token = jwt.sign({ email, workspaceId, role }, env.JWT_SECRET, { expiresIn: '7d' });

    return prisma.invitation.create({
      data: {
        email,
        token,
        workspaceId,
        role,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  async getInvitation(token: string) {
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { workspace: true },
    });
    if (!invitation) throw new AppError(404, 'INVITATION_NOT_FOUND', 'Invitation not found');
    return invitation;
  }

  async acceptInvitation(token: string, password: string, name: string) {
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { workspace: true },
    });

    if (!invitation || invitation.expiresAt < new Date()) {
      throw new AppError(400, 'INVITATION_EXPIRED', 'Invitation invalid or expired');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    return prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({ where: { email: decoded.email } });

      if (!user) {
        user = await tx.user.create({
          data: {
            email: decoded.email,
            password: hashedPassword,
            name,
            role: decoded.role,
            workspaces: { connect: [{ id: decoded.workspaceId }] },
          },
        });
      } else {
        user = await tx.user.update({
          where: { id: user.id },
          data: { workspaces: { connect: [{ id: decoded.workspaceId }] } },
        });
      }

      await tx.invitation.delete({ where: { id: invitation.id } });

      return user;
    });
  }

  async updateStatus(userId: string, isOnline: boolean) {
    return prisma.user.update({
      where: { id: userId },
      data: { isOnline },
    });
  }
}
