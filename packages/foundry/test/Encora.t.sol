// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FhevmTest} from "forge-fhevm/FhevmTest.sol";
import {Encora} from "../src/Encora.sol";
import {euint32, externalEuint32} from "encrypted-types/EncryptedTypes.sol";
import {ERC20} from "@openzeppelin-contracts/token/ERC20/ERC20.sol";

/// @dev Minimal ERC20 for testing USDC payments
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract EncoraTest is FhevmTest {
    Encora encora;
    MockUSDC usdc;
    address encoraAddress;

    uint256 internal constant SELLER_PK = 0x5E11E2;
    uint256 internal constant BUYER_PK = 0xB0AAAA;
    address seller;
    address buyer;

    // 8 clear uint32 values representing a fake AES key
    uint32[8] internal CLEAR_KEY = [1, 2, 3, 4, 5, 6, 7, 8];
    uint256 internal constant PRICE = 5_000_000; // 5 USDC (6 decimals)

    function setUp() public override {
        super.setUp();
        seller = vm.addr(SELLER_PK);
        buyer = vm.addr(BUYER_PK);

        usdc = new MockUSDC();
        encora = new Encora(address(usdc));
        encoraAddress = address(encora);

        // Fund buyer with USDC
        usdc.mint(buyer, 100_000_000); // 100 USDC
    }

    // ─────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────

    function _uploadContent() internal returns (uint256 id) {
        externalEuint32[8] memory handles;
        bytes[] memory inputProofs = new bytes[](8);

        for (uint256 i = 0; i < 8; i++) {
            (externalEuint32 h, bytes memory proof) = encryptUint32(CLEAR_KEY[i], seller, encoraAddress);
            handles[i] = h;
            inputProofs[i] = proof;
        }

        vm.prank(seller);
        id = encora.uploadContent(
            "Test Content",
            "A test description",
            "Preview text for AI",
            hex"deadbeef",
            handles,
            inputProofs,
            "skills",
            PRICE
        );
    }

    // ─────────────────────────────────────────────
    // Upload tests
    // ─────────────────────────────────────────────

    function test_uploadContent_incrementsCount() public {
        assertEq(encora.contentCount(), 0);
        _uploadContent();
        assertEq(encora.contentCount(), 1);
    }

    function test_uploadContent_storesMetadata() public {
        uint256 id = _uploadContent();
        Encora.ContentInfo memory c = encora.getContent(id);

        assertEq(c.id, 0);
        assertEq(c.seller, seller);
        assertEq(c.title, "Test Content");
        assertEq(c.category, "skills");
        assertEq(c.price, PRICE);
        assertTrue(c.active);
    }

    function test_uploadContent_storesEncryptedKeyHandles() public {
        uint256 id = _uploadContent();
        euint32[8] memory handles = encora.getEncryptedKeyHandles(id);
        // All 8 handles should be non-zero
        for (uint256 i = 0; i < 8; i++) {
            assertTrue(euint32.unwrap(handles[i]) != bytes32(0));
        }
    }

    function test_uploadContent_tracksBySeller() public {
        _uploadContent();
        uint256[] memory ids = encora.getContentsBySeller(seller);
        assertEq(ids.length, 1);
        assertEq(ids[0], 0);
    }

    // ─────────────────────────────────────────────
    // Purchase tests
    // ─────────────────────────────────────────────

    function test_purchase_setsHasPaid() public {
        uint256 id = _uploadContent();

        vm.startPrank(buyer);
        usdc.approve(encoraAddress, PRICE);
        encora.purchase(id);
        vm.stopPrank();

        assertTrue(encora.hasPaid(id, buyer));
    }

    function test_purchase_transfersUSDC() public {
        uint256 id = _uploadContent();
        uint256 buyerBefore = usdc.balanceOf(buyer);

        vm.startPrank(buyer);
        usdc.approve(encoraAddress, PRICE);
        encora.purchase(id);
        vm.stopPrank();

        assertEq(usdc.balanceOf(buyer), buyerBefore - PRICE);
        assertEq(encora.sellerBalance(seller), PRICE);
    }

    function test_purchase_tracksByBuyer() public {
        uint256 id = _uploadContent();

        vm.startPrank(buyer);
        usdc.approve(encoraAddress, PRICE);
        encora.purchase(id);
        vm.stopPrank();

        uint256[] memory purchases = encora.getPurchasesByBuyer(buyer);
        assertEq(purchases.length, 1);
        assertEq(purchases[0], id);
    }

    function test_purchase_revertsIfNotActive() public {
        uint256 id = _uploadContent();
        vm.prank(seller);
        encora.deactivate(id);

        vm.startPrank(buyer);
        usdc.approve(encoraAddress, PRICE);
        vm.expectRevert(Encora.ContentNotActive.selector);
        encora.purchase(id);
        vm.stopPrank();
    }

    // ─────────────────────────────────────────────
    // requestAccess tests
    // ─────────────────────────────────────────────

    function test_requestAccess_revertsIfNotPurchased() public {
        uint256 id = _uploadContent();
        vm.prank(buyer);
        vm.expectRevert(Encora.NotPurchased.selector);
        encora.requestAccess(id);
    }

    function test_requestAccess_grantsAccessAndAllowsDecrypt() public {
        uint256 id = _uploadContent();

        vm.startPrank(buyer);
        usdc.approve(encoraAddress, PRICE);
        encora.purchase(id);
        encora.requestAccess(id);
        vm.stopPrank();

        // Verify buyer can decrypt each key chunk
        euint32[8] memory handles = encora.getEncryptedKeyHandles(id);
        bytes memory sig = signUserDecrypt(BUYER_PK, encoraAddress);

        for (uint256 i = 0; i < 8; i++) {
            uint256 decrypted = userDecrypt(euint32.unwrap(handles[i]), buyer, encoraAddress, sig);
            assertEq(decrypted, CLEAR_KEY[i]);
        }
    }

    // ─────────────────────────────────────────────
    // Withdraw tests
    // ─────────────────────────────────────────────

    function test_withdraw_transfersBalance() public {
        uint256 id = _uploadContent();

        vm.startPrank(buyer);
        usdc.approve(encoraAddress, PRICE);
        encora.purchase(id);
        vm.stopPrank();

        uint256 sellerBefore = usdc.balanceOf(seller);
        vm.prank(seller);
        encora.withdraw();

        assertEq(usdc.balanceOf(seller), sellerBefore + PRICE);
        assertEq(encora.sellerBalance(seller), 0);
    }

    function test_withdraw_revertsIfNoBalance() public {
        vm.prank(seller);
        vm.expectRevert(Encora.WithdrawFailed.selector);
        encora.withdraw();
    }

    // ─────────────────────────────────────────────
    // Listing tests
    // ─────────────────────────────────────────────

    function test_listContents_returnsActiveContent() public {
        _uploadContent();
        Encora.ContentInfo[] memory list = encora.listContents(0, 10);
        assertEq(list.length, 1);
        assertEq(list[0].title, "Test Content");
    }

    function test_listByCategory_filtersCorrectly() public {
        _uploadContent(); // category: "skills"

        Encora.ContentInfo[] memory skills = encora.listByCategory("skills", 0, 10);
        assertEq(skills.length, 1);

        Encora.ContentInfo[] memory finance = encora.listByCategory("finance", 0, 10);
        assertEq(finance.length, 0);
    }

    function test_hasAccess_returnsTrueAfterPurchase() public {
        uint256 id = _uploadContent();
        assertFalse(encora.hasAccess(id, buyer));

        vm.startPrank(buyer);
        usdc.approve(encoraAddress, PRICE);
        encora.purchase(id);
        vm.stopPrank();

        assertTrue(encora.hasAccess(id, buyer));
    }

    // ─────────────────────────────────────────────
    // Deactivate tests
    // ─────────────────────────────────────────────

    function test_deactivate_removesFromListing() public {
        uint256 id = _uploadContent();
        vm.prank(seller);
        encora.deactivate(id);

        Encora.ContentInfo[] memory list = encora.listContents(0, 10);
        assertEq(list.length, 0);
    }

    function test_deactivate_revertsIfNotSeller() public {
        uint256 id = _uploadContent();
        vm.prank(buyer);
        vm.expectRevert(Encora.NotSeller.selector);
        encora.deactivate(id);
    }
}
