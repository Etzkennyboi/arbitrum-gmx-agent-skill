---
name: arbitrum-gmx-agent-skill
description: >
  Opinionated guide for building AI agents that interact with GMX V2
  perpetuals on Arbitrum One. Covers reading market data, Chainlink prices,
  opening/closing leveraged positions, monitoring liquidation risk, analyzing
  GM pools, and registering agent identity on the ArbiLink registry.
  Use when building any agent, bot, or script that trades or analyzes GMX.
---

# GMX V2 Agent Development on Arbitrum

## Tech Stack

| Layer             | Tool              | Notes                          |
|-------------------|-------------------|--------------------------------|
| Chain interaction | ethers.js v6      | JsonRpcProvider + Wallet       |
| Price feeds       | Chainlink         | Direct aggregator reads        |
| Perpetuals        | GMX V2            | $500M+ TVL                     |
| Agent identity    | ArbiLink Registry | Sepolia + One                  |
| Runtime           | Node.js 18+       | Scripts, bots, HTTP agents     |

## Decision Flow

| Need | Reference |
|------|-----------|
| Live prices | [references/chainlink-price-feeds.md](references/chainlink-price-feeds.md) |
| OI / funding / pools | [references/gmx-market-data.md](references/gmx-market-data.md) |
| Trade (open/close) | [references/gmx-trading.md](references/gmx-trading.md) |
| Monitor positions | [references/position-monitoring.md](references/position-monitoring.md) |
| Agent identity | [references/agent-identity.md](references/agent-identity.md) |
| Deployment | [references/deployment.md](references/deployment.md) |
| ABIs / addresses | [references/gmx-v2-contracts.md](references/gmx-v2-contracts.md) |

## Project Scaffold

```
my-gmx-agent/
├── src/
│   ├── index.js      # Main agent entry point
│   ├── gmx.js        # GMX V2 interactions
│   ├── prices.js     # Chainlink price feeds
│   ├── monitor.js    # Position monitoring
│   └── identity.js   # Agent registry
├── .env              # Secrets — never commit
├── .gitignore
└── package.json
```

## Bootstrap

```bash
mkdir my-gmx-agent && cd my-gmx-agent
npm init -y
npm install ethers@^6.13.0 dotenv
npm install express cors   # optional: for HTTP agents

cat > .env << 'EOF'
AGENT_WALLET_PRIVATE_KEY=0x...
ARBITRUM_ONE_RPC=https://arb1.arbitrum.io/rpc
ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
EOF

echo "node_modules/\n.env\n*.log" > .gitignore
```

## Core Workflow

### Read market data (no wallet required)

```javascript
const { ethers } = require("ethers")
const provider = new ethers.JsonRpcProvider("https://arb1.arbitrum.io/rpc")

// ETH/USD from Chainlink
const feed = new ethers.Contract(
  "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
  [
    "function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)",
    "function decimals() view returns (uint8)"
  ],
  provider
)
const [, answer,,,] = await feed.latestRoundData()
const decimals = await feed.decimals()
const ethPrice = parseFloat(ethers.formatUnits(answer, decimals))
console.log(`ETH/USD: $${ethPrice}`)
```

## Principles (Claude follows these when generating code)

1. **ALWAYS use Chainlink for prices.** Never estimate or hardcode.
2. **createOrder struct uses NESTED TUPLES** — `addresses{}` and `numbers{}` are sub-objects, not flat params. Wrong shape = silent revert.
3. **GMX V2 uses MULTICALL pattern:** `sendWnt` + `sendTokens` + `createOrder`.
4. **Approve the ROUTER not the OrderVault.**
5. **GMX uses 30-decimal precision:** `ethers.parseUnits(value, 30)`
6. **Orders are NOT instant.** Keeper executes ~30 seconds after `createOrder`.
7. **Always use env vars** for keys, RPCs, addresses. Never hardcode secrets.
8. **Test identity registration on Sepolia.** GMX V2 trading on Mainnet only.
9. **Always read positions** via `Reader.getAccountPositions` (not key lookups).
