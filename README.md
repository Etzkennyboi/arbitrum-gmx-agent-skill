# arbitrum-integrated-agent-skills

[![ArbiLink Bounty](https://img.shields.io/badge/ArbiLink-Agentic%20Bounty-brightgreen)](https://arbitrum.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js 18+](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org)
[![ethers.js v6](https://img.shields.io/badge/ethers.js-v6-blue)](https://docs.ethers.org/v6)

> **Two powerful AI agent skills for Arbitrum:** GMX V2 Trading + Liquidation Hunter

**Skill 1 — GMX V2 Agent:** Trade perpetuals, analyze markets, monitor liquidations  
**Skill 2 — Liquidation Hunter:** Detect + execute profitable liquidations on Aave V3

🚀 **Live:** https://arbitrum-agent-skills.railway.app

## 🎯 What This Skill Does

### Skill 1: GMX V2 Trading Agent

A production-ready **agent skill** that enables AI agents to:

- 📊 **Read Live Prices** — Chainlink price feeds (6 feeds: ETH, BTC, ARB, SOL, LINK, USDC)
- 📈 **Analyze Markets** — Real-time open interest, funding rates, OI skew, pool TVL
- 🔄 **Trade** — Open/close leveraged long/short perpetual positions
- 🛡️ **Monitor** — Real-time liquidation risk tracking with webhook alerts
- 🏊 **Pool Analysis** — GM liquidity pool stats ($2.88T TVL)

### Skill 2: Liquidation Hunter

A revenue-generating **agent skill** for:

- 🔍 **Detection** — Find liquidation opportunities on Aave V3 in real-time
- 💰 **Profit Calculation** — Exact return accounting for gas, bonuses, slippage
- ⚡ **Execution** — Flash loan + atomic liquidation combo
- 📊 **Monitoring** — Track health factors continuously
- 💾 **Analytics** — Liquidation history and cumulative profits
- 🧠 **Strategy Signals** — AI-powered market analysis (funding, OI imbalance, utilization)
- 🆔 **Identity** — Register agent on Arbitrum identity registry  

## ⚡ Quick Start (5 Minutes)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/arbitrum-gmx-agent-skill.git
cd arbitrum-gmx-agent-skill
npm install
```

### 2. Configure Wallet

```bash
cp .env.example .env
# Edit .env — add your AGENT_WALLET_PRIVATE_KEY (optional for read-only operations)
```

### 3. Test (Read-Only)

```bash
npm test
# ✅ 9/10 tests pass (1 skipped without wallet)
```

### 4. Start Server

```bash
npm start
# 🚀 Server running at http://localhost:3000
# 📋 View API: http://localhost:3000/
```

### 5. Register Agent (Optional)

```bash
npm run register
# 🆔 Agent registered on Arbitrum Sepolia — saves AGENT_ID to .env
```

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

## Usage Examples

### Use GMX V2 Trading Skill

```javascript
const skill = require('arbitrum-integrated-agent-skills')

// Read prices
const ethPrice = await skill.getPrice('ETH')
const allPrices = await skill.getAllPrices()

// Analyze markets
const strategy = await skill.analyzeMarket('ETH/USD')
console.log(strategy.recommendation) // 'LEAN_LONG' | 'LEAN_SHORT' | 'NEUTRAL'

// Open leveraged position
const result = await skill.goLong({
  privateKey: process.env.AGENT_WALLET_PRIVATE_KEY,
  market: 'ETH/USD',
  collateralUSDC: 100,
  leverage: 5,
})

// Monitor liquidation risk
skill.startMonitoring({
  walletAddress: '0x...',
  market: 'ETH/USD',
  isLong: true,
  liquidationThreshold: 10,
  webhookUrl: 'https://your-webhook.com/alert',
})
```

### Use Liquidation Hunter Skill

```javascript
const skill = require('arbitrum-integrated-agent-skills')

// Find liquidation opportunities
const opportunities = await skill.findOpportunities()
console.log(`Found ${opportunities.length} opportunities`)

// Check if specific account is liquidatable
const isLiquidatable = await skill.checkLiquidatable('0x...')

// Calculate exact profit before executing
const profit = await skill.calcProfit({
  debtAsset: '0x...',
  debtAmount: ethers.parseEther('100'),
  collateralAsset: '0x...',
  collateralAmount: ethers.parseEther('50'),
})
console.log(`Profit: $${profit.netProfit}`)

// Simulate liquidation without executing
const simulation = await skill.simulateLiquidation({
  targetAccount: '0x...',
  debtAsset: '0x...',
  collateralAsset: '0x...',
  debtAmount: ethers.parseEther('100'),
})

// Execute real liquidation (uses flash loan)
if (simulation.isSuccessful && simulation.estimatedProfit > 0) {
  const result = await skill.executeLiquidation({
    targetAccount: '0x...',
    debtAsset: '0x...',
    collateralAsset: '0x...',
    debtAmount: ethers.parseEther('100'),
  })
  console.log(`Liquidation executed: ${result.txHash}`)
}
```

### Via HTTP API (Both Skills)

```bash
# Health check
curl http://localhost:3000/health

# GMX: Get prices
curl http://localhost:3000/prices/ETH
curl http://localhost:3000/markets

# GMX: Get strategy signal
curl http://localhost:3000/analyze/ETH

# Liquidation Hunter: Find opportunities
curl http://localhost:3000/liquidation/opportunities

# Liquidation Hunter: Check if account liquidatable
curl http://localhost:3000/liquidation/check/0x...

# Liquidation Hunter: Execute liquidation
curl -X POST http://localhost:3000/liquidation/execute \
  -H "Content-Type: application/json" \
  -d '{
    "targetAccount": "0x...",
    "debtAsset": "0x...",
    "collateralAsset": "0x...",
    "debtAmount": "100000000000000000000"
  }'
```

## Core Principles

### GMX V2 Trading Skill:
1. **Always use Chainlink** for prices — no hardcoding or estimates
2. **createOrder struct is NESTED** — `addresses{}` and `numbers{}` are sub-objects
3. **Multicall pattern** — sendWnt + sendTokens + createOrder in one TX
4. **Approve the Router** (not OrderVault)
5. **30-decimal precision** for USD values: `ethers.parseUnits(value, 30)`
6. **Orders execute in ~30 seconds** — createOrder is submission, not fill
7. **Never hardcode secrets** — always use .env variables
8. **Test on Sepolia first** — GMX V2 trading live on Arbitrum One only

### Liquidation Hunter Skill:
1. **Flash loans are atomic** — entire operation executes in one TX, reverts if unprofitable
2. **Health factor must be <1** for liquidation eligibility (checked on-chain)
3. **Profit accounting includes:**
   - Liquidation bonus (varies by asset, ~5-10%)
   - Flash loan fee (0.05%)
   - Slippage on collateral sale
   - Gas costs
4. **Always simulate before executing** — use `simulateLiquidation()` first
5. **Monitor gas prices** — liquidations on mainnet can be expensive
6. **Aave V3 only** — Liquidation Hunter targets Aave V3 on Arbitrum

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
