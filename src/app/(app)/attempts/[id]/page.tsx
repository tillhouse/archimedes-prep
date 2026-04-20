import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import AnswerEntry from "@/components/AnswerEntry";

export default async function AttemptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const attempt = await prisma.testAttempt.findUnique({
    where: { id },
    include: {
      test: {
        select: {
          name: true,
          modules: {
            orderBy: [{ section: "asc" }, { moduleNumber: "asc" }],
            select: {
              id: true,
              section: true,
              moduleNumber: true,
              questions: {
                orderBy: { questionNumber: "asc" },
                select: { id: true, questionNumber: true, isGridIn: true },
              },
            },
          },
        },
      },
      answers: { select: { questionId: true, studentAnswer: true } },
    },
  });

  if (!attempt) notFound();
  if (attempt.userId !== session.user.id) notFound();
  if (attempt.completedAt) redirect(`/attempts/${id}/review`);

  const initialAnswers: Record<string, string> = {};
  attempt.answers.forEach((a) => {
    initialAnswers[a.questionId] = a.studentAnswer;
  });

  return (
    <AnswerEntry
      attemptId={id}
      testName={attempt.test.name}
      modules={attempt.test.modules}
      initialAnswers={initialAnswers}
    />
  );
}
