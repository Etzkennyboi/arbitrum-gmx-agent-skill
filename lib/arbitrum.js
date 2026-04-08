// lib/arbitrum.js
// Arbitrum RPC helpers

const { ethers } = require('ethers')
const { ARBITRUM_ONE, ARBITRUM_SEPOLIA, ERC20_ABI } = require('./constants')

/**
 * Get a JSON RPC provider for Arbitrum
 */
let providers = {}

/**
 * Get a JSON RPC provider for Arbitrum (Singleton)
 */
function getProvider(network = 'one') {
  if (providers[network]) {
    return providers[network]
  }

  const config = network === 'sepolia' ? ARBITRUM_SEPOLIA : ARBITRUM_ONE
  const rpcUrl = network === 'sepolia'
    ? (process.env.ARBITRUM_SEPOLIA_RPC || config.rpc)
    : (process.env.ARBITRUM_ONE_RPC || config.rpc)
  
  providers[network] = new ethers.JsonRpcProvider(rpcUrl)
  return providers[network]
}

/**
 * Get a wallet (signer) for Arbitrum
 */
function getWallet(privateKey, network = 'one') {
  const provider = getProvider(network)
  return new ethers.Wallet(privateKey, provider)
}

/**
 * Get ETH balance of an address
 */
async function getETHBalance(address, network = 'one') {
  const provider = getProvider(network)
  const balance = await provider.getBalance(address)
  return {
    raw: balance.toString(),
    formatted: ethers.formatEther(balance),
    symbol: 'ETH',
  }
}

/**
 * Get ERC20 token balance
 */
async function getTokenBalance(tokenAddress, walletAddress, network = 'one') {
  const provider = getProvider(network)
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider)

  const [balance, decimals, symbol] = await Promise.all([
    token.balanceOf(walletAddress),
    token.decimals(),
    token.symbol(),
  ])

  return {
    raw: balance.toString(),
    formatted: ethers.formatUnits(balance, decimals),
    symbol,
    decimals: Number(decimals),
  }
}

/**
 * Wait for a transaction to confirm
 */
async function waitForTx(txHash, network = 'one', confirmations = 1) {
  const provider = getProvider(network)
  const receipt = await provider.waitForTransaction(txHash, confirmations, 60000)
  return {
    hash: receipt.hash,
    blockNumber: receipt.blockNumber,
    status: receipt.status === 1 ? 'success' : 'failed',
    gasUsed: receipt.gasUsed.toString(),
  }
}

/**
 * Get current block number
 */
async function getBlockNumber(network = 'one') {
  const provider = getProvider(network)
  return await provider.getBlockNumber()
}

module.exports = {
  getProvider,
  getWallet,
  getETHBalance,
  getTokenBalance,
  waitForTx,
  getBlockNumber,
}
