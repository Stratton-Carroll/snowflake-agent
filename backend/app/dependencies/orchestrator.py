from functools import lru_cache

from app.dependencies.services.mcp_client import get_mcp_client
from app.dependencies.services.openai_client import get_openai_client
from app.dependencies.services.session_store import get_session_store
from app.services.orchestrator import ChatOrchestrator, Orchestrator


@lru_cache(maxsize=1)
def get_orchestrator() -> Orchestrator:
    """Return the orchestrator implementation."""
    return ChatOrchestrator(
        session_store=get_session_store(),
        openai_client=get_openai_client(),
        mcp_client=get_mcp_client(),
    )
