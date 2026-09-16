#!/bin/bash
# Run on the EC2 box: ssh <user>@<host> 'cd ~/recommendation-engine && ./scripts/deploy.sh'
# No registry, no CI/CD job — this script *is* the deploy pipeline.
set -euo pipefail

git pull --ff-only
docker compose -f docker-compose.prod.yml --env-file .env.production build
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
docker image prune -f
