"use client";

import { useEffect, useState } from "react";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ZamaProvider } from "@zama-fhe/react-sdk";
import { IndexedDBStorage, RelayerWeb, SepoliaConfig, type ZamaSDKEvent } from "@zama-fhe/sdk";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { useTheme } from "next-themes";
import { Toaster } from "react-hot-toast";
import { WagmiProvider } from "wagmi";
import { Navbar } from "~~/components/Navbar";
import { BlockieAvatar } from "~~/components/helper";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";
import { WagmiSigner } from "~~/services/web3/wagmiSigner";

// Created once — never recreated, never cause re-renders or modal closes
const signer = new WagmiSigner({ config: wagmiConfig });
const storage = new IndexedDBStorage("KeypairStore", 1);
const sessionStorage = new IndexedDBStorage("SignatureStore", 1);
const relayer = new RelayerWeb({
  getChainId: () => signer.getChainId(),
  transports: { [SepoliaConfig.chainId]: SepoliaConfig },
});

function onZamaEvent(event: ZamaSDKEvent) {
  window.dispatchEvent(new CustomEvent(event.type, { detail: event }));
}

export const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

export const DappWrapperWithProviders = ({ children }: { children: React.ReactNode }) => {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          avatar={BlockieAvatar}
          theme={mounted ? (isDarkMode ? darkTheme() : lightTheme()) : lightTheme()}
        >
          <ZamaProvider
            relayer={relayer}
            signer={signer}
            storage={storage}
            sessionStorage={sessionStorage}
            onEvent={onZamaEvent}
          >
            <ProgressBar height="3px" color="#2299dd" />
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="pt-16">{children}</main>
            </div>
            <Toaster />
          </ZamaProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
