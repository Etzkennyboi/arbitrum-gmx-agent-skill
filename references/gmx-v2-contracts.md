# GMX V2 Contracts & Addresses

All addresses have been verified from the official GMX deployment repository.  
This file is the single source of truth for contract addresses, ABIs, struct shapes, and token decimals.

## Core Contract Addresses (Arbitrum One)

| Contract | Address | Purpose |
|----------|---------|---------|
| ExchangeRouter | `0x1C3fa76e6E1088bCE750f23a5BFcffa1efEF6A41` | Create/cancel orders (multicall entry) |
| Reader | `0x470fbC46bcC0f16532691Df360A07d8Bf5ee0789` | Read positions, orders, markets |
| DataStore | `0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8` | Key-value store for protocol state |
| Router | `0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6` | Token approval target |
| OrderVault | `0x31eF83a530Fde1B38EE9A18093A333D8Bbbc40D5` | Holds order collateral |
| DepositVault | `0xF89e77e8Dc11691C9e8757e84aaFbCD8A67d7A55` | Holds LP deposits |

## GMX V2 Markets (GM Token Addresses)

| Market | Address | Index Token |
|--------|---------|-------------|
| ETH/USD | `0x70d95587d40A2caf56bd97485aB3Eec10Bee6336` | WETH |
| BTC/USD | `0x47c031236e19d024b42f8AE6780E44A573170703` | WBTC |
| ARB/USD | `0xC25cEf6061Cf5dE5eb761b50E4743c1F5D7E5407` | ARB |
| SOL/USD | `0x09400D9DB990D5ed3f35D7be61DfAEB900Af03C9` | SOL |
| LINK/USD | `0x7f1fa204bb700853D36994DA19F830b6Ad18d045` | LINK |

## Token Addresses (Arbitrum One)

| Token | Address | Decimals |
|-------|---------|----------|
| WETH | `0x82aF49447D8a07e3bd95BD0d56f35241523fBab1` | 18 |
| WBTC | `0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f` | 8 |
| ARB | `0x912CE59144191C1204E64559FE8253a0e49E6548` | 18 |
| USDC | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` | 6 |
| USDT | `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9` | 6 |
| SOL | `0x2bcC6D6CdBbDC0a4071e48bb3B969b06B3330c07` | 9 |
| LINK | `0xf97f4df75117a78c1A5a0DBb814Af92458539FB4` | 18 |

## ExchangeRouter ABI (Full)

⚠️ **Critical:** The `createOrder` struct uses NESTED sub-tuples. This is the #1 source of bugs.  
`addresses{}` and `numbers{}` are separate objects, not flat parameters.

```javascript
const EXCHANGE_ROUTER_ABI = [
  `function createOrder(
    tuple(
      tuple(
        address receiver,
        address cancellationReceiver,
        address callbackContract,
        address uiFeeReceiver,
        address market,
        address initialCollateralToken,
        address[] swapPath
      ) addresses,
      tuple(
        uint256 sizeDeltaUsd,
        uint256 initialCollateralDeltaAmount,
        uint256 triggerPrice,
        uint256 acceptablePrice,
        uint256 executionFee,
        uint256 callbackGasLimit,
        uint256 minOutputAmount,
        uint256 validFromTime
      ) numbers,
      uint8 orderType,
      uint8 decreasePositionSwapType,
      bool isLong,
      bool shouldUnwrapNativeToken,
      bool autoCancel,
      bytes32 referralCode,
      bytes32[] dataList
    ) params
  ) payable returns (bytes32)`,
  "function cancelOrder(bytes32 key) payable",
  "function multicall(bytes[] data) payable returns (bytes[] results)",
  "function sendWnt(address receiver, uint256 amount) payable",
  "function sendTokens(address token, address receiver, uint256 amount) payable",
]
```

## Order Types & Decrease Swap Types

```javascript
const ORDER_TYPE = {
  MARKET_INCREASE:    0,   // Open position at market price
  LIMIT_INCREASE:     1,   // Open position at limit price
  MARKET_DECREASE:    2,   // Close position at market price
  LIMIT_DECREASE:     3,   // Close at limit price
  STOP_LOSS_DECREASE: 4,   // Stop loss
  LIQUIDATION:        5,   // Protocol-only
}

const DECREASE_POSITION_SWAP_TYPE = {
  NO_SWAP:                             0,
  SWAP_PNL_TOKEN_TO_COLLATERAL_TOKEN:  1,
  SWAP_COLLATERAL_TOKEN_TO_PNL_TOKEN:  2,
}
```

## Reader ABI — getAccountPositions

```javascript
const READER_ABI = [
  `function getAccountPositions(
    address dataStore,
    address account,
    uint256 start,
    uint256 end
  ) view returns (
    tuple(
      tuple(
        address account,
        address market,
        address collateralToken
      ) addresses,
      tuple(
        uint256 sizeInUsd,
        uint256 sizeInTokens,
        uint256 collateralAmount,
        int256  pendingImpactAmount,
        uint256 borrowingFactor,
        uint256 fundingFeeAmountPerSize,
        uint256 longTokenClaimableFundingAmountPerSize,
        uint256 shortTokenClaimableFundingAmountPerSize,
        uint256 increasedAtTime,
        uint256 decreasedAtTime
      ) numbers,
      tuple(bool isLong) flags
    )[]
  )`,
]
```

## DataStore ABI & Key Patterns

```javascript
const DATA_STORE_ABI = [
  "function getUint(bytes32 key) view returns (uint256)",
  "function getInt(bytes32 key) view returns (int256)",
  "function getAddress(bytes32 key) view returns (address)",
  "function getBool(bytes32 key) view returns (bool)",
]

// Open Interest Key
function getOpenInterestKey(market, collateralToken, isLong) {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "address", "address", "bool"],
      [
        ethers.keccak256(ethers.toUtf8Bytes("OPEN_INTEREST")),
        market,
        collateralToken,
        isLong
      ]
    )
  )
}

// Pool Amount Key
function getPoolAmountKey(market, token) {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "address", "address"],
      [
        ethers.keccak256(ethers.toUtf8Bytes("POOL_AMOUNT")),
        market,
        token
      ]
    )
  )
}
```

## ERC20 ABI

```javascript
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function totalSupply() view returns (uint256)",
]
```

## Market Reader ABI

```javascript
const MARKET_READER_ABI = [
  `function getMarket(
    address dataStore,
    address market
  ) view returns (
    tuple(
      address marketToken,
      address indexToken,
      address longToken,
      address shortToken
    ) market
  )`,
]
```
