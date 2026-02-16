#!/bin/bash
# Multi-Process Support Test Script
# Run this to manually test the new multi-process functionality

set -e

echo "=== Multi-Process Support Test Script ==="
echo ""

# Setup test directory
TEST_DIR="./test-multi-process-demo"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

echo "Test directory: $TEST_DIR"
echo ""

# Build procside first
echo "Building procside..."
cd ..
npm run build > /dev/null 2>&1
cd "$TEST_DIR"
echo "✓ Build complete"
echo ""

# Helper function to run procside
procside() {
  node ../dist/index.js "$@"
}

echo "=== Test 1: Initialize first process ==="
procside init --name "Add Container to Homelab" --goal "Deploy a new Docker container with proper configuration" --template infra-deploy
echo ""

echo "=== Test 2: Check status ==="
procside status
echo ""

echo "=== Test 3: Add some steps and evidence ==="
procside step s1 --status in_progress
procside evidence note "Started planning container requirements"
procside step s1 --status completed
procside step s2 --status in_progress
echo ""

echo "=== Test 4: Create second process ==="
procside init --name "API Rate Limiting" --goal "Add rate limiting to public API endpoints" --template feature-add
echo ""

echo "=== Test 5: List all processes ==="
procside list
echo ""

echo "=== Test 6: Check status (should show second process as active) ==="
procside status
echo ""

echo "=== Test 7: Switch back to first process ==="
procside switch proc-001
procside status
echo ""

echo "=== Test 8: Create a version snapshot ==="
procside version "Completed planning phase"
echo ""

echo "=== Test 9: View version history ==="
procside history
echo ""

echo "=== Test 10: Create third process ==="
procside init --name "Database Migration" --goal "Migrate database to new schema"
echo ""

echo "=== Test 11: List all processes (should show 3) ==="
procside list
echo ""

echo "=== Test 12: Archive the second process ==="
procside archive proc-002
echo ""

echo "=== Test 13: List active processes (should show 2) ==="
procside list
echo ""

echo "=== Test 14: List all processes including archived ==="
procside list --all
echo ""

echo "=== Test 15: View registry file ==="
echo "--- .ai/registry.yaml ---"
cat .ai/registry.yaml
echo ""

echo "=== Test 16: View processes directory ==="
echo "--- .ai/processes/ ---"
ls -la .ai/processes/
echo ""

echo "=== Test 17: View version snapshots ==="
echo "--- .ai/versions/proc-001/ ---"
ls -la .ai/versions/proc-001/
echo ""

echo "=== Test 18: JSON output ==="
procside list --json
echo ""

echo "=== Test 19: Start dashboard (optional - press Ctrl+C to stop) ==="
echo "Run: procside dashboard"
echo "Then open http://localhost:3000 in your browser"
echo ""

echo "=== Test Complete ==="
echo "Test directory: $TEST_DIR"
echo ""
echo "To clean up: rm -rf $TEST_DIR"
