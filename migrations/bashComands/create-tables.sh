#!/bin/bash

# Cloudflare D1 Database Creation Script

echo "🚀 Creating Cloudflare D1 Database: wam-business-db"

# Create remote database
echo "Creating remote database..."
wrangler d1 create wam-business-db

# Apply schema to remote database
echo "Applying schema to remote database..."
wrangler d1 execute wam-business-db --file=./migrations/001_initial_schema.sql

# Apply schema to local database for development
echo "Applying schema to local database..."
wrangler d1 execute wam-business-db --local --file=./migrations/001_initial_schema.sql

echo "✅ Database creation and schema application completed!"
echo "📝 Don't forget to update your wrangler.jsonc with the new database ID if needed."