-- Drop all existing tables in reverse dependency order
-- This will clean up the database structure

-- Drop dependent tables first
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS chats;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS business_settings;
DROP TABLE IF EXISTS businesses;
DROP TABLE IF EXISTS users;

-- Drop any remaining indexes (they should be dropped with tables, but just in case)
DROP INDEX IF EXISTS idx_businesses_owner_id;
DROP INDEX IF EXISTS idx_chats_business_id;
DROP INDEX IF EXISTS idx_messages_chat_id;
DROP INDEX IF EXISTS idx_messages_created_at;
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_phone_number;
DROP INDEX IF EXISTS idx_chats_active_session;
