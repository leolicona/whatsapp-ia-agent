-- users Table: Central repository for all users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, -- From your external authentication service
    name TEXT,
    email TEXT UNIQUE,
    phone_number TEXT NOT NULL UNIQUE,
    settings JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- businesses Table: Stores information about each business
CREATE TABLE IF NOT EXISTS businesses (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    wam_number_id TEXT NOT NULL UNIQUE, -- Each business has a unique phone number
    name TEXT NOT NULL,
    settings JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- messages Table: Stores individual messages within a chat
CREATE TABLE IF NOT EXISTS messages (
    wam_id TEXT PRIMARY KEY, -- The unique ID from WhatsApp (wamid).
    user_id TEXT NOT NULL,
    business_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'model')), -- 'user' for incoming, others for outgoing
    parts JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- Core lookup indexes
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_businesses_wam_number ON businesses(wam_number_id);

-- Message retrieval optimization
CREATE INDEX IF NOT EXISTS idx_messages_user_business ON messages(user_id, business_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_business_time ON messages(user_id, business_id, created_at DESC);

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_messages_wam_id ON messages(wam_id);
CREATE INDEX IF NOT EXISTS idx_businesses_owner ON businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- calendar_services Table: Stores service-specific calendar configurations
CREATE TABLE IF NOT EXISTS calendar_services (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    google_calendar_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    settings JSON NOT NULL, -- Pre-configured Google Calendar Event template
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_services_business_id ON calendar_services(business_id);
CREATE INDEX IF NOT EXISTS idx_calendar_services_google_calendar_id ON calendar_services(google_calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_services_name ON calendar_services(business_id, name);




