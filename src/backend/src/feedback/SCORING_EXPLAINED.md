# Scoring System Explained

This document explains how the feedback/scoring system works with examples.

## Quick Start

Run the test to see scoring in action:
```bash
npx ts-node src/backend/src/feedback/test.example.ts
```

## Scoring Breakdown

### Total Score (0-100 points)
The total score is the sum of four categories:
- **Diagnosis**: 0-25 points
- **Critical Actions**: 0-25 points  
- **Communication**: 0-20 points
- **Efficiency**: 0-30 points

## Category Details

### 1. Diagnosis (0-25 points)

**Scoring:**
- ✅ Correctly identifies primary diagnosis: **25 points**
- ⚠️ Identifies a differential diagnosis: **15 points** (60% credit)
- ❌ Wrong or no diagnosis: **0 points**

**Example:**
- Case: NSTEMI (Non-ST Elevation Myocardial Infarction)
- Student says "NSTEMI" → 25 points ✅
- Student says "Acute coronary syndrome" (differential) → 15 points ⚠️
- Student says "GERD" or nothing → 0 points ❌

### 2. Critical Actions (0-25 points)

**Scoring:**
- Points = (Number of performed actions / Total critical actions) × 25
- Rounded to nearest integer

**Example:**
- Case requires 7 critical actions
- Student performs 6 actions → (6/7) × 25 = **21 points**
- Student performs 2 actions → (2/7) × 25 = **7 points**

**Action Matching:**
The system uses fuzzy matching to handle variations:
- "gave_aspirin" matches "Aspirin 325mg chewed" ✅
- "ordered_ekg" matches "Obtain EKG within 10 minutes" ✅
- "ordered_troponin" matches "Order troponin" ✅

### 3. Communication (0-20 points)

**Scoring Components:**
- Pain characteristics questions (where, radiation, quality): **5 points**
- Past medical history questions: **3 points**
- Medications/allergies questions: **3 points**
- Multiple follow-up questions (3+ messages): **4 points**
- Empathy/rapport shown: **5 points**

**Example:**
- Student asks "Where does it hurt? Does it radiate?" → +5 points
- Student asks about past medical history → +3 points
- Student asks about medications → +3 points
- Student has 4+ conversation turns → +4 points
- Student shows empathy ("How are you feeling?") → +5 points
- **Total: 20/20** ✅

### 4. Efficiency (0-30 points)

**Time-Based Scoring (0-20 points):**
- Used ≤50% of time limit: **20 points** (very efficient)
- Used ≤75% of time limit: **18 points** (efficient)
- Used ≤100% of time limit: **15 points** (on time)
- Used ≤120% of time limit: **10 points** (slightly over)
- Used ≤150% of time limit: **5 points** (moderately over)
- Used >150% of time limit: **0 points** (significantly over)

**Action Ordering Bonus (0-10 points):**
- Reasonable number of actions (3-10): **5 points**
- Too many or too few actions: **2-3 points**

**Time Limits by Level:**
- Level 1: **5 minutes** (300 seconds)
- Level 2: **7 minutes** (420 seconds)
- Level 3: **10 minutes** (600 seconds)

**Example:**
- Level 1 case, finished in 3.5 minutes (70% of 5 min limit):
  - Time score: 18 points (used 70%, between 50-75%)
  - Ordering bonus: 5 points
  - **Total: 23/30** ✅

## Test Examples

The test file (`test.example.ts`) includes three scenarios:

### ✅ Good Performance
- **Score: 84/100**
- Correct diagnosis (25/25)
- 6/7 critical actions (21/25)
- Good communication (15/20)
- Efficient timing (23/30)

### ⚠️ Average Performance  
- **Score: 48/100**
- Differential diagnosis (15/25)
- 2/7 critical actions (7/25)
- Basic communication (9/20)
- Used 95% of time (17/30)

### ❌ Poor Performance
- **Score: 22/100**
- Wrong diagnosis (15/25 - partial credit)
- 0/7 critical actions (0/25)
- Poor communication (0/20)
- Exceeded time by 30% (7/30)

## Feedback Output

The system generates:
- **Summary Score**: Total 0-100
- **Breakdown**: Individual category scores
- **Timing Info**: Time limit, actual duration, percentage used
- **What Went Well**: Positive observations
- **Missed**: Things that should have been done
- **Red Flags Missed**: Critical time-sensitive actions missed
- **Recommendations**: Learning points for improvement

## Customization

All scoring weights are constants in `scoringRules.ts`:
- `MAX_DIAGNOSIS_SCORE = 25`
- `MAX_CRITICAL_ACTIONS_SCORE = 25`
- `MAX_COMMUNICATION_SCORE = 20`
- `MAX_EFFICIENCY_SCORE = 30`
- `TIME_LIMITS = { 1: 300, 2: 420, 3: 600 }`

Adjust these to change scoring behavior.
