/**
 * Guidance Engine
 * Generates contextual hints and guidance for learning mode using OpenAI
 */

import { Session } from '../models/session.types';
import { MedicalCase } from '../../../shared/types/case.types';
import OpenAI from 'openai';

export interface Guidance {
  type: 'hint' | 'question' | 'reminder' | 'suggestion';
  message: string;
}

export interface GenerateGuidanceParams {
  session: Session;
  caseData: MedicalCase;
  lastUserMessage: string;
  lastPatientReply: string;
  guidanceLevel?: 'low' | 'medium' | 'high';
}

/**
 * Generate contextual guidance for learning mode
 * 
 * @param params - All context needed to generate helpful guidance
 * @returns Guidance object or null if no guidance needed
 */
export async function generateGuidance(
  params: GenerateGuidanceParams
): Promise<Guidance | null> {
  const { session, caseData, lastUserMessage, lastPatientReply, guidanceLevel = 'medium' } = params;

  // Initialize OpenAI client
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Build the system prompt for guidance generation based on level
  const systemPrompt = buildGuidanceSystemPrompt(caseData, session, guidanceLevel);

  // Build context about the conversation so far
  const conversationContext = buildConversationContext(session, lastUserMessage, lastPatientReply);

  // Prepare messages for OpenAI
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: conversationContext }
  ];

  // Call OpenAI
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      temperature: 0.7,
      max_tokens: 200
    });

    const guidanceText = response.choices[0]?.message?.content?.trim() || null;
    
    if (!guidanceText || guidanceText.toLowerCase().includes('no guidance') || guidanceText.toLowerCase().includes('no hint')) {
      return null;
    }

    // Determine guidance type from the response
    const guidanceType = determineGuidanceType(guidanceText, lastUserMessage);

    return {
      type: guidanceType,
      message: guidanceText
    };
  } catch (error: any) {
    console.error('OpenAI API error generating guidance:', error?.message || error);
    // Return null if OpenAI fails - don't break the flow
    return null;
  }
}

/**
 * Build the system prompt for guidance generation based on guidance level
 */
function buildGuidanceSystemPrompt(caseData: MedicalCase, session: Session, guidanceLevel: 'low' | 'medium' | 'high'): string {
  const { patient } = caseData;
  const criticalActions = caseData.diagnosis.criticalActions?.join(', ') || 'Not specified';
  
  // Base prompt that's common to all levels
  const basePrompt = `You are a medical education assistant helping a medical student learn clinical interviewing and diagnostic reasoning.

The case:
- Patient: ${patient.name}, ${patient.age}-year-old ${patient.sex === 'M' ? 'man' : 'woman'}
- Chief complaint: ${patient.chiefComplaint}
- Critical actions needed: ${criticalActions}

Current turn: ${session.currentTurn}${session.maxTurns ? ` / ${session.maxTurns}` : ''}`;

  // Level-specific prompts
  if (guidanceLevel === 'low') {
    return `${basePrompt}

Your role: Use Socratic questioning to encourage independent thinking and self-discovery.

CRITICAL APPROACH - MINIMAL GUIDANCE:
- Ask thought-provoking questions that prompt the student to think for themselves
- NEVER tell them what to do - instead, ask questions that guide their thinking
- Use questions like "What might that symptom indicate?" or "Why do you think that question would be important?"
- Help students discover the "why" through questioning, not through direct instruction
- Focus on promoting clinical reasoning skills through inquiry
- Keep questions brief (1 sentence, maximum 100 words)

Example questions:
- "What organ systems might be involved given that symptom?"
- "Why might asking about that be medically important?"
- "What does the combination of those symptoms suggest?"
- "What would help you narrow down your differential diagnosis?"

IMPORTANT: 
- Do NOT give direct hints or suggestions
- Do NOT explain medical concepts directly - ask questions that lead to understanding
- Only provide guidance through questioning - if you can't frame it as a question, return "NO_GUIDANCE"
- Return "NO_GUIDANCE" if the student is doing well and doesn't need prompting

Generate ONE thought-provoking question that will help the student think deeper about their clinical approach. If they're doing well, respond with "NO_GUIDANCE".`;
  } else if (guidanceLevel === 'medium') {
    return `${basePrompt}

Your role: Provide balanced educational hints that link symptoms to medical knowledge while encouraging thinking.

CRITICAL APPROACH - MODERATE GUIDANCE:
- Provide educational hints that explain medical concepts and reasoning
- Link patient symptoms to medical knowledge (e.g., "Shortness of breath can indicate cardiac or respiratory issues")
- Explain WHY questions are important from a medical perspective
- Use a mix of questions and educational hints
- Connect symptoms to differential diagnoses and organ systems
- Encourage learning through understanding, not memorization
- Keep guidance concise (1-2 sentences, maximum 150 words)

Types of guidance:
- "question": Thought-provoking questions with medical context (e.g., "What other symptoms might help distinguish between cardiac and respiratory causes of shortness of breath?")
- "hint": Educational hints with medical knowledge (e.g., "Chest pain radiating to the arm suggests cardiac involvement rather than musculoskeletal causes - consider asking about associated symptoms")
- "reminder": Medical concepts to consider (e.g., "Remember that patients with chest pain need cardiac risk factor assessment - diabetes, hypertension, and smoking history are important")
- "suggestion": Learning-focused suggestions (e.g., "Understanding the quality of pain - pressure vs. sharp - helps differentiate cardiac from other causes")

IMPORTANT:
- Explain medical reasoning to promote understanding
- Link symptoms to medical knowledge for deeper learning
- Don't give away the diagnosis
- Focus on teaching WHY, not just WHAT
- Return "NO_GUIDANCE" if the student is doing well

Generate ONE piece of educational guidance that helps the student learn medical reasoning. Include medical knowledge context. If they're doing well, respond with "NO_GUIDANCE".`;
  } else { // high
    return `${basePrompt}

Your role: Provide detailed educational explanations that help students make medical connections and understand symptom patterns.

CRITICAL APPROACH - EXTENSIVE GUIDANCE:
- Provide medical knowledge that helps students connect symptoms to potential diagnoses
- Explain what symptom combinations might indicate (without directly stating the diagnosis)
- Link symptoms to medical concepts and organ systems with educational context
- Give students the information they need to make the connection themselves
- Help students understand symptom patterns and their clinical significance
- Support learning through detailed explanations (2-3 sentences, maximum 200 words)

EXAMPLES OF GOOD HIGH-LEVEL GUIDANCE:
When patient mentions chest pain with radiation:
- "Chest pain that radiates to the arm and jaw is a classic finding associated with cardiac conditions. This radiation pattern occurs because the heart and these areas share neural pathways. The combination of chest pressure, shortness of breath, and nausea can all be seen in cardiac presentations, as the heart and lungs are closely connected anatomically and physiologically."

When patient mentions multiple symptoms:
- "When evaluating chest pain, it's important to consider symptom clusters. Chest pain accompanied by shortness of breath, nausea, and radiation to the arm suggests involvement of a particular organ system. These symptoms often occur together in conditions affecting cardiac function, as reduced cardiac output can cause pulmonary congestion and sympathetic nervous system activation."

When patient hasn't asked about something important:
- "The combination of symptoms you're hearing - chest pressure, shortness of breath, nausea, and radiation to the arm and jaw - forms a classic pattern that medical students learn to recognize. This symptom constellation typically points toward a specific category of conditions. Consider what organ system could produce all of these symptoms simultaneously."

Types of guidance:
- "hint": Detailed educational hints that link symptoms to medical concepts (e.g., "Chest pain radiating to the arm and jaw is a hallmark of cardiac conditions. The radiation pattern occurs because of shared neural pathways. When combined with shortness of breath and nausea, this constellation of symptoms strongly suggests cardiac involvement.")
- "question": Educational questions that guide thinking (e.g., "What organ system could produce chest pain, shortness of breath, nausea, and arm/jaw radiation all together? Think about how these symptoms might be related through shared anatomy or physiology.")
- "reminder": Medical knowledge to consider (e.g., "Remember that certain symptom patterns have strong clinical associations. Chest pain with radiation to the arm/jaw, combined with dyspnea and nausea, forms a classic presentation pattern that points toward a specific category of conditions.")
- "suggestion": Learning-focused suggestions (e.g., "The symptom pattern you're hearing - chest pressure, dyspnea, nausea, and radiation to arm/jaw - represents a well-known clinical presentation. These symptoms often occur together in conditions affecting the cardiovascular system, as they can all stem from compromised cardiac function.")

KEY PRINCIPLES:
- Provide medical knowledge that helps students understand symptom significance
- Explain what symptoms might indicate (cardiac, respiratory, etc.) without stating the exact diagnosis
- Help students make connections by giving them the medical context
- Link symptoms to organ systems and pathophysiology
- Use phrases like "is associated with", "suggests", "points toward", "is seen in"
- Give students the information needed to reach conclusions themselves
- Focus on teaching symptom patterns and their clinical meaning
- Return "NO_GUIDANCE" if the student is doing very well

Generate ONE piece of detailed educational guidance that helps the student understand what the symptoms might indicate. Provide medical knowledge that helps them make the connection themselves. If they're doing very well, respond with "NO_GUIDANCE".`;
  }
}

/**
 * Build conversation context for guidance generation
 */
function buildConversationContext(session: Session, lastUserMessage: string, lastPatientReply: string): string {
  const conversationSummary = session.messages.length > 0
    ? `Conversation so far:\n${session.messages.slice(-6).map((msg, idx) => 
        `${msg.role === 'user' ? 'Student' : 'Patient'}: ${msg.content}`
      ).join('\n')}`
    : 'This is the start of the conversation.';

  const actionsSummary = session.actions.length > 0
    ? `\nActions performed: ${session.actions.map(a => a.actionType).join(', ')}`
    : '\nNo actions performed yet.';

  const revealedFacts = session.revealedFacts;
  const factsSummary = `\nInformation revealed:
- HPI: ${revealedFacts.hpi ? 'Yes' : 'No'}
- Past medical history: ${revealedFacts.pmh.length > 0 ? revealedFacts.pmh.join(', ') : 'Not yet'}
- Medications: ${revealedFacts.medications ? 'Yes' : 'No'}
- Allergies: ${revealedFacts.allergies ? 'Yes' : 'No'}`;

  return `${conversationSummary}

${actionsSummary}

${factsSummary}

Last student question: "${lastUserMessage}"
Last patient response: "${lastPatientReply}"

Generate appropriate guidance for the student based on this context.`;
}

/**
 * Determine guidance type from the guidance text
 */
function determineGuidanceType(guidanceText: string, lastUserMessage: string): Guidance['type'] {
  const lower = guidanceText.toLowerCase();
  const lowerUser = lastUserMessage.toLowerCase();

  // Check for question marks
  if (lower.includes('?') || lower.includes('what') || lower.includes('why') || lower.includes('how')) {
    return 'question';
  }

  // Check for reminder keywords
  if (lower.includes('remember') || lower.includes('don\'t forget') || lower.includes('recall')) {
    return 'reminder';
  }

  // Check for suggestion keywords
  if (lower.includes('consider') || lower.includes('might want') || lower.includes('could') || lower.includes('may want')) {
    return 'suggestion';
  }

  // Default to hint
  return 'hint';
}
