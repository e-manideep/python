import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../../api/client";
import type { ChatMessage } from "../../api/types";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";

export function Assistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get<{ messages: ChatMessage[] }>("/chat").then((r) => setMessages(r.messages));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setError("");
    const text = input;
    setInput("");
    setMessages((m) => [...m, { id: "temp-" + Date.now(), role: "user", content: text, createdAt: new Date().toISOString() }]);
    setSending(true);
    try {
      const res = await api.post<{ message: ChatMessage }>("/chat", { message: text });
      setMessages((m) => [...m, res.message]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col space-y-4">
      <div>
        <h1 className="font-serif text-3xl font-medium text-ink">Policy assistant</h1>
        <p className="text-sm text-ink-500">Ask anything about what your plan covers — answers are grounded in your actual policy wording.</p>
      </div>
      <Card className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && (
            <div className="space-y-2 text-sm text-ink-300">
              <p>Try asking things like:</p>
              <ul className="list-inside list-disc space-y-1">
                <li>"Is physiotherapy covered under my plan?"</li>
                <li>"What's my room rent limit?"</li>
                <li>"How long is the waiting period for a pre-existing condition?"</li>
              </ul>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-lg rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user" ? "bg-ink text-white" : "border border-line bg-paper text-ink"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {sending && <div className="text-xs text-ink-300">ClaimSetu assistant is thinking…</div>}
          {error && <div className="rounded-lg bg-rose-pale px-3 py-2 text-sm text-rose">{error}</div>}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={send} className="flex gap-2 border-t border-line p-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your coverage…"
            className="flex-1 rounded-lg border border-line px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
          />
          <Button type="submit" disabled={sending || !input.trim()}>
            Send
          </Button>
        </form>
      </Card>
    </div>
  );
}
