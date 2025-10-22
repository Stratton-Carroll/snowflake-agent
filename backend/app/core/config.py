from functools import lru_cache
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration values loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: str = Field(default="development", description="Application environment name.")
    openai_api_key: str = Field(validation_alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4o-mini", validation_alias="OPENAI_MODEL")
    use_openai_stub: bool = Field(default=False, validation_alias="USE_OPENAI_STUB")
    mcp_config_path: str = Field(validation_alias="MCP_CONFIG_PATH")
    snowflake_connection_name: str = Field(validation_alias="SNOWFLAKE_MCP_CONNECTION_NAME")
    snowflake_authenticator: str = Field(default="externalbrowser", validation_alias="SNOWFLAKE_MCP_AUTHENTICATOR")
    use_mcp_stub: bool = Field(default=False, validation_alias="USE_MCP_STUB")
    snowflake_default_role: Optional[str] = Field(
        default=None,
        validation_alias="SNOWFLAKE_DEFAULT_ROLE",
        description="Fallback Snowflake role if one is not supplied by the client.",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()
