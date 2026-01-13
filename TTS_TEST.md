# Text-to-Speech Test Guide

This guide shows you how to test the TTS (Text-to-Speech) feature so you can hear the patient speak.

## Quick Test

### Step 1: Set up your API key

Make sure you have `DEEPGRAM_API_KEY` in your `.env` file:

```bash
DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

> **Note**: The actual API key should go in the `.env` file (not in this documentation file). This file is just for reference.

Get your API key from: https://console.deepgram.com/

### Step 2: Run the test script

```bash
npx ts-node src/backend/src/services/test.tts.example.ts
```

This will:
- Generate speech from a sample patient response
- Save the audio file to `src/backend/public/audio/`
- Show you the file path and how to play it

### Step 3: Listen to the audio

The script will tell you where the audio file is. You can:

**Option A: Play via browser** (if backend is running)
```bash
# Start backend first
npm run dev

# Then open in browser:
http://localhost:3000/audio/[filename].mp3
```

**Option B: Play directly** (macOS)
```bash
open src/backend/public/audio/[filename].mp3
```

**Option C: Use any audio player**
Just open the file path shown in the test output.

## Test in the Application

### Step 1: Start the backend

```bash
npm run dev
```

Make sure the backend is running on port 3000.

### Step 2: Start the frontend

You can either:
- Serve the frontend via the backend (it's already configured)
- Or use a separate server (see frontend README)

### Step 3: Test the speech button

1. Navigate to the simulation page
2. Start a session
3. Send a message to the patient (e.g., "Hello, how are you feeling?")
4. Wait for the patient's response
5. Click the **speaker icon** (🔊) next to the patient's message
6. The audio should play automatically

## Sample Patient Responses to Test

Here are some realistic patient responses you can use:

1. "Hello, I'm Sarah Johnson. I have chest pain for 2 hours."
2. "It's in the center of my chest, and yes, it goes to my left arm and jaw."
3. "I have hypertension, diabetes, and high cholesterol. I take lisinopril, metformin, and atorvastatin."
4. "The pain started about two hours ago while I was watching TV. It came on suddenly and it's been pretty constant since then."
5. "It feels like a pressure or squeezing sensation. On a scale of 1 to 10, I'd say it's about a 7 or 8."
6. "Yes, I do get short of breath when I try to walk around. I also feel a bit nauseous."

## Troubleshooting

### Error: DEEPGRAM_API_KEY not set
- Make sure you have a `.env` file in the project root
- Add `DEEPGRAM_API_KEY=your_key_here`
- Restart the backend server

### Error: Failed to generate speech
- Check your API key is correct
- Verify your Deepgram account has credits
- Check your internet connection
- Review the error message for details

### Audio not playing in browser
- Make sure the backend is running
- Check the browser console for errors
- Verify the audio file was created in `src/backend/public/audio/`
- Try opening the audio URL directly in a new tab

### Speech button not visible
- Make sure you're looking at a **patient message** (not your own messages)
- Patient messages appear on the left with a white background
- The speech button is a small circular button with a speaker icon next to patient messages

## API Endpoint Test

You can also test the TTS endpoint directly via curl:

```bash
curl -X POST http://localhost:3000/session/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, I am a patient. I have chest pain."}' \
  | jq
```

This will return:
```json
{
  "audioUrl": "/audio/[uuid].mp3"
}
```

Then open: `http://localhost:3000[audioUrl]` in your browser to hear it.
