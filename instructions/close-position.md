# Close Position on GMX V2

## Overview
This action closes an existing long or short position on a GMX V2 market.

## Execution Rules
- **Signing**: This action REQUIRES signing.
- **Market Selection**: The agent should identify the correct market and direction (Long/Short) from the user's existing positions before calling this.

## Behavioral Guide
- If the user says 'Close my ETH position', check if they have multiple ETH positions (e.g., both Long and Short) before proceeding.
- Uses a 'Large Number' market decrease order to ensure the entire position is closed.

## Output
- Return transaction hash and confirmation of the close order submission.
