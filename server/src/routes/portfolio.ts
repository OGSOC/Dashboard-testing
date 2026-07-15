import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { resetPortfolioForUser } from '../services/portfolio.service.js';

export const portfolioRouter = Router();

portfolioRouter.post('/reset', asyncHandler(async (req, res) => {
  const userId = req.session.userId!;
  const { confirm } = req.body ?? {};
  if (confirm !== 'RESET') {
    res.status(400).json({ error: 'Send { "confirm": "RESET" } to confirm this destroys all portfolio data.' });
    return;
  }
  await resetPortfolioForUser(userId);
  res.status(204).end();
}));
