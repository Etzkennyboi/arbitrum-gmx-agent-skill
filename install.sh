#!/bin/bash
set -e

SKILL_NAME="arbitrum-gmx-agent-skill"
SKILL_DIR="$HOME/.claude/skills/$SKILL_NAME"
REPO_URL="https://github.com/etzkennyboi/arbitrum-gmx-agent-skill.git"

echo "Installing $SKILL_NAME for Claude Code..."
echo ""

# Create skills directory if it does not exist
mkdir -p "$HOME/.claude/skills"

# Clone or pull
if [ -d "$SKILL_DIR" ]; then
  echo "Updating existing installation..."
  cd "$SKILL_DIR"
  git pull origin main
else
  echo "Cloning skill..."
  git clone "$REPO_URL" "$SKILL_DIR"
fi

echo ""
echo "✅ Installed to: $SKILL_DIR"
echo ""
echo "Next steps:"
echo "1. Start a new Claude Code session"
echo "2. Ask Claude:"
echo ""
echo '   "Get current funding rates on GMX Arbitrum"'
echo '   "Build a bot that opens a 5x long on ETH"'
echo '   "Register my agent on the ArbiLink registry"'
echo ""
echo "Docs: https://github.com/etzkennyboi/arbitrum-gmx-agent-skill"
