export type ArtifactType = "table" | "chart" | "json" | "text" | "metrics" | "insight";

export interface VisualizationSpec {
  library: "vega-lite";
  spec: Record<string, unknown>;
  interactive?: boolean;
}

export interface KeyFigure {
  label: string;
  value: string;
  change?: string;
  annotation?: string;
}

export interface ArtifactPayload {
  data: unknown;
  schema?: Record<string, unknown>;
  visualization?: VisualizationSpec | null;
  key_figures?: KeyFigure[];
  metadata?: Record<string, unknown>;
}

export interface ExecutionMetadata {
  row_count?: number;
  column_count?: number;
  chart_types: string[];
  query_duration_ms?: number;
  generated_at: string;
}

export interface ChatArtifact {
  id: string;
  type: ArtifactType;
  title?: string;
  description?: string;
  headline?: string;
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
  execution_metadata?: ExecutionMetadata | null;
}

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  artifacts?: ChatArtifact[];
  warnings?: string[];
  rawSql?: string | null;
  executionMetadata?: ExecutionMetadata | null;
  createdAt: string;
}
