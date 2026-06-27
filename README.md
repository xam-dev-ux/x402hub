# x402Hub

Unified x402 API gateway on Base mainnet. Proxies curated paid APIs under one URL, acting simultaneously as an x402 seller (charges callers) and x402 buyer (pays upstreams). Both settlements carry the same Base Builder Code via ERC-8021 attribution. Every request also writes a permanent on-chain record to the `RouteRegistry` contract.

## Architecture

```
caller ──USDC──▶ x402Hub (a = bc_rfgagdy3)
                   │
                   ├──USDC──▶ upstream API (s = bc_rfgagdy3)
                   │
                   └──gas──▶  RouteRegistry.logAttribution()
                               └─ route + builderCode + upstreamTxHash stored on Base

Both USDC settlements:  w = cdp_facil (CDP facilitator)
```

## Upstreams (Phase 0 verified live 2026-06-22)

| ID | Provider | Service URL | Hub Price | Upstream Price |
|---|---|---|---|---|
| `stablecrypto-price` | StableCrypto | stablecrypto.dev | $0.015 | $0.01 |
| `stablecrypto-ohlcv` | StableCrypto | stablecrypto.dev | $0.015 | $0.01 |
| `stablecrypto-defi-tvl` | StableCrypto | stablecrypto.dev | $0.015 | $0.01 |
| `quicknode-gas` | Quicknode | x402.quicknode.com | $0.002 | $0.001 |
| `quicknode-block` | Quicknode | x402.quicknode.com | $0.002 | $0.001 |
| `quicknode-balance` | Quicknode | x402.quicknode.com | $0.002 | $0.001 |
| `stableenrich-serp` | StableEnrich | stableenrich.dev | $0.003 | $0.002 |
| `stableenrich-scrape` | StableEnrich | stableenrich.dev | $0.015 | $0.01 |

**Substitutions from original spec:** CryptoHunter → StableCrypto, GlobalAPI → StableEnrich, DataForSEO → StableEnrich. Originals not found in any live x402 marketplace as of Phase 0.

## Wallets & Keys

Two separate wallets, two separate roles:

| Wallet | Key variable | Role | Where it lives |
|---|---|---|---|
| **Hub wallet** | `HUB_PRIVATE_KEY` | Signs x402 upstream payments; pays gas for `logAttribution` calls; receives incoming USDC settlements | Server `.env` (hot) |
| **Deployer wallet** | keystore only — never in a file | Deploys the contract and becomes `owner` (can manage routes, rotate hub); used once at deploy time | Foundry encrypted keystore (`~/.foundry/keystores/`) |

The deployer private key must never appear in any file — not in `.env`, not anywhere in the project. It is stored encrypted in Foundry's keystore and only decrypted on demand with a password prompt.

## Environment Variables

### Server (`server/.env`)

| Variable | Description |
|---|---|
| `BUILDER_CODE` | `bc_rfgagdy3` — registered at dashboard.base.org |
| `HUB_PRIVATE_KEY` | Hub wallet private key (`0x`-prefixed). Hot — lives on the server. |
| `HUB_ADDRESS` | Hub wallet public address. Receives incoming USDC settlements. |
| `FACILITATOR_URL` | `https://api.cdp.coinbase.com/platform/v2/x402` |
| `CDP_API_KEY_ID` | CDP API key ID from `portal.cdp.coinbase.com` → API Keys. Required for verify + settle. |
| `CDP_API_KEY_SECRET` | CDP API key secret (same portal). |
| `HUB_DOMAIN` | Public domain of deployed server (no trailing slash) |
| `BASE_RPC_URL` | Base RPC (default: `https://mainnet.base.org`) |
| `PORT` | Server port (default: 3001) |
| `REGISTRY_ADDRESS` | Deployed RouteRegistry address. Absent = on-chain logging skipped. |

> `DEPLOYER_PRIVATE_KEY` must **never** appear in any file. Use the Foundry keystore (see [Deploy section](#contract-deploy--verify)). `BASESCAN_API_KEY` is only used during contract verification, not at runtime.

### Frontend (`web/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_HUB_URL` | Server URL (e.g. `https://api.x402hub.example.com`) |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | From cloud.walletconnect.com |
| `NEXT_PUBLIC_REGISTRY_ADDRESS` | Same as `REGISTRY_ADDRESS`. Enables on-chain attribution count + history in the UI. |

## Setup

### 1. Prerequisites (manual)

- Register Builder Code: `dashboard.base.org` → Settings → Builder Codes
- Create Hub wallet: `cast wallet new`. Never use a personal wallet.
- Top up Hub wallet: USDC on Base mainnet + ETH gas buffer (~0.01 ETH covers ~1 000 logAttribution calls)
- Cuenta CDP (para monitorear uso del facilitador): `portal.cdp.coinbase.com` — no se necesita API key para que x402 funcione, solo para ver estadísticas de uso
- Basescan API key: `basescan.org/myapikey` (free, needed for contract verification)

### 2. Contract

See the full guide in [**Contract: deploy & verify**](#contract-deploy--verify) below.

### 3. Server

```bash
cd server
cp ../.env.example .env   # fill in all values including REGISTRY_ADDRESS
npm install
npm run dev
```

### 4. Frontend

```bash
cd web
cp .env.example .env.local
npm install
npm run dev
```

## Contract: deploy & verify

### Prerequisites

Install Foundry if not already present:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

Install forge-std (the only dependency):

```bash
cd contracts
forge install foundry-rs/forge-std --no-commit
```

### Run tests

```bash
cd contracts
forge test -vv
```

Expected output — 13 tests, all passing:

```
[PASS] test_addRoute()
[PASS] test_addRoute_duplicate_reverts()
[PASS] test_disableRoute()
[PASS] test_getActiveRoutes()
[PASS] test_getAttributions_pagination()
[PASS] test_getLatestAttributions()
[PASS] test_logAttribution_byHub()
[PASS] test_logAttribution_byOwner()
[PASS] test_logAttribution_emitsEvent()
[PASS] test_logAttribution_stranger_reverts()
[PASS] test_onlyOwner_addRoute()
[PASS] test_setHub()
[PASS] test_transferOwnership()
[PASS] test_transferOwnership_zero_reverts()
```

### Deploy to Base mainnet

The deploy script deploys the contract (deployer becomes `owner`) and seeds all 8 routes in one broadcast. `HUB_ADDRESS` is set as the authorized caller for `logAttribution`.

#### Step 1 — verify the keystore exists

The deployer uses the `speedrun` keystore (`~/.foundry/keystores/speedrun`, address `0x8F058fE6b568D97f85d517Ac441b52B95722fDDe`). The private key is **never written to any file**.

```bash
cast wallet list   # must show "speedrun"
```

If working on a new machine, re-import:

```bash
cast wallet import speedrun --interactive
# Prompts: paste private key → set password
# Stores AES-128-CTR encrypted in ~/.foundry/keystores/speedrun
# Raw key never touches disk in plaintext
```

#### Step 2 — deploy

```bash
cd contracts

# Public values only — safe to export
export DEPLOYER_ADDRESS=0x8F058fE6b568D97f85d517Ac441b52B95722fDDe  # speedrun keystore
export HUB_ADDRESS=0x...        # from server/.env
export BASESCAN_API_KEY=...     # from basescan.org/myapikey

forge script script/Deploy.s.sol \
  --rpc-url https://mainnet.base.org \
  --account speedrun \
  --sender $DEPLOYER_ADDRESS \
  --broadcast \
  --verify \
  --verifier etherscan \
  --verifier-url https://api.basescan.org/api \
  --etherscan-api-key $BASESCAN_API_KEY \
  -vvvv
# Prompts for keystore password — key decrypted in memory only, never written to disk
# NEVER use --private-key <hex> directly in the terminal
```

The script prints:

```
RouteRegistry deployed at: 0x<CONTRACT_ADDRESS>
Owner:                     0x<DEPLOYER_ADDRESS>   ← cold wallet, offline
Hub:                       0x<HUB_ADDRESS>        ← hot wallet, on the server
Routes seeded: 8
```

Copy `0x<CONTRACT_ADDRESS>` and set it in two places:

**`server/.env`**
```
REGISTRY_ADDRESS=0x<CONTRACT_ADDRESS>
```

**`web/.env.local`**
```
NEXT_PUBLIC_REGISTRY_ADDRESS=0x<CONTRACT_ADDRESS>
```

Restart the server. Every successful Hub request now fires a `logAttribution` transaction (signed by the Hub wallet, gas paid from its ETH balance). The UI shows a live total count on the landing page and full on-chain history in the feed.

### Verify separately (if --verify failed during deploy)

Etherscan v2 / Basescan supports `--verifier etherscan` with the v2 endpoint:

```bash
forge verify-contract \
  0x<CONTRACT_ADDRESS> \
  src/RouteRegistry.sol:RouteRegistry \
  --rpc-url https://mainnet.base.org \
  --verifier etherscan \
  --verifier-url https://api.basescan.org/api \
  --etherscan-api-key $BASESCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address)" $HUB_ADDRESS) \
  --watch
```

`--watch` polls until Basescan confirms verification (usually 30–60 s).

After verification, the contract ABI is readable on Basescan and anyone can call the read functions directly from the UI:
- `getActiveRoutes()` — current route catalog
- `getLatestAttributions(50)` — last 50 settled requests
- `attributionCount()` — total number of logged settlements

### Contract architecture

`contracts/src/RouteRegistry.sol` — no external dependencies, no upgradability, no proxy.

```
RouteRegistry
├── owner          address — can manage routes, call logAttribution, rotate hub
├── hub            address — Hub server wallet, authorized to call logAttribution
│
├── addRoute / updateRoute / disableRoute    (onlyOwner)
├── setHub / transferOwnership               (onlyOwner)
│
└── logAttribution(route, builderCode, upstreamTxHash)   (onlyHub)
      → appends AttributionEntry { timestamp, route, builderCode, upstreamTxHash }
      → emits AttributionLogged(index, route, builderCode, upstreamTxHash, timestamp)
```

Each `logAttribution` call costs ~40 000 gas on Base (~$0.0001 at normal gas prices).

### Rotate the Hub wallet

If `HUB_ADDRESS` changes, call `setHub(newAddress)` from the **deployer/owner wallet** before restarting the server with the new key:

```bash
cast send $REGISTRY_ADDRESS "setHub(address)" $NEW_HUB_ADDRESS \
  --rpc-url https://mainnet.base.org \
  --account speedrun
# Prompts for keystore password
```

Then update `HUB_PRIVATE_KEY` / `HUB_ADDRESS` in `server/.env` and restart.

## Deploy: server & frontend

### Server (Railway / Render / Fly)

1. Connect GitHub repo, set root directory to `server/`
2. Set all env vars including `REGISTRY_ADDRESS`
3. Build command: `npm install && npm run build`
4. Start command: `npm start`

### Frontend (Vercel)

1. Import repo, set root directory to `web/`
2. Set `NEXT_PUBLIC_HUB_URL` to the deployed server URL
3. Set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

## Registration (Phase 5)

After deploy:

1. Confirm `GET https://<hub-domain>/.well-known/x402` returns valid JSON
2. Submit to x402scan: `x402scan.com/resources/register`
3. Open PR to `github.com/Merit-Systems/awesome-x402` under "Agent Aggregators"

## Attribution verification

After a paid call two things happen on-chain:

1. **USDC settlement calldata** — contains ERC-8021 suffix with `a`, `s`, `w` fields. Parse via `/check` or `buildercode-checker.vercel.app`.
2. **RouteRegistry.logAttribution** — explicit on-chain record with route path, Builder Code, and upstream tx hash. Queryable via `getLatestAttributions()` or the `AttributionLogged` event on Basescan.

## x402 SDK versions

All `@x402/*` packages at `v2.16.0`.

Key divergences from v1:
- `paymentMiddleware(routes, x402ResourceServer)` — routes are `"METHOD /path"` keys
- `declareBuilderCodeExtension` goes per-route in `extensions`, not top-level
- `BuilderCodeClientExtension` — `s` field in calldata is `string[]`
- Import `ExactEvmScheme` from `@x402/evm/exact/server` or `@x402/evm/exact/client`

## File structure

```
/contracts
  src/RouteRegistry.sol        Route catalog + attribution log (on-chain)
  script/Deploy.s.sol          Deploy + seed 8 routes in one broadcast
  test/RouteRegistry.t.sol     13 Foundry unit tests
  foundry.toml
/server
  src/index.ts                 Express bootstrap
  src/middleware/x402.ts       paymentMiddleware + per-route Builder Code
  src/chain/registry.ts        logAttributionOnChain() — viem writeContract
  src/adapters/
    index.ts                   UpstreamAdapter interface + USDC/network constants
    stableCrypto.ts            Prices, OHLCV, DeFi TVL
    quicknode.ts               Gas, block, balance on Base
    stableEnrich.ts            SERP, web scrape
  src/client/buyer.ts          x402Client + BuilderCodeClientExtension + buyerFetch
  src/routes/
    hub.ts                     Paid route handlers → calls logAttributionOnChain
    api.ts                     /api/attribution/:txHash + /api/feed (SSE)
    openapi.ts                 /openapi.json
  src/discovery/wellKnown.ts   /.well-known/x402
  src/attribution/parse.ts     parseBuilderCodeSuffixFromCalldata helper
  src/settlements.ts           JSONL settlement logger
  .env.example
/web
  app/page.tsx                 Landing + architecture diagram + on-chain attribution count
  app/components/
    AttributionCount.tsx       wagmi useReadContract → attributionCount()
  app/explorer/page.tsx        API explorer (live x402 calls)
  app/feed/page.tsx            Live SSE tab + on-chain history tab (getLatestAttributions)
  app/check/page.tsx           Tx attribution checker
  lib/wagmi.ts                 Wagmi + RainbowKit config
  lib/registry.ts              RouteRegistry ABI + NEXT_PUBLIC_REGISTRY_ADDRESS
  .env.example
```
