import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { notifications } from '../db/schema.js';
import type { NotificationType } from '@stockdash/shared';

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  ticker?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
}): Promise<boolean> {
  const result = await db
    .insert(notifications)
    .values({
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      ticker: params.ticker ?? null,
      relatedEntityType: params.relatedEntityType ?? null,
      relatedEntityId: params.relatedEntityId ?? null,
    })
    .onConflictDoNothing({
      target: [notifications.userId, notifications.type, notifications.relatedEntityType, notifications.relatedEntityId],
    })
    .returning();
  return result.length > 0;
}

export async function getNotifications(userId: string, limit = 100) {
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit);
}

export async function getUnreadCount(userId: string): Promise<number> {
  const rows = await db.select().from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return rows.length;
}

export async function markRead(userId: string, id: string) {
  await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllRead(userId: string) {
  await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}
