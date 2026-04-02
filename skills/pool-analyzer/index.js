// skills/pool-analyzer/index.js
// Analyze GM (Glue Market) liquidity pools

const { GMX } = require('../../lib/constants')
const { getOpenInterest, getMarket } = require('../../lib/gmx')
const { getPrice, marketToPair } = require('../../lib/prices')
const { getTokenBalance } = require('../../lib/arbitrum')

/**
 * Get detailed stats for a single GM liquidity pool
 */
async function getGMPoolStats(marketAddress) {
  const pair = marketToPair(marketAddress)
  const [market, oi, price] = await Promise.all([
    getMarket(marketAddress).catch(() => ({})),
    getOpenInterest(marketAddress).catch(() => ({ longOI: '0', shortOI: '0' })),
    getPrice(pair).catch(() => ({ price: 0 })),
  ])

  if (!market.marketToken) {
    return { error: 'Market not found', marketAddress }
  }

  // Get GM token supply and balances
  const [gmSupply, longBalance, shortBalance] = await Promise.all([
    getTokenBalance(market.marketToken, market.marketToken, 'one').catch(() => ({ raw: '0', formatted: '0' })),
    getTokenBalance(market.longToken, market.marketToken, 'one').catch(() => ({ raw: '0', formatted: '0' })),
    getTokenBalance(market.shortToken, market.marketToken, 'one').catch(() => ({ raw: '0', formatted: '0' })),
  ])

  // TVL = long balance value + short balance value in USD
  const longValue = parseFloat(longBalance.formatted) * price.price
  const shortValue = parseFloat(shortBalance.formatted) * (price.price || 1)
  const tvlUsd = longValue + shortValue

  // Utilization = total OI / TVL
  const totalOI = parseFloat(oi.longOI) + parseFloat(oi.shortOI)
  const utilizationPercent = tvlUsd > 0 ? (totalOI / tvlUsd) * 100 : 0

  // Utilization assessment
  let utilizationStatus
  if (utilizationPercent > 80) {
    utilizationStatus = 'VERY HIGH'
  } else if (utilizationPercent > 60) {
    utilizationStatus = 'HIGH'
  } else if (utilizationPercent > 30) {
    utilizationStatus = 'MODERATE'
  } else {
    utilizationStatus = 'LOW'
  }

  return {
    market: pair,
    marketAddress,
    tvlUsd: tvlUsd.toFixed(2),
    gmTokenSupply: gmSupply.formatted,
    longTokenBalance: longBalance.formatted,
    shortTokenBalance: shortBalance.formatted,
    totalOI: totalOI.toFixed(2),
    utilizationPercent: utilizationPercent.toFixed(2),
    utilizationStatus,
    longOI: oi.longOI,
    shortOI: oi.shortOI,
    indexPrice: price.price.toFixed(2),
  }
}

/**
 * Get stats for all pools, sorted by TVL descending
 */
async function getAllPoolStats() {
  const pools = await Promise.all(
    Object.entries(GMX.MARKETS).map(([, marketAddress]) =>
      getGMPoolStats(marketAddress).catch(err => ({
        error: err.message,
        marketAddress,
      }))
    )
  )

  // Sort by TVL descending
  const sorted = pools
    .filter(p => !p.error)
    .sort((a, b) => parseFloat(b.tvlUsd) - parseFloat(a.tvlUsd))

  return {
    totalPoolCount: sorted.length,
    totalTVL: sorted.reduce((sum, p) => sum + parseFloat(p.tvlUsd), 0).toFixed(2),
    pools: sorted,
  }
}

module.exports = {
  getGMPoolStats,
  getAllPoolStats,
}
