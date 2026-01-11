/**
 * Text-to-Speech Controller
 * Handles Deepgram TTS API requests using REST API
 */

import { Request, Response } from 'express';

/**
 * POST /tts/speak
 * Convert text to speech using Deepgram Aura
 * 
 * Request body:
 * {
 *   text: string,
 *   voice?: string (optional, defaults to 'aura-athena-en' - natural female voice)
 * }
 * 
 * Response:
 * - Audio stream (audio/wav)
 */
export async function speakText(req: Request, res: Response): Promise<void> {
  try {
    const { text, voice } = req.body;
    
    // Validate inputs
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Missing or invalid text' });
      return;
    }
    
    // Check if API key is configured
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      console.warn('DEEPGRAM_API_KEY not configured, TTS will not work');
      res.status(503).json({ error: 'Text-to-speech service not configured' });
      return;
    }
    
    // Sanitize text length (Deepgram has limits)
    const sanitizedText = text.trim().substring(0, 5000); // Max 5000 chars
    
    if (!sanitizedText) {
      res.status(400).json({ error: 'Text cannot be empty' });
      return;
    }
    
    // Use specified voice or default to a natural female voice for patient
    // Deepgram Aura voices format: aura-2-{voice}-en (e.g., aura-2-athena-en, aura-2-hera-en)
    // Available voices: athena, hera, juno, stella, luna, thalia, etc.
    const voiceName = voice || 'athena';
    const model = `aura-2-${voiceName}-en`;
    
    // Build Deepgram API URL - voice is part of the model name
    const apiUrl = `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}&encoding=linear16&container=wav&sample_rate=24000`;
    
    // Call Deepgram TTS API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: sanitizedText,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Deepgram TTS API error:', response.status, errorText);
      res.status(response.status).json({ error: 'Failed to generate speech' });
      return;
    }
    
    // Get audio data
    const audioBuffer = await response.arrayBuffer();
    
    if (!audioBuffer || audioBuffer.byteLength === 0) {
      res.status(500).json({ error: 'No audio data received' });
      return;
    }
    
    // Stream audio back to client
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', audioBuffer.byteLength.toString());
    res.setHeader('Cache-Control', 'no-cache');
    res.send(Buffer.from(audioBuffer));
    
  } catch (error: any) {
    console.error('Error in TTS controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
