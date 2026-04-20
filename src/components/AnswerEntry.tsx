"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Question {
  id: string;
  questionNumber: number;
  isGridIn: boolean;
}

interface Module {
  id: string;
  section: string;
  moduleNumber: number;
  questions: Question[];
}

interface Props {
  attemptId: string;
  testName: string;
  modules: Module[];
  initialAnswers: Record<string, string>;
}

function moduleLabel(mod: Module) {
  const section = mod.section === "Reading & Writing" ? "R&W" : "Math";
  return `${section} · M${mod.moduleNumber}`;
}

export default function AnswerEntry({
  attemptId,
  testName,
  modules,
  initialAnswers,
}: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [activeIndex, setActiveIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalQuestions = modules.reduce((s, m) => s + m.questions.length, 0);
  const answeredCount = Object.values(answers).filter((v) => v.trim() !== "").length;
  const activeModule = modules[activeIndex];

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit() {
    const unanswered = totalQuestions - answeredCount;
    const msg =
      unanswered > 0
        ? `You have ${unanswered} unanswered question${unanswered !== 1 ? "s" : ""}. Unanswered questions will be marked incorrect. Submit anyway?`
        : "Submit your answers? This cannot be undone.";
    if (!confirm(msg)) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/attempts/${attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      if (res.ok) {
        router.push(`/attempts/${attemptId}/review`);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Submission failed. Please try again.");
        setSubmitting(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 56px)" }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4">
          <div className="pt-3 pb-1">
            <h1 className="text-sm font-semibold text-gray-800">{testName}</h1>
          </div>
          <div className="flex">
            {modules.map((mod, i) => {
              const modAnswered = mod.questions.filter(
                (q) => answers[q.id]?.trim()
              ).length;
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveIndex(i)}
                  className={`flex-1 py-2 px-1 text-xs font-medium border-b-2 transition-colors ${
                    i === activeIndex
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <div>{moduleLabel(mod)}</div>
                  <div
                    className={`font-normal ${i === activeIndex ? "text-indigo-400" : "text-gray-300"}`}
                  >
                    {modAnswered}/{mod.questions.length}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Question list */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-2">
          {activeModule.questions.map((q) => (
            <div
              key={q.id}
              className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0"
            >
              <span className="w-8 text-right text-sm text-gray-400 shrink-0 tabular-nums">
                {q.questionNumber}
              </span>

              {q.isGridIn ? (
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    placeholder="e.g. 3/10"
                    className="w-28 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <span className="text-xs text-gray-400">Grid-in</span>
                </div>
              ) : (
                <div className="flex gap-2">
                  {(["A", "B", "C", "D"] as const).map((letter) => (
                    <button
                      key={letter}
                      onClick={() =>
                        setAnswer(
                          q.id,
                          answers[q.id] === letter ? "" : letter
                        )
                      }
                      className={`w-9 h-9 rounded-full text-sm font-medium border-2 transition-all ${
                        answers[q.id] === letter
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600"
                      }`}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 shrink-0">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
              disabled={activeIndex === 0}
              className="text-sm font-medium text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            <span className="text-sm text-gray-400 tabular-nums">
              {answeredCount}/{totalQuestions}
            </span>
            <button
              onClick={() =>
                setActiveIndex((i) => Math.min(modules.length - 1, i + 1))
              }
              disabled={activeIndex === modules.length - 1}
              className="text-sm font-medium text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>

          <div className="flex items-center gap-3">
            {error && <span className="text-xs text-red-600">{error}</span>}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting…" : "Submit Test"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
