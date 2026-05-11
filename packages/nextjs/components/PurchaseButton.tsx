"use client";

import { useState } from "react";
import { formatUnits } from "viem";
import toast from "react-hot-toast";
import { useEncora } from "~~/hooks/useEncora";
import { ContentInfo } from "~~/contracts/EncoraTypes";

export function PurchaseButton({ content, onPurchased }: { content: ContentInfo; onPurchased: () => void }) {
  const { purchaseContent } = useEncora();
  const [loading, setLoading] = useState(false);

  async function handlePurchase() {
    setLoading(true);
    try {
      const hash = await purchaseContent(content.id, content.price);
      toast.success(`Purchase confirmed! ${hash.slice(0, 10)}…`);
      onPurchased();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handlePurchase}
      disabled={loading}
      className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 py-4 rounded-xl font-bold text-white uppercase tracking-widest hover:brightness-110 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Processing…
        </>
      ) : (
        `Buy for ${formatUnits(content.price, 6)} USDC`
      )}
    </button>
  );
}
