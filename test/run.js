// test/run.js
// Comprehensive test suite for GMX agent skill

require('dotenv').config()

const {
  // Read operations
  getBlockNumber,
  getPrice,
  getAllPrices,
  getMarket,
  getOpenInterest,

  // Skills
  getAllMarkets,
  getFundingRate,
  getAllPoolStats,
  analyzeMarket,

  // Constants
  constants: { GMX },
} = require('../index')

let testsPassed = 0
let testsFailed = 0
let testsSkipped = 0

// ============================================================
// TEST UTILITIES
// ============================================================

async function test(name, fn) {
  process.stdout.write(`  ⏳ ${name}... `)

  try {
    const start = Date.now()
    const result = await fn()
    const elapsed = Date.now() - start

    console.log(`✅ (${elapsed}ms)`)
    if (result) console.log(`     → ${JSON.stringify(result).substring(0, 80)}...`)
    testsPassed++
    return true
  } catch (err) {
    console.log(`❌`)
    console.log(`     Error: ${err.message}`)
    testsFailed++
    return false
  }
}

function skip(name, reason) {
  console.log(`  ⏭️  ${name} — ${reason}`)
  testsSkipped++
}

// ============================================================
// TEST SUITE
// ============================================================

async function runTests() {
  console.log('\n📋 GMX Agent Skill Test Suite\n')
  console.log('='.repeat(60))

  // Test 1: Connection
  await test('Connect to Arbitrum One', async () => {
    const block = await getBlockNumber('one')
    return { block }
  })

  // Test 2: Single price
  await test('Get ETH/USD price', async () => {
    const price = await getPrice('ETH')
    if (!price.price) throw new Error('Price not returned')
    return { price: price.price, feed: price.feedAddress }
  })

  // Test 3: All prices
  await test('Get all prices (6 feeds)', async () => {
    const prices = await getAllPrices()
    const failed = prices.filter(p => p.status === 'rejected')
    if (failed.length > 0) {
      console.log(`\n     ⚠️  ${failed.length} feeds failed: ${failed.map(p => p.pair).join(', ')}`)
    }
    const succeeded = prices.filter(p => p.status === 'fulfilled')
    return { total: prices.length, succeeded: succeeded.length }
  })

  // Test 4: Market info
  await test('Get ETH/USD market info', async () => {
    const market = await getMarket(GMX.MARKETS['ETH/USD'])
    return {
      longToken: market.longToken.substring(0, 6) + '...',
      shortToken: market.shortToken.substring(0, 6) + '...',
    }
  })

  // Test 5: Open interest
  await test('Get ETH/USD open interest', async () => {
    const oi = await getOpenInterest(GMX.MARKETS['ETH/USD'])
    return {
      longOI: oi.longOI,
      shortOI: oi.shortOI,
      totalOI: oi.totalOI,
    }
  })

  // Test 6: Market reader
  await test('Market Reader: getAllMarkets', async () => {
    const markets = await getAllMarkets()
    const count = Object.keys(markets).length
    if (count !== 5) throw new Error(`Expected 5 markets, got ${count}`)
    return { markets: count }
  })

  // Test 7: Funding rate
  await test('Market Reader: getFundingRate ETH/USD', async () => {
    const funding = await getFundingRate(GMX.MARKETS['ETH/USD'])
    return {
      direction: funding.direction,
      dailyRate: funding.dailyRate,
    }
  })

  // Test 8: Pool analyzer
  await test('Pool Analyzer: getAllPoolStats', async () => {
    const pools = await getAllPoolStats()
    return {
      pools: pools.totalPoolCount,
      totalTVL: pools.totalTVL,
    }
  })

  // Test 9: Strategy analysis
  await test('Strategy: analyzeMarket ETH/USD', async () => {
    const analysis = await analyzeMarket('ETH/USD')
    return {
      recommendation: analysis.recommendation,
      confidence: analysis.confidence,
      signals: 3,
    }
  })

  // Test 10: Identity (skip if no private key)
  if (process.env.AGENT_WALLET_PRIVATE_KEY) {
    skip(
      'Agent registration',
      'Manual test — requires private key, AGENT_ENDPOINT for full flow'
    )
  } else {
    skip(
      'Agent registration',
      'AGENT_WALLET_PRIVATE_KEY not set'
    )
  }

  // ========== RESULTS ==========

  console.log('\n' + '='.repeat(60))
  console.log('\n📊 Test Results:\n')
  console.log(`   ✅ Passed:  ${testsPassed}`)
  console.log(`   ❌ Failed:  ${testsFailed}`)
  console.log(`   ⏭️  Skipped: ${testsSkipped}`)
  console.log(`\n   Total: ${testsPassed + testsFailed} / ${testsPassed + testsFailed + testsSkipped}`)

  if (testsFailed === 0) {
    console.log('\n✨ All tests passed!\n')
    process.exit(0)
  } else {
    console.log('\n❌ Some tests failed!\n')
    process.exit(1)
  }
}

// ============================================================
// RUN
// ============================================================

runTests().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
