import * as chains from "viem/chains";

export type BaseConfig = {
  targetNetworks: readonly chains.Chain[];
  pollingInterval: number;
  alchemyApiKey: string;
  rpcOverrides?: Record<number, string>;
  walletConnectProjectId: string;
  onlyLocalBurnerWallet: boolean;
};

export type ScaffoldConfig = BaseConfig;

const rawAlchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
if (!rawAlchemyKey) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Environment variable NEXT_PUBLIC_ALCHEMY_API_KEY is required in production.");
  } else {
    // eslint-disable-next-line no-console
    console.warn("NEXT_PUBLIC_ALCHEMY_API_KEY is not set. Falling back to public RPCs.");
  }
}

const scaffoldConfig = {
  targetNetworks: [chains.sepolia],
  pollingInterval: 30000,
  alchemyApiKey: rawAlchemyKey || "",
  rpcOverrides: {},
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "3a8170812b534d0ff9d794f19a901d64",
  onlyLocalBurnerWallet: false,
} as const satisfies ScaffoldConfig;

export default scaffoldConfig;
