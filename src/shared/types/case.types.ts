/**
 * Case Schema for Medical Simulation Platform
 * Defines the structure for interactive patient scenarios
 */

export interface MedicalCase {
  caseId: string;
  level: 1 | 2 | 3; // 1=beginner, 2=intermediate, 3=advanced
  title: string;
  description?: string;
  specialty?: string; // e.g., "emergency medicine", "cardiology", "pediatrics"
  
  patient: PatientInfo;
  history: MedicalHistory;
  physicalExam: PhysicalExamFindings;
  diagnostics: DiagnosticResults;
  diagnosis: DiagnosisInfo;
  revealRules: RevealRules;
  progression: CaseProgression;
  guardrails: Guardrails;
}

export interface PatientInfo {
  name: string;
  age: number;
  sex: "M" | "F" | "Other";
  chiefComplaint: string;
  
  personality: {
    baseline: string; // e.g., "anxious, cooperative", "stoic, reluctant"
    emotionalState: string; // e.g., "fearful due to pain", "in denial"
    communicationStyle: string; // e.g., "verbose, asks many questions", "quiet, one-word answers"
  };
}

export interface MedicalHistory {
  hpi: string; // History of Present Illness - narrative
  
  pmh: string[]; // Past Medical History - list of conditions
  
  medications: string[]; // Current medications
  
  allergies: string[]; // Known allergies
  
  familyHistory?: string; // Relevant family history
  
  socialHistory: {
    smoking?: string;
    alcohol?: string;
    drugs?: string;
    occupation?: string;
    livingSituation?: string;
  };
}

export interface PhysicalExamFindings {
  vitals: {
    level1: VitalSigns;
    level2: VitalSigns;
    level3: VitalSigns;
  };
  
  general: {
    level1: string;
    level2: string;
    level3: string;
  };
  
  // System-specific exams
  heent?: LeveledFinding;
  cardiovascular?: LeveledFinding;
  respiratory?: LeveledFinding;
  abdominal?: LeveledFinding;
  neurological?: LeveledFinding;
  musculoskeletal?: LeveledFinding;
  skin?: LeveledFinding;
}

export interface VitalSigns {
  BP: string; // Blood pressure, e.g., "145/90"
  HR: number; // Heart rate
  RR: number; // Respiratory rate
  temp: number; // Temperature in Celsius
  O2: number; // O2 saturation percentage
  [key: string]: string | number | boolean; // Allow additional vitals like "diaphoretic"
}

export interface LeveledFinding {
  level1: string;
  level2: string;
  level3: string;
}

export interface DiagnosticResults {
  labs?: {
    available: string[]; // List of available lab tests
    results: {
      [testName: string]: LeveledLabResult;
    };
  };
  
  imaging?: {
    available: string[]; // e.g., ["Chest X-ray", "CT chest"]
    results: {
      [imagingType: string]: LeveledImagingResult;
    };
  };
  
  ekg?: {
    level1: string;
    level2: string;
    level3: string;
  };
  
  other?: {
    [testName: string]: LeveledFinding;
  };
}

export interface LeveledLabResult {
  level1: { [key: string]: string | number };
  level2: { [key: string]: string | number };
  level3: { [key: string]: string | number };
}

export interface LeveledImagingResult {
  level1: string; // Description of findings
  level2: string;
  level3: string;
}

export interface DiagnosisInfo {
  primary: string; // The correct primary diagnosis
  differentials: string[]; // Reasonable differential diagnoses
  criticalActions: string[]; // Must-do actions (e.g., "Give aspirin", "Order troponin")
  avoidActions?: string[]; // Actions that would harm patient
}

export interface RevealRules {
  hpi: "always" | "when_asked" | "requires_rapport";
  pmh: "always" | "when_asked" | "if_relevant";
  medications: "always" | "when_asked";
  allergies: "always" | "when_asked";
  socialHistory: "only_if_asked" | "when_asked" | "volunteers";
  familyHistory: "only_if_asked" | "when_asked" | "volunteers";
}

export interface CaseProgression {
  // Time-based automatic changes
  timeBasedChanges?: TimeBasedChange[];
  
  // Action-triggered changes
  actionTriggeredChanges?: ActionTriggeredChange[];
  
  // Red flags - critical actions student MUST perform
  redFlags: RedFlag[];
  
  // What happens if case is mismanaged
  deterioration?: {
    trigger: string; // e.g., "no aspirin given within 20 minutes"
    newVitals?: Partial<VitalSigns>;
    newSymptoms?: string;
    newFindings?: string;
    severity: "mild" | "moderate" | "severe" | "critical";
  }[];
}

export interface TimeBasedChange {
  atMinute: number; // Time elapsed since case start
  condition?: string; // Optional condition, e.g., "no aspirin given"
  changes: {
    vitals?: Partial<VitalSigns>;
    symptoms?: string;
    patientState?: string;
    emotionalState?: string;
  };
}

export interface ActionTriggeredChange {
  trigger: string; // e.g., "aspirin_given", "wrong_antibiotic"
  changes: {
    vitals?: Partial<VitalSigns>;
    symptoms?: string;
    patientResponse?: string;
    emotionalState?: string;
  };
  delay?: number; // Minutes before change takes effect
}

export interface RedFlag {
  action: string; // e.g., "Order troponin", "Give aspirin"
  timeWindow?: number; // Minutes within which this should be done
  severity: "critical" | "important" | "recommended";
  consequence?: string; // What happens if missed
}

export interface Guardrails {
  // Things the patient should NEVER say
  patientCannotSay: string[];
  
  // Patient stays in character (no medical jargon unless educated patient)
  patientMustStayInCharacter: boolean;
  
  // Patient cannot self-diagnose
  noSelfDiagnosis: boolean;
  
  // Patient cannot give medical advice
  noMedicalAdvice: boolean;
  
  // Patient cannot invent facts not in case
  noHallucination: boolean;
  
  // Custom rules for this specific case
  customRules?: string[];
}

// Helper type for session state tracking
export interface RevealedFacts {
  hpi: boolean;
  pmh: string[]; // Which PMH items have been revealed
  medications: boolean;
  allergies: boolean;
  socialHistory: string[]; // Which aspects revealed
  familyHistory: boolean;
  physicalExam: string[]; // Which body systems examined
  diagnostics: string[]; // Which tests ordered
}
