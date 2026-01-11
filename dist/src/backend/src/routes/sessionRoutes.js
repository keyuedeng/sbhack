"use strict";
/**
 * Session Routes
 * Defines all session-related API endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sessionController_1 = require("../controllers/sessionController");
const router = (0, express_1.Router)();
/**
 * POST /session/start
 * Start a new encounter session
 */
router.post('/start', sessionController_1.startSession);
/**
 * POST /session/message
 * Send a message to the patient and get their reply
 */
router.post('/message', sessionController_1.sendMessage);
/**
 * POST /session/action
 * Record an action and get deterministic result
 */
router.post('/action', sessionController_1.recordSessionAction);
/**
 * POST /session/end
 * End a session and record submitted diagnosis
 */
router.post('/end', sessionController_1.endSession);
/**
 * GET /session/export
 * Export full session data for scoring/leaderboard
 */
router.get('/export', sessionController_1.exportSession);
/**
 * GET /session/feedback
 * Get feedback/analysis for a completed session
 */
router.get('/feedback', sessionController_1.getFeedback);
/**
 * POST /session/tts
 * Generate text-to-speech audio from text
 */
router.post('/tts', sessionController_1.generateTTS);
/**
 * POST /session/transcribe
 * Transcribe audio file to text
 */
router.post('/transcribe', sessionController_1.uploadAudio.single('audio'), sessionController_1.transcribeAudio);
exports.default = router;
