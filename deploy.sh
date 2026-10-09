#!/bin/bash
# Déploiement sur le VPS : récupère la branche suivie puis reconstruit et relance le conteneur.
# Lancé par GitHub Actions (utilisateur deploy) ou à la main depuis /srv/apps/sipchecker.
set -euo pipefail
cd "$(dirname "$0")"
git pull --ff-only
docker compose up -d --build --remove-orphans
docker compose ps
