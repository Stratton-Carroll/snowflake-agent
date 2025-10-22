import type { FC } from "react";

import type { ChatMessage } from "../types/chat";

interface ChatTranscriptProps {
  messages: ChatMessage[];
}

export const ChatTranscript: FC<ChatTranscriptProps> = ({ messages }) => {
  if (messages.length === 0) {
    return (
      <div className="chat-transcript__empty">
        <p>Ask a question about your Snowflake data to get started.</p>
      </div>
    );
  }

  return (
    <div className="chat-transcript">
      {messages.map((message) => (
        <article key={message.id} className={`chat-message chat-message--${message.role}`}>
          <header className="chat-message__meta">
            <span className="chat-message__role">{message.role === "user" ? "You" : "Assistant"}</span>
            <time dateTime={message.createdAt}>
              {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </time>
          </header>
          <p className="chat-message__content">{message.content}</p>
          {message.warnings && message.warnings.length > 0 && (
            <ul className="chat-message__warnings">
              {message.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
        </article>
      ))}
    </div>
  );
};
