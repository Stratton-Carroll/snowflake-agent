from functools import lru_cache

from app.services.session_store import InMemorySessionStore, SessionStore


@lru_cache(maxsize=1)
def get_session_store() -> SessionStore:
    """Return the configured session store."""
    return InMemorySessionStore()
