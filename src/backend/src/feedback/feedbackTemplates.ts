/**
 * Feedback Templates
 * Generate human-readable feedback text based on scoring results
 */

import { ScoringContext } from './types';
import { MedicalCase } from '../../../shared/types/case.types';

/**
 * Generate "What Went Well" items
 */
export function generateWhatWentWell(
  context: ScoringContext,
  caseData: MedicalCase
): string[] {
  const items: string[] = [];
  
  // Diagnosis
  if (context.diagnosisScore >= 20) {
    items.push(`Correctly identified the primary diagnosis: ${caseData.diagnosis.primary}`);
  } else if (context.diagnosisScore >= 10) {
    items.push(`Considered appropriate differential diagnoses in your clinical assessment`);
  }
  
  // Critical actions
  if (context.performedCriticalActions.length > 0) {
    if (context.performedCriticalActions.length === caseData.diagnosis.criticalActions.length) {
      items.push(`Completed all critical interventions and diagnostic workup`);
    } else {
      const firstAction = context.performedCriticalActions[0];
      items.push(`Performed critical interventions such as: ${firstAction}`);
      if (context.performedCriticalActions.length > 1) {
        items.push(`Completed ${context.performedCriticalActions.length} out of ${caseData.diagnosis.criticalActions.length} critical interventions in the management plan`);
      }
    }
  }
  
  // Communication
  if (context.communicationScore >= 15) {
    items.push(`Demonstrated excellent history-taking and clinical communication skills`);
  } else if (context.communicationScore >= 10) {
    items.push(`Asked clinically relevant questions during the patient interview`);
  }
  
  // Efficiency
  const timeUsedPercent = (context.duration / context.timeLimit) * 100;
  if (timeUsedPercent <= 75) {
    items.push(`Managed the case efficiently within the clinical time constraints`);
  }
  
  // If nothing particularly good, add a generic encouragement
  if (items.length === 0) {
    items.push(`Completed the case session`);
  }
  
  return items;
}

/**
 * Generate "Missed" items (things that should have been done)
 */
export function generateMissed(
  context: ScoringContext,
  caseData: MedicalCase
): string[] {
  const items: string[] = [];
  
  // Missed critical actions
  for (const missedAction of context.missedCriticalActions) {
    items.push(`Missed critical intervention: ${missedAction}`);
  }
  
  // Communication gaps
  if (context.communicationScore < 10) {
    items.push(`Incomplete history-taking - consider asking about pain characteristics (location, radiation, quality), past medical history (PMH), medications, and associated symptoms`);
  }
  
  // Diagnosis
  if (context.diagnosisScore === 0) {
    items.push(`Did not identify the correct primary diagnosis: ${caseData.diagnosis.primary}`);
  }
  
  return items;
}

/**
 * Generate "Red Flags Missed" items
 */
export function generateRedFlagsMissed(context: ScoringContext): string[] {
  return context.missedRedFlags.map(redFlag => {
    if (redFlag.consequence) {
      return `${redFlag.action} - ${redFlag.consequence}`;
    }
    return redFlag.action;
  });
}

/**
 * Generate recommendations for improvement
 */
export function generateRecommendations(
  context: ScoringContext,
  caseData: MedicalCase
): string[] {
  const recommendations: string[] = [];
  
  // Time management
  const timeUsedPercent = (context.duration / context.timeLimit) * 100;
  if (timeUsedPercent > 100) {
    const exceededBy = context.duration - context.timeLimit;
    const exceededByMinutes = Math.ceil(exceededBy / 60);
    const timeLimitMinutes = Math.floor(context.timeLimit / 60);
    recommendations.push(
      `Try to work more efficiently - you exceeded the ${timeLimitMinutes}-minute time limit by ${exceededByMinutes} minute${exceededByMinutes > 1 ? 's' : ''}. Focus on critical actions first.`
    );
  }
  
  // Missed critical actions
  if (context.missedCriticalActions.length > 0) {
    const firstMissed = context.missedCriticalActions[0];
    recommendations.push(
      `For patients presenting with ${caseData.patient.chiefComplaint.toLowerCase()}, ensure you include: ${firstMissed} as part of your initial management plan`
    );
  }
  
  // Red flags
  for (const redFlag of context.missedRedFlags) {
    if (redFlag.consequence) {
      recommendations.push(
        `${redFlag.action} is a time-sensitive intervention - ${redFlag.consequence.toLowerCase()} if delayed`
      );
    }
  }
  
  // Communication
  if (context.communicationScore < 10) {
    recommendations.push(
      `Enhance your history-taking by systematically evaluating: pain characteristics (location, radiation, quality, severity), associated symptoms, past medical history (PMH), current medications, and allergies. This comprehensive approach improves diagnostic accuracy.`
    );
  }
  
  // Diagnosis
  if (context.diagnosisScore < 15) {
    recommendations.push(
      `Review the clinical presentation carefully. The primary diagnosis was ${caseData.diagnosis.primary}. Integrate the patient's history, physical examination findings, and diagnostic workup to reach the correct diagnosis.`
    );
  }
  
  // General encouragement if doing well
  if (context.diagnosisScore >= 20 && 
      context.missedCriticalActions.length === 0 && 
      context.missedRedFlags.length === 0) {
    recommendations.push(
      `Excellent clinical performance! Continue to practice maintaining efficiency while ensuring comprehensive patient assessment and appropriate interventions.`
    );
  }
  
  // Ensure at least one recommendation
  if (recommendations.length === 0) {
    recommendations.push(
      `Good clinical performance overall. Continue practicing to refine your diagnostic reasoning, history-taking skills, and intervention planning.`
    );
  }
  
  return recommendations;
}
