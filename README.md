# Stock Dashboard

A personal stock-tracking dashboard: CSV-based portfolio import, dividend tracking, news, insider trading,
congressional ("political") trading, and institutional ("whale") 13F activity — all surfaced through an
in-app notification center.

Every external data provider is **free** (no paid subscription, no credit card). Any feature whose provider
key is left blank automatically falls back to realistic sample data, so the app is fully explorable out of
the box.

## Stack

- **Client**: React + TypeScript (Vite), TanStack Query, React Router, Recharts
- **Server**: Express + TypeScript, Drizzle ORM
- **Database**: PostgreSQL
- Monorepo via npm workspaces: `/shared` (types + zod schemas), `/server`, `/client`

## Setup

1. **Start Postgres.** Either:
   - `docker compose up -d` (uses `docker-compose.yml`), or
   - point `DATABASE_URL` in `.env` at any Postgres 14+ instance you already have running.

2. **Install dependencies** (from the repo root):
   ```
   npm install
   ```

3. **Configure environment**:
   ```
   cp .env.example .env
   ```
   Fill in `SESSION_SECRET` (any long random string), `ADMIN_EMAIL`, and `ADMIN_PASSWORD` — this becomes
   your login. The app is single-user by design, since it's meant for your own portfolio.

4. **Run migrations and seed sample data**:
   ```
   npm run db:migrate
   npm run db:seed
   ```
   This creates your admin account, imports a sample ~2-year transaction history through the real CSV
   import pipeline, and loads sample news/insider/political/whale/dividend data so every page has
   something to show immediately.

5. **Start the app**:
   ```
   npm run dev
   ```
   Client: http://localhost:5173 — Server: http://localhost:4000

Log in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set in `.env`.

## Adding your own portfolio

Once logged in, go to **Portfolio → + Import CSV** and upload a transaction export from your broker.
Fidelity, Schwab, Robinhood, and Snowball Analytics export formats are auto-detected; anything else falls
back to a manual column-mapping step. Nothing is committed until you confirm the mapping. When creating a
new account you also pick its currency (GBP by default) — that's the currency your transaction ledger for
that account is recorded in.

- **Starting over**: **Portfolio → Reset portfolio** deletes all transactions, holdings, and brokerage
  accounts for a clean slate before a fresh CSV upload. This can't be undone.
- **Amendments**: every transaction row has an **Edit** action (inline) so you can correct a ticker,
  date, quantity, price, or amount after import without re-uploading — holdings are recomputed automatically.

## Currency

Pick your reporting currency (GBP/USD/EUR) from the dropdown in the top bar. Portfolio value, holdings,
and dividend figures are converted to that currency using live ECB rates (via [Frankfurter](https://frankfurter.dev),
free, no key). The **Transactions** table is the exception — it always shows amounts in the currency you
recorded them in (per brokerage account), so your original ledger stays exact.

## Dividend analytics

Beyond the calendar and income summary, the **Dividends** page includes:
- **Calendar / list toggle** — a month-grid view of ex-dividend and pay dates, or a flat list.
- **Monthly and yearly income charts** — built from dividends you've actually received (from your
  transaction ledger), not projections.
- **Dividend growth (CAGR)** per holding and portfolio-wide, computed from each ticker's multi-year
  ex-dividend history.
- **Dividend increase notifications** — the daily poll compares each new dividend announcement to the
  previous one and notifies you when a holding raises its payout.
- **Growth & DRIP calculator** — projects your portfolio value and dividend income forward given a
  monthly contribution, price growth rate, dividend growth rate, and whether dividends are reinvested.

## Whale & insider context

The **Whale Activity** and **Insider Trading** pages group trades by ticker, with each ticker's recent
news headlines and Finnhub analyst consensus (buy/hold/sell breakdown) shown above its trades — so a big
sale has some context next to it, not just a bare number.

## Connecting live data (optional)

By default every external-data feature runs on sample data. To see live data, add API keys to `.env` —
no restart required beyond the server picking up the new environment variables (or set `SETTINGS` in the
app to check status live).

| Feature | Provider | Env var | Cost | Sign up |
|---|---|---|---|---|
| News, insider trades, quotes | Finnhub | `FINNHUB_API_KEY` | Free forever, no card | https://finnhub.io/register |
| Dividend calendar & history | Alpha Vantage | `ALPHA_VANTAGE_API_KEY` | Free forever, no card (25 req/day limit) | https://www.alphavantage.co/support/#api-key |
| Whale / 13F institutional activity | SEC EDGAR | `SEC_EDGAR_CONTACT_EMAIL` | Free, no signup — just a contact string SEC's fair-access policy asks for | n/a |
| Political / congressional trading | House Stock Watcher + Senate Stock Watcher | *(none)* | Free, public datasets, no key at all | n/a |
| Analyst consensus (whale/insider context) | Finnhub | `FINNHUB_API_KEY` (same key as above) | Free forever, no card | https://finnhub.io/register |
| Currency conversion | Frankfurter | *(none)* | Free, no key, no rate limit | n/a |

Check **Settings** in the app at any time to see each provider's live/sample status and last-checked time.
A provider that's configured but temporarily unreachable (e.g. House Stock Watcher's hosting has been
intermittently down) shows "Source unavailable — using sample data" rather than a bare error, since the
app degrades gracefully either way.

### Notes on data quality

- **Alpha Vantage's free tier is limited to ~25 requests/day**, so dividend data refreshes a handful of
  tickers per day rather than all at once — it'll catch up over the first few days.
- **House Stock Watcher and Senate Stock Watcher** are free, community-maintained public datasets (not a
  corporate API with an SLA). If one is temporarily unreachable, the app just uses the other / falls back
  to sample data — nothing breaks.
- **Whale/13F data is inherently quarterly with a ~45-day filing lag** (a property of how 13F filings work,
  not a limitation of this app) and is sourced from a curated list of major institutional filers, not every
  13F filer in existence.

## Notifications

A background scheduler polls news/insider/political trading daily, whale/13F activity weekly, checks for
upcoming dividend dates daily, and refreshes prices every 15 minutes — for every ticker you hold or
watchlist. New activity shows up in the notification bell (top right) and the **Notifications** page.

## Scripts

- `npm run dev` — run client + server together
- `npm run build` — build all workspaces
- `npm run typecheck` — typecheck server + client
- `npm run db:generate` — generate a new Drizzle migration after changing `server/src/db/schema.ts`
- `npm run db:migrate` — apply migrations
- `npm run db:seed` — seed your admin account + sample data (safe to re-run; skips steps already done)
