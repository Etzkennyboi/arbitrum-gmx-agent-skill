# Deployment to Railway

Complete guide for deploying your GMX agent to Railway with environment configuration and health checks.

## Networks

| Network | Chain ID | RPC | Explorer |
|---------|----------|-----|----------|
| Arbitrum One | 42161 | https://arb1.arbitrum.io/rpc | https://arbiscan.io |
| Arbitrum Sepolia | 421614 | https://sepolia-rollup.arbitrum.io/rpc | https://sepolia.arbiscan.io |

## .env File

```bash
# .env — NEVER commit this file to version control
AGENT_WALLET_PRIVATE_KEY=0x...
ARBITRUM_ONE_RPC=https://arb1.arbitrum.io/rpc
ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
AGENT_ENDPOINT=https://your-app.railway.app
AGENT_ID=
PORT=3000
```

## Railway Deployment Steps

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

### Step 2: Login + Initialize

```bash
railway login
railway init
```

### Step 3: Create railway.toml

Create `railway.toml` in your project root:

```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "node src/index.js"
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

### Step 4: Set Environment Variables

```bash
railway variables set AGENT_WALLET_PRIVATE_KEY=0x...
railway variables set ARBITRUM_ONE_RPC=https://arb1.arbitrum.io/rpc
railway variables set ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
railway variables set AGENT_ID=<your-agent-id>
railway variables set PORT=3000
```

### Step 5: Deploy

```bash
railway up
```

### Step 6: Get Public URL

```bash
railway domain
# → https://your-app.railway.app
```

### Step 7: Verify Health Endpoint

```bash
curl https://your-app.railway.app/health
```

Expected response:

```json
{
  "status": "ok",
  "agent": "arbitrum-gmx-agent",
  "timestamp": "2026-04-02T00:00:00.000Z"
}
```

## Example Express Server

```javascript
// src/index.js
require("dotenv").config()
const express = require("express")
const cors = require("cors")
const { ethers } = require("ethers")

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3000

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    agent: "arbitrum-gmx-agent",
    timestamp: new Date().toISOString(),
  })
})

// Prices endpoint
app.get("/prices", async (req, res) => {
  try {
    const { pairs } = req.query
    const pairList = pairs ? pairs.split(",") : ["ETH/USD", "BTC/USD", "ARB/USD"]
    
    const prices = await getAllPrices(pairList)
    res.json({ prices })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Market data endpoint
app.get("/markets", async (req, res) => {
  try {
    const overview = await getMarketOverview()
    res.json({ markets: overview })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Start server
app.listen(PORT, () => {
  console.log(`Agent listening on port ${PORT}`)
  console.log(`Health: http://localhost:${PORT}/health`)
})
```

## Post-Deployment Checklist

- ✅ Server responds at `/health` with 200 OK
- ✅ Price feeds return data at `/prices`
- ✅ Market data returns at `/markets`
- ✅ Agent registered on Arbitrum Sepolia registry
- ✅ Agent endpoint updated to Railway URL via `updateEndpoint()`
- ✅ `.env` NOT committed to git — verify with `git status`
- ✅ Private key only in Railway variables environment, not in code
- ✅ Monitoring loop running and detecting positions
- ✅ Discord/webhook alerts configured (if applicable)

## Testnet Faucets

| Faucet | URL |
|--------|-----|
| QuickNode Arbitrum Sepolia | https://faucet.quicknode.com/arbitrum/sepolia |
| Alchemy Arbitrum Sepolia | https://www.alchemy.com/faucets/arbitrum-sepolia |

## Monitoring Logs

View logs from Railway:

```bash
railway logs
# Follow logs in real-time
railway logs --tail
```

## Scaling & Performance

- **Memory:** Start with 512MB (default). Increase to 1GB if handling many positions.
- **CPU:** 0.5 vCPU (default) is sufficient for read-heavy workloads.
- **Concurrency:** Use `Promise.allSettled()` for reading multiple markets to avoid rate limits.

## Troubleshooting

### Deploy fails with "permission denied"

```bash
# Check Railway CLI permissions
railway whoami
# Re-login if needed
railway logout
railway login
```

### Health endpoint times out

Ensure your server starts within 30 seconds. Add startup logging:

```javascript
app.listen(PORT, () => {
  console.log(`✅ Server started on port ${PORT}`)
})
```

### Environment variables not set

```bash
# Verify variables
railway variables

# Redeploy after setting
railway up --force
```
