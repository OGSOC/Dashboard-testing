import type { CanonicalFieldKey } from '@stockdash/shared';
import { canonicalFieldKeys } from '@stockdash/shared';

const FIELD_ALIASES: Record<CanonicalFieldKey, string[]> = {
  ticker: ['symbol', 'ticker', 'instrument'],
  tradeDate: ['run date', 'date', 'activity date', 'trade date', 'transaction date'],
  transactionType: ['action', 'trans code', 'transaction type', 'type', 'event'],
  quantity: ['quantity', 'shares', 'qty'],
  price: ['price ($)', 'price', 'price per share'],
  fees: ['fees ($)', 'fees & comm', 'fees', 'commission', 'fee', 'feetax'],
  amount: ['amount ($)', 'amount', 'net amount', 'total'],
};

export type SpecialImportMode = 'snowball_holdings_snapshot' | 'snowball_transactions' | null;

const KNOWN_FORMATS: { name: string; requiredHeaders: string[]; specialImportMode?: SpecialImportMode }[] = [
  { name: 'fidelity', requiredHeaders: ['run date', 'action', 'symbol', 'quantity', 'price ($)', 'fees ($)', 'amount ($)'] },
  { name: 'schwab', requiredHeaders: ['date', 'action', 'symbol', 'quantity', 'price', 'fees & comm', 'amount'] },
  { name: 'robinhood', requiredHeaders: ['activity date', 'trans code', 'instrument', 'quantity', 'price', 'amount'] },
  // Snowball Analytics' "Transactions" export. No "amount" column — it only gives price and
  // quantity (and, for DIVIDEND rows, quantity actually holds the cash amount received, not a
  // share count) — so amount has to be computed rather than mapped, hence a dedicated import
  // path instead of the generic column mapper.
  {
    name: 'snowball_transactions',
    requiredHeaders: ['event', 'date', 'symbol', 'price', 'quantity', 'currency', 'feetax'],
    specialImportMode: 'snowball_transactions',
  },
  // Snowball Analytics' "Holdings" export — a portfolio snapshot (current shares/cost basis
  // per position), not a transaction ledger. Also needs a dedicated import path.
  {
    name: 'snowball_holdings',
    requiredHeaders: ['holding', 'shares', 'currency', 'cost basis', 'current value', 'share price', 'cost per share'],
    specialImportMode: 'snowball_holdings_snapshot',
  },
];

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase();
}

export interface FormatDetectionResult {
  detectedFormat: string;
  suggestedMapping: Record<CanonicalFieldKey, string | null>;
  specialImportMode: SpecialImportMode;
}

export function detectFormat(headers: string[]): FormatDetectionResult {
  const normalizedHeaders = headers.map(normalizeHeader);

  let bestMatch: { name: string; score: number; specialImportMode?: SpecialImportMode } = { name: 'generic', score: 0 };
  for (const format of KNOWN_FORMATS) {
    const matchCount = format.requiredHeaders.filter((h) => normalizedHeaders.includes(h)).length;
    const score = matchCount / format.requiredHeaders.length;
    if (score > bestMatch.score) {
      bestMatch = { name: format.name, score, specialImportMode: format.specialImportMode };
    }
  }

  const detectedFormat = bestMatch.score >= 0.7 ? bestMatch.name : 'generic';
  const specialImportMode = bestMatch.score >= 0.7 ? bestMatch.specialImportMode ?? null : null;

  const suggestedMapping = {} as Record<CanonicalFieldKey, string | null>;
  for (const field of canonicalFieldKeys) {
    const aliases = FIELD_ALIASES[field];
    const matchIndex = normalizedHeaders.findIndex((h) => aliases.includes(h));
    suggestedMapping[field] = matchIndex >= 0 ? headers[matchIndex] : null;
  }

  return { detectedFormat, suggestedMapping, specialImportMode };
}
