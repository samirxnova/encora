"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatUnits } from "viem";
import { useEncora } from "~~/hooks/useEncora";
import { ContentInfo } from "~~/contracts/EncoraTypes";

const CATEGORIES = ["All", "Diet", "Fitness", "Skills", "Finance", "Code", "Health", "Other"];

export default function MarketplacePage() {
  const { listContents, listByCategory } = useEncora();
  const [contents, setContents] = useState<ContentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    setLoading(true);
    const fetch =
      activeCategory === "All" ? listContents() : listByCategory(activeCategory.toLowerCase());
    fetch.then(setContents).finally(() => setLoading(false));
  }, [activeCategory, listContents, listByCategory]);

  return (
    <div className="pb-20">
      {/* Hero */}
      <section className="px-6 pt-16 pb-16 max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="text-5xl font-black tracking-tight leading-tight mb-6">
            Buy and sell knowledge,{" "}
            <span className="bg-gradient-to-r from-indigo-300 to-indigo-600 bg-clip-text text-transparent">
              privately.
            </span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-lg mb-8">
            The world&apos;s first FHE-encrypted marketplace for proprietary data, strategies, and digital knowledge.
            Powered by Zama fhEVM on Sepolia.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/upload"
              className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl hover:brightness-110 active:scale-95 transition-all"
            >
              Start Selling
            </Link>
          </div>
        </div>
        <div className="hidden lg:flex items-center justify-center">
          <div className="w-48 h-48 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <svg className="w-20 h-20 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
        </div>
      </section>

      <div className="px-6 max-w-7xl mx-auto">
        {/* Category Filters */}
        <div className="flex items-center gap-3 overflow-x-auto pb-4 mb-10 no-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? "bg-indigo-600 text-white"
                  : "bg-white/5 text-slate-400 border border-white/10 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl bg-white/5 h-72 animate-pulse" />
            ))}
          </div>
        ) : contents.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-slate-400 mb-4">No content yet in this category.</p>
            <Link href="/upload" className="text-indigo-400 hover:underline font-semibold">
              Be the first to upload →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contents.map(c => (
              <ContentCard key={c.id.toString()} content={c} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <Link
        href="/upload"
        className="fixed bottom-8 right-8 bg-indigo-600 text-white w-14 h-14 rounded-full shadow-2xl shadow-indigo-500/40 flex items-center justify-center hover:brightness-110 active:scale-90 transition-all z-40"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </Link>
    </div>
  );
}

function ContentCard({ content }: { content: ContentInfo }) {
  return (
    <Link
      href={`/content/${content.id}`}
      className="rounded-xl p-5 flex flex-col group block bg-white/5 border border-white/8 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/10 transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded bg-indigo-500/15 text-indigo-300">
          {content.category}
        </span>
        <span className="inline-flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider text-indigo-300">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
          FHE
        </span>
      </div>

      <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors mb-2 line-clamp-2">
        {content.title}
      </h3>
      <p className="text-slate-400 text-sm leading-relaxed line-clamp-2 mb-6 flex-1">{content.description}</p>

      <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-auto">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-0.5">
            Price
          </span>
          <span className="font-mono text-lg font-semibold text-white">{formatUnits(content.price, 6)} USDC</span>
        </div>
        <span className="font-mono text-xs text-slate-500">
          {content.seller.slice(0, 6)}…{content.seller.slice(-4)}
        </span>
      </div>
    </Link>
  );
}
