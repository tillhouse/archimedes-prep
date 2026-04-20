"use client";

import { useState, useRef, useEffect, FormEvent } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  attemptId: string;
  questionId: string;
  initialMessages: Message[];
}

const BUNDLES = [
  { id: "starter", label: "3 reviews", price: "$29" },
  { id: "standard", label: "5 reviews", price: "$39" },
  { id: "full", label: "10 reviews", price: "$59" },
] as const;

export function TutorChat({ attemptId, questionId, initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [upgradeNeeded, setUpgradeNeeded] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;

    const userMessage: Message = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);
    setStreamingContent("");
    setError(null);

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          questionId,
          messages: newMessages,
        }),
      });

      if (res.status === 402) {
        setUpgradeNeeded(true);
        setStreaming(false);
        setMessages((prev) => prev.slice(0, -1));
        setInput(text);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong. Please try again.");
        setStreaming(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          const line = event.trim();
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "delta") {
              fullContent += data.text;
              setStreamingContent(fullContent);
            } else if (data.type === "done") {
              setMessages((prev) => [
                ...prev,
                { role: "assistant", content: fullContent },
              ]);
              setStreamingContent("");
              setStreaming(false);
            } else if (data.type === "error") {
              setError(data.message);
              setStreaming(false);
            }
          } catch {
            // ignore parse errors on individual events
          }
        }
      }
    } catch {
      setError("Network error. Please try again.");
      setStreaming(false);
    }
  }

  async function purchaseBundle(bundleId: string) {
    setPurchaseLoading(bundleId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundleId }),
      });
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      }
    } finally {
      setPurchaseLoading(null);
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !streaming && (
          <div className="text-center text-gray-400 text-sm pt-12">
            <p className="font-medium">Start the conversation</p>
            <p className="text-xs mt-1 text-gray-300">
              Try: &ldquo;Why did I get this wrong?&rdquo; or &ldquo;Walk me
              through the approach.&rdquo;
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-br-sm"
                  : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {streaming && streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[82%] bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap shadow-sm">
              {streamingContent}
              <span className="inline-block w-0.5 h-3.5 bg-gray-400 ml-0.5 animate-pulse align-middle" />
            </div>
          </div>
        )}

        {streaming && !streamingContent && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center">
                {[0, 150, 300].map((delay) => (
                  <div
                    key={delay}
                    className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Upgrade prompt */}
      {upgradeNeeded && (
        <div className="border-t border-amber-200 bg-amber-50 px-4 py-4 shrink-0">
          <p className="text-sm font-semibold text-amber-900 mb-0.5">
            Free review used
          </p>
          <p className="text-xs text-amber-700 mb-3">
            Purchase a bundle to continue AI tutoring on your mistakes.
          </p>
          <div className="flex flex-wrap gap-2">
            {BUNDLES.map((b) => (
              <button
                key={b.id}
                onClick={() => purchaseBundle(b.id)}
                disabled={purchaseLoading !== null}
                className="px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                {purchaseLoading === b.id ? "…" : `${b.label} — ${b.price}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-100 shrink-0">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Input */}
      {!upgradeNeeded && (
        <form
          onSubmit={sendMessage}
          className="border-t border-gray-200 bg-white px-3 py-3 flex gap-2 shrink-0"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question…"
            disabled={streaming}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
