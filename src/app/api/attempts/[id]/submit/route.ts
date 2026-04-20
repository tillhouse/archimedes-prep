import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isAnswerCorrect, calculateScores } from "@/lib/scoring";

const SubmitSchema = z.object({
  answers: z.record(z.string(), z.string()),
});

export async function POST(
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
            include: {
              questions: true,
            },
          },
        },
      },
    },
  });

  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  if (attempt.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (attempt.completedAt) {
    return NextResponse.json({ error: "Attempt already submitted" }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  const parsed = SubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { answers } = parsed.data;

  // Collect all questions across all modules
  const allQuestions = attempt.test.modules.flatMap((mod) =>
    mod.questions.map((q) => ({ ...q, section: mod.section }))
  );

  // Score each question
  const studentAnswers = allQuestions.map((q) => {
    const studentAnswer = answers[q.id] ?? "";
    const correct = isAnswerCorrect(studentAnswer, q.correctAnswer, q.isGridIn);
    return {
      questionId: q.id,
      studentAnswer,
      isCorrect: correct,
      section: q.section,
    };
  });

  // Calculate raw scores per section
  const rwRaw = studentAnswers.filter((a) => a.section === "Reading & Writing" && a.isCorrect).length;
  const mathRaw = studentAnswers.filter((a) => a.section === "Math" && a.isCorrect).length;

  const scores = calculateScores(rwRaw, mathRaw, attempt.test.slug);

  // Persist answers and update attempt in a transaction
  const [updatedAttempt] = await prisma.$transaction([
    prisma.testAttempt.update({
      where: { id },
      data: {
        completedAt: new Date(),
        rwRawScore: scores.rwRaw,
        mathRawScore: scores.mathRaw,
        rwScoreLower: scores.rwScoreLower,
        rwScoreUpper: scores.rwScoreUpper,
        mathScoreLower: scores.mathScoreLower,
        mathScoreUpper: scores.mathScoreUpper,
        totalLower: scores.totalLower,
        totalUpper: scores.totalUpper,
      },
    }),
    ...studentAnswers.map((a) =>
      prisma.studentAnswer.upsert({
        where: { attemptId_questionId: { attemptId: id, questionId: a.questionId } },
        update: { studentAnswer: a.studentAnswer, isCorrect: a.isCorrect },
        create: {
          attemptId: id,
          questionId: a.questionId,
          studentAnswer: a.studentAnswer,
          isCorrect: a.isCorrect,
        },
      })
    ),
  ]);

  const wrongAnswers = studentAnswers.filter((a) => !a.isCorrect).map((a) => a.questionId);

  return NextResponse.json({
    attemptId: id,
    rwRawScore: scores.rwRaw,
    mathRawScore: scores.mathRaw,
    rwScoreLower: scores.rwScoreLower,
    rwScoreUpper: scores.rwScoreUpper,
    mathScoreLower: scores.mathScoreLower,
    mathScoreUpper: scores.mathScoreUpper,
    totalLower: scores.totalLower,
    totalUpper: scores.totalUpper,
    completedAt: updatedAttempt.completedAt,
    wrongAnswerIds: wrongAnswers,
  });
}
