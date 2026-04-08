// lib/flash-loan-executor.js
// Execute flash loans and liquidations

const { ethers } = require('ethers')
const { AAVE, TOKENS, LIQUIDATION_CONFIG } = require('./constants')
const { getProvider, getWallet } = require('./arbitrum')

const AAVE_POOL_ABI = [
  'function flashLoan(address receiver, address token, uint256 amount, bytes calldata params) external',
]

const LIQUIDATION_CALL_ABI = [
  'function liquidationCall(address collateralAsset, address debtAsset, address user, uint256 debtToCover, bool receiveAToken) external',
]

/**
 * Execute a flash loan + liquidation combo
 * Flow:
 * 1. Get flash loan of debt asset
 * 2. Use it to liquidate the account
 * 3. Seize collateral
 * 4. Repay flash loan + profit
 */
async function executeLiquidation({
  targetAccount,
  debtAsset,
  collateralAsset,
  debtAmount,
  maxGasPrice = 100, // gwei
}) {
  try {
    console.log('⚡ Executing liquidation...')
    console.log(`Target: ${targetAccount}`)
    console.log(`Debt: ${debtAmount} of ${debtAsset}`)
    console.log(`Collateral: ${collateralAsset}`)

    if (!process.env.AGENT_WALLET_PRIVATE_KEY) {
      throw new Error('AGENT_WALLET_PRIVATE_KEY not set')
    }

    const provider = getProvider('one')
    const wallet = getWallet(process.env.AGENT_WALLET_PRIVATE_KEY, 'one')
    
    // Resolve debt decimals
    const debtContract = new ethers.Contract(debtAsset, ['function decimals() view returns (uint8)'], provider)
    const decimals = await debtContract.decimals().catch(() => 18)
    const debtAmountRaw = ethers.parseUnits(debtAmount.toString(), decimals)

    // Build liquidation call (this is what happens in the callback)
    const liquidationData = ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'address', 'uint256', 'bool'],
      [collateralAsset, targetAccount, debtAmountRaw, false]
    )

    // Get current gas fees (Ethers v6)
    const feeData = await provider.getFeeData()
    const gasPrice = feeData.gasPrice || 0n
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'))

    if (gasPriceGwei > maxGasPrice) {
      console.warn(`⚠️ Gas price too high: ${gasPriceGwei.toFixed(1)} gwei (Limit: ${maxGasPrice})`)
      return {
        success: false,
        reason: 'Gas price exceeded limit',
      }
    }

    // Connect to pool
    const pool = new ethers.Contract(AAVE.POOL, AAVE_POOL_ABI, wallet)

    // Estimate gas
    console.log('[Liquidation] Estimating gas...')
    const estimatedGas = await pool.flashLoan.estimateGas(
      wallet.address,
      debtAsset,
      debtAmountRaw,
      liquidationData,
      { value: 0n } // Value depends on flash loan fee if applicable
    ).catch(err => {
      console.warn('[Liquidation] Gas estimation failed, using fallback buffer')
      return 1500000n // ~1.5M gas fallback
    })

    console.log(`📊 Estimated gas: ${estimatedGas.toString()}`)

    // Execute flash loan
    const tx = await pool.flashLoan(
      wallet.address,
      debtAsset,
      debtAmountRaw,
      liquidationData,
      { 
        gasLimit: (estimatedGas * 130n) / 100n, // 30% buffer
        gasPrice: gasPrice,
      }
    )

    console.log(`✅ Transaction sent: ${tx.hash}`)

    // Wait for confirmation
    const receipt = await tx.wait()

    return {
      success: receipt.status === 1,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      effectiveGasPrice: receipt.gasPrice.toString(),
    }
  } catch (error) {
    console.error('❌ Liquidation failed:', error.message)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Simulate a liquidation (dry-run)
 */
async function simulateLiquidation({
  targetAccount,
  debtAsset,
  collateralAsset,
  debtAmount,
}) {
  try {
    const provider = getProvider()
    const pool = new ethers.Contract(AAVE.POOL, AAVE_POOL_ABI, provider)

    // Check if account is actually liquidatable
    const accountData = await pool.getUserAccountData(targetAccount)
    const healthFactor = parseFloat(ethers.formatEther(accountData.healthFactor))

    if (healthFactor >= 1.0) {
      return {
        success: false,
        reason: 'Account not liquidatable',
        healthFactor: healthFactor.toFixed(4),
      }
    }

    return {
      success: true,
      canLiquidate: true,
      healthFactor: healthFactor.toFixed(4),
      estimatedProfitUSD: 'N/A (would calculate)',
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
    }
  }
}

module.exports = {
  executeLiquidation,
  simulateLiquidation,
}
