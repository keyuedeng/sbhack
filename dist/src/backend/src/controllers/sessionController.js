"use strict";
/**
 * Session Controller
 * Handles all session-related HTTP requests
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAudio = void 0;
exports.startSession = startSession;
exports.sendMessage = sendMessage;
exports.recordSessionAction = recordSessionAction;
exports.endSession = endSession;
exports.exportSession = exportSession;
exports.getFeedback = getFeedback;
exports.generateTTS = generateTTS;
exports.transcribeAudio = transcribeAudio;
const caseLoader_1 = require("../services/caseLoader");
const sessionStore_1 = require("../store/sessionStore");
const patientEngine_1 = require("../services/patientEngine");
const feedback_1 = require("../feedback");
const ttsService_1 = require("../services/ttsService");
const transcriptionService_1 = require("../services/transcriptionService");
const multer_1 = __importDefault(require("multer"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
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
async function startSession(req, res) {
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
            caseData = (0, caseLoader_1.loadCase)(safeCaseId);
        }
        catch (error) {
            res.status(404).json({ error: `Case not found: ${safeCaseId}` });
            return;
        }
        // Validate level matches case level (optional check - could allow any level)
        // For now, we'll use the requested level even if it differs from case level
        // Create session
        const params = {
            caseId: safeCaseId,
            level: level,
            userName: safeUserName,
            timeLimitSec: timeLimitSec ? Math.min(Math.max(timeLimitSec, 60), 7200) : undefined, // 1 min to 2 hours
            maxTurns: maxTurns ? Math.min(Math.max(maxTurns, 1), 100) : undefined // 1 to 100 turns
        };
        const session = (0, sessionStore_1.createSession)(params, caseData);
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
    }
    catch (error) {
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
async function sendMessage(req, res) {
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
        const session = (0, sessionStore_1.getSession)(sessionId);
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
        (0, sessionStore_1.appendMessage)(sessionId, 'user', sanitizedMessage);
        // Generate patient reply using A1 patientEngine
        let patientReply;
        try {
            patientReply = await (0, patientEngine_1.generatePatientReply)({
                case: session.case,
                level: session.level,
                revealedFacts: session.revealedFacts,
                conversationHistory: session.messages.slice(0, -1), // All messages except the one we just added
                userInput: sanitizedMessage
            });
        }
        catch (error) {
            console.error('Error generating patient reply:', error?.message || error);
            console.error('Stack:', error?.stack);
            // Fallback response if LLM call fails
            patientReply = "Sorry, can you repeat that? I didn't catch that.";
        }
        // Append patient reply to session
        (0, sessionStore_1.appendMessage)(sessionId, 'assistant', patientReply);
        // Get updated session to check current turn
        const updatedSession = (0, sessionStore_1.getSession)(sessionId);
        res.json({
            patientReply,
            currentTurn: updatedSession?.currentTurn || 0,
            maxTurns: updatedSession?.maxTurns,
            isActive: updatedSession?.isActive ?? false
        });
    }
    catch (error) {
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
async function recordSessionAction(req, res) {
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
        const session = (0, sessionStore_1.getSession)(sessionId);
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
        (0, sessionStore_1.recordAction)(sessionId, sanitizedActionType, details, result);
        res.json({
            result,
            actionRecorded: true
        });
    }
    catch (error) {
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
function endSession(req, res) {
    try {
        const { sessionId, diagnosis } = req.body;
        // Validate inputs
        if (!sessionId || typeof sessionId !== 'string') {
            res.status(400).json({ error: 'Missing or invalid sessionId' });
            return;
        }
        // Get session to verify it exists
        const session = (0, sessionStore_1.getSession)(sessionId);
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
        (0, sessionStore_1.markEnded)(sessionId, sanitizedDiagnosis);
        // Get updated session to get end time
        const updatedSession = (0, sessionStore_1.getSession)(sessionId);
        res.json({
            success: true,
            sessionId,
            endedAt: updatedSession?.endedAt,
            submittedDiagnosis: sanitizedDiagnosis
        });
    }
    catch (error) {
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
function exportSession(req, res) {
    try {
        const { sessionId } = req.query;
        if (!sessionId || typeof sessionId !== 'string') {
            res.status(400).json({ error: 'Missing or invalid sessionId query parameter' });
            return;
        }
        const session = (0, sessionStore_1.getSession)(sessionId);
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
    }
    catch (error) {
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
function getFeedback(req, res) {
    try {
        const { sessionId } = req.query;
        // Validate inputs
        if (!sessionId || typeof sessionId !== 'string') {
            res.status(400).json({ error: 'Missing or invalid sessionId query parameter' });
            return;
        }
        // Get session
        const session = (0, sessionStore_1.getSession)(sessionId);
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
            caseData = (0, caseLoader_1.loadCase)(session.caseId);
        }
        catch (error) {
            res.status(500).json({ error: `Failed to load case: ${session.caseId}` });
            return;
        }
        // Call F1's analyzeSession function
        const feedbackResult = (0, feedback_1.analyzeSession)(session, caseData);
        // Store feedback result in session (cache it)
        (0, sessionStore_1.storeFeedback)(sessionId, feedbackResult);
        res.json(feedbackResult);
    }
    catch (error) {
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
function processAction(session, actionType, details) {
    const { case: caseData, level, revealedFacts } = session;
    // Normalize action type to lowercase for matching
    const normalizedAction = actionType.toLowerCase();
    // Physical exam actions
    if (normalizedAction.includes('exam') || normalizedAction.includes('examine')) {
        if (normalizedAction.includes('cardiac') || normalizedAction.includes('heart')) {
            revealedFacts.physicalExam.push('cardiovascular');
            const findings = caseData.physicalExam.cardiovascular?.[`level${level}`];
            return findings || 'Cardiovascular exam: No murmurs, regular rhythm.';
        }
        if (normalizedAction.includes('respiratory') || normalizedAction.includes('lung')) {
            revealedFacts.physicalExam.push('respiratory');
            const findings = caseData.physicalExam.respiratory?.[`level${level}`];
            return findings || 'Respiratory exam: Clear to auscultation bilaterally.';
        }
        if (normalizedAction.includes('abdominal') || normalizedAction.includes('abdomen')) {
            revealedFacts.physicalExam.push('abdominal');
            const findings = caseData.physicalExam.abdominal?.[`level${level}`];
            return findings || 'Abdominal exam: Soft, non-tender, non-distended.';
        }
        // Generic exam
        return `General exam performed. Patient appears as described in presentation.`;
    }
    // Vitals check
    if (normalizedAction.includes('vital') || normalizedAction.includes('vitals')) {
        const vitals = caseData.physicalExam.vitals[`level${level}`];
        return `Vitals: BP ${vitals.BP}, HR ${vitals.HR} bpm, RR ${vitals.RR}/min, Temp ${vitals.temp}°C, O2 Sat ${vitals.O2}%`;
    }
    // Lab orders
    if (normalizedAction.includes('order') || normalizedAction.includes('lab')) {
        if (normalizedAction.includes('troponin')) {
            revealedFacts.diagnostics.push('troponin');
            if (caseData.diagnostics.labs?.results?.troponin) {
                const result = caseData.diagnostics.labs.results.troponin[`level${level}`];
                return `Troponin result: ${JSON.stringify(result)}`;
            }
            return 'Troponin ordered. Results pending...';
        }
        if (normalizedAction.includes('ekg') || normalizedAction.includes('ecg')) {
            revealedFacts.diagnostics.push('ekg');
            if (caseData.diagnostics.ekg) {
                const result = caseData.diagnostics.ekg[`level${level}`];
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
                const result = caseData.diagnostics.imaging.results[imagingType][`level${level}`];
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
/**
 * POST /session/tts
 * Generate text-to-speech audio from text
 *
 * Request body:
 * {
 *   text: string
 * }
 *
 * Response:
 * {
 *   audioUrl: string
 * }
 */
async function generateTTS(req, res) {
    try {
        const { text } = req.body;
        // Validate inputs
        if (!text || typeof text !== 'string') {
            res.status(400).json({ error: 'Missing or invalid text' });
            return;
        }
        // Sanitize text (limit length)
        const sanitizedText = text.trim().substring(0, 2000); // Max 2000 chars
        if (!sanitizedText) {
            res.status(400).json({ error: 'Text cannot be empty' });
            return;
        }
        // Generate speech using TTS service
        const audioUrl = await (0, ttsService_1.generateSpeech)(sanitizedText);
        res.json({
            audioUrl
        });
    }
    catch (error) {
        console.error('Error generating TTS:', error);
        // Handle specific errors
        if (error.message && error.message.includes('DEEPGRAM_API_KEY')) {
            res.status(500).json({ error: 'TTS service configuration error' });
            return;
        }
        res.status(500).json({ error: 'Failed to generate speech' });
    }
}
/**
 * POST /session/transcribe
 * Transcribe audio file to text
 *
 * Request: multipart/form-data with 'audio' file
 *
 * Response:
 * {
 *   transcript: string
 * }
 */
async function transcribeAudio(req, res) {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No audio file provided' });
            return;
        }
        const audioFilePath = req.file.path;
        try {
            console.log('Received audio file:', audioFilePath, 'Size:', req.file.size, 'Type:', req.file.mimetype);
            // Transcribe audio using transcription service
            const transcript = await (0, transcriptionService_1.transcribeAudio)(audioFilePath);
            console.log('Transcription successful:', transcript);
            // Clean up temporary file
            try {
                fs.unlinkSync(audioFilePath);
            }
            catch (cleanupError) {
                console.error('Error cleaning up temp file:', cleanupError);
            }
            res.json({
                transcript
            });
        }
        catch (error) {
            // Clean up temporary file on error
            try {
                fs.unlinkSync(audioFilePath);
            }
            catch (cleanupError) {
                console.error('Error cleaning up temp file:', cleanupError);
            }
            throw error;
        }
    }
    catch (error) {
        console.error('Error transcribing audio:', error);
        res.status(500).json({ error: 'Failed to transcribe audio' });
    }
}
// Export multer middleware for route
exports.uploadAudio = (0, multer_1.default)({
    dest: path.join(process.cwd(), 'src', 'backend', 'public', 'temp'),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});
