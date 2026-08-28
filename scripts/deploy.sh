#!/usr/bin/env bash
#
# Production deploy script.
# Pulls the latest published image from GHCR and recreates the stack.
# Works with either Podman or Docker, whichever is available on the host.
#
# Usage: ./scripts/deploy.sh
# Optional: set CONTAINER_ENGINE=podman|docker to force a specific engine.

set -euo pipefail

# Resolve repo root so the script can be run from anywhere.
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." &>/dev/null && pwd)"
cd "${REPO_ROOT}"

COMPOSE_FILE="compose.prod.yaml"

log() {
    echo "[deploy] $(date '+%Y-%m-%d %H:%M:%S') $*"
}

# Marks the start of a new step, Homebrew-style.
step() {
    echo "==> $*"
}

step "Detecting container engine"
# Pick the container engine: honor CONTAINER_ENGINE if set, otherwise prefer
# Podman and fall back to Docker.
ENGINE="${CONTAINER_ENGINE:-}"
if [[ -z "${ENGINE}" ]]; then
    if command -v podman &>/dev/null; then
        ENGINE="podman"
    elif command -v docker &>/dev/null; then
        ENGINE="docker"
    else
        log "ERROR: neither 'podman' nor 'docker' is installed."
        exit 1
    fi
fi

# Resolve the compose command for the chosen engine, preferring the modern
# built-in subcommand and falling back to the standalone binary.
if [[ "${ENGINE}" == "podman" ]]; then
    if podman compose version &>/dev/null; then
        COMPOSE=(podman compose -f "${COMPOSE_FILE}")
    elif command -v podman-compose &>/dev/null; then
        COMPOSE=(podman-compose -f "${COMPOSE_FILE}")
    else
        log "ERROR: neither 'podman compose' nor 'podman-compose' is available."
        exit 1
    fi
elif [[ "${ENGINE}" == "docker" ]]; then
    if docker compose version &>/dev/null; then
        COMPOSE=(docker compose -f "${COMPOSE_FILE}")
    elif command -v docker-compose &>/dev/null; then
        COMPOSE=(docker-compose -f "${COMPOSE_FILE}")
    else
        log "ERROR: neither 'docker compose' nor 'docker-compose' is available."
        exit 1
    fi
else
    log "ERROR: unsupported CONTAINER_ENGINE '${ENGINE}' (expected 'podman' or 'docker')."
    exit 1
fi

log "Using container engine: ${ENGINE}"

step "Checking environment"
if [[ ! -f .env ]]; then
    log "ERROR: .env file not found in ${REPO_ROOT}. Copy .env.example and fill it in first."
    exit 1
fi
log ".env file found."

step "Pulling latest image(s) for ${COMPOSE_FILE}"
"${COMPOSE[@]}" pull

step "Recreating containers"
"${COMPOSE[@]}" up -d --remove-orphans

step "Pruning dangling images"
"${ENGINE}" image prune -f

step "Current container status"
"${COMPOSE[@]}" ps

step "Deploy finished successfully"
