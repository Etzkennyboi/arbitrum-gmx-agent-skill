// scripts/register-agent.js
// Register agent on Arbitrum Sepolia identity registry
// Run with: AGENT_WALLET_PRIVATE_KEY=0x... AGENT_ENDPOINT=https://... node scripts/register-agent.js

require('dotenv').config()

const { registerAgent } = require('../index')

async function main() {
  console.log('🔐 Registering GMX Trading Agent on Arbitrum Sepolia Registry...')

  if (!process.env.AGENT_WALLET_PRIVATE_KEY) {
    console.error('❌ Error: AGENT_WALLET_PRIVATE_KEY not set in .env')
    process.exit(1)
  }

  if (!process.env.AGENT_ENDPOINT) {
    console.error('❌ Error: AGENT_ENDPOINT not set in .env')
    console.error('   Example: AGENT_ENDPOINT=https://agent-xyz.railway.app')
    process.exit(1)
  }

  try {
    const result = await registerAgent({
      privateKey: process.env.AGENT_WALLET_PRIVATE_KEY,
      name: 'GMX Trading Agent',
      description: 'AI-powered perpetuals trader for GMX V2 on Arbitrum One. Opens positions, monitors liquidation risk, generates trading signals.',
      endpoint: process.env.AGENT_ENDPOINT,
      network: 'sepolia' // Arbitrum Sepolia testnet registry
    })

    console.log('\n✅ Agent registered successfully!')
    console.log(`\n📋 Transaction Hash: ${result.txHash}`)
    console.log(`📊 Block: ${result.blockNumber}`)
    console.log(`🆔 Agent ID: ${result.agentId}`)
    console.log(`🏠 Wallet: ${result.walletAddress}`)
    console.log(`🌐 Endpoint: ${process.env.AGENT_ENDPOINT}`)
    console.log(`🔗 Network: ${result.network}`)
    console.log('\n📝 Save this in your .env:\n')
    console.log(`AGENT_ID=${result.agentId}`)
    console.log('\n⚠️  Important: Never commit your AGENT_WALLET_PRIVATE_KEY to git!')
    console.log('   Add .env to .gitignore (already done in this project)\n')

    process.exit(0)
  } catch (err) {
    console.error('❌ Registration failed:')
    console.error(err.message)
    process.exit(1)
  }
}

main()
