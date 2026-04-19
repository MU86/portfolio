"use client";

import { useEffect, useRef, useState, FormEvent } from "react";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "what do you do at nvidia?",
  "what's rubin?",
  "how'd you get into TPM work?",
  "how do i reach the real mason?",
];

const INITIAL_GREETING =
  "hey — virtual mason here. i'm a TPM on GPU engineering ops at nvidia, currently wrangling rubin datacenter NPI. ask me about the work, the path here, or how to get in touch with real-me.";

export default function Chat({
  onAssistantReply,
}: {
  onAssistantReply?: () => void;
} = {}) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: INITIAL_GREETING },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const next: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `server returned ${res.status}`);
      }

      const data = await res.json();
      const reply = (data.reply || "").toString();

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      onAssistantReply?.();
    } catch (e: any) {
      setError(e.message || "something broke. check the console.");
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="right-panel">
      <div className="chat-log" ref={logRef}>
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div className="msg-tag">
              {m.role === "assistant" ? "// virtual-me" : "// you"}
            </div>
            <div className="msg-body">{m.content}</div>
          </div>
        ))}

        {loading && (
          <div className="msg assistant">
            <div className="msg-tag">// virtual-me</div>
            <div className="typing" aria-label="thinking">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        {error && <div className="err">! {error}</div>}
      </div>

      {messages.length <= 1 && !loading && (
        <div className="suggestions">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              className="chip"
              onClick={() => send(s)}
              disabled={loading}
              type="button"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form className="input-row" onSubmit={onSubmit}>
        <span className="input-prefix">$</span>
        <input
          ref={inputRef}
          className="chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="type a message and hit enter..."
          disabled={loading}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          className="send-btn"
          type="submit"
          disabled={loading || !input.trim()}
        >
          send
        </button>
      </form>
    </div>
  );
}
