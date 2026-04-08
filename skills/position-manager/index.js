// skills/position-manager/index.js
// Open/close positions and assess liquidation risk

const { GMX } = require('../../lib/constants')
const {
  getAccountPositions,
  createIncreaseOrder,
  createDecreaseOrder,
  getOpenInterest,
} = require('../../lib/gmx')
const { getPrice, marketToPair } = require('../../lib/prices')

/**
 * Open a long position
 * Applies 1% slippage to acceptable price
 */
async function goLong({
  privateKey,
  market,             // 'ETH', 'BTC', or full address
  collateralUSDC,     // amount in USDC (6 decimals)
  leverage = 5,
}) {
  // Resolve market address
  let marketAddress = market
  if (market.length < 10) {
    marketAddress = GMX.MARKETS[`${market}/USD`] || market
  }

  const pair = marketToPair(marketAddress)
  const price = await getPrice(pair)

  // Calculate acceptable price with 1% slippage
  const acceptablePrice = price.price * 0.99

  // Position size = collateral * leverage
  const sizeDeltaUsd = collateralUSDC * leverage

  console.log(`[goLong] ${pair} | Collateral: $${collateralUSDC} | Leverage: ${leverage}x | Size: $${sizeDeltaUsd.toFixed(2)}`)

  const result = await createIncreaseOrder({
    privateKey,
    marketAddress,
    isLong: true,
    collateralTokenAddress: GMX.TOKENS.USDC,
    collateralAmount: collateralUSDC,
    collateralDecimals: 6,
    sizeDeltaUsd: sizeDeltaUsd.toFixed(0),
    acceptablePriceUsd: acceptablePrice.toFixed(2),
    executionFeeEth: '0.0012',
  })

  return result
}

/**
 * Open a short position
 */
async function goShort({
  privateKey,
  market,
  collateralUSDC,
  leverage = 5,
}) {
  // Resolve market
  let marketAddress = market
  if (market.length < 10) {
    marketAddress = GMX.MARKETS[`${market}/USD`] || market
  }

  const pair = marketToPair(marketAddress)
  const price = await getPrice(pair)

  // For short, acceptable price is 1% higher (less favorable)
  const acceptablePrice = price.price * 1.01

  const sizeDeltaUsd = collateralUSDC * leverage

  console.log(`[goShort] ${pair} | Collateral: $${collateralUSDC} | Leverage: ${leverage}x | Size: $${sizeDeltaUsd.toFixed(2)}`)

  const result = await createIncreaseOrder({
    privateKey,
    marketAddress,
    isLong: false,
    collateralTokenAddress: GMX.TOKENS.USDC,
    collateralAmount: collateralUSDC,
    collateralDecimals: 6,
    sizeDeltaUsd: sizeDeltaUsd.toFixed(0),
    acceptablePriceUsd: acceptablePrice.toFixed(2),
    executionFeeEth: '0.0012',
  })

  return result
}

/**
 * Close an entire position
 */
async function closeFullPosition({
  privateKey,
  market,
  isLong,
}) {
  // Resolve market
  let marketAddress = market
  if (market.length < 10) {
    marketAddress = GMX.MARKETS[`${market}/USD`] || market
  }

  // Get position to know its size
  // For now, we'll use a large number and let GMX handle it
  // In production, query the position to get exact size
  const pair = marketToPair(marketAddress)
  const price = await getPrice(pair)

  // Both long and short close at market price (accept any price)
  const acceptablePrice = price.price

  console.log(`[closeFullPosition] ${pair} | Direction: ${isLong ? 'LONG' : 'SHORT'}`)

  const result = await createDecreaseOrder({
    privateKey,
    marketAddress,
    isLong,
    collateralTokenAddress: GMX.TOKENS.USDC,
    sizeDeltaUsd: '999999999', // Large number; GMX will close what exists
    acceptablePriceUsd: acceptablePrice.toFixed(2),
    executionFeeEth: '0.0012',
  })

  return result
}

/**
 * Assess liquidation risk for a position
 *
 * Returns: {
 *   riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
 *   distanceToLiquidation: percentage,
 *   liquidationPrice: number,
 *   entryPrice: number,
 *   pnl: number,
 *   recommendation: string
 * }
 */
async function checkLiquidationRisk(walletAddress, marketAddress, isLong) {
  const pair = marketToPair(marketAddress)

  // Get position
  const positions = await getAccountPositions(walletAddress)
  const position = positions.find(
    p => p.market.toLowerCase() === marketAddress.toLowerCase() && p.isLong === isLong
  )

  if (!position) {
    return {
      walletAddress,
      market: pair,
      isLong,
      error: 'No open position found',
      riskLevel: 'N/A',
    }
  }

  const currentPrice = await getPrice(pair).then(p => p.price)
  const sizeInUsd = parseFloat(position.sizeInUsd)
  const sizeInTokens = parseFloat(position.sizeInTokens)
  const collateral = parseFloat(position.collateralAmount)
  const leverage = sizeInUsd / collateral

  // Real entry price derived from contract data
  const entryPrice = sizeInUsd / sizeInTokens

  // Liquidation typically occurs when loss exceeds ~90% of collateral 
  // (leaving ~10% for the liquidator/protocol)
  // For conservatism, we assume liquidation at 9% distance from current if no info,
  // but better to use the 90% collateral loss formula.
  const maxLoss = collateral * 0.9 
  
  // Change in price required to lose maxLoss
  // sizeInTokens * deltaPrice = maxLoss
  const deltaPriceToLiq = maxLoss / sizeInTokens

  let liquidationPrice
  if (isLong) {
    liquidationPrice = entryPrice - deltaPriceToLiq
  } else {
    liquidationPrice = entryPrice + deltaPriceToLiq
  }

  // Distance from current price to liquidation price
  const distancePercent = Math.abs(currentPrice - liquidationPrice) / currentPrice * 100

  // PnL calculation
  let pnlPercent = 0
  if (isLong) {
    pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100
  } else {
    pnlPercent = ((entryPrice - currentPrice) / entryPrice) * 100
  }

  const pnlUsd = (pnlPercent / 100) * sizeInUsd

  // Risk level
  let riskLevel
  if (distancePercent < 2) {
    riskLevel = 'CRITICAL'
  } else if (distancePercent < 5) {
    riskLevel = 'HIGH'
  } else if (distancePercent < 15) {
    riskLevel = 'MEDIUM'
  } else {
    riskLevel = 'LOW'
  }

  const recommendation = riskLevel === 'CRITICAL' || riskLevel === 'HIGH'
    ? `⚠️ CLOSE POSITION IMMEDIATELY — Liquidation is ${distancePercent.toFixed(1)}% away`
    : riskLevel === 'MEDIUM'
      ? '⚠️ Position at moderate risk — consider adding collateral or reducing size'
      : '✅ Position healthy'

  return {
    walletAddress,
    market: pair,
    marketAddress,
    isLong,
    currentPrice: currentPrice.toFixed(2),
    entryPrice: entryPrice.toFixed(2),
    liquidationPrice: liquidationPrice.toFixed(2),
    distanceToLiquidation: distancePercent.toFixed(2),
    distanceToLiquidationPercent: `${distancePercent.toFixed(1)}%`,
    leverage: leverage.toFixed(1),
    sizeUsd: position.sizeInUsd,
    collateral: position.collateralAmount,
    riskLevel,
    pnlUsd: pnlUsd.toFixed(2),
    pnlPercent: pnlPercent.toFixed(2),
    recommendation,
  }
}

module.exports = {
  goLong,
  goShort,
  closeFullPosition,
  checkLiquidationRisk,
}
