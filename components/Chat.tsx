"use client";

import { useEffect, useRef, useState, FormEvent } from "react";

type Message = { role: "user" | "assistant"; content: string };

const INITIAL_SUGGESTIONS = [
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
  const [suggestions, setSuggestions] = useState<string[]>(INITIAL_SUGGESTIONS);

  // Lock state — true until a successful unlock or successful chat call.
  const [locked, setLocked] = useState(true);
  const [password, setPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Check unlock state on mount so returning visitors aren't re-prompted.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.unlocked) {
          setLocked(false);
          setTimeout(() => inputRef.current?.focus(), 0);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function actuallySend(text: string) {
    setLoading(true);
    setError(null);
    setSuggestions([]);

    const next: Message[] = [...messages, { role: "user", content: text }];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (res.status === 401) {
        // Locked — show password prompt and stash the message to retry.
        setLocked(true);
        setPendingMessage(text);
        // Roll back the optimistic user message so we don't double-send.
        setMessages((prev) => prev.slice(0, -1));
        setTimeout(() => passwordRef.current?.focus(), 0);
        return;
      }

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `server returned ${res.status}`);
      }

      const data = await res.json();
      const reply = (data.reply || "").toString();
      const nextSuggestions = Array.isArray(data.suggestions)
        ? data.suggestions.filter(
            (s: unknown) => typeof s === "string" && s.trim().length > 0
          )
        : [];

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      setSuggestions(nextSuggestions);
      onAssistantReply?.();
    } catch (e: any) {
      setError(e.message || "something broke. check the console.");
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    // Optimistically add the user message
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    await actuallySend(trimmed);
  }

  async function unlock(e: FormEvent) {
    e.preventDefault();
    if (!password || unlocking) return;
    setUnlocking(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "wrong password");
      }
      setLocked(false);
      setPassword("");

      // If there was a pending message, retry it now that we're unlocked.
      if (pendingMessage) {
        const msg = pendingMessage;
        setPendingMessage(null);
        await send(msg);
      } else {
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    } catch (e: any) {
      setError(e.message || "couldn't unlock");
    } finally {
      setUnlocking(false);
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

      {suggestions.length > 0 && !loading && !locked && (
        <div className="suggestions">
          {suggestions.map((s) => (
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

      {locked && (
        <div className="lock-hint">
          chat is password-protected. don&apos;t have it?{" "}
          <a href="mailto:masonum86@gmail.com">email mason</a> or{" "}
          <a
            href="https://www.linkedin.com/in/mason-u"
            target="_blank"
            rel="noreferrer"
          >
            message on linkedin
          </a>{" "}
          to ask.
        </div>
      )}

      {locked ? (
        <form className="input-row lock-row" onSubmit={unlock}>
          <span className="lock-icon" aria-hidden>
            🔒
          </span>
          <input
            ref={passwordRef}
            className="chat-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="enter password to chat…"
            disabled={unlocking}
            autoComplete="current-password"
          />
          <button
            className="send-btn"
            type="submit"
            disabled={unlocking || !password}
          >
            {unlocking ? "…" : "unlock"}
          </button>
        </form>
      ) : (
        <form className="input-row" onSubmit={onSubmit}>
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
      )}
    </div>
  );
}
