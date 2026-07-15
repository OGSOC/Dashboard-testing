import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './client.js';

async function main() {
  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  await migrate(db, { migrationsFolder: './src/db/migrations' });
  console.log('Migrations applied.');
  await pool.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
