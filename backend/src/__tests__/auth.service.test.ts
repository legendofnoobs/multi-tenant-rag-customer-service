import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    workspace: {
      create: vi.fn(),
    },
    invitation: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn((cb: any) => cb({
      user: {
        create: vi.fn().mockResolvedValue({ id: 'user-1', email: 'test@test.com', role: 'WORKSPACE_OWNER' }),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      workspace: {
        create: vi.fn().mockResolvedValue({ id: 'ws-1', name: 'Test Workspace' }),
      },
      invitation: {
        delete: vi.fn(),
      },
    })),
  },
}));

vi.mock('../lib/env', () => ({
  env: { JWT_SECRET: 'test-secret' },
}));

import { AuthService } from '../modules/auth/auth.service';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should create user and workspace', async () => {
      const result = await authService.register('test@test.com', 'password123', 'Test Workspace', 'Test User');

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.workspace).toBeDefined();
      expect(result.token).toBeDefined();
    });
  });

  describe('login', () => {
    it('should throw on invalid credentials', async () => {
      const prisma = (await import('../db/prisma')).default;
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      await expect(authService.login('test@test.com', 'wrong')).rejects.toThrow('Invalid email or password');
    });
  });

  describe('getUser', () => {
    it('should throw on missing user', async () => {
      const prisma = (await import('../db/prisma')).default;
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      await expect(authService.getUser('nonexistent')).rejects.toThrow('User not found');
    });
  });
});
