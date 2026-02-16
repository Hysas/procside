#!/bin/bash

# procside Test Environment Setup Script
# This script sets up a test environment with MCP configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROCSIDE_DIR="/home/hysas/agentic-workflow-documentation-framework"
TEST_DIR="${1:-/tmp/procside-test-$(date +%s)}"
PORT="${2:-3456}"

echo -e "${GREEN}=== procside Test Environment Setup ===${NC}"
echo ""

# Step 1: Create test directory
echo -e "${YELLOW}Step 1: Creating test directory...${NC}"
mkdir -p "$TEST_DIR"
echo "Created: $TEST_DIR"

# Step 2: Build procside if needed
echo -e "${YELLOW}Step 2: Building procside...${NC}"
cd "$PROCSIDE_DIR"
npm run build
echo "Build complete."

# Step 3: Create MCP configuration
echo -e "${YELLOW}Step 3: Creating MCP configuration...${NC}"
mkdir -p "$TEST_DIR/.claude"

cat > "$TEST_DIR/.claude/mcp.json" << EOF
{
  "mcpServers": {
    "procside": {
      "command": "node",
      "args": ["$PROCSIDE_DIR/dist/mcp-server.js"],
      "env": {
        "PROCSIDE_PROJECT_PATH": "$TEST_DIR"
      }
    }
  }
}
EOF

echo "Created: $TEST_DIR/.claude/mcp.json"

# Step 4: Create project MCP config (alternative location)
cat > "$TEST_DIR/.mcp.json" << EOF
{
  "mcpServers": {
    "procside": {
      "command": "node",
      "args": ["$PROCSIDE_DIR/dist/mcp-server.js"],
      "env": {
        "PROCSIDE_PROJECT_PATH": "$TEST_DIR"
      }
    }
  }
}
EOF

echo "Created: $TEST_DIR/.mcp.json"

# Step 5: Initialize a process
echo -e "${YELLOW}Step 4: Initializing initial process...${NC}"
cd "$TEST_DIR"
node "$PROCSIDE_DIR/dist/index.js" init --name "Test Process" --goal "Initial test process"
echo "Process initialized."

# Step 6: Start dashboard in background
echo -e "${YELLOW}Step 5: Starting dashboard...${NC}"
node "$PROCSIDE_DIR/dist/index.js" dashboard --port "$PORT" --no-open &
DASHBOARD_PID=$!
sleep 2

# Check if dashboard started
if kill -0 $DASHBOARD_PID 2>/dev/null; then
    echo -e "${GREEN}Dashboard started at: http://localhost:$PORT${NC}"
else
    echo -e "${RED}Failed to start dashboard${NC}"
fi

# Summary
echo ""
echo -e "${GREEN}=== Setup Complete ===${NC}"
echo ""
echo "Test Directory: $TEST_DIR"
echo "Dashboard URL:  http://localhost:$PORT"
echo "Dashboard PID:  $DASHBOARD_PID"
echo ""
echo "MCP Configuration:"
echo "  - $TEST_DIR/.claude/mcp.json"
echo "  - $TEST_DIR/.mcp.json"
echo ""
echo -e "${YELLOW}To use with Claude Code:${NC}"
echo "1. Open Claude Code in: $TEST_DIR"
echo "2. The MCP server should auto-connect"
echo "3. Use procside tools to track work"
echo ""
echo -e "${YELLOW}To stop the dashboard:${NC}"
echo "  kill $DASHBOARD_PID"
echo ""
echo -e "${YELLOW}To clean up:${NC}"
echo "  rm -rf $TEST_DIR"
echo ""

# Save PID to file for cleanup
echo "$DASHBOARD_PID" > "$TEST_DIR/.dashboard.pid"

# Keep script running to maintain dashboard
echo "Press Ctrl+C to stop the dashboard..."
wait $DASHBOARD_PID
