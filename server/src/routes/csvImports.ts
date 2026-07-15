import { Router } from 'express';
import multer from 'multer';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { importBatches } from '../db/schema.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { parseAndStageCsv, commitImportBatch, commitSnowballHoldingsSnapshot, commitSnowballTransactions } from '../services/csvImport.service.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const csvImportsRouter = Router();

csvImportsRouter.post('/', upload.single('file'), asyncHandler(async (req, res) => {
  const userId = req.session.userId!;
  if (!req.file) {
    res.status(400).json({ error: 'A CSV file is required (field name "file")' });
    return;
  }
  const result = await parseAndStageCsv(userId, req.file.originalname, req.file.buffer);
  res.status(201).json(result);
}));

csvImportsRouter.get('/', asyncHandler(async (req, res) => {
  const userId = req.session.userId!;
  const rows = await db
    .select({
      id: importBatches.id,
      originalFilename: importBatches.originalFilename,
      detectedFormat: importBatches.detectedFormat,
      rowCount: importBatches.rowCount,
      status: importBatches.status,
      createdAt: importBatches.createdAt,
    })
    .from(importBatches)
    .where(eq(importBatches.userId, userId))
    .orderBy(desc(importBatches.createdAt));
  res.json(rows);
}));

csvImportsRouter.get('/:id', asyncHandler(async (req, res) => {
  const userId = req.session.userId!;
  const [batch] = await db
    .select()
    .from(importBatches)
    .where(and(eq(importBatches.id, req.params.id), eq(importBatches.userId, userId)))
    .limit(1);
  if (!batch) {
    res.status(404).json({ error: 'Import batch not found' });
    return;
  }
  res.json(batch);
}));

csvImportsRouter.post('/:id/commit', asyncHandler(async (req, res) => {
  const userId = req.session.userId!;
  const { mapping, brokerageAccountId, newAccountName, currency } = req.body ?? {};
  if (!mapping) {
    res.status(400).json({ error: 'mapping is required' });
    return;
  }
  const result = await commitImportBatch(
    userId,
    req.params.id,
    mapping,
    brokerageAccountId ?? null,
    newAccountName ?? null,
    currency ?? 'GBP',
  );
  if (!result.committed) {
    res.status(422).json(result);
    return;
  }
  res.json(result);
}));

csvImportsRouter.post('/:id/commit-snapshot', asyncHandler(async (req, res) => {
  const userId = req.session.userId!;
  const { accountNamePrefix } = req.body ?? {};
  const result = await commitSnowballHoldingsSnapshot(userId, req.params.id, accountNamePrefix || 'Snowball Import');
  if (!result.committed) {
    res.status(422).json(result);
    return;
  }
  res.json(result);
}));

csvImportsRouter.post('/:id/commit-snowball-transactions', asyncHandler(async (req, res) => {
  const userId = req.session.userId!;
  const { accountNamePrefix } = req.body ?? {};
  const result = await commitSnowballTransactions(userId, req.params.id, accountNamePrefix || 'Snowball Import');
  if (!result.committed) {
    res.status(422).json(result);
    return;
  }
  res.json(result);
}));
