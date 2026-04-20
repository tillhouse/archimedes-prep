import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const attempts = await prisma.testAttempt.findMany({
    where: { userId: session.user.id },
    include: { test: { select: { name: true, slug: true, testType: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    attempts.map((a) => ({
      id: a.id,
      testId: a.testId,
      testName: a.test.name,
      testSlug: a.test.slug,
      testType: a.test.testType,
      createdAt: a.createdAt,
      completedAt: a.completedAt,
      rwScoreLower: a.rwScoreLower,
      rwScoreUpper: a.rwScoreUpper,
      mathScoreLower: a.mathScoreLower,
      mathScoreUpper: a.mathScoreUpper,
      totalLower: a.totalLower,
      totalUpper: a.totalUpper,
    }))
  );
}

const CreateAttemptSchema = z.object({
  testId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateAttemptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { testId } = parsed.data;

  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  const attempt = await prisma.testAttempt.create({
    data: {
      userId: session.user.id,
      testId,
    },
  });

  return NextResponse.json({ attemptId: attempt.id }, { status: 201 });
}
