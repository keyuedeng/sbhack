"use strict";
/**
 * Input Sanitization Middleware
 * Basic sanitization to prevent injection attacks and ensure data integrity
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeInput = sanitizeInput;
exports.sanitizeBody = sanitizeBody;
exports.validateRequestSize = validateRequestSize;
/**
 * Sanitize string inputs - removes potentially dangerous characters
 */
function sanitizeInput(str) {
    if (typeof str !== 'string') {
        return '';
    }
    // Remove null bytes and control characters (except newlines and tabs)
    return str
        .replace(/\0/g, '')
        .replace(/[\x01-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
        .trim();
}
/**
 * Middleware to sanitize request body string fields
 */
function sanitizeBody(req, res, next) {
    if (req.body && typeof req.body === 'object') {
        // Sanitize all string fields in body
        for (const key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = sanitizeInput(req.body[key]);
            }
        }
    }
    next();
}
/**
 * Validate request size (Express already has body-parser limits, but this is extra validation)
 */
function validateRequestSize(req, res, next) {
    const contentLength = req.headers['content-length'];
    const maxSize = 10 * 1024; // 10KB max request body size
    if (contentLength && parseInt(contentLength) > maxSize) {
        res.status(413).json({
            error: 'Request too large',
            message: `Maximum request size is ${maxSize} bytes`
        });
        return;
    }
    next();
}
