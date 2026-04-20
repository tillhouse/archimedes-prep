import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-semibold text-gray-900 text-sm tracking-tight">
            Archimedes Prep
          </span>
          <Link
            href="/auth/signin"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 pt-24 pb-20 text-center">
        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-4">
          SAT Prep · Powered by AI
        </p>
        <h1 className="text-5xl font-bold text-gray-900 tracking-tight leading-tight">
          The tutor that knows every
          <br />
          mistake you made
        </h1>
        <p className="mt-6 text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
          Take a real College Board practice test on paper. Enter your answers
          here. Get your score and an AI tutor that walks you through every
          wrong answer, question by question.
        </p>
        <div className="mt-10">
          <Link
            href="/auth/signin"
            className="inline-flex items-center px-7 py-3.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Get started — it&apos;s free
          </Link>
        </div>
      </div>

      <div className="border-t border-gray-100 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-20">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-14">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                step: "01",
                title: "Take a real SAT",
                body: "Download an official College Board practice test and complete it under real timed conditions — on paper.",
              },
              {
                step: "02",
                title: "Enter your answers",
                body: "Log in, select your test, and enter your answers module by module. Get your scaled score instantly.",
              },
              {
                step: "03",
                title: "Get tutored on every mistake",
                body: "AI reviews each wrong answer using structured Socratic questioning — building pattern recognition, not just handing you the answer.",
              },
            ].map((item) => (
              <div key={item.step}>
                <p className="text-xs font-mono font-bold text-indigo-500 mb-3">
                  {item.step}
                </p>
                <h3 className="font-semibold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-16 text-center">
          <p className="text-sm font-semibold text-gray-900 mb-1">
            First review is free
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Try one full AI tutoring session at no cost. Additional reviews
            start at $29 for 3.
          </p>
          <Link
            href="/auth/signin"
            className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 font-medium text-sm rounded-xl hover:bg-gray-50 transition-colors"
          >
            Sign in with Google
          </Link>
        </div>
      </div>
    </div>
  );
}
