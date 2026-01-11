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
const MAX_DIAGNOSIS_SCORE = 25; // Total: diagnosis correctness (20) + intervention (5)
const MAX_DIAGNOSIS_CORRECTNESS_SCORE = 20; // For diagnosis correctness alone
const MAX_INTERVENTION_SCORE = 5; // For intervention appropriateness
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
 * Includes: diagnosis correctness (0-20) + intervention appropriateness (0-5)
 * Uses the submitted diagnosis from the session, not conversation messages
 * Returns an object with both scores separately
 */
export async function scoreDiagnosis(session: Session, caseData: MedicalCase): Promise<{ total: number; correctness: number; intervention: number }> {
  // Use submittedDiagnosis if available (from diagnosis submission), otherwise check messages
  const diagnosisText = session.submittedDiagnosis 
    ? session.submittedDiagnosis.toLowerCase()
    : session.messages.filter(m => m.role === 'user').map(m => m.content.toLowerCase()).join(' ');
  
  // Extract diagnosis and intervention parts
  const parts = diagnosisText.split(/[|]\s*[Ii]ntervention:/);
  const diagnosisOnly = parts[0].trim();
  const interventionText = parts.length > 1 ? parts[1].trim() : '';
  
  if (!diagnosisOnly) {
    console.log(`[Diagnosis Scoring] ❌ No diagnosis provided - Assigning 0 points`);
    return {
      total: 0,
      correctness: 0,
      intervention: 0
    };
  }
  
  const primaryDiagnosis = caseData.diagnosis.primary;
  const differentials = caseData.diagnosis.differentials;
  
  // Score diagnosis correctness (0-20 points)
  let diagnosisCorrectnessScore = 0;
  
  // Try LLM-based comparison first
  try {
    console.log(`[Diagnosis Scoring] Comparing: "${diagnosisOnly}" with primary: "${primaryDiagnosis}"`);
    const llmResult = await compareDiagnosisWithLLM(diagnosisOnly, primaryDiagnosis, differentials);
    if (llmResult !== null) {
      // Convert result to 20/12/0 scale
      if (llmResult === 'PRIMARY') {
        diagnosisCorrectnessScore = MAX_DIAGNOSIS_CORRECTNESS_SCORE;
        console.log(`[Diagnosis Scoring] ✅ PRIMARY match - Assigning ${diagnosisCorrectnessScore} points for diagnosis correctness`);
      } else if (llmResult === 'DIFFERENTIAL') {
        diagnosisCorrectnessScore = Math.floor(MAX_DIAGNOSIS_CORRECTNESS_SCORE * 0.6); // 12 points
        console.log(`[Diagnosis Scoring] ⚠️ DIFFERENTIAL match - Assigning ${diagnosisCorrectnessScore} points for diagnosis correctness (60% credit)`);
      } else {
        diagnosisCorrectnessScore = 0;
        console.log(`[Diagnosis Scoring] ❌ INCORRECT diagnosis - Assigning 0 points for diagnosis correctness`);
      }
    } else {
      console.log(`[Diagnosis Scoring] LLM returned null, using fallback string matching`);
      // Fallback scoring
      diagnosisCorrectnessScore = await scoreDiagnosisCorrectnessFallback(diagnosisOnly, primaryDiagnosis, differentials);
    }
  } catch (error: any) {
    console.error('Error in LLM diagnosis comparison, falling back to string matching:', error?.message || error);
    diagnosisCorrectnessScore = await scoreDiagnosisCorrectnessFallback(diagnosisOnly, primaryDiagnosis, differentials);
  }
  
  // Score intervention appropriateness (0-5 points)
  let interventionScore = 0;
  if (interventionText) {
    interventionScore = await scoreIntervention(interventionText, primaryDiagnosis, caseData);
  } else {
    console.log(`[Intervention Scoring] No intervention provided - Assigning 0 points`);
  }
  
  const totalScore = diagnosisCorrectnessScore + interventionScore;
  console.log(`[Diagnosis Scoring] Total score: ${diagnosisCorrectnessScore} (diagnosis) + ${interventionScore} (intervention) = ${totalScore} points`);
  
  return {
    total: totalScore,
    correctness: diagnosisCorrectnessScore,
    intervention: interventionScore
  };
}

/**
 * Fallback function for diagnosis correctness scoring (0-20 points)
 */
async function scoreDiagnosisCorrectnessFallback(
  diagnosisOnly: string,
  primaryDiagnosis: string,
  differentials: string[]
): Promise<number> {
  const diagnosisOnlyLower = diagnosisOnly.toLowerCase();
  const primaryDiagnosisLower = primaryDiagnosis.toLowerCase();
  const differentialsLower = differentials.map(d => d.toLowerCase());
  
  console.log(`[Diagnosis Scoring] Using fallback string matching...`);
  
  // Check for exact or close match of primary diagnosis
  if (containsDiagnosis(diagnosisOnlyLower, primaryDiagnosisLower)) {
    console.log(`[Diagnosis Scoring] ✅ Primary diagnosis match found - Assigning ${MAX_DIAGNOSIS_CORRECTNESS_SCORE} points`);
    return MAX_DIAGNOSIS_CORRECTNESS_SCORE;
  }
  
  // Special handling: If primary is MI-related and user says "heart attack" or "MI", accept it
  const miTerms = ['nstemi', 'stemi', 'myocardial infarction', 'mi'];
  const isMIPrimary = miTerms.some(term => primaryDiagnosisLower.includes(term));
  const isHeartAttack = diagnosisOnlyLower.includes('heart attack') || 
                        diagnosisOnlyLower === 'mi' || 
                        diagnosisOnlyLower.includes('myocardial infarction');
  
  if (isMIPrimary && isHeartAttack) {
    console.log(`[Diagnosis Scoring] ✅ Heart attack/MI match detected - Assigning ${MAX_DIAGNOSIS_CORRECTNESS_SCORE} points`);
    return MAX_DIAGNOSIS_CORRECTNESS_SCORE;
  }
  
  // Check for differential diagnoses (partial credit)
  for (const diff of differentialsLower) {
    if (containsDiagnosis(diagnosisOnlyLower, diff)) {
      const partialScore = Math.floor(MAX_DIAGNOSIS_CORRECTNESS_SCORE * 0.6); // 12 points
      console.log(`[Diagnosis Scoring] ⚠️ Differential diagnosis match found (${diff}) - Assigning ${partialScore} points (60% credit)`);
      return partialScore;
    }
  }
  
  console.log(`[Diagnosis Scoring] ❌ No match found - Assigning 0 points`);
  return 0;
}

/**
 * Score intervention appropriateness using LLM (0-5 points)
 */
async function scoreIntervention(
  interventionText: string,
  primaryDiagnosis: string,
  caseData: MedicalCase
): Promise<number> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const criticalActions = caseData.diagnosis.criticalActions?.join(', ') || 'Not specified';
  
  const systemPrompt = `You are a medical education assistant evaluating a student's intervention/treatment plan.

Your task is to evaluate if the student's proposed intervention is appropriate for the given diagnosis.

Scoring rules:
- Return "APPROPRIATE" (5 points) if the intervention is medically appropriate and standard for this diagnosis
- Return "PARTIAL" (3 points) if the intervention is somewhat appropriate but incomplete or not ideal
- Return "INAPPROPRIATE" (0 points) if the intervention is wrong, harmful, or not relevant

Important:
- Consider standard treatments for the diagnosis (e.g., for NSTEMI: aspirin, cardiac monitoring, referral to cardiology, blood tests)
- Common interventions: medication, referral to specialist, diagnostic tests, monitoring, hospital admission
- Be flexible with terminology - "referral to cardiology" = "cardiology consult" = "consult cardiology"
- "Appropriate" means the intervention would be clinically indicated for this diagnosis
- "Partial" means it's on the right track but missing important components or not the best choice
- "Inappropriate" means it's wrong, contraindicated, or not relevant

Examples for NSTEMI:
- "Referral to cardiology" or "Cardiology consult" → APPROPRIATE
- "Aspirin" → PARTIAL (correct but incomplete - needs more comprehensive management)
- "Blood test" or "Troponin" → PARTIAL (correct component but needs more)
- "Discharge home" or "Give NSAIDs" → INAPPROPRIATE
- "Antibiotics" or "Physical therapy" → INAPPROPRIATE

Respond with ONLY one word: "APPROPRIATE", "PARTIAL", or "INAPPROPRIATE"`;

  const userPrompt = `Primary diagnosis: ${primaryDiagnosis}

Critical actions for this case: ${criticalActions}

Student's proposed intervention: "${interventionText}"

Is the student's intervention appropriate, partially appropriate, or inappropriate for this diagnosis?`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 10
    });

    const rawResult = response.choices[0]?.message?.content?.trim().toUpperCase();
    
    let result: string;
    if (rawResult?.includes('APPROPRIATE') && !rawResult?.includes('INAPPROPRIATE')) {
      result = 'APPROPRIATE';
    } else if (rawResult?.includes('PARTIAL')) {
      result = 'PARTIAL';
    } else if (rawResult?.includes('INAPPROPRIATE')) {
      result = 'INAPPROPRIATE';
    } else {
      console.warn(`[Intervention Scoring] Could not parse LLM result: "${rawResult}", defaulting to INAPPROPRIATE`);
      result = 'INAPPROPRIATE';
    }
    
    console.log(`[Intervention Scoring] Submitted: "${interventionText}", Diagnosis: "${primaryDiagnosis}", LLM Result: "${result}" (raw: "${rawResult}")`);
    
    if (result === 'APPROPRIATE') {
      console.log(`[Intervention Scoring] ✅ APPROPRIATE - Assigning ${MAX_INTERVENTION_SCORE} points`);
      return MAX_INTERVENTION_SCORE;
    } else if (result === 'PARTIAL') {
      const partialScore = Math.floor(MAX_INTERVENTION_SCORE * 0.6); // 3 points
      console.log(`[Intervention Scoring] ⚠️ PARTIAL - Assigning ${partialScore} points (60% credit)`);
      return partialScore;
    } else {
      console.log(`[Intervention Scoring] ❌ INAPPROPRIATE - Assigning 0 points`);
      return 0;
    }
  } catch (error: any) {
    console.error('OpenAI API error in intervention evaluation:', error?.message || error);
    console.log(`[Intervention Scoring] Error occurred, defaulting to 0 points`);
    return 0;
  }
}

/**
 * Compare submitted diagnosis with correct answer using LLM
 * Returns: "PRIMARY", "DIFFERENTIAL", or "INCORRECT", or null if error
 */
async function compareDiagnosisWithLLM(
  submittedDiagnosis: string,
  primaryDiagnosis: string,
  differentials: string[]
): Promise<'PRIMARY' | 'DIFFERENTIAL' | 'INCORRECT' | null> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const systemPrompt = `You are a medical education assistant evaluating a student's diagnosis submission.

Your task is to compare the student's submitted diagnosis with the correct answer and determine if they match.

Scoring rules:
- If the student's diagnosis matches the PRIMARY diagnosis (exact match, synonym, or equivalent medical term), return: "PRIMARY"
- If the student's diagnosis matches one of the DIFFERENTIAL diagnoses (exact match, synonym, or equivalent medical term), return: "DIFFERENTIAL"
- If the student's diagnosis is completely wrong or unrelated, return: "INCORRECT"

Important:
- Be flexible with medical terminology - "NSTEMI" = "Non-ST Elevation Myocardial Infarction" = "non-ST elevation MI"
- Consider synonyms, abbreviations, and common lay terms
- CRITICAL: "Heart attack" is a common lay term for myocardial infarction. If the primary diagnosis contains "MI", "Myocardial Infarction", "NSTEMI", or "STEMI", then "heart attack" or "MI" should be accepted as PRIMARY match
- "Acute coronary syndrome" is broader than "NSTEMI" but could be a differential
- Be STRICT - only return PRIMARY if it's truly the same diagnosis, not just related
- If the student's diagnosis is wrong (even if related to the correct diagnosis), return "INCORRECT"
- Only return PRIMARY for exact matches or medically equivalent terms (including common lay terms like "heart attack" for MI)
- Only return DIFFERENTIAL if it matches one of the listed differential diagnoses
- If it doesn't match primary or any differential, return "INCORRECT"

Examples:
- Primary is "NSTEMI (Non-ST Elevation Myocardial Infarction)", student says "NSTEMI" → PRIMARY
- Primary is "NSTEMI (Non-ST Elevation Myocardial Infarction)", student says "Non-ST Elevation MI" → PRIMARY
- Primary is "NSTEMI (Non-ST Elevation Myocardial Infarction)", student says "heart attack" → PRIMARY (because NSTEMI is a type of heart attack/MI)
- Primary is "NSTEMI (Non-ST Elevation Myocardial Infarction)", student says "MI" → PRIMARY
- Primary is "NSTEMI (Non-ST Elevation Myocardial Infarction)", student says "Myocardial Infarction" → PRIMARY
- Primary is "NSTEMI (Non-ST Elevation Myocardial Infarction)", student says "Acute coronary syndrome" → DIFFERENTIAL (if in differentials list)
- Primary is "NSTEMI (Non-ST Elevation Myocardial Infarction)", student says "STEMI" or "GERD" or "Appendicitis" → INCORRECT

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
    let result: 'PRIMARY' | 'DIFFERENTIAL' | 'INCORRECT';
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
    
    return result;
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
 * 
 * In a chat-only interface, actions can only be performed via the intervention field
 * at the end. We check both session.actions (for future interactive features) and
 * the submitted intervention text.
 */
export function scoreCriticalActions(
  session: Session,
  caseData: MedicalCase
): { score: number; performed: string[]; missed: string[] } {
  const criticalActions = caseData.diagnosis.criticalActions;
  
  if (criticalActions.length === 0) {
    return { score: MAX_CRITICAL_ACTIONS_SCORE, performed: [], missed: [] };
  }
  
  // Extract intervention text from submitted diagnosis (if available)
  let interventionText = '';
  if (session.submittedDiagnosis) {
    const parts = session.submittedDiagnosis.split(/[|]\s*[Ii]ntervention:/);
    if (parts.length > 1) {
      interventionText = parts[1].trim().toLowerCase();
    }
  }
  
  const performed: string[] = [];
  const missed: string[] = [];
  
  for (const criticalAction of criticalActions) {
    // Check if action was performed during the session (for interactive interfaces)
    const wasPerformedInSession = session.actions.some(action => 
      matchesAction(action.actionType, criticalAction)
    );
    
    // Check if action was mentioned in the submitted intervention (for chat-only interface)
    // This is the primary method in a chat-only system where users can't perform actions
    // during the conversation, only at the end via the intervention field
    const wasMentionedInIntervention = interventionText && 
      matchesAction(interventionText, criticalAction);
    
    // Count as performed if either condition is true
    if (wasPerformedInSession || wasMentionedInIntervention) {
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
): Promise<ScoringContext & { diagnosisCorrectnessScore: number; interventionScore: number }> {
  const diagnosisResult = await scoreDiagnosis(session, caseData);
  const criticalActionsResult = scoreCriticalActions(session, caseData);
  const communicationScore = scoreCommunication(session, caseData);
  const efficiencyScore = scoreEfficiency(session);
  const missedRedFlags = scoreRedFlags(session, caseData);
  
  const timeLimit = getTimeLimit(session);
  const duration = getSessionDuration(session);
  
  return {
    diagnosisScore: diagnosisResult.total,
    diagnosisCorrectnessScore: diagnosisResult.correctness,
    interventionScore: diagnosisResult.intervention,
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

