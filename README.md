# Snowflake Chatbot POC

Proof-of-concept full-stack application that surfaces Snowflake insights through a conversational interface. The project pairs a React single-page app with a FastAPI backend that brokers conversations with OpenAI and the Snowflake MCP server.

## Project Layout

- `backend/` – FastAPI service, business logic, and MCP integration.
- `frontend/` – React SPA that renders the chat experience and data artifacts.
- `infra/` – Environment templates, dev tooling, and container configs.
- `docs/` – Architecture notes, runbooks, and design artifacts.

## Getting Started

1. Copy `.env.example` to `.env` and fill in values (OpenAI key, MCP config path, etc.).
2. Set up the backend environment (e.g. `uv venv` or the tooling of your choice) and install dependencies defined in `backend/pyproject.toml` once it is created.
3. Install frontend dependencies (Vite/React toolchain to be added in later phases).
4. Run backend and frontend dev servers; the frontend dev server will proxy API calls to FastAPI.

Detailed setup scripts, dependency manifests, and run commands will be introduced as the implementation iterates through the planned phases.

## MCP Inspector

- Ensure `.env` is configured with `MCP_CONFIG_PATH`, `SNOWFLAKE_MCP_CONNECTION_NAME`, and optional `SNOWFLAKE_MCP_AUTHENTICATOR`.
- Start the inspector UI with `infra/run_mcp_inspector.sh`; it launches `npx @modelcontextprotocol/inspector` against the Snowflake MCP server and opens ports `6274` (UI) and `6277` (proxy).
- Pass `CLIENT_PORT` and `SERVER_PORT` environment variables to override the defaults, e.g. `CLIENT_PORT=8080 infra/run_mcp_inspector.sh`.
- Use `infra/run_mcp_inspector.sh --cli` for the inspector’s CLI mode or append `-- …` to forward extra arguments to `snowflake-labs-mcp`.
