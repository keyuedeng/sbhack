/**
 * Speech-to-Text Service
 * Handles microphone recording and streams to backend for Deepgram transcription
 */

let audioStream = null;
let isRecording = false;
let websocket = null;
let audioContext = null;
let mediaStreamSource = null;
let processor = null;
let deepgramReady = false;

/**
 * Start speech-to-text recording with WebSocket streaming
 * @param {Function} onTranscript - Callback function called with transcript text
 * @returns {Promise<void>}
 */
export async function startSpeechToText(onTranscript) {
  try {
    // Request microphone access
    audioStream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
      } 
    });
    
    isRecording = true;
    deepgramReady = false;

    // Create WebSocket connection to backend
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/transcribe`;
    
    websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('WebSocket connected for streaming transcription');
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connected') {
          console.log('Deepgram connection established - starting audio processing');
          deepgramReady = true;
          startAudioProcessing();
        } else if (data.type === 'transcript') {
          if (data.transcript && onTranscript) {
            console.log('Transcript received:', data.transcript, 'isFinal:', data.isFinal);
            // Only call callback for final transcripts
            if (data.isFinal) {
              onTranscript(data.transcript);
            }
          }
        } else if (data.type === 'error') {
          console.error('Transcription error:', data.error);
          alert('Transcription error occurred. Please try again.');
          stopSpeechToText();
        } else if (data.type === 'deepgram_closed') {
          console.warn('Deepgram connection closed by server - will reconnect on next use');
          deepgramReady = false;
          // Don't stop recording completely - just mark as not ready
          // User can try again by clicking mic button
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      isRecording = false;
      deepgramReady = false;
      stopSpeechToText();
    };

    websocket.onclose = () => {
      console.log('WebSocket closed');
      isRecording = false;
      deepgramReady = false;
    };

    function startAudioProcessing() {
      // Set up audio processing to send audio chunks to WebSocket
      if (!audioContext && audioStream) {
        audioContext = new AudioContext({ sampleRate: 16000 });
        mediaStreamSource = audioContext.createMediaStreamSource(audioStream);
        
        // Create a script processor node (deprecated but works everywhere)
        processor = audioContext.createScriptProcessor(4096, 1, 1);
        
        processor.onaudioprocess = (event) => {
          if (!isRecording || !deepgramReady || websocket?.readyState !== WebSocket.OPEN) {
            return;
          }

          const inputData = event.inputBuffer.getChannelData(0);
          
          // Convert Float32Array to Int16Array (Deepgram expects 16-bit PCM)
          const int16Data = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            // Clamp values to [-1, 1] range and convert to 16-bit integer
            const s = Math.max(-1, Math.min(1, inputData[i]));
            int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          
          // Send audio data to WebSocket (only non-empty buffers)
          if (int16Data.length > 0 && websocket && websocket.readyState === WebSocket.OPEN) {
            try {
              websocket.send(int16Data.buffer);
            } catch (error) {
              console.error('Error sending audio data:', error);
            }
          }
        };

        // Connect audio nodes
        mediaStreamSource.connect(processor);
        processor.connect(audioContext.destination);
        
        console.log('Audio processing started');
      }
    }
    
    console.log('Recording started, waiting for Deepgram connection...');
  } catch (error) {
    console.error('Error starting speech-to-text:', error);
    isRecording = false;
    deepgramReady = false;
    stopSpeechToText();
    throw new Error('Failed to access microphone. Please grant permission.');
  }
}

/**
 * Stop speech-to-text recording
 */
export function stopSpeechToText() {
  isRecording = false;
  deepgramReady = false;

  // Disconnect audio nodes
  if (processor) {
    processor.disconnect();
    processor = null;
  }

  if (mediaStreamSource) {
    mediaStreamSource.disconnect();
    mediaStreamSource = null;
  }

  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  // Close WebSocket
  if (websocket) {
    websocket.close();
    websocket = null;
  }

  // Stop audio stream
  if (audioStream) {
    audioStream.getTracks().forEach(track => track.stop());
    audioStream = null;
  }

  console.log('Recording stopped.');
}

/**
 * Check if currently recording
 */
export function isRecordingAudio() {
  return isRecording;
}
