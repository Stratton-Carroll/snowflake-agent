import { useMemo, useState } from "react";

import { ArtifactPanel } from "./components/ArtifactPanel";
import { ChatTranscript } from "./components/ChatTranscript";
import { MessageComposer } from "./components/MessageComposer";
import { useChatSession } from "./hooks/useChatSession";
import type { ChatArtifact, ExecutionMetadata } from "./types/chat";

import "./styles/global.css";

const App = () => {
  const { messages, sendMessage, isSending, error, clearError, resetSession } = useChatSession();

  const latestArtifacts = useMemo<ChatArtifact[]>(() => {
    const reversed = [...messages].reverse();
    const lastAssistantMessageWithArtifacts = reversed.find(
      (message) => message.role === "assistant" && message.artifacts && message.artifacts.length > 0,
    );
    return lastAssistantMessageWithArtifacts?.artifacts ?? [];
  }, [messages]);

  const [isSqlExpanded, setIsSqlExpanded] = useState(false);
  const [isSqlCopied, setIsSqlCopied] = useState(false);

  const latestSql = useMemo(() => {
    const reversed = [...messages].reverse();
    const lastSql = reversed.find((message) => message.role === "assistant" && message.rawSql);
    return lastSql?.rawSql ?? null;
  }, [messages]);

  const latestSqlMeta = useMemo<ExecutionMetadata | null>(() => {
    const reversed = [...messages].reverse();
    const lastSqlMessage = reversed.find(
      (message) => message.role === "assistant" && message.rawSql && message.executionMetadata,
    );
    return lastSqlMessage?.executionMetadata ?? null;
  }, [messages]);

  const metadataChips = useMemo(() => buildSqlMetadataChips(latestSqlMeta), [latestSqlMeta]);
  const highlightedSql = useMemo(() => (latestSql ? highlightSql(latestSql) : ""), [latestSql]);
  const sqlPreview = useMemo(() => (latestSql ? truncateSql(latestSql, 180) : "No queries yet."), [latestSql]);

  const handleCopySql = async () => {
    if (!latestSql || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }
    try {
      await navigator.clipboard.writeText(latestSql);
      setIsSqlCopied(true);
      setTimeout(() => setIsSqlCopied(false), 1600);
    } catch (error) {
      console.error("Failed to copy SQL snippet", error);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <h1>
          <span>❄️</span>
          Snowflake Insight Copilot
        </h1>
        <p>
          Conversational analytics workspace connected to your Snowflake MCP environment. Explore data, validate
          hypotheses, and craft executive-ready narratives without leaving the chat.
        </p>
      </header>
      <main className="app-shell__main">
        <section className="panel">
          <div className="panel__body chat-area">
            <ChatTranscript messages={messages} />
            <MessageComposer
              onSend={sendMessage}
              onResetSession={resetSession}
              isSending={isSending}
              error={error}
              onClearError={clearError}
            />
          </div>
        </section>
        <aside className="panel">
          <div className="panel__body side-panel">
            <section className="sql-panel">
              <div className="sql-panel__header">
                <button
                  type="button"
                  className="sql-panel__toggle"
                  onClick={() => setIsSqlExpanded((current) => !current)}
                  aria-expanded={isSqlExpanded}
                >
                  <span>Executed SQL</span>
                  <span className={`sql-panel__chevron ${isSqlExpanded ? "sql-panel__chevron--open" : ""}`}>⌄</span>
                </button>
                <div className="sql-panel__actions">
                  {latestSql && (
                    <button type="button" className="sql-panel__action" onClick={handleCopySql}>
                      {isSqlCopied ? "Copied" : "Copy"}
                    </button>
                  )}
                </div>
              </div>
              {metadataChips.length > 0 && (
                <ul className="sql-panel__meta">
                  {metadataChips.map((chip) => (
                    <li key={chip.label} className="sql-panel__chip">
                      <span>{chip.label}</span>
                      <strong>{chip.value}</strong>
                    </li>
                  ))}
                </ul>
              )}
              {latestSql ? (
                isSqlExpanded ? (
                  <div className="sql-code" dangerouslySetInnerHTML={{ __html: highlightedSql }} />
                ) : (
                  <p className="sql-panel__preview">{sqlPreview}</p>
                )
              ) : (
                <p className="sql-panel__empty">No queries have been executed yet.</p>
              )}
            </section>
            <ArtifactPanel artifacts={latestArtifacts} />
          </div>
        </aside>
      </main>
    </div>
  );
};

export default App;

const buildSqlMetadataChips = (metadata: ExecutionMetadata | null): Array<{ label: string; value: string }> => {
  if (!metadata) return [];

  const chips: Array<{ label: string; value: string }> = [];
  if (typeof metadata.row_count === "number") {
    chips.push({ label: "ROWS", value: metadata.row_count.toLocaleString() });
  }
  if (typeof metadata.column_count === "number") {
    chips.push({ label: "COLUMNS", value: metadata.column_count.toLocaleString() });
  }
  if (typeof metadata.query_duration_ms === "number") {
    const seconds = metadata.query_duration_ms / 1000;
    chips.push({ label: "DURATION", value: `${seconds.toFixed(seconds >= 1 ? 2 : 3)}s` });
  }
  const chartTypes = metadata.chart_types ?? [];
  if (chartTypes.length > 0) {
    chips.push({ label: "CHARTS", value: chartTypes.map((type) => type.toUpperCase()).join(", ") });
  }
  return chips;
};

const truncateSql = (sql: string, length: number): string => {
  if (sql.length <= length) return sql;
  return `${sql.slice(0, length).trimEnd()}…`;
};

const highlightSql = (sql: string): string => {
  const escapeHtml = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  let html = escapeHtml(sql);

  const stringPlaceholders: string[] = [];
  html = html.replace(/('[^']*'|"[^"]*")/g, (match) => {
    const placeholder = `__SQL_STRING_${stringPlaceholders.length}__`;
    stringPlaceholders.push(`<span class="sql-token sql-string">${match}</span>`);
    return placeholder;
  });

  const keywords = [
    "select",
    "from",
    "where",
    "group",
    "by",
    "order",
    "limit",
    "with",
    "as",
    "on",
    "left",
    "right",
    "inner",
    "outer",
    "join",
    "and",
    "or",
    "not",
    "having",
    "case",
    "when",
    "then",
    "else",
    "end",
    "distinct",
    "union",
    "all",
    "over",
    "partition",
    "into",
    "using",
  ];
  const keywordRegex = new RegExp(`\\b(${keywords.join("|")})\\b`, "gi");
  html = html.replace(keywordRegex, (match) => `<span class="sql-token sql-keyword">${match.toUpperCase()}</span>`);

  html = html.replace(/\b\d+(\.\d+)?\b/g, '<span class="sql-token sql-number">$&</span>');
  html = html.replace(/\b(dateadd|count|avg|min|max|sum|lag|lead|coalesce)\b/gi, (match) => {
    return `<span class="sql-token sql-function">${match.toUpperCase()}</span>`;
  });

  stringPlaceholders.forEach((replacement, index) => {
    html = html.replace(`__SQL_STRING_${index}__`, replacement);
  });

  return html;
};
