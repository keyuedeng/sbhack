/**
 * Scoring Rules
 * Functions for calculating scores based on session data
 * Uses LLM for diagnosis comparison, with fallback to string matching
 */

import { Session } from '../models/session.types';
import { MedicalCase, RedFlag } from '../../../shared/types/case.types';
import { ScoringContext } from './types';
import OpenAI from 'openai';

// Time limits per level (in seconds)
export const TIME_LIMITS = {
  1: 5 * 60,   // 5 minutes = 300 seconds
  2: 7 * 60,   // 7 minutes = 420 seconds
  3: 10 * 60   // 10 minutes = 600 seconds
};

// Scoring weights (can be adjusted)
const MAX_DIAGNOSIS_SCORE = 25;
const MAX_CRITICAL_ACTIONS_SCORE = 25;
const MAX_COMMUNICATION_SCORE = 20;
const MAX_EFFICIENCY_SCORE = 30;

/**
 * Get the effective time limit for a session
 */
export function getTimeLimit(session: Session): number {
  return session.timeLimitSec ?? TIME_LIMITS[session.level];
}

/**
 * Calculate actual session duration in seconds
 */
export function getSessionDuration(session: Session): number {
  const endTime = session.endedAt ?? Date.now();
  return Math.floor((endTime - session.createdAt) / 1000);
}

/**
 * Score diagnosis correctness (0-25 points) using LLM comparison
 * Uses the submitted diagnosis from the session, not conversation messages
 */
export async function scoreDiagnosis(session: Session, caseData: MedicalCase): Promise<number> {
  // Use submittedDiagnosis if available (from diagnosis submission), otherwise check messages
  const diagnosisText = session.submittedDiagnosis 
    ? session.submittedDiagnosis.toLowerCase()
    : session.messages.filter(m => m.role === 'user').map(m => m.content.toLowerCase()).join(' ');
  
  // Extract just the diagnosis part (before "| Intervention:")
  const diagnosisOnly = diagnosisText.split('| intervention:')[0].trim();
  
  if (!diagnosisOnly) {
    return 0;
  }
  
  const primaryDiagnosis = caseData.diagnosis.primary;
  const differentials = caseData.diagnosis.differentials;
  
  // Try LLM-based comparison first
  try {
    const llmScore = await compareDiagnosisWithLLM(diagnosisOnly, primaryDiagnosis, differentials);
    if (llmScore !== null) {
      return llmScore;
    }
  } catch (error: any) {
    console.error('Error in LLM diagnosis comparison, falling back to string matching:', error?.message || error);
  }
  
  // Fallback to string matching if LLM fails
  const diagnosisOnlyLower = diagnosisOnly.toLowerCase();
  const primaryDiagnosisLower = primaryDiagnosis.toLowerCase();
  const differentialsLower = differentials.map(d => d.toLowerCase());
  
  // Check for exact or close match of primary diagnosis
  if (containsDiagnosis(diagnosisOnlyLower, primaryDiagnosisLower)) {
    return MAX_DIAGNOSIS_SCORE;
  }
  
  // Check for differential diagnoses (partial credit)
  for (const diff of differentialsLower) {
    if (containsDiagnosis(diagnosisOnlyLower, diff)) {
      return Math.floor(MAX_DIAGNOSIS_SCORE * 0.6); // 60% credit for differential
    }
  }
  
  return 0;
}

/**
 * Compare submitted diagnosis with correct answer using LLM
 * Returns: 25 for correct, 15 for differential, 0 for incorrect, null if error
 */
async function compareDiagnosisWithLLM(
  submittedDiagnosis: string,
  primaryDiagnosis: string,
  differentials: string[]
): Promise<number | null> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const systemPrompt = `You are a medical education assistant evaluating a student's diagnosis submission.

Your task is to compare the student's submitted diagnosis with the correct answer and determine if they match.

Scoring rules:
- If the student's diagnosis matches the PRIMARY diagnosis (exact match, synonym, or equivalent medical term), return: "PRIMARY"
- If the student's diagnosis matches one of the DIFFERENTIAL diagnoses (exact match, synonym, or equivalent medical term), return: "DIFFERENTIAL"
- If the student's diagnosis is completely wrong or unrelated, return: "INCORRECT"

Important:
- Be flexible with medical terminology - "NSTEMI" = "Non-ST Elevation Myocardial Infarction" = "non-ST elevation MI"
- Consider synonyms and abbreviations
- "Acute coronary syndrome" is broader than "NSTEMI" but could be a differential
- Be STRICT - only return PRIMARY if it's truly the same diagnosis, not just related
- If the student's diagnosis is wrong (even if related to the correct diagnosis), return "INCORRECT"
- Only return PRIMARY for exact matches or medically equivalent terms
- Only return DIFFERENTIAL if it matches one of the listed differential diagnoses
- If it doesn't match primary or any differential, return "INCORRECT"

Examples:
- Primary is "NSTEMI", student says "NSTEMI" or "Non-ST Elevation MI" → PRIMARY
- Primary is "NSTEMI", student says "Acute coronary syndrome" → DIFFERENTIAL (if in differentials list)
- Primary is "NSTEMI", student says "STEMI" or "GERD" or "Appendicitis" → INCORRECT

Respond with ONLY one word: "PRIMARY", "DIFFERENTIAL", or "INCORRECT"`;

  const userPrompt = `Correct PRIMARY diagnosis: ${primaryDiagnosis}

Correct DIFFERENTIAL diagnoses: ${differentials.join(', ')}

Student's submitted diagnosis: "${submittedDiagnosis}"

Does the student's diagnosis match the primary diagnosis, a differential diagnosis, or is it incorrect?`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1, // Low temperature for consistent evaluation
      max_tokens: 10
    });

    const rawResult = response.choices[0]?.message?.content?.trim().toUpperCase();
    
    // Extract the result word (handle cases where LLM returns more than one word)
    let result: string;
    if (rawResult?.includes('PRIMARY')) {
      result = 'PRIMARY';
    } else if (rawResult?.includes('DIFFERENTIAL')) {
      result = 'DIFFERENTIAL';
    } else if (rawResult?.includes('INCORRECT')) {
      result = 'INCORRECT';
    } else {
      // If we can't parse the result, default to incorrect for safety
      console.warn(`[Diagnosis Comparison] Could not parse LLM result: "${rawResult}", defaulting to INCORRECT`);
      result = 'INCORRECT';
    }
    
    // Log for debugging
    console.log(`[Diagnosis Comparison] Submitted: "${submittedDiagnosis}", Primary: "${primaryDiagnosis}", LLM Result: "${result}" (raw: "${rawResult}")`);
    
    if (result === 'PRIMARY') {
      return MAX_DIAGNOSIS_SCORE; // 25 points
    } else if (result === 'DIFFERENTIAL') {
      return Math.floor(MAX_DIAGNOSIS_SCORE * 0.6); // 15 points (60% credit)
    } else {
      return 0; // Incorrect
    }
  } catch (error: any) {
    console.error('OpenAI API error in diagnosis comparison:', error?.message || error);
    return null; // Return null to trigger fallback
  }
}

/**
 * Helper: Check if text contains diagnosis (fuzzy matching)
 */
function containsDiagnosis(text: string, diagnosis: string): boolean {
  // Normalize: remove punctuation, handle common variations
  const normalizedText = text.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
  const normalizedDiagnosis = diagnosis.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
  
  // Check for exact match or key words
  if (normalizedText.includes(normalizedDiagnosis)) {
    return true;
  }
  
  // Check for common abbreviations (e.g., "NSTEMI" = "non-st elevation mi")
  const keyWords = normalizedDiagnosis.split(' ').filter(w => w.length > 3);
  const allKeyWordsPresent = keyWords.length > 0 && keyWords.every(word => 
    normalizedText.includes(word)
  );
  
  return allKeyWordsPresent;
}

/**
 * Score critical actions performed (0-25 points)
 * Returns score and lists of performed/missed actions
 */
export function scoreCriticalActions(
  session: Session,
  caseData: MedicalCase
): { score: number; performed: string[]; missed: string[] } {
  const criticalActions = caseData.diagnosis.criticalActions;
  
  if (criticalActions.length === 0) {
    return { score: MAX_CRITICAL_ACTIONS_SCORE, performed: [], missed: [] };
  }
  
  const performed: string[] = [];
  const missed: string[] = [];
  
  for (const criticalAction of criticalActions) {
    const wasPerformed = session.actions.some(action => 
      matchesAction(action.actionType, criticalAction)
    );
    
    if (wasPerformed) {
      performed.push(criticalAction);
    } else {
      missed.push(criticalAction);
    }
  }
  
  const pointsPerAction = MAX_CRITICAL_ACTIONS_SCORE / criticalActions.length;
  const score = Math.round(performed.length * pointsPerAction);
  
  return { score, performed, missed };
}

/**
 * Score red flags / time-sensitive actions
 * Returns list of missed red flags
 */
export function scoreRedFlags(
  session: Session,
  caseData: MedicalCase
): Array<{ action: string; consequence?: string }> {
  const redFlags = caseData.progression?.redFlags ?? [];
  const missed: Array<{ action: string; consequence?: string }> = [];
  
  for (const redFlag of redFlags) {
    const matchingActions = session.actions.filter(action =>
      matchesAction(action.actionType, redFlag.action)
    );
    
    if (matchingActions.length === 0) {
      // Action was never performed
      missed.push({
        action: redFlag.action,
        consequence: redFlag.consequence
      });
      continue;
    }
    
    // Check if performed within time window
    if (redFlag.timeWindow) {
      const timeWindowMs = redFlag.timeWindow * 60 * 1000; // Convert minutes to ms
      const performedOnTime = matchingActions.some(action => {
        const elapsedMs = action.timestamp - session.createdAt;
        return elapsedMs <= timeWindowMs;
      });
      
      if (!performedOnTime) {
        missed.push({
          action: `${redFlag.action} (performed late)`,
          consequence: redFlag.consequence
        });
      }
    }
  }
  
  return missed;
}

/**
 * Helper: Match action type to critical action (fuzzy matching)
 */
function matchesAction(actionType: string, criticalAction: string): boolean {
  const normalizedAction = actionType.toLowerCase().replace(/[_\s-]/g, ' ');
  const normalizedCritical = criticalAction.toLowerCase().replace(/[_\s-]/g, ' ');
  
  // Extract key words from critical action (skip common words)
  const skipWords = new Set(['the', 'a', 'an', 'and', 'or', 'within', 'minutes', 'obtain', 'get']);
  const keyWords = normalizedCritical
    .split(' ')
    .filter(w => w.length > 2 && !skipWords.has(w));
  
  if (keyWords.length === 0) {
    return normalizedAction.includes(normalizedCritical) || 
           normalizedCritical.includes(normalizedAction);
  }
  
  // Check if all key words are present in action type
  const allKeyWordsPresent = keyWords.every(word => normalizedAction.includes(word));
  if (allKeyWordsPresent) return true;
  
  // Also check if action type contains the primary medical term
  // Common medical terms that should match
  const medicalTerms: { [key: string]: string[] } = {
    'aspirin': ['aspirin', 'asa'],
    'ekg': ['ekg', 'ecg', 'electrocardiogram'],
    'ecg': ['ekg', 'ecg', 'electrocardiogram'],
    'troponin': ['troponin', 'trop'],
    'nitroglycerin': ['nitro', 'nitroglycerin', 'gtn'],
    'iv': ['iv', 'intravenous', 'access'],
    'monitoring': ['monitoring', 'monitor', 'cardiac'],
    'cardiology': ['cardiology', 'cardiac', 'consult']
  };
  
  // Check if critical action contains a medical term and action type matches it
  for (const [term, variations] of Object.entries(medicalTerms)) {
    if (normalizedCritical.includes(term)) {
      // Check if action type contains any variation
      const actionMatches = variations.some(variant => normalizedAction.includes(variant));
      if (actionMatches) {
        return true;
      }
    }
  }
  
  // Also check reverse: if action type contains term, check if critical action has it
  for (const [term, variations] of Object.entries(medicalTerms)) {
    if (normalizedAction.includes(term)) {
      const criticalMatches = variations.some(variant => normalizedCritical.includes(variant));
      if (criticalMatches) {
        return true;
      }
    }
  }
  
  // Action verb matching (give/ordered/administer)
  const actionVerbs: { [key: string]: string[] } = {
    'give': ['give', 'gave', 'administer', 'administered', 'provide'],
    'order': ['order', 'ordered', 'ordering', 'request', 'requested'],
    'obtain': ['obtain', 'ordered', 'get', 'request']
  };
  
  for (const [verb, variants] of Object.entries(actionVerbs)) {
    if (normalizedCritical.includes(verb)) {
      const hasVariant = variants.some(variant => normalizedAction.includes(variant));
      if (hasVariant) {
        // If verb matches, check if medical term also matches
        for (const [term, termVariations] of Object.entries(medicalTerms)) {
          if (normalizedCritical.includes(term) && normalizedAction.includes(term)) {
            return true;
          }
        }
      }
    }
  }
  
  return false;
}

/**
 * Score communication quality (0-20 points)
 */
export function scoreCommunication(session: Session, caseData: MedicalCase): number {
  const userMessages = session.messages.filter(m => m.role === 'user');
  const allText = userMessages.map(m => m.content.toLowerCase()).join(' ');
  
  let score = 0;
  
  // Check for pain characteristics questions (5 points)
  const painKeywords = ['where', 'pain', 'hurt', 'radiate', 'radiation', 'quality', 'sharp', 'dull', 'pressure'];
  const askedAboutPain = painKeywords.some(keyword => allText.includes(keyword));
  if (askedAboutPain) score += 5;
  
  // Check for past medical history questions (3 points)
  const pmhKeywords = ['past medical', 'history', 'previous', 'conditions', 'medical history', 'pmh'];
  const askedAboutPmh = pmhKeywords.some(keyword => allText.includes(keyword));
  if (askedAboutPmh) score += 3;
  
  // Check for medications/allergies questions (3 points)
  const medKeywords = ['medications', 'meds', 'drugs', 'allergies', 'allergic', 'taking any'];
  const askedAboutMeds = medKeywords.some(keyword => allText.includes(keyword));
  if (askedAboutMeds) score += 3;
  
  // Check for follow-up questions (4 points)
  const hasMultipleQuestions = userMessages.length >= 3;
  if (hasMultipleQuestions) score += 4;
  
  // Check for empathy/rapport (5 points)
  const empathyKeywords = ['how are you', 'feel', 'worried', 'concerned', 'understand', 'sorry'];
  const showedEmpathy = empathyKeywords.some(keyword => allText.includes(keyword));
  if (showedEmpathy) score += 5;
  
  return Math.min(score, MAX_COMMUNICATION_SCORE);
}

/**
 * Score efficiency (0-30 points)
 * Based on time usage and action ordering
 */
export function scoreEfficiency(session: Session): number {
  const timeLimit = getTimeLimit(session);
  const duration = getSessionDuration(session);
  const timeUsedPercent = (duration / timeLimit) * 100;
  
  // Time-based scoring (Option B: Moderate penalty)
  let timeScore: number;
  if (timeUsedPercent <= 50) {
    timeScore = 20; // Very efficient
  } else if (timeUsedPercent <= 75) {
    timeScore = 18; // Efficient
  } else if (timeUsedPercent <= 100) {
    timeScore = 15; // On time
  } else if (timeUsedPercent <= 120) {
    timeScore = 10; // Slightly over (up to 20% over)
  } else if (timeUsedPercent <= 150) {
    timeScore = 5; // Moderately over (20-50% over)
  } else {
    timeScore = 0; // Significantly over (>50% over)
  }
  
  // Action ordering bonus (up to 10 points)
  // Reward if critical actions were performed early
  const orderingScore = scoreActionOrdering(session);
  
  return Math.min(timeScore + orderingScore, MAX_EFFICIENCY_SCORE);
}

/**
 * Score action ordering - did they do important things early?
 */
function scoreActionOrdering(session: Session): number {
  // This is a simplified version - you could enhance this
  // For now, just check if they had reasonable number of actions
  const actionCount = session.actions.length;
  
  if (actionCount === 0) return 0;
  if (actionCount >= 3 && actionCount <= 10) return 5; // Reasonable number
  if (actionCount > 10) return 3; // Too many actions
  return 2; // Too few actions
}

/**
 * Calculate full scoring context (now async due to LLM-based diagnosis scoring)
 */
export async function calculateScoringContext(
  session: Session,
  caseData: MedicalCase
): Promise<ScoringContext> {
  const diagnosisScore = await scoreDiagnosis(session, caseData);
  const criticalActionsResult = scoreCriticalActions(session, caseData);
  const communicationScore = scoreCommunication(session, caseData);
  const efficiencyScore = scoreEfficiency(session);
  const missedRedFlags = scoreRedFlags(session, caseData);
  
  const timeLimit = getTimeLimit(session);
  const duration = getSessionDuration(session);
  
  return {
    diagnosisScore,
    criticalActionsScore: criticalActionsResult.score,
    communicationScore,
    efficiencyScore,
    performedCriticalActions: criticalActionsResult.performed,
    missedCriticalActions: criticalActionsResult.missed,
    missedRedFlags,
    timeLimit,
    duration
  };
}

