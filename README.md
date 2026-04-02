# arbitrum-gmx-agent-skill

A production-grade Claude Code Skill for building AI agents that trade and analyze GMX V2 perpetuals on Arbitrum One.

> **Not a standalone app.** This is a knowledge package that installs to `~/.claude/skills/` for Claude Code to read at session start.

## What It Does

✅ Read live Chainlink oracle prices for ETH, BTC, ARB, SOL, LINK on Arbitrum  
✅ Query GMX V2 market data — open interest, funding rates, pool stats  
✅ Generate correct code to open and close leveraged long/short perpetual positions  
✅ Monitor positions for liquidation risk and generate alert logic  
✅ Analyze markets and produce trading signal logic  
✅ Register agent identity on the ArbiLink on-chain registry  
✅ Deploy trading agents to Railway with full environment config  

## Installation

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/etzkennyboi/arbitrum-gmx-agent-skill/main/install.sh)
```

Or manually:

```bash
mkdir -p ~/.claude/skills
cd ~/.claude/skills
git clone https://github.com/etzkennyboi/arbitrum-gmx-agent-skill.git
```

After installation, **start a new Claude Code session** and ask:

```
"Get current funding rates on GMX Arbitrum"
"Build a bot that opens a 5x long on ETH"
"Register my agent on the ArbiLink registry"
```

## Quick Start

Once the skill is installed, Claude Code will:

1. **Read prices** from Chainlink with no setup required
2. **Query market data** from GMX DataStore (read-only, no wallet)
3. **Build trading scripts** with the correct createOrder struct shape
4. **Deploy to Railway** with environment configuration

## Technology Stack

| Layer | Tool | Notes |
|-------|------|-------|
| Chain | ethers.js v6 | JsonRpcProvider + Wallet |
| Prices | Chainlink | Direct aggregator reads on Arbitrum One |
| Perpetuals | GMX V2 | Largest Arbitrum-native DEX |
| Agent Identity | ArbiLink Registry | On-chain registration (Sepolia + Mainnet) |
| Runtime | Node.js 18+ | Scripts, bots, HTTP agents |
| Deploy | Railway | One-command cloud deployment |

## File Structure

```
arbitrum-gmx-agent-skill/
├── SKILL.md                         ← Claude reads this first
├── README.md                        ← This file
├── LICENSE                          ← MIT
├── install.sh                       ← Installer script
├── references/
│   ├── gmx-v2-contracts.md         ← Verified addresses, ABIs, struct shapes
│   ├── gmx-trading.md              ← Order lifecycle: open/close positions
│   ├── gmx-market-data.md          ← Reading OI, funding, pools, positions
│   ├── chainlink-price-feeds.md    ← Live price feed integration
│   ├── agent-identity.md           ← ArbiLink registry registration
│   ├── position-monitoring.md      ← Liquidation risk + monitoring loops
│   └── deployment.md               ← Railway deployment + env setup
└── docs/
    └── demo.md                     ← Demo walkthrough for judges
```

## References

### For Building Agents

- [GMX V2 Contracts & ABIs](references/gmx-v2-contracts.md) — Addresses, struct shapes, token decimals
- [Trading Guide](references/gmx-trading.md) — Complete order lifecycle
- [Market Data](references/gmx-market-data.md) — Reading OI, funding, positions
- [Chainlink Prices](references/chainlink-price-feeds.md) — Reading live prices
- [Agent Identity](references/agent-identity.md) — ArbiLink registry registration
- [Position Monitoring](references/position-monitoring.md) — Liquidation checks & alerts
- [Deployment](references/deployment.md) — Railway setup & CLI commands

## Example: Get ETH Price

```javascript
// Claude Code will generate this from the skill:
const { ethers } = require("ethers")
const provider = new ethers.JsonRpcProvider("https://arb1.arbitrum.io/rpc")

const AGGREGATOR_ABI = [
  "function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)",
  "function decimals() view returns (uint8)",
]

async function getPrice(pair) {
  const PRICE_FEEDS = {
    "ETH/USD": "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
  }
  
  const feed = new ethers.Contract(
    PRICE_FEEDS[pair],
    AGGREGATOR_ABI,
    provider
  )
  
  const [roundData, decimals] = await Promise.all([
    feed.latestRoundData(),
    feed.decimals(),
  ])
  
  return parseFloat(ethers.formatUnits(roundData.answer, decimals))
}

console.log(`ETH/USD: $${await getPrice("ETH/USD")}`)
```

## Core Principles

1. **Always use Chainlink** for prices — no hardcoding or estimates
2. **createOrder struct is NESTED** — `addresses{}` and `numbers{}` are sub-objects
3. **Multicall pattern** — sendWnt + sendTokens + createOrder in one TX
4. **Approve the Router** (not OrderVault)
5. **30-decimal precision** for USD values: `ethers.parseUnits(value, 30)`
6. **Orders execute in ~30 seconds** — createOrder is submission, not fill
7. **Never hardcode secrets** — always use .env variables
8. **Test on Sepolia first** — GMX V2 trading live on Arbitrum One only

## Important Links

- **GMX V2 Docs:** https://docs.gmx.io/
- **Chainlink on Arbitrum:** https://docs.chain.link/data-feeds/price-feeds/addresses?network=arbitrum
- **Arbitrum RPC:** https://arb1.arbitrum.io/rpc
- **Arbitrum Sepolia Testnet:** https://sepolia-rollup.arbitrum.io/rpc

## Demo

See [docs/demo.md](docs/demo.md) for a complete walkthrough showing:
- Reading live market data
- Opening a leveraged position
- Monitoring liquidation risk
- Registering an agent on-chain
- Deploying to Railway

## Contributing

Issues and PRs welcome. This skill is maintained as part of the ArbiLink Agentic Bounty program.

## License

MIT — See [LICENSE](LICENSE)

## Disclaimer

This skill is educational and for use with Claude Code only. Always test on testnet before deploying trading logic to mainnet. GMX perpetuals are high-risk instruments — be aware of liquidation risk and use stop-loss orders strategically.
