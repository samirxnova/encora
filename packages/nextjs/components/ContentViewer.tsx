"use client";

import ReactMarkdown from "react-markdown";

export function ContentViewer({ markdown }: { markdown: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-green-500/20 bg-[#16161e]/80">
      <div className="flex items-center gap-2 px-6 py-3 bg-green-500/10 border-b border-green-500/20">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs font-semibold uppercase tracking-wider text-green-400">
          Decrypted — visible only to you
        </span>
      </div>
      <div className="p-6 prose prose-invert prose-sm max-w-none
        prose-headings:font-bold prose-headings:text-white
        prose-p:text-slate-300 prose-p:leading-relaxed
        prose-code:text-indigo-300 prose-code:bg-slate-800 prose-code:px-1 prose-code:rounded
        prose-pre:bg-slate-800 prose-pre:border prose-pre:border-slate-700
        prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
        prose-strong:text-white prose-li:text-slate-300">
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </div>
    </div>
  );
}
