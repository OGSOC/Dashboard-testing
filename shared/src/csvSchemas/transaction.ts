import { z } from 'zod';

export const canonicalFieldKeys = [
  'ticker',
  'tradeDate',
  'transactionType',
  'quantity',
  'price',
  'fees',
  'amount',
] as const;

export type CanonicalFieldKey = (typeof canonicalFieldKeys)[number];

export const transactionTypeEnum = z.enum([
  'buy',
  'sell',
  'dividend',
  'split',
  'transfer_in',
  'transfer_out',
  'fee',
  'interest',
]);

export const canonicalTransactionRowSchema = z.object({
  ticker: z.string().trim().min(1).max(20).transform((v) => v.toUpperCase()),
  tradeDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date'),
  transactionType: transactionTypeEnum,
  quantity: z.number(),
  price: z.number().nullable(),
  fees: z.number().default(0),
  amount: z.number(),
});

export type CanonicalTransactionRow = z.infer<typeof canonicalTransactionRowSchema>;

/** Maps common broker action strings to our canonical transaction type. */
export const actionAliasDictionary: Record<string, CanonicalTransactionRow['transactionType']> = {
  buy: 'buy',
  'you bought': 'buy',
  bought: 'buy',
  bto: 'buy',
  purchase: 'buy',
  sell: 'sell',
  'you sold': 'sell',
  sold: 'sell',
  stc: 'sell',
  sale: 'sell',
  dividend: 'dividend',
  'dividend received': 'dividend',
  'qualified dividend': 'dividend',
  'reinvest dividend': 'dividend',
  div: 'dividend',
  split: 'split',
  'stock split': 'split',
  'transfer in': 'transfer_in',
  'transfer of shares in': 'transfer_in',
  'transfer out': 'transfer_out',
  'transfer of shares out': 'transfer_out',
  fee: 'fee',
  'margin interest': 'interest',
  interest: 'interest',
  'bank interest': 'interest',
};

export function normalizeActionString(raw: string): CanonicalTransactionRow['transactionType'] | null {
  const key = raw.trim().toLowerCase();
  if (key in actionAliasDictionary) return actionAliasDictionary[key];
  if (key.includes('buy') || key.includes('bought')) return 'buy';
  if (key.includes('sell') || key.includes('sold')) return 'sell';
  if (key.includes('div')) return 'dividend';
  if (key.includes('split')) return 'split';
  if (key.includes('interest')) return 'interest';
  if (key.includes('transfer') && key.includes('in')) return 'transfer_in';
  if (key.includes('transfer') && key.includes('out')) return 'transfer_out';
  if (key.includes('fee')) return 'fee';
  return null;
}
