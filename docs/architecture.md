# Architecture Notes

## High-Level Flow

1. The React SPA captures user prompts and sends them to the FastAPI backend, bundling the active session identifier.
2. FastAPI maintains lightweight session state, consults OpenAI for tool use decisions, and may call the Snowflake MCP server via `run_snowflake_query`.
3. Responses are shaped into conversational text plus optional data artifacts (tables, charts, raw SQL) that the frontend renders alongside the chat transcript.

## Service Boundaries

- **Frontend** – State management, chat UI, artifact rendering, and optimistic UX for long-running queries.
- **Backend** – API endpoints, conversation orchestration, OpenAI integration, Snowflake MCP client, and response normalization.
- **MCP Adapter** – External CLI (`uvx snowflake-labs-mcp …`) launched by the backend when Snowflake data is required.

## Next Steps

- Finalize API contracts (request/response DTOs).
- Implement FastAPI skeleton with orchestrator and stubbed MCP client.
- Scaffold React app with initial chat layout and artifact placeholders.
