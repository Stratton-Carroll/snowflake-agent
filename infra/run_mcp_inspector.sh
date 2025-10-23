#!/usr/bin/env bash
set -euo pipefail

# Launch the MCP Inspector against the Snowflake MCP server described in .env.
# Usage:
#   infra/run_mcp_inspector.sh                # UI mode
#   infra/run_mcp_inspector.sh --cli          # CLI mode
#   infra/run_mcp_inspector.sh -- --role ...  # Pass extra args to snowflake-labs-mcp

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat <<'USAGE'
Usage: infra/run_mcp_inspector.sh [inspector flags] [-- server args]

Examples:
  infra/run_mcp_inspector.sh
  infra/run_mcp_inspector.sh --cli
  CLIENT_PORT=8080 infra/run_mcp_inspector.sh
  infra/run_mcp_inspector.sh -- --role ANALYST

All arguments before `--` are forwarded to the MCP Inspector CLI.
Arguments after `--` are forwarded to the Snowflake MCP server command.
USAGE
  exit 0
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
. "$ROOT_DIR"/infra/scripts/_dotenv.sh

: "${MCP_CONFIG_PATH:?Set MCP_CONFIG_PATH in .env or the environment.}"
: "${SNOWFLAKE_MCP_CONNECTION_NAME:?Set SNOWFLAKE_MCP_CONNECTION_NAME in .env or the environment.}"
SNOWFLAKE_MCP_AUTHENTICATOR="${SNOWFLAKE_MCP_AUTHENTICATOR:-externalbrowser}"

INSPECTOR_FLAGS=()
SERVER_ARGS=()

while (($# > 0)); do
  case "$1" in
    --help|-h)
      echo "Use --help before other arguments."
      exit 1
      ;;
    --)
      shift
      SERVER_ARGS=("$@")
      break
      ;;
    *)
      INSPECTOR_FLAGS+=("$1")
      shift
      ;;
  esac
done

CMD=(npx @modelcontextprotocol/inspector)

if ((${#INSPECTOR_FLAGS[@]} > 0)); then
  CMD+=("${INSPECTOR_FLAGS[@]}")
fi

CMD+=(
  uvx
  snowflake-labs-mcp
  --service-config-file "$MCP_CONFIG_PATH"
  --connection-name "$SNOWFLAKE_MCP_CONNECTION_NAME"
  --authenticator "$SNOWFLAKE_MCP_AUTHENTICATOR"
)

if ((${#SERVER_ARGS[@]} > 0)); then
  CMD+=("${SERVER_ARGS[@]}")
fi

exec "${CMD[@]}"
