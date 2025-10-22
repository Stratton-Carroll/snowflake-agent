from __future__ import annotations

from typing import Any, Dict, Protocol, Sequence

from openai import AsyncOpenAI


class OpenAIMessage(Dict[str, Any]):
    """Typed alias for OpenAI chat messages."""


class OpenAIClient(Protocol):
    """Client responsible for interacting with OpenAI models."""

    async def create_chat_completion(
        self,
        messages: Sequence[OpenAIMessage],
        tools: Sequence[Dict[str, Any]] | None,
    ) -> Dict[str, Any]:
        """Call the OpenAI chat completion API."""


class StubOpenAIClient:
    """Placeholder implementation returning canned tool output."""

    async def create_chat_completion(
        self,
        messages: Sequence[OpenAIMessage],
        tools: Sequence[Dict[str, Any]] | None,
    ) -> Dict[str, Any]:
        """
        Return a fake chat completion response.

        The structure mirrors OpenAI function-calling output to enable pipeline development
        before wiring real API access.
        """
        _ = (messages, tools)
        return {
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": "This is a stubbed OpenAI response.",
                    }
                }
            ],
        }


class OpenAIChatClient:
    """Async OpenAI client wrapper."""

    def __init__(self, api_key: str, model: str = "gpt-4o-mini") -> None:
        self._client = AsyncOpenAI(api_key=api_key)
        self._model = model

    async def create_chat_completion(
        self,
        messages: Sequence[OpenAIMessage],
        tools: Sequence[Dict[str, Any]] | None,
    ) -> Dict[str, Any]:
        response = await self._client.chat.completions.create(
            model=self._model,
            messages=list(messages),
            tools=list(tools) if tools else None,
        )
        return response.model_dump()
