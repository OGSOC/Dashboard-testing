import { Router } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { transactions } from '../db/schema.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { recomputeHoldings, updateTransaction } from '../services/portfolio.service.js';

export const transactionsRouter = Router();

transactionsRouter.get('/', asyncHandler(async (req, res) => {
  const userId = req.session.userId!;
  const rows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.tradeDate));
  res.json(
    rows.map((r) => ({
      ...r,
      quantity: Number(r.quantity),
      price: r.price !== null ? Number(r.price) : null,
      fees: Number(r.fees),
      amount: Number(r.amount),
    })),
  );
}));

transactionsRouter.patch('/:id', asyncHandler(async (req, res) => {
  const userId = req.session.userId!;
  const { ticker, transactionType, tradeDate, quantity, price, fees, amount } = req.body ?? {};
  const updated = await updateTransaction(userId, req.params.id, {
    ticker: typeof ticker === 'string' ? ticker : undefined,
    transactionType: typeof transactionType === 'string' ? transactionType : undefined,
    tradeDate: typeof tradeDate === 'string' ? tradeDate : undefined,
    quantity: typeof quantity === 'number' ? quantity : undefined,
    price: price === null ? null : typeof price === 'number' ? price : undefined,
    fees: typeof fees === 'number' ? fees : undefined,
    amount: typeof amount === 'number' ? amount : undefined,
  });
  if (!updated) {
    res.status(404).json({ error: 'Transaction not found or no changes provided' });
    return;
  }
  res.status(204).end();
}));

transactionsRouter.delete('/:id', asyncHandler(async (req, res) => {
  const userId = req.session.userId!;
  await db.delete(transactions).where(and(eq(transactions.id, req.params.id), eq(transactions.userId, userId)));
  await recomputeHoldings(userId);
  res.status(204).end();
}));
