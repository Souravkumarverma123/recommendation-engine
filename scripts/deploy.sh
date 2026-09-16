#!/bin/bash
# Manual fallback — normally .github/workflows/ci.yml's `deploy` job does this
# automatically after every push to main. Run by hand only to force a restart
# without a new commit (e.g. re-pull `latest` after fixing something on the box).
# Requires a prior `docker login ghcr.io` on this box (CI's last run already did
# this once; the credential persists in ~/.docker/config.json until it expires).
set -euo pipefail

git pull --ff-only
docker compose -f docker-compose.prod.yml --env-file .env.production pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --remove-orphans
docker image prune -f
