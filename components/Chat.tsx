"use client";

import { useEffect, useRef, useState, FormEvent } from "react";

type Message = { role: "user" | "assistant"; content: string };

// Display label for the cost-badge tooltip.
const MODEL_LABEL = "2.5 flash";

const INITIAL_SUGGESTIONS = [
  "what do you do at nvidia?",
  "what's rubin?",
  "how'd you get into TPM work?",
  "how do i reach the real mason?",
];

const INITIAL_GREETING =
  "hey — virtual mason here. i'm a TPM on GPU engineering ops at nvidia, currently wrangling rubin datacenter NPI. ask me about the work, the path here, or how to get in touch with real-me.";

const UNLOCK_GREETING =
  "you're in. ask away — pick one of the suggested questions below, or type your own. i'll do my best to answer like real-me would.";

// Matches anything that signals "the visitor asked about college / UW life."
// Kept tight so unrelated messages (e.g. "i went to a bootcamp") don't trigger.
const COLLEGE_RX =
  /\b(college|university|wisconsin|madison|uw[-\s]?madison|\buw\b|undergrad|undergraduate|alma mater|campus|case comp(?:etition)?|isye|dollmeyer|scholarship|impactvc|consulting club|school)\b/i;

export default function Chat({
  onAssistantReply,
  onCollegeMention,
}: {
  onAssistantReply?: () => void;
  onCollegeMention?: () => void;
} = {}) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: INITIAL_GREETING },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>(INITIAL_SUGGESTIONS);

  // Running session cost — accumulates real Gemini token spend per turn.
  const [costUsd, setCostUsd] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);

  // Lock state — true until a successful unlock or successful chat call.
  const [locked, setLocked] = useState(true);
  const [password, setPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  // Track every question the visitor has asked OR seen as a chip, so we
  // can dedupe future suggestions across the whole session.
  const askedQuestionsRef = useRef<string[]>([...INITIAL_SUGGESTIONS]);

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
      // Roll the real Gemini token spend into the running total.
      if (data.usage && typeof data.usage.costUsd === "number") {
        setCostUsd((c) => c + data.usage.costUsd);
        setTotalTokens((t) => t + (data.usage.totalTokens || 0));
      }
      const rawSuggestions: string[] = Array.isArray(data.suggestions)
        ? data.suggestions.filter(
            (s: unknown) => typeof s === "string" && s.trim().length > 0
          )
        : [];

      // Dedupe vs every question the visitor has already asked (or seen as
      // a chip earlier this session) — case/punctuation insensitive.
      const seen = new Set<string>();
      const norm = (s: string) =>
        s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
      askedQuestionsRef.current.forEach((q) => seen.add(norm(q)));

      const userMessageCount =
        messages.filter((m) => m.role === "user").length + 1; // +1 for `text`
      const HARD_LIMIT = 5;
      const overLimit = userMessageCount >= HARD_LIMIT;

      const dedupedSuggestions = overLimit
        ? []
        : rawSuggestions.filter((s) => {
            const k = norm(s);
            if (!k || seen.has(k)) return false;
            seen.add(k);
            return true;
          });

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      setSuggestions(dedupedSuggestions);
      // Remember chips we just showed so they don't reappear next round.
      dedupedSuggestions.forEach((s) => askedQuestionsRef.current.push(s));
      onAssistantReply?.();
      // If the user asked about college OR the reply talks about it, signal
      // the parent so the avatar can wave the UW flag for a moment.
      if (COLLEGE_RX.test(text) || COLLEGE_RX.test(reply)) {
        onCollegeMention?.();
      }
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
    askedQuestionsRef.current.push(trimmed);
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
        throw new Error(body.error || "wrong password, please try again");
      }
      setLocked(false);
      setPassword("");

      // If there was a pending message, retry it now that we're unlocked.
      if (pendingMessage) {
        const msg = pendingMessage;
        setPendingMessage(null);
        await send(msg);
      } else {
        // Fresh unlock — nudge the visitor to start chatting.
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: UNLOCK_GREETING },
        ]);
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

  // Format like $0.000123 for tiny amounts, $0.0012 once we cross fractions
  // of a cent — keeps it readable without dropping precision early.
  const costLabel =
    costUsd === 0
      ? "$0.000000"
      : costUsd < 0.001
      ? `$${costUsd.toFixed(6)}`
      : costUsd < 0.1
      ? `$${costUsd.toFixed(4)}`
      : `$${costUsd.toFixed(3)}`;

  return (
    <div className="right-panel">
      <div
        className="cost-badge"
        title={`gemini ${MODEL_LABEL} · ${totalTokens.toLocaleString()} tokens this session`}
      >
        <span className="cost-k">cost</span>
        <span className="cost-v">{costLabel}</span>
      </div>
      <div className="chat-log" ref={logRef}>
        {messages.map((m, i) => {
          const next = messages[i + 1];
          // Avatar shows on the LAST assistant message in a run — i.e., the
          // one right before the next user message (or the most recent reply
          // while we're waiting for the user). Hidden while the typing
          // indicator is up so the avatar doesn't double-appear.
          const isLastAssistantInRun =
            m.role === "assistant" && (!next || next.role === "user");
          const showAvatar = isLastAssistantInRun && !loading;
          // Name label only on the very first message of the whole chat.
          const showName = m.role === "assistant" && i === 0;
          return (
            <div key={i} className={`msg-row ${m.role}`}>
              {m.role === "assistant" && (
                <div className="avatar-slot">
                  {showAvatar && (
                    <img
                      src="/avatar.svg"
                      alt="virtual mason"
                      className="avatar"
                    />
                  )}
                </div>
              )}
              <div className={`msg ${m.role}`}>
                {showName && <div className="msg-name">virtual mason</div>}
                <div className="msg-bubble">{m.content}</div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="msg-row assistant">
            <div className="avatar-slot">
              <img
                src="/avatar.svg"
                alt="virtual mason"
                className="avatar"
              />
            </div>
            <div className="msg assistant">
              <div className="msg-bubble">
                <div className="typing" aria-label="thinking">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
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
