// skills/strategy/index.js
// Generate trading signals and recommendations

const { GMX } = require('../../lib/constants')
const { getOpenInterest } = require('../../lib/gmx')
const { getPrice, marketToPair } = require('../../lib/prices')
const { getFundingRate } = require('../market-reader/index')
const { getGMPoolStats } = require('../pool-analyzer/index')

/**
 * Analyze a single market and generate trading signals
 *
 * Returns 3 signals:
 * 1. FUNDING_RATE: Based on OI skew and funding direction
 * 2. OI_IMBALANCE: Contrarian signal from long/short ratio
 * 3. POOL_UTILIZATION: Risk signal from pool capacity
 *
 * Aggregates into recommendation: LEAN_LONG | LEAN_SHORT | NEUTRAL | CAUTION
 */
async function analyzeMarket(market) {
  let marketAddress = market
  if (market.length < 10) {
    marketAddress = GMX.MARKETS[`${market}/USD`] || market
  }

  const pair = marketToPair(marketAddress)

  // Fetch all data in parallel
  const [price, oi, fundingData, poolStats] = await Promise.all([
    getPrice(pair).catch(() => ({ price: 0 })),
    getOpenInterest(marketAddress).catch(() => ({ longOI: '0', shortOI: '0' })),
    getFundingRate(marketAddress).catch(() => ({ direction: 'NEUTRAL' })),
    getGMPoolStats(marketAddress).catch(() => ({ utilizationStatus: 'LOW', utilizationPercent: '0' })),
  ])

  const longOI = parseFloat(oi.longOI)
  const shortOI = parseFloat(oi.shortOI)
  const totalOI = longOI + shortOI

  // ========== SIGNAL 1: FUNDING RATE ==========
  // If longs pay shorts (long OI > short OI), it's a bearish indicator
  // If shorts pay longs (short OI > long OI), it's a bullish indicator
  let fundingSignal = 'NEUTRAL'
  let fundingConfidence = 'LOW'

  if (totalOI > 0) {
    const imbalance = Math.abs(longOI - shortOI) / totalOI
    if (fundingData.direction === 'LONGS_PAY' && imbalance > 0.3) {
      fundingSignal = 'LEAN_SHORT'
      fundingConfidence = imbalance > 0.6 ? 'HIGH' : 'MEDIUM'
    } else if (fundingData.direction === 'SHORTS_PAY' && imbalance > 0.3) {
      fundingSignal = 'LEAN_LONG'
      fundingConfidence = imbalance > 0.6 ? 'HIGH' : 'MEDIUM'
    }
  }

  // ========== SIGNAL 2: OI IMBALANCE (CONTRARIAN) ==========
  // Extreme OI imbalance suggests potential squeeze
  // When most are long, contrarian bet is short (and vice versa)
  let oiSignal = 'NEUTRAL'
  let oiConfidence = 'LOW'

  if (totalOI > 0) {
    const imbalance = Math.abs(longOI - shortOI) / totalOI
    if (imbalance > 0.7) {
      // Heavy long bias -> contrarian short
      if (longOI > shortOI) {
        oiSignal = 'LEAN_SHORT'
        oiConfidence = 'MEDIUM'
      } else {
        oiSignal = 'LEAN_LONG'
        oiConfidence = 'MEDIUM'
      }
    } else if (imbalance > 0.4) {
      // Moderate imbalance
      if (longOI > shortOI) {
        oiSignal = 'LEAN_SHORT'
        oiConfidence = 'LOW'
      } else {
        oiSignal = 'LEAN_LONG'
        oiConfidence = 'LOW'
      }
    }
  }

  // ========== SIGNAL 3: POOL UTILIZATION ==========
  // Very high utilization limits liquidity and increases risk
  // High capacity suggests room for positions
  let utilizationSignal = 'NEUTRAL'
  let utilizationConfidence = 'LOW'

  const utilPercent = parseFloat(poolStats.utilizationPercent || 0)
  if (utilPercent > 80) {
    utilizationSignal = 'CAUTION' // Too full, limited capacity
    utilizationConfidence = 'HIGH'
  } else if (utilPercent > 60) {
    utilizationSignal = 'CAUTION'
    utilizationConfidence = 'MEDIUM'
  }
  // If utilization is low, no special signal needed

  // ========== AGGREGATE SIGNALS ==========
  const signals = [fundingSignal, oiSignal, utilizationSignal].filter(s => s !== 'NEUTRAL')

  // Voting logic
  let longs = 0
  let shorts = 0
  let cautions = 0

  if (fundingSignal === 'LEAN_LONG') longs++
  else if (fundingSignal === 'LEAN_SHORT') shorts++

  if (oiSignal === 'LEAN_LONG') longs++
  else if (oiSignal === 'LEAN_SHORT') shorts++

  if (utilizationSignal === 'CAUTION') cautions++

  // Recommendation
  let recommendation = 'NEUTRAL'
  let overallConfidence = 'LOW'

  if (cautions > 0 && (longs > 0 || shorts > 0)) {
    recommendation = 'CAUTION'
    overallConfidence = 'HIGH'
  } else if (longs > shorts && longs > 0) {
    recommendation = 'LEAN_LONG'
    overallConfidence = longs > 1 ? 'MEDIUM' : 'LOW'
  } else if (shorts > longs && shorts > 0) {
    recommendation = 'LEAN_SHORT'
    overallConfidence = shorts > 1 ? 'MEDIUM' : 'LOW'
  } else {
    recommendation = 'NEUTRAL'
    overallConfidence = 'LOW'
  }

  return {
    market: pair,
    marketAddress,
    currentPrice: price.price.toFixed(2),
    signals: {
      fundingRate: {
        signal: fundingSignal,
        confidence: fundingConfidence,
        direction: fundingData.direction,
        dailyRate: fundingData.dailyRate,
        imbalancePercent: totalOI > 0 ? ((Math.abs(longOI - shortOI) / totalOI) * 100).toFixed(1) : '0',
      },
      oiImbalance: {
        signal: oiSignal,
        confidence: oiConfidence,
        longOI: longOI.toFixed(2),
        shortOI: shortOI.toFixed(2),
        ratio: shortOI > 0 ? (longOI / shortOI).toFixed(2) : 'Infinity',
      },
      poolUtilization: {
        signal: utilizationSignal,
        confidence: utilizationConfidence,
        utilizationPercent: (utilPercent).toFixed(2),
        status: poolStats.utilizationStatus,
      },
    },
    recommendation,
    confidence: overallConfidence,
    summary: `${recommendation} with ${overallConfidence} confidence — ${signals.length} signals aligned`,
  }
}

/**
 * Quickly analyze all supported markets
 */
async function analyzeAllMarkets() {
  const markets = await Promise.all(
    Object.entries(GMX.MARKETS).map(([, addr]) =>
      analyzeMarket(addr).catch(err => ({
        error: err.message,
        marketAddress: addr,
      }))
    )
  )

  return {
    timestamp: new Date().toISOString(),
    marketCount: markets.filter(m => !m.error).length,
    markets: markets.filter(m => !m.error),
  }
}

module.exports = {
  analyzeMarket,
  analyzeAllMarkets,
}
