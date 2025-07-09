import type { Database } from './connection';
import { calendarServices } from './schema';
import { eq, and } from 'drizzle-orm';

export const getCalendarServiceById = async (
  db: Database,
  id: string
): Promise<typeof calendarServices.$inferSelect | null> => {
  const result = await db
    .select()
    .from(calendarServices)
    .where(eq(calendarServices.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : null;
};

export const getCalendarServiceByGoogleCalendarId = async (
  db: Database,
  googleCalendarId: string
): Promise<typeof calendarServices.$inferSelect | null> => {
  const result = await db
    .select()
    .from(calendarServices)
    .where(eq(calendarServices.googleCalendarId, googleCalendarId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
};

export const getCalendarServiceByBusinessIdAndName = async (
  db: Database,
  businessId: string,
  name: string
): Promise<typeof calendarServices.$inferSelect | null> => {
  const result = await db
    .select()
    .from(calendarServices)
    .where(and(
      eq(calendarServices.businessId, businessId),
      eq(calendarServices.name, name)
    ))
    .limit(1);

  return result.length > 0 ? result[0] : null;
};
