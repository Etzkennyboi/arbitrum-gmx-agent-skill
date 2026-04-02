// skills/monitor/index.js
// Real-time liquidation monitoring with webhook alerts

const https = require('https')
const http = require('http')
const { checkLiquidationRisk } = require('../position-manager/index')

// In-memory store of active monitors
const activeMonitors = {}
let monitorIdCounter = 0

/**
 * Start monitoring a position for liquidation risk
 *
 * Configuration:
 * - walletAddress: Account to monitor
 * - market: Market address
 * - isLong: Position direction
 * - checkIntervalMs: How often to check (default 60000ms = 1 minute)
 * - liquidationThreshold: Distance to liquidation threshold (default 10%)
 * - webhookUrl: URL to POST alerts to (optional, no-op if not provided)
 */
function startMonitoring({
  walletAddress,
  market,
  isLong,
  checkIntervalMs = 60000,
  liquidationThreshold = 10,
  webhookUrl = null,
}) {
  const monitorId = `monitor_${++monitorIdCounter}`

  console.log(`[Monitor] Starting monitoring ${monitorId}`)
  console.log(`[Monitor] Wallet: ${walletAddress}`)
  console.log(`[Monitor] Market: ${market}`)
  console.log(`[Monitor] Direction: ${isLong ? 'LONG' : 'SHORT'}`)
  console.log(`[Monitor] Check interval: ${checkIntervalMs}ms`)
  console.log(`[Monitor] Liquidation threshold: ${liquidationThreshold}%`)

  const monitor = {
    monitorId,
    walletAddress,
    market,
    isLong,
    checkIntervalMs,
    liquidationThreshold,
    webhookUrl,
    startedAt: new Date(),
    lastCheck: null,
    riskLevel: 'UNKNOWN',
    distanceToLiquidation: null,
    isActive: true,
  }

  // Function to check and alert
  const checkRisk = async () => {
    if (!monitor.isActive) return

    try {
      const risk = await checkLiquidationRisk(walletAddress, market, isLong)
      monitor.lastCheck = new Date()
      monitor.riskLevel = risk.riskLevel
      monitor.distanceToLiquidation = parseFloat(risk.distanceToLiquidation)

      const distance = monitor.distanceToLiquidation

      console.log(`[Monitor ${monitorId}] ${risk.market} | Risk: ${risk.riskLevel} | Distance: ${distance.toFixed(2)}%`)

      // Alert if distance falls below threshold
      if (distance < liquidationThreshold) {
        const alert = {
          type: 'liquidation_risk_alert',
          monitorId,
          timestamp: new Date().toISOString(),
          wallet: walletAddress,
          market: risk.market,
          direction: isLong ? 'LONG' : 'SHORT',
          riskLevel: risk.riskLevel,
          distanceToLiquidation: distance,
          liquidationPrice: risk.liquidationPrice,
          currentPrice: risk.currentPrice,
          pnl: risk.pnlUsd,
          recommendation: risk.recommendation,
          thresholdTriggered: liquidationThreshold,
        }

        console.log(`[Monitor ${monitorId}] ⚠️ ALERT TRIGGERED!`, alert)

        // Send webhook if configured
        if (webhookUrl) {
          sendWebhook(webhookUrl, alert).catch(err =>
            console.error(`[Monitor ${monitorId}] Webhook error:`, err.message)
          )
        }
      }
    } catch (err) {
      console.error(`[Monitor ${monitorId}] Check error:`, err.message)
    }
  }

  // Start interval
  const intervalId = setInterval(checkRisk, checkIntervalMs)

  // Perform initial check immediately
  checkRisk()

  monitor.intervalId = intervalId

  // Store in active monitors
  activeMonitors[monitorId] = monitor

  return {
    monitorId,
    status: 'started',
    message: `Monitoring ${walletAddress} on ${market} (${isLong ? 'LONG' : 'SHORT'})`,
  }
}

/**
 * Stop a specific monitor
 */
function stopMonitoring(monitorId) {
  const monitor = activeMonitors[monitorId]

  if (!monitor) {
    return { error: `Monitor ${monitorId} not found` }
  }

  clearInterval(monitor.intervalId)
  monitor.isActive = false
  delete activeMonitors[monitorId]

  console.log(`[Monitor] Stopped ${monitorId}`)

  return {
    monitorId,
    status: 'stopped',
    lastRiskLevel: monitor.riskLevel,
  }
}

/**
 * Stop all active monitors
 */
function stopAllMonitors() {
  const stopped = Object.keys(activeMonitors)

  stopped.forEach(id => stopMonitoring(id))

  return {
    status: 'all_stopped',
    monitorsStopped: stopped.length,
    ids: stopped,
  }
}

/**
 * Get all active monitors
 */
function getActiveMonitors() {
  const monitors = Object.values(activeMonitors).map(m => ({
    monitorId: m.monitorId,
    wallet: m.walletAddress,
    market: m.market,
    direction: m.isLong ? 'LONG' : 'SHORT',
    riskLevel: m.riskLevel,
    distanceToLiquidation: m.distanceToLiquidation,
    lastCheck: m.lastCheck,
    startedAt: m.startedAt,
  }))

  return {
    activeMonitors: monitors.length,
    monitors,
  }
}

/**
 * Send webhook POST request
 */
function sendWebhook(url, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data)
    const isHttps = url.startsWith('https')
    const protocol = isHttps ? https : http
    const urlObj = new URL(url)

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }

    const req = protocol.request(options, (res) => {
      let body = ''
      res.on('data', chunk => (body += chunk))
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, body })
        } else {
          reject(new Error(`Webhook returned ${res.statusCode}`))
        }
      })
    })

    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

module.exports = {
  startMonitoring,
  stopMonitoring,
  stopAllMonitors,
  getActiveMonitors,
  sendWebhook,
}
