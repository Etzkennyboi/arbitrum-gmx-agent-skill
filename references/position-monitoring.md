# Position Monitoring & Liquidation Risk

Real-time monitoring of positions with liquidation risk assessment and alert generation.

## Liquidation Risk Checker

```javascript
async function checkLiquidationRisk(walletAddress, marketAddress, isLong) {
  const positions = await getPositions(walletAddress)
  const position  = positions.find(
    p => p.market.toLowerCase() === marketAddress.toLowerCase()
      && p.isLong === isLong
  )
  if (!position) return { hasPosition: false }

  const pair         = marketToPair(marketAddress)
  const priceData    = await getPrice(pair)
  const currentPrice = priceData.price

  const sizeUSD      = position.sizeInUsd
  const sizeInTokens = position.sizeInTokens
  const entryPrice   = sizeInTokens > 0
    ? sizeUSD / sizeInTokens : currentPrice

  // Determine if collateral is USDC or the index token
  const USDC_ADDR = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
  const isUSDC    = position.collateralToken.toLowerCase()
                 === USDC_ADDR.toLowerCase()
  const collateralUSD = isUSDC
    ? position.collateralAmount
    : position.collateralAmount * currentPrice

  const leverage = collateralUSD > 0 ? sizeUSD / collateralUSD : 0

  // GMX liquidates when losses consume ~90% of collateral
  const maxLossPercent    = 0.9
  const priceMoveTolerated = (collateralUSD * maxLossPercent) / sizeUSD

  const liquidationPrice = isLong
    ? entryPrice * (1 - priceMoveTolerated)
    : entryPrice * (1 + priceMoveTolerated)

  const distanceToLiquidation = isLong
    ? ((currentPrice - liquidationPrice) / currentPrice) * 100
    : ((liquidationPrice - currentPrice) / currentPrice) * 100

  const pnl = isLong
    ? sizeInTokens * (currentPrice - entryPrice)
    : sizeInTokens * (entryPrice   - currentPrice)

  const riskLevel =
    distanceToLiquidation < 5  ? "CRITICAL" :
    distanceToLiquidation < 15 ? "HIGH"     :
    distanceToLiquidation < 30 ? "MEDIUM"   : "LOW"

  return {
    hasPosition: true,
    isLong,
    sizeUSD:                 sizeUSD.toFixed(2),
    leverage:                leverage.toFixed(2),
    entryPrice:              entryPrice.toFixed(2),
    currentPrice:            currentPrice.toFixed(2),
    pnl:                     pnl.toFixed(2),
    estimatedLiquidationPrice: liquidationPrice.toFixed(2),
    distanceToLiquidation:   `${distanceToLiquidation.toFixed(2)}%`,
    riskLevel,
    recommendation:
      riskLevel === "CRITICAL" ? "🔴 CLOSE IMMEDIATELY"
    : riskLevel === "HIGH"     ? "🟠 Reduce size or add collateral"
    : riskLevel === "MEDIUM"   ? "🟡 Monitor closely"
    :                            "🟢 Position healthy",
    note: "Estimate. Actual liquidation includes fees and funding.",
  }
}
```

## Monitoring Loop

```javascript
function startMonitor({
  walletAddress,
  marketAddress,
  isLong,
  intervalMs = 60000,              // Poll every 60 seconds
  liquidationThresholdPercent = 15,
  onAlert = console.log,
}) {
  console.log(`Starting monitor for ${isLong ? "LONG" : "SHORT"}`)

  const timer = setInterval(async () => {
    try {
      const risk     = await checkLiquidationRisk(
        walletAddress, marketAddress, isLong
      )
      if (!risk.hasPosition) {
        console.log("Position closed. Stopping monitor.")
        clearInterval(timer)
        return
      }

      const distance = parseFloat(risk.distanceToLiquidation)
      if (distance < liquidationThresholdPercent) {
        onAlert({
          type:                "LIQUIDATION_WARNING",
          riskLevel:           risk.riskLevel,
          distanceToLiquidation: risk.distanceToLiquidation,
          currentPrice:        risk.currentPrice,
          liquidationPrice:    risk.estimatedLiquidationPrice,
          recommendation:      risk.recommendation,
          timestamp:           new Date().toISOString(),
        })
      } else {
        console.log(
          `${new Date().toISOString()} — ${risk.riskLevel}`,
          `— Distance: ${risk.distanceToLiquidation}`
        )
      }
    } catch (err) {
      console.error("Monitor error:", err.message)
    }
  }, intervalMs)

  return { stop: () => clearInterval(timer) }
}
```

## Strategy Signal Analysis

```javascript
async function analyzeMarket(pair) {
  const marketAddress = MARKETS[pair]
  const [price, funding, oi] = await Promise.all([
    getPrice(pair),
    estimateFundingRate(marketAddress),
    getOpenInterest(marketAddress),
  ])

  const signals = []

  // Funding rate signal
  if (funding.fundingDirection !== "NEUTRAL") {
    signals.push({
      name:   "Funding Rate",
      favors: funding.fundingDirection === "SHORTS_PAY_LONGS" ? "LONG" : "SHORT",
      detail: `${funding.fundingDirection} — daily: ${funding.estimatedDailyRate}`,
    })
  }

  // Contrarian OI signal
  const ratio = parseFloat(oi.shortOI) > 0
    ? parseFloat(oi.longOI) / parseFloat(oi.shortOI) : 1

  if (ratio > 2) {
    signals.push({ name: "OI Imbalance", favors: "SHORT",
      detail: `Ratio ${ratio.toFixed(2)} — extreme long crowding` })
  } else if (ratio < 0.5) {
    signals.push({ name: "OI Imbalance", favors: "LONG",
      detail: `Ratio ${ratio.toFixed(2)} — extreme short crowding` })
  }

  const longSignals  = signals.filter(s => s.favors === "LONG").length
  const shortSignals = signals.filter(s => s.favors === "SHORT").length

  return {
    pair,
    price:          price.price,
    signals,
    recommendation: longSignals > shortSignals  ? "LEAN_LONG"
                  : shortSignals > longSignals  ? "LEAN_SHORT" : "NEUTRAL",
    disclaimer: "Algorithmic analysis from on-chain data. Not financial advice.",
  }
}
```

## Alert Integration Example (Discord Webhook)

```javascript
async function sendDiscordAlert(alert, webhookUrl) {
  const color = 
    alert.riskLevel === "CRITICAL" ? 16711680 : // Red
    alert.riskLevel === "HIGH" ? 16753920 : // Orange
    16776960 // Yellow

  const payload = {
    embeds: [{
      title: `⚠️ ${alert.riskLevel} - Liquidation Risk`,
      color,
      fields: [
        { name: "Price", value: `$${alert.currentPrice}`, inline: true },
        { name: "Liquidation Price", value: `$${alert.liquidationPrice}`, inline: true },
        { name: "Distance", value: alert.distanceToLiquidation, inline: true },
        { name: "Recommendation", value: alert.recommendation },
      ],
      timestamp: new Date(),
    }]
  }

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
}
```
