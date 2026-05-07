#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "🚀 Starting OutboundAI Voice Agent..."

# Only load .env if it exists (local dev). On VPS, env vars come from Coolify/Docker.
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo "📋 Configuration:"
echo "   LiveKit: ${LIVEKIT_URL}"
echo "   OpenAI Model: ${OPENAI_MODEL:-gpt-4o-mini}"
echo "   Sarvam TTS: ${SARVAM_TTS_SPEAKER:-kavya}"
echo "   Supabase: ${SUPABASE_URL}"

echo "🌐 Starting FastAPI server on port 80..."
uvicorn server:app --host 0.0.0.0 --port 8000 &
SERVER_PID=$!

sleep 2

echo "🤖 Starting LiveKit agent worker..."
while true; do
    python agent.py start || echo "Agent crashed. Make sure LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET are set in Coolify Environment Variables!"
    sleep 10
done

kill $SERVER_PID 2>/dev/null || true
