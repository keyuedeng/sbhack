"use strict";
/**
 * WebSocket Routes for Streaming Transcription
 * Handles real-time audio streaming to Deepgram
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.initWebSocketServer = initWebSocketServer;
exports.closeWebSocketServer = closeWebSocketServer;
const ws_1 = require("ws");
const sdk_1 = require("@deepgram/sdk");
let wss = null;
/**
 * Initialize WebSocket server for streaming transcription
 */
function initWebSocketServer(server) {
    wss = new ws_1.WebSocketServer({ server, path: '/ws/transcribe' });
    wss.on('connection', (ws) => {
        console.log('WebSocket client connected for streaming transcription');
        // Create Deepgram live connection for this client
        const deepgram = (0, sdk_1.createClient)(process.env.DEEPGRAM_API_KEY || '');
        const deepgramLive = deepgram.listen.live({
            model: 'nova-2',
            language: 'en',
            smart_format: true,
            punctuate: true,
            interim_results: true,
            endpointing: 300,
        });
        let isDeepgramReady = false;
        // Forward audio from client to Deepgram
        ws.on('message', (data) => {
            // Only send if Deepgram is ready and connected
            if (isDeepgramReady && deepgramLive.isConnected()) {
                // Skip empty messages
                if (Buffer.isBuffer(data) && data.length === 0) {
                    return;
                }
                try {
                    deepgramLive.send(data);
                }
                catch (error) {
                    console.error('Error sending audio to Deepgram:', error);
                }
            }
            else if (!isDeepgramReady) {
                console.warn('Received audio before Deepgram connection was ready');
            }
        });
        // Forward transcripts from Deepgram to client
        deepgramLive.on(sdk_1.LiveTranscriptionEvents.Open, () => {
            console.log('Deepgram connection opened');
            isDeepgramReady = true;
            ws.send(JSON.stringify({ type: 'connected' }));
        });
        deepgramLive.on(sdk_1.LiveTranscriptionEvents.Transcript, (data) => {
            try {
                const transcript = data.channel?.alternatives?.[0]?.transcript;
                const isFinal = data.is_final;
                if (transcript) {
                    ws.send(JSON.stringify({
                        type: 'transcript',
                        transcript: transcript.trim(),
                        isFinal: isFinal || false,
                    }));
                }
            }
            catch (error) {
                console.error('Error processing transcript:', error);
            }
        });
        deepgramLive.on(sdk_1.LiveTranscriptionEvents.Close, (event) => {
            console.log('Deepgram connection closed', event);
            isDeepgramReady = false;
            // Don't close WebSocket immediately - let client handle it
            if (ws.readyState === ws_1.WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'deepgram_closed' }));
            }
        });
        deepgramLive.on(sdk_1.LiveTranscriptionEvents.Error, (error) => {
            console.error('Deepgram error:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            isDeepgramReady = false;
            if (ws.readyState === ws_1.WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'error',
                    error: error?.message || 'Transcription error occurred',
                }));
            }
        });
        // Clean up on client disconnect
        ws.on('close', () => {
            console.log('WebSocket client disconnected');
            if (deepgramLive && isDeepgramReady) {
                try {
                    deepgramLive.finish();
                }
                catch (error) {
                    console.error('Error finishing Deepgram connection:', error);
                }
            }
            isDeepgramReady = false;
        });
        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            if (deepgramLive && isDeepgramReady) {
                try {
                    deepgramLive.finish();
                }
                catch (error) {
                    console.error('Error finishing Deepgram connection:', error);
                }
            }
            isDeepgramReady = false;
        });
    });
    console.log('WebSocket server initialized on /ws/transcribe');
}
/**
 * Close WebSocket server
 */
function closeWebSocketServer() {
    if (wss) {
        wss.close();
        wss = null;
    }
}
