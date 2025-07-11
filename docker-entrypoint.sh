#!/bin/bash

# Wait for database to be ready
echo "Waiting for database to be ready..."
until nc -z db 5432; do
  echo "Database is unavailable - sleeping"
  sleep 1
done
echo "Database is up - executing command"

# Run Prisma migrations
echo "Running Prisma migrations..."
npx prisma migrate deploy

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Seed the database (optional)
if [ "$RUN_SEED" = "true" ]; then
  echo "Seeding database..."
  npx prisma db seed
fi

# Start the application
echo "Starting the application..."
exec "$@"
