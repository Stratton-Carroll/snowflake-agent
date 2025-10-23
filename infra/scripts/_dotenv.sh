#!/usr/bin/env bash
set -euo pipefail

# Load variables from the project .env file if it exists.
# Usage:
#   . "$ROOT_DIR/infra/scripts/_dotenv.sh"

ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
DOTENV_FILE="${DOTENV_FILE:-$ROOT_DIR/.env}"

if [[ -f "$DOTENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "$DOTENV_FILE"
  set +a
fi
