import prisma from '../../db/prisma';
import { subDays, startOfDay, format } from 'date-fns';
import axios from 'axios';
import { env } from '../../lib/env';
import { AppError } from '../../lib/errors';

export class AnalyticsService {
  async getDashboardStats(workspaceId: string) {
    const totalConversations = await prisma.conversation.count({ where: { workspaceId } });

    const activeSessions = await prisma.conversation.count({
      where: { workspaceId, status: { in: ['AI_ACTIVE', 'ESCALATED'] } },
    });

    const escalatedChats = await prisma.conversation.count({
      where: { workspaceId, OR: [{ status: 'ESCALATED' }, { assignedToId: { not: null } }] },
    });

    const aiResolved = await prisma.conversation.count({
      where: { workspaceId, status: 'CLOSED', assignedToId: null },
    });

    const aiResolutionRate = totalConversations > 0 ? Math.round((aiResolved / totalConversations) * 100) : 0;

    const totalMessages = await prisma.message.count({
      where: { conversation: { workspaceId } },
    });

    const avgMessages = totalConversations > 0 ? Math.round((totalMessages / totalConversations) * 10) / 10 : 0;

    const docCount = await prisma.document.count({ where: { workspaceId } });

    const last7Days = await this.getDailyStats(workspaceId);

    return {
      activeConversations: activeSessions,
      totalMessages,
      aiResolutionRate,
      escalations: escalatedChats,
      avgMessagesPerChat: avgMessages,
      knowledgeBaseSize: docCount,
      dailyStats: last7Days,
    };
  }

  private async getDailyStats(workspaceId: string) {
    const stats = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(startOfDay(new Date()), i);
      const nextDate = subDays(startOfDay(new Date()), i - 1);

      const count = await prisma.conversation.count({
        where: { workspaceId, createdAt: { gte: date, lt: nextDate } },
      });

      const msgCount = await prisma.message.count({
        where: { conversation: { workspaceId }, createdAt: { gte: date, lt: nextDate } },
      });

      stats.push({ date: format(date, 'yyyy-MM-dd'), conversations: count, messages: msgCount });
    }
    return stats;
  }

  async generateAIInsights(workspaceId: string) {
    const recentMessages = await prisma.message.findMany({
      where: { conversation: { workspaceId } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    if (recentMessages.length === 0) {
      return "Not enough data to generate insights yet. Please wait until you have more conversations.";
    }

    const chatLog = recentMessages
      .reverse()
      .map(m => `${m.role === 'user' ? 'Customer' : 'Agent'}: ${m.content}`)
      .join('\n');

    const currentDate = format(new Date(), 'MMMM d, yyyy');

    const prompt = `
      You are an AI data analyst. I will provide you with a recent chat log between customers and support agents.
      Analyze the conversations and provide a concise, actionable insights report.
      Format your response using Markdown.
      Focus on:
      - The most common topics or questions.
      - Any emerging complaints or recurring issues.
      - A brief recommendation for the business owner.
      
      The current date is: ${currentDate}. Please use this exact date (e.g. "Date: ${currentDate}") in your report header instead of placeholder strings like "[Current Date]".

      CHAT LOG:
      ${chatLog}
    `;

    try {
      const response = await axios.post(`${env.OLLAMA_BASE_URL}/api/generate`, {
        model: 'gemma4:e4b',
        prompt,
        stream: false,
      });

      const insightContent = response.data.response;

      const report = await prisma.insightReport.create({
        data: { content: insightContent, workspaceId },
      });

      return report.content;
    } catch {
      throw new AppError(502, 'AI_UNAVAILABLE', 'Failed to generate insights from AI model');
    }
  }

  async getLatestInsight(workspaceId: string) {
    const report = await prisma.insightReport.findFirst({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
    return report?.content || null;
  }

  async getInsightHistory(workspaceId: string) {
    return await prisma.insightReport.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
