import { env } from './config/env.js';
import { createApp } from './app.js';
import { startScheduler } from './scheduler/index.js';
import { initProviderStatus } from './providers/index.js';

async function main() {
  await initProviderStatus();

  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`Server listening on http://localhost:${env.PORT}`);
  });

  startScheduler();
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
