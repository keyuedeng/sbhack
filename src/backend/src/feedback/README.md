# Feedback & Scoring Engine

Pure, deterministic feedback and scoring system for medical simulation sessions.

## Overview

This module analyzes completed sessions and generates structured feedback with scores, recommendations, and learning points. It's **rules-based** (no LLM calls) and **deterministic** (same inputs = same outputs).

## Architecture

```
/feedback/
  analyzeSession.ts    ← Main entry point (exports analyzeSession())
  scoringRules.ts      ← All scoring logic (diagnosis, actions, communication, efficiency)
  feedbackTemplates.ts ← Human-readable text generation
  types.ts             ← TypeScript interfaces
  index.ts             ← Public exports
```

## Usage

```typescript
import { analyzeSession } from './feedback';
import { Session } from '../models/session.types';
import { MedicalCase } from '../../../shared/types/case.types';

// Assuming you have a completed session and case data
const feedback = analyzeSession(session, caseData);

console.log(feedback.summaryScore); // 0-100
console.log(feedback.breakdown);    // Individual category scores
console.log(feedback.recommendations); // Learning points
```

## Scoring Breakdown

### Diagnosis (0-25 points)
- Correctly identifies primary diagnosis: 25 points
- Identifies differential diagnosis: 15 points
- Wrong or no diagnosis: 0 points

### Critical Actions (0-25 points)
- Points = (performed actions / total critical actions) × 25
- Matches actions using fuzzy matching (handles variations in naming)

### Communication (0-20 points)
- Pain characteristics questions: 5 points
- Past medical history: 3 points
- Medications/allergies: 3 points
- Follow-up questions: 4 points
- Empathy/rapport: 5 points

### Efficiency (0-30 points)
- Time-based scoring (moderate penalty for exceeding time limits)
  - Within 50% of limit: 20 points
  - Within 75%: 18 points
  - Within 100%: 15 points
  - Up to 20% over: 10 points
  - 20-50% over: 5 points
  - >50% over: 0 points
- Action ordering bonus: up to 10 points

## Time Limits

Default time limits per level:
- Level 1: 5 minutes (300 seconds)
- Level 2: 7 minutes (420 seconds)
- Level 3: 10 minutes (600 seconds)

These are used if `session.timeLimitSec` is not explicitly set.

## Output Format

```typescript
interface FeedbackResult {
  summaryScore: number;           // 0-100
  breakdown: {
    diagnosis: number;            // 0-25
    criticalActions: number;      // 0-25
    communication: number;        // 0-20
    efficiency: number;           // 0-30
  };
  timing: {
    timeLimitSec: number;
    actualDurationSec: number;
    exceededBySec?: number;       // Only if exceeded
    timeUsedPercent: number;
  };
  whatWentWell: string[];
  missed: string[];
  redFlagsMissed: string[];
  recommendations: string[];
}
```

## Key Features

✅ **Deterministic**: Same inputs always produce same outputs
✅ **Explainable**: Every score has clear reasoning
✅ **Tweakable**: Scoring weights are constants (easy to adjust)
✅ **No dependencies**: Pure TypeScript, no external APIs
✅ **Robust matching**: Handles variations in action naming

## Customization

To adjust scoring weights, edit constants in `scoringRules.ts`:
- `MAX_DIAGNOSIS_SCORE`
- `MAX_CRITICAL_ACTIONS_SCORE`
- `MAX_COMMUNICATION_SCORE`
- `MAX_EFFICIENCY_SCORE`
- `TIME_LIMITS`

To adjust feedback text, edit functions in `feedbackTemplates.ts`.
