// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ReentrancyGuard} from "@openzeppelin-contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin-contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";

/// @title Encora
/// @notice Privacy-preserving content marketplace on Zama fhEVM (Sepolia).
/// Layer 1: AES-GCM off-chain encryption of full text.
/// Layer 2: FHE-encrypted AES key stored as 8 x euint32 chunks on-chain.
/// Buyers pay USDC, call requestAccess, then decrypt key chunks client-side.
contract Encora is ZamaEthereumConfig, ReentrancyGuard {
    using SafeERC20 for IERC20;
    // ─────────────────────────────────────────────
    // TYPES
    // ─────────────────────────────────────────────

    struct Content {
        uint256 id;
        address seller;
        string title;
        string description;
        string previewText;
        bytes encryptedContent; // AES-GCM ciphertext: iv (12 bytes) ++ ciphertext
        euint32[8] encryptedSymKey; // FHE-encrypted AES key: 8 × euint32 chunks
        uint256 price; // Price in USDC units (6 decimals)
        bool active;
        uint256 createdAt;
        string category;
    }

    struct ContentInfo {
        uint256 id;
        address seller;
        string title;
        string description;
        string previewText;
        bytes encryptedContent;
        uint256 price;
        bool active;
        uint256 createdAt;
        string category;
    }

    // ─────────────────────────────────────────────
    // STATE
    // ─────────────────────────────────────────────

    IERC20 public immutable USDC;
    uint256 public contentCount;

    mapping(uint256 => Content) internal contents;
    mapping(uint256 => mapping(address => bool)) public hasPaid;
    mapping(address => uint256[]) public contentsBySeller;
    mapping(address => uint256[]) public purchasesByBuyer;
    mapping(address => uint256) public sellerBalance;

    // ─────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────

    event ContentUploaded(uint256 indexed id, address indexed seller, string title, string category);
    event ContentPurchased(uint256 indexed id, address indexed buyer);
    event AccessGranted(uint256 indexed id, address indexed buyer);
    event ContentDeactivated(uint256 indexed id);

    // ─────────────────────────────────────────────
    // ERRORS
    // ─────────────────────────────────────────────

    error ContentNotFound();
    error ContentNotActive();
    error NotPurchased();
    error NotSeller();
    error WithdrawFailed();

    constructor(address usdc) {
        USDC = IERC20(usdc);
    }

    // ─────────────────────────────────────────────
    // UPLOAD
    // ─────────────────────────────────────────────

    /// @notice Upload content with FHE-protected AES key.
    /// @param encSymKeyChunks 8 externalEuint32 handles (32-byte AES key split into 8 × uint32)
    /// @param inputProofs     One proof per handle. When using Zama SDK batch encrypt, pass the
    ///                        same shared proof for all 8 entries.
    function uploadContent(
        string calldata title,
        string calldata description,
        string calldata previewText,
        bytes calldata encryptedContent,
        externalEuint32[8] calldata encSymKeyChunks,
        bytes[] calldata inputProofs,
        string calldata category,
        uint256 price
    ) external returns (uint256 id) {
        require(inputProofs.length == 8, "Need 8 proofs");
        id = contentCount++;
        Content storage c = contents[id];
        c.id = id;
        c.seller = msg.sender;
        c.title = title;
        c.description = description;
        c.previewText = previewText;
        c.encryptedContent = encryptedContent;
        c.price = price;
        c.active = true;
        c.createdAt = block.timestamp;
        c.category = category;

        for (uint256 i = 0; i < 8; i++) {
            euint32 chunk = FHE.fromExternal(encSymKeyChunks[i], inputProofs[i]);
            c.encryptedSymKey[i] = chunk;
            FHE.allowThis(chunk);
        }

        contentsBySeller[msg.sender].push(id);
        emit ContentUploaded(id, msg.sender, title, category);
    }

    // ─────────────────────────────────────────────
    // PURCHASE
    // ─────────────────────────────────────────────

    /// @notice Pay for content — buyer must approve this contract for `price` USDC first.
    function purchase(uint256 contentId) external {
        if (contentId >= contentCount) revert ContentNotFound();
        Content storage c = contents[contentId];
        if (!c.active) revert ContentNotActive();

        USDC.safeTransferFrom(msg.sender, address(this), c.price);

        hasPaid[contentId][msg.sender] = true;
        sellerBalance[c.seller] += c.price;
        purchasesByBuyer[msg.sender].push(contentId);

        emit ContentPurchased(contentId, msg.sender);
    }

    // ─────────────────────────────────────────────
    // REQUEST ACCESS
    // ─────────────────────────────────────────────

    /// @notice Grant buyer FHE access to the 8 AES key chunks.
    ///         Buyer decrypts client-side via useUserDecrypt from the Zama react SDK.
    function requestAccess(uint256 contentId) external {
        if (contentId >= contentCount) revert ContentNotFound();
        if (!hasPaid[contentId][msg.sender]) revert NotPurchased();

        Content storage c = contents[contentId];
        for (uint256 i = 0; i < 8; i++) {
            FHE.allow(c.encryptedSymKey[i], msg.sender);
        }

        emit AccessGranted(contentId, msg.sender);
    }

    // ─────────────────────────────────────────────
    // SELLER ACTIONS
    // ─────────────────────────────────────────────

    function withdraw() external nonReentrant {
        uint256 amount = sellerBalance[msg.sender];
        if (amount == 0) revert WithdrawFailed();
        sellerBalance[msg.sender] = 0;
        USDC.safeTransfer(msg.sender, amount);
    }

    function deactivate(uint256 contentId) external {
        if (contentId >= contentCount) revert ContentNotFound();
        if (contents[contentId].seller != msg.sender) revert NotSeller();
        contents[contentId].active = false;
        emit ContentDeactivated(contentId);
    }

    // ─────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────

    function getContent(uint256 id) external view returns (ContentInfo memory) {
        if (id >= contentCount) revert ContentNotFound();
        return _toInfo(contents[id]);
    }

    function getEncryptedKeyHandles(uint256 contentId) external view returns (euint32[8] memory) {
        if (contentId >= contentCount) revert ContentNotFound();
        return contents[contentId].encryptedSymKey;
    }

    function listContents(uint256 offset, uint256 limit) external view returns (ContentInfo[] memory) {
        return _paginate(offset, limit, "");
    }

    function listByCategory(string calldata category, uint256 offset, uint256 limit)
        external
        view
        returns (ContentInfo[] memory)
    {
        return _paginate(offset, limit, category);
    }

    function getContentsBySeller(address seller) external view returns (uint256[] memory) {
        return contentsBySeller[seller];
    }

    function getPurchasesByBuyer(address buyer) external view returns (uint256[] memory) {
        return purchasesByBuyer[buyer];
    }

    function hasAccess(uint256 contentId, address buyer) external view returns (bool) {
        return hasPaid[contentId][buyer];
    }

    // ─────────────────────────────────────────────
    // INTERNAL
    // ─────────────────────────────────────────────

    function _toInfo(Content storage c) internal view returns (ContentInfo memory) {
        return ContentInfo({
            id: c.id,
            seller: c.seller,
            title: c.title,
            description: c.description,
            previewText: c.previewText,
            encryptedContent: c.encryptedContent,
            price: c.price,
            active: c.active,
            createdAt: c.createdAt,
            category: c.category
        });
    }

    function _paginate(uint256 offset, uint256 limit, string memory category)
        internal
        view
        returns (ContentInfo[] memory)
    {
        bool filterCategory = bytes(category).length > 0;

        uint256 total = 0;
        for (uint256 i = 0; i < contentCount; i++) {
            if (!contents[i].active) continue;
            if (filterCategory && keccak256(bytes(contents[i].category)) != keccak256(bytes(category))) continue;
            total++;
        }

        if (offset >= total) return new ContentInfo[](0);
        uint256 count = total - offset > limit ? limit : total - offset;

        ContentInfo[] memory result = new ContentInfo[](count);
        uint256 found = 0;
        uint256 skipped = 0;

        for (uint256 i = 0; i < contentCount && found < count; i++) {
            if (!contents[i].active) continue;
            if (filterCategory && keccak256(bytes(contents[i].category)) != keccak256(bytes(category))) continue;
            if (skipped < offset) {
                skipped++;
                continue;
            }
            result[found++] = _toInfo(contents[i]);
        }

        return result;
    }
}
