// lib/prices.js
// Chainlink price feeds on Arbitrum One

const { ethers } = require('ethers')
const { PRICE_FEEDS, AGGREGATOR_ABI, GMX } = require('./constants')
const { getProvider } = require('./arbitrum')

/**
 * Get the current price for a pair from Chainlink
 * @param {string} pair - e.g. 'ETH/USD', 'BTC/USD', or just 'ETH', 'BTC'
 */
async function getPrice(pair) {
  // Normalize input: if just symbol, convert to pair
  let normalizedPair = pair.toUpperCase()
  if (!normalizedPair.includes('/')) {
    normalizedPair = `${normalizedPair}/USD`
  }

  const feedAddress = PRICE_FEEDS[normalizedPair]
  if (!feedAddress) {
    throw new Error(`No price feed found for pair: ${normalizedPair}. Available: ${Object.keys(PRICE_FEEDS).join(', ')}`)
  }

  const provider = getProvider('one')
  const feed = new ethers.Contract(feedAddress, AGGREGATOR_ABI, provider)

  const [roundData, decimals] = await Promise.all([
    feed.latestRoundData(),
    feed.decimals(),
  ])

  const price = parseFloat(ethers.formatUnits(roundData.answer, decimals))

  return {
    pair: normalizedPair,
    price,
    priceRaw: roundData.answer.toString(),
    decimals: Number(decimals),
    roundId: roundData.roundId.toString(),
    updatedAt: new Date(Number(roundData.updatedAt) * 1000).toISOString(),
    source: 'Chainlink',
    feedAddress,
  }
}

/**
 * Get all supported prices
 */
async function getAllPrices() {
  const pairs = Object.keys(PRICE_FEEDS)

  const results = await Promise.allSettled(
    pairs.map(pair => getPrice(pair))
  )

  return results.map((result, i) => {
    if (result.status === 'fulfilled') {
      return { ...result.value, status: 'fulfilled' }
    } else {
      return { pair: pairs[i], error: result.reason.message, status: 'rejected' }
    }
  })
}

/**
 * Get price for GMX market operations
 * Returns price formatted for GMX (30 decimals for USD values)
 */
async function getPriceForGMX(pair) {
  const priceData = await getPrice(pair)
  return {
    ...priceData,
    // GMX uses 30-decimal precision for USD values
    priceGMX30: ethers.parseUnits(priceData.price.toFixed(12), 30),
    // min/max with small spread for oracle-style pricing
    minPrice: ethers.parseUnits((priceData.price * 0.999).toFixed(12), 30),
    maxPrice: ethers.parseUnits((priceData.price * 1.001).toFixed(12), 30),
  }
}

/**
 * Map a market address to a price feed pair name
 */
function marketToPair(marketAddress) {
  const entry = Object.entries(GMX.MARKETS).find(
    ([, addr]) => addr.toLowerCase() === marketAddress.toLowerCase()
  )
  return entry ? entry[0] : null
}

module.exports = {
  getPrice,
  getAllPrices,
  getPriceForGMX,
  marketToPair,
}
