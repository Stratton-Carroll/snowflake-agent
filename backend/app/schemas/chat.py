from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


ArtifactType = Literal["table", "chart", "json", "text"]


class ArtifactPayload(BaseModel):
    """Generic payload wrapper for artifacts returned to the client."""

    data: Any = Field(default=None, description="Artifact content (table rows, chart spec, JSON, etc.).")
    schema: Optional[Dict[str, Any]] = Field(
        default=None, description="Optional schema or metadata describing the payload shape."
    )


class ChatArtifact(BaseModel):
    """Represents a data artifact rendered alongside the assistant response."""

    id: str = Field(description="Stable identifier for the artifact within a chat session.")
    type: ArtifactType = Field(description="Artifact rendering hint for the frontend.")
    title: Optional[str] = Field(default=None, description="Short label displayed above the artifact.")
    description: Optional[str] = Field(
        default=None, description="Longer description or insight summary to show with the artifact."
    )
    payload: ArtifactPayload = Field(default_factory=ArtifactPayload)


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
