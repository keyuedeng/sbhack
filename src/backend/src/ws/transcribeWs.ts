import { WebSocketServer } from "ws";
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";

export function attachTranscribeWs(server: any) {
  const wss = new WebSocketServer({ server, path: "/ws/transcribe" });

  wss.on("connection", async (clientWs) => {
    const dgKey = process.env.DEEPGRAM_API_KEY;
    if (!dgKey) {
      clientWs.send(JSON.stringify({ type: "error", error: "Missing DEEPGRAM_API_KEY" }));
      clientWs.close();
      return;
    }

    const deepgram = createClient(dgKey);

    // Because the browser sends raw Int16 PCM, we MUST set encoding + sample_rate
    const dg = deepgram.listen.live({
      model: "nova-3",
      language: "en",
      encoding: "linear16",
      sample_rate: 16000,
      channels: 1,

      punctuate: true,
      smart_format: true,

      interim_results: true,     // optional but helps UI responsiveness
      endpointing: 150,          // emits final when pause detected
      vad_events: true,          // optional speech-start events
    });

    dg.on(LiveTranscriptionEvents.Open, () => {
      clientWs.send(JSON.stringify({ type: "connected" }));
    });

    dg.on(LiveTranscriptionEvents.Transcript, (data: any) => {
      const alt = data?.channel?.alternatives?.[0];
      const transcript = (alt?.transcript || "").trim();
      const isFinal = !!data?.is_final;

      if (transcript) {
        clientWs.send(JSON.stringify({ type: "transcript", transcript, isFinal }));
      }
    });

    dg.on(LiveTranscriptionEvents.Error, (err: any) => {
      console.error('Deepgram error:', err);
      // Don't close on error - let client handle it
      if (clientWs.readyState === 1) { // WebSocket.OPEN
        clientWs.send(JSON.stringify({ type: "error", error: String(err?.message || err) }));
      }
    });

    dg.on(LiveTranscriptionEvents.Close, () => {
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
        dg.send(msg as any);
      } catch (e) {
        // ignore or send error
      }
    });

    clientWs.on("close", () => {
      try {
        dg.finish();
      } catch {}
    });

    clientWs.on("error", () => {
      try {
        dg.finish();
      } catch {}
    });
  });
}
