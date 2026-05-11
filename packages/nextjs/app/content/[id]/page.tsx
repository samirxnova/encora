"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEncora } from "~~/hooks/useEncora";
import { ContentInfo } from "~~/contracts/EncoraTypes";
import { PurchaseButton } from "~~/components/PurchaseButton";
import { AccessButton } from "~~/components/AccessButton";
import { ContentViewer } from "~~/components/ContentViewer";
import { PreviewChat } from "~~/components/PreviewChat";

export default function ContentPage() {
  const { id } = useParams<{ id: string }>();
  const { getContent, checkAccess } = useEncora();
  const { isConnected } = useAccount();
  const [content, setContent] = useState<ContentInfo | null>(null);
  const [hasPaid, setHasPaid] = useState(false);
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const contentId = BigInt(id);
    getContent(contentId)
      .then(setContent)
      .finally(() => setLoading(false));
    if (isConnected) checkAccess(contentId).then(setHasPaid);
  }, [id, isConnected, getContent, checkAccess]);

  if (loading)
    return (
      <div className="max-w-7xl mx-auto px-6 pt-12 grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl bg-white/5 h-32 animate-pulse" />
          ))}
        </div>
        <div className="lg:col-span-4">
          <div className="rounded-xl bg-white/5 h-64 animate-pulse" />
        </div>
      </div>
    );

  if (!content)
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">Content not found.</div>
    );

  return (
    <div className="max-w-7xl mx-auto px-6 pt-12 pb-20 grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left column */}
      <div className="lg:col-span-8 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-300">
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
              FHE Verified
            </span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white leading-tight">{content.title}</h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-3xl">{content.description}</p>
        </div>

        <PreviewChat contentId={content.id} previewText={content.previewText} />

        {decryptedText && <ContentViewer markdown={decryptedText} />}
      </div>

      {/* Right column — sticky pricing card */}
      <div className="lg:col-span-4">
        <div className="sticky top-24 space-y-4">
          <div className="rounded-xl p-6 space-y-5 bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-all">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                Access Price
              </span>
              <div className="font-mono text-3xl font-black text-white">
                {formatUnits(content.price, 6)} USDC
              </div>
            </div>

            {!isConnected ? (
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <button
                    onClick={openConnectModal}
                    className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 py-4 rounded-xl font-bold text-white uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all"
                  >
                    Connect Wallet
                  </button>
                )}
              </ConnectButton.Custom>
            ) : !hasPaid ? (
              <PurchaseButton content={content} onPurchased={() => setHasPaid(true)} />
            ) : !decryptedText ? (
              <AccessButton content={content} onDecrypted={setDecryptedText} />
            ) : (
              <div className="w-full py-4 rounded-xl bg-green-500/10 border border-green-500/30 text-center text-green-400 font-bold text-sm uppercase tracking-widest">
                ✓ Content Unlocked
              </div>
            )}

            <div className="flex items-center justify-between text-sm text-slate-500 border-t border-white/5 pt-4">
              <span>Platform Fee</span>
              <span>2.5%</span>
            </div>
          </div>

          <div className="bg-indigo-500/10 border border-indigo-500/20 p-5 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-indigo-300">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-xs font-semibold uppercase tracking-wider">FHE Protected</span>
            </div>
            <p className="text-indigo-200/70 text-xs leading-relaxed">
              Secured via Zama fhEVM. Your decryption key is granted on-chain upon purchase — even the marketplace
              cannot access the content without your authorization.
            </p>
          </div>

          <div className="rounded-xl p-5 space-y-3 bg-white/5 border border-white/10">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Seller</span>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-sm">
                {content.seller.slice(2, 4).toUpperCase()}
              </div>
              <span className="font-mono text-sm text-slate-400">
                {content.seller.slice(0, 6)}…{content.seller.slice(-4)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
