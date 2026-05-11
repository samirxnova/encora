"use client";

import { useCallback } from "react";
import { usePublicClient, useWalletClient, useAccount, useChainId } from "wagmi";
import { parseUnits, toHex } from "viem";
import { Encora } from "~~/contracts/Encora";
import { deploymentFor } from "~~/utils/contract";
import { ERC20_ABI, USDC_ADDRESS, ContentInfo } from "~~/contracts/EncoraTypes";
import { generateSymKey, encryptText, exportKey, keyToUint32Chunks } from "~~/utils/crypto";

// Pure wagmi hook — no Zama SDK hooks here.
// FHE-specific hooks (useEncrypt, useAllow, useUserDecrypt) are called
// directly in the components that need them (UploadForm, AccessButton).
export function useEncora() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const chainId = useChainId();

  const deployment = deploymentFor(Encora, chainId);
  const CONTRACT_ADDRESS = (deployment?.address ?? "0x0") as `0x${string}`;
  const ABI = deployment?.abi ?? [];

  // ── READ ──────────────────────────────────────────────────────────────────

  const getContent = useCallback(async (id: bigint): Promise<ContentInfo> => {
    const data = await publicClient!.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "getContent", args: [id] });
    return data as ContentInfo;
  }, [publicClient, CONTRACT_ADDRESS, ABI]);

  const listContents = useCallback(async (offset = 0n, limit = 20n): Promise<ContentInfo[]> => {
    const data = await publicClient!.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "listContents", args: [offset, limit] });
    return data as ContentInfo[];
  }, [publicClient, CONTRACT_ADDRESS, ABI]);

  const listByCategory = useCallback(async (category: string, offset = 0n, limit = 20n): Promise<ContentInfo[]> => {
    const data = await publicClient!.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "listByCategory", args: [category, offset, limit] });
    return data as ContentInfo[];
  }, [publicClient, CONTRACT_ADDRESS, ABI]);

  const getMyUploads = useCallback(async (): Promise<bigint[]> => {
    if (!address) return [];
    return publicClient!.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "getContentsBySeller", args: [address] }) as Promise<bigint[]>;
  }, [publicClient, address, CONTRACT_ADDRESS, ABI]);

  const getMyPurchases = useCallback(async (): Promise<bigint[]> => {
    if (!address) return [];
    return publicClient!.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "getPurchasesByBuyer", args: [address] }) as Promise<bigint[]>;
  }, [publicClient, address, CONTRACT_ADDRESS, ABI]);

  const checkAccess = useCallback(async (contentId: bigint): Promise<boolean> => {
    if (!address) return false;
    return publicClient!.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "hasAccess", args: [contentId, address] }) as Promise<boolean>;
  }, [publicClient, address, CONTRACT_ADDRESS, ABI]);

  const getSellerBalance = useCallback(async (): Promise<bigint> => {
    if (!address) return 0n;
    return publicClient!.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "sellerBalance", args: [address] }) as Promise<bigint>;
  }, [publicClient, address, CONTRACT_ADDRESS, ABI]);

  const getEncryptedKeyHandles = useCallback(async (contentId: bigint): Promise<readonly `0x${string}`[]> => {
    return publicClient!.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "getEncryptedKeyHandles", args: [contentId] }) as Promise<readonly `0x${string}`[]>;
  }, [publicClient, CONTRACT_ADDRESS, ABI]);

  // ── WRITE ─────────────────────────────────────────────────────────────────

  // Called from UploadForm which also calls useEncrypt — receives pre-encrypted handles+proofs
  const uploadContent = useCallback(async (params: {
    title: string; description: string; previewText: string;
    fullContent: string; category: string; priceEth: string;
    handles: `0x${string}`[]; inputProofs: `0x${string}`[];
    encryptedContentHex: `0x${string}`;
  }) => {
    if (!walletClient || !address) throw new Error("Wallet not connected");
    return walletClient.writeContract({
      address: CONTRACT_ADDRESS, abi: ABI, functionName: "uploadContent",
      args: [
        params.title, params.description, params.previewText,
        params.encryptedContentHex,
        params.handles as unknown as readonly [`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`],
        params.inputProofs,
        params.category,
        parseUnits(params.priceEth, 6),
      ],
      gas: 15_000_000n,
    });
  }, [walletClient, address, CONTRACT_ADDRESS, ABI]);

  const purchaseContent = useCallback(async (contentId: bigint, price: bigint) => {
    if (!walletClient || !address) throw new Error("Wallet not connected");
    const allowance = await publicClient!.readContract({ address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "allowance", args: [address, CONTRACT_ADDRESS] }) as bigint;
    if (allowance < price) {
      const tx = await walletClient.writeContract({ address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "approve", args: [CONTRACT_ADDRESS, price] });
      await publicClient!.waitForTransactionReceipt({ hash: tx });
    }
    return walletClient.writeContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "purchase", args: [contentId] });
  }, [walletClient, publicClient, address, CONTRACT_ADDRESS, ABI]);

  const requestAccess = useCallback(async (contentId: bigint) => {
    if (!walletClient) throw new Error("Wallet not connected");
    const tx = await walletClient.writeContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "requestAccess", args: [contentId], gas: 15_000_000n });
    await publicClient!.waitForTransactionReceipt({ hash: tx });
  }, [walletClient, publicClient, CONTRACT_ADDRESS, ABI]);

  const withdraw = useCallback(async () => {
    if (!walletClient) throw new Error("Wallet not connected");
    return walletClient.writeContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "withdraw", args: [] });
  }, [walletClient, CONTRACT_ADDRESS, ABI]);

  return {
    CONTRACT_ADDRESS,
    getContent, listContents, listByCategory,
    getMyUploads, getMyPurchases, checkAccess, getSellerBalance, getEncryptedKeyHandles,
    uploadContent, purchaseContent, requestAccess, withdraw,
  };
}

// Separate hook for AES encryption — called only in upload flow
export async function encryptContentLocally(fullContent: string) {
  const symKey = await generateSymKey();
  const encryptedContent = await encryptText(fullContent, symKey);
  const keyBytes = await exportKey(symKey);
  const chunks = keyToUint32Chunks(keyBytes);
  return { encryptedContent, chunks };
}
