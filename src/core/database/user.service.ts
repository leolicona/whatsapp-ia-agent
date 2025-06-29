import type { Database } from './connection';
import { users, businesses } from './schema';
import { eq, and } from 'drizzle-orm';

export interface UserBusinessRelation {
  user: typeof users.$inferSelect;
  business: typeof businesses.$inferSelect;
}

export const findUserByPhone = async (
  db: Database,
  phoneNumber: string
): Promise<typeof users.$inferSelect | null> => {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.phoneNumber, phoneNumber))
    .limit(1);

  return result.length > 0 ? result[0] : null;
};

export const getUserBusinessRelation = async (
  db: Database,
  phoneNumber: string,
  businessId: string
): Promise<UserBusinessRelation | null> => {
  // Query the database joining users and businesses tables
  const result = await db
    .select({
      user: users,      // Select all user fields
      business: businesses  // Select all business fields
    })
    .from(users)
    .innerJoin(
      businesses,
      eq(businesses.id, businessId)  // Join condition: business.id = businessId
    )
    .where(eq(users.phoneNumber, phoneNumber))  // Filter by user phone number
    .limit(1);  // Limit to single result

  // Return first result if found, null otherwise
  return result.length > 0 ? result[0] : null;
};

export const createUser = async (
  db: Database,
  userData: {
    id: string;
    name?: string;
    email?: string;
    phoneNumber: string;
    settings: any;
  }
): Promise<typeof users.$inferSelect> => {
  const [newUser] = await db
    .insert(users)
    .values(userData)
    .returning();

  return newUser;
};