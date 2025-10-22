from __future__ import annotations

import json
from datetime import datetime
import logging
from typing import Any, Dict, List, Protocol
from uuid import uuid4

from app.schemas.chat import ArtifactPayload, ChatArtifact, ChatRequest, ChatResponse, KeyFigure, VisualizationSpec
from app.services.mcp_client import SnowflakeMcpClient
from app.services.openai_client import OpenAIClient
from app.services.session_store import Message, SessionStore

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are Snowflake Copilot, a data analyst who answers every analytics question with live Snowflake evidence. "
    "You have direct access to the run_snowflake_sql tool which executes a single, read-only SQL statement.\n"
    "\n"
    "Dataset cheat-sheet:\n"
    "- Primary table: PUBLIC.FOOT_TRAFFIC_LONGITUDINAL\n"
    "  • TS (TIMESTAMP_NTZ): event timestamp\n"
    "  • TS_15M_BUCKET (TIMESTAMP_NTZ): bucketed timestamp (15-minute cadence)\n"
    "  • DT (DATE): calendar date\n"
    "  • TS_INTERVAL (TEXT): expected to be '15 minutes' for this feed\n"
    "  • STATE (TEXT): two-letter or title-case state code; normalize with UPPER(STATE)\n"
    "  • COUNTRY (TEXT): use \"United States\" when filtering US results\n"
    "  • FOOT_TRAFFIC_COUNT_NORMALIZED (FLOAT): normalized index you must aggregate/report\n"
    "  • NUM_LOCATIONS_DESC (TEXT): categorical location density descriptor\n"
    "\n"
    "Workflow you MUST follow:\n"
    "1. Decide if the user is asking about data-backed insights or visuals. If yes, you MUST call run_snowflake_sql. "
    "   Only skip the tool for purely conversational or UI questions, and explicitly say so.\n"
    "2. Compose safe SQL using the schema above. Use SELECT-only queries, one statement at a time, no temp tables. "
    "   Leverage helpers such as DATE_PART('year', DT) for filtering by year, and aggregate with functions like AVG().\n"
    "   Example pattern:\n"
    "     WITH state_stats AS (\n"
    "       SELECT UPPER(STATE) AS STATE,\n"
    "              AVG(FOOT_TRAFFIC_COUNT_NORMALIZED) AS AVG_NORMALIZED,\n"
    "              COUNT(*) AS READINGS\n"
    "       FROM PUBLIC.FOOT_TRAFFIC_LONGITUDINAL\n"
    "       WHERE DATE_PART('year', DT) = 2021\n"
    "         AND COUNTRY = 'United States'\n"
    "         AND FOOT_TRAFFIC_COUNT_NORMALIZED IS NOT NULL\n"
    "       GROUP BY 1\n"
    "     )\n"
    "     SELECT * FROM STATE_STATS ORDER BY AVG_NORMALIZED DESC LIMIT 10;\n"
    "\n"
    "3. Never invent numbers. Summaries must reference the SQL results you just retrieved. "
    "   If a query fails, explain the error and try a corrected query.\n"
    "4. Return concise insights highlighting key metrics, assumptions, and suggested follow-ups. "
    "   Ensure artifacts (tables/charts) are described so the UI can render them.\n"
    "5. If you truly lack enough context to form SQL (e.g., table not provided), ask clarifying questions first.\n"
    "All answers must align with these rules; ignoring them is considered off-task."
)

SQL_TOOL_NAME = "run_snowflake_sql"
SQL_TOOL_DEFINITION = [
    {
        "type": "function",
        "function": {
            "name": SQL_TOOL_NAME,
            "description": "Execute a SQL statement against the Snowflake warehouse and return tabular results.",
            "parameters": {
                "type": "object",
                "properties": {
                    "statement": {
                        "type": "string",
                        "description": "A single Snowflake SQL statement to execute.",
                    }
                },
                "required": ["statement"],
            },
        },
    }
]

MAX_TOOL_ITERATIONS = 3
MAX_ROWS_FOR_MODEL = 50


class Orchestrator(Protocol):
    """Protocol describing orchestrator behaviour."""

    async def run(self, payload: ChatRequest) -> ChatResponse:
        """Execute the orchestration pipeline."""


class ChatOrchestrator:
    """Chat orchestrator coordinating OpenAI responses and Snowflake MCP queries."""

    def __init__(
        self,
        session_store: SessionStore,
        openai_client: OpenAIClient,
        mcp_client: SnowflakeMcpClient,
    ) -> None:
        self._session_store = session_store
        self._openai_client = openai_client
        self._mcp_client = mcp_client

    async def run(self, payload: ChatRequest) -> ChatResponse:
        session_id = payload.session_id or str(uuid4())
        history = self._session_store.get_messages(session_id)

        user_message = Message(role="user", content=payload.user_input)
        self._session_store.append_message(session_id, user_message)

        openai_messages = build_openai_messages(history + [user_message])

        artifacts: List[ChatArtifact] = []
        raw_sql: str | None = None
        warnings: List[str] = []
        assistant_text = "I wasn't able to generate a response."

        try:
            completion_context = await self._execute_with_tools(openai_messages, warnings)
            assistant_text = completion_context.assistant_text
            raw_sql = completion_context.last_sql
            artifacts.extend(completion_context.artifacts)
        except Exception:  # pragma: no cover - defensive fallback
            logger.exception("Failed to orchestrate response for session %s", session_id)
            warnings.append("An unexpected error occurred while generating the response.")

        assistant_message = Message(role="assistant", content=assistant_text, artifacts=artifacts, raw_sql=raw_sql)
        self._session_store.append_message(session_id, assistant_message)

        return ChatResponse(
            session_id=session_id,
            assistant_text=assistant_text,
            artifacts=artifacts,
            raw_sql=raw_sql,
            warnings=warnings,
        )

    async def _execute_with_tools(
        self,
        messages: List[Dict[str, Any]],
        warnings: List[str],
    ) -> "CompletionContext":
        """Iteratively call OpenAI until a final assistant message is produced."""
        run_artifacts: List[ChatArtifact] = []
        last_sql: str | None = None
        openai_messages = list(messages)

        for iteration in range(MAX_TOOL_ITERATIONS):
            completion = await self._openai_client.create_chat_completion(
                messages=openai_messages,
                tools=SQL_TOOL_DEFINITION,
            )

            choice = extract_first_choice(completion)
            if choice is None:
                raise RuntimeError("OpenAI returned no choices.")

            assistant_message = choice.get("message", {})
            tool_calls = assistant_message.get("tool_calls") or []

            if not tool_calls:
                assistant_text = extract_assistant_text(choice)
                if assistant_text is None:
                    raise RuntimeError("OpenAI response lacked assistant content.")
                openai_messages.append({"role": "assistant", "content": assistant_text})
                return CompletionContext(assistant_text=assistant_text, artifacts=run_artifacts, last_sql=last_sql)

            openai_messages.append(assistant_message)

            for tool_call in tool_calls:
                function_spec = tool_call.get("function", {})
                if function_spec.get("name") != SQL_TOOL_NAME:
                    warnings.append(f"Ignored unexpected tool call: {function_spec.get('name')}")
                    continue

                statement = extract_statement(function_spec.get("arguments"), warnings)
                if statement is None:
                    continue

                last_sql = statement
                tool_result, generated_artifacts = await self._invoke_snowflake(statement, warnings)
                if generated_artifacts:
                    run_artifacts.extend(generated_artifacts)
                tool_response_message = {
                    "role": "tool",
                    "tool_call_id": tool_call.get("id"),
                    "content": json.dumps(tool_result),
                }
                openai_messages.append(tool_response_message)

        warnings.append("Reached maximum number of tool iterations without a final response.")
        return CompletionContext(
            assistant_text="I reached the tool call limit without producing a final answer.",
            artifacts=run_artifacts,
            last_sql=last_sql,
        )

    async def _invoke_snowflake(
        self, statement: str, warnings: List[str]
    ) -> tuple[Dict[str, Any], List[ChatArtifact]]:
        """Execute SQL via the Snowflake MCP client and shape results for the model and UI."""
        try:
            result = await self._mcp_client.run_query(statement)
        except Exception as exc:  # pragma: no cover - defensive fallback
            logger.exception("Snowflake query failed for statement: %s", statement)
            warnings.append("Snowflake query failed; see logs for details.")
            return {"status": "error", "message": str(exc)}, []

        columns = result.get("columns", [])
        rows = result.get("rows", [])
        limited_rows = rows[:MAX_ROWS_FOR_MODEL] if isinstance(rows, list) else []

        tool_payload: Dict[str, Any] = {
            "status": "success",
            "row_count": len(rows) if isinstance(rows, list) else 0,
            "columns": columns,
            "rows": limited_rows,
        }

        artifacts = build_artifacts_from_result(result, statement)
        return tool_payload, artifacts


class CompletionContext:
    """Container for the assistant outcome after orchestrating tool usage."""

    def __init__(self, assistant_text: str, artifacts: List[ChatArtifact], last_sql: str | None) -> None:
        self.assistant_text = assistant_text
        self.artifacts = artifacts
        self.last_sql = last_sql


def build_openai_messages(history: List[Message]) -> List[Dict[str, Any]]:
    """Construct OpenAI chat history with a system prompt and prior turns."""
    messages: List[Dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for message in history:
        messages.append({"role": message.role, "content": message.content})
    return messages


def extract_first_choice(response: Dict[str, Any]) -> Dict[str, Any] | None:
    """Return the first choice dict from an OpenAI response."""
    choices = response.get("choices")
    if isinstance(choices, list) and choices:
        return choices[0]
    return None


def extract_assistant_text(choice: Dict[str, Any]) -> str | None:
    """Pull assistant text from a chat completion choice."""
    message = choice.get("message") or {}
    content = message.get("content")
    if isinstance(content, str):
        return content
    return None


def extract_statement(arguments: Any, warnings: List[str]) -> str | None:
    """Parse the SQL statement from OpenAI tool call arguments."""
    if arguments is None:
        warnings.append("Tool call omitted arguments; nothing executed.")
        return None

    try:
        parsed = json.loads(arguments)
    except (TypeError, json.JSONDecodeError):
        warnings.append("Failed to decode SQL arguments returned by OpenAI.")
        return None

    statement = parsed.get("statement")
    if not isinstance(statement, str) or not statement.strip():
        warnings.append("OpenAI provided an empty SQL statement.")
        return None

    return statement.strip()


def build_artifacts_from_result(result: dict, statement: str) -> List[ChatArtifact]:
    """Convert an MCP query result into one or more ChatArtifacts for the frontend."""
    columns = result.get("columns")
    rows = result.get("rows")

    if not isinstance(columns, list) or not isinstance(rows, list):
        return []

    records: List[dict] = []
    for row in rows:
        if not isinstance(row, (list, tuple)):
            continue
        record = {column: row[index] if index < len(row) else None for index, column in enumerate(columns)}
        records.append(record)

    if not records:
        return []

    artifact_id = str(uuid4())
    truncated_statement = statement.replace("\n", " ").strip()
    if len(truncated_statement) > 120:
        truncated_statement = truncated_statement[:117] + "..."

    table_artifact = ChatArtifact(
        id=artifact_id,
        type="table",
        title="Snowflake Query Result",
        description=f"Result of `{truncated_statement}`",
        payload=ArtifactPayload(data=records, schema={"columns": columns}),
    )

    metrics_artifact = build_metrics_artifact(columns, records, truncated_statement)
    chart_artifact = build_chart_artifact(columns, records, truncated_statement)

    artifacts: List[ChatArtifact] = [table_artifact]
    if metrics_artifact:
        artifacts.insert(0, metrics_artifact)
    if chart_artifact:
        artifacts.insert(1 if metrics_artifact else 0, chart_artifact)
    return artifacts


def build_metrics_artifact(columns: List[str], records: List[dict], statement: str) -> ChatArtifact | None:
    """Construct a metrics artifact by extracting headline figures from tabular data."""
    if not records:
        return None

    sample_row = _first_non_empty(records)
    numeric_columns = [
        column
        for column in columns
        if isinstance(sample_row.get(column), (int, float)) and not isinstance(sample_row.get(column), bool)
    ]
    if not numeric_columns:
        return None

    top_row = sample_row
    key_figures = [
        KeyFigure(
            label=column.replace("_", " ").title(),
            value=f"{top_row.get(column):,.2f}" if isinstance(top_row.get(column), float) else str(top_row.get(column)),
        )
        for column in numeric_columns[:3]
    ]

    headline = None
    descriptor_columns = [column for column in columns if column not in numeric_columns]
    if descriptor_columns:
        descriptor = top_row.get(descriptor_columns[0])
        if descriptor is not None:
            headline = f"Top result: {descriptor}"

    return ChatArtifact(
        id=str(uuid4()),
        type="metrics",
        title="Headline Metrics",
        headline=headline,
        description=f"Quick view of leading figures from `{statement}`",
        payload=ArtifactPayload(
            data=None,
            key_figures=key_figures,
            metadata={"source": "snowflake"},
        ),
    )


def build_chart_artifact(columns: List[str], records: List[dict], statement: str) -> ChatArtifact | None:
    """Create a Vega-Lite visualization spec when the dataset supports charting."""
    if not records:
        return None

    sample_row = _first_non_empty(records)
    numeric_columns = [
        column
        for column in columns
        if isinstance(sample_row.get(column), (int, float)) and not isinstance(sample_row.get(column), bool)
    ]
    if not numeric_columns:
        return None

    temporal_columns = [
        column
        for column in columns
        if _is_temporal(sample_row.get(column)) or column.lower() in {"dt", "date", "ts", "timestamp", "ts_15m_bucket"}
    ]
    categorical_columns = [
        column
        for column in columns
        if column not in temporal_columns and not isinstance(sample_row.get(column), (int, float))
    ]

    chart_values = records[:500]
    metric_field = numeric_columns[0]

    if temporal_columns:
        temporal_field = temporal_columns[0]
        spec = {
            "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
            "data": {"values": chart_values},
            "mark": {"type": "line", "point": True, "interpolate": "monotone"},
            "encoding": {
                "x": {"field": temporal_field, "type": "temporal", "title": temporal_field.replace("_", " ").title()},
                "y": {
                    "field": metric_field,
                    "type": "quantitative",
                    "title": metric_field.replace("_", " ").title(),
                },
                "tooltip": [{"field": field, "type": _infer_vega_type(sample_row.get(field))} for field in columns[:6]],
            },
        }
        if categorical_columns:
            spec["encoding"]["color"] = {
                "field": categorical_columns[0],
                "type": "nominal",
                "title": categorical_columns[0].replace("_", " ").title(),
            }
        headline = f"Trend of {metric_field.replace('_', ' ')} over time"
    elif categorical_columns:
        category_field = categorical_columns[0]
        spec = {
            "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
            "data": {"values": chart_values},
            "mark": {"type": "bar"},
            "encoding": {
                "x": {
                    "field": category_field,
                    "type": "nominal",
                    "sort": "-y",
                    "title": category_field.replace("_", " ").title(),
                },
                "y": {
                    "field": metric_field,
                    "type": "quantitative",
                    "title": metric_field.replace("_", " ").title(),
                },
                "tooltip": [{"field": field, "type": _infer_vega_type(sample_row.get(field))} for field in columns[:6]],
            },
        }
        headline = f"{metric_field.replace('_', ' ').title()} by {category_field.replace('_', ' ').title()}"
    else:
        return None

    return ChatArtifact(
        id=str(uuid4()),
        type="chart",
        title="Visualization",
        headline=headline,
        description=f"Chart generated from `{statement}`",
        payload=ArtifactPayload(
            data=None,
            visualization=VisualizationSpec(library="vega-lite", spec=spec),
            metadata={"source": "snowflake"},
        ),
    )


def _is_temporal(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, (datetime,)):
        return True
    if isinstance(value, str):
        try:
            datetime.fromisoformat(value.replace("Z", "+00:00"))
            return True
        except ValueError:
            return False
    return False


def _infer_vega_type(value: Any) -> str:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return "quantitative"
    if _is_temporal(value):
        return "temporal"
    return "nominal"


def _first_non_empty(records: List[dict]) -> dict:
    for record in records:
        if any(value is not None for value in record.values()):
            return record
    return records[0]
