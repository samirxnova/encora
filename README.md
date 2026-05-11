# Encora — Privacy-Preserving Knowledge Marketplace

**Buy and sell knowledge, privately.** Powered by [Zama fhEVM](https://docs.zama.org) on Ethereum Sepolia.

Sellers upload text/markdown content protected by two-layer encryption. Buyers pay in USDC and decrypt content entirely client-side. Not even the marketplace can read it.

---

## Live Deployment

| Item | Value |
|------|-------|
| Encora Contract | `0x046E8D5aC53fFf77d992422fa0c45F9b6F0F9aEd` |
| USDC (Sepolia) | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` |
| Network | Ethereum Sepolia (Chain ID: 11155111) |

---

## How It Works

```
Seller                    Encora Contract (Sepolia)            Buyer
  │                                │                              │
  │── uploadContent(               │                              │
  │     previewText,               │                              │
  │     AES(fullText),             │                              │
  │     FHE(aesKey)) ─────────────►│                              │
  │                                │  previewText → AI chat ─────►│
  │                                │◄─ purchase (USDC) ───────────│
  │                                │◄─ requestAccess() ───────────│
  │                                │  FHE.allow(keyChunks, buyer) │
  │                                │  buyer decrypts via SDK ────►│
  │                                │  AES key → decrypt content   │
```

### Two-Layer Encryption

**Layer 1 — AES-GCM (browser, off-chain):**
Seller encrypts full text with a random 256-bit AES key in the browser. The ciphertext is stored on-chain as public bytes — unreadable without the key.

**Layer 2 — FHE (on-chain, Zama fhEVM):**
The AES key is split into 8 × `euint32` chunks and stored as FHE ciphertext via `FHE.fromExternal()`. When a buyer pays and calls `requestAccess()`, the contract calls `FHE.allow(chunk, buyer)` for each chunk. The buyer decrypts them client-side via `@zama-fhe/react-sdk`'s `useUserDecrypt`, reassembles the AES key, and decrypts the content locally.

---

## How We Use Zama fhEVM

| Zama Component | Usage in Encora |
|---|---|
| `@fhevm/solidity` 0.11.1 | Smart contract — `FHE.fromExternal()`, `FHE.allow()`, `FHE.allowThis()`, `euint32`, `externalEuint32` |
| `ZamaEthereumConfig` | Base contract config — wires up the fhEVM gateway on Sepolia |
| `@zama-fhe/sdk` 3.0.0 | `RelayerWeb` + `SepoliaConfig` for FHE relayer transport, `IndexedDBStorage` for keypair persistence |
| `@zama-fhe/react-sdk` 3.0.0 | `ZamaProvider`, `useEncrypt` (batch encrypt 8 key chunks), `useAllow` (authorize decryption), `useIsAllowed`, `useUserDecrypt` (client-side decryption) |
| `forge-fhevm` | Foundry test helpers — `encryptUint32()`, `signUserDecrypt()`, `userDecrypt()` for unit testing FHE operations |

### FHE Flow Detail

1. **Upload**: Seller's browser generates AES key → splits into 8 uint32 → `useEncrypt` batch-encrypts all 8 → contract stores as `euint32[8]` via `FHE.fromExternal(handle, proof)`
2. **Purchase**: Buyer pays USDC → `hasPaid[contentId][buyer] = true`
3. **Access**: Buyer calls `requestAccess()` → contract calls `FHE.allow(chunk, buyer)` for all 8 chunks
4. **Decrypt**: Buyer's browser calls `useAllow` (generates keypair + EIP-712 sig) → `useUserDecrypt` fetches plaintext uint32 values → reassembles 32-byte AES key → decrypts content with Web Crypto API

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Solidity 0.8.27, Zama fhEVM (`@fhevm/solidity`), OpenZeppelin |
| Contract Toolchain | Foundry, forge-fhevm, Soldeer |
| FHE Client | `@zama-fhe/sdk` 3.0.0, `@zama-fhe/react-sdk` 3.0.0 |
| Frontend | Next.js 15, Tailwind CSS 4, wagmi v2, RainbowKit |
| Payment | USDC ERC-20 (Sepolia) |
| AI Chat | OpenRouter (`gpt-4o-mini`) |
| Network | Ethereum Sepolia (testnet) |

---

## Project Structure

```
encora-zama/
├── packages/
│   ├── foundry/                    # Smart contract
│   │   ├── src/Encora.sol          # Main contract (Zama fhEVM)
│   │   ├── test/Encora.t.sol       # 17 Foundry tests
│   │   ├── script/DeployEncora.s.sol
│   │   └── foundry.toml
│   └── nextjs/                     # Frontend
│       ├── app/
│       │   ├── page.tsx            # Marketplace
│       │   ├── upload/page.tsx     # Seller upload (3-step wizard)
│       │   ├── content/[id]/page.tsx # Content detail + AI chat + unlock
│       │   ├── dashboard/page.tsx  # Seller dashboard + withdraw
│       │   ├── purchases/page.tsx  # Buyer purchases
│       │   └── api/chat/route.ts   # OpenRouter AI proxy (edge)
│       ├── components/
│       │   ├── Navbar.tsx
│       │   ├── PreviewChat.tsx     # AI chat widget
│       │   ├── PurchaseButton.tsx
│       │   ├── AccessButton.tsx    # FHE decrypt flow
│       │   └── ContentViewer.tsx   # Markdown renderer
│       ├── hooks/
│       │   ├── useEncora.ts        # Contract interactions (wagmi)
│       │   └── usePreviewChat.ts   # AI chat streaming
│       ├── contracts/
│       │   ├── Encora.ts           # Auto-generated ABI + address
│       │   └── EncoraTypes.ts      # ContentInfo, ERC20_ABI, USDC_ADDRESS
│       └── utils/
│           └── crypto.ts           # AES-GCM encrypt/decrypt
├── .env.example
├── plan.md
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18+, pnpm
- Foundry (`forge`, `cast`)
- MetaMask on Sepolia network
- Sepolia ETH ([sepoliafaucet.com](https://sepoliafaucet.com))
- Sepolia USDC ([faucet.circle.com](https://faucet.circle.com))

### Install

```bash
cd encora
pnpm install
cd packages/foundry && forge soldeer install
```

### Run Contract Tests

```bash
cd packages/foundry
forge test -vvv
```

All 17 tests should pass.

### Run Frontend

```bash
# 1. Configure environment
cp .env.example .env.local
# Fill in your keys (see .env.example for details)

# 2. Install dependencies
cd packages/nextjs

pnpm install

# 3. Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

### Deploy Contract (already deployed)

```bash
cd packages/foundry
source .env
forge script script/DeployEncora.s.sol:DeployEncora \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast --verify
```

---

## User Flows

### Seller: Upload Content
1. Connect wallet (Sepolia) → navigate to **Sell**
2. Fill metadata (title, category, price in USDC, description)
3. Write preview text (used by AI — never shown publicly)
4. Write full content in markdown
5. Click **Encrypt & Deploy** → browser AES-encrypts content → Zama SDK FHE-encrypts AES key → submits to contract

### Buyer: Purchase & Unlock
1. Browse marketplace → click content
2. Chat with AI about the content (no wallet needed)
3. Connect wallet → click **Buy for X USDC**
   - Tx 1: Approve USDC spend
   - Tx 2: Purchase
4. Click **Unlock Content**
   - Tx 3: `requestAccess` (grants FHE access to key chunks)
   - Zama SDK generates keypair + EIP-712 signature
   - `useUserDecrypt` fetches plaintext key chunks
   - AES key reassembled → content decrypted in browser
   - Full markdown content displayed

### Seller: Withdraw
1. Navigate to **Dashboard**
2. Click **Withdraw Funds** → USDC transferred to wallet

---

## Security Model

- **Full content** is never sent to any server in plaintext
- **AES key** is stored as FHE ciphertext — unreadable from chain state
- **`FHE.allowThis`** on all key chunks — contract retains access to grant future buyers
- **No public decryption** — key chunks can never be publicly decrypted
- **OpenRouter API key** is server-side only — never exposed to the browser
- **AI context** is limited to `previewText` — encrypted content is never sent to OpenRouter

---

## Environment Variables

### `.env` (packages/foundry)
```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<key>
DEPLOYER_PRIVATE_KEY=<hex without 0x>
ETHERSCAN_API_KEY=<optional>
```

### `.env.local` (packages/nextjs)
```env
NEXT_PUBLIC_ALCHEMY_API_KEY=<key>
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=<id>
NEXT_PUBLIC_CONTRACT_ADDRESS=0x046E8D5aC53fFf77d992422fa0c45F9b6F0F9aEd
NEXT_PUBLIC_USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
NEXT_PUBLIC_APP_URL=http://localhost:3000
OPENROUTER_API_KEY=sk-or-...
```

---

## Future Features Checklist

| Feature | Difficulty | Time | Priority | Status |
|---------|-----------|------|----------|--------|
| Platform fee (2.5% cut) | Easy | 1h | P0 | ⬜ |
| IPFS/Arweave content storage | Medium | 4h | P0 | ⬜ |
| Multi-format (PDF, images, video) | Easy | 3h | P1 | ⬜ |
| Accept multiple tokens (ETH, DAI) | Easy | 2h | P1 | ⬜ |
| Ratings & reviews | Medium | 6h | P1 | ⬜ |
| Search (off-chain indexer) | Hard | 12h | P1 | ⬜ |
| Seller profiles + reputation | Medium | 5h | P1 | ⬜ |
| Tiered pricing / bundles | Medium | 4h | P2 | ⬜ |
| Referral system | Medium | 6h | P2 | ⬜ |
| Content versioning | Medium | 5h | P2 | ⬜ |
| Confidential purchase amounts (FHE) | Hard | 8h | P2 | ⬜ |
| Encrypted seller analytics (FHE) | Medium | 5h | P2 | ⬜ |
| Content NFTs (ownership proof) | Medium | 5h | P2 | ⬜ |
| Favorites/wishlist | Easy | 2h | P2 | ⬜ |
| Dispute resolution | Hard | 10h | P2 | ⬜ |
| Anonymous buying (stealth addresses) | Very Hard | 16h | P3 | ⬜ |
| Revenue streaming (Superfluid) | Hard | 10h | P3 | ⬜ |
| Email notifications (Push Protocol) | Medium | 4h | P3 | ⬜ |
| DAO content moderation | Very Hard | 20h | P3 | ⬜ |
| Seller staking | Hard | 8h | P3 | ⬜ |

---

## License

MIT
