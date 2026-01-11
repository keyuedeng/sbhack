"use strict";
/**
 * Case Loader
 * Loads and validates medical case JSON files
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadCase = loadCase;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Load a medical case by ID
 *
 * @param caseId - The unique identifier for the case (e.g., "chest-pain-001")
 * @returns The validated medical case object
 * @throws Error if case not found or validation fails
 */
function loadCase(caseId) {
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
    let caseData;
    try {
        caseData = JSON.parse(fileContent);
    }
    catch (error) {
        throw new Error(`Invalid JSON in case ${caseId}`);
    }
    // Validate case structure
    validateCase(caseData);
    return caseData;
}
/**
 * Validate that a case object has all required fields
 *
 * @param caseData - The raw case data from JSON
 * @returns true if valid
 * @throws Error with specific message if invalid
 */
function validateCase(caseData) {
    // Check top-level required fields
    if (!caseData.caseId)
        throw new Error('Missing caseId');
    if (!caseData.level || ![1, 2, 3].includes(caseData.level)) {
        throw new Error('Invalid level - must be 1, 2, or 3');
    }
    // Check patient info
    if (!caseData.patient)
        throw new Error('Missing patient');
    if (!caseData.patient.name)
        throw new Error('Missing patient.name');
    if (!caseData.patient.age)
        throw new Error('Missing patient.age');
    if (!caseData.patient.sex)
        throw new Error('Missing patient.sex');
    if (!caseData.patient.personality)
        throw new Error('Missing patient.personality');
    // Check medical content
    if (!caseData.history)
        throw new Error('Missing history');
    if (!caseData.physicalExam)
        throw new Error('Missing physicalExam');
    if (!caseData.diagnosis)
        throw new Error('Missing diagnosis');
    if (!caseData.diagnosis.primary)
        throw new Error('Missing primary diagnosis');
    // Check guardrails exist
    if (!caseData.guardrails)
        throw new Error('Missing guardrails');
    return true;
}
