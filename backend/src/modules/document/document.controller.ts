import { Response } from 'express';
import { DocumentService } from './document.service';
import { TenantRequest } from '../../middleware/tenant.middleware';
import { asyncHandler, AppError } from '../../lib/errors';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const documentService = new DocumentService();

export class DocumentController {
  upload = asyncHandler(async (req: TenantRequest, res: Response) => {
    const { title, content } = req.body;
    const file = req.file;

    if (file) {
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new AppError(400, 'INVALID_FILE_TYPE', 'Only PDF, DOCX, and TXT files are allowed');
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new AppError(400, 'FILE_TOO_LARGE', 'File size must be under 10MB');
      }
    }

    const doc = await documentService.addDocument(
      req.workspaceId!,
      file ? file.originalname : title,
      content || '',
      file,
    );
    res.status(201).json(doc);
  });

  list = asyncHandler(async (req: TenantRequest, res: Response) => {
    const docs = await documentService.listDocuments(req.workspaceId!);
    res.json(docs);
  });

  delete = asyncHandler(async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    await documentService.deleteDocument(id);
    res.status(204).send();
  });
}
