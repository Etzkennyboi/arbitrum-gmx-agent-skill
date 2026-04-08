// lib/gmx.js
// GMX V2 core interactions — verified against official ABIs

const { ethers } = require('ethers')
const {
  GMX, ERC20_ABI, DATA_STORE_ABI, READER_ABI,
  EXCHANGE_ROUTER_ABI, ORDER_TYPE, DECREASE_POSITION_SWAP_TYPE,
} = require('./constants')
const { getProvider, getWallet } = require('./arbitrum')

// ============================================================
// READ OPERATIONS
// ============================================================

/**
 * Get market info from Reader
 */
async function getMarket(marketAddress) {
  const provider = getProvider('one')
  const reader = new ethers.Contract(GMX.READER, READER_ABI, provider)

  const market = await reader.getMarket(GMX.DATA_STORE, marketAddress)
  return {
    marketToken: market.marketToken,
    indexToken: market.indexToken,
    longToken: market.longToken,
    shortToken: market.shortToken,
  }
}

/**
 * Get open interest for a market from DataStore
 */
async function getOpenInterest(marketAddress) {
  const provider = getProvider('one')
  const dataStore = new ethers.Contract(GMX.DATA_STORE, DATA_STORE_ABI, provider)

  // Get market info to know the tokens
  const market = await getMarket(marketAddress)

  // GMX stores OI keyed by: keccak256(abi.encode(OPEN_INTEREST_KEY, market, collateralToken, isLong))
  const openInterestKey = ethers.keccak256(ethers.toUtf8Bytes('OPEN_INTEREST'))

  // Long OI (using long token as collateral)
  const longOIKey = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'address', 'address', 'bool'],
      [openInterestKey, marketAddress, market.longToken, true]
    )
  )

  // Short OI (using short token as collateral)
  const shortOIKey = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'address', 'address', 'bool'],
      [openInterestKey, marketAddress, market.shortToken, false]
    )
  )

  const [longOIRaw, shortOIRaw] = await Promise.all([
    dataStore.getUint(longOIKey).catch(() => 0n),
    dataStore.getUint(shortOIKey).catch(() => 0n),
  ])

  // GMX stores OI in 30-decimal USD
  const longOI = parseFloat(ethers.formatUnits(longOIRaw, 30))
  const shortOI = parseFloat(ethers.formatUnits(shortOIRaw, 30))
  const totalOI = longOI + shortOI

  return {
    marketAddress,
    longOI: longOI.toFixed(2),
    shortOI: shortOI.toFixed(2),
    totalOI: totalOI.toFixed(2),
    longSkew: totalOI > 0 ? `${((longOI / totalOI) * 100).toFixed(1)}%` : '50.0%',
    shortSkew: totalOI > 0 ? `${((shortOI / totalOI) * 100).toFixed(1)}%` : '50.0%',
    longOIRaw: longOIRaw.toString(),
    shortOIRaw: shortOIRaw.toString(),
  }
}

/**
 * Get all positions for an account using Reader.getAccountPositions
 * Verified struct shape from Reader.json deployment
 */
const tokenDecimalsCache = {}

/**
 * Get all positions for an account using Reader.getAccountPositions
 * Verified struct shape from Reader.json deployment
 */
async function getAccountPositions(account) {
  const provider = getProvider('one')
  const reader = new ethers.Contract(GMX.READER, READER_ABI, provider)

  // Fetch up to 50 positions
  const positions = await reader.getAccountPositions(GMX.DATA_STORE, account, 0, 50)

  const formattedPositions = await Promise.all(positions.map(async (pos) => {
    const collateralToken = pos.addresses.collateralToken
    
    // Resolve decimals (with cache)
    if (!tokenDecimalsCache[collateralToken]) {
      try {
        const token = new ethers.Contract(collateralToken, ERC20_ABI, provider)
        tokenDecimalsCache[collateralToken] = await token.decimals()
      } catch (err) {
        console.warn(`[GMX] Could not fetch decimals for ${collateralToken}, defaulting to 18`)
        tokenDecimalsCache[collateralToken] = 18
      }
    }
    
    const decimals = tokenDecimalsCache[collateralToken]
    const sizeInUsd = parseFloat(ethers.formatUnits(pos.numbers.sizeInUsd, 30))
    const sizeInTokens = parseFloat(ethers.formatUnits(pos.numbers.sizeInTokens, 18))
    const collateralAmount = parseFloat(ethers.formatUnits(pos.numbers.collateralAmount, decimals))

    // Find market name
    const marketName = Object.entries(GMX.MARKETS).find(
      ([, addr]) => addr.toLowerCase() === pos.addresses.market.toLowerCase()
    )?.[0] || pos.addresses.market

    return {
      account: pos.addresses.account,
      market: pos.addresses.market,
      marketName,
      collateralToken: collateralToken,
      isLong: pos.flags.isLong,
      sizeInUsd: sizeInUsd.toFixed(2),
      sizeInTokens: sizeInTokens.toFixed(6),
      collateralAmount: collateralAmount.toFixed(6),
      borrowingFactor: pos.numbers.borrowingFactor.toString(),
      fundingFeeAmountPerSize: pos.numbers.fundingFeeAmountPerSize.toString(),
      increasedAtTime: new Date(Number(pos.numbers.increasedAtTime) * 1000).toISOString(),
      decreasedAtTime: Number(pos.numbers.decreasedAtTime) > 0
        ? new Date(Number(pos.numbers.decreasedAtTime) * 1000).toISOString()
        : null,
      pendingImpactAmount: pos.numbers.pendingImpactAmount.toString(),
    }
  }))

  return formattedPositions.filter(p => parseFloat(p.sizeInUsd) > 0) // Only open positions
}

/**
 * Get pending orders for an account
 */
async function getAccountOrders(account) {
  const provider = getProvider('one')
  const reader = new ethers.Contract(GMX.READER, READER_ABI, provider)

  const orders = await reader.getAccountOrders(GMX.DATA_STORE, account, 0, 50)

  return orders.map(orderInfo => {
    const o = orderInfo.order
    const marketName = Object.entries(GMX.MARKETS).find(
      ([, addr]) => addr.toLowerCase() === o.addresses.market.toLowerCase()
    )?.[0] || o.addresses.market

    return {
      orderKey: orderInfo.orderKey,
      market: o.addresses.market,
      marketName,
      orderType: Number(o.numbers.orderType),
      isLong: o.flags.isLong,
      sizeDeltaUsd: ethers.formatUnits(o.numbers.sizeDeltaUsd, 30),
      triggerPrice: ethers.formatUnits(o.numbers.triggerPrice, 30),
      acceptablePrice: ethers.formatUnits(o.numbers.acceptablePrice, 30),
      executionFee: ethers.formatEther(o.numbers.executionFee),
      isFrozen: o.flags.isFrozen,
      autoCancel: o.flags.autoCancel,
    }
  })
}

// ============================================================
// WRITE OPERATIONS
// ============================================================

/**
 * Open a position on GMX V2
 * Uses the VERIFIED createOrder struct from ExchangeRouter.json
 *
 * IMPORTANT: GMX V2 order flow:
 * 1. User sends collateral to OrderVault via multicall (sendTokens/sendWnt)
 * 2. User calls createOrder
 * 3. Keeper executes the order on-chain
 */
async function createIncreaseOrder({
  privateKey,
  marketAddress,
  isLong,
  collateralTokenAddress,
  collateralAmount,       // in token units (e.g. "100" for 100 USDC)
  collateralDecimals = 6, // USDC = 6
  sizeDeltaUsd,           // position size in USD (e.g. 500 for 5x on $100)
  acceptablePriceUsd,     // max price for long, min price for short
  executionFeeEth = '0.0012', // ETH for keeper execution
}) {
  const wallet = getWallet(privateKey, 'one')
  const exchangeRouter = new ethers.Contract(
    GMX.EXCHANGE_ROUTER,
    EXCHANGE_ROUTER_ABI,
    wallet
  )

  const executionFee = ethers.parseEther(executionFeeEth)
  const collateralWei = ethers.parseUnits(collateralAmount.toString(), collateralDecimals)
  const sizeDeltaUsd30 = ethers.parseUnits(sizeDeltaUsd.toString(), 30)
  const acceptablePrice30 = ethers.parseUnits(acceptablePriceUsd.toString(), 30)

  // Build multicall:
  // 1. Send ETH execution fee to OrderVault
  // 2. Send collateral tokens to OrderVault
  // 3. Create the order
  const sendWntCalldata = exchangeRouter.interface.encodeFunctionData(
    'sendWnt',
    [GMX.ORDER_VAULT, executionFee]
  )

  const sendTokensCalldata = exchangeRouter.interface.encodeFunctionData(
    'sendTokens',
    [collateralTokenAddress, GMX.ORDER_VAULT, collateralWei]
  )

  // Build the CreateOrderParams struct matching verified ABI
  const orderParams = {
    addresses: {
      receiver: wallet.address,
      cancellationReceiver: wallet.address,
      callbackContract: ethers.ZeroAddress,
      uiFeeReceiver: ethers.ZeroAddress,
      market: marketAddress,
      initialCollateralToken: collateralTokenAddress,
      swapPath: [],
    },
    numbers: {
      sizeDeltaUsd: sizeDeltaUsd30,
      initialCollateralDeltaAmount: collateralWei,
      triggerPrice: 0n,
      acceptablePrice: acceptablePrice30,
      executionFee: executionFee,
      callbackGasLimit: 0n,
      minOutputAmount: 0n,
      validFromTime: 0n,
    },
    orderType: ORDER_TYPE.MARKET_INCREASE,
    decreasePositionSwapType: DECREASE_POSITION_SWAP_TYPE.NO_SWAP,
    isLong: isLong,
    shouldUnwrapNativeToken: false,
    autoCancel: false,
    referralCode: ethers.ZeroHash,
    dataList: [],
  }

  const createOrderCalldata = exchangeRouter.interface.encodeFunctionData(
    'createOrder',
    [orderParams]
  )

  // First: approve Router to spend collateral tokens
  const token = new ethers.Contract(collateralTokenAddress, ERC20_ABI, wallet)
  const currentAllowance = await token.allowance(wallet.address, GMX.ROUTER)

  if (currentAllowance < collateralWei) {
    console.log('[GMX] Approving Router to spend collateral...')
    const approveTx = await token.approve(GMX.ROUTER, ethers.MaxUint256)
    await approveTx.wait()
    console.log('[GMX] Approval confirmed')
  }

  // Execute multicall
  console.log(`[GMX] Creating ${isLong ? 'LONG' : 'SHORT'} order...`)
  console.log(`[GMX] Size: $${sizeDeltaUsd} | Collateral: ${collateralAmount}`)
  console.log(`[GMX] Market: ${marketAddress}`)

  const totalValue = executionFee // ETH value to send with tx
  const tx = await exchangeRouter.multicall(
    [sendWntCalldata, sendTokensCalldata, createOrderCalldata],
    { value: totalValue }
  )

  const receipt = await tx.wait()
  console.log(`[GMX] Order submitted! TX: ${receipt.hash}`)

  return {
    success: true,
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    market: marketAddress,
    isLong,
    sizeDeltaUsd,
    collateralAmount,
    leverage: (parseFloat(sizeDeltaUsd) / parseFloat(collateralAmount)).toFixed(2),
    executionFee: executionFeeEth,
    note: 'Order created. A GMX keeper will execute it within ~30 seconds.',
  }
}

/**
 * Close a position (create decrease order)
 */
async function createDecreaseOrder({
  privateKey,
  marketAddress,
  isLong,
  collateralTokenAddress,
  sizeDeltaUsd,           // Amount to close in USD
  acceptablePriceUsd,
  executionFeeEth = '0.0012',
}) {
  const wallet = getWallet(privateKey, 'one')
  const exchangeRouter = new ethers.Contract(
    GMX.EXCHANGE_ROUTER,
    EXCHANGE_ROUTER_ABI,
    wallet
  )

  const executionFee = ethers.parseEther(executionFeeEth)
  const sizeDeltaUsd30 = ethers.parseUnits(sizeDeltaUsd.toString(), 30)
  const acceptablePrice30 = ethers.parseUnits(acceptablePriceUsd.toString(), 30)

  // Multicall: send ETH execution fee + create order
  const sendWntCalldata = exchangeRouter.interface.encodeFunctionData(
    'sendWnt',
    [GMX.ORDER_VAULT, executionFee]
  )

  const orderParams = {
    addresses: {
      receiver: wallet.address,
      cancellationReceiver: wallet.address,
      callbackContract: ethers.ZeroAddress,
      uiFeeReceiver: ethers.ZeroAddress,
      market: marketAddress,
      initialCollateralToken: collateralTokenAddress,
      swapPath: [],
    },
    numbers: {
      sizeDeltaUsd: sizeDeltaUsd30,
      initialCollateralDeltaAmount: 0n, // Close, don't withdraw specific collateral
      triggerPrice: 0n,
      acceptablePrice: acceptablePrice30,
      executionFee: executionFee,
      callbackGasLimit: 0n,
      minOutputAmount: 0n,
      validFromTime: 0n,
    },
    orderType: ORDER_TYPE.MARKET_DECREASE,
    decreasePositionSwapType: DECREASE_POSITION_SWAP_TYPE.NO_SWAP,
    isLong: isLong,
    shouldUnwrapNativeToken: false,
    autoCancel: false,
    referralCode: ethers.ZeroHash,
    dataList: [],
  }

  const createOrderCalldata = exchangeRouter.interface.encodeFunctionData(
    'createOrder',
    [orderParams]
  )

  console.log(`[GMX] Creating CLOSE ${isLong ? 'LONG' : 'SHORT'} order...`)
  console.log(`[GMX] Size to close: $${sizeDeltaUsd}`)

  const tx = await exchangeRouter.multicall(
    [sendWntCalldata, createOrderCalldata],
    { value: executionFee }
  )

  const receipt = await tx.wait()
  console.log(`[GMX] Close order submitted! TX: ${receipt.hash}`)

  return {
    success: true,
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    market: marketAddress,
    isLong,
    sizeClosed: sizeDeltaUsd,
    note: 'Decrease order created. Keeper will execute within ~30 seconds.',
  }
}

/**
 * Cancel a pending order
 */
async function cancelOrder({ privateKey, orderKey }) {
  const wallet = getWallet(privateKey, 'one')
  const exchangeRouter = new ethers.Contract(
    GMX.EXCHANGE_ROUTER,
    EXCHANGE_ROUTER_ABI,
    wallet
  )

  const tx = await exchangeRouter.cancelOrder(orderKey)
  const receipt = await tx.wait()

  return {
    success: true,
    txHash: receipt.hash,
    orderKey,
  }
}

module.exports = {
  getMarket,
  getOpenInterest,
  getAccountPositions,
  getAccountOrders,
  createIncreaseOrder,
  createDecreaseOrder,
  cancelOrder,
}
