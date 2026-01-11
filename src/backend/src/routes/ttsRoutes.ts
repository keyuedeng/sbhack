/**
 * Text-to-Speech Routes
 * Defines TTS-related API endpoints
 */

import { Router } from 'express';
import { speakText } from '../controllers/ttsController';

const router = Router();

/**
 * POST /tts/speak
 * Convert text to speech using Deepgram Aura
 */
router.post('/speak', speakText);

export default router;
