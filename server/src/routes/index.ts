import { Router } from 'express';
import { authRouter } from './auth.js';
import { holdingsRouter } from './holdings.js';
import { brokerageAccountsRouter } from './brokerageAccounts.js';
import { transactionsRouter } from './transactions.js';
import { csvImportsRouter } from './csvImports.js';
import { watchlistRouter } from './watchlist.js';
import { dividendsRouter } from './dividends.js';
import { newsRouter } from './news.js';
import { whaleTradesRouter } from './whaleTrades.js';
import { insiderTradesRouter } from './insiderTrades.js';
import { politicalTradesRouter } from './politicalTrades.js';
import { notificationsRouter } from './notifications.js';
import { providersRouter } from './providers.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => res.json({ status: 'ok' }));
apiRouter.use('/auth', authRouter);

apiRouter.use(requireAuth);
apiRouter.use('/holdings', holdingsRouter);
apiRouter.use('/brokerage-accounts', brokerageAccountsRouter);
apiRouter.use('/transactions', transactionsRouter);
apiRouter.use('/csv-imports', csvImportsRouter);
apiRouter.use('/watchlist', watchlistRouter);
apiRouter.use('/dividends', dividendsRouter);
apiRouter.use('/news', newsRouter);
apiRouter.use('/whale-trades', whaleTradesRouter);
apiRouter.use('/insider-trades', insiderTradesRouter);
apiRouter.use('/political-trades', politicalTradesRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/providers', providersRouter);
