"use strict";
/**
 * Transcription Service
 * Converts audio to text using Deepgram API
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.transcribeAudio = transcribeAudio;
const sdk_1 = require("@deepgram/sdk");
const fs = __importStar(require("fs"));
// Initialize Deepgram client
const deepgram = (0, sdk_1.createClient)(process.env.DEEPGRAM_API_KEY || '');
/**
 * Transcribe audio file using Deepgram
 * @param audioFilePath - Path to the audio file
 * @returns Promise<string> - The transcribed text
 */
async function transcribeAudio(audioFilePath) {
    try {
        if (!process.env.DEEPGRAM_API_KEY) {
            throw new Error('DEEPGRAM_API_KEY environment variable is not set');
        }
        // Read audio file
        const audioBuffer = fs.readFileSync(audioFilePath);
        const audioStream = fs.createReadStream(audioFilePath);
        // Transcribe using Deepgram
        const { result, error } = await deepgram.listen.prerecorded.transcribeFile(audioStream, {
            model: 'nova-2',
            language: 'en',
            smart_format: true,
            punctuate: true,
        });
        if (error) {
            throw new Error(`Deepgram API error: ${JSON.stringify(error)}`);
        }
        // Extract transcript from response
        const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
        if (!transcript) {
            throw new Error('No transcript found in Deepgram response');
        }
        return transcript.trim();
    }
    catch (error) {
        console.error('Error transcribing audio:', error?.message || error);
        throw new Error(`Failed to transcribe audio: ${error?.message || 'Unknown error'}`);
    }
}
