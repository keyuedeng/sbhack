"use strict";
/**
 * Text-to-Speech Service
 * Converts text to speech using Deepgram API
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
exports.generateSpeech = generateSpeech;
const sdk_1 = require("@deepgram/sdk");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
// Initialize Deepgram client
const deepgram = (0, sdk_1.createClient)(process.env.DEEPGRAM_API_KEY || '');
/**
 * Generate speech from text using Deepgram
 * @param text - The text to convert to speech
 * @returns Promise<string> - The URL path to the generated audio file
 */
async function generateSpeech(text) {
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
        const filename = `${(0, crypto_1.randomUUID)()}.mp3`;
        const filepath = path.join(audioDir, filename);
        // Generate speech using Deepgram
        const speakClient = await deepgram.speak.request({ text: text.trim() }, {
            model: 'aura-2-thalia-en',
            encoding: 'mp3',
        });
        // Get the audio stream from the speak client
        const stream = await speakClient.getStream();
        if (!stream) {
            throw new Error('Failed to get audio stream from Deepgram');
        }
        // Convert stream to buffer and save to file
        const chunks = [];
        const reader = stream.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            if (value)
                chunks.push(value);
        }
        // Combine chunks into a single buffer
        const buffer = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
        // Write buffer to file
        fs.writeFileSync(filepath, buffer);
        // Return the URL path (relative to public directory)
        return `/audio/${filename}`;
    }
    catch (error) {
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
