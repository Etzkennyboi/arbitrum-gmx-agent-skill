// skills/market-reader/index.js
// Read market data, funding rates, wallet positions

const { GMX } = require('../../lib/constants')
const { getOpenInterest, getAccountPositions, getAccountOrders } = require('../../lib/gmx')
const { getPrice, getPriceForGMX } = require('../../lib/prices')
const { getETHBalance, getTokenBalance } = require('../../lib/arbitrum')

/**
 * Get all supported markets with current prices and OI
 */
async function getAllMarkets() {
  const markets = {}

  for (const [pair, address] of Object.entries(GMX.MARKETS)) {
    const [price, oi] = await Promise.all([
      getPrice(pair).catch(() => ({ price: 0 })),
      getOpenInterest(address).catch(() => ({ longOI: '0', shortOI: '0', totalOI: '0' })),
    ])

    markets[pair] = {
      pair,
      marketAddress: address,
      price: price.price || 0,
      longOI: parseFloat(oi.longOI) || 0,
      shortOI: parseFloat(oi.shortOI) || 0,
      totalOI: parseFloat(oi.totalOI) || 0,
      longSkew: oi.longSkew || '50.0%',
      shortSkew: oi.shortSkew || '50.0%',
    }
  }

  return markets
}

/**
 * Estimate funding rate for a market from open interest imbalance
 * GMX V2 uses adaptive rates — this estimates based on OI skew
 *
 * When long OI > short OI, longs pay shorts (negative rate for longs)
 */
async function getFundingRate(marketAddress) {
  const oi = await getOpenInterest(marketAddress)
  const market = Object.entries(GMX.MARKETS).find(
    ([, addr]) => addr.toLowerCase() === marketAddress.toLowerCase()
  )?.[0] || marketAddress

  const longOI = parseFloat(oi.longOI)
  const shortOI = parseFloat(oi.shortOI)
  const totalOI = longOI + shortOI

  // If no OI, no funding
  if (totalOI === 0) {
    return {
      market,
      marketAddress,
      direction: 'NEUTRAL',
      hourlyRate: '0.000%',
      dailyRate: '0.000%',
      annualizedRate: '0.000%',
      skewRatio: '1.00',
      note: 'No open interest',
    }
  }

  const skewRatio = longOI / shortOI || 0
  const skewFraction = Math.abs(longOI - shortOI) / totalOI

  // Estimated funding: ~0.01% per day per 10% skew (conservative estimate)
  const dailyRate = skewFraction * 0.1 // up to 10% daily if 100% skew
  const hourlyRate = dailyRate / 24
  const annualRate = dailyRate * 365

  const direction = longOI > shortOI ? 'LONGS_PAY' : shortOI > longOI ? 'SHORTS_PAY' : 'NEUTRAL'

  return {
    market,
    marketAddress,
    direction,
    hourlyRate: `${(hourlyRate * 100).toFixed(4)}%`,
    dailyRate: `${(dailyRate * 100).toFixed(4)}%`,
    annualizedRate: `${(annualRate * 100).toFixed(2)}%`,
    skewRatio: skewRatio.toFixed(2),
    longOI: longOI.toFixed(2),
    shortOI: shortOI.toFixed(2),
    imbalance: `${(skewFraction * 100).toFixed(1)}%`,
  }
}

/**
 * Get wallet summary: positions, orders, balances
 */
async function getWalletSummary(walletAddress) {
  const [positions, orders, ethBal, usdcBal] = await Promise.all([
    getAccountPositions(walletAddress).catch(() => []),
    getAccountOrders(walletAddress).catch(() => []),
    getETHBalance(walletAddress, 'one').catch(() => ({ raw: '0', formatted: '0' })),
    getTokenBalance(GMX.TOKENS.USDC, walletAddress, 'one').catch(() => ({ raw: '0', formatted: '0' })),
  ])

  return {
    walletAddress,
    positions: {
      count: positions.length,
      total_size_usd: positions.reduce((sum, p) => sum + parseFloat(p.sizeInUsd || 0), 0).toFixed(2),
      list: positions,
    },
    orders: {
      count: orders.length,
      list: orders,
    },
    balances: {
      ETH: usdcBal.formatted || '0',
      USDC: usdcBal.formatted || '0',
    },
  }
}

module.exports = {
  getAllMarkets,
  getFundingRate,
  getWalletSummary,
}
