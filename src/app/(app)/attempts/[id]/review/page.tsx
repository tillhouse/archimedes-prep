import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { PurchaseButtons } from "@/components/PurchaseButtons";

function scoreRange(lower: number | null, upper: number | null) {
  if (!lower || !upper) return "—";
  return lower === upper ? `${lower}` : `${lower}–${upper}`;
}

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const [attempt, user] = await Promise.all([
    prisma.testAttempt.findUnique({
      where: { id },
      include: {
        test: {
          include: {
            modules: {
              orderBy: [{ section: "asc" }, { moduleNumber: "asc" }],
              include: {
                questions: { orderBy: { questionNumber: "asc" } },
              },
            },
          },
        },
        answers: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        reviewsPurchased: true,
        reviewsUsed: true,
        freeReviewUsed: true,
      },
    }),
  ]);

  if (!attempt) notFound();
  if (attempt.userId !== session.user.id) notFound();
  if (!attempt.completedAt) redirect(`/attempts/${id}`);

  const answerMap = Object.fromEntries(
    attempt.answers.map((a) => [
      a.questionId,
      { studentAnswer: a.studentAnswer, isCorrect: a.isCorrect },
    ])
  );

  const paidRemaining =
    (user?.reviewsPurchased ?? 0) - (user?.reviewsUsed ?? 0);
  const hasEntitlement =
    paidRemaining > 0 || !user?.freeReviewUsed || attempt.tutorSessionStarted;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-xs font-medium text-gray-400 hover:text-gray-600 mb-3 inline-block"
        >
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {attempt.test.name}
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Completed {new Date(attempt.completedAt!).toLocaleDateString()}
        </p>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          {
            label: "Total",
            value: scoreRange(attempt.totalLower, attempt.totalUpper),
            sub: "out of 1600",
          },
          {
            label: "Reading & Writing",
            value: scoreRange(attempt.rwScoreLower, attempt.rwScoreUpper),
            sub: `${attempt.rwRawScore ?? "—"} correct`,
          },
          {
            label: "Math",
            value: scoreRange(attempt.mathScoreLower, attempt.mathScoreUpper),
            sub: `${attempt.mathRawScore ?? "—"} correct`,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-gray-200 p-4 text-center"
          >
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              {card.label}
            </p>
            <p className="text-2xl font-bold font-mono text-gray-900">
              {card.value}
            </p>
            <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Entitlement CTA */}
      {!hasEntitlement && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-semibold text-amber-900 text-sm">
              Unlock AI tutoring
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Your free review has been used. Purchase a bundle to get tutored
              on every wrong answer.
            </p>
          </div>
          <PurchaseButtons />
        </div>
      )}

      {/* Questions by module */}
      {attempt.test.modules.map((mod) => {
        const questions = mod.questions.map((q) => ({
          ...q,
          answer: answerMap[q.id] ?? null,
        }));
        const correct = questions.filter((q) => q.answer?.isCorrect).length;

        return (
          <section key={mod.id} className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-700">
                {mod.section} — Module {mod.moduleNumber}
              </h2>
              <span className="text-xs font-mono text-gray-400">
                {correct}/{mod.questions.length}
              </span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {questions.map((q) => {
                const isCorrect = q.answer?.isCorrect;
                const studentAnswer = q.answer?.studentAnswer ?? "—";
                const canTutor = hasEntitlement && isCorrect === false;

                return (
                  <div
                    key={q.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <span className="w-7 text-right text-sm tabular-nums text-gray-400 shrink-0">
                      {q.questionNumber}
                    </span>

                    <span className="shrink-0 w-4 text-center">
                      {isCorrect === true && (
                        <span className="text-emerald-500 text-sm">✓</span>
                      )}
                      {isCorrect === false && (
                        <span className="text-red-500 text-sm">✗</span>
                      )}
                      {isCorrect == null && (
                        <span className="text-gray-200 text-sm">–</span>
                      )}
                    </span>

                    <div className="flex-1 flex items-center gap-4 text-sm min-w-0">
                      <span className="text-gray-500 shrink-0">
                        Yours:{" "}
                        <span className="font-mono font-medium text-gray-700">
                          {studentAnswer}
                        </span>
                      </span>
                      {isCorrect === false && (
                        <span className="text-gray-500 shrink-0">
                          Correct:{" "}
                          <span className="font-mono font-medium text-gray-700">
                            {q.correctAnswer}
                          </span>
                        </span>
                      )}
                    </div>

                    {isCorrect === false &&
                      (canTutor ? (
                        <Link
                          href={`/attempts/${id}/review/${q.id}`}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-700 shrink-0 whitespace-nowrap"
                        >
                          Get tutoring →
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-300 shrink-0 whitespace-nowrap">
                          Locked
                        </span>
                      ))}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
