import type { Database } from './connection';
import { messages } from './schema';
import { eq, and } from 'drizzle-orm';

export const saveMessage = async (
  db: Database,
  wamId: string,
  userId: string,
  businessId: string,
  role: 'user' | 'model',
  parts: any
): Promise<typeof messages.$inferSelect> => {
  const [savedMessage] = await db
    .insert(messages)
    .values({
      wamId,
      userId,
      businessId,
      role,
      parts
    })
    .returning();

  return savedMessage;
};

export const getMessageHistory = async (
  db: Database,
  userId: string,
  businessId: string,
  limit: number = 50
): Promise<{ role: string; parts: any }[]> => {
  const messageHistory = await db
    .select({
      role: messages.role,
      parts: messages.parts
    })
    .from(messages)
    .where(
      and(
        eq(messages.userId, userId),
        eq(messages.businessId, businessId)
      )
    )
    .orderBy(messages.createdAt)
    .limit(limit);

  return messageHistory;
};