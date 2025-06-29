import type { Database } from './connection';
import { businesses } from './schema';
import { eq } from 'drizzle-orm';

/**
 * Find business by WhatsApp number ID
 */
export const findBusinessByWamNumberId = async (
  db: Database,
  wamNumberId: string
): Promise<typeof businesses.$inferSelect | null> => {
  const result = await db
    .select()
    .from(businesses)
    .where(eq(businesses.wamNumberId, wamNumberId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
};

/**
 * Get business ID by WhatsApp number ID
 */
export const getBusinessIdByWamNumberId = async (
  db: Database,
  wamNumberId: string
): Promise<string | null> => {
  const business = await findBusinessByWamNumberId(db, wamNumberId);
  return business?.id || null;
};

/**
 * Get business settings by WhatsApp number ID
 */
export const getBusinessSettingsByWamNumberId = async (
  db: Database,
  wamNumberId: string
): Promise<Pick<typeof businesses.$inferSelect, 'id' | 'settings'> | null> => {
  const result = await db
    .select({
        id: businesses.id,
        settings: businesses.settings
    })
    .from(businesses)
    .where(eq(businesses.wamNumberId, wamNumberId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
};
