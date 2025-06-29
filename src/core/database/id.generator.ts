/**
 * ID generation utilities using Web Crypto API
 * Provides secure, unique identifiers for database entities
 */

export const generateId = (prefix?: string): string => {
  const uuid = crypto.randomUUID();
  return prefix ? `${prefix}_${uuid}` : uuid;
};

export const generateUserId = (): string => generateId('user');
export const generateMessageId = (): string => generateId('msg');
export const generateBusinessId = (): string => generateId('business');
export const generateBusinessSettingsId = (): string => generateId('settings');