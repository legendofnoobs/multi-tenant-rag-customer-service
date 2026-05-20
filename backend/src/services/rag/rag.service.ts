import axios from 'axios';
import prisma from '../../db/prisma';
import { env } from '../../lib/env';
import { logger } from '../../lib/logger';

export class RAGService {
  async getEmbedding(text: string, isQuery = false) {
    const prefix = isQuery ? 'search_query: ' : 'search_document: ';
    const embedRes = await axios.post(`${env.OLLAMA_BASE_URL}/api/embeddings`, {
      model: 'nomic-embed-text',
      prompt: `${prefix}${text}`,
    });
    return embedRes.data.embedding;
  }

  async generateResponse(workspaceId: string, query: string, history: any[] = []) {
    const embedding = await this.getEmbedding(query, true);
    const vectorStr = `[${embedding.join(',')}]`;

    const chunks: any[] = await prisma.$queryRaw`
      SELECT 
        dc.content, 
        d.filename,
        1 - (dc.embedding <=> ${vectorStr}::vector) as similarity
      FROM "DocumentChunk" dc
      INNER JOIN "Document" d ON dc."documentId" = d.id
      WHERE d."workspaceId" = ${workspaceId}
      AND 1 - (dc.embedding <=> ${vectorStr}::vector) > 0.3
      ORDER BY similarity DESC
      LIMIT 6
    `;

    if (chunks.length > 0) {
      logger.debug({ chunkCount: chunks.length, topSimilarity: chunks[0].similarity }, 'RAG search results');
    } else {
      logger.debug({ query }, 'No chunks found above threshold');
    }

    const context = chunks.map(c => c.content).join('\n\n');
    const sources = Array.from(new Set(chunks.map(c => c.filename)));
    const historyText = history.map(h => `${h.role}: ${h.content}`).join('\n');

    const systemPrompt = `
      You are a support assistant for this company. 
      Use the provided context to answer the user's question.
      
      RULES:
      - ALWAYS respond in the same language as the user's message.
      - If the context doesn't contain the answer, politely tell the user you are not sure about this specific detail, but try to be as helpful as possible based on general knowledge or ask for clarification.
      - Only suggest a "human agent" or "representative" if the user seems frustrated or specifically asks for something beyond your capabilities.
      - Be professional and concise.

      CONTEXT:
      ${context}

      HISTORY:
      ${historyText}
    `;

    const response = await axios.post(`${env.OLLAMA_BASE_URL}/api/generate`, {
      model: 'gemma4:e4b',
      prompt: `${systemPrompt}\n\nUser: ${query}\nAssistant:`,
      stream: false,
    });

    return {
      response: response.data.response,
      sources: chunks.length > 0 ? sources : [],
    };
  }
}
