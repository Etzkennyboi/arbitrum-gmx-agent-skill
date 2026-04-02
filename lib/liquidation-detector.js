// lib/liquidation-detector.js
// Real-time liquidation opportunity detection

const { ethers } = require('ethers')
const { AAVE, TOKENS } = require('./constants')
const { getProvider } = require('./arbitrum')

// Aave V3 Pool ABI (relevant functions)
const AAVE_POOL_ABI = [
  'function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)',
  'function getReserveData(address asset) view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 variableBorrowIndex, address interestRateStrategyAddress, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 interestRate) data)',
]

const AAVE_ORACLE_ABI = [
  'function getAssetPrice(address asset) view returns (uint256)',
]

/**
 * Get all accounts with positions in Aave (would need off-chain indexing in production)
 * For now, return mock data demonstrating the concept
 */
async function getAaveAccounts() {
  // In production, this would query The Graph or an indexer
  // For demo: return test accounts
  return []
}

/**
 * Check if a specific account is eligible for liquidation
 */
async function checkIfLiquidatable(accountAddress) {
  try {
    const provider = getProvider()
    const pool = new ethers.Contract(AAVE.POOL, AAVE_POOL_ABI, provider)

    const accountData = await pool.getUserAccountData(accountAddress)
    
    const healthFactor = parseFloat(ethers.formatEther(accountData.healthFactor))

    return {
      accountAddress,
      totalCollateral: ethers.formatUnits(accountData.totalCollateralBase, 8),
      totalDebt: ethers.formatUnits(accountData.totalDebtBase, 8),
      healthFactor: healthFactor.toFixed(4),
      isLiquidatable: healthFactor < 1.0, // Health factor < 1 = liquidatable
      liquidationThreshold: parseFloat(ethers.formatEther(accountData.currentLiquidationThreshold)),
    }
  } catch (error) {
    console.error(`Error checking liquidation for ${accountAddress}:`, error.message)
    return null
  }
}

/**
 * Calculate profit from liquidation
 */
async function calculateLiquidationProfit({
  debtAsset,
  debtAmount,
  collateralAsset,
  collateralAmount,
  liquidationBonus = 0.05,
}) {
  try {
    const provider = getProvider()
    const oracle = new ethers.Contract(AAVE.ORACLE, AAVE_ORACLE_ABI, provider)

    // Get prices
    const [debtPrice, collateralPrice] = await Promise.all([
      oracle.getAssetPrice(debtAsset),
      oracle.getAssetPrice(collateralAsset),
    ])

    const debtValueUSD = debtAmount * parseFloat(ethers.formatUnits(debtPrice, 8))
    const collateralValueUSD = collateralAmount * parseFloat(ethers.formatUnits(collateralPrice, 8)) * (1 + liquidationBonus)

    const profit = collateralValueUSD - debtValueUSD
    const profitPercent = (profit / debtValueUSD) * 100

    return {
      debtValueUSD,
      collateralValueUSD,
      liquidationBonusUSD: collateralAmount * parseFloat(ethers.formatUnits(collateralPrice, 8)) * liquidationBonus,
      profitUSD: profit,
      profitPercent: profitPercent.toFixed(2),
      isProfitable: profit > 50, // Must be >$50 profit
    }
  } catch (error) {
    console.error('Error calculating liquidation profit:', error.message)
    return null
  }
}

/**
 * Scan for all liquidation opportunities
 */
async function scanForOpportunities() {
  console.log('🔍 Scanning for liquidation opportunities...')
  
  // In production, would query indexed accounts
  // For MVP: return empty (would integrate with The Graph)
  const opportunities = []

  return {
    scannedAt: new Date().toISOString(),
    totalOpportunities: opportunities.length,
    opportunities,
  }
}

module.exports = {
  checkIfLiquidatable,
  calculateLiquidationProfit,
  scanForOpportunities,
  getAaveAccounts,
}
