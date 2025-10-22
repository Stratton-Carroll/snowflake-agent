from fastapi import APIRouter, Depends, status

from app.core.config import Settings, get_settings
from app.dependencies.orchestrator import get_orchestrator
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.orchestrator import Orchestrator

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post(
    "",
    status_code=status.HTTP_200_OK,
    response_model=ChatResponse,
    summary="Submit a chat prompt and receive assistant output.",
)
async def post_chat_message(
    payload: ChatRequest,
    settings: Settings = Depends(get_settings),
    orchestrator: Orchestrator = Depends(get_orchestrator),
) -> ChatResponse:
    """
    Chat endpoint skeleton.

    This implementation is a placeholder until the orchestration pipeline is implemented.
    """
    _ = settings  # Placeholder until settings are used.
    response = await orchestrator.run(payload)
    return response
