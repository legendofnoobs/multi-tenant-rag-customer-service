import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock('../lib/env', () => ({
  env: { OLLAMA_BASE_URL: 'http://localhost:11434' },
}));

vi.mock('../db/prisma', () => ({
  default: {
    $queryRaw: vi.fn(),
  },
}));

vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { RAGService } from '../services/rag/rag.service';
import axios from 'axios';

describe('RAGService', () => {
  let ragService: RAGService;

  beforeEach(() => {
    ragService = new RAGService();
    vi.clearAllMocks();
  });

  describe('getEmbedding', () => {
    it('should return embedding from Ollama', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({ data: { embedding: [0.1, 0.2, 0.3] } });

      const result = await ragService.getEmbedding('test text');
      expect(result).toEqual([0.1, 0.2, 0.3]);
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:11434/api/embeddings',
        expect.objectContaining({ model: 'nomic-embed-text', prompt: 'search_document: test text' }),
      );
    });
  });

  describe('generateResponse', () => {
    it('should generate response from Ollama', async () => {
      vi.mocked(axios.post)
        .mockResolvedValueOnce({ data: { embedding: [0.1, 0.2, 0.3] } })
        .mockResolvedValueOnce({ data: { response: 'Hello, how can I help?' } });

      const prisma = (await import('../db/prisma')).default;
      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([]);

      const result = await ragService.generateResponse('ws-1', 'hello');
      expect(result.response).toBe('Hello, how can I help?');
      expect(result.sources).toEqual([]);
    });
  });
});
