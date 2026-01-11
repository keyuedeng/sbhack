"use strict";
/**
 * Analyze Session
 * Main entry point for session feedback and scoring
 *
 * This is a pure function module - no side effects, no API calls
 * Takes a session and case data, returns structured feedback
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeSession = analyzeSession;
const scoringRules_1 = require("./scoringRules");
const feedbackTemplates_1 = require("./feedbackTemplates");
/**
 * Analyze a completed session and generate feedback
 *
 * @param session - The session object with messages, actions, and timing
 * @param caseData - The medical case data with diagnosis, critical actions, etc.
 * @returns Structured feedback with scores and recommendations
 */
function analyzeSession(session, caseData) {
    // Calculate all scores
    const context = (0, scoringRules_1.calculateScoringContext)(session, caseData);
    // Calculate summary score (sum of all breakdown scores)
    const summaryScore = Math.min(100, Math.round(context.diagnosisScore +
        context.criticalActionsScore +
        context.communicationScore +
        context.efficiencyScore));
    // Calculate timing information
    const timeLimit = context.timeLimit;
    const duration = context.duration;
    const timeUsedPercent = (duration / timeLimit) * 100;
    const exceededBySec = duration > timeLimit ? duration - timeLimit : undefined;
    // Generate feedback text
    const whatWentWell = (0, feedbackTemplates_1.generateWhatWentWell)(context, caseData);
    const missed = (0, feedbackTemplates_1.generateMissed)(context, caseData);
    const redFlagsMissed = (0, feedbackTemplates_1.generateRedFlagsMissed)(context);
    const recommendations = (0, feedbackTemplates_1.generateRecommendations)(context, caseData);
    // Construct and return feedback result
    return {
        summaryScore,
        breakdown: {
            diagnosis: context.diagnosisScore,
            criticalActions: context.criticalActionsScore,
            communication: context.communicationScore,
            efficiency: context.efficiencyScore
        },
        timing: {
            timeLimitSec: timeLimit,
            actualDurationSec: duration,
            ...(exceededBySec !== undefined && { exceededBySec }),
            timeUsedPercent: Math.round(timeUsedPercent * 10) / 10 // Round to 1 decimal
        },
        whatWentWell,
        missed,
        redFlagsMissed,
        recommendations
    };
}
