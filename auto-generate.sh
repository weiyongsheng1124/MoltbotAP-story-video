#!/bin/bash
# Auto-Generate Story Video Script
# Usage: ./auto-generate.sh [URL]
# Default URL: https://moltbotap-story-video-production.up.railway.app

URL="${1:-https://moltbotap-story-video-production.up.railway.app}"

echo "========================================"
echo "   AUTO-GENERATE STORY VIDEO"
echo "========================================"
echo "Server: $URL"
echo ""

# Generate and render video in one call
echo "🚀 Starting auto-generation..."
echo ""

RESPONSE=$(curl -s -X POST "$URL/api/auto-generate")

echo "Response:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# Extract GitHub URL
GITHUB_URL=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('githubUrl',''))" 2>/dev/null)

if [ -n "$GITHUB_URL" ]; then
    echo ""
    echo "========================================"
    echo "🎉 SUCCESS!"
    echo "========================================"
    echo "GitHub: $GITHUB_URL"
    echo ""
    echo "Download video:"
    echo "  curl -O $URL/output/\$(basename $GITHUB_URL)"
    echo ""
fi
