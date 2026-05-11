"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { bytesToHex } from "viem";
import { useEncrypt } from "@zama-fhe/react-sdk";
import toast from "react-hot-toast";
import { useEncora, encryptContentLocally } from "~~/hooks/useEncora";

const CATEGORIES = ["diet", "fitness", "skills", "finance", "code", "health", "other"];
const STEPS = ["Metadata", "Content", "Encrypt & Deploy"];
const ENCRYPT_STEPS = [
  { label: "Generating AES-256 key", icon: "🔑" },
  { label: "Encrypting content", icon: "🔒" },
  { label: "FHE-encrypting key chunks", icon: "⛓" },
  { label: "Submitting to chain", icon: "📡" },
];

export default function UploadPage() {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const { uploadContent, CONTRACT_ADDRESS } = useEncora();
  const encrypt = useEncrypt();
  const [step, setStep] = useState(0);
  const [encryptStep, setEncryptStep] = useState(-1);
  const [form, setForm] = useState({
    title: "",
    description: "",
    previewText: "",
    fullContent: "",
    category: "skills",
    priceEth: "5.00",
  });

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleDeploy() {
    if (!isConnected) { toast.error("Connect wallet first"); return; }
    setStep(2);
    try {
      setEncryptStep(0);
      const { encryptedContent, chunks } = await encryptContentLocally(form.fullContent);
      setEncryptStep(1);
      await new Promise(r => setTimeout(r, 300));
      setEncryptStep(2);
      const enc = await encrypt.mutateAsync({
        values: chunks.map(c => ({ value: BigInt(c), type: "euint32" as const })),
        contractAddress: CONTRACT_ADDRESS,
        userAddress: address!,
      });
      const handles = enc.handles.map(h => bytesToHex(h)) as `0x${string}`[];
      const inputProof = bytesToHex(enc.inputProof);
      const inputProofs = Array(8).fill(inputProof) as `0x${string}`[];
      setEncryptStep(3);
      await uploadContent({
        ...form,
        handles,
        inputProofs,
        encryptedContentHex: `0x${Buffer.from(encryptedContent).toString("hex")}` as `0x${string}`,
      });
      toast.success("Content deployed!");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
      setStep(1); setEncryptStep(-1);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 pt-12 pb-20">
      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-10">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  i < step
                    ? "bg-green-500 text-white"
                    : i === step
                      ? "bg-indigo-600 text-white"
                      : "bg-white/10 text-slate-400"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap ${
                  i === step ? "text-indigo-400" : "text-slate-500"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-3 mb-5 ${i < step ? "bg-green-500/50" : "bg-white/10"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Metadata */}
      {step === 0 && (
        <div className="rounded-xl p-8 space-y-5 bg-white/5 border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-2">Asset Details</h2>
          <Field label="Title">
            <input
              className="w-full bg-[#0d0d15] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500 placeholder:text-slate-500"
              value={form.title}
              onChange={set("title")}
              placeholder="e.g. 30-Day Keto Protocol"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <select
                className="w-full bg-[#0d0d15] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500"
                value={form.category}
                onChange={set("category")}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Price (USDC)">
              <input
                className="w-full bg-[#0d0d15] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500"
                type="number"
                step="0.001"
                min="0"
                value={form.priceEth}
                onChange={set("priceEth")}
              />
            </Field>
          </div>
          <Field label="Short Description (public)">
            <input
              className="w-full bg-[#0d0d15] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500 placeholder:text-slate-500"
              value={form.description}
              onChange={set("description")}
              placeholder="One-line summary shown in marketplace"
            />
          </Field>
          <button
            onClick={() => {
              if (!form.title || !form.description) {
                toast.error("Fill all fields");
                return;
              }
              setStep(1);
            }}
            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:brightness-110 active:scale-95 transition-all mt-2"
          >
            Continue →
          </button>
        </div>
      )}

      {/* Step 1: Content */}
      {step === 1 && (
        <div className="rounded-xl p-8 space-y-5 bg-white/5 border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-2">Write Content</h2>
          <Field label="Preview Text (used by AI to answer buyer questions)">
            <textarea
              className="w-full bg-[#0d0d15] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500 placeholder:text-slate-500 h-28 resize-none"
              value={form.previewText}
              onChange={set("previewText")}
              placeholder="Write a teaser that gives buyers a taste. Powers the AI chat."
            />
          </Field>
          <Field label="Full Content (markdown — will be FHE-encrypted)">
            <textarea
              className="w-full bg-[#0d0d15] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500 placeholder:text-slate-500 h-64 resize-none font-mono"
              value={form.fullContent}
              onChange={set("fullContent")}
              placeholder={"# Your full content here\n\nOnly buyers who pay will ever see this..."}
            />
          </Field>
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => setStep(0)}
              className="flex-1 border border-white/20 text-white font-semibold py-3 rounded-xl hover:bg-white/5 transition-all"
            >
              ← Back
            </button>
            <button
              onClick={() => {
                if (!form.previewText || !form.fullContent) {
                  toast.error("Fill all fields");
                  return;
                }
                handleDeploy();
              }}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-bold py-3 rounded-xl hover:brightness-110 active:scale-95 transition-all"
            >
              Encrypt & Deploy
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Encrypting progress */}
      {step === 2 && (
        <div className="rounded-xl p-8 space-y-8 bg-white/5 border border-white/10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white">Securing Your Content</h2>
            <p className="text-slate-400 text-sm">Do not close this window</p>
          </div>
          <div className="space-y-3">
            {ENCRYPT_STEPS.map((s, i) => (
              <div
                key={i}
                className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                  i < encryptStep
                    ? "bg-green-500/10 border border-green-500/20"
                    : i === encryptStep
                      ? "bg-indigo-500/10 border border-indigo-500/30"
                      : "bg-white/5 border border-transparent"
                }`}
              >
                <span className="text-xl">{s.icon}</span>
                <span
                  className={`text-sm font-semibold ${
                    i < encryptStep ? "text-green-400" : i === encryptStep ? "text-indigo-300" : "text-slate-500"
                  }`}
                >
                  {s.label}
                </span>
                {i < encryptStep && <span className="ml-auto text-green-400 text-sm">✓</span>}
                {i === encryptStep && (
                  <div className="ml-auto w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</label>
      {children}
    </div>
  );
}
