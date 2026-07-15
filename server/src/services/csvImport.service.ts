import { parse } from 'csv-parse/sync';
import { and, eq } from 'drizzle-orm';
import { canonicalTransactionRowSchema, normalizeActionString, type CanonicalFieldKey } from '@stockdash/shared';
import { db } from '../db/client.js';
import { importBatches, transactions, brokerageAccounts } from '../db/schema.js';
import { detectFormat } from '../csv/parsers/detectFormat.js';
import { recomputeHoldings } from './portfolio.service.js';

export async function parseAndStageCsv(userId: string, originalFilename: string, fileBuffer: Buffer) {
  const rawText = fileBuffer.toString('utf-8');
  const rows: Record<string, string>[] = parse(rawText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  if (rows.length === 0) {
    throw new Error('CSV file has no data rows');
  }

  const headers = Object.keys(rows[0]);
  const { detectedFormat, suggestedMapping } = detectFormat(headers);

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
    previewRows: rows.slice(0, 20),
    rowCount: rows.length,
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
