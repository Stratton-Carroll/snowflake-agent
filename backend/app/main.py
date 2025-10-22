from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.chat import router as chat_router


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="Snowflake Chatbot Backend",
        version="0.1.0",
        description="Backend service orchestrating OpenAI conversations and Snowflake MCP queries.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Will be narrowed once frontend origin is known.
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(chat_router)

    return app


app = create_app()
