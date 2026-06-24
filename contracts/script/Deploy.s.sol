// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {RouteRegistry} from "../src/RouteRegistry.sol";

contract Deploy is Script {
    function run() external {
        address hub = vm.envAddress("HUB_ADDRESS");

        vm.startBroadcast();
        RouteRegistry registry = new RouteRegistry(hub);
        vm.stopBroadcast();

        console.log("RouteRegistry deployed at:", address(registry));
        console.log("Owner:                    ", registry.owner());
        console.log("Hub:                      ", registry.hub());

        // Seed initial routes
        vm.startBroadcast();
        registry.addRoute("stablecrypto-price",    "/prices/:asset",  "StableCrypto",  "$0.015", "$0.01");
        registry.addRoute("stablecrypto-ohlcv",    "/ohlcv/:asset",   "StableCrypto",  "$0.015", "$0.01");
        registry.addRoute("stablecrypto-defi-tvl", "/defi/tvl",       "StableCrypto",  "$0.015", "$0.01");
        registry.addRoute("quicknode-gas",          "/gas",            "Quicknode",     "$0.002", "$0.001");
        registry.addRoute("quicknode-block",        "/block/latest",   "Quicknode",     "$0.002", "$0.001");
        registry.addRoute("quicknode-balance",      "/balance/:address","Quicknode",    "$0.002", "$0.001");
        registry.addRoute("stableenrich-serp",      "/serp",           "StableEnrich",  "$0.003", "$0.002");
        registry.addRoute("stableenrich-scrape",    "/scrape",         "StableEnrich",  "$0.015", "$0.01");
        vm.stopBroadcast();

        console.log("Routes seeded: 8");
    }
}
