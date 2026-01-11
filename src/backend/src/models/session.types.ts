/**
 * Session Types
 * Defines the structure for active encounter sessions
 */

import { MedicalCase, RevealedFacts } from '../../../shared/types/case.types';
import { Message } from '../services/patientEngine';

export interface Session {
  sessionId: string;
  caseId: string;
  level: 1 | 2 | 3;
  userName: string;
  
  // Case data (loaded once at start)
  case: MedicalCase;
  
  // Conversation history
  messages: Message[]; // Alternating user/assistant messages
  
  // Track what facts have been revealed
  revealedFacts: RevealedFacts;
  
  // Track actions performed (e.g., "examined_heart", "ordered_troponin", "gave_aspirin")
  actions: SessionAction[];
  
  // Timing
  createdAt: number; // Unix timestamp (ms)
  updatedAt: number; // Last activity timestamp
  endedAt?: number; // When session ended (null if active)
  
  // Configuration
  timeLimitSec?: number; // Optional time limit for encounter
  maxTurns?: number; // Maximum number of user messages allowed
  
  // Current state
  currentTurn: number; // Number of user messages sent
  isActive: boolean; // True if session is still active
  
  // Completion and feedback (F2)
  submittedDiagnosis?: string; // Diagnosis submitted by student when ending session
  feedbackResult?: FeedbackResult; // Cached feedback result
}

export interface FeedbackResult {
  summaryScore: number;
  breakdown: {
    diagnosis: number;
    criticalActions: number;
    communication: number;
    efficiency: number;
  };
  whatWentWell: string[];
  missed: string[];
  redFlagsMissed: string[];
  recommendations: string[];
}

export interface SessionAction {
  actionType: string; // e.g., "examined_cardiac", "ordered_lab", "gave_medication"
  timestamp: number; // Unix timestamp (ms)
  details?: any; // Optional action-specific data
  result?: string; // Deterministic result from action (e.g., exam findings, lab results)
}

export interface CreateSessionParams {
  caseId: string;
  level: 1 | 2 | 3;
  userName: string;
  timeLimitSec?: number;
  maxTurns?: number;
}
