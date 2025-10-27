from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


ArtifactType = Literal["table", "chart", "json", "text", "metrics", "insight"]


class VisualizationSpec(BaseModel):
    """Structured specification for rendering interactive charts."""

    library: Literal["vega-lite"] = Field(description="Visualization grammar to interpret the spec.")
    spec: Dict[str, Any] = Field(description="Visualization schema (e.g. Vega-Lite JSON).")
    interactive: bool = Field(default=True, description="Whether the chart should enable interactive behaviours.")


class KeyFigure(BaseModel):
    """Single value surfaced as part of an insight card."""

    label: str = Field(description="Short descriptor displayed above or beside the value.")
    value: str = Field(description="Formatted metric value shown to the user.")
    change: Optional[str] = Field(
        default=None,
        description="Optional change indicator (e.g. +5% YoY).",
    )
    annotation: Optional[str] = Field(
        default=None,
        description="Optional footnote or additional context for the figure.",
    )


class ArtifactPayload(BaseModel):
    """Generic payload wrapper for artifacts returned to the client."""

    data: Any = Field(default=None, description="Artifact content (table rows, chart spec, JSON, etc.).")
    schema: Optional[Dict[str, Any]] = Field(
        default=None, description="Optional schema or metadata describing the payload shape."
    )
    visualization: Optional[VisualizationSpec] = Field(
        default=None, description="Optional visualization configuration rendered on the frontend."
    )
    key_figures: List[KeyFigure] = Field(
        default_factory=list,
        description="Optional headline metrics to spotlight alongside the artifact.",
    )
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional render hints or statistics.")


class ChatArtifact(BaseModel):
    """Represents a data artifact rendered alongside the assistant response."""

    id: str = Field(description="Stable identifier for the artifact within a chat session.")
    type: ArtifactType = Field(description="Artifact rendering hint for the frontend.")
    title: Optional[str] = Field(default=None, description="Short label displayed above the artifact.")
    description: Optional[str] = Field(
        default=None, description="Longer description or insight summary to show with the artifact."
    )
    headline: Optional[str] = Field(default=None, description="Primary takeaway sentence emphasised in the UI.")
    payload: ArtifactPayload = Field(default_factory=ArtifactPayload)


class ExecutionMetadata(BaseModel):
    """Additional details about Snowflake execution surfaced to the frontend."""

    row_count: Optional[int] = Field(default=None, description="Total rows returned by the executed SQL.")
    column_count: Optional[int] = Field(default=None, description="Number of columns present in the result set.")
    chart_types: List[str] = Field(default_factory=list, description="List of chart types generated for this result.")
    query_duration_ms: Optional[int] = Field(default=None, description="Duration of the Snowflake query in milliseconds.")
    generated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp when the execution metadata was recorded (UTC).",
    )


class ClientContext(BaseModel):
    """Optional metadata sent by the frontend to inform backend orchestration."""

    locale: Optional[str] = Field(default=None, description="Client locale for formatting purposes.")
    timezone: Optional[str] = Field(default=None, description="Client timezone for temporal conversions.")
    extras: Dict[str, Any] = Field(default_factory=dict, description="Additional context supplied by the client.")


class ChatRequest(BaseModel):
    """Payload received from the frontend chat UI."""

    user_input: str = Field(description="Raw prompt submitted by the user.")
    session_id: Optional[str] = Field(
        default=None,
        description="Existing chat session identifier. When omitted a new session will be created.",
    )
    client_context: Optional[ClientContext] = Field(
        default=None,
        description="Optional context about the client environment or UI state.",
    )


class ChatResponse(BaseModel):
    """Structured response returned to the frontend."""

    session_id: str = Field(description="Active session identifier (new or existing).")
    assistant_text: str = Field(description="Primary assistant reply for the user's prompt.")
    artifacts: List[ChatArtifact] = Field(default_factory=list, description="Artifacts generated during the turn.")
    raw_sql: Optional[str] = Field(
        default=None,
        description="SQL statement executed against Snowflake, when applicable.",
    )
    warnings: List[str] = Field(default_factory=list, description="Non-fatal warnings produced during processing.")
    execution_metadata: Optional[ExecutionMetadata] = Field(
        default=None,
        description="Metadata about the executed SQL such as row count and duration.",
    )
