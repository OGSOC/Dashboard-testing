import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// Load the repo-root .env regardless of the process's current working
// directory (npm workspace scripts run with cwd set to /server).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  SESSION_SECRET: z.string().min(1, 'SESSION_SECRET is required'),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(1),
  PORT: z.coerce.number().default(4000),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  FINNHUB_API_KEY: z.string().optional().default(''),
  ALPHA_VANTAGE_API_KEY: z.string().optional().default(''),
  SEC_EDGAR_CONTACT_EMAIL: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration. Copy .env.example to .env and fill in the required values.');
}

export const env = parsed.data;

export const providerConfig = {
  finnhub: Boolean(env.FINNHUB_API_KEY),
  alphaVantage: Boolean(env.ALPHA_VANTAGE_API_KEY),
  secEdgar: Boolean(env.SEC_EDGAR_CONTACT_EMAIL),
  // House/Senate Stock Watcher are always "configured" — no key needed.
  houseStockWatcher: true,
  senateStockWatcher: true,
};
