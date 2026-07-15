import { Router } from 'express';
import { db } from '../db/client.js';
import { providerStatus } from '../db/schema.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const providersRouter = Router();

providersRouter.get('/status', asyncHandler(async (_req, res) => {
  res.json(await db.select().from(providerStatus));
}));
