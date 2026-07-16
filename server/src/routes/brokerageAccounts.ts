import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { brokerageAccounts } from '../db/schema.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const brokerageAccountsRouter = Router();

brokerageAccountsRouter.get('/', asyncHandler(async (req, res) => {
  const userId = req.session.userId!;
  const rows = await db.select().from(brokerageAccounts).where(eq(brokerageAccounts.userId, userId));
  res.json(rows);
}));

brokerageAccountsRouter.post('/', asyncHandler(async (req, res) => {
  const userId = req.session.userId!;
  const { broker, accountName, currency } = req.body ?? {};
  if (typeof accountName !== 'string' || accountName.trim().length === 0) {
    res.status(400).json({ error: 'accountName is required' });
    return;
  }
  const [row] = await db
    .insert(brokerageAccounts)
    .values({ userId, broker: broker || 'generic', accountName: accountName.trim(), currency: currency || 'GBP' })
    .returning();
  res.status(201).json(row);
}));
