# Testing Guide — Encora (Zama fhEVM)

## 1. Smart Contract Tests (Foundry)

### Setup

```bash
cd packages/foundry
forge soldeer install
```

### Run All Tests

```bash
forge test -vvv
```

### Expected Output

```
Ran 17 tests for test/Encora.t.sol:EncoraTest
[PASS] test_deactivate_removesFromListing()
[PASS] test_deactivate_revertsIfNotSeller()
[PASS] test_hasAccess_returnsTrueAfterPurchase()
[PASS] test_listByCategory_filtersCorrectly()
[PASS] test_listContents_returnsActiveContent()
[PASS] test_purchase_revertsIfNotActive()
[PASS] test_purchase_setsHasPaid()
[PASS] test_purchase_tracksByBuyer()
[PASS] test_purchase_transfersUSDC()
[PASS] test_requestAccess_grantsAccessAndAllowsDecrypt()
[PASS] test_requestAccess_revertsIfNotPurchased()
[PASS] test_uploadContent_incrementsCount()
[PASS] test_uploadContent_storesEncryptedKeyHandles()
[PASS] test_uploadContent_storesMetadata()
[PASS] test_uploadContent_tracksBySeller()
[PASS] test_withdraw_revertsIfNoBalance()
[PASS] test_withdraw_transfersBalance()
Suite result: ok. 17 passed; 0 failed; 0 skipped
```

### Test Coverage

| Area | Tests | What's Verified |
|------|-------|-----------------|
| Upload | 4 | Content count increments, metadata stored, FHE key handles non-zero, seller tracking |
| Purchase | 4 | hasPaid set, USDC transferred, buyer tracking, revert if inactive |
| Access | 2 | Revert if not purchased, FHE.allow grants decrypt access (verified via `userDecrypt`) |
| Withdraw | 2 | USDC transferred to seller, revert if zero balance |
| Listing | 2 | Active content returned, category filter works |
| Deactivate | 2 | Removed from listing, revert if not seller |
| Access Control | 1 | `hasAccess` returns true after purchase |

### Key Test: FHE Decrypt Verification

`test_requestAccess_grantsAccessAndAllowsDecrypt` is the most important test — it verifies the full FHE flow:

1. Seller encrypts 8 uint32 key chunks via `encryptUint32()`
2. Seller uploads content with encrypted handles + proofs
3. Buyer purchases content
4. Buyer calls `requestAccess()`
5. Test calls `signUserDecrypt()` + `userDecrypt()` to verify each chunk decrypts to the original clear value

---

## 2. End-to-End Testing (Browser)

### Prerequisites

- MetaMask installed, connected to **Sepolia**
- Sepolia ETH (gas): [sepoliafaucet.com](https://sepoliafaucet.com)
- Sepolia USDC: [faucet.circle.com](https://faucet.circle.com) → select Ethereum Sepolia
- Two browser profiles (Seller + Buyer) or two MetaMask accounts

### Test Flow A: Upload Content (Seller)

1. Open `http://localhost:3000/upload`
2. Connect wallet (Sepolia)
3. Fill form:
   - Title: "Test Content"
   - Category: Skills
   - Price: 1.00 USDC
   - Description: "A test listing"
   - Preview Text: "This content covers testing strategies"
   - Full Content: "# Secret\n\nThis is the encrypted content."
4. Click **Encrypt & Deploy**
5. Approve MetaMask transaction (high gas — ~15M for FHE operations)
6. Wait for confirmation → redirected to Dashboard

**Verify:**
- Dashboard shows "Test Content" as active listing
- Marketplace page shows the content card

### Test Flow B: Purchase & Unlock (Buyer)

1. Switch to buyer account in MetaMask
2. Ensure buyer has ≥1 USDC on Sepolia
3. Navigate to the content page (`/content/0`)
4. Verify AI chat works (type a question about the content)
5. Click **Buy for 1.00 USDC**
   - Tx 1: Approve USDC (MetaMask popup)
   - Tx 2: Purchase (MetaMask popup)
6. Click **Unlock Content**
   - Tx 3: requestAccess (MetaMask popup)
   - Zama SDK generates keypair (may prompt EIP-712 signature)
   - Decryption happens automatically
7. Full markdown content should appear in the green "Decrypted" panel

**Verify:**
- Content matches what seller uploaded
- Purchases page shows the item

### Test Flow C: Withdraw (Seller)

1. Switch back to seller account
2. Navigate to Dashboard
3. Verify "Pending Earnings" shows 1.00 USDC
4. Click **Withdraw Funds**
5. Approve MetaMask transaction
6. Balance should reset to 0

### Test Flow D: AI Chat (No Wallet)

1. Open content page in incognito (no wallet connected)
2. Type a question in the chat widget
3. AI should respond based on the preview text only
4. Verify it doesn't reveal encrypted content details

---

## 3. Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| "Wrong Network" button | MetaMask not on Sepolia | Click button → switch to Sepolia |
| "User address is not a valid address" | Wallet not connected during upload | Connect wallet before clicking Encrypt & Deploy |
| Transaction fails with high gas | FHE operations are gas-intensive | Ensure ≥0.01 Sepolia ETH for gas |
| "Content not found" | Content ID doesn't exist | Check `contentCount` on contract |
| AI chat returns 500 | `OPENROUTER_API_KEY` not set | Add key to `.env.local` |
| Decrypt fails | Zama SDK keypair expired | Refresh page, try again |
| "threads not supported" warning | Missing COOP/COEP headers | Warning only — SDK falls back to single-threaded mode |

---

## 4. Contract Interaction (Manual via Cast)

```bash
# Check content count
cast call 0x046E8D5aC53fFf77d992422fa0c45F9b6F0F9aEd "contentCount()" --rpc-url $SEPOLIA_RPC_URL

# Check if buyer has access
cast call 0x046E8D5aC53fFf77d992422fa0c45F9b6F0F9aEd "hasAccess(uint256,address)(bool)" 0 0xBUYER_ADDRESS --rpc-url $SEPOLIA_RPC_URL

# Check seller balance
cast call 0x046E8D5aC53fFf77d992422fa0c45F9b6F0F9aEd "sellerBalance(address)(uint256)" 0xSELLER_ADDRESS --rpc-url $SEPOLIA_RPC_URL
```
