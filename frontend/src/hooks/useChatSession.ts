import { useCallback, useMemo, useState } from "react";
import axios from "axios";

import type { ChatMessage, ChatRequest, ChatResponse } from "../types/chat";

const API_ENDPOINT = "/api/chat";

export interface UseChatSessionResult {
  sessionId?: string;
  messages: ChatMessage[];
  isSending: boolean;
  error: string | null;
  sendMessage: (input: string) => Promise<void>;
  clearError: () => void;
  resetSession: () => void;
}

export const useChatSession = (): UseChatSessionResult => {
  const [sessionId, setSessionId] = useState<string>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (input: string) => {
      if (!input.trim()) {
        return;
      }

      const userMessage: ChatMessage = {
        id: `user-${crypto.randomUUID()}`,
        role: "user",
        content: input,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsSending(true);
      setError(null);

      const payload: ChatRequest = {
        user_input: input,
        session_id: sessionId,
      };

      try {
        const { data } = await axios.post<ChatResponse>(API_ENDPOINT, payload);

        setSessionId(data.session_id);

        const assistantMessage: ChatMessage = {
          id: `assistant-${crypto.randomUUID()}`,
          role: "assistant",
          content: data.assistant_text,
          artifacts: data.artifacts,
          warnings: data.warnings,
          rawSql: data.raw_sql,
          executionMetadata: data.execution_metadata ?? undefined,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (requestError) {
        console.error("Failed to send chat message", requestError);
        setError("Unable to contact the chat service. Please try again.");
      } finally {
        setIsSending(false);
      }
    },
    [sessionId],
  );

  const clearError = useCallback(() => setError(null), []);

  const resetSession = useCallback(() => {
    setSessionId(undefined);
    setMessages([]);
    setError(null);
  }, []);

  return useMemo(
    () => ({
      sessionId,
      messages,
      isSending,
      error,
      sendMessage,
      clearError,
      resetSession,
    }),
    [sessionId, messages, isSending, error, sendMessage, clearError, resetSession],
  );
};
