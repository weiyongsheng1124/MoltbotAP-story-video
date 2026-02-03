#!/bin/bash
# Cron Auto-Generate Story Video
# Add to crontab: 0 */6 * * * /path/to/cron-auto-generate.sh
# Or use OpenClaw cron: /api/auto-generate

URL="${1:-https://moltbotap-story-video-production.up.railway.app}"
LOG_FILE="/tmp/auto-generate.log"

echo "========================================" >> "$LOG_FILE"
echo "$(date): Starting auto-generation" >> "$LOG_FILE"
echo "Server: $URL" >> "$LOG_FILE"

# Generate and render
RESPONSE=$(curl -s -X POST "$URL/api/auto-generate")
SUCCESS=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)

if [ "$SUCCESS" = "True" ]; then
    TITLE=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('project',{}).get('title','Unknown'))" 2>/dev/null)
    GITHUB_URL=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('githubUrl',''))" 2>/dev/null)

    echo "✓ Success: $TITLE" >> "$LOG_FILE"
    echo "  GitHub: $GITHUB_URL" >> "$LOG_FILE"
    echo "$(date): Done - $TITLE" >> "$LOG_FILE"
else
    ERROR=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error','Unknown error'))" 2>/dev/null)
    echo "✗ Failed: $ERROR" >> "$LOG_FILE"
fi

echo "" >> "$LOG_FILE"
