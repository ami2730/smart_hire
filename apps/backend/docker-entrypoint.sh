#!/bin/sh
set -e

echo "==> SmartHire Backend container starting..."

# Apply Prisma migrations if DATABASE_URL is defined
if [ -n "$DATABASE_URL" ]; then
  echo "==> Applying database migrations with prisma migrate deploy..."
  npx prisma migrate deploy || {
    echo "==> Migration failed, retrying in 5 seconds..."
    sleep 5
    npx prisma migrate deploy
  }
fi

# Execute CMD
exec "$@"
