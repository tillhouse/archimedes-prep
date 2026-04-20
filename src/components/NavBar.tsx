"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function NavBar() {
  const { data: session } = useSession();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-gray-900 tracking-tight"
          >
            Archimedes
          </Link>
          <Link
            href="/tests"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Tests
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Dashboard
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {session?.user?.name && (
            <span className="text-sm text-gray-500 hidden sm:block">
              {session.user.name}
            </span>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
