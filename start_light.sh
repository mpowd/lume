#!/bin/bash
echo "🚀 Starting application (Light)..."

docker compose -f docker-compose.light.yml up -d

echo "Waiting for API..."
until curl -s http://localhost:8000/health > /dev/null; do
    sleep 1
done

echo "Backend ready!"

docker compose -f docker-compose.light.yml logs -f api &

echo "Starting frontend..."
cd frontend && npm run dev