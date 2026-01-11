/**
 * Feedback Types
 * Defines the structure for session feedback and scoring results
 */

export interface FeedbackResult {
  summaryScore: number; // 0-100 total score
  breakdown: {
    diagnosis: number; // 0-25 points (20 for correctness + 5 for intervention)
    diagnosisCorrectness: number; // 0-20 points (for diagnosis correctness)
    intervention: number; // 0-5 points (for intervention appropriateness)
    criticalActions: number; // 0-25 points
    communication: number; // 0-20 points
    efficiency: number; // 0-30 points
  };
  timing: {
    timeLimitSec: number;
    actualDurationSec: number;
    exceededBySec?: number; // Only present if exceeded
    timeUsedPercent: number;
  };
  whatWentWell: string[];
  missed: string[];
  redFlagsMissed: string[];
  recommendations: string[];
  solution?: {
    primaryDiagnosis: string;
    criticalActions: string[];
  };
}

export interface ScoringContext {
  diagnosisScore: number;
  criticalActionsScore: number;
  communicationScore: number;
  efficiencyScore: number;
  performedCriticalActions: string[];
  missedCriticalActions: string[];
  missedRedFlags: Array<{ action: string; consequence?: string }>;
  timeLimit: number;
  duration: number;
}
