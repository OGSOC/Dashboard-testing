import { parse } from 'csv-parse/sync';
import { and, eq } from 'drizzle-orm';
import { canonicalTransactionRowSchema, normalizeActionString, type CanonicalFieldKey } from '@stockdash/shared';
import { db } from '../db/client.js';
import { importBatches, transactions, brokerageAccounts, dividendSchedule } from '../db/schema.js';
import { detectFormat } from '../csv/parsers/detectFormat.js';
import { recomputeHoldings } from './portfolio.service.js';

export async function parseAndStageCsv(userId: string, originalFilename: string, fileBuffer: Buffer) {
  const rawText = fileBuffer.toString('utf-8');
  const rows: Record<string, string>[] = parse(rawText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });

  if (rows.length === 0) {
    throw new Error('CSV file has no data rows');
  }

  const headers = Object.keys(rows[0]);
  const { detectedFormat, suggestedMapping, isSnapshotFormat } = detectFormat(headers);

  const [batch] = await db
    .insert(importBatches)
    .values({
      userId,
      originalFilename,
      detectedFormat,
      headers,
      rawRows: rows,
      suggestedMapping,
      rowCount: rows.length,
      status: 'pending_review',
    })
    .returning();

  return {
    importBatchId: batch.id,
    detectedFormat,
    headers,
    suggestedMapping,
    isSnapshotFormat,
    previewRows: rows.slice(0, 20),
    rowCount: rows.length,
    snapshotSummary: isSnapshotFormat ? summarizeSnowballHoldings(rows) : null,
  };
}

interface SnowballHoldingRow {
  ticker: string;
  shares: number;
  currency: string;
  costBasis: number;
  costPerShare: number;
  dividendsPerShareAnnual: number | null;
  nextPaymentDate: string | null;
  nextPaymentAmountTotal: number | null;
  exDividendDate: string | null;
}

function parseSnowballDate(raw: string | undefined): string | null {
  if (!raw || !raw.trim()) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function parseSnowballHoldingRows(rows: Record<string, string>[]): SnowballHoldingRow[] {
  return rows
    .map((r) => ({
      ticker: (r['Holding'] ?? '').trim().toUpperCase(),
      shares: Number(r['Shares']) || 0,
      currency: (r['Currency'] ?? 'USD').trim().toUpperCase(),
      costBasis: Number(r['Cost basis']) || 0,
      costPerShare: Number(r['Cost per share']) || 0,
      dividendsPerShareAnnual: r['Dividends per share'] ? Number(r['Dividends per share']) : null,
      nextPaymentDate: parseSnowballDate(r['Date of the next payment']),
      nextPaymentAmountTotal: r['Next payment'] ? Number(r['Next payment']) : null,
      exDividendDate: parseSnowballDate(r['Ex-dividend date']),
    }))
    .filter((r) => r.ticker && r.shares > 0);
}

function summarizeSnowballHoldings(rows: Record<string, string>[]) {
  const parsed = parseSnowballHoldingRows(rows);
  return {
    tickerCount: parsed.length,
    currencies: Array.from(new Set(parsed.map((r) => r.currency))),
  };
}

function toNumber(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[$,()]/g, '').trim();
  const negative = raw.includes('(') && raw.includes(')');
  const value = Number(cleaned);
  if (Number.isNaN(value)) return 0;
  return negative ? -Math.abs(value) : value;
}

export async function commitImportBatch(
  userId: string,
  importBatchId: string,
  mapping: Record<CanonicalFieldKey, string | null>,
  brokerageAccountId: string | null,
  newAccountName: string | null,
  currency = 'GBP',
) {
  const [batch] = await db
    .select()
    .from(importBatches)
    .where(and(eq(importBatches.id, importBatchId), eq(importBatches.userId, userId)))
    .limit(1);

  if (!batch) throw new Error('Import batch not found');
  if (batch.status === 'committed') throw new Error('Import batch already committed');

  const missingCoreFields = (['ticker', 'tradeDate', 'transactionType'] as const).filter((f) => !mapping[f]);
  if (missingCoreFields.length > 0) {
    const errors = [
      `Map a column for: ${missingCoreFields.join(', ')} before importing — every row was skipped because ${missingCoreFields.length > 1 ? 'these are' : 'this is'} required.`,
    ];
    await db.update(importBatches).set({ status: 'failed', errorLog: errors }).where(eq(importBatches.id, importBatchId));
    return { committed: false, errors, rowsCommitted: 0 };
  }

  let accountId = brokerageAccountId;
  let accountCurrency = currency;
  if (!accountId) {
    if (!newAccountName) throw new Error('brokerageAccountId or newAccountName is required');
    const [account] = await db
      .insert(brokerageAccounts)
      .values({ userId, broker: batch.detectedFormat, accountName: newAccountName, currency })
      .returning();
    accountId = account.id;
    accountCurrency = account.currency;
  } else {
    const [account] = await db.select().from(brokerageAccounts).where(eq(brokerageAccounts.id, accountId)).limit(1);
    if (account) accountCurrency = account.currency;
  }

  const errors: string[] = [];
  const rowsToInsert: (typeof transactions.$inferInsert)[] = [];

  for (const [index, raw] of (batch.rawRows as Record<string, string>[]).entries()) {
    try {
      const tickerRaw = mapping.ticker ? raw[mapping.ticker] : undefined;
      const dateRaw = mapping.tradeDate ? raw[mapping.tradeDate] : undefined;
      const typeRaw = mapping.transactionType ? raw[mapping.transactionType] : undefined;
      const quantityRaw = mapping.quantity ? raw[mapping.quantity] : undefined;
      const priceRaw = mapping.price ? raw[mapping.price] : undefined;
      const feesRaw = mapping.fees ? raw[mapping.fees] : undefined;
      const amountRaw = mapping.amount ? raw[mapping.amount] : undefined;

      if (!tickerRaw || !dateRaw || !typeRaw) {
        const blank = [!tickerRaw && 'ticker', !dateRaw && 'trade date', !typeRaw && 'action'].filter(Boolean).join(', ');
        errors.push(`Row ${index + 1}: blank ${blank} cell`);
        continue;
      }

      const transactionType = normalizeActionString(typeRaw);
      if (!transactionType) {
        errors.push(`Row ${index + 1}: unrecognized action "${typeRaw}"`);
        continue;
      }

      const parsedDate = new Date(dateRaw);
      if (Number.isNaN(parsedDate.getTime())) {
        errors.push(`Row ${index + 1}: invalid date "${dateRaw}"`);
        continue;
      }

      const candidate = canonicalTransactionRowSchema.parse({
        ticker: tickerRaw,
        tradeDate: parsedDate.toISOString().slice(0, 10),
        transactionType,
        quantity: Math.abs(toNumber(quantityRaw)),
        price: priceRaw ? Math.abs(toNumber(priceRaw)) : null,
        fees: feesRaw ? Math.abs(toNumber(feesRaw)) : 0,
        amount: toNumber(amountRaw),
      });

      rowsToInsert.push({
        userId,
        brokerageAccountId: accountId,
        importBatchId,
        ticker: candidate.ticker,
        transactionType: candidate.transactionType,
        tradeDate: candidate.tradeDate,
        quantity: candidate.quantity.toFixed(6),
        price: candidate.price?.toFixed(6),
        fees: candidate.fees.toFixed(6),
        amount: candidate.amount.toFixed(2),
        currency: accountCurrency,
        rawRow: raw,
      });
    } catch (err) {
      errors.push(`Row ${index + 1}: ${err instanceof Error ? err.message : 'invalid row'}`);
    }
  }

  if (errors.length > 0) {
    await db.update(importBatches).set({ status: 'failed', errorLog: errors }).where(eq(importBatches.id, importBatchId));
    return { committed: false, errors, rowsCommitted: 0 };
  }

  await db.transaction(async (tx) => {
    if (rowsToInsert.length > 0) {
      await tx.insert(transactions).values(rowsToInsert);
    }
    await tx.update(importBatches).set({ status: 'committed', columnMapping: mapping }).where(eq(importBatches.id, importBatchId));
  });

  await recomputeHoldings(userId);

  return { committed: true, errors: [], rowsCommitted: rowsToInsert.length };
}

/**
 * Commits a Snowball Analytics "Holdings" export — a point-in-time portfolio snapshot, not a
 * transaction ledger. Each row becomes a single synthetic "buy" transaction dated today, using
 * Snowball's own aggregate cost basis/avg price, so the resulting holding matches what Snowball
 * shows. Real historical buy/sell dates aren't in this export, so per-lot history isn't
 * reconstructed — this is a starting position, not a replacement for a transaction history.
 * Rows are split across one brokerage account per currency, since holdings/cost-basis math
 * assumes a single currency per account. Upcoming ex-dividend/pay dates and per-share amounts
 * (which this export does include) are also seeded into the dividend calendar directly.
 */
export async function commitSnowballHoldingsSnapshot(userId: string, importBatchId: string, accountNamePrefix: string) {
  const [batch] = await db
    .select()
    .from(importBatches)
    .where(and(eq(importBatches.id, importBatchId), eq(importBatches.userId, userId)))
    .limit(1);

  if (!batch) throw new Error('Import batch not found');
  if (batch.status === 'committed') throw new Error('Import batch already committed');

  const holdingRows = parseSnowballHoldingRows(batch.rawRows as Record<string, string>[]);
  if (holdingRows.length === 0) {
    const errors = ['No valid holding rows found (each row needs a ticker and a positive share count).'];
    await db.update(importBatches).set({ status: 'failed', errorLog: errors }).where(eq(importBatches.id, importBatchId));
    return { committed: false, errors, rowsCommitted: 0 };
  }

  const today = new Date().toISOString().slice(0, 10);
  const accountIdByCurrency = new Map<string, string>();

  await db.transaction(async (tx) => {
    for (const currency of new Set(holdingRows.map((r) => r.currency))) {
      const [account] = await tx
        .insert(brokerageAccounts)
        .values({ userId, broker: 'snowball_holdings', accountName: `${accountNamePrefix} (${currency})`, currency })
        .returning();
      accountIdByCurrency.set(currency, account.id);
    }

    const rowsToInsert = holdingRows.map((r) => ({
      userId,
      brokerageAccountId: accountIdByCurrency.get(r.currency)!,
      importBatchId,
      ticker: r.ticker,
      transactionType: 'buy' as const,
      tradeDate: today,
      quantity: r.shares.toFixed(6),
      price: r.costPerShare.toFixed(6),
      fees: '0',
      amount: (-r.costBasis).toFixed(2),
      currency: r.currency,
      rawRow: { note: 'Synthesized opening position from a Snowball Analytics holdings snapshot' },
    }));
    await tx.insert(transactions).values(rowsToInsert);

    for (const r of holdingRows) {
      if (!r.exDividendDate || !r.nextPaymentAmountTotal || r.shares === 0) continue;
      const perShare = r.nextPaymentAmountTotal / r.shares;
      await tx
        .insert(dividendSchedule)
        .values({
          ticker: r.ticker,
          exDividendDate: r.exDividendDate,
          payDate: r.nextPaymentDate,
          amount: perShare.toFixed(4),
          currency: r.currency,
          source: 'snowball_import',
        })
        .onConflictDoNothing({ target: [dividendSchedule.ticker, dividendSchedule.exDividendDate] });
    }

    await tx.update(importBatches).set({ status: 'committed' }).where(eq(importBatches.id, importBatchId));
  });

  await recomputeHoldings(userId);

  return { committed: true, errors: [], rowsCommitted: holdingRows.length };
}
