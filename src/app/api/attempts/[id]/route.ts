import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const attempt = await prisma.testAttempt.findUnique({
    where: { id },
    include: {
      test: {
        include: {
          modules: {
            orderBy: [{ section: "asc" }, { moduleNumber: "asc" }],
            include: {
              questions: {
                orderBy: { questionNumber: "asc" },
              },
            },
          },
        },
      },
      answers: true,
    },
  });

  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  if (attempt.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Build an answer map keyed by questionId for easy lookup
  const answerMap = Object.fromEntries(
    attempt.answers.map((a) => [a.questionId, { studentAnswer: a.studentAnswer, isCorrect: a.isCorrect }])
  );

  return NextResponse.json({
    id: attempt.id,
    testId: attempt.testId,
    testName: attempt.test.name,
    testSlug: attempt.test.slug,
    createdAt: attempt.createdAt,
    completedAt: attempt.completedAt,
    rwRawScore: attempt.rwRawScore,
    mathRawScore: attempt.mathRawScore,
    rwScoreLower: attempt.rwScoreLower,
    rwScoreUpper: attempt.rwScoreUpper,
    mathScoreLower: attempt.mathScoreLower,
    mathScoreUpper: attempt.mathScoreUpper,
    totalLower: attempt.totalLower,
    totalUpper: attempt.totalUpper,
    tutorSessionStarted: attempt.tutorSessionStarted,
    tutorSessionCompleted: attempt.tutorSessionCompleted,
    modules: attempt.test.modules.map((mod) => ({
      id: mod.id,
      section: mod.section,
      moduleNumber: mod.moduleNumber,
      questions: mod.questions.map((q) => ({
        id: q.id,
        questionNumber: q.questionNumber,
        questionType: q.questionType,
        questionText: q.questionText,
        answerChoices: q.answerChoices ? JSON.parse(q.answerChoices) : null,
        correctAnswer: q.correctAnswer,
        isGridIn: q.isGridIn,
        hasFigure: q.hasFigure,
        approach: q.approach,
        whyRight: q.whyRight,
        trapAnalysis: JSON.parse(q.trapAnalysis),
        patternTip: q.patternTip,
        studentAnswer: answerMap[q.id]?.studentAnswer ?? null,
        isCorrect: answerMap[q.id]?.isCorrect ?? null,
      })),
    })),
  });
}
