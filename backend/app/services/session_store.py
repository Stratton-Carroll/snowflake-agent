from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Protocol

from app.schemas.chat import ChatArtifact


@dataclass
class Message:
    """Internal representation of a chat message persisted in the session store."""

    role: str
    content: str
    artifacts: List[ChatArtifact] = field(default_factory=list)
    raw_sql: str | None = None


class SessionStore(Protocol):
    """Persistence abstraction for chat sessions."""

    def get_messages(self, session_id: str) -> List[Message]:
        """Return the ordered message history for a session."""

    def append_message(self, session_id: str, message: Message) -> None:
        """Append a message to the session history."""


class InMemorySessionStore(SessionStore):
    """In-memory session storage backed by a simple dictionary."""

    def __init__(self) -> None:
        self._store: Dict[str, List[Message]] = {}

    def get_messages(self, session_id: str) -> List[Message]:
        return list(self._store.get(session_id, []))

    def append_message(self, session_id: str, message: Message) -> None:
        history = self._store.setdefault(session_id, [])
        history.append(message)
