// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {RouteRegistry} from "../src/RouteRegistry.sol";

contract RouteRegistryTest is Test {
    RouteRegistry registry;
    address owner  = address(this);
    address hub    = makeAddr("hub");
    address stranger = makeAddr("stranger");

    function setUp() public {
        registry = new RouteRegistry(hub);
    }

    // ── Route management ────────────────────────────────────────────────────

    function test_addRoute() public {
        registry.addRoute("gas", "/gas", "Quicknode", "$0.002", "$0.001");
        RouteRegistry.Route memory r = registry.getRoute("gas");
        assertEq(r.id, "gas");
        assertEq(r.hubPath, "/gas");
        assertEq(r.hubPrice, "$0.002");
        assertTrue(r.active);
    }

    function test_addRoute_duplicate_reverts() public {
        registry.addRoute("gas", "/gas", "Quicknode", "$0.002", "$0.001");
        vm.expectRevert("route exists");
        registry.addRoute("gas", "/gas", "Quicknode", "$0.002", "$0.001");
    }

    function test_updateRoute() public {
        registry.addRoute("gas", "/gas", "Quicknode", "$0.002", "$0.001");
        registry.updateRoute("gas", "/gas", "Quicknode", "$0.003", "$0.001");
        assertEq(registry.getRoute("gas").hubPrice, "$0.003");
    }

    function test_disableRoute() public {
        registry.addRoute("gas", "/gas", "Quicknode", "$0.002", "$0.001");
        registry.disableRoute("gas");
        assertFalse(registry.getRoute("gas").active);
    }

    function test_getActiveRoutes() public {
        registry.addRoute("a", "/a", "A", "$0.001", "$0.001");
        registry.addRoute("b", "/b", "B", "$0.001", "$0.001");
        registry.addRoute("c", "/c", "C", "$0.001", "$0.001");
        registry.disableRoute("b");
        RouteRegistry.Route[] memory active = registry.getActiveRoutes();
        assertEq(active.length, 2);
    }

    function test_onlyOwner_addRoute() public {
        vm.prank(stranger);
        vm.expectRevert("not owner");
        registry.addRoute("x", "/x", "X", "$0.001", "$0.001");
    }

    // ── Attribution logging ─────────────────────────────────────────────────

    function test_logAttribution_byHub() public {
        vm.prank(hub);
        registry.logAttribution("/gas", "x402hub", bytes32(0));
        assertEq(registry.attributionCount(), 1);
    }

    function test_logAttribution_byOwner() public {
        registry.logAttribution("/gas", "x402hub", bytes32(uint256(0xdeadbeef)));
        assertEq(registry.attributionCount(), 1);
    }

    function test_logAttribution_stranger_reverts() public {
        vm.prank(stranger);
        vm.expectRevert("not hub");
        registry.logAttribution("/gas", "x402hub", bytes32(0));
    }

    function test_logAttribution_emitsEvent() public {
        bytes32 txHash = bytes32(uint256(0xabcd));
        vm.expectEmit(true, true, false, true);
        emit RouteRegistry.AttributionLogged(0, "/gas", "x402hub", txHash, block.timestamp);
        registry.logAttribution("/gas", "x402hub", txHash);
    }

    function test_getAttributions_pagination() public {
        for (uint256 i; i < 5; i++) {
            registry.logAttribution("/gas", "x402hub", bytes32(i));
        }
        RouteRegistry.AttributionEntry[] memory page = registry.getAttributions(1, 2);
        assertEq(page.length, 2);
        assertEq(page[0].upstreamTxHash, bytes32(uint256(1)));
    }

    function test_getLatestAttributions() public {
        for (uint256 i; i < 3; i++) {
            registry.logAttribution("/gas", "x402hub", bytes32(i));
        }
        RouteRegistry.AttributionEntry[] memory latest = registry.getLatestAttributions(2);
        assertEq(latest.length, 2);
        // newest first: index 2 then index 1
        assertEq(latest[0].upstreamTxHash, bytes32(uint256(2)));
        assertEq(latest[1].upstreamTxHash, bytes32(uint256(1)));
    }

    // ── Access control ──────────────────────────────────────────────────────

    function test_setHub() public {
        address newHub = makeAddr("newHub");
        registry.setHub(newHub);
        assertEq(registry.hub(), newHub);
    }

    function test_transferOwnership() public {
        address newOwner = makeAddr("newOwner");
        registry.transferOwnership(newOwner);
        assertEq(registry.owner(), newOwner);
    }

    function test_transferOwnership_zero_reverts() public {
        vm.expectRevert("zero address");
        registry.transferOwnership(address(0));
    }
}
