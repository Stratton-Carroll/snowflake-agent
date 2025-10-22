import { useMemo } from "react";

import { ArtifactPanel } from "./components/ArtifactPanel";
import { ChatTranscript } from "./components/ChatTranscript";
import { MessageComposer } from "./components/MessageComposer";
import { useChatSession } from "./hooks/useChatSession";
import type { ChatArtifact } from "./types/chat";

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

  const latestSql = useMemo(() => {
    const reversed = [...messages].reverse();
    const lastSql = reversed.find((message) => message.role === "assistant" && message.rawSql);
    return lastSql?.rawSql ?? null;
  }, [messages]);

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <h1>Snowflake Chatbot</h1>
        <p>Prototype chat assistant backed by Snowflake MCP.</p>
      </header>
      <main className="app-shell__main">
        <section className="chat-area">
          <ChatTranscript messages={messages} />
          <MessageComposer
            onSend={sendMessage}
            onResetSession={resetSession}
            isSending={isSending}
            error={error}
            onClearError={clearError}
          />
        </section>
        <aside className="side-panel">
          <section className="sql-panel">
            <h2>Executed SQL</h2>
            {latestSql ? <pre>{latestSql}</pre> : <p>No queries yet.</p>}
          </section>
          <ArtifactPanel artifacts={latestArtifacts} />
        </aside>
      </main>
    </div>
  );
};

export default App;
