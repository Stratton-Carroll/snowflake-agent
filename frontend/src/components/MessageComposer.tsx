import { FC, FormEvent, useState } from "react";

interface MessageComposerProps {
  onSend: (input: string) => Promise<void>;
  isSending: boolean;
  disabled?: boolean;
  error: string | null;
  onClearError: () => void;
  onResetSession: () => void;
}

export const MessageComposer: FC<MessageComposerProps> = ({
  onSend,
  isSending,
  disabled = false,
  error,
  onClearError,
  onResetSession,
}) => {
  const [draft, setDraft] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim() || isSending) {
      return;
    }
    await onSend(draft);
    setDraft("");
  };

  return (
    <form className="message-composer" onSubmit={handleSubmit}>
      <textarea
        aria-label="Ask a question"
        placeholder="Ask about your Snowflake data..."
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        disabled={isSending || disabled}
        rows={3}
      />
      <div className="message-composer__actions">
        <button type="submit" disabled={isSending || disabled}>
          {isSending ? "Sending…" : "Send"}
        </button>
        <button
          type="button"
          className="message-composer__reset"
          onClick={onResetSession}
          disabled={isSending}
        >
          Reset Session
        </button>
      </div>
      {error && (
        <div className="message-composer__error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={onClearError}>
            Dismiss
          </button>
        </div>
      )}
    </form>
  );
};
