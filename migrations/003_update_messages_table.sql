-- Update messages table to modify role constraint and add parts column
-- SQLite doesn't support ALTER COLUMN directly, so we need to recreate the table

-- Step 1: Create a new table with the desired structure
CREATE TABLE messages_new (
    wam_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    business_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'model')),
    parts JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- Step 2: Copy existing data from old table to new table
-- Note: You may need to adjust this based on your current data structure
INSERT INTO messages_new (wam_id, user_id, business_id, role, parts, created_at)
SELECT 
    wam_id, 
    user_id, 
    business_id, 
    CASE 
        WHEN role = 'agent' THEN 'model'
        ELSE role 
    END as role,
    CASE 
        WHEN content IS NOT NULL THEN content
        ELSE '[]'
    END as parts,
    created_at
FROM messages
WHERE role IN ('user', 'model', 'agent');

-- Step 3: Drop the old table
DROP TABLE messages;

-- Step 4: Rename the new table
ALTER TABLE messages_new RENAME TO messages;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_messages_user_business ON messages(user_id, business_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_business_time ON messages(user_id, business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_wam_id ON messages(wam_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
