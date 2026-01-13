"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachTranscribeWs = attachTranscribeWs;
const ws_1 = require("ws");
const sdk_1 = require("@deepgram/sdk");
function attachTranscribeWs(server) {
    const wss = new ws_1.WebSocketServer({ server, path: "/ws/transcribe" });
    wss.on("connection", async (clientWs) => {
        const dgKey = process.env.DEEPGRAM_API_KEY;
        if (!dgKey) {
            clientWs.send(JSON.stringify({ type: "error", error: "Missing DEEPGRAM_API_KEY" }));
            clientWs.close();
            return;
        }
        const deepgram = (0, sdk_1.createClient)(dgKey);
        // Because the browser sends raw Int16 PCM, we MUST set encoding + sample_rate
        const dg = deepgram.listen.live({
            model: "nova-3",
            language: "en",
            encoding: "linear16",
            sample_rate: 16000,
            channels: 1,
            punctuate: true,
            smart_format: true,
            interim_results: true, // optional but helps UI responsiveness
            endpointing: 150, // emits final when pause detected
            vad_events: true, // optional speech-start events
        });
        dg.on(sdk_1.LiveTranscriptionEvents.Open, () => {
            clientWs.send(JSON.stringify({ type: "connected" }));
        });
        dg.on(sdk_1.LiveTranscriptionEvents.Transcript, (data) => {
            const alt = data?.channel?.alternatives?.[0];
            const transcript = (alt?.transcript || "").trim();
            const isFinal = !!data?.is_final;
            if (transcript) {
                clientWs.send(JSON.stringify({ type: "transcript", transcript, isFinal }));
            }
        });
        dg.on(sdk_1.LiveTranscriptionEvents.Error, (err) => {
            console.error('Deepgram error:', err);
            // Don't close on error - let client handle it
            if (clientWs.readyState === 1) { // WebSocket.OPEN
                clientWs.send(JSON.stringify({ type: "error", error: String(err?.message || err) }));
            }
        });
        dg.on(sdk_1.LiveTranscriptionEvents.Close, () => {
            console.log('Deepgram connection closed - notifying client but keeping WebSocket open');
            // Don't close WebSocket - let client decide if it wants to reconnect
            if (clientWs.readyState === 1) { // WebSocket.OPEN
                clientWs.send(JSON.stringify({ type: "deepgram_closed" }));
            }
        });
        // Browser -> Server -> Deepgram (audio)
        clientWs.on("message", (msg) => {
            // msg is a Buffer containing raw Int16 PCM
            try {
                dg.send(msg);
            }
            catch (e) {
                // ignore or send error
            }
        });
        clientWs.on("close", () => {
            try {
                dg.finish();
            }
            catch { }
        });
        clientWs.on("error", () => {
            try {
                dg.finish();
            }
            catch { }
        });
    });
}
