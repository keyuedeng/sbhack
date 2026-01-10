/**
 * Patient Engine
 * Generates realistic patient responses using OpenAI
 */

import { MedicalCase, RevealedFacts } from '../../../shared/types/case.types';
import OpenAI from 'openai';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GeneratePatientReplyParams {
  case: MedicalCase;
  level: 1 | 2 | 3;
  revealedFacts: RevealedFacts;
  conversationHistory: Message[];
  userInput: string;
}

/**
 * Generate a patient response using OpenAI
 * 
 * @param params - All context needed to generate realistic patient reply
 * @returns The patient's response as a string
 */
export async function generatePatientReply(
  params: GeneratePatientReplyParams
): Promise<string> {
  const { case: medicalCase, level, revealedFacts, conversationHistory, userInput } = params;

  // Initialize OpenAI client inside the function
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Build prompts
  const systemPrompt = buildSystemPrompt(medicalCase, level);
  const context = buildRevealableContext(medicalCase, level, revealedFacts);
  const fullSystemPrompt = systemPrompt + context;

  // Prepare messages for OpenAI (use correct types)
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: fullSystemPrompt },
    ...conversationHistory,
    { role: 'user', content: userInput }
  ];

  // Call OpenAI
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      temperature: 0.4,
      max_tokens: 150
    });
    return response.choices[0]?.message?.content || '...';
  } catch (error: any) {
    // Log error for debugging
    console.error('OpenAI API error:', error?.message || error);
    console.error('Is OPENAI_API_KEY set?', !!process.env.OPENAI_API_KEY);
    // Fallback if OpenAI fails
    return 'Sorry, can you repeat that?';
  }
}

/**
 * Build the system prompt that defines patient behavior
 */
function buildSystemPrompt(
  medicalCase: MedicalCase,
  level: 1 | 2 | 3,
  currentPainLevel?: number
): string {
  const { patient, guardrails } = medicalCase;
  const painInfo = currentPainLevel ? `\nCurrent pain level: ${currentPainLevel}/10` : '';
  
  return `You are ${patient.name}, a ${patient.age}-year-old ${patient.sex === 'M' ? 'man' : 'woman'}.

PERSONALITY & BEHAVIOR:
- Baseline: ${patient.personality.baseline}
- Current emotional state: ${patient.personality.emotionalState}
- Communication style: ${patient.personality.communicationStyle}

CURRENT PRESENTATION:
- Chief complaint: ${patient.chiefComplaint}${painInfo}

CRITICAL RULES YOU MUST FOLLOW:
- You are a PATIENT, not a doctor. You do NOT know medical terminology.
- You CANNOT diagnose yourself. Do not say "I think I have [medical condition]".
- You CANNOT give medical advice. Do not tell the doctor what to do.
- You can only share information that a real patient would know about their own body.
- Stay in character at all times. Use natural, conversational language.
- Keep responses concise (2-4 sentences unless asked for details).
- Express emotions naturally based on your emotional state.

THINGS YOU MUST NEVER SAY:
${guardrails.patientCannotSay.map(phrase => `- "${phrase}"`).join('\n')}

Respond naturally as this patient would, based on the questions asked.`;
}

/**
 * Build the context about what facts can be revealed
 */
function buildRevealableContext(
  medicalCase: MedicalCase,
  level: 1 | 2 | 3,
  revealedFacts: RevealedFacts
): string {
  let context = '\n\nMEDICAL INFORMATION YOU CAN SHARE:\n';
  
  // HPI - history of present illness
  if (medicalCase.revealRules.hpi === 'always' || revealedFacts.hpi) {
    context += `\nYour story about the current problem: ${medicalCase.history.hpi}`;
  }
  
  // Past medical history
  if (revealedFacts.pmh.length > 0 || medicalCase.revealRules.pmh === 'always') {
    context += `\nYour past medical conditions: ${medicalCase.history.pmh.join(', ')}`;
  }
  
  // Medications
  if (revealedFacts.medications || medicalCase.revealRules.medications === 'always') {
    context += `\nYour current medications: ${medicalCase.history.medications.join(', ')}`;
  }
  
  // Allergies - always important
  if (revealedFacts.allergies || medicalCase.revealRules.allergies === 'always') {
    context += `\nYour allergies: ${medicalCase.history.allergies.join(', ')}`;
  }
  
  context += '\n\nOnly share information above if directly asked. Do not volunteer everything at once.';
  
  return context;
}
