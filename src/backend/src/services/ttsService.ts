/**
 * Text-to-Speech Service
 * Converts text to speech using Deepgram API
 */

import { createClient } from '@deepgram/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

// Initialize Deepgram client
const deepgram = createClient(process.env.DEEPGRAM_API_KEY || '');

/**
 * Generate speech from text using Deepgram
 * @param text - The text to convert to speech
 * @returns Promise<string> - The URL path to the generated audio file
 */
export async function generateSpeech(text: string): Promise<string> {
  try {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Text is required and cannot be empty');
    }

    if (!process.env.DEEPGRAM_API_KEY) {
      throw new Error('DEEPGRAM_API_KEY environment variable is not set');
    }

    // Create audio directory if it doesn't exist
    const audioDir = path.join(process.cwd(), 'src', 'backend', 'public', 'audio');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    // Generate unique filename
    const filename = `${randomUUID()}.mp3`;
    const filepath = path.join(audioDir, filename);

    // Generate speech using Deepgram
    const speakClient = await deepgram.speak.request(
      { text: text.trim() },
      {
        model: 'aura-2-thalia-en',
        encoding: 'mp3',
      }
    );

    // Get the audio stream from the speak client
    const stream = await speakClient.getStream();
    if (!stream) {
      throw new Error('Failed to get audio stream from Deepgram');
    }

    // Convert stream to buffer and save to file
    const chunks: Uint8Array[] = [];
    const reader = stream.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }

    // Combine chunks into a single buffer
    const buffer = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
    
    // Write buffer to file
    fs.writeFileSync(filepath, buffer);

    // Return the URL path (relative to public directory)
    return `/audio/${filename}`;
  } catch (error: any) {
    console.error('Error generating speech:', error);
    
    // Provide more detailed error information
    if (error?.message) {
      console.error('Error message:', error.message);
    }
    if (error?.response) {
      console.error('API Response:', error.response);
    }
    if (error?.err_code || error?.err_msg) {
      const errorDetails = {
        code: error.err_code,
        message: error.err_msg,
        request_id: error.request_id
      };
      console.error('Deepgram API Error:', JSON.stringify(errorDetails, null, 2));
      
      if (error.err_code === 'INVALID_AUTH') {
        throw new Error(`Invalid API key. Please check your DEEPGRAM_API_KEY in the .env file. Get a valid key from: https://console.deepgram.com/`);
      }
    }
    
    throw new Error(`Failed to generate speech: ${error?.message || JSON.stringify(error) || 'Unknown error'}`);
  }
}
