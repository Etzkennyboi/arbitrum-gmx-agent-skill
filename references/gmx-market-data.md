# GMX V2 Market Data Reference

Reading account positions, open interest from DataStore, funding rates, pool amounts, and building a full market overview.

## Reading Account Positions

```javascript
const { ethers } = require("ethers")

const provider  = new ethers.JsonRpcProvider("https://arb1.arbitrum.io/rpc")
const READER    = "0x470fbC46bcC0f16532691Df360A07d8Bf5ee0789"
const DATA_STORE = "0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8"

async function getPositions(account) {
  const reader = new ethers.Contract(READER, READER_ABI, provider)
  const positions = await reader.getAccountPositions(
    DATA_STORE, account, 0, 50
  )

  return positions
    .filter(p => p.numbers.sizeInUsd > 0n)
    .map(p => ({
      market:          p.addresses.market,
      collateralToken: p.addresses.collateralToken,
      isLong:          p.flags.isLong,
      sizeInUsd:       parseFloat(ethers.formatUnits(p.numbers.sizeInUsd, 30)),
      sizeInTokens:    parseFloat(ethers.formatUnits(p.numbers.sizeInTokens, 18)),
      collateralAmount:parseFloat(ethers.formatUnits(p.numbers.collateralAmount, 18)),
    }))
}
```

## Reading Open Interest

```javascript
async function getOpenInterest(marketAddress) {
  const dataStore = new ethers.Contract(DATA_STORE, DATA_STORE_ABI, provider)
  const reader    = new ethers.Contract(READER, MARKET_READER_ABI, provider)
  const market    = await reader.getMarket(DATA_STORE, marketAddress)

  const OI_KEY = ethers.keccak256(ethers.toUtf8Bytes("OPEN_INTEREST"))

  const longOIKey = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "address", "address", "bool"],
      [OI_KEY, marketAddress, market.longToken, true]
    )
  )
  const shortOIKey = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "address", "address", "bool"],
      [OI_KEY, marketAddress, market.shortToken, false]
    )
  )

  const [longOIRaw, shortOIRaw] = await Promise.all([
    dataStore.getUint(longOIKey).catch(() => 0n),
    dataStore.getUint(shortOIKey).catch(() => 0n),
  ])

  const longOI  = parseFloat(ethers.formatUnits(longOIRaw, 30))
  const shortOI = parseFloat(ethers.formatUnits(shortOIRaw, 30))
  const total   = longOI + shortOI

  return {
    longOI:   longOI.toFixed(2),
    shortOI:  shortOI.toFixed(2),
    totalOI:  total.toFixed(2),
    longSkew: total > 0 ? `${((longOI/total)*100).toFixed(1)}%` : "50.0%",
    shortSkew:total > 0 ? `${((shortOI/total)*100).toFixed(1)}%` : "50.0%",
  }
}
```

## Funding Rate Estimation

```javascript
async function estimateFundingRate(marketAddress) {
  const oi      = await getOpenInterest(marketAddress)
  const longOI  = parseFloat(oi.longOI)
  const shortOI = parseFloat(oi.shortOI)
  const total   = longOI + shortOI
  const skew    = longOI - shortOI
  const skewRatio = total > 0 ? Math.abs(skew) / total : 0

  return {
    ...oi,
    fundingDirection:    skew > 0 ? "LONGS_PAY_SHORTS"
                       : skew < 0 ? "SHORTS_PAY_LONGS"
                       : "NEUTRAL",
    skewRatio:           `${(skewRatio * 100).toFixed(2)}%`,
    estimatedHourlyRate: `${(skewRatio * 0.005 * 100).toFixed(4)}%`,
    estimatedDailyRate:  `${(skewRatio * 0.005 * 24 * 100).toFixed(3)}%`,
    note: "Estimated from OI skew. Actual GMX V2 adaptive rate may differ.",
  }
}
```

## Complete Market Overview

```javascript
async function getMarketOverview() {
  const MARKETS = {
    "ETH/USD":  "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336",
    "BTC/USD":  "0x47c031236e19d024b42f8AE6780E44A573170703",
    "ARB/USD":  "0xC25cEf6061Cf5dE5eb761b50E4743c1F5D7E5407",
    "SOL/USD":  "0x09400D9DB990D5ed3f35D7be61DfAEB900Af03C9",
    "LINK/USD": "0x7f1fa204bb700853D36994DA19F830b6Ad18d045",
  }

  const results = await Promise.allSettled(
    Object.entries(MARKETS).map(async ([name, address]) => {
      const [oi, funding] = await Promise.all([
        getOpenInterest(address),
        estimateFundingRate(address),
      ])
      return { name, address, ...oi, ...funding }
    })
  )

  return results
    .filter(r => r.status === "fulfilled")
    .map(r => r.value)
}

// Usage
getMarketOverview().then(markets => {
  console.table(markets)
})
```

## Reading Pool Amounts

```javascript
async function getPoolAmount(marketAddress, token) {
  const dataStore = new ethers.Contract(DATA_STORE, DATA_STORE_ABI, provider)
  const POOL_AMOUNT_KEY = ethers.keccak256(ethers.toUtf8Bytes("POOL_AMOUNT"))

  const key = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "address", "address"],
      [POOL_AMOUNT_KEY, marketAddress, token]
    )
  )

  const amountRaw = await dataStore.getUint(key)
  return parseFloat(ethers.formatUnits(amountRaw, 18))
}
```

## Market Info Summary

```javascript
async function getMarketInfo(marketAddress, priceFeed) {
  const [oi, funding, longPrice, shortPrice] = await Promise.all([
    getOpenInterest(marketAddress),
    estimateFundingRate(marketAddress),
    getPriceForGMX(priceFeed),
    getPriceForGMX(priceFeed),
  ])

  return {
    market: marketAddress,
    pair: priceFeed,
    ...oi,
    ...funding,
    currentPrice: longPrice.price,
    timestamp: new Date().toISOString(),
  }
}
```
