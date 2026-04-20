import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function startTest(formData: FormData) {
  "use server";
  const testId = formData.get("testId") as string;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const existing = await prisma.testAttempt.findFirst({
    where: { userId: session.user.id, testId, completedAt: null },
  });
  if (existing) redirect(`/attempts/${existing.id}`);

  const attempt = await prisma.testAttempt.create({
    data: { userId: session.user.id, testId },
  });
  redirect(`/attempts/${attempt.id}`);
}

export default async function TestsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const tests = await prisma.test.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Available Tests
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        Take each test on paper first under real conditions, then return here
        to enter your answers and get tutored on your mistakes.
      </p>

      {tests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">No tests available yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tests.map((test) => (
            <div
              key={test.id}
              className="bg-white rounded-xl border border-gray-200 px-6 py-5 flex items-center justify-between"
            >
              <div>
                <h2 className="font-semibold text-gray-900">{test.name}</h2>
                <p className="text-sm text-gray-400 mt-1">
                  {test.testType} · 120 questions · 4 modules
                </p>
              </div>
              <form action={startTest}>
                <input type="hidden" name="testId" value={test.id} />
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  Start Test
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
