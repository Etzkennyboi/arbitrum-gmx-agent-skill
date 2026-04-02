# Agent Identity & Registry

Register your agent on the ArbiLink on-chain registry for persistent identity and endpoint management.

## Registry Addresses

| Network | Chain ID | Address |
|---------|----------|---------|
| Arbitrum One | 42161 | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| Arbitrum Sepolia | 421614 | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |

⚠️ **Register on Sepolia first for testing.** Register on Arbitrum One for production.

## Registry ABI

```javascript
const REGISTRY_ABI = [
  "function registerAgent(string name, string description, string endpoint) returns (uint256 agentId)",
  "function getAgent(uint256 agentId) view returns (string name, string description, string endpoint, address owner, uint256 registeredAt)",
  "function getAgentByAddress(address owner) view returns (uint256 agentId)",
  "function updateEndpoint(uint256 agentId, string endpoint)",
  "event AgentRegistered(uint256 indexed agentId, address indexed owner, string name)",
]
```

## Registering an Agent (Full Script)

```javascript
require("dotenv").config()
const { ethers } = require("ethers")

const provider = new ethers.JsonRpcProvider(
  process.env.ARBITRUM_SEPOLIA_RPC
  || "https://sepolia-rollup.arbitrum.io/rpc"
)
const wallet = new ethers.Wallet(
  process.env.AGENT_WALLET_PRIVATE_KEY, provider
)

const REGISTRY_SEPOLIA = "0x8004A818BFB912233c491871b3d84c89A494BD9e"

async function registerAgent() {
  const registry = new ethers.Contract(REGISTRY_SEPOLIA, REGISTRY_ABI, wallet)
  console.log(`Registering from wallet: ${wallet.address}`)

  const tx = await registry.registerAgent(
    "arbitrum-gmx-agent",
    "AI agent skill for GMX V2 perpetuals on Arbitrum One",
    "https://your-deployment.railway.app"
  )

  console.log(`TX submitted: ${tx.hash}`)
  const receipt = await tx.wait()

  // Parse AgentRegistered event to extract agentId
  let agentId = null
  for (const log of receipt.logs) {
    try {
      const parsed = registry.interface.parseLog({
        topics: log.topics, data: log.data
      })
      if (parsed?.name === "AgentRegistered") {
        agentId = parsed.args.agentId.toString()
        break
      }
    } catch { /* not our event */ }
  }

  console.log(`Agent registered! ID: ${agentId}`)
  console.log(`Add to .env → AGENT_ID=${agentId}`)
  return agentId
}

registerAgent()
```

## Lookup & Update Endpoint

```javascript
// Look up an agent by wallet address
async function lookupAgent(address) {
  const registry = new ethers.Contract(
    REGISTRY_SEPOLIA, REGISTRY_ABI, provider
  )
  const agentId = await registry.getAgentByAddress(address)
  if (agentId.toString() === "0") return null

  const agent = await registry.getAgent(agentId)
  return {
    agentId:      agentId.toString(),
    name:         agent.name,
    description:  agent.description,
    endpoint:     agent.endpoint,
    owner:        agent.owner,
    registeredAt: new Date(Number(agent.registeredAt) * 1000).toISOString(),
  }
}

// Update endpoint after Railway deployment
async function updateEndpoint(agentId, newEndpoint) {
  const registry = new ethers.Contract(
    REGISTRY_SEPOLIA, REGISTRY_ABI, wallet
  )
  const tx = await registry.updateEndpoint(agentId, newEndpoint)
  await tx.wait()
  console.log(`Endpoint updated to: ${newEndpoint}`)
}
```

## Prod: Register on Mainnet

Once tested on Sepolia, register on Arbitrum One:

```javascript
const REGISTRY_ONE = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"

async function registerAgentMainnet() {
  const provider = new ethers.JsonRpcProvider("https://arb1.arbitrum.io/rpc")
  const wallet = new ethers.Wallet(process.env.AGENT_WALLET_PRIVATE_KEY, provider)

  const registry = new ethers.Contract(REGISTRY_ONE, REGISTRY_ABI, wallet)

  const tx = await registry.registerAgent(
    "arbitrum-gmx-agent",
    "AI agent skill for GMX V2 perpetuals on Arbitrum One",
    "https://your-production-deployment.railway.app"
  )

  await tx.wait()
  console.log("Agent registered on mainnet!")
}
```

## Self-Hosted Verification

Your agent should expose a `/health` endpoint for registry verification:

```javascript
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    agent: process.env.AGENT_ID,
    timestamp: new Date().toISOString(),
  })
})
```
