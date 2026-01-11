/**
 * Analyze Session
 * Main entry point for session feedback and scoring
 * 
 * Uses LLM for diagnosis comparison, with fallback to string matching
 * Takes a session and case data, returns structured feedback
 */

import { Session } from '../models/session.types';
import { MedicalCase } from '../../../shared/types/case.types';
import { FeedbackResult } from './types';
import { 
  calculateScoringContext, 
  getTimeLimit, 
  getSessionDuration 
} from './scoringRules';
import {
  generateWhatWentWell,
  generateMissed,
  generateRedFlagsMissed,
  generateRecommendations
} from './feedbackTemplates';

/**
 * Analyze a completed session and generate feedback
 * 
 * @param session - The session object with messages, actions, and timing
 * @param caseData - The medical case data with diagnosis, critical actions, etc.
 * @returns Structured feedback with scores and recommendations
 */
export async function analyzeSession(
  session: Session,
  caseData: MedicalCase
): Promise<FeedbackResult> {
  // Calculate all scores (diagnosis scoring is now async)
  const context = await calculateScoringContext(session, caseData);
  
  // Calculate summary score (sum of all breakdown scores)
  const summaryScore = Math.min(100, Math.round(
    context.diagnosisScore +
    context.criticalActionsScore +
    context.communicationScore +
    context.efficiencyScore
  ));
  
  // Calculate timing information
  const timeLimit = context.timeLimit;
  const duration = context.duration;
  const timeUsedPercent = (duration / timeLimit) * 100;
  const exceededBySec = duration > timeLimit ? duration - timeLimit : undefined;
  
  // Generate feedback text
  const whatWentWell = generateWhatWentWell(context, caseData);
  const missed = generateMissed(context, caseData);
  const redFlagsMissed = generateRedFlagsMissed(context);
  const recommendations = generateRecommendations(context, caseData);
  
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
