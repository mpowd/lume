#!/usr/bin/env bash
set -e

echo "Creating data directories..."
mkdir -p data/files \
         data/fastembed_cache \
         data/huggingface_cache \
         data/phoenix \
         data/ollama \
         data/mongodb \
         data/qdrant

echo "Done. You can now run: docker compose -f docker-compose.services.yml up -d"