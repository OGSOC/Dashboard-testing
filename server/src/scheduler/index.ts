import cron from 'node-cron';
import { runNewsPoll } from './jobs/newsPoll.js';
import { runInsiderPoll } from './jobs/insiderPoll.js';
import { runPoliticalPoll } from './jobs/politicalPoll.js';
import { runWhalePoll } from './jobs/whalePoll.js';
import { runDividendReminder } from './jobs/dividendReminder.js';
import { runPriceRefresh } from './jobs/priceRefresh.js';

function safeRun(name: string, fn: () => Promise<void>) {
  return async () => {
    try {
      await fn();
    } catch (err) {
      console.error(`Scheduled job "${name}" failed:`, err);
    }
  };
}

export function startScheduler(): void {
  cron.schedule('0 7 * * *', safeRun('newsPoll', runNewsPoll));
  cron.schedule('15 7 * * *', safeRun('insiderPoll', runInsiderPoll));
  cron.schedule('30 7 * * *', safeRun('politicalPoll', runPoliticalPoll));
  cron.schedule('0 2 * * 0', safeRun('whalePoll', runWhalePoll));
  cron.schedule('0 8 * * *', safeRun('dividendReminder', runDividendReminder));
  cron.schedule('*/15 * * * *', safeRun('priceRefresh', runPriceRefresh));

  console.log('Scheduler started: news/insider/political daily, whale weekly, dividend reminders daily, prices every 15 min.');
}
