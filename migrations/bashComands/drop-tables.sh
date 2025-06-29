#!/bin/bash

# Cloudflare D1 Database Creation Script

echo "🚀 Deleting tables on Cloudflare D1 Database: wam-business-db"


# Apply schema to remote database
echo "Applying schema to remote database..."
if ! wrangler d1 execute wam-business-db --file=./migrations/002_drop_tables.sql; then
    echo "❌ Error: Failed to apply schema to remote database"
    exit 1
fi

# Apply schema to local database for development
echo "Applying schema to local database..."
if ! wrangler d1 execute wam-business-db --local --file=./migrations/002_drop_tables.sql; then
    echo "❌ Error: Failed to apply schema to local database"
    exit 1
fi

echo "✅ Database tables dropped successfully!"
echo "📝 Don't forget to update your wrangler.jsonc with the new database ID if needed."