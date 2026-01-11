#!/bin/bash
# Quick script to play the latest TTS audio file

AUDIO_DIR="src/backend/public/audio"
LATEST_FILE=$(find "$AUDIO_DIR" -name "*.mp3" -type f 2>/dev/null | sort | tail -1)

if [ -z "$LATEST_FILE" ]; then
    echo "❌ No audio files found in $AUDIO_DIR"
    echo "💡 Run the test first: npx ts-node src/backend/src/services/test.tts.example.ts"
    exit 1
fi

echo "🎵 Found audio file: $(basename "$LATEST_FILE")"
echo "📁 Full path: $(cd "$(dirname "$LATEST_FILE")" && pwd)/$(basename "$LATEST_FILE")"
echo ""
echo "🔊 Opening audio file..."

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open "$LATEST_FILE"
    echo "✅ Opened in default player!"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    xdg-open "$LATEST_FILE" 2>/dev/null || echo "❌ Could not open. Try: xdg-open \"$LATEST_FILE\""
else
    echo "❌ Unsupported OS. Please open the file manually:"
    echo "   $LATEST_FILE"
fi
