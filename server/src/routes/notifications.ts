import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getNotifications, getUnreadCount, markAllRead, markRead } from '../services/notification.service.js';

export const notificationsRouter = Router();

notificationsRouter.get('/', asyncHandler(async (req, res) => {
  res.json(await getNotifications(req.session.userId!));
}));

notificationsRouter.get('/unread-count', asyncHandler(async (req, res) => {
  res.json({ count: await getUnreadCount(req.session.userId!) });
}));

notificationsRouter.post('/:id/read', asyncHandler(async (req, res) => {
  await markRead(req.session.userId!, req.params.id);
  res.status(204).end();
}));

notificationsRouter.post('/read-all', asyncHandler(async (req, res) => {
  await markAllRead(req.session.userId!);
  res.status(204).end();
}));
