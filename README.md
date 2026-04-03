# arbitrum-integrated-agent-skills

[![ArbiLink Bounty](https://img.shields.io/badge/ArbiLink-Agentic%20Bounty-brightgreen)](https://arbitrum.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js 18+](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org)
[![ethers.js v6](https://img.shields.io/badge/ethers.js-v6-blue)](https://docs.ethers.org/v6)

> **Two powerful AI agent skills for Arbitrum:** GMX V2 Trading + Liquidation Hunter

**Skill 1 — GMX V2 Agent:** Trade perpetuals, analyze markets, monitor positions  
**Skill 2 — Liquidation Hunter:** Detect + execute profitable liquidations on Aave V3 using flash loans

**Status:** ✅ Production-ready | 🧪 9/9 tests passing on live Arbitrum One | 🆔 Agent ID: 1 (registered on-chain)

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
git clone https://github.com/Etzkennyboi/arbitrum-gmx-agent-skill.git
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

## Repository Structure

```
arbitrum-gmx-agent-skill/
├── README.md              ← This file (getting started)
├── SKILL.md               ← Skill specification for Claude
├── API.md                 ← Complete HTTP API reference (24 endpoints)
├── LICENSE                ← MIT
├── package.json           ← Dependencies (ethers, express, cors, dotenv)
│
├── lib/                   ← Core blockchain interactions
│   ├── arbitrum.js        ├─ RPC provider, wallet, balance helpers
│   ├── constants.js       ├─ Contract ABIs, addresses, configurations
│   ├── prices.js          ├─ Chainlink price feed integration
│   ├── gmx.js             ├─ GMX V2 core interactions
│   ├── identity.js        ├─ ArbiLink registry integration
│   ├── liquidation-detector.js     ├─ [NEW] Aave liquidation detection
│   └── flash-loan-executor.js      └─ [NEW] Flash loan execution
│
├── skills/                ← Business logic & workflows
│   ├── market-reader/     ├─ Market data, funding rates (GMX)
│   ├── position-manager/  ├─ Open/close positions, risk checks (GMX)
│   ├── pool-analyzer/     ├─ GM pool stats & TVL (GMX)
│   ├── strategy/          ├─ 3-signal trading algorithm (GMX)
│   ├── monitor/           ├─ Real-time monitoring & webhooks (GMX)
│   ├── agent-identity/    ├─ Registry wrapper (GMX)
│   └── liquidation-hunter/└─ [NEW] Liquidation detection & execution
│
├── agent/
│   └── server.js          ← Express HTTP API (24 endpoints)
│
├── test/
│   └── run.js             ← Test suite (9/9 passing on Arbitrum One)
│
├── scripts/
│   └── register-agent.js  ← Register agent on ArbiLink registry
│
└── config/
    ├── .env.example       ← Template for environment variables
    ├── .gitignore         ← Git exclusions
    ├── Procfile           ← Railway deployment config
    └── railway.json       ← Railway app settings
```

## Key Resources

- **[SKILL.md](SKILL.md)** — Skill specification for Claude Code (read first!)
- **[API.md](API.md)** — Complete endpoint reference (all 24 endpoints)
- **[GitHub Repository](https://github.com/Etzkennyboi/arbitrum-gmx-agent-skill)** — Source code
- **[Arbitrum Docs](https://docs.arbitrum.io)** — Arbitrum ecosystem
- **[GMX V2 Docs](https://docs.gmx.io)** — Perpetuals trading  
- **[Aave V3 Docs](https://docs.aave.com/portal/)** — Lending protocol

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

Both skills are accessible via **Node.js module** or **HTTP API**. Choose the method that fits your architecture.

### 📊 Skill 1: GMX V2 Trading (Node.js Module)

```javascript
const skill = require('arbitrum-integrated-agent-skills')

// 🔍 Read market data
const ethPrice = await skill.getPrice('ETH')                    // $2,065.64
const allPrices = await skill.getAllPrices()                    // All 6 feeds
const markets = await skill.getAllMarkets()                     // 5 active markets

// 📈 Analyze market sentiment
const strategy = await skill.analyzeMarket('ETH/USD')
console.log(strategy.recommendation)  // 'LEAN_LONG' | 'LEAN_SHORT' | 'NEUTRAL'

// 💹 Open a leveraged position
const result = await skill.goLong({
  privateKey: process.env.AGENT_WALLET_PRIVATE_KEY,
  market: 'ETH/USD',
  collateralUSDC: 100,
  leverage: 5,
})

// 🛡️ Monitor position for liquidation risk
skill.startMonitoring({
  walletAddress: '0x...',
  market: 'ETH/USD',
  isLong: true,
  liquidationThreshold: 10,  // Alert when 10% away from liquidation
  webhookUrl: 'https://your-webhook.com/alert',
})
```

### 💰 Skill 2: Liquidation Hunter (Node.js Module)

```javascript
const skill = require('arbitrum-integrated-agent-skills')
const { ethers } = require('ethers')

// 🔍 Scan for liquidation opportunities
const opportunities = await skill.findOpportunities()
console.log(`Found ${opportunities.length} liquidatable accounts`)

// ✓ Check if specific account can be liquidated
const accountData = await skill.checkLiquidatable('0xAccount...')
if (accountData.isLiquidatable) {
  console.log(`Health Factor: ${accountData.healthFactor}`)  // Must be < 1.0
}

// 💵 Calculate exact profit (before executing)
const profit = await skill.calcProfit({
  debtAsset: '0xUSDC...',
  debtAmount: ethers.parseUnits('100', 6),
  collateralAsset: '0xETH...',
  collateralAmount: ethers.parseUnits('1', 18),
})
console.log(`Estimated profit: $${profit.profitUSD}`)
console.log(`Liquidation bonus: $${profit.liquidationBonusUSD}`)

// 🧪 Simulate liquidation (dry-run, no gas cost)
const simulation = await skill.simulateLiquidation({
  targetAccount: '0xAccount...',
  debtAsset: '0xUSDC...',
  collateralAsset: '0xETH...',
  debtAmount: ethers.parseUnits('100', 6),
})
console.log(`Can liquidate: ${simulation.canLiquidate}`)

// ⚡ Execute liquidation (uses flash loan + atomic execution)
if (simulation.canLiquidate && profit.isProfitable) {
  const txResult = await skill.executeLiquidation({
    targetAccount: '0xAccount...',
    debtAsset: '0xUSDC...',
    collateralAsset: '0xETH...',
    debtAmount: ethers.parseUnits('100', 6),
  })
  console.log(`✅ Liquidation executed: ${txResult.txHash}`)
}
```

### 🌐 Both Skills: HTTP API

```bash
# ═══════════════════════════════════════
# GMX V2 TRADING ENDPOINTS
# ═══════════════════════════════════════

# Get ETH price from Chainlink
curl http://localhost:3000/prices/ETH

# Get all markets on GMX
curl http://localhost:3000/markets

# Get strategy recommendation for ETH
curl http://localhost:3000/analyze/ETH

# Get funding rate
curl http://localhost:3000/funding/ETH

# ═══════════════════════════════════════
# LIQUIDATION HUNTER ENDPOINTS
# ═══════════════════════════════════════

# Check if account is liquidatable
curl http://localhost:3000/liquidation/check/0xAccount

# Calculate liquidation profit
curl -X POST http://localhost:3000/liquidation/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "debtAsset": "0xUSDC...",
    "debtAmount": "100000000",
    "collateralAsset": "0xETH...",
    "collateralAmount": "1000000000000000000"
  }'

# Scan all liquidation opportunities
curl http://localhost:3000/liquidation/opportunities

# Simulate liquidation (dry-run)
curl -X POST http://localhost:3000/liquidation/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "targetAccount": "0xAccount...",
    "debtAsset": "0xUSDC...",
    "collateralAsset": "0xETH...",
    "debtAmount": "100000000"
  }'

# Execute liquidation (REAL MONEY - requires private key in .env)
curl -X POST http://localhost:3000/liquidation/execute \
  -H "Content-Type: application/json" \
  -d '{
    "targetAccount": "0xAccount...",
    "debtAsset": "0xUSDC...",
    "collateralAsset": "0xETH...",
    "debtAmount": "100000000"
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

## Documentation

- **[SKILL.md](SKILL.md)** — Detailed specification for AI agents integrating this skill
- **[API.md](API.md)** — Complete HTTP API reference with all 24 endpoints
- This **README** — Getting started guide and usage examples

For implementation details, see SKILL.md which covers:
- All exported functions with signatures
- Contract addresses & ABIs
- Error handling & edge cases
- Best practices for both skills

## Contributing

Issues and PRs welcome! This skill is maintained as part of the **ArbiLink Agentic Bounty** program.

**Before opening a PR:** Please test your changes:
```bash
npm test
npm start    # Verify server starts
```

## Support

- **Issues:** [GitHub Issues](https://github.com/Etzkennyboi/arbitrum-gmx-agent-skill/issues)
- **Discussions:** [GitHub Discussions](https://github.com/Etzkennyboi/arbitrum-gmx-agent-skill/discussions)
- **Bounty Info:** [ArbiLink Bounty](https://arbitrum.io/arbitlink)

## License

MIT License — See [LICENSE](LICENSE)

## Disclaimer

**⚠️ Educational & Experimental Code**

This skill is provided for educational purposes and is part of a bounty submission. 

**Important Warnings:**
1. **Trading Risk** — GMX perpetuals are high-risk. Positions can liquidate instantly. Always use stop-losses.
2. **Flash Loans** — Liquidation Hunter uses flash loans (experimental). Test extensively before production use.
3. **Private Keys** — Never commit `.env` files or private keys. Use environment variables only.
4. **Mainnet** — Only deploy to mainnet with thorough testing and risk management.
5. **Gas Costs** — All transactions cost real gas. Liquidations are only profitable above certain gas prices.
6. **Slippage** — Market execution may have slippage. Use limits and simulation first.

**Not Financial Advice.** This code is for educational use only. Cryptocurrency trading involves risk of total loss. Do not use real funds without understanding the risks.
