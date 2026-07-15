import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { holdings, brokerageAccounts } from '../db/schema.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getQuotesForTickers } from '../services/quote.service.js';
import { getCrossRate } from '../services/fx.service.js';

export const holdingsRouter = Router();

holdingsRouter.get('/', asyncHandler(async (req, res) => {
  const userId = req.session.userId!;
  const rows = await db
    .select({
      id: holdings.id,
      brokerageAccountId: holdings.brokerageAccountId,
      brokerageAccountName: brokerageAccounts.accountName,
      accountCurrency: brokerageAccounts.currency,
      ticker: holdings.ticker,
      quantity: holdings.quantity,
      avgCostBasis: holdings.avgCostBasis,
      totalCost: holdings.totalCost,
    })
    .from(holdings)
    .innerJoin(brokerageAccounts, eq(holdings.brokerageAccountId, brokerageAccounts.id))
    .where(eq(holdings.userId, userId));

  const quotes = await getQuotesForTickers(rows.map((r) => r.ticker));
  const displayCurrency = req.currentUser?.displayCurrency ?? 'GBP';
  const usdRate = req.currentUser?.fxRateFromUsd ?? (await getCrossRate('USD', displayCurrency));
  const accountCurrencies = Array.from(new Set(rows.map((r) => r.accountCurrency)));
  const costRateByCurrency = new Map<string, number>(
    await Promise.all(accountCurrencies.map(async (c) => [c, await getCrossRate(c, displayCurrency)] as [string, number])),
  );

  const result = rows.map((r) => {
    const quote = quotes[r.ticker];
    const quantity = Number(r.quantity);
    const costRate = costRateByCurrency.get(r.accountCurrency) ?? 1;
    const totalCost = Number(r.totalCost) * costRate;
    const marketValue = quote ? quote.lastPrice * quantity * usdRate : null;
    const unrealizedGain = marketValue !== null ? marketValue - totalCost : null;
    return {
      id: r.id,
      brokerageAccountId: r.brokerageAccountId,
      brokerageAccountName: r.brokerageAccountName,
      ticker: r.ticker,
      quantity,
      currency: displayCurrency,
      avgCostBasis: quantity > 0 ? totalCost / quantity : 0,
      totalCost,
      lastPrice: quote ? quote.lastPrice * usdRate : null,
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
  const rows = await db
    .select({
      ticker: holdings.ticker,
      quantity: holdings.quantity,
      totalCost: holdings.totalCost,
      accountCurrency: brokerageAccounts.currency,
    })
    .from(holdings)
    .innerJoin(brokerageAccounts, eq(holdings.brokerageAccountId, brokerageAccounts.id))
    .where(eq(holdings.userId, userId));

  const quotes = await getQuotesForTickers(rows.map((r) => r.ticker));
  const displayCurrency = req.currentUser?.displayCurrency ?? 'GBP';
  const usdRate = req.currentUser?.fxRateFromUsd ?? (await getCrossRate('USD', displayCurrency));
  const accountCurrencies = Array.from(new Set(rows.map((r) => r.accountCurrency)));
  const costRateByCurrency = new Map<string, number>(
    await Promise.all(accountCurrencies.map(async (c) => [c, await getCrossRate(c, displayCurrency)] as [string, number])),
  );

  let totalMarketValue = 0;
  let totalCost = 0;
  let dayChangeValue = 0;

  for (const r of rows) {
    const quantity = Number(r.quantity);
    const costRate = costRateByCurrency.get(r.accountCurrency) ?? 1;
    const cost = Number(r.totalCost) * costRate;
    const quote = quotes[r.ticker];
    totalCost += cost;
    if (quote) {
      const marketValue = quote.lastPrice * quantity * usdRate;
      totalMarketValue += marketValue;
      if (quote.changePct !== null) {
        dayChangeValue += (marketValue * quote.changePct) / (100 + quote.changePct);
      }
    }
  }

  const totalUnrealizedGain = totalMarketValue - totalCost;

  res.json({
    currency: displayCurrency,
    totalMarketValue,
    totalCost,
    totalUnrealizedGain,
    totalUnrealizedGainPct: totalCost > 0 ? (totalUnrealizedGain / totalCost) * 100 : 0,
    dayChangeValue,
    dayChangePct: totalMarketValue > 0 ? (dayChangeValue / (totalMarketValue - dayChangeValue)) * 100 : 0,
    holdingCount: rows.length,
  });
}));
