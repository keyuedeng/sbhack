/**
 * Transcription Service
 * Converts audio to text using Deepgram API
 */

import { createClient } from '@deepgram/sdk';
import * as fs from 'fs';

// Initialize Deepgram client
const deepgram = createClient(process.env.DEEPGRAM_API_KEY || '');

/**
 * Transcribe audio file using Deepgram
 * @param audioFilePath - Path to the audio file
 * @returns Promise<string> - The transcribed text
 */
export async function transcribeAudio(audioFilePath: string): Promise<string> {
  try {
    if (!process.env.DEEPGRAM_API_KEY) {
      throw new Error('DEEPGRAM_API_KEY environment variable is not set');
    }

    // Read audio file
    const audioBuffer = fs.readFileSync(audioFilePath);
    const audioStream = fs.createReadStream(audioFilePath);

    // Transcribe using Deepgram
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioStream,
      {
        model: 'nova-2',
        language: 'en',
        smart_format: true,
        punctuate: true,
      }
    );

    if (error) {
      throw new Error(`Deepgram API error: ${JSON.stringify(error)}`);
    }

    // Extract transcript from response
    const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
    
    if (!transcript) {
      throw new Error('No transcript found in Deepgram response');
    }

    return transcript.trim();
  } catch (error: any) {
    console.error('Error transcribing audio:', error?.message || error);
    throw new Error(`Failed to transcribe audio: ${error?.message || 'Unknown error'}`);
  }
}
