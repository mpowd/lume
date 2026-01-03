#!/bin/bash
echo "Starting GPU version (local models + cloud APIs)..."
docker compose -f docker-compose.gpu.yml up --build