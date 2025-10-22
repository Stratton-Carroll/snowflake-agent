from functools import lru_cache

from app.core.config import get_settings
from app.services.mcp_client import RealSnowflakeMcpClient, SnowflakeMcpClient, StubSnowflakeMcpClient


@lru_cache(maxsize=1)
def get_mcp_client() -> SnowflakeMcpClient:
    """Return the configured Snowflake MCP client."""
    settings = get_settings()
    if settings.use_mcp_stub:
        return StubSnowflakeMcpClient()
    return RealSnowflakeMcpClient(settings)
