from __future__ import annotations

import asyncio
import json
import logging
from contextlib import AsyncExitStack
from typing import Any, Protocol

from mcp import types
from mcp.client.stdio import StdioServerParameters, stdio_client
from mcp.client.session import ClientSession

from app.core.config import Settings


class SnowflakeQueryResult(dict):
    """Alias for the normalized Snowflake query result."""


class SnowflakeMcpClient(Protocol):
    """Contract for executing SQL via the Snowflake MCP tool."""

    async def run_query(self, statement: str, role: str | None = None) -> SnowflakeQueryResult:
        """Execute SQL through the MCP adapter and return normalized data."""


class StubSnowflakeMcpClient:
    """Placeholder MCP client that returns sample data."""

    async def run_query(self, statement: str, role: str | None = None) -> SnowflakeQueryResult:
        _ = (statement, role)
        return SnowflakeQueryResult(
            columns=["department", "total_sales"],
            rows=[
                ["Electronics", 125000],
                ["Home", 98000],
            ],
        )


class SnowflakeMcpError(RuntimeError):
    """Raised when the MCP server returns an error payload."""


logger = logging.getLogger(__name__)


class RealSnowflakeMcpClient(SnowflakeMcpClient):
    """Launches the Snowflake MCP server and executes the `run_snowflake_query` tool."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._server_params = StdioServerParameters(
            command="uvx",
            args=[
                "snowflake-labs-mcp",
                "--service-config-file",
                settings.mcp_config_path,
                "--connection-name",
                settings.snowflake_connection_name,
                "--authenticator",
                settings.snowflake_authenticator,
            ],
        )
        self._client_info = types.Implementation(name="snowflake-chatbot-backend", version="0.1.0")
        self._session: ClientSession | None = None
        self._exit_stack: AsyncExitStack | None = None
        self._lock = asyncio.Lock()

    async def run_query(self, statement: str, role: str | None = None) -> SnowflakeQueryResult:
        session = await self._ensure_session()

        if role and role != self._settings.snowflake_default_role:
            logger.warning("Snowflake MCP client ignoring role override '%s'; connection defaults apply.", role)

        result = await session.call_tool("run_snowflake_query", {"statement": statement})
        if result.isError:
            raise SnowflakeMcpError("Snowflake MCP reported an error response.")

        payload = await _extract_payload(session, result)
        normalized = _normalize_payload(payload)
        if normalized is None:
            raise SnowflakeMcpError("Unable to parse Snowflake MCP response payload.")

        return normalized

    async def aclose(self) -> None:
        """Close the MCP session and terminate the subprocess."""
        async with self._lock:
            if self._exit_stack is not None:
                await self._exit_stack.aclose()
            self._exit_stack = None
            self._session = None

    async def _ensure_session(self) -> ClientSession:
        async with self._lock:
            if self._session is not None:
                return self._session

            stack = AsyncExitStack()
            await stack.__aenter__()
            try:
                read, write = await stack.enter_async_context(stdio_client(self._server_params))
                session_cm = ClientSession(read, write, client_info=self._client_info)
                session = await stack.enter_async_context(session_cm)
                await session.initialize()
            except Exception:
                logger.exception("Failed to initialize Snowflake MCP session.")
                await stack.aclose()
                raise

            self._exit_stack = stack
            self._session = session
            return session


async def _extract_payload(session: ClientSession, result: types.CallToolResult) -> Any:
    """
    Return the structured payload from a tool call result.

    The Snowflake MCP server typically returns JSON either in structuredContent or as text content.
    """
    if result.structuredContent is not None:
        return result.structuredContent

    for item in result.content or []:
        if isinstance(item, types.TextContent):
            text = item.text.strip()
            if not text:
                continue
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                logger.debug("Failed to decode text content as JSON: %s", text)
                continue
        if isinstance(item, types.EmbeddedResource):
            contents = item.resource
            if hasattr(contents, "text"):
                try:
                    return json.loads(contents.text)
                except json.JSONDecodeError:
                    logger.debug("Failed to decode embedded resource text as JSON.")
                    continue
        if isinstance(item, types.ResourceLink):
            try:
                resource = await session.read_resource(item.uri)
            except Exception:
                logger.exception("Failed to read linked MCP resource.")
                continue

            if resource.contents:
                for content in resource.contents:
                    if hasattr(content, "text"):
                        try:
                            return json.loads(content.text)
                        except json.JSONDecodeError:
                            logger.debug("Failed to decode resource content as JSON.")
                            continue

    return None


def _normalize_payload(payload: Any) -> SnowflakeQueryResult | None:
    """Normalize arbitrary payloads into a {columns, rows, raw} dict."""
    if payload is None:
        return None

    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except json.JSONDecodeError:
            return SnowflakeQueryResult(columns=[], rows=[], raw=payload)

    if isinstance(payload, dict):
        if "columns" in payload and "rows" in payload:
            columns = [str(col) for col in payload.get("columns", [])]
            raw_rows = payload.get("rows", [])
            rows = _normalize_rows(columns, raw_rows)
            return SnowflakeQueryResult(columns=columns, rows=rows, raw=payload)
        if "data" in payload:
            return _normalize_payload(payload["data"])

    if isinstance(payload, list):
        if payload and isinstance(payload[0], dict):
            column_order: list[str] = []
            for row in payload:
                for key in row.keys():
                    if key not in column_order:
                        column_order.append(str(key))
            rows = [[row.get(column) for column in column_order] for row in payload]
            return SnowflakeQueryResult(columns=column_order, rows=rows, raw=payload)
        if payload and isinstance(payload[0], list):
            # Assume first row contains column names.
            columns = [str(value) for value in payload[0]]
            rows = [list(row) for row in payload[1:]]
            return SnowflakeQueryResult(columns=columns, rows=rows, raw=payload)

    # Fallback: wrap scalar or unsupported structures.
    return SnowflakeQueryResult(columns=[], rows=[[payload]], raw=payload)


def _normalize_rows(columns: list[str], rows: Any) -> list[list[Any]]:
    """Ensure rows are expressed as list-of-lists for the frontend adapter."""
    if not isinstance(rows, list):
        return []

    normalized: list[list[Any]] = []
    for row in rows:
        if isinstance(row, dict):
            normalized.append([row.get(column) for column in columns])
        elif isinstance(row, (list, tuple)):
            normalized.append(list(row))
        else:
            normalized.append([row])
    return normalized
