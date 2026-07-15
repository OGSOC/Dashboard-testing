import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getTrackedTickersForUser } from '../services/trackedTickers.service.js';
import {
  getDividendCalendar,
  getDividendHistory,
  getDividendSummary,
  refreshStaleDividends,
  getMonthlyIncome,
  getYearlyIncome,
  getDividendGrowth,
} from '../services/dividend.service.js';
import { db } from '../db/client.js';
import { holdings, brokerageAccounts } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { getCrossRate } from '../services/fx.service.js';
import { projectDripGrowth } from '../services/dripCalculator.service.js';

export const dividendsRouter = Router();

dividendsRouter.get('/calendar', asyncHandler(async (req, res) => {
  const userId = req.session.userId!;
  const tickers = await getTrackedTickersForUser(userId);
  await refreshStaleDividends(tickers, 5);
  const currency = req.currentUser?.displayCurrency ?? 'GBP';
  res.json(await getDividendCalendar(tickers, currency));
}));

dividendsRouter.get('/summary', asyncHandler(async (req, res) => {
  const userId = req.session.userId!;
  const currency = req.currentUser?.displayCurrency ?? 'GBP';
  res.json(await getDividendSummary(userId, currency));
}));

dividendsRouter.get('/income-by-month', asyncHandler(async (req, res) => {
  const userId = req.session.userId!;
  const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
  const currency = req.currentUser?.displayCurrency ?? 'GBP';
  res.json({ year, currency, months: await getMonthlyIncome(userId, year, currency) });
}));

dividendsRouter.get('/income-by-year', asyncHandler(async (req, res) => {
  const userId = req.session.userId!;
  const currency = req.currentUser?.displayCurrency ?? 'GBP';
  res.json({ currency, years: await getYearlyIncome(userId, currency) });
}));

dividendsRouter.get('/growth', asyncHandler(async (req, res) => {
  const userId = req.session.userId!;
  const tickers = await getTrackedTickersForUser(userId);
  const growth = await getDividendGrowth(tickers);

  const heldRows = await db.select().from(holdings).where(eq(holdings.userId, userId));
  const weighted = growth.filter((g) => g.cagr !== null && heldRows.some((h) => h.ticker === g.ticker));
  // Weight only over holdings that actually have a CAGR figure, so partial coverage
  // doesn't silently drag the average toward zero.
  const weightedTotalCost = weighted.reduce((sum, g) => sum + Number(heldRows.find((h) => h.ticker === g.ticker)!.totalCost), 0);
  const portfolioWeightedCagr =
    weighted.length > 0 && weightedTotalCost > 0
      ? weighted.reduce((sum, g) => {
          const held = heldRows.find((h) => h.ticker === g.ticker)!;
          return sum + g.cagr! * (Number(held.totalCost) / weightedTotalCost);
        }, 0)
      : null;

  res.json({ tickers: growth, portfolioWeightedCagr });
}));

dividendsRouter.get('/:ticker/history', asyncHandler(async (req, res) => {
  res.json(await getDividendHistory(req.params.ticker.toUpperCase()));
}));

dividendsRouter.post('/drip-projection', asyncHandler(async (req, res) => {
  const userId = req.session.userId!;
  const displayCurrency = req.currentUser?.displayCurrency ?? 'GBP';
  const {
    years = 20,
    monthlyContribution = 0,
    priceGrowthRatePct,
    dividendGrowthRatePct,
    reinvestDividends = true,
    startingValue,
    startingAnnualDividend,
  } = req.body ?? {};

  let resolvedStartingValue = startingValue;
  let resolvedStartingDividend = startingAnnualDividend;

  if (resolvedStartingValue === undefined || resolvedStartingDividend === undefined) {
    const rows = await db
      .select({ totalCost: holdings.totalCost, accountCurrency: brokerageAccounts.currency, quantity: holdings.quantity, ticker: holdings.ticker })
      .from(holdings)
      .innerJoin(brokerageAccounts, eq(holdings.brokerageAccountId, brokerageAccounts.id))
      .where(eq(holdings.userId, userId));

    if (resolvedStartingValue === undefined) {
      const currencies = Array.from(new Set(rows.map((r) => r.accountCurrency)));
      const rateByCurrency = new Map<string, number>(
        await Promise.all(currencies.map(async (c) => [c, await getCrossRate(c, displayCurrency)] as [string, number])),
      );
      resolvedStartingValue = rows.reduce((sum, r) => sum + Number(r.totalCost) * (rateByCurrency.get(r.accountCurrency) ?? 1), 0);
    }
    if (resolvedStartingDividend === undefined) {
      const summary = await getDividendSummary(userId, displayCurrency);
      resolvedStartingDividend = summary.yieldOnCostByTicker.reduce((sum, r) => sum + r.annualIncome, 0);
    }
  }

  const projection = projectDripGrowth({
    startingValue: Number(resolvedStartingValue) || 0,
    startingAnnualDividend: Number(resolvedStartingDividend) || 0,
    monthlyContribution: Number(monthlyContribution) || 0,
    priceGrowthRatePct: priceGrowthRatePct !== undefined ? Number(priceGrowthRatePct) : 7,
    dividendGrowthRatePct: dividendGrowthRatePct !== undefined ? Number(dividendGrowthRatePct) : 6,
    years: Math.min(Math.max(Number(years) || 20, 1), 50),
    reinvestDividends: Boolean(reinvestDividends),
  });

  res.json({ currency: displayCurrency, startingValue: resolvedStartingValue, startingAnnualDividend: resolvedStartingDividend, projection });
}));
