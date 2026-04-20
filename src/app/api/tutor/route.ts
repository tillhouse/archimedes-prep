import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkEntitlement, consumeEntitlement } from "@/lib/entitlements";
import { buildQuestionContext, SAT_TUTOR_SYSTEM_PROMPT } from "@/lib/tutorPrompt";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

const TutorRequestSchema = z.object({
  attemptId: z.string().min(1),
  questionId: z.string().min(1),
  messages: z.array(MessageSchema).min(1),
});

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json().catch(() => null);
  const parsed = TutorRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { attemptId, questionId, messages } = parsed.data;

  // Load attempt with question data
  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: {
      test: {
        include: {
          modules: {
            include: {
              questions: {
                where: { id: questionId },
              },
            },
          },
        },
      },
      answers: {
        where: { questionId },
      },
    },
  });

  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  if (attempt.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!attempt.completedAt) {
    return NextResponse.json(
      { error: "Cannot review an incomplete attempt" },
      { status: 422 }
    );
  }

  // Find the question across modules
  const questionModule = attempt.test.modules.find((mod) =>
    mod.questions.some((q) => q.id === questionId)
  );
  const question = questionModule?.questions.find((q) => q.id === questionId);

  if (!question || !questionModule) {
    return NextResponse.json({ error: "Question not found in attempt" }, { status: 404 });
  }

  const studentAnswerRecord = attempt.answers[0] ?? null;

  // Entitlement check: consume on first message of a new session
  let isFreeSession = false;
  if (!attempt.tutorSessionStarted) {
    const entitlement = await checkEntitlement(userId);
    if (!entitlement.allowed) {
      return NextResponse.json(
        { error: "No reviews remaining. Purchase a bundle to continue." },
        { status: 402 }
      );
    }
    isFreeSession = entitlement.isFree;
    // Consume before streaming so we don't double-charge on retry
    await consumeEntitlement(userId, isFreeSession);
    await prisma.testAttempt.update({
      where: { id: attemptId },
      data: { tutorSessionStarted: true },
    });
  }

  // Build system prompt + question context
  const trapAnalysis = question.trapAnalysis
    ? JSON.parse(question.trapAnalysis)
    : {};
  const answerChoices = question.answerChoices
    ? JSON.parse(question.answerChoices)
    : null;

  const questionContext = buildQuestionContext({
    questionNumber: question.questionNumber,
    section: questionModule.section,
    moduleNumber: questionModule.moduleNumber,
    questionType: question.questionType,
    questionText: question.questionText,
    answerChoices,
    correctAnswer: question.correctAnswer,
    isGridIn: question.isGridIn,
    hasFigure: question.hasFigure,
    studentAnswer: studentAnswerRecord?.studentAnswer ?? null,
    isCorrect: studentAnswerRecord?.isCorrect ?? null,
    approach: question.approach,
    whyRight: question.whyRight,
    trapAnalysis,
    patternTip: question.patternTip,
  });

  const systemPrompt = `${SAT_TUTOR_SYSTEM_PROMPT}\n\n${questionContext}`;

  // Stream from Anthropic
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      try {
        let fullResponse = "";

        const anthropicStream = await client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: systemPrompt,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        });

        for await (const event of anthropicStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const text = event.delta.text;
            fullResponse += text;
            sendEvent(JSON.stringify({ type: "delta", text }));
          }
        }

        sendEvent(JSON.stringify({ type: "done" }));

        // Persist conversation after streaming completes
        const updatedMessages = [
          ...messages,
          { role: "assistant" as const, content: fullResponse },
        ];

        await prisma.tutorConversation.upsert({
          where: { attemptId_questionId: { attemptId, questionId } },
          update: {
            messages: JSON.stringify(updatedMessages),
          },
          create: {
            attemptId,
            questionId,
            messages: JSON.stringify(updatedMessages),
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Stream error";
        sendEvent(JSON.stringify({ type: "error", message }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
