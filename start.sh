#!/bin/bash
set -euo pipefail

echo "🚀 Starting BoldFlow AI Voice Agent (Outbound)..."
echo "📋 Configuration:"
echo "   LiveKit:       ${LIVEKIT_URL:-NOT SET}"
echo "   Gemini Model:  ${GEMINI_MODEL:-gemini-2.0-flash-exp}"
echo "   Gemini Voice:  ${GEMINI_VOICE:-Aoede}"
echo "   Supabase:      ${SUPABASE_URL:-NOT SET}"

echo "🌐 Starting FastAPI server on port 8000..."
uvicorn server:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 1 \
  --log-level info \
  --no-access-log &
SERVER_PID=$!

# Wait for server to be ready before starting agent
sleep 3

echo "🤖 Starting LiveKit agent worker (auto-restart on crash)..."
while true; do
  python agent.py start \
    || echo "⚠️  Agent crashed — check LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and GEMINI_API_KEY. Restarting in 10s..."
  sleep 10
done

# Cleanup (reached only if the while loop exits, which it won't normally)
kill "$SERVER_PID" 2>/dev/null || true
