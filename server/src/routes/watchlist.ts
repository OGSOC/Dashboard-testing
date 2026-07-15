import { Router } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { watchlist } from '../db/schema.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getQuotesForTickers } from '../services/quote.service.js';

export const watchlistRouter = Router();

watchlistRouter.get('/', asyncHandler(async (req, res) => {
  const userId = req.session.userId!;
  const rows = await db.select().from(watchlist).where(eq(watchlist.userId, userId));
  const quotes = await getQuotesForTickers(rows.map((r) => r.ticker));
  res.json(
    rows.map((r) => ({
      id: r.id,
      ticker: r.ticker,
      notes: r.notes,
      addedAt: r.addedAt,
      lastPrice: quotes[r.ticker]?.lastPrice ?? null,
      changePct: quotes[r.ticker]?.changePct ?? null,
    })),
  );
}));

watchlistRouter.post('/', asyncHandler(async (req, res) => {
  const userId = req.session.userId!;
  const { ticker, notes } = req.body ?? {};
  if (typeof ticker !== 'string' || ticker.trim().length === 0) {
    res.status(400).json({ error: 'ticker is required' });
    return;
  }
  const [row] = await db
    .insert(watchlist)
    .values({ userId, ticker: ticker.trim().toUpperCase(), notes: notes ?? null })
    .onConflictDoNothing()
    .returning();
  res.status(201).json(row ?? { ticker: ticker.trim().toUpperCase(), alreadyExists: true });
}));

watchlistRouter.delete('/:id', asyncHandler(async (req, res) => {
  const userId = req.session.userId!;
  await db.delete(watchlist).where(and(eq(watchlist.id, req.params.id), eq(watchlist.userId, userId)));
  res.status(204).end();
}));
