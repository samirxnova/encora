// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {Encora} from "../src/Encora.sol";

contract DeployEncora is Script {
    // Sepolia USDC (Circle): https://faucet.circle.com
    address constant SEPOLIA_USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;

    function run() external {
        address usdc = vm.envOr("SEPOLIA_USDC_ADDRESS", SEPOLIA_USDC);
        vm.startBroadcast();
        Encora encora = new Encora(usdc);
        console.log("Encora deployed at:", address(encora));
        console.log("USDC:", usdc);
        vm.stopBroadcast();
    }
}
