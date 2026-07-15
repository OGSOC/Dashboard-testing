import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db, pool } from '../src/db/client.js';
import { users, brokerageAccounts, watchlist, newsCache, insiderTrades, politicalTrades, whaleTrades, dividendSchedule } from '../src/db/schema.js';
import { env } from '../src/config/env.js';
import { parseAndStageCsv, commitImportBatch } from '../src/services/csvImport.service.js';
import { createNotification } from '../src/services/notification.service.js';
import { initProviderStatus } from '../src/providers/index.js';
import { seedNews, seedInsiderTrades, seedPoliticalTrades, seedWhaleTrades, seedDividends } from '../src/providers/seed/data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WATCHLIST_ONLY_TICKERS = ['GOOGL', 'TSLA', 'PG', 'XOM', 'VOO'];

async function main() {
  console.log('Seeding database...');
  await initProviderStatus();

  const email = env.ADMIN_EMAIL.toLowerCase();
  let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
    [user] = await db.insert(users).values({ email, passwordHash, displayName: 'Portfolio Owner' }).returning();
    console.log(`Created admin user ${email}`);
  } else {
    console.log(`Admin user ${email} already exists, skipping creation`);
  }

  let [account] = await db.select().from(brokerageAccounts).where(eq(brokerageAccounts.userId, user.id)).limit(1);
  if (!account) {
    [account] = await db
      .insert(brokerageAccounts)
      .values({ userId: user.id, broker: 'fidelity', accountName: 'Fidelity Individual' })
      .returning();
    console.log('Created default brokerage account');

    const csvPath = path.join(__dirname, 'sample-transactions-fidelity.csv');
    const fileBuffer = fs.readFileSync(csvPath);
    const staged = await parseAndStageCsv(user.id, 'sample-transactions-fidelity.csv', fileBuffer);
    const result = await commitImportBatch(user.id, staged.importBatchId, staged.suggestedMapping, account.id, null);
    if (!result.committed) {
      console.error('Seed CSV import failed:', result.errors);
    } else {
      console.log(`Imported ${result.rowsCommitted} sample transactions via the real CSV import pipeline`);
    }
  } else {
    console.log('Brokerage account already exists, skipping sample CSV import');
  }

  for (const ticker of WATCHLIST_ONLY_TICKERS) {
    await db.insert(watchlist).values({ userId: user.id, ticker, notes: null }).onConflictDoNothing();
  }
  console.log(`Ensured watchlist entries for ${WATCHLIST_ONLY_TICKERS.join(', ')}`);

  for (const item of seedNews) {
    await db
      .insert(newsCache)
      .values({ ...item, publishedAt: new Date(item.publishedAt) })
      .onConflictDoNothing({ target: [newsCache.provider, newsCache.externalId] });
  }
  for (const item of seedInsiderTrades) {
    await db
      .insert(insiderTrades)
      .values({ ...item, shares: String(item.shares), price: item.price !== null ? String(item.price) : null })
      .onConflictDoNothing({ target: [insiderTrades.provider, insiderTrades.externalId] });
  }
  for (const item of seedPoliticalTrades) {
    await db.insert(politicalTrades).values(item).onConflictDoNothing({ target: [politicalTrades.provider, politicalTrades.externalId] });
  }
  for (const item of seedWhaleTrades) {
    await db
      .insert(whaleTrades)
      .values({
        ...item,
        shares: String(item.shares),
        sharesChange: item.sharesChange !== null ? String(item.sharesChange) : null,
        valueUsd: item.valueUsd !== null ? String(item.valueUsd) : null,
      })
      .onConflictDoNothing({ target: [whaleTrades.provider, whaleTrades.externalId] });
  }
  for (const item of seedDividends) {
    await db
      .insert(dividendSchedule)
      .values({ ...item, amount: String(item.amount) })
      .onConflictDoUpdate({
        target: [dividendSchedule.ticker, dividendSchedule.exDividendDate],
        set: { amount: String(item.amount), payDate: item.payDate },
      });
  }
  console.log('Loaded seed news, insider, political, whale, and dividend data');

  const [firstInsider] = seedInsiderTrades;
  const [firstWhale] = seedWhaleTrades.filter((w) => w.action !== 'held');
  const [firstPolitical] = seedPoliticalTrades;
  const [firstNews] = seedNews;

  await createNotification({
    userId: user.id,
    type: 'insider_trade',
    title: `Insider ${firstInsider.transactionType}: ${firstInsider.ticker}`,
    body: `${firstInsider.insiderName} ${firstInsider.transactionType === 'sell' ? 'sold' : 'bought'} ${firstInsider.shares.toLocaleString()} shares of ${firstInsider.ticker}`,
    ticker: firstInsider.ticker,
    relatedEntityType: 'seed_notification',
    relatedEntityId: 'seed-notif-insider-1',
  });
  await createNotification({
    userId: user.id,
    type: 'whale_trade',
    title: `Whale ${firstWhale.action}: ${firstWhale.ticker}`,
    body: `${firstWhale.institutionName} ${firstWhale.action} its position in ${firstWhale.ticker}`,
    ticker: firstWhale.ticker,
    relatedEntityType: 'seed_notification',
    relatedEntityId: 'seed-notif-whale-1',
  });
  await createNotification({
    userId: user.id,
    type: 'political_trade',
    title: `Congress ${firstPolitical.transactionType}: ${firstPolitical.ticker}`,
    body: `${firstPolitical.politicianName} reported a ${firstPolitical.transactionType} of ${firstPolitical.ticker} (${firstPolitical.amountRange})`,
    ticker: firstPolitical.ticker,
    relatedEntityType: 'seed_notification',
    relatedEntityId: 'seed-notif-political-1',
  });
  await createNotification({
    userId: user.id,
    type: 'news',
    title: `News: ${firstNews.ticker}`,
    body: firstNews.headline,
    ticker: firstNews.ticker,
    relatedEntityType: 'seed_notification',
    relatedEntityId: 'seed-notif-news-1',
  });
  console.log('Created sample notifications');

  console.log('\nSeed complete. Log in with:');
  console.log(`  email:    ${email}`);
  console.log(`  password: (the ADMIN_PASSWORD you set in .env)`);

  await pool.end();
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
