# GMX V2 Trading Guide

Complete trading logic — opening longs, shorts, closing positions, cancelling orders, and the multicall pattern.

## Order Lifecycle

```
Agent calls createOrder
        │
        ▼
Order stored on-chain (pending)
        │
        ▼
GMX Keeper detects order (~30 seconds)
        │
        ▼
Keeper executes at oracle price
        │
        ▼
Position opened / closed on-chain
```

⚠️ **Critical:** `createOrder` TX hash confirms order SUBMITTED, not position FILLED.

## Setup & Constants

```javascript
require("dotenv").config()
const { ethers } = require("ethers")

const provider = new ethers.JsonRpcProvider(
  process.env.ARBITRUM_ONE_RPC || "https://arb1.arbitrum.io/rpc"
)
const wallet = new ethers.Wallet(
  process.env.AGENT_WALLET_PRIVATE_KEY, provider
)

// Contract addresses
const EXCHANGE_ROUTER = "0x1C3fa76e6E1088bCE750f23a5BFcffa1efEF6A41"
const ROUTER          = "0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6"
const ORDER_VAULT     = "0x31eF83a530Fde1B38EE9A18093A333D8Bbbc40D5"
const USDC            = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"

const MARKETS = {
  "ETH/USD":  "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336",
  "BTC/USD":  "0x47c031236e19d024b42f8AE6780E44A573170703",
  "ARB/USD":  "0xC25cEf6061Cf5dE5eb761b50E4743c1F5D7E5407",
  "SOL/USD":  "0x09400D9DB990D5ed3f35D7be61DfAEB900Af03C9",
  "LINK/USD": "0x7f1fa204bb700853D36994DA19F830b6Ad18d045",
}
```

## Opening a Long Position (Full Example)

⚠️ **Approve Router, not OrderVault.** Multicall = `sendWnt` + `sendTokens` + `createOrder` in one TX.

```javascript
async function openLong({ market, collateralUSDC, leverage, currentPrice }) {
  const exchangeRouter = new ethers.Contract(
    EXCHANGE_ROUTER, EXCHANGE_ROUTER_ABI, wallet
  )
  const usdc = new ethers.Contract(USDC, ERC20_ABI, wallet)

  const sizeDeltaUsd   = collateralUSDC * leverage
  const executionFee   = ethers.parseEther("0.0012")  // ~$3.60 for keeper gas
  const collateralWei  = ethers.parseUnits(collateralUSDC.toString(), 6)
  const acceptablePrice = ethers.parseUnits(
    (currentPrice * 1.01).toFixed(12), 30  // 1% slippage, 30-dec precision
  )

  // Step 1: Approve Router to spend USDC
  const allowance = await usdc.allowance(wallet.address, ROUTER)
  if (allowance < collateralWei) {
    const tx = await usdc.approve(ROUTER, ethers.MaxUint256)
    await tx.wait()
    console.log("Router approved for USDC")
  }

  // Step 2: Build CreateOrderParams — NESTED struct (critical shape)
  const orderParams = {
    addresses: {
      receiver:                wallet.address,
      cancellationReceiver:    wallet.address,
      callbackContract:        ethers.ZeroAddress,
      uiFeeReceiver:           ethers.ZeroAddress,
      market:                  market,
      initialCollateralToken:  USDC,
      swapPath:                [],
    },
    numbers: {
      sizeDeltaUsd:                    ethers.parseUnits(sizeDeltaUsd.toString(), 30),
      initialCollateralDeltaAmount:    collateralWei,
      triggerPrice:                    0n,
      acceptablePrice:                 acceptablePrice,
      executionFee:                    executionFee,
      callbackGasLimit:                0n,
      minOutputAmount:                 0n,
      validFromTime:                   0n,
    },
    orderType:                 0,  // MARKET_INCREASE
    decreasePositionSwapType:  0,  // NO_SWAP
    isLong:                    true,
    shouldUnwrapNativeToken:   false,
    autoCancel:                false,
    referralCode:              ethers.ZeroHash,
    dataList:                  [],
  }

  // Step 3: Encode multicall calldata
  const sendWntData = exchangeRouter.interface.encodeFunctionData(
    "sendWnt", [ORDER_VAULT, executionFee]
  )
  const sendTokensData = exchangeRouter.interface.encodeFunctionData(
    "sendTokens", [USDC, ORDER_VAULT, collateralWei]
  )
  const createOrderData = exchangeRouter.interface.encodeFunctionData(
    "createOrder", [orderParams]
  )

  // Step 4: Execute multicall — attach ETH as execution fee value
  const tx = await exchangeRouter.multicall(
    [sendWntData, sendTokensData, createOrderData],
    { value: executionFee }
  )
  const receipt = await tx.wait()
  console.log(`Order submitted: ${receipt.hash}`)
  console.log("Keeper will execute in ~30 seconds")
  return { txHash: receipt.hash, sizeDeltaUsd, leverage }
}
```

## Opening a Short Position

Identical to `openLong` with two differences:

```javascript
async function openShort({ market, collateralUSDC, leverage, currentPrice }) {
  // Identical to openLong with two differences:
  // 1. isLong: false
  // 2. acceptablePrice = currentPrice * 0.99 (shorts need lower fill price)

  const acceptablePrice = ethers.parseUnits(
    (currentPrice * 0.99).toFixed(12), 30
  )

  const orderParams = {
    addresses: {
      receiver:                wallet.address,
      cancellationReceiver:    wallet.address,
      callbackContract:        ethers.ZeroAddress,
      uiFeeReceiver:           ethers.ZeroAddress,
      market:                  market,
      initialCollateralToken:  USDC,
      swapPath:                [],
    },
    numbers: {
      sizeDeltaUsd:                    ethers.parseUnits((collateralUSDC * leverage).toString(), 30),
      initialCollateralDeltaAmount:    ethers.parseUnits(collateralUSDC.toString(), 6),
      triggerPrice:                    0n,
      acceptablePrice:                 acceptablePrice,
      executionFee:                    ethers.parseEther("0.0012"),
      callbackGasLimit:                0n,
      minOutputAmount:                 0n,
      validFromTime:                   0n,
    },
    orderType: 0,     // MARKET_INCREASE
    isLong:    false, // ← KEY DIFFERENCE
    decreasePositionSwapType: 0,
    shouldUnwrapNativeToken: false,
    autoCancel: false,
    referralCode: ethers.ZeroHash,
    dataList: [],
  }

  // Multicall pattern is identical to openLong
  const exchangeRouter = new ethers.Contract(
    EXCHANGE_ROUTER, EXCHANGE_ROUTER_ABI, wallet
  )
  
  const sendWntData = exchangeRouter.interface.encodeFunctionData(
    "sendWnt", [ORDER_VAULT, ethers.parseEther("0.0012")]
  )
  const sendTokensData = exchangeRouter.interface.encodeFunctionData(
    "sendTokens", [USDC, ORDER_VAULT, ethers.parseUnits(collateralUSDC.toString(), 6)]
  )
  const createOrderData = exchangeRouter.interface.encodeFunctionData(
    "createOrder", [orderParams]
  )

  const tx = await exchangeRouter.multicall(
    [sendWntData, sendTokensData, createOrderData],
    { value: ethers.parseEther("0.0012") }
  )
  return await tx.wait()
}
```

## Closing a Position

```javascript
async function closePosition({
  market, isLong, sizeDeltaUsd, collateralToken, currentPrice
}) {
  const exchangeRouter = new ethers.Contract(
    EXCHANGE_ROUTER, EXCHANGE_ROUTER_ABI, wallet
  )
  const executionFee = ethers.parseEther("0.0012")

  // For closing longs:  accept LOWER price (1% slippage)
  // For closing shorts: accept HIGHER price (1% slippage)
  const acceptablePrice = isLong
    ? ethers.parseUnits((currentPrice * 0.99).toFixed(12), 30)
    : ethers.parseUnits((currentPrice * 1.01).toFixed(12), 30)

  const orderParams = {
    addresses: {
      receiver:               wallet.address,
      cancellationReceiver:   wallet.address,
      callbackContract:       ethers.ZeroAddress,
      uiFeeReceiver:          ethers.ZeroAddress,
      market:                 market,
      initialCollateralToken: collateralToken,
      swapPath:               [],
    },
    numbers: {
      sizeDeltaUsd:                 ethers.parseUnits(sizeDeltaUsd.toString(), 30),
      initialCollateralDeltaAmount: 0n,  // Do not specify collateral withdrawal
      triggerPrice:                 0n,
      acceptablePrice:              acceptablePrice,
      executionFee:                 executionFee,
      callbackGasLimit:             0n,
      minOutputAmount:              0n,
      validFromTime:                0n,
    },
    orderType:                2,  // MARKET_DECREASE
    decreasePositionSwapType: 0,
    isLong:                   isLong,
    shouldUnwrapNativeToken:  false,
    autoCancel:               false,
    referralCode:             ethers.ZeroHash,
    dataList:                 [],
  }

  // Close does NOT need sendTokens — only sendWnt + createOrder
  const sendWntData = exchangeRouter.interface.encodeFunctionData(
    "sendWnt", [ORDER_VAULT, executionFee]
  )
  const createOrderData = exchangeRouter.interface.encodeFunctionData(
    "createOrder", [orderParams]
  )

  const tx = await exchangeRouter.multicall(
    [sendWntData, createOrderData],
    { value: executionFee }
  )
  const receipt = await tx.wait()
  return { txHash: receipt.hash }
}
```

## Cancelling a Pending Order

```javascript
async function cancelOrder(orderKey) {
  const exchangeRouter = new ethers.Contract(
    EXCHANGE_ROUTER, EXCHANGE_ROUTER_ABI, wallet
  )
  const tx = await exchangeRouter.cancelOrder(orderKey)
  const receipt = await tx.wait()
  return { txHash: receipt.hash }
}
```

## Common Mistakes

| Mistake | Correct Pattern |
|---------|-----------------|
| Flat struct instead of nested `addresses{}`/`numbers{}` | Always use nested sub-objects — wrong shape causes silent reverts |
| Approving OrderVault instead of Router | Approve Router (`0x7452...`). It moves tokens to OrderVault internally |
| Wrong decimal precision | USD values = 30 decimals. USDC = 6. WETH = 18. Mix = silent failure |
| Missing execution fee `sendWnt` | Always include `sendWnt` call — keeper won't execute without it |
| Not sending `{ value: executionFee }` | ETH must be attached to the multicall TX for keeper payment |
| Using createOrder for closing | Use `MARKET_DECREASE` (type 2), not `MARKET_INCREASE` (type 0) |
