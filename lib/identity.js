// lib/identity.js
// Agent identity registration on Arbitrum registry

const { ethers } = require('ethers')
const { REGISTRY, REGISTRY_ABI } = require('./constants')
const { getWallet, getProvider } = require('./arbitrum')

/**
 * Register agent on Arbitrum identity registry
 */
async function registerAgent({
  privateKey,
  name,
  description,
  endpoint,
  network = 'sepolia',
}) {
  const wallet = getWallet(privateKey, network)
  const registryAddress = network === 'sepolia' ? REGISTRY.SEPOLIA : REGISTRY.ONE
  const registry = new ethers.Contract(registryAddress, REGISTRY_ABI, wallet)

  console.log(`[Identity] Registering agent "${name}" on Arbitrum ${network}...`)
  console.log(`[Identity] Registry: ${registryAddress}`)
  console.log(`[Identity] Wallet: ${wallet.address}`)

  const tx = await registry.registerAgent(name, description, endpoint)
  console.log(`[Identity] TX submitted: ${tx.hash}`)

  const receipt = await tx.wait()
  console.log(`[Identity] Confirmed in block: ${receipt.blockNumber}`)

  // Parse AgentRegistered event
  let agentId = null
  for (const log of receipt.logs) {
    try {
      const parsed = registry.interface.parseLog({
        topics: log.topics,
        data: log.data,
      })
      if (parsed && parsed.name === 'AgentRegistered') {
        agentId = parsed.args.agentId.toString()
        break
      }
    } catch {
      // Not our event, skip
    }
  }

  return {
    success: true,
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    agentId,
    network,
    registryAddress,
    name,
    description,
    endpoint,
    walletAddress: wallet.address,
  }
}

/**
 * Get agent info by ID
 */
async function getAgentInfo(agentId, network = 'sepolia') {
  const provider = getProvider(network)
  const registryAddress = network === 'sepolia' ? REGISTRY.SEPOLIA : REGISTRY.ONE
  const registry = new ethers.Contract(registryAddress, REGISTRY_ABI, provider)

  const agent = await registry.getAgent(agentId)
  return {
    agentId,
    name: agent.name,
    description: agent.description,
    endpoint: agent.endpoint,
    owner: agent.owner,
    registeredAt: new Date(Number(agent.registeredAt) * 1000).toISOString(),
    network,
  }
}

/**
 * Check if wallet already has a registered agent
 */
async function getAgentByAddress(address, network = 'sepolia') {
  const provider = getProvider(network)
  const registryAddress = network === 'sepolia' ? REGISTRY.SEPOLIA : REGISTRY.ONE
  const registry = new ethers.Contract(registryAddress, REGISTRY_ABI, provider)

  const agentId = await registry.getAgentByAddress(address)
  if (agentId.toString() === '0') return null

  return await getAgentInfo(agentId.toString(), network)
}

/**
 * Update agent endpoint
 */
async function updateEndpoint({ privateKey, agentId, newEndpoint, network = 'sepolia' }) {
  const wallet = getWallet(privateKey, network)
  const registryAddress = network === 'sepolia' ? REGISTRY.SEPOLIA : REGISTRY.ONE
  const registry = new ethers.Contract(registryAddress, REGISTRY_ABI, wallet)

  const tx = await registry.updateEndpoint(agentId, newEndpoint)
  const receipt = await tx.wait()

  return {
    success: true,
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    agentId,
    newEndpoint,
  }
}

module.exports = { registerAgent, getAgentInfo, getAgentByAddress, updateEndpoint }
