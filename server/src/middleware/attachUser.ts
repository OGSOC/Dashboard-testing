import type { NextFunction, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { getRateFromUsd, type SupportedCurrency } from '../services/fx.service.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      currentUser?: { id: string; displayCurrency: SupportedCurrency; fxRateFromUsd: number };
    }
  }
}

export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  if (!req.session.userId) {
    next();
    return;
  }
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);
    if (user) {
      const displayCurrency = user.displayCurrency as SupportedCurrency;
      req.currentUser = { id: user.id, displayCurrency, fxRateFromUsd: await getRateFromUsd(displayCurrency) };
    }
    next();
  } catch (err) {
    next(err);
  }
}
