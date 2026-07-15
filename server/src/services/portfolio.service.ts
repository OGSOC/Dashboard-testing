import { and, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { holdings, transactions } from '../db/schema.js';

interface Lot {
  quantity: number;
  totalCost: number;
}

/**
 * Recomputes the `holdings` table for a user from their full transaction ledger
 * using an average-cost-basis method. Buys/transfers-in add shares and cost;
 * sells/transfers-out remove shares and a proportional share of cost.
 * Dividends/fees/interest do not affect share quantity.
 */
export async function recomputeHoldings(userId: string): Promise<void> {
  const rows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(transactions.tradeDate);

  const lots = new Map<string, Lot>();

  for (const row of rows) {
    const key = `${row.brokerageAccountId}:${row.ticker}`;
    const lot = lots.get(key) ?? { quantity: 0, totalCost: 0 };
    const quantity = Number(row.quantity);
    const amount = Number(row.amount);

    switch (row.transactionType) {
      case 'buy':
      case 'transfer_in':
        lot.quantity += quantity;
        lot.totalCost += Math.abs(amount);
        break;
      case 'sell':
      case 'transfer_out': {
        if (lot.quantity > 0) {
          const avgCost = lot.totalCost / lot.quantity;
          const sold = Math.min(quantity, lot.quantity);
          lot.totalCost -= avgCost * sold;
          lot.quantity -= sold;
        }
        break;
      }
      case 'split': {
        // quantity holds the post-split multiplier (e.g. 2 for a 2-for-1 split)
        if (quantity > 0) lot.quantity *= quantity;
        break;
      }
      default:
        break;
    }

    lots.set(key, lot);
  }

  await db.delete(holdings).where(eq(holdings.userId, userId));

  const rowsToInsert = Array.from(lots.entries())
    .filter(([, lot]) => lot.quantity > 0.000001)
    .map(([key, lot]) => {
      const [brokerageAccountId, ticker] = key.split(':');
      return {
        userId,
        brokerageAccountId,
        ticker,
        quantity: lot.quantity.toFixed(6),
        avgCostBasis: (lot.totalCost / lot.quantity).toFixed(6),
        totalCost: lot.totalCost.toFixed(2),
      };
    });

  if (rowsToInsert.length > 0) {
    await db.insert(holdings).values(rowsToInsert);
  }
}

export async function getHoldingsForUser(userId: string) {
  return db.select().from(holdings).where(eq(holdings.userId, userId));
}
