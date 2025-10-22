# Repository Guidelines

## Project Structure & Module Organization
- `backend/` – FastAPI service; core code under `app/` with `api/`, `services/`, `schemas/`, and `core/` packages. Virtualenv lives in `backend/.venv/`.
- `frontend/` – React + Vite SPA; entrypoint `src/App.tsx`, hooks in `src/hooks/`, shared types in `src/types/`.
- `docs/` – Architecture notes and design references.
- `infra/` – Operational templates (e.g., future Docker/CI assets).
- `.env.example` – Template for secrets; copy to `.env` at repo root.

## Build, Test, and Development Commands
- Backend: `cd backend && uv pip install -e .` installs dependencies; `uv run uvicorn app.main:app --reload` launches the API with auto-reload.
- Frontend: `cd frontend && npm install` for deps; `npm run dev` serves the SPA (proxied to FastAPI); `npm run build` creates a production bundle.
- Linting: `uv run ruff check .` for Python style; `cd frontend && npm run lint` for TypeScript/React.

## Coding Style & Naming Conventions
- Python: follow PEP 8 via Ruff; prefer type hints and dependency-injected services (`get_*` factories). Module paths use snake_case; classes are PascalCase.
- TypeScript/React: use functional components, hooks in `useSomething` files, and PascalCase component names. Keep CSS in `src/styles/`.
- Configuration values sourced through `pydantic` settings; expose new env vars in `.env.example`.

## Testing Guidelines
- Backend tests: place under `backend/tests/`; use `pytest` and `httpx.AsyncClient` for API contracts. Run via `uv run pytest`.
- Frontend tests: add to `frontend/src/__tests__/`; use Vitest with `npm run test`.
- Aim for coverage on orchestration flows (OpenAI + Snowflake stubs) and critical React hooks.

## Commit & Pull Request Guidelines
- Commits: concise present-tense subject lines (`Add MCP client retries`), include context in body when refactoring or touching orchestrator logic.
- Pull Requests: describe intent, list functional changes, link related issues, and note testing performed (backend requests, frontend manual checks). Include screenshots or terminal output when UX or API responses change.

## Security & Configuration Tips
- Never commit real `.env` files or Snowflake credentials; rely on `.env.example`.
- MCP and OpenAI credentials are loaded from environment variables—restart the backend after edits to `.env`.
