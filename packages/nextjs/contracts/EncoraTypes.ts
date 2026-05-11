// Shared types and constants for Encora — not auto-generated

export const USDC_ADDRESS = (
  process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
) as `0x${string}`;

export interface ContentInfo {
  id: bigint;
  seller: `0x${string}`;
  title: string;
  description: string;
  previewText: string;
  encryptedContent: `0x${string}`;
  price: bigint;
  active: boolean;
  createdAt: bigint;
  category: string;
}

export const ERC20_ABI = [
  {
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
