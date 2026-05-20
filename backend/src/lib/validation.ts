import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const registerSchema = z.object({
  name: z.string().optional(),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  workspaceName: z.string().min(1, 'Workspace name is required'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required'),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required'),
});

export const sendMessageSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  conversationId: z.string().optional(),
  isPreview: z.boolean().optional(),
});

export const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
});

export const cannedResponseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  shortcut: z.string().optional(),
});

export const brandingSchema = z.object({
  widgetName: z.string().optional(),
  widgetColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color').optional(),
  welcomeMessage: z.string().optional(),
});

export const updateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'AGENT'], { message: 'Role must be ADMIN or AGENT' }),
});

export const updateStatusSchema = z.object({
  isOnline: z.boolean(),
});

export const typingStatusSchema = z.object({
  isTyping: z.boolean(),
});

export const agentReplySchema = z.object({
  content: z.string().min(1, 'Content is required'),
});

type ValidationSchema = z.ZodSchema<any>;

export const validate = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return res.status(400).json({ error: 'Validation failed', details });
    }
    req.body = result.data;
    next();
  };
};
