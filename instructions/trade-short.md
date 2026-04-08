# Trade Short on GMX V2

## Overview
This action opens a leveraged short position on a GMX V2 market. This is a BEARISH bet on the price of the index token.

## Execution Rules
- **Wallet Presence**: The agent has an injected wallet via TEE.
- **Signing**: This action REQUIRES signing.
- **Collateral**: Only USDC is supported as collateral.
- **Leverage**: Default to 5.0x.

## Behavioral Guide
- Confirm with user for positions >$1000.
- Ensure the agent balance has enough ETH for the execution fee (~0.0012 ETH).

## Output
- Return transaction hash and order details.
- Notify user of ~30s execution delay.
