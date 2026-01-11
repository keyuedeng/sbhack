"use strict";
/**
 * Session Store
 * In-memory session storage with TTL cleanup
 * For hackathon MVP - no database needed
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCleanupTimer = startCleanupTimer;
exports.stopCleanupTimer = stopCleanupTimer;
exports.createSession = createSession;
exports.getSession = getSession;
exports.appendMessage = appendMessage;
exports.recordAction = recordAction;
exports.markEnded = markEnded;
exports.storeFeedback = storeFeedback;
exports.getStats = getStats;
const crypto_1 = require("crypto");
// In-memory store: Map<sessionId, Session>
const sessions = new Map();
// Default TTL: 2 hours (7200000 ms) - sessions expire after 2 hours of inactivity
const DEFAULT_TTL_MS = 2 * 60 * 60 * 1000;
// Cleanup interval: check every 15 minutes for expired sessions
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;
let cleanupInterval = null;
/**
 * Initialize cleanup timer (call once on server start)
 */
function startCleanupTimer() {
    if (cleanupInterval) {
        return; // Already started
    }
    cleanupInterval = setInterval(() => {
        cleanupExpiredSessions();
    }, CLEANUP_INTERVAL_MS);
    console.log('Session cleanup timer started');
}
/**
 * Stop cleanup timer (call on server shutdown)
 */
function stopCleanupTimer() {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
    }
}
/**
 * Clean up expired sessions
 */
function cleanupExpiredSessions() {
    const now = Date.now();
    let cleaned = 0;
    for (const [sessionId, session] of sessions.entries()) {
        const timeSinceUpdate = now - session.updatedAt;
        // Check if session expired (TTL exceeded)
        if (timeSinceUpdate > DEFAULT_TTL_MS) {
            sessions.delete(sessionId);
            cleaned++;
        }
        // Also check explicit time limit if set
        if (session.timeLimitSec && session.isActive) {
            const elapsedSec = Math.floor((now - session.createdAt) / 1000);
            if (elapsedSec > session.timeLimitSec) {
                markEnded(sessionId);
                cleaned++;
            }
        }
    }
    if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} expired sessions`);
    }
}
/**
 * Create a new session
 *
 * @param params - Session creation parameters
 * @param caseData - The loaded medical case
 * @returns The created session object
 */
function createSession(params, caseData) {
    const sessionId = (0, crypto_1.randomUUID)();
    const now = Date.now();
    // Initialize revealed facts tracking
    const revealedFacts = {
        hpi: params.caseId === caseData.caseId && caseData.revealRules.hpi === 'always',
        pmh: caseData.revealRules.pmh === 'always' ? [...caseData.history.pmh] : [],
        medications: caseData.revealRules.medications === 'always',
        allergies: caseData.revealRules.allergies === 'always',
        socialHistory: [],
        familyHistory: false,
        physicalExam: [],
        diagnostics: []
    };
    const session = {
        sessionId,
        caseId: params.caseId,
        level: params.level,
        userName: params.userName,
        case: caseData,
        messages: [],
        revealedFacts,
        actions: [],
        createdAt: now,
        updatedAt: now,
        timeLimitSec: params.timeLimitSec,
        maxTurns: params.maxTurns,
        currentTurn: 0,
        isActive: true
    };
    sessions.set(sessionId, session);
    console.log(`Created session ${sessionId} for case ${params.caseId}`);
    return session;
}
/**
 * Get a session by ID
 *
 * @param sessionId - The session ID
 * @returns The session object or null if not found/expired
 */
function getSession(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) {
        return null;
    }
    // Check if expired
    const now = Date.now();
    const timeSinceUpdate = now - session.updatedAt;
    if (timeSinceUpdate > DEFAULT_TTL_MS) {
        sessions.delete(sessionId);
        return null;
    }
    // Check explicit time limit
    if (session.timeLimitSec && session.isActive) {
        const elapsedSec = Math.floor((now - session.createdAt) / 1000);
        if (elapsedSec > session.timeLimitSec) {
            markEnded(sessionId);
            return getSession(sessionId); // Return updated (ended) session
        }
    }
    return session;
}
/**
 * Append a message to the session conversation history
 *
 * @param sessionId - The session ID
 * @param role - Message role ('user' or 'assistant')
 * @param text - Message content
 */
function appendMessage(sessionId, role, text) {
    const session = getSession(sessionId);
    if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
    }
    if (!session.isActive) {
        throw new Error(`Session ${sessionId} has ended`);
    }
    session.messages.push({
        role,
        content: text
    });
    // Increment turn counter for user messages
    if (role === 'user') {
        session.currentTurn++;
        // Check max turns limit
        if (session.maxTurns && session.currentTurn >= session.maxTurns) {
            markEnded(sessionId);
        }
    }
    session.updatedAt = Date.now();
}
/**
 * Record an action performed during the session
 *
 * @param sessionId - The session ID
 * @param actionType - Type of action (e.g., "examined_cardiac", "ordered_troponin")
 * @param details - Optional action-specific details
 * @param result - Optional deterministic result from the action
 */
function recordAction(sessionId, actionType, details, result) {
    const session = getSession(sessionId);
    if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
    }
    if (!session.isActive) {
        throw new Error(`Session ${sessionId} has ended`);
    }
    const action = {
        actionType,
        timestamp: Date.now(),
        details,
        result
    };
    session.actions.push(action);
    session.updatedAt = Date.now();
    console.log(`Action recorded for session ${sessionId}: ${actionType}`);
}
/**
 * Mark a session as ended
 *
 * @param sessionId - The session ID
 * @param diagnosis - Optional diagnosis submitted by student
 */
function markEnded(sessionId, diagnosis) {
    const session = sessions.get(sessionId);
    if (!session) {
        return; // Already deleted or doesn't exist
    }
    session.isActive = false;
    session.endedAt = Date.now();
    session.updatedAt = Date.now();
    // Store submitted diagnosis if provided
    if (diagnosis) {
        session.submittedDiagnosis = diagnosis.trim();
    }
    console.log(`Session ${sessionId} marked as ended${diagnosis ? ` with diagnosis: ${diagnosis}` : ''}`);
}
/**
 * Store feedback result in session (cache feedback)
 *
 * @param sessionId - The session ID
 * @param feedbackResult - The feedback result from F1's analyzeSession
 */
function storeFeedback(sessionId, feedbackResult) {
    const session = sessions.get(sessionId);
    if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
    }
    session.feedbackResult = feedbackResult;
    session.updatedAt = Date.now();
    console.log(`Feedback stored for session ${sessionId} - Score: ${feedbackResult.summaryScore}`);
}
/**
 * Get statistics about active sessions (useful for debugging)
 */
function getStats() {
    const now = Date.now();
    let active = 0;
    let expired = 0;
    for (const session of sessions.values()) {
        const timeSinceUpdate = now - session.updatedAt;
        if (timeSinceUpdate > DEFAULT_TTL_MS || (session.endedAt && !session.isActive)) {
            expired++;
        }
        else {
            active++;
        }
    }
    return {
        total: sessions.size,
        active,
        expired
    };
}
