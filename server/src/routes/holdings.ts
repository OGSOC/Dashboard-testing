import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { holdings, brokerageAccounts } from '../db/schema.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getQuotesForTickers } from '../services/quote.service.js';

export const holdingsRouter = Router();

holdingsRouter.get('/', asyncHandler(async (req, res) => {
  const userId = req.session.userId!;
  const rows = await db
    .select({
      id: holdings.id,
      brokerageAccountId: holdings.brokerageAccountId,
      brokerageAccountName: brokerageAccounts.accountName,
      ticker: holdings.ticker,
      quantity: holdings.quantity,
      avgCostBasis: holdings.avgCostBasis,
      totalCost: holdings.totalCost,
    })
    .from(holdings)
    .innerJoin(brokerageAccounts, eq(holdings.brokerageAccountId, brokerageAccounts.id))
    .where(eq(holdings.userId, userId));

  const quotes = await getQuotesForTickers(rows.map((r) => r.ticker));

  const result = rows.map((r) => {
    const quote = quotes[r.ticker];
    const quantity = Number(r.quantity);
    const totalCost = Number(r.totalCost);
    const marketValue = quote ? quote.lastPrice * quantity : null;
    const unrealizedGain = marketValue !== null ? marketValue - totalCost : null;
    return {
      id: r.id,
      brokerageAccountId: r.brokerageAccountId,
      brokerageAccountName: r.brokerageAccountName,
      ticker: r.ticker,
      quantity,
      avgCostBasis: Number(r.avgCostBasis),
      totalCost,
      lastPrice: quote?.lastPrice ?? null,
      changePct: quote?.changePct ?? null,
      marketValue,
      unrealizedGain,
      unrealizedGainPct: marketValue !== null && totalCost > 0 ? (unrealizedGain! / totalCost) * 100 : null,
    };
  });

  res.json(result);
}));

holdingsRouter.get('/summary', asyncHandler(async (req, res) => {
  const userId = req.session.userId!;
  const rows = await db.select().from(holdings).where(eq(holdings.userId, userId));
  const quotes = await getQuotesForTickers(rows.map((r) => r.ticker));

  let totalMarketValue = 0;
  let totalCost = 0;
  let dayChangeValue = 0;

  for (const r of rows) {
    const quantity = Number(r.quantity);
    const cost = Number(r.totalCost);
    const quote = quotes[r.ticker];
    totalCost += cost;
    if (quote) {
      const marketValue = quote.lastPrice * quantity;
      totalMarketValue += marketValue;
      if (quote.changePct !== null) {
        dayChangeValue += (marketValue * quote.changePct) / (100 + quote.changePct);
      }
    }
  }

  const totalUnrealizedGain = totalMarketValue - totalCost;

  res.json({
    totalMarketValue,
    totalCost,
    totalUnrealizedGain,
    totalUnrealizedGainPct: totalCost > 0 ? (totalUnrealizedGain / totalCost) * 100 : 0,
    dayChangeValue,
    dayChangePct: totalMarketValue > 0 ? (dayChangeValue / (totalMarketValue - dayChangeValue)) * 100 : 0,
    holdingCount: rows.length,
  });
}));
