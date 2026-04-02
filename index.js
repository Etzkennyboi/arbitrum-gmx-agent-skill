// index.js
// Main entry point — exports all 30+ public functions for Claude/Antigravity agents

// ============================================================
// LIB EXPORTS (Core blockchain interactions)
// ============================================================

// arbitrum.js
const { getProvider, getWallet, getETHBalance, getTokenBalance, waitForTx, getBlockNumber } = require('./lib/arbitrum')

// prices.js
const { getPrice, getAllPrices, getPriceForGMX, marketToPair } = require('./lib/prices')

// gmx.js
const {
  getMarket,
  getOpenInterest,
  getAccountPositions,
  getAccountOrders,
  createIncreaseOrder,
  createDecreaseOrder,
  cancelOrder,
} = require('./lib/gmx')

// identity.js
const { registerAgent, getAgentInfo, getAgentByAddress, updateEndpoint } = require('./lib/identity')

// constants
const { GMX, TOKENS, CHAINLINK, REGISTRY, ORDER_TYPE, DECREASE_POSITION_SWAP_TYPE } = require('./lib/constants')

// ============================================================
// SKILLS EXPORTS (Business logic)
// ============================================================

// Market Reader
const { getAllMarkets, getFundingRate: getFundingRateFromMarketReader, getWalletSummary } = require('./skills/market-reader')

// Position Manager
const { goLong, goShort, closeFullPosition, checkLiquidationRisk } = require('./skills/position-manager')

// Pool Analyzer
const { getGMPoolStats, getAllPoolStats } = require('./skills/pool-analyzer')

// Strategy
const { analyzeMarket, analyzeAllMarkets } = require('./skills/strategy')

// Monitor
const {
  startMonitoring,
  stopMonitoring,
  stopAllMonitors,
  getActiveMonitors,
  sendWebhook,
} = require('./skills/monitor')

// Liquidation Hunter
const {
  checkLiquidatable,
  calcProfit,
  findOpportunities,
  simulate,
  execute,
} = require('./skills/liquidation-hunter')

// ============================================================
// PUBLIC MODULE EXPORTS
// ============================================================

module.exports = {
  // ========== LIB ==========

  // Arbitrum helpers
  getProvider,
  getWallet,
  getETHBalance,
  getTokenBalance,
  waitForTx,
  getBlockNumber,

  // Prices
  getPrice,
  getAllPrices,
  getPriceForGMX,
  marketToPair,

  // GMX Core
  getMarket,
  getOpenInterest,
  getAccountPositions,
  getAccountOrders,
  createIncreaseOrder,
  createDecreaseOrder,
  cancelOrder,

  // Identity
  registerAgent,
  getAgentInfo,
  getAgentByAddress,
  updateEndpoint,

  // Constants
  constants: {
    GMX,
    TOKENS,
    CHAINLINK,
    REGISTRY,
    ORDER_TYPE,
    DECREASE_POSITION_SWAP_TYPE,
  },

  // ========== SKILLS ==========

  // Market Reader
  getAllMarkets,
  getFundingRate: getFundingRateFromMarketReader,
  getWalletSummary,

  // Position Manager
  goLong,
  goShort,
  closeFullPosition,
  checkLiquidationRisk,

  // Pool Analyzer
  getGMPoolStats,
  getAllPoolStats,

  // Strategy
  analyzeMarket,
  analyzeAllMarkets,

  // Monitor
  startMonitoring,
  stopMonitoring,
  stopAllMonitors,
  getActiveMonitors,

  // Liquidation Hunter
  checkLiquidatable,
  calcProfit: calcProfit,
  findOpportunities,
  simulateLiquidation: simulate,
  executeLiquidation: execute,

  // ========== METADATA ==========
  version: '1.0.0',
  name: 'arbitrum-gmx-agent-skill',
  description: 'Production-ready AI agent skills for Arbitrum: GMX V2 trading + Liquidation Hunter on Aave V3',
}
