"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatUnits } from "viem";
import { useEncora } from "~~/hooks/useEncora";
import { ContentInfo } from "~~/contracts/EncoraTypes";

export default function PurchasesPage() {
  const { getMyPurchases, getContent } = useEncora();
  const [purchases, setPurchases] = useState<ContentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyPurchases()
      .then(ids => Promise.all(ids.map(getContent)))
      .then(setPurchases)
      .finally(() => setLoading(false));
  }, [getMyPurchases, getContent]);

  return (
    <div className="max-w-4xl mx-auto px-6 pt-12 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">My Purchases</h1>
        <p className="text-slate-400 text-sm mt-1">Your unlocked knowledge assets</p>
      </div>

      <div className="rounded-xl overflow-hidden bg-white/5 border border-white/10">
        <div className="px-6 py-4 border-b border-white/5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {purchases.length} assets purchased
          </span>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : purchases.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-400 mb-4">No purchases yet.</p>
            <Link href="/" className="text-indigo-400 hover:underline font-semibold text-sm">
              Browse the marketplace →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {purchases.map(c => (
              <Link
                key={c.id.toString()}
                href={`/content/${c.id}`}
                className="flex items-center justify-between px-6 py-5 hover:bg-white/3 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500/15 border border-green-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-white group-hover:text-indigo-300 transition-colors text-sm">
                      {c.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{c.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-white/5 text-slate-500">
                    {c.category}
                  </span>
                  <span className="font-mono text-sm text-slate-400">{formatUnits(c.price, 6)} USDC</span>
                  <span className="text-indigo-400 text-sm">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
