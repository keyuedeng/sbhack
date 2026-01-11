/**
 * Session Controller
 * Handles all session-related HTTP requests
 */

import { Request, Response } from 'express';
import { loadCase } from '../services/caseLoader';
import { createSession, getSession, appendMessage, recordAction, markEnded, storeFeedback } from '../store/sessionStore';
import { generatePatientReply } from '../services/patientEngine';
import { CreateSessionParams } from '../models/session.types';
import { analyzeSession } from '../feedback';

/**
 * POST /session/start
 * Start a new encounter session
 * 
 * Request body:
 * {
 *   caseId: string,
 *   level: 1 | 2 | 3,
 *   userName: string,
 *   timeLimitSec?: number,
 *   maxTurns?: number
 * }
 * 
 * Response:
 * {
 *   sessionId: string,
 *   timeLimitSec?: number,
 *   introLine?: string
 * }
 */
export async function startSession(req: Request, res: Response): Promise<void> {
  try {
    const { caseId, level, userName, timeLimitSec, maxTurns } = req.body;
    
    // Validate required fields
    if (!caseId || typeof caseId !== 'string') {
      res.status(400).json({ error: 'Missing or invalid caseId' });
      return;
    }
    
    if (!level || ![1, 2, 3].includes(level)) {
      res.status(400).json({ error: 'Invalid level - must be 1, 2, or 3' });
      return;
    }
    
    if (!userName || typeof userName !== 'string') {
      res.status(400).json({ error: 'Missing or invalid userName' });
      return;
    }
    
    // Sanitize inputs
    const safeCaseId = caseId.replace(/[^a-zA-Z0-9-]/g, '');
    const safeUserName = userName.trim().substring(0, 100); // Limit length
    
    // Load case via A1 loader
    let caseData;
    try {
      caseData = loadCase(safeCaseId);
    } catch (error: any) {
      res.status(404).json({ error: `Case not found: ${safeCaseId}` });
      return;
    }
    
    // Validate level matches case level (optional check - could allow any level)
    // For now, we'll use the requested level even if it differs from case level
    
    // Create session
    const params: CreateSessionParams = {
      caseId: safeCaseId,
      level: level as 1 | 2 | 3,
      userName: safeUserName,
      timeLimitSec: timeLimitSec ? Math.min(Math.max(timeLimitSec, 60), 7200) : undefined, // 1 min to 2 hours
      maxTurns: maxTurns ? Math.min(Math.max(maxTurns, 1), 100) : undefined // 1 to 100 turns
    };
    
    const session = createSession(params, caseData);
    
    // Generate optional intro line from patient
    // This could be the patient's initial presentation
    const introLine = `Hello, I'm ${caseData.patient.name}. ${caseData.patient.chiefComplaint}`;
    
    // Return session info
    res.status(201).json({
      sessionId: session.sessionId,
      timeLimitSec: session.timeLimitSec,
      maxTurns: session.maxTurns,
      introLine
    });
    
  } catch (error: any) {
    console.error('Error starting session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /session/message
 * Send a message to the patient and get their reply
 * 
 * Request body:
 * {
 *   sessionId: string,
 *   message: string
 * }
 * 
 * Response:
 * {
 *   patientReply: string,
 *   currentTurn: number,
 *   maxTurns?: number
 * }
 */
export async function sendMessage(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId, message } = req.body;
    
    // Validate inputs
    if (!sessionId || typeof sessionId !== 'string') {
      res.status(400).json({ error: 'Missing or invalid sessionId' });
      return;
    }
    
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Missing or invalid message' });
      return;
    }
    
    // Sanitize message (limit length, basic sanitization)
    const sanitizedMessage = message.trim().substring(0, 2000); // Max 2000 chars
    
    if (!sanitizedMessage) {
      res.status(400).json({ error: 'Message cannot be empty' });
      return;
    }
    
    // Get session
    const session = getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found or expired' });
      return;
    }
    
    if (!session.isActive) {
      res.status(400).json({ error: 'Session has ended' });
      return;
    }
    
    // Check max turns
    if (session.maxTurns && session.currentTurn >= session.maxTurns) {
      res.status(400).json({ error: 'Maximum turns reached' });
      return;
    }
    
    // Append user message to session
    appendMessage(sessionId, 'user', sanitizedMessage);
    
    // Generate patient reply using A1 patientEngine
    let patientReply: string;
    try {
      patientReply = await generatePatientReply({
        case: session.case,
        level: session.level,
        revealedFacts: session.revealedFacts,
        conversationHistory: session.messages.slice(0, -1), // All messages except the one we just added
        userInput: sanitizedMessage
      });
    } catch (error: any) {
      console.error('Error generating patient reply:', error?.message || error);
      console.error('Stack:', error?.stack);
      // Fallback response if LLM call fails
      patientReply = "Sorry, can you repeat that? I didn't catch that.";
    }
    
    // Append patient reply to session
    appendMessage(sessionId, 'assistant', patientReply);
    
    // Get updated session to check current turn
    const updatedSession = getSession(sessionId);
    
    res.json({
      patientReply,
      currentTurn: updatedSession?.currentTurn || 0,
      maxTurns: updatedSession?.maxTurns,
      isActive: updatedSession?.isActive ?? false
    });
    
  } catch (error: any) {
    console.error('Error sending message:', error);
    
    // Handle specific errors
    if (error.message && error.message.includes('Session')) {
      res.status(404).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /session/action
 * Record an action and get deterministic result
 * 
 * Request body:
 * {
 *   sessionId: string,
 *   actionType: string,
 *   details?: any
 * }
 * 
 * Response:
 * {
 *   result: string,
 *   actionRecorded: boolean
 * }
 */
export async function recordSessionAction(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId, actionType, details } = req.body;
    
    // Validate inputs
    if (!sessionId || typeof sessionId !== 'string') {
      res.status(400).json({ error: 'Missing or invalid sessionId' });
      return;
    }
    
    if (!actionType || typeof actionType !== 'string') {
      res.status(400).json({ error: 'Missing or invalid actionType' });
      return;
    }
    
    // Sanitize action type
    const sanitizedActionType = actionType.trim().substring(0, 100);
    
    // Get session
    const session = getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found or expired' });
      return;
    }
    
    if (!session.isActive) {
      res.status(400).json({ error: 'Session has ended' });
      return;
    }
    
    // Process action and get deterministic result
    const result = processAction(session, sanitizedActionType, details);
    
    // Record action in session
    recordAction(sessionId, sanitizedActionType, details, result);
    
    res.json({
      result,
      actionRecorded: true
    });
    
  } catch (error: any) {
    console.error('Error recording action:', error);
    
    if (error.message && error.message.includes('Session')) {
      res.status(404).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /session/end
 * End a session and record submitted diagnosis
 * 
 * Request body:
 * {
 *   sessionId: string,
 *   diagnosis: string
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   sessionId: string,
 *   endedAt: number
 * }
 */
export function endSession(req: Request, res: Response): void {
  try {
    const { sessionId, diagnosis } = req.body;
    
    // Validate inputs
    if (!sessionId || typeof sessionId !== 'string') {
      res.status(400).json({ error: 'Missing or invalid sessionId' });
      return;
    }
    
    // Get session to verify it exists
    const session = getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found or expired' });
      return;
    }
    
    // Check if session is already ended
    if (!session.isActive) {
      res.status(400).json({ error: 'Session has already ended' });
      return;
    }
    
    // Sanitize diagnosis if provided (limit length)
    const sanitizedDiagnosis = diagnosis && typeof diagnosis === 'string' 
      ? diagnosis.trim().substring(0, 500) // Max 500 chars
      : undefined;
    
    // Mark session as ended with diagnosis
    markEnded(sessionId, sanitizedDiagnosis);
    
    // Get updated session to get end time
    const updatedSession = getSession(sessionId);
    
    res.json({
      success: true,
      sessionId,
      endedAt: updatedSession?.endedAt,
      submittedDiagnosis: sanitizedDiagnosis
    });
    
  } catch (error: any) {
    console.error('Error ending session:', error);
    
    if (error.message && error.message.includes('Session')) {
      res.status(404).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /session/export
 * Export full session data for scoring/leaderboard
 * 
 * Query params:
 *   sessionId: string
 * 
 * Response:
 * {
 *   sessionId: string,
 *   caseId: string,
 *   level: number,
 *   userName: string,
 *   messages: Message[],
 *   actions: SessionAction[],
 *   createdAt: number,
 *   endedAt?: number,
 *   durationSec?: number,
 *   ... (full session object)
 * }
 */
export function exportSession(req: Request, res: Response): void {
  try {
    const { sessionId } = req.query;
    
    if (!sessionId || typeof sessionId !== 'string') {
      res.status(400).json({ error: 'Missing or invalid sessionId query parameter' });
      return;
    }
    
    const session = getSession(sessionId as string);
    if (!session) {
      res.status(404).json({ error: 'Session not found or expired' });
      return;
    }
    
    // Calculate duration if session ended
    const durationSec = session.endedAt 
      ? Math.floor((session.endedAt - session.createdAt) / 1000)
      : undefined;
    
    // Export full session data
    const exportData = {
      sessionId: session.sessionId,
      caseId: session.caseId,
      level: session.level,
      userName: session.userName,
      messages: session.messages,
      actions: session.actions,
      revealedFacts: session.revealedFacts,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      endedAt: session.endedAt,
      durationSec,
      currentTurn: session.currentTurn,
      maxTurns: session.maxTurns,
      isActive: session.isActive,
      // Include case metadata (but not full case data to keep export smaller)
      caseMetadata: {
        caseId: session.case.caseId,
        title: session.case.title,
        specialty: session.case.specialty,
        diagnosis: session.case.diagnosis
      }
    };
    
    res.json(exportData);
    
  } catch (error: any) {
    console.error('Error exporting session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /session/feedback
 * Get feedback/analysis for a completed session
 * 
 * Query params:
 *   sessionId: string
 * 
 * Response:
 * {
 *   summaryScore: number,
 *   breakdown: { diagnosis, criticalActions, communication, efficiency },
 *   whatWentWell: string[],
 *   missed: string[],
 *   redFlagsMissed: string[],
 *   recommendations: string[]
 * }
 */
export function getFeedback(req: Request, res: Response): void {
  try {
    const { sessionId } = req.query;
    
    // Validate inputs
    if (!sessionId || typeof sessionId !== 'string') {
      res.status(400).json({ error: 'Missing or invalid sessionId query parameter' });
      return;
    }
    
    // Get session
    const session = getSession(sessionId as string);
    if (!session) {
      res.status(404).json({ error: 'Session not found or expired' });
      return;
    }
    
    // Check if session is completed
    if (session.isActive) {
      res.status(400).json({ error: 'Session must be completed before getting feedback' });
      return;
    }
    
    // Return cached feedback if available
    if (session.feedbackResult) {
      res.json(session.feedbackResult);
      return;
    }
    
    // Load case data via A1 loader
    let caseData;
    try {
      caseData = loadCase(session.caseId);
    } catch (error: any) {
      res.status(500).json({ error: `Failed to load case: ${session.caseId}` });
      return;
    }
    
    // Call F1's analyzeSession function
    const feedbackResult = analyzeSession(session, caseData);
    
    // Store feedback result in session (cache it)
    storeFeedback(sessionId as string, feedbackResult);
    
    res.json(feedbackResult);
    
  } catch (error: any) {
    console.error('Error getting feedback:', error);
    
    if (error.message && error.message.includes('Session')) {
      res.status(404).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Process an action and return deterministic result
 * This handles physical exams, labs, imaging, treatments, etc.
 */
function processAction(session: any, actionType: string, details?: any): string {
  const { case: caseData, level, revealedFacts } = session;
  
  // Normalize action type to lowercase for matching
  const normalizedAction = actionType.toLowerCase();
  
  // Physical exam actions
  if (normalizedAction.includes('exam') || normalizedAction.includes('examine')) {
    if (normalizedAction.includes('cardiac') || normalizedAction.includes('heart')) {
      revealedFacts.physicalExam.push('cardiovascular');
      const findings = caseData.physicalExam.cardiovascular?.[`level${level}` as 'level1' | 'level2' | 'level3'];
      return findings || 'Cardiovascular exam: No murmurs, regular rhythm.';
    }
    if (normalizedAction.includes('respiratory') || normalizedAction.includes('lung')) {
      revealedFacts.physicalExam.push('respiratory');
      const findings = caseData.physicalExam.respiratory?.[`level${level}` as 'level1' | 'level2' | 'level3'];
      return findings || 'Respiratory exam: Clear to auscultation bilaterally.';
    }
    if (normalizedAction.includes('abdominal') || normalizedAction.includes('abdomen')) {
      revealedFacts.physicalExam.push('abdominal');
      const findings = caseData.physicalExam.abdominal?.[`level${level}` as 'level1' | 'level2' | 'level3'];
      return findings || 'Abdominal exam: Soft, non-tender, non-distended.';
    }
    // Generic exam
    return `General exam performed. Patient appears as described in presentation.`;
  }
  
  // Vitals check
  if (normalizedAction.includes('vital') || normalizedAction.includes('vitals')) {
    const vitals = caseData.physicalExam.vitals[`level${level}` as 'level1' | 'level2' | 'level3'];
    return `Vitals: BP ${vitals.BP}, HR ${vitals.HR} bpm, RR ${vitals.RR}/min, Temp ${vitals.temp}°C, O2 Sat ${vitals.O2}%`;
  }
  
  // Lab orders
  if (normalizedAction.includes('order') || normalizedAction.includes('lab')) {
    if (normalizedAction.includes('troponin')) {
      revealedFacts.diagnostics.push('troponin');
      if (caseData.diagnostics.labs?.results?.troponin) {
        const result = caseData.diagnostics.labs.results.troponin[`level${level}` as 'level1' | 'level2' | 'level3'];
        return `Troponin result: ${JSON.stringify(result)}`;
      }
      return 'Troponin ordered. Results pending...';
    }
    if (normalizedAction.includes('ekg') || normalizedAction.includes('ecg')) {
      revealedFacts.diagnostics.push('ekg');
      if (caseData.diagnostics.ekg) {
        const result = caseData.diagnostics.ekg[`level${level}` as 'level1' | 'level2' | 'level3'];
        return `EKG: ${result}`;
      }
      return 'EKG ordered. Results pending...';
    }
    return 'Lab test ordered. Results pending...';
  }
  
  // Imaging orders
  if (normalizedAction.includes('imaging') || normalizedAction.includes('xray') || normalizedAction.includes('ct')) {
    if (caseData.diagnostics.imaging?.available && caseData.diagnostics.imaging.available.length > 0) {
      const imagingType = caseData.diagnostics.imaging.available[0];
      revealedFacts.diagnostics.push(imagingType);
      if (caseData.diagnostics.imaging.results[imagingType]) {
        const result = caseData.diagnostics.imaging.results[imagingType][`level${level}` as 'level1' | 'level2' | 'level3'];
        return `${imagingType}: ${result}`;
      }
    }
    return 'Imaging ordered. Results pending...';
  }
  
  // Treatment actions
  if (normalizedAction.includes('give') || normalizedAction.includes('administer')) {
    if (normalizedAction.includes('aspirin')) {
      return 'Aspirin 325mg given. Patient reports feeling slightly better.';
    }
    if (normalizedAction.includes('nitro') || normalizedAction.includes('nitroglycerin')) {
      return 'Nitroglycerin administered. Pain decreased.';
    }
    return 'Medication administered as ordered.';
  }
  
  // Default response for unrecognized actions
  return `Action "${actionType}" recorded.`;
}
