// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title RouteRegistry
 * @notice Public ledger for x402Hub routes and Builder Code attribution.
 *
 * Two concerns in one contract:
 *   1. Route catalog — owner-managed list of Hub routes with pricing metadata.
 *   2. Attribution log — append-only record of each settled request, storing
 *      the Builder Code, route, and upstream settlement tx hash on-chain.
 *
 * The Hub server calls `logAttribution` after every successful upstream payment.
 * Both the incoming settlement (a = builderCode) and the outgoing one (s = builderCode)
 * are already in USDC transfer calldata via ERC-8021; this contract provides a
 * queryable, human-readable complement to that calldata trace.
 */
contract RouteRegistry {
    // ── Types ───────────────────────────────────────────────────────────────

    struct Route {
        string id;
        string hubPath;
        string upstream;
        string hubPrice;       // e.g. "$0.015"
        string upstreamPrice;  // e.g. "$0.01"
        bool   active;
    }

    struct AttributionEntry {
        uint256 timestamp;
        string  route;
        string  builderCode;
        bytes32 upstreamTxHash; // settlement tx from Hub → upstream (zero if unknown)
    }

    // ── State ───────────────────────────────────────────────────────────────

    address public owner;
    address public hub;            // authorized to call logAttribution

    Route[]             private _routes;
    mapping(string => uint256) private _routeIndex; // id → 1-based index in _routes

    AttributionEntry[]  private _attributions;

    // ── Events ──────────────────────────────────────────────────────────────

    event RouteAdded(string indexed id, string hubPath, string upstream, string hubPrice, string upstreamPrice);
    event RouteUpdated(string indexed id, string hubPath, string upstream, string hubPrice, string upstreamPrice);
    event RouteDisabled(string indexed id);
    event HubUpdated(address indexed previous, address indexed next);
    event AttributionLogged(
        uint256 indexed index,
        string  indexed route,
        string  builderCode,
        bytes32 upstreamTxHash,
        uint256 timestamp
    );

    // ── Modifiers ───────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyHub() {
        require(msg.sender == hub || msg.sender == owner, "not hub");
        _;
    }

    // ── Constructor ─────────────────────────────────────────────────────────

    /// @param _hub Address of the Hub server wallet that will call logAttribution.
    constructor(address _hub) {
        owner = msg.sender;
        hub   = _hub;
    }

    // ── Route management (owner only) ────────────────────────────────────────

    function addRoute(
        string calldata id,
        string calldata hubPath,
        string calldata upstream,
        string calldata hubPrice,
        string calldata upstreamPrice
    ) external onlyOwner {
        require(_routeIndex[id] == 0, "route exists");
        _routes.push(Route(id, hubPath, upstream, hubPrice, upstreamPrice, true));
        _routeIndex[id] = _routes.length; // 1-based
        emit RouteAdded(id, hubPath, upstream, hubPrice, upstreamPrice);
    }

    function updateRoute(
        string calldata id,
        string calldata hubPath,
        string calldata upstream,
        string calldata hubPrice,
        string calldata upstreamPrice
    ) external onlyOwner {
        uint256 idx = _routeIndex[id];
        require(idx != 0, "route not found");
        Route storage r = _routes[idx - 1];
        r.hubPath       = hubPath;
        r.upstream      = upstream;
        r.hubPrice      = hubPrice;
        r.upstreamPrice = upstreamPrice;
        r.active        = true;
        emit RouteUpdated(id, hubPath, upstream, hubPrice, upstreamPrice);
    }

    function disableRoute(string calldata id) external onlyOwner {
        uint256 idx = _routeIndex[id];
        require(idx != 0, "route not found");
        _routes[idx - 1].active = false;
        emit RouteDisabled(id);
    }

    function setHub(address _hub) external onlyOwner {
        emit HubUpdated(hub, _hub);
        hub = _hub;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero address");
        owner = newOwner;
    }

    // ── Attribution logging (hub only) ───────────────────────────────────────

    /**
     * @notice Record one settled Hub request on-chain.
     * @param route          Hub route path, e.g. "/prices/:asset"
     * @param builderCode    Base Builder Code, e.g. "x402hub"
     * @param upstreamTxHash Settlement tx from Hub → upstream (bytes32(0) if unavailable)
     */
    function logAttribution(
        string  calldata route,
        string  calldata builderCode,
        bytes32          upstreamTxHash
    ) external onlyHub {
        uint256 idx = _attributions.length;
        _attributions.push(AttributionEntry({
            timestamp:      block.timestamp,
            route:          route,
            builderCode:    builderCode,
            upstreamTxHash: upstreamTxHash
        }));
        emit AttributionLogged(idx, route, builderCode, upstreamTxHash, block.timestamp);
    }

    // ── Views ────────────────────────────────────────────────────────────────

    function getRoutes() external view returns (Route[] memory) {
        return _routes;
    }

    function getActiveRoutes() external view returns (Route[] memory) {
        uint256 count;
        for (uint256 i; i < _routes.length; i++) {
            if (_routes[i].active) count++;
        }
        Route[] memory active = new Route[](count);
        uint256 j;
        for (uint256 i; i < _routes.length; i++) {
            if (_routes[i].active) active[j++] = _routes[i];
        }
        return active;
    }

    function getRoute(string calldata id) external view returns (Route memory) {
        uint256 idx = _routeIndex[id];
        require(idx != 0, "route not found");
        return _routes[idx - 1];
    }

    function attributionCount() external view returns (uint256) {
        return _attributions.length;
    }

    /// @notice Paginated read of the attribution log.
    function getAttributions(uint256 offset, uint256 limit)
        external
        view
        returns (AttributionEntry[] memory entries)
    {
        uint256 total = _attributions.length;
        if (offset >= total) return entries;
        uint256 end = offset + limit > total ? total : offset + limit;
        entries = new AttributionEntry[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            entries[i - offset] = _attributions[i];
        }
    }

    /// @notice Latest N attribution entries (newest first).
    function getLatestAttributions(uint256 n)
        external
        view
        returns (AttributionEntry[] memory entries)
    {
        uint256 total = _attributions.length;
        uint256 count = n > total ? total : n;
        entries = new AttributionEntry[](count);
        for (uint256 i; i < count; i++) {
            entries[i] = _attributions[total - 1 - i];
        }
    }
}
