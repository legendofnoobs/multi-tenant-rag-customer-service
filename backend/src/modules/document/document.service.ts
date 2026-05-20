import prisma from '../../db/prisma';
import { ingestionQueue } from '../../lib/queue';

export class DocumentService {
  async listDocuments(workspaceId: string) {
    return prisma.document.findMany({
      where: { workspaceId },
      include: { _count: { select: { chunks: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addDocument(workspaceId: string, filename: string, content: string, file?: Express.Multer.File) {
    const document = await prisma.document.create({
      data: { workspaceId, filename, content: file ? `[FILE: ${file.mimetype}]` : content, status: 'PROCESSING' },
    });

    await ingestionQueue.add('process-document', {
      documentId: document.id,
      content: content,
      fileBuffer: file ? file.buffer.toString('base64') : null,
      mimetype: file ? file.mimetype : 'text/plain',
      workspaceId,
    }, {
      removeOnComplete: true,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    return document;
  }

  async deleteDocument(id: string) {
    return prisma.document.delete({ where: { id } });
  }
}
