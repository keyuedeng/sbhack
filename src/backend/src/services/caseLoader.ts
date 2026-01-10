/**
 * Case Loader
 * Loads and validates medical case JSON files
 */

import { MedicalCase } from '../../../shared/types/case.types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Load a medical case by ID
 * 
 * @param caseId - The unique identifier for the case (e.g., "chest-pain-001")
 * @returns The validated medical case object
 * @throws Error if case not found or validation fails
 */
export function loadCase(caseId: string): MedicalCase {
  // Sanitize caseId to prevent path traversal
  const safeCaseId = caseId.replace(/[^a-zA-Z0-9-]/g, '');
  
  // Build path to case file
  // Use process.cwd() for more reliable path resolution (works with ts-node and compiled code)
  const casesDir = path.join(process.cwd(), 'src', 'shared', 'scenarios');
  const filePath = path.join(casesDir, `${safeCaseId}.json`);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`Case not found: ${caseId}`);
  }
  
  // Read and parse JSON
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  let caseData: any;
  try {
    caseData = JSON.parse(fileContent);
  } catch (error) {
    throw new Error(`Invalid JSON in case ${caseId}`);
  }
  
  // Validate case structure
  validateCase(caseData);
  
  return caseData as MedicalCase;
}

/**
 * Validate that a case object has all required fields
 * 
 * @param caseData - The raw case data from JSON
 * @returns true if valid
 * @throws Error with specific message if invalid
 */
function validateCase(caseData: any): boolean {
  // Check top-level required fields
  if (!caseData.caseId) throw new Error('Missing caseId');
  if (!caseData.level || ![1, 2, 3].includes(caseData.level)) {
    throw new Error('Invalid level - must be 1, 2, or 3');
  }
  
  // Check patient info
  if (!caseData.patient) throw new Error('Missing patient');
  if (!caseData.patient.name) throw new Error('Missing patient.name');
  if (!caseData.patient.age) throw new Error('Missing patient.age');
  if (!caseData.patient.sex) throw new Error('Missing patient.sex');
  if (!caseData.patient.personality) throw new Error('Missing patient.personality');
  
  // Check medical content
  if (!caseData.history) throw new Error('Missing history');
  if (!caseData.physicalExam) throw new Error('Missing physicalExam');
  if (!caseData.diagnosis) throw new Error('Missing diagnosis');
  if (!caseData.diagnosis.primary) throw new Error('Missing primary diagnosis');
  
  // Check guardrails exist
  if (!caseData.guardrails) throw new Error('Missing guardrails');
  
  return true;
}
