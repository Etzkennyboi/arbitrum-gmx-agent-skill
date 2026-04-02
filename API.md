# API Documentation

Complete HTTP API reference for `arbitrum-gmx-agent-skill`.

## Base URL

```
http://localhost:3000  (Local development)
https://your-app.railway.app  (Production)
```

## Response Format

All endpoints return JSON:

```json
{
  "success": true,
  "data": { /* endpoint-specific data */ },
  "error": null
}
```

On error:

```json
{
  "success": false,
  "data": null,
  "error": "Descriptive error message"
}
```

## Endpoints

### Information

#### `GET /`

Agent manifest and capabilities.

**Response:**
```json
{
  "name": "arbitrum-gmx-agent-skill",
  "version": "1.0.0",
  "description": "AI agent skill for GMX V2...",
  "supportedMarkets": ["ETH/USD", "BTC/USD", "ARB/USD", "SOL/USD", "LINK/USD"],
  "capabilities": ["market-data", "price-feeds", "position-management", ...],
  "endpoints": { /* full endpoint list */ }
}
```

#### `GET /health`

Health check including latest block number.

**Response:**
```json
{
  "status": "healthy",
  "network": "Arbitrum One",
  "latestBlock": 448288840,
  "timestamp": "2026-04-02T14:30:00.000Z",
  "agentId": "123"
}
```

---

### Prices

#### `GET /prices`

All Chainlink price feeds.

**Response:**
```json
{
  "success": true,
  "prices": [
    {
      "pair": "ETH/USD",
      "price": 2041.55,
      "priceRaw": "204155000000000000000",
      "decimals": 8,
      "updatedAt": "2026-04-02T14:29:30.000Z",
      "source": "Chainlink",
      "feedAddress": "0x639Fe6ab..."
    },
    // ... more feeds
  ],
  "errors": []
}
```

#### `GET /prices/:pair`

Single price feed (e.g., `/prices/ETH`)

**Parameters:**
- `pair` (path) — Pair name: `ETH`, `BTC`, `ARB`, `SOL`, `LINK`, `USDC`

**Response:**
```json
{
  "success": true,
  "data": {
    "pair": "ETH/USD",
    "price": 2041.55,
    "updatedAt": "2026-04-02T14:29:30.000Z"
  }
}
```

---

### Markets

#### `GET /markets`

All GMX V2 markets with prices and open interest.

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "name": "ETH/USD",
      "address": "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336",
      "currentPrice": 2041.55,
      "priceUpdatedAt": "2026-04-02T14:29:30.000Z",
      "openInterest": {
        "longOI": "1234567.89",
        "shortOI": "9876543.21",
        "totalOI": "11111111.10",
        "longSkew": "55.0%",
        "shortSkew": "45.0%"
      }
    }
    // ... more markets
  ]
}
```

#### `GET /funding/:market`

Funding rate analysis for a market.

**Parameters:**
- `market` (path) — Market name: `ETH`, `BTC`, `ARB`, `SOL`, `LINK`

**Response:**
```json
{
  "success": true,
  "data": {
    "marketAddress": "0x70d95587...",
    "longOI": "1234567.89",
    "shortOI": "9876543.21",
    "totalOI": "11111111.10",
    "fundingDirection": "LONGS_PAY_SHORTS",
    "skewRatio": "12.50%",
    "estimatedHourlyRate": "0.0625%",
    "estimatedDailyRate": "1.500%",
    "estimatedAnnualRate": "547.5%",
    "recommendation": "Shorts have a funding advantage.",
    "note": "Rates are estimated from OI skew..."
  }
}
```

#### `GET /wallet/:address`

Positions, orders, and balances for a wallet.

**Parameters:**
- `address` (path) — Arbitrum wallet address

**Response:**
```json
{
  "success": true,
  "data": {
    "walletAddress": "0x123...",
    "ethBalance": "1.5",
    "usdcBalance": "1000.00",
    "openPositions": 2,
    "pendingOrders": 1,
    "totalSizeUSD": "5000.00",
    "positions": [
      {
        "market": "0x70d95587...",
        "marketName": "ETH/USD",
        "isLong": true,
        "sizeInUsd": "5000.00",
        "sizeInTokens": "2.45",
        "collateralAmount": "1000.00",
        "leverage": "5.00x"
      }
      // ... more positions
    ],
    "orders": [
      // ... pending orders
    ]
  }
}
```

---

### Pools

#### `GET /pools`

GM pool statistics ranked by TVL.

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "pair": "BTC/USD",
      "gmTokenTotalSupply": "1000",
      "estimatedTVL": "2866804568785.54",
      "utilizationRate": "45.67%",
      "utilizationAssessment": "HIGH — Good fee generation for LPs",
      "longToken": {
        "symbol": "WBTC",
        "balance": "25.50",
        "estimatedValueUSD": "1683425.50"
      },
      "shortToken": {
        "symbol": "USDC",
        "balance": "1185379143.04",
        "estimatedValueUSD": "1185379143.04"
      }
    }
    // ... more pools
  ]
}
```

---

### Analysis & Signals

#### `GET /analyze`

Trading signal analysis for all markets.

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "pair": "ETH/USD",
      "currentPrice": 2041.55,
      "signals": [
        {
          "name": "Funding Rate",
          "direction": "SHORT",
          "strength": "STRONG",
          "detail": "Shorts are paying funding...",
          "data": { "dailyRate": "1.500%", "skew": "12.50%" }
        },
        {
          "name": "OI Imbalance",
          "direction": "LONG",
          "strength": "MODERATE",
          "detail": "Extreme long crowding..."
        }
        // ... more signals
      ],
      "summary": {
        "recommendation": "LEAN_LONG",
        "confidence": "HIGH"
      }
    }
    // ... more markets
  ]
}
```

#### `GET /analyze/:market`

Trading signals for a single market.

**Parameters:**
- `market` (path) — Market name: `ETH`, `BTC`, `ARB`, `SOL`, `LINK`

**Response:** Same as single market from `/analyze`

---

### Position Management

#### `POST /position/long`

Open a long position.

**Body:**
```json
{
  "market": "ETH",
  "collateralUSDC": 100,
  "leverage": 5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "txHash": "0xabcd...",
    "blockNumber": 448288840,
    "market": "0x70d95587...",
    "isLong": true,
    "sizeDeltaUsd": 500,
    "collateralAmount": 100,
    "leverage": "5.00",
    "note": "Order created. A GMX keeper will execute within ~30 seconds."
  }
}
```

#### `POST /position/short`

Open a short position.

**Body:**
```json
{
  "market": "BTC",
  "collateralUSDC": 200,
  "leverage": 2
}
```

**Response:** Same structure as `/position/long`

#### `POST /position/close`

Close an entire position.

**Body:**
```json
{
  "market": "ETH",
  "isLong": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "txHash": "0xabcd...",
    "blockNumber": 448288840,
    "market": "0x70d95587...",
    "isLong": true,
    "sizeClosed": 5000,
    "note": "Decrease order created..."
  }
}
```

#### `GET /liquidation/:address/:market/:direction`

Check liquidation risk for a position.

**Parameters:**
- `address` (path) — Wallet address
- `market` (path) — Market address or name
- `direction` (path) — `long` or `short`

**Response:**
```json
{
  "success": true,
  "data": {
    "hasPosition": true,
    "market": "0x70d95587...",
    "marketName": "ETH/USD",
    "isLong": true,
    "sizeUSD": "5000.00",
    "collateralUSD": "1000.00",
    "leverage": "5.00",
    "currentPrice": "2041.55",
    "estimatedLiquidationPrice": "1632.00",
    "distanceToLiquidation": "20.05%",
    "riskLevel": "MEDIUM",
    "pnl": "245.80",
    "pnlPercent": "24.58%",
    "recommendation": "Monitor closely — position approaching risk zone"
  }
}
```

---

### Monitoring

#### `POST /monitor/start`

Start monitoring a position for liquidation risk.

**Body:**
```json
{
  "walletAddress": "0x123...",
  "market": "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336",
  "isLong": true,
  "checkIntervalMs": 60000,
  "liquidationThreshold": 15,
  "webhookUrl": "https://your-webhook.com/alert"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "monitoring_started",
    "monitorId": "0x123a-0x70d9-long",
    "checkInterval": "60s",
    "liquidationThreshold": "15%",
    "webhookConfigured": true
  }
}
```

#### `POST /monitor/stop`

Stop monitoring a position.

**Body (stop one):**
```json
{
  "monitorId": "0x123a-0x70d9-long"
}
```

**Body (stop all):**
```json
{
  "monitorId": "all"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "stopped",
    "monitorId": "0x123a-0x70d9-long"
  }
}
```

#### `GET /monitor/active`

List all active monitors.

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "monitorId": "0x123a-0x70d9-long",
      "walletAddress": "0x123...",
      "market": "0x70d95587...",
      "isLong": true,
      "startedAt": "2026-04-02T14:00:00.000Z",
      "lastCheck": "2026-04-02T14:01:30.000Z",
      "lastRiskLevel": "MEDIUM",
      "alertsSent": 0
    }
    // ... more monitors
  ]
}
```

---

### Agent Identity

#### `POST /identity/register`

Register agent on Arbitrum identity registry.

**Body:**
```json
{
  "name": "my-arbitrum-agent",
  "description": "AI agent skill for GMX V2 trading",
  "network": "sepolia"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "agentId": "123",
    "txHash": "0xabcd...",
    "blockNumber": 12345,
    "registry": "0x8004A818...",
    "name": "my-arbitrum-agent",
    "network": "sepolia",
    "walletAddress": "0x..."
  }
}
```

#### `GET /identity/:address`

Look up agent registration by wallet address.

**Parameters:**
- `address` (path) — Wallet address
- `network` (query, optional) — `sepolia` or `one` (default: `sepolia`)

**Response:**
```json
{
  "success": true,
  "data": {
    "agentId": "123",
    "name": "my-arbitrum-agent",
    "description": "AI agent skill...",
    "endpoint": "https://...",
    "owner": "0x...",
    "registeredAt": "2026-04-01T10:00:00.000Z"
  }
}
```

---

## Error Codes

| Status | Meaning | Example |
|--------|---------|---------|
| 200 | Success | Market data returned |
| 400 | Bad Request | Invalid market name, missing body |
| 404 | Not Found | Market doesn't exist, no position |
| 500 | Server Error | RPC failure, wallet signing error |

## Rate Limiting

No rate limits on public endpoints. For production deployments, consider adding:

```javascript
const rateLimit = require('express-rate-limit')
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100  // limit each IP to 100 requests per windowMs
})
app.use('/position/', limiter)
```

## Authentication

Currently **no authentication** — all endpoints are public (read) or require wallet signature (write).

For production, add JWT or API key auth:

```javascript
app.post('/position/long', requireAuth, async (req, res) => { ... })
```

---

## Examples

See [AGENTS.md](./AGENTS.md) for detailed examples with cURL and JavaScript.

---

**Last updated:** April 2, 2026
