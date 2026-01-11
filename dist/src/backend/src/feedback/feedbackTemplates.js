"use strict";
/**
 * Feedback Templates
 * Generate human-readable feedback text based on scoring results
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWhatWentWell = generateWhatWentWell;
exports.generateMissed = generateMissed;
exports.generateRedFlagsMissed = generateRedFlagsMissed;
exports.generateRecommendations = generateRecommendations;
/**
 * Generate "What Went Well" items
 */
function generateWhatWentWell(context, caseData) {
    const items = [];
    // Diagnosis
    if (context.diagnosisScore >= 20) {
        items.push(`Correctly identified ${caseData.diagnosis.primary}`);
    }
    else if (context.diagnosisScore >= 10) {
        items.push(`Considered appropriate differential diagnoses`);
    }
    // Critical actions
    if (context.performedCriticalActions.length > 0) {
        if (context.performedCriticalActions.length === caseData.diagnosis.criticalActions.length) {
            items.push(`Performed all critical actions`);
        }
        else {
            const firstAction = context.performedCriticalActions[0];
            items.push(`Performed critical actions such as: ${firstAction}`);
            if (context.performedCriticalActions.length > 1) {
                items.push(`Completed ${context.performedCriticalActions.length} out of ${caseData.diagnosis.criticalActions.length} critical actions`);
            }
        }
    }
    // Communication
    if (context.communicationScore >= 15) {
        items.push(`Demonstrated good communication and history-taking skills`);
    }
    else if (context.communicationScore >= 10) {
        items.push(`Asked appropriate questions about the patient's condition`);
    }
    // Efficiency
    const timeUsedPercent = (context.duration / context.timeLimit) * 100;
    if (timeUsedPercent <= 75) {
        items.push(`Worked efficiently within the time limit`);
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
function generateMissed(context, caseData) {
    const items = [];
    // Missed critical actions
    for (const missedAction of context.missedCriticalActions) {
        items.push(`Did not perform: ${missedAction}`);
    }
    // Communication gaps
    if (context.communicationScore < 10) {
        items.push(`Could improve history-taking (ask about pain characteristics, past medical history, medications)`);
    }
    // Diagnosis
    if (context.diagnosisScore === 0) {
        items.push(`Did not reach the correct diagnosis: ${caseData.diagnosis.primary}`);
    }
    return items;
}
/**
 * Generate "Red Flags Missed" items
 */
function generateRedFlagsMissed(context) {
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
function generateRecommendations(context, caseData) {
    const recommendations = [];
    // Time management
    const timeUsedPercent = (context.duration / context.timeLimit) * 100;
    if (timeUsedPercent > 100) {
        const exceededBy = context.duration - context.timeLimit;
        const exceededByMinutes = Math.ceil(exceededBy / 60);
        const timeLimitMinutes = Math.floor(context.timeLimit / 60);
        recommendations.push(`Try to work more efficiently - you exceeded the ${timeLimitMinutes}-minute time limit by ${exceededByMinutes} minute${exceededByMinutes > 1 ? 's' : ''}. Focus on critical actions first.`);
    }
    // Missed critical actions
    if (context.missedCriticalActions.length > 0) {
        const firstMissed = context.missedCriticalActions[0];
        recommendations.push(`In ${caseData.patient.chiefComplaint.toLowerCase()} cases, always remember to: ${firstMissed.toLowerCase()}`);
    }
    // Red flags
    for (const redFlag of context.missedRedFlags) {
        if (redFlag.consequence) {
            recommendations.push(`${redFlag.action} should be performed promptly - ${redFlag.consequence.toLowerCase()}`);
        }
    }
    // Communication
    if (context.communicationScore < 10) {
        recommendations.push(`Improve your history-taking: ask about pain location, radiation, quality, associated symptoms, past medical history, and medications`);
    }
    // Diagnosis
    if (context.diagnosisScore < 15) {
        recommendations.push(`Review the case findings carefully. The primary diagnosis was ${caseData.diagnosis.primary}. Consider the patient's presentation, exam findings, and diagnostic results together.`);
    }
    // General encouragement if doing well
    if (context.diagnosisScore >= 20 &&
        context.missedCriticalActions.length === 0 &&
        context.missedRedFlags.length === 0) {
        recommendations.push(`Excellent work! Continue to practice maintaining efficiency while ensuring thoroughness.`);
    }
    // Ensure at least one recommendation
    if (recommendations.length === 0) {
        recommendations.push(`Good performance overall. Continue practicing to refine your clinical reasoning and efficiency.`);
    }
    return recommendations;
}
