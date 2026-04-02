// skills/agent-identity/index.js
// Re-export registry functions from lib/identity

const {
  registerAgent,
  getAgentInfo,
  getAgentByAddress,
  updateEndpoint,
} = require('../../lib/identity')

module.exports = {
  registerAgent,
  getAgentInfo,
  getAgentByAddress,
  updateEndpoint,
}
