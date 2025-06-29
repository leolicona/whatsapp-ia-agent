import type { Database } from './connection';
import {
  findUserByPhone,
  createUser,
} from './user.service';
import { getBusinessSettingsByWamNumberId } from './business.service';
import { getMessageHistory } from './message.service';
import { generateUserId } from './id.generator';
import { users } from './schema';

export interface RegistrationResult {
  user: typeof users.$inferSelect;
  business: {
    id: string;
    settings: any;
  };
  messageHistory: any[];
  isNewUser: boolean;
}

// Main registration function
export const getContext = async (
  db: Database,
  phoneNumber: string,
  wamNumberId: string,
  userName?: string
): Promise<RegistrationResult> => {
  console.log(`Starting user registration process for phone: ${phoneNumber}, wamNumberId: ${wamNumberId}`);

  // Get business ID by WhatsApp number ID
  console.log(`Fetching business settings for wamNumberId: ${wamNumberId}`);
  const business = await getBusinessSettingsByWamNumberId(db, wamNumberId);
  console.log(`Business settings fetched: ${JSON.stringify(business)}`);
  if (!business) {
    console.error(`Business not found for wamNumberId: ${wamNumberId}`);
    throw new Error(`Business not found for wamNumberId: ${wamNumberId}`);
  }
  console.log(`Found business with id: ${business.id}`);
  
  // Check if user exists
  console.log(`Looking up user with phone number: ${phoneNumber}`);
  let user = await findUserByPhone(db, phoneNumber);
  let isNewUser = false;

  // If user doesn't exist, create new user
  if (!user) {
    console.log(`User not found, creating new user with phone: ${phoneNumber}`);
    const userId = generateUserId();
    user = await createUser(db, {
      id: userId,
      name: userName,
      phoneNumber,
      settings: {}
    });
    isNewUser = true;
    console.log(`Created new user with id: ${userId}`);
  } else {
    console.log(`Found existing user with id: ${user.id}`);
  }

  // Get message history
  console.log(`Fetching message history for user ${user.id} and business ${business.id}`);
  const messageHistory = await getMessageHistory(db, user.id, business.id);
  console.log(`Found ${messageHistory.length} messages in history`);

  return {
    user,
    business: {
      id: business.id,
      settings: business.settings
    },
    messageHistory,
    isNewUser
  };
};