from functools import lru_cache

from app.core.config import get_settings
from app.services.openai_client import OpenAIChatClient, OpenAIClient, StubOpenAIClient


@lru_cache(maxsize=1)
def get_openai_client() -> OpenAIClient:
    """Return the OpenAI client instance."""
    settings = get_settings()
    if settings.use_openai_stub:
        return StubOpenAIClient()
    return OpenAIChatClient(api_key=settings.openai_api_key, model=settings.openai_model)
