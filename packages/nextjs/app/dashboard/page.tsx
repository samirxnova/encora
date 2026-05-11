"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatUnits } from "viem";
import toast from "react-hot-toast";
import { useEncora } from "~~/hooks/useEncora";
import { ContentInfo } from "~~/contracts/EncoraTypes";

export default function DashboardPage() {
  const { getMyUploads, getContent, getSellerBalance, withdraw } = useEncora();
  const [uploads, setUploads] = useState<ContentInfo[]>([]);
  const [balance, setBalance] = useState(0n);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    Promise.all([
      getMyUploads()
        .then(ids => Promise.all(ids.map(getContent)))
        .then(setUploads),
      getSellerBalance().then(setBalance),
    ]).finally(() => setLoading(false));
  }, [getMyUploads, getContent, getSellerBalance]);

  async function handleWithdraw() {
    setWithdrawing(true);
    try {
      await withdraw();
      toast.success("Withdrawn!");
      setBalance(0n);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Withdraw failed");
    } finally {
      setWithdrawing(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 pt-12 pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white">Seller Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your encrypted content listings</p>
        </div>
        <Link
          href="/upload"
          className="bg-indigo-600 text-white font-bold px-5 py-2.5 rounded-xl hover:brightness-110 active:scale-95 transition-all text-sm"
        >
          + New Asset
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl p-6 bg-white/5 border border-white/10 md:col-span-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-3">
            Pending Earnings
          </span>
          <div className="font-mono text-4xl font-black text-white mb-4">
            {formatUnits(balance, 6)}{" "}
            <span className="text-xl text-slate-400">USDC</span>
          </div>
          {balance > 0n ? (
            <button
              onClick={handleWithdraw}
              disabled={withdrawing}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-bold py-2.5 rounded-xl hover:brightness-110 disabled:opacity-50 active:scale-95 transition-all text-sm"
            >
              {withdrawing ? "Withdrawing…" : "Withdraw Funds"}
            </button>
          ) : (
            <div className="text-xs text-slate-500 font-mono">No pending balance</div>
          )}
        </div>

        <div className="rounded-xl p-6 bg-white/5 border border-white/10 flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Listings</span>
          <span className="font-mono text-4xl font-black text-white mt-3">{uploads.length}</span>
        </div>

        <div className="rounded-xl p-6 bg-white/5 border border-white/10 flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Listings</span>
          <span className="font-mono text-4xl font-black text-green-400 mt-3">
            {uploads.filter(u => u.active).length}
          </span>
        </div>
      </div>

      {/* Content list */}
      <div className="rounded-xl overflow-hidden bg-white/5 border border-white/10">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <span className="font-bold text-white">Your Assets</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{uploads.length} total</span>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : uploads.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-400 mb-4">No uploads yet.</p>
            <Link href="/upload" className="text-indigo-400 hover:underline font-semibold text-sm">
              Upload your first asset →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {uploads.map(c => (
              <Link
                key={c.id.toString()}
                href={`/content/${c.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-white/3 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${c.active ? "bg-green-400" : "bg-slate-600"}`} />
                  <div>
                    <p className="font-semibold text-white group-hover:text-indigo-300 transition-colors text-sm">
                      {c.title}
                    </p>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mt-0.5">{c.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span className="font-mono text-sm text-slate-400">{formatUnits(c.price, 6)} USDC</span>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${
                      c.active ? "bg-green-500/15 text-green-400" : "bg-white/5 text-slate-500"
                    }`}
                  >
                    {c.active ? "Active" : "Inactive"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
