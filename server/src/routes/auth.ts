import { Router } from 'express';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { SUPPORTED_CURRENCIES } from '../services/fx.service.js';

export const authRouter = Router();

authRouter.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  req.session.userId = user.id;
  res.json({ id: user.id, email: user.email, displayName: user.displayName, displayCurrency: user.displayCurrency });
}));

authRouter.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.status(204).end();
  });
});

authRouter.get('/me', asyncHandler(async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const [user] = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  res.json({ id: user.id, email: user.email, displayName: user.displayName, displayCurrency: user.displayCurrency });
}));

authRouter.patch('/me', asyncHandler(async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const { displayCurrency } = req.body ?? {};
  if (typeof displayCurrency !== 'string' || !SUPPORTED_CURRENCIES.includes(displayCurrency as never)) {
    res.status(400).json({ error: `displayCurrency must be one of ${SUPPORTED_CURRENCIES.join(', ')}` });
    return;
  }
  const [user] = await db
    .update(users)
    .set({ displayCurrency })
    .where(eq(users.id, req.session.userId))
    .returning();
  res.json({ id: user.id, email: user.email, displayName: user.displayName, displayCurrency: user.displayCurrency });
}));
