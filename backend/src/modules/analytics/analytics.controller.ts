import { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { TenantRequest } from '../../middleware/tenant.middleware';
import { asyncHandler } from '../../lib/errors';

const analyticsService = new AnalyticsService();

export class AnalyticsController {
  getStats = asyncHandler(async (req: TenantRequest, res: Response) => {
    const stats = await analyticsService.getDashboardStats(req.workspaceId!);
    res.json(stats);
  });

  getInsights = asyncHandler(async (req: TenantRequest, res: Response) => {
    const insights = await analyticsService.getLatestInsight(req.workspaceId!);
    res.json({ insights });
  });

  generateInsights = asyncHandler(async (req: TenantRequest, res: Response) => {
    const insights = await analyticsService.generateAIInsights(req.workspaceId!);
    res.json({ insights });
  });

  getInsightHistory = asyncHandler(async (req: TenantRequest, res: Response) => {
    const history = await analyticsService.getInsightHistory(req.workspaceId!);
    res.json(history);
  });
}
