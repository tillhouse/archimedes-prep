import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { TutorChat } from "@/components/TutorChat";

export default async function TutorPage({
  params,
}: {
  params: Promise<{ id: string; questionId: string }>;
}) {
  const { id: attemptId, questionId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: {
      test: {
        include: {
          modules: {
            include: {
              questions: { where: { id: questionId } },
            },
          },
        },
      },
      answers: { where: { questionId } },
    },
  });

  if (!attempt || attempt.userId !== session.user.id) notFound();
  if (!attempt.completedAt) redirect(`/attempts/${attemptId}`);

  const questionModule = attempt.test.modules.find(
    (m) => m.questions.length > 0
  );
  const question = questionModule?.questions[0];
  if (!question || !questionModule) notFound();

  const studentAnswer = attempt.answers[0] ?? null;

  const conversation = await prisma.tutorConversation.findUnique({
    where: { attemptId_questionId: { attemptId, questionId } },
  });

  const initialMessages: { role: "user" | "assistant"; content: string }[] =
    conversation?.messages ? JSON.parse(conversation.messages) : [];

  return (
    <div
      className="flex"
      style={{ height: "calc(100vh - 56px)" }}
    >
      {/* Sidebar */}
      <div className="w-64 shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100">
          <Link
            href={`/attempts/${attemptId}/review`}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            ← Back to review
          </Link>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1">
            {questionModule.section} · M{questionModule.moduleNumber}
          </p>
          <p className="text-xl font-bold text-gray-900 mb-0.5">
            Question {question.questionNumber}
          </p>
          <p className="text-xs text-gray-400 mb-5">{question.questionType}</p>

          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Your answer</p>
              <p
                className={`font-mono font-semibold text-sm ${
                  studentAnswer?.isCorrect === false
                    ? "text-red-600"
                    : "text-emerald-600"
                }`}
              >
                {studentAnswer?.studentAnswer ?? "(no answer)"}
                {studentAnswer?.isCorrect === false
                  ? " ✗"
                  : studentAnswer?.isCorrect
                    ? " ✓"
                    : ""}
              </p>
            </div>

            {studentAnswer?.isCorrect === false && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Correct answer</p>
                <p className="font-mono font-semibold text-sm text-gray-900">
                  {question.correctAnswer}
                </p>
              </div>
            )}
          </div>

          {question.questionText && (
            <div className="mt-5">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-2">
                Question
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                {question.questionText.length > 400
                  ? question.questionText.slice(0, 400) + "…"
                  : question.questionText}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 min-w-0">
        <TutorChat
          attemptId={attemptId}
          questionId={questionId}
          initialMessages={initialMessages}
        />
      </div>
    </div>
  );
}
