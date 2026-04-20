import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

function scoreRange(lower: number | null, upper: number | null) {
  if (!lower || !upper) return null;
  return lower === upper ? `${lower}` : `${lower}–${upper}`;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const attempts = await prisma.testAttempt.findMany({
    where: { userId: session.user.id },
    include: { test: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const completed = attempts.filter((a) => a.completedAt);
  const inProgress = attempts.filter((a) => !a.completedAt);

  const firstName = session.user.name?.split(" ")[0];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          {firstName && (
            <p className="text-sm text-gray-500 mt-1">
              Welcome back, {firstName}
            </p>
          )}
        </div>
        <Link
          href="/tests"
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
        >
          + Start a test
        </Link>
      </div>

      {inProgress.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            In Progress
          </h2>
          <div className="space-y-2">
            {inProgress.map((a) => (
              <div
                key={a.id}
                className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900 text-sm">
                    {a.test.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Started {new Date(a.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  href={`/attempts/${a.id}`}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Continue →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Completed Tests
        </h2>
        {completed.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-12 text-center">
            <p className="text-gray-400 text-sm">No completed tests yet.</p>
            <Link
              href="/tests"
              className="inline-block mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Browse tests →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {completed.map((a) => {
              const total = scoreRange(a.totalLower, a.totalUpper);
              const rw = scoreRange(a.rwScoreLower, a.rwScoreUpper);
              const math = scoreRange(a.mathScoreLower, a.mathScoreUpper);
              return (
                <div
                  key={a.id}
                  className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-8">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {a.test.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(a.completedAt!).toLocaleDateString()}
                      </p>
                    </div>
                    {total && (
                      <div className="hidden sm:flex items-center gap-6 text-center">
                        <div>
                          <p className="text-xs text-gray-400">Total</p>
                          <p className="font-mono font-bold text-gray-900 text-sm">
                            {total}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">R&W</p>
                          <p className="font-mono font-bold text-gray-900 text-sm">
                            {rw ?? "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Math</p>
                          <p className="font-mono font-bold text-gray-900 text-sm">
                            {math ?? "—"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/attempts/${a.id}/review`}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    Review →
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
