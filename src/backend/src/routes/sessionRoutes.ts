/**
 * Session Routes
 * Defines all session-related API endpoints
 */

import { Router } from 'express';
import {
  startSession,
  sendMessage,
  recordSessionAction,
  exportSession,
  endSession,
  getFeedback,
  generateTTS,
  transcribeAudio,
  uploadAudio
} from '../controllers/sessionController';

const router = Router();

/**
 * POST /session/start
 * Start a new encounter session
 */
router.post('/start', startSession);

/**
 * POST /session/message
 * Send a message to the patient and get their reply
 */
router.post('/message', sendMessage);

/**
 * POST /session/action
 * Record an action and get deterministic result
 */
router.post('/action', recordSessionAction);

/**
 * POST /session/end
 * End a session and record submitted diagnosis
 */
router.post('/end', endSession);

/**
 * GET /session/export
 * Export full session data for scoring/leaderboard
 */
router.get('/export', exportSession);

/**
 * GET /session/feedback
 * Get feedback/analysis for a completed session
 */
router.get('/feedback', getFeedback);

/**
 * POST /session/tts
 * Generate text-to-speech audio from text
 */
router.post('/tts', generateTTS);

/**
 * POST /session/transcribe
 * Transcribe audio file to text
 */
router.post('/transcribe', uploadAudio.single('audio'), transcribeAudio);

export default router;
