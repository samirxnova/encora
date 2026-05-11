import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import scaffoldConfig from "~~/scaffold.config";

export const wagmiConnectors = () => {
  if (typeof window === "undefined") return [];
  return connectorsForWallets(
    [{ groupName: "Supported Wallets", wallets: [metaMaskWallet, walletConnectWallet, coinbaseWallet, rainbowWallet] }],
    { appName: "Encora", projectId: scaffoldConfig.walletConnectProjectId },
  );
};
