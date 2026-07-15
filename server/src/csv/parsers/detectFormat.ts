import type { CanonicalFieldKey } from '@stockdash/shared';
import { canonicalFieldKeys } from '@stockdash/shared';

const FIELD_ALIASES: Record<CanonicalFieldKey, string[]> = {
  ticker: ['symbol', 'ticker', 'instrument'],
  tradeDate: ['run date', 'date', 'activity date', 'trade date', 'transaction date'],
  transactionType: ['action', 'trans code', 'transaction type', 'type', 'event'],
  quantity: ['quantity', 'shares', 'qty'],
  price: ['price ($)', 'price', 'price per share'],
  fees: ['fees ($)', 'fees & comm', 'fees', 'commission', 'fee'],
  amount: ['amount ($)', 'amount', 'net amount', 'total'],
};

const KNOWN_FORMATS: { name: string; requiredHeaders: string[]; isSnapshot?: boolean }[] = [
  { name: 'fidelity', requiredHeaders: ['run date', 'action', 'symbol', 'quantity', 'price ($)', 'fees ($)', 'amount ($)'] },
  { name: 'schwab', requiredHeaders: ['date', 'action', 'symbol', 'quantity', 'price', 'fees & comm', 'amount'] },
  { name: 'robinhood', requiredHeaders: ['activity date', 'trans code', 'instrument', 'quantity', 'price', 'amount'] },
  { name: 'snowball', requiredHeaders: ['event', 'date', 'symbol'] },
  // Snowball Analytics' "Holdings" export — a portfolio snapshot (current shares/cost basis
  // per position), not a transaction ledger. Detected separately since it needs a dedicated
  // import path rather than the buy/sell/dividend column mapper.
  {
    name: 'snowball_holdings',
    requiredHeaders: ['holding', 'shares', 'currency', 'cost basis', 'current value', 'share price', 'cost per share'],
    isSnapshot: true,
  },
];

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase();
}

export interface FormatDetectionResult {
  detectedFormat: string;
  suggestedMapping: Record<CanonicalFieldKey, string | null>;
  isSnapshotFormat: boolean;
}

export function detectFormat(headers: string[]): FormatDetectionResult {
  const normalizedHeaders = headers.map(normalizeHeader);

  let bestMatch: { name: string; score: number; isSnapshot?: boolean } = { name: 'generic', score: 0 };
  for (const format of KNOWN_FORMATS) {
    const matchCount = format.requiredHeaders.filter((h) => normalizedHeaders.includes(h)).length;
    const score = matchCount / format.requiredHeaders.length;
    if (score > bestMatch.score) {
      bestMatch = { name: format.name, score, isSnapshot: format.isSnapshot };
    }
  }

  const detectedFormat = bestMatch.score >= 0.7 ? bestMatch.name : 'generic';
  const isSnapshotFormat = bestMatch.score >= 0.7 && Boolean(bestMatch.isSnapshot);

  const suggestedMapping = {} as Record<CanonicalFieldKey, string | null>;
  for (const field of canonicalFieldKeys) {
    const aliases = FIELD_ALIASES[field];
    const matchIndex = normalizedHeaders.findIndex((h) => aliases.includes(h));
    suggestedMapping[field] = matchIndex >= 0 ? headers[matchIndex] : null;
  }

  return { detectedFormat, suggestedMapping, isSnapshotFormat };
}
