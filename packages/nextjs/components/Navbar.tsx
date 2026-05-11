"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const NAV = [
  { href: "/", label: "Marketplace" },
  { href: "/upload", label: "Sell" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/purchases", label: "Purchases" },
];

export function Navbar() {
  const path = usePathname();

  return (
    <header className="fixed top-0 w-full z-50 flex items-center justify-between px-6 h-16 bg-[#16161e]/80 backdrop-blur-md border-b border-white/10" style={{ isolation: "auto" }}>
      <div className="flex items-center gap-8">
        <Link href="/" className="text-xl font-black tracking-tighter text-white uppercase">
          Encora
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          {NAV.map(({ href, label }) => {
            const active = path === href || (href !== "/" && path.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`text-sm font-semibold tracking-tight transition-colors ${
                  active ? "text-white border-b-2 border-indigo-400 pb-1" : "text-slate-400 hover:text-white"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
      <ConnectButton.Custom>
        {({ account, chain, openConnectModal, openAccountModal, openChainModal, mounted }) => {
          if (!mounted) return <div style={{ visibility: "hidden" }}>Connect</div>;
          const connected = account && chain;
          if (!connected) return (
            <button type="button" onClick={openConnectModal}
              className="text-sm font-bold text-white bg-indigo-600 px-4 py-2 rounded-xl hover:brightness-110 transition-all cursor-pointer">
              Connect Wallet
            </button>
          );
          if (chain.unsupported) return (
            <button type="button" onClick={openChainModal}
              className="text-sm font-bold text-white bg-red-600 px-4 py-2 rounded-xl hover:brightness-110 transition-all cursor-pointer">
              Wrong Network
            </button>
          );
          return (
            <button type="button" onClick={openAccountModal}
              className="text-sm font-semibold text-white bg-white/10 border border-white/20 px-4 py-2 rounded-xl hover:bg-white/15 transition-all cursor-pointer">
              {account.displayName}
            </button>
          );
        }}
      </ConnectButton.Custom>
    </header>
  );
}
