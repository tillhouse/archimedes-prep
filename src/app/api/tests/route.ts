import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tests = await prisma.test.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true, testType: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(tests);
}
