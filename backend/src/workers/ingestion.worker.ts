import { Worker, Job } from 'bullmq';
import crypto from 'crypto';
import prisma from '../db/prisma';
import { RAGService } from '../services/rag/rag.service';
import { emitEvent, AppEvent } from '../lib/events';
import { redisConnection } from '../lib/queue';
import { logger } from '../lib/logger';

const parsePdfBuffer = async (buffer: Buffer): Promise<string> => {
  const pdfModule = require('pdf-parse');

  const PDFParseClass = pdfModule.PDFParse || (pdfModule.default && pdfModule.default.PDFParse);
  if (PDFParseClass) {
    const parser = new PDFParseClass({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy().catch(() => {});
    }
  }

  let parseFunc = pdfModule;
  if (typeof parseFunc !== 'function' && parseFunc.default) {
    parseFunc = parseFunc.default;
  }

  if (typeof parseFunc === 'function') {
    const result = await parseFunc(buffer);
    return result.text;
  }

  throw new Error('Unsupported or unrecognized pdf-parse library structure.');
};

import mammoth from 'mammoth';

const ragService = new RAGService();

const processor = async (job: Job) => {
  const { documentId, content, fileBuffer, mimetype, workspaceId } = job.data;

  try {
    let finalContent = content;

    if (fileBuffer) {
      const buffer = Buffer.from(fileBuffer, 'base64');

      if (mimetype === 'application/pdf') {
        finalContent = await parsePdfBuffer(buffer);
      } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const data = await mammoth.extractRawText({ buffer });
        finalContent = data.value;
      } else if (mimetype === 'text/plain') {
        finalContent = buffer.toString('utf-8');
      }

      await prisma.document.update({
        where: { id: documentId },
        data: { content: finalContent },
      });
    }

    logger.info({ documentId }, 'Processing document');

    const words = finalContent.split(/\s+/).filter((w: string) => w.length > 0);
    const CHUNK_SIZE_WORDS = 150;
    const CHUNK_OVERLAP_WORDS = 45;
    const chunks: string[] = [];

    if (words.length <= CHUNK_SIZE_WORDS) {
      chunks.push(finalContent);
    } else {
      for (let i = 0; i < words.length; i += (CHUNK_SIZE_WORDS - CHUNK_OVERLAP_WORDS)) {
        const chunkWords = words.slice(i, i + CHUNK_SIZE_WORDS);
        if (chunkWords.length > 0) {
          chunks.push(chunkWords.join(' '));
        }
        if (i + CHUNK_SIZE_WORDS >= words.length) break;
      }
    }

    for (const chunkContent of chunks) {
      const embedding = await ragService.getEmbedding(chunkContent);
      const vectorStr = `[${embedding.join(',')}]`;

      await prisma.$executeRaw`
        INSERT INTO "DocumentChunk" (id, content, "documentId", embedding)
        VALUES (${crypto.randomUUID()}, ${chunkContent}, ${documentId}, ${vectorStr}::vector)
      `;
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'COMPLETED' },
    });

    await emitEvent({
      workspaceId,
      type: AppEvent.DOCUMENT_PROCESSED,
      data: { documentId },
    });

    logger.info({ documentId }, 'Document processing completed');
  } catch (error) {
    logger.error({ err: error, documentId }, 'Document processing failed');
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'ERROR' },
    }).catch((e) => logger.error({ err: e, documentId }, 'Failed to update document status to ERROR'));
    throw error;
  }
};

export const ingestionWorker = new Worker('document-ingestion', processor, {
  connection: redisConnection,
  concurrency: 2,
});

ingestionWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Ingestion job failed');
});
