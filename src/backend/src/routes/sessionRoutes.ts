/**
 * Session Routes
 * Defines all session-related API endpoints
 */

import { Router } from 'express';
import {
  startSession,
  sendMessage,
  recordSessionAction,
  exportSession
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
 * GET /session/export
 * Export full session data for scoring/leaderboard
 */
router.get('/export', exportSession);

export default router;
