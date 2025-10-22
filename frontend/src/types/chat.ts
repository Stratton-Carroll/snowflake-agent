export type ArtifactType = "table" | "chart" | "json" | "text";

export interface ArtifactPayload {
  data: unknown;
  schema?: Record<string, unknown>;
}

export interface ChatArtifact {
  id: string;
  type: ArtifactType;
  title?: string;
  description?: string;
  payload: ArtifactPayload;
}

export interface ClientContext {
  locale?: string;
  timezone?: string;
  extras?: Record<string, unknown>;
}

export interface ChatRequest {
  user_input: string;
  session_id?: string;
  client_context?: ClientContext;
}

export interface ChatResponse {
  session_id: string;
  assistant_text: string;
  artifacts: ChatArtifact[];
  raw_sql?: string | null;
  warnings: string[];
}

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  artifacts?: ChatArtifact[];
  warnings?: string[];
  rawSql?: string | null;
  createdAt: string;
}
