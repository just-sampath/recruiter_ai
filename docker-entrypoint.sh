#!/bin/sh
set -e

echo "🔄 Waiting for PostgreSQL to be ready..."
# Wait is handled by docker-compose depends_on healthcheck, but double-check
until bun run -e "import { connection } from './src/core/db/index.js'; await connection\`SELECT 1\`; process.exit(0);" 2>/dev/null; do
  echo "⏳ Database not ready, retrying in 2s..."
  sleep 2
done

echo "✅ Database connection established"
echo "🔄 Running database migrations..."
bun run db:migrate

echo "👤 Creating/verifying superadmin user..."
bun run scripts/bootstrap-superadmin.js

echo "🚀 Starting server..."
exec bun run start
