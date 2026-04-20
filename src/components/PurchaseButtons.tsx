"use client";

import { useState } from "react";

const BUNDLES = [
  { id: "starter", label: "3 reviews", price: "$29" },
  { id: "standard", label: "5 reviews", price: "$39" },
  { id: "full", label: "10 reviews", price: "$59" },
] as const;

export function PurchaseButtons() {
  const [loading, setLoading] = useState<string | null>(null);

  async function purchase(bundleId: string) {
    setLoading(bundleId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundleId }),
      });
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 shrink-0">
      {BUNDLES.map((b) => (
        <button
          key={b.id}
          onClick={() => purchase(b.id)}
          disabled={loading !== null}
          className="px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
        >
          {loading === b.id ? "…" : `${b.label} — ${b.price}`}
        </button>
      ))}
    </div>
  );
}
