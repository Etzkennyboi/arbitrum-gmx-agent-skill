# Trade Long on GMX V2

## Overview
This action opens a leveraged long position on a GMX V2 market. This is a BULLISH bet on the price of the index token.

## Execution Rules
- **Wallet Presence**: The agent has an injected wallet via TEE (Trusted Execution Environment).
- **Signing**: This action REQUIRES signing. The agent handles this automatically.
- **Collateral**: Only USDC is supported as collateral in this specific skill.
- **Leverage**: If not specified, default to 5.0x. Do not exceed 50x.

## Behavioral Guide
- Always confirm with the user before opening large positions (>$1000).
- If the market is not specified, ask the user (e.g., 'Do you want to go long on ETH or BTC?').
- Ensure the agent balance has enough ETH for the execution fee (~0.0012 ETH).

## Output
- Return the transaction hash and order details.
- Notify the user that GMX orders take ~30 seconds to be executed by a keeper.
