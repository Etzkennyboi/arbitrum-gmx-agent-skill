// skills/liquidation-hunter/index.js
// Liquidation detection and execution skills

const { checkIfLiquidatable, calculateLiquidationProfit, scanForOpportunities } = require('../../lib/liquidation-detector')
const { executeLiquidation, simulateLiquidation } = require('../../lib/flash-loan-executor')

/**
 * Check if account is liquidatable on Aave V3
 */
async function checkLiquidatable(accountAddress) {
  return await checkIfLiquidatable(accountAddress)
}

/**
 * Calculate exact liquidation profit
 */
async function calcProfit(config) {
  return await calculateLiquidationProfit(config)
}

/**
 * Scan all liquidation opportunities
 */
async function findOpportunities() {
  return await scanForOpportunities()
}

/**
 * Simulate liquidation (dry-run)
 */
async function simulate(config) {
  return await simulateLiquidation(config)
}

/**
 * Execute liquidation (real)
 */
async function execute(config) {
  return await executeLiquidation(config)
}

module.exports = {
  checkLiquidatable,
  calcProfit,
  findOpportunities,
  simulate,
  execute,
}
