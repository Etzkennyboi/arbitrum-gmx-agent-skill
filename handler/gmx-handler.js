// handler/gmx-handler.js
// OKX Onchain OS Handler for GMX V2 Trading Suite

const { 
  goLong, 
  goShort, 
  closeFullPosition, 
  analyzeMarket, 
  startMonitoring,
  stopMonitoring 
} = require('../index')

/**
 * Main dispatcher for GMX actions
 */
async function handler(action, input) {
  console.log(`[Handler] Executing action: ${action}`)

  switch (action) {
    case 'trade_long':
      return await handleTradeLong(input)
    case 'trade_short':
      return await handleTradeShort(input)
    case 'close_position':
      return await handleClosePosition(input)
    case 'analyze_market':
      return await handleAnalyzeMarket(input)
    case 'monitor_risk':
      return await handleMonitorRisk(input)
    case 'liquidate_account':
      return await handleLiquidate(input)
    case 'gas_sponsor':
      return await handleGasSponsor(input)
    default:
      throw new Error(`Unknown action: ${action}`)
  }
}

async function handleGasSponsor(input) {
  const { getETHBalance, getWallet } = require('../lib/arbitrum')
  const wallet = getWallet(process.env.AGENT_WALLET_PRIVATE_KEY)
  const balance = await getETHBalance(wallet.address)
  
  const threshold = 0.01 // 0.01 ETH threshold
  const needsRefill = parseFloat(balance.formatted) < threshold

  return {
    success: true,
    data: {
      address: wallet.address,
      balanceETH: balance.formatted,
      needsRefill,
      threshold: threshold.toString(),
      message: needsRefill 
        ? `⚠️ Low on gas. Please deposit at least ${threshold} ETH to ${wallet.address}`
        : `✅ Gas balance healthy.`
    }
  }
}

async function handleLiquidate(input) {
  const { executeLiquidation } = require('../index')
  const result = await executeLiquidation({
    targetAccount: input.targetAccount,
    debtAsset: input.debtAsset,
    collateralAsset: input.collateralAsset,
    debtAmount: input.debtAmount
  })
  return { success: result.success, data: result }
}

async function handleTradeLong(input) {
  // requires AGENT_WALLET_PRIVATE_KEY in environment
  const result = await goLong({
    privateKey: process.env.AGENT_WALLET_PRIVATE_KEY,
    market: input.market,
    collateralUSDC: input.collateralUSDC,
    leverage: input.leverage || 5
  })
  return { success: true, data: result }
}

async function handleTradeShort(input) {
  const result = await goShort({
    privateKey: process.env.AGENT_WALLET_PRIVATE_KEY,
    market: input.market,
    collateralUSDC: input.collateralUSDC,
    leverage: input.leverage || 5
  })
  return { success: true, data: result }
}

async function handleClosePosition(input) {
  const result = await closeFullPosition({
    privateKey: process.env.AGENT_WALLET_PRIVATE_KEY,
    market: input.market,
    isLong: input.isLong
  })
  return { success: true, data: result }
}

async function handleAnalyzeMarket(input) {
  const result = await analyzeMarket(input.market)
  return { success: true, data: result }
}

async function handleMonitorRisk(input) {
  const result = startMonitoring({
    walletAddress: input.walletAddress,
    market: input.market,
    isLong: input.isLong,
    checkIntervalMs: input.checkIntervalMs || 60000,
    liquidationThreshold: input.liquidationThreshold || 10,
    webhookUrl: input.webhookUrl
  })
  return { success: true, data: result }
}

module.exports = { handler }
