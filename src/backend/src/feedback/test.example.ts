/**
 * Test/Example: Feedback Scoring System
 * 
 * This file demonstrates how the feedback/scoring system works
 * Run with: npx ts-node src/backend/src/feedback/test.example.ts
 */

import { analyzeSession } from './analyzeSession';
import { Session } from '../models/session.types';
import { MedicalCase, RevealedFacts } from '../../../shared/types/case.types';
import { Message } from '../services/patientEngine';
import { loadCase } from '../services/caseLoader';

/**
 * Create a mock session with example data
 */
function createMockSession(
  caseData: MedicalCase,
  level: 1 | 2 | 3,
  scenario: 'good' | 'average' | 'poor'
): Session {
  const now = Date.now();
  const timeLimit = level === 1 ? 300 : level === 2 ? 420 : 600; // 5, 7, or 10 minutes
  
  // Scenario-specific settings
  let duration: number;
  let messages: Message[];
  let actions: Array<{ actionType: string; timestamp: number }>;
  let diagnosisText: string;
  
  if (scenario === 'good') {
    // Good performance: correct diagnosis, all critical actions, good communication, efficient
    duration = Math.floor(timeLimit * 0.7); // Used 70% of time
    diagnosisText = 'NSTEMI';
    
    messages = [
      { role: 'user', content: "Hello, what brings you in today?" },
      { role: 'assistant', content: "Hello, I'm Sarah Johnson. I have chest pain for 2 hours." },
      { role: 'user', content: "Can you tell me more about the pain? Where is it located and does it radiate anywhere?" },
      { role: 'assistant', content: "It's in the center of my chest, and yes, it goes to my left arm and jaw." },
      { role: 'user', content: "What's your past medical history? Any medications?" },
      { role: 'assistant', content: "I have hypertension, diabetes, and high cholesterol. I take lisinopril, metformin, and atorvastatin." },
      { role: 'user', content: "Based on your symptoms and the test results, I believe this is an NSTEMI (Non-ST Elevation Myocardial Infarction). We'll start treatment immediately." }
    ];
    
    // Actions performed early and correctly
    const startTime = now;
    actions = [
      { actionType: 'ordered_ekg', timestamp: startTime + 3000 }, // 3 seconds - within 10 min window
      { actionType: 'ordered_troponin', timestamp: startTime + 5000 }, // 5 seconds
      { actionType: 'gave_aspirin', timestamp: startTime + 8000 }, // 8 seconds - within 20 min window
      { actionType: 'ordered_vitals', timestamp: startTime + 10000 },
      { actionType: 'examined_cardiac', timestamp: startTime + 12000 },
      { actionType: 'gave_nitroglycerin', timestamp: startTime + 15000 }
    ];
    
  } else if (scenario === 'average') {
    // Average performance: partial actions, some communication, took longer
    duration = Math.floor(timeLimit * 0.95); // Used 95% of time
    diagnosisText = 'Acute coronary syndrome';
    
    messages = [
      { role: 'user', content: "What brings you in?" },
      { role: 'assistant', content: "Chest pain." },
      { role: 'user', content: "Where does it hurt?" },
      { role: 'assistant', content: "In my chest." },
      { role: 'user', content: "I think this could be an acute coronary syndrome. Let me order some tests." }
    ];
    
    const startTime = now;
    actions = [
      { actionType: 'ordered_ekg', timestamp: startTime + 12000 }, // 12 seconds - late but within window
      { actionType: 'ordered_troponin', timestamp: startTime + 20000 }, // 20 seconds
      // Missing aspirin and other critical actions
    ];
    
  } else {
    // Poor performance: wrong diagnosis, missed actions, poor communication, exceeded time
    duration = Math.floor(timeLimit * 1.3); // Exceeded by 30%
    diagnosisText = 'GERD';
    
    messages = [
      { role: 'user', content: "What's wrong?" },
      { role: 'assistant', content: "Chest pain." },
      { role: 'user', content: "This is probably just GERD. Take some antacids." }
    ];
    
    const startTime = now;
    actions = [
      { actionType: 'ordered_vitals', timestamp: startTime + 30000 }, // Very late
      // Missing all critical actions
    ];
  }
  
  const revealedFacts: RevealedFacts = {
    hpi: true,
    pmh: caseData.revealRules.pmh === 'always' ? [...caseData.history.pmh] : [],
    medications: caseData.revealRules.medications === 'always',
    allergies: caseData.revealRules.allergies === 'always',
    socialHistory: [],
    familyHistory: false,
    physicalExam: [],
    diagnostics: []
  };
  
  // Add diagnosis to last user message if present
  if (diagnosisText && messages.length > 0) {
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (lastUserMessage) {
      lastUserMessage.content += ` Diagnosis: ${diagnosisText}`;
    }
  }
  
  return {
    sessionId: `test-${scenario}-${Date.now()}`,
    caseId: caseData.caseId,
    level,
    userName: 'Test User',
    case: caseData,
    messages,
    revealedFacts,
    actions: actions.map(a => ({
      actionType: a.actionType,
      timestamp: a.timestamp,
      details: undefined,
      result: undefined
    })),
    createdAt: now,
    updatedAt: now + (duration * 1000),
    endedAt: now + (duration * 1000),
    timeLimitSec: timeLimit,
    currentTurn: messages.filter(m => m.role === 'user').length,
    isActive: false
  };
}

/**
 * Run test examples
 */
async function runTests() {
  console.log('🧪 Feedback Scoring System - Test Examples\n');
  console.log('=' .repeat(70));
  
  try {
    // Load the chest pain case
    const caseData = loadCase('chest-pain-001');
    
    console.log(`\n📋 Case: ${caseData.title}`);
    console.log(`   Primary Diagnosis: ${caseData.diagnosis.primary}`);
    console.log(`   Critical Actions: ${caseData.diagnosis.criticalActions.length} required`);
    console.log(`   - ${caseData.diagnosis.criticalActions.slice(0, 3).join(', ')}, ...`);
    
    // Test scenarios
    const scenarios: Array<{ name: string; level: 1 | 2 | 3; type: 'good' | 'average' | 'poor' }> = [
      { name: '✅ GOOD Performance (Level 1)', level: 1, type: 'good' },
      { name: '⚠️  AVERAGE Performance (Level 2)', level: 2, type: 'average' },
      { name: '❌ POOR Performance (Level 3)', level: 3, type: 'poor' }
    ];
    
    for (const scenario of scenarios) {
      console.log('\n' + '='.repeat(70));
      console.log(`\n${scenario.name}`);
      console.log('-'.repeat(70));
      
      const session = createMockSession(caseData, scenario.level, scenario.type);
      const feedback = await analyzeSession(session, caseData);
      
      // Display results
      console.log(`\n📊 SCORING BREAKDOWN:`);
      console.log(`   Total Score: ${feedback.summaryScore}/100`);
      console.log(`   ├─ Diagnosis:        ${feedback.breakdown.diagnosis}/25`);
      console.log(`   ├─ Critical Actions: ${feedback.breakdown.criticalActions}/25`);
      console.log(`   ├─ Communication:    ${feedback.breakdown.communication}/20`);
      console.log(`   └─ Efficiency:       ${feedback.breakdown.efficiency}/30`);
      
      console.log(`\n⏱️  TIMING:`);
      console.log(`   Time Limit: ${Math.floor(feedback.timing.timeLimitSec / 60)} minutes`);
      console.log(`   Actual Duration: ${Math.floor(feedback.timing.actualDurationSec / 60)} minutes ${feedback.timing.actualDurationSec % 60} seconds`);
      console.log(`   Time Used: ${feedback.timing.timeUsedPercent.toFixed(1)}%`);
      if (feedback.timing.exceededBySec) {
        console.log(`   ⚠️  Exceeded by: ${Math.floor(feedback.timing.exceededBySec / 60)} minutes ${feedback.timing.exceededBySec % 60} seconds`);
      }
      
      console.log(`\n✅ WHAT WENT WELL:`);
      if (feedback.whatWentWell.length > 0) {
        feedback.whatWentWell.forEach(item => console.log(`   • ${item}`));
      } else {
        console.log(`   (none)`);
      }
      
      console.log(`\n❌ MISSED:`);
      if (feedback.missed.length > 0) {
        feedback.missed.forEach(item => console.log(`   • ${item}`));
      } else {
        console.log(`   (none)`);
      }
      
      if (feedback.redFlagsMissed.length > 0) {
        console.log(`\n🚩 RED FLAGS MISSED:`);
        feedback.redFlagsMissed.forEach(item => console.log(`   • ${item}`));
      }
      
      console.log(`\n💡 RECOMMENDATIONS:`);
      feedback.recommendations.forEach(item => console.log(`   • ${item}`));
      
      console.log(`\n📝 SESSION SUMMARY:`);
      console.log(`   Messages: ${session.messages.length} total`);
      console.log(`   Actions: ${session.actions.length} performed`);
      console.log(`   User Messages: ${session.messages.filter(m => m.role === 'user').length}`);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('\n✨ Test completed successfully!\n');
    
  } catch (error: any) {
    console.error('❌ Error running tests:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

export { createMockSession, runTests };
