# Chainlink Price Feeds on Arbitrum

Live oracle prices for all supported perpetuals markets.

## Feed Addresses (Arbitrum One)

| Pair | Address | Decimals |
|------|---------|----------|
| ETH/USD | `0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612` | 8 |
| BTC/USD | `0x6ce185860a4963106506C203335A2910413708e9` | 8 |
| ARB/USD | `0xb2A824043730FE05F3DA2efaFa1CBbe83fa548D6` | 8 |
| SOL/USD | `0x24ceA4b8ce57cdA5058b924B9B9987992450590c` | 8 |
| LINK/USD | `0x86E53CF1B870786351Da77A57575e79CB55812CB` | 8 |
| USDC/USD | `0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3` | 8 |

## Reading a Single Price

```javascript
const AGGREGATOR_ABI = [
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() view returns (uint8)",
]

const PRICE_FEEDS = {
  "ETH/USD":  "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
  "BTC/USD":  "0x6ce185860a4963106506C203335A2910413708e9",
  "ARB/USD":  "0xb2A824043730FE05F3DA2efaFa1CBbe83fa548D6",
  "SOL/USD":  "0x24ceA4b8ce57cdA5058b924B9B9987992450590c",
  "LINK/USD": "0x86E53CF1B870786351Da77A57575e79CB55812CB",
  "USDC/USD": "0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3",
}

async function getPrice(pair) {
  const feedAddress = PRICE_FEEDS[pair]
  if (!feedAddress) throw new Error(`No feed for: ${pair}`)

  const feed = new ethers.Contract(feedAddress, AGGREGATOR_ABI, provider)
  const [roundData, decimals] = await Promise.all([
    feed.latestRoundData(),
    feed.decimals(),
  ])

  return {
    pair,
    price:     parseFloat(ethers.formatUnits(roundData.answer, decimals)),
    updatedAt: new Date(Number(roundData.updatedAt) * 1000).toISOString(),
  }
}
```

## GMX-Formatted Price (30 Decimals + Slippage)

```javascript
async function getPriceForGMX(pair) {
  const data = await getPrice(pair)
  return {
    ...data,
    // For acceptablePrice in createOrder params:
    priceGMX30:      ethers.parseUnits(data.price.toFixed(12), 30),
    longAcceptable:  ethers.parseUnits((data.price * 1.01).toFixed(12), 30),
    shortAcceptable: ethers.parseUnits((data.price * 0.99).toFixed(12), 30),
  }
}
```

## Staleness Check

```javascript
async function getSafePrice(pair, maxAgeSeconds = 3600) {
  const data = await getPrice(pair)
  const age  = (Date.now() / 1000)
             - (new Date(data.updatedAt).getTime() / 1000)

  if (age > maxAgeSeconds) {
    throw new Error(
      `${pair} price is stale: ${Math.floor(age)}s old (max: ${maxAgeSeconds}s)`
    )
  }
  return data
}
```

## Market → Feed Mapping

```javascript
const MARKET_TO_FEED = {
  "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336": "ETH/USD",
  "0x47c031236e19d024b42f8AE6780E44A573170703": "BTC/USD",
  "0xC25cEf6061Cf5dE5eb761b50E4743c1F5D7E5407": "ARB/USD",
  "0x09400D9DB990D5ed3f35D7be61DfAEB900Af03C9": "SOL/USD",
  "0x7f1fa204bb700853D36994DA19F830b6Ad18d045": "LINK/USD",
}

function marketToPair(marketAddress) {
  return MARKET_TO_FEED[marketAddress] || null
}
```

## Bulk Price Fetch

```javascript
async function getAllPrices() {
  const pairs = [
    "ETH/USD",
    "BTC/USD",
    "ARB/USD",
    "SOL/USD",
    "LINK/USD",
  ]

  const results = await Promise.allSettled(
    pairs.map(pair => getPrice(pair))
  )

  return results
    .filter(r => r.status === "fulfilled")
    .map(r => r.value)
    .reduce((acc, p) => {
      acc[p.pair] = p.price
      return acc
    }, {})
}

// Usage
const prices = await getAllPrices()
console.log(`ETH: $${prices["ETH/USD"]}`)
console.log(`BTC: $${prices["BTC/USD"]}`)
```
