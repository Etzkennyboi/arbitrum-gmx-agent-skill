// agent/server.js
// Express HTTP API server for GMX V2 agent skill
// Exposes all core functions via REST endpoints

const express = require('express')
const cors = require('cors')
const { GMX } = require('../lib/constants')

// Import all skills
const {
  // Price feeds
  getPrice,
  getAllPrices,

  // Market Reader
  getAllMarkets,
  getFundingRate,
  getWalletSummary,

  // Position Manager
  goLong,
  goShort,
  closeFullPosition,
  checkLiquidationRisk,

  // Pool Analyzer
  getGMPoolStats,
  getAllPoolStats,

  // Strategy
  analyzeMarket,
  analyzeAllMarkets,

  // Monitor
  startMonitoring,
  stopMonitoring,
  stopAllMonitors,
  getActiveMonitors,

  // Identity
  registerAgent,
  getAgentInfo,
} = require('../index')

const app = express()
const PORT = process.env.PORT || 3000

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors())
app.use(express.json())

// ============================================================
// HELPER: Resolve market parameter
// ============================================================

function resolveMarket(market) {
  // Accept 'ETH', 'BTC', 'eth/usd', full address, etc.
  const upper = market.toUpperCase()

  // Try exact match in GMX.MARKETS
  if (GMX.MARKETS[`${upper}/USD`]) {
    return GMX.MARKETS[`${upper}/USD`]
  }

  // Try extracting symbol
  for (const [key, address] of Object.entries(GMX.MARKETS)) {
    if (key.startsWith(upper)) {
      return address
    }
  }

  // Assume it's already an address
  return market
}

// ============================================================
// GET ENDPOINTS (READ-ONLY)
// ============================================================

/**
 * GET / — Agent manifest and capabilities
 */
app.get('/', (req, res) => {
  res.json({
    name: 'arbitrum-gmx-agent-skill',
    version: '1.0.0',
    description: 'Give any AI agent full GMX V2 trading capabilities on Arbitrum One',
    network: 'arbitrum-one (42161)',
    capabilities: [
      'Get live Chainlink prices (6 feeds)',
      'Query GMX V2 markets and open interest',
      'Open long/short positions with leverage',
      'Close positions and manage orders',
      'Analyze liquidation risk in real-time',
      'Generate AI trading signals (3-signal analysis)',
      'Monitor positions for liquidation alerts',
      'Analyze GM liquidity pools',
      'Register agent on Arbitrum identity registry',
    ],
    author: 'ArbiLink GMX Agent',
    repository: 'https://github.com/yourusername/arbitrum-gmx-agent-skill',
  })
})

/**
 * GET /health — Health check and block number
 */
app.get('/health', async (req, res) => {
  try {
    const { getBlockNumber } = require('../index')
    const blockNumber = await getBlockNumber('one')

    res.json({
      status: 'healthy',
      network: 'arbitrum-one',
      block: blockNumber,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /prices — Get all Chainlink prices
 */
app.get('/prices', async (req, res) => {
  try {
    const prices = await getAllPrices()
    res.json(prices)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /prices/:pair — Get single price (ETH, BTC, ARB, SOL, LINK, USDC)
 */
app.get('/prices/:pair', async (req, res) => {
  try {
    const price = await getPrice(req.params.pair.toUpperCase())
    res.json(price)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /markets — Get all GMX markets with prices and OI
 */
app.get('/markets', async (req, res) => {
  try {
    const markets = await getAllMarkets()
    res.json(markets)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /funding/:market — Get funding rate for a market
 */
app.get('/funding/:market', async (req, res) => {
  try {
    const marketAddress = resolveMarket(req.params.market)
    const funding = await getFundingRate(marketAddress)
    res.json(funding)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /wallet/:address — Get position summary for wallet
 */
app.get('/wallet/:address', async (req, res) => {
  try {
    const summary = await getWalletSummary(req.params.address)
    res.json(summary)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /pools — Get GM pool stats ranked by TVL
 */
app.get('/pools', async (req, res) => {
  try {
    const pools = await getAllPoolStats()
    res.json(pools)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /analyze — Analyze all markets for trading signals
 */
app.get('/analyze', async (req, res) => {
  try {
    const analysis = await analyzeAllMarkets()
    res.json(analysis)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /analyze/:market — Analyze single market
 */
app.get('/analyze/:market', async (req, res) => {
  try {
    const marketAddress = resolveMarket(req.params.market)
    const analysis = await analyzeMarket(marketAddress)
    res.json(analysis)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /liquidation/:address/:market/:direction — Check liquidation risk
 */
app.get('/liquidation/:address/:market/:direction', async (req, res) => {
  try {
    const isLong = req.params.direction.toLowerCase() === 'long'
    const marketAddress = resolveMarket(req.params.market)
    const risk = await checkLiquidationRisk(req.params.address, marketAddress, isLong)
    res.json(risk)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /monitor/active — Get all active liquidation monitors
 */
app.get('/monitor/active', (req, res) => {
  const active = getActiveMonitors()
  res.json(active)
})

/**
 * GET /identity/:address — Look up agent by wallet address
 */
app.get('/identity/:address', async (req, res) => {
  try {
    const agent = await getAgentByAddress(req.params.address, 'sepolia')
    res.json(agent)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ============================================================
// POST ENDPOINTS (WRITE OPERATIONS)
// ============================================================

/**
 * POST /position/long — Open a long position
 * Body: { market, collateralUSDC, leverage }
 */
app.post('/position/long', async (req, res) => {
  try {
    const { market, collateralUSDC, leverage } = req.body

    if (!process.env.AGENT_WALLET_PRIVATE_KEY) {
      return res.status(400).json({ error: 'AGENT_WALLET_PRIVATE_KEY not set in .env' })
    }

    const marketAddress = resolveMarket(market)
    const result = await goLong({
      privateKey: process.env.AGENT_WALLET_PRIVATE_KEY,
      market: marketAddress,
      collateralUSDC: parseFloat(collateralUSDC),
      leverage: parseFloat(leverage) || 5,
    })

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /position/short — Open a short position
 * Body: { market, collateralUSDC, leverage }
 */
app.post('/position/short', async (req, res) => {
  try {
    const { market, collateralUSDC, leverage } = req.body

    if (!process.env.AGENT_WALLET_PRIVATE_KEY) {
      return res.status(400).json({ error: 'AGENT_WALLET_PRIVATE_KEY not set in .env' })
    }

    const marketAddress = resolveMarket(market)
    const result = await goShort({
      privateKey: process.env.AGENT_WALLET_PRIVATE_KEY,
      market: marketAddress,
      collateralUSDC: parseFloat(collateralUSDC),
      leverage: parseFloat(leverage) || 5,
    })

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /position/close — Close a position
 * Body: { market, isLong }
 */
app.post('/position/close', async (req, res) => {
  try {
    const { market, isLong } = req.body

    if (!process.env.AGENT_WALLET_PRIVATE_KEY) {
      return res.status(400).json({ error: 'AGENT_WALLET_PRIVATE_KEY not set in .env' })
    }

    const marketAddress = resolveMarket(market)
    const result = await closeFullPosition({
      privateKey: process.env.AGENT_WALLET_PRIVATE_KEY,
      market: marketAddress,
      isLong,
    })

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /monitor/start — Start liquidation monitoring
 * Body: { walletAddress, market, isLong, checkIntervalMs, liquidationThreshold, webhookUrl }
 */
app.post('/monitor/start', (req, res) => {
  try {
    const { walletAddress, market, isLong, checkIntervalMs, liquidationThreshold, webhookUrl } = req.body

    const marketAddress = resolveMarket(market)
    const result = startMonitoring({
      walletAddress,
      market: marketAddress,
      isLong,
      checkIntervalMs,
      liquidationThreshold,
      webhookUrl,
    })

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /monitor/stop — Stop a monitor
 * Body: { monitorId } or { monitorId: "all" }
 */
app.post('/monitor/stop', (req, res) => {
  try {
    const { monitorId } = req.body

    if (monitorId === 'all') {
      const result = stopAllMonitors()
      res.json(result)
    } else {
      const result = stopMonitoring(monitorId)
      res.json(result)
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /identity/register — Register agent on Arbitrum registry
 * Body: { name, description, network }
 */
app.post('/identity/register', async (req, res) => {
  try {
    const { name, description, network } = req.body

    if (!process.env.AGENT_WALLET_PRIVATE_KEY) {
      return res.status(400).json({ error: 'AGENT_WALLET_PRIVATE_KEY not set in .env' })
    }

    if (!process.env.AGENT_ENDPOINT) {
      return res.status(400).json({ error: 'AGENT_ENDPOINT not set in .env (e.g., https://agent-xyz.railway.app)' })
    }

    const result = await registerAgent(
      process.env.AGENT_WALLET_PRIVATE_KEY,
      name || 'GMX Trading Agent',
      description || 'AI-powered GMX V2 perpetuals trader',
      process.env.AGENT_ENDPOINT,
      network || 'sepolia'
    )

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ============================================================
// ERROR HANDLERS
// ============================================================

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' })
})

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(`🚀 GMX Agent API running on http://localhost:${PORT}`)
  console.log(`📖 Manifest: GET http://localhost:${PORT}/`)
  console.log(`🔍 Health: GET http://localhost:${PORT}/health`)
  console.log(`📊 Markets: GET http://localhost:${PORT}/markets`)
  console.log(`💹 Prices: GET http://localhost:${PORT}/prices`)
})
